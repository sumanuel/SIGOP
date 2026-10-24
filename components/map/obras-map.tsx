'use client';

import { createElement, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { ObraMapa } from '@/lib/types/obra';
import { CAPAS_MAPA, CAPA_POR_DEFECTO, crearEstiloMapaPublico, CENTRO_VENEZUELA, ZOOM_INICIAL, idCapaMapa, type CapaMapa } from '@/lib/map-style';
import { obtenerIconoTipoObra } from '@/lib/tipo-obra-icono';

interface ObrasMapProps {
  obras: ObraMapa[];
  onSeleccionarObra?: (obra: ObraMapa) => void;
  /** Pide acercar el mapa a una obra (p. ej. desde la lista de destacadas). `token` cambia en cada pedido, para poder repetirlo. */
  enfoque?: { obra: ObraMapa; token: number } | null;
  /** Capa base visible (calles, satélite o relieve). */
  capa?: CapaMapa;
}

interface PropiedadesPunto {
  obraId: string;
}

type Indice = Supercluster<PropiedadesPunto, PropiedadesPunto>;

// Agrupación de marcadores por proximidad (PLAN_PROYECTO.md sección 3.1):
// con muchas obras cercanas entre sí (ej. varias en la misma ciudad), verlas
// todas como puntos sueltos vuelve el mapa ilegible al alejar el zoom.
//
// Se usa `supercluster` (la misma librería que usa MapLibre internamente
// para su propio soporte de clustering) en vez de una capa GL nativa, para
// poder seguir usando marcadores DOM normales — así no se pierde el color
// por tipo de obra ni el popup con el mismo look que ya teníamos.
const RADIO_CLUSTER = 60; // px — dos puntos a menos de esto se agrupan
const ZOOM_MAXIMO_CLUSTER = 16; // desde este zoom, todo se muestra individual

export default function ObrasMap({ obras, onSeleccionarObra, enfoque, capa = CAPA_POR_DEFECTO }: ObrasMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const marcadoresRef = useRef<maplibregl.Marker[]>([]);
  const indiceRef = useRef<Indice | null>(null);
  const obrasPorIdRef = useRef<Map<string, ObraMapa>>(new Map());
  const onSeleccionarObraRef = useRef(onSeleccionarObra);
  // La capa con la que nace el mapa; los cambios posteriores los aplica el efecto de `capa`.
  const capaInicialRef = useRef(capa);

  useEffect(() => {
    onSeleccionarObraRef.current = onSeleccionarObra;
  }, [onSeleccionarObra]);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const mapa = new maplibregl.Map({
      container: contenedorRef.current,
      style: crearEstiloMapaPublico(capaInicialRef.current),
      center: CENTRO_VENEZUELA,
      zoom: ZOOM_INICIAL,
      attributionControl: false,
    });

    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapa.addControl(new maplibregl.AttributionControl({ compact: true }));

    mapaRef.current = mapa;

    function renderizarAhora() {
      renderizarClusters(mapa, indiceRef.current, obrasPorIdRef.current, marcadoresRef, onSeleccionarObraRef);
    }

    mapa.on('load', renderizarAhora);
    mapa.on('moveend', renderizarAhora);

    // El contenedor vive dentro de un layout flex (sidebar + footer) cuyo
    // tamaño puede terminar de asentarse después del primer paint (fuentes,
    // hidratación). Sin esto, MapLibre calcula su viewport con el tamaño
    // "viejo" y el mapa queda pequeño hasta que algo dispare un resize.
    const resizeObserver = new ResizeObserver(() => mapa.resize());
    resizeObserver.observe(contenedorRef.current);

    return () => {
      resizeObserver.disconnect();
      mapa.off('load', renderizarAhora);
      mapa.off('moveend', renderizarAhora);
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Muestra solo la capa base elegida. Si el estilo aún no cargó, lo aplica al cargar.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    function aplicar() {
      if (!mapa) return;
      for (const { id } of CAPAS_MAPA) {
        mapa.setLayoutProperty(idCapaMapa(id), 'visibility', id === capa ? 'visible' : 'none');
      }
    }
    if (mapa.isStyleLoaded()) aplicar();
    else mapa.once('load', aplicar);
  }, [capa]);

  // Acerca el mapa a la obra pedida. Con clustering, un zoom cercano la separa de sus vecinas.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !enfoque) return;
    mapa.flyTo({ center: [enfoque.obra.lng, enfoque.obra.lat], zoom: Math.max(mapa.getZoom(), 12), essential: true });
  }, [enfoque]);

  // Reconstruye el índice de clustering cada vez que cambia la lista de
  // obras, y vuelve a pintar de inmediato con el resultado.
  useEffect(() => {
    const mapa = mapaRef.current;

    obrasPorIdRef.current = new Map(obras.map((o) => [o.id, o]));

    const indice = new Supercluster<PropiedadesPunto, PropiedadesPunto>({
      radius: RADIO_CLUSTER,
      maxZoom: ZOOM_MAXIMO_CLUSTER,
    });
    indice.load(
      obras.map((obra) => ({
        type: 'Feature',
        properties: { obraId: obra.id },
        geometry: { type: 'Point', coordinates: [obra.lng, obra.lat] },
      }))
    );
    indiceRef.current = indice;

    if (!mapa) return;

    function renderizarAhora() {
      if (!mapa) return;
      renderizarClusters(mapa, indiceRef.current, obrasPorIdRef.current, marcadoresRef, onSeleccionarObraRef);
      sincronizarTrazados(mapa, obras);
    }

    if (mapa.isStyleLoaded()) {
      renderizarAhora();
    } else {
      mapa.once('load', renderizarAhora);
    }
  }, [obras]);

  return <div ref={contenedorRef} className="h-full w-full" />;
}

function renderizarClusters(
  mapa: maplibregl.Map,
  indice: Indice | null,
  obrasPorId: Map<string, ObraMapa>,
  marcadoresRef: React.MutableRefObject<maplibregl.Marker[]>,
  onSeleccionarObraRef: React.MutableRefObject<((obra: ObraMapa) => void) | undefined>
) {
  if (!indice) return;

  marcadoresRef.current.forEach((marcador) => marcador.remove());
  marcadoresRef.current = [];

  const bounds = mapa.getBounds();
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];
  const zoom = Math.round(mapa.getZoom());

  const resultados = indice.getClusters(bbox, zoom);

  resultados.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates;

    if (esCluster(feature)) {
      const cantidad = feature.properties.point_count;
      const el = crearElementoCluster(cantidad);

      const marcador = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapa);

      el.addEventListener('click', () => {
        const expansionZoom = Math.min(
          indice.getClusterExpansionZoom(feature.properties.cluster_id),
          ZOOM_MAXIMO_CLUSTER + 1
        );
        mapa.easeTo({ center: [lng, lat], zoom: expansionZoom });
      });

      marcadoresRef.current.push(marcador);
      return;
    }

    const obra = obrasPorId.get(feature.properties.obraId);
    if (!obra) return;

    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `${obra.nombre} — ${obra.tipoObra.nombre} — ${obra.estatus.nombre}`);
    const tamano = obra.destacada ? 34 : 28;
    el.style.width = `${tamano}px`;
    el.style.height = `${tamano}px`;
    el.style.position = 'relative';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.borderRadius = '9999px';
    // Las obras destacadas llevan un aro dorado y una estrella para distinguirse de lejos.
    el.style.border = obra.destacada ? '3px solid #F59E0B' : '2px solid white';
    el.style.boxShadow = obra.destacada ? '0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.4)';
    el.style.backgroundColor = obra.tipoObra.color;
    if (obra.destacada) el.style.zIndex = '2';
    el.style.cursor = 'pointer';

    const Icono = obtenerIconoTipoObra(obra.tipoObra.icono);
    el.innerHTML = renderToStaticMarkup(
      createElement(Icono, { color: 'white', size: 15, strokeWidth: 2.5 })
    );

    if (obra.destacada) {
      const estrella = document.createElement('span');
      estrella.setAttribute('aria-hidden', 'true');
      estrella.textContent = '★';
      estrella.style.cssText =
        'position:absolute;top:-9px;right:-9px;width:16px;height:16px;border-radius:9999px;background:#F59E0B;color:white;font-size:11px;line-height:16px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,0.4)';
      el.appendChild(estrella);
      el.setAttribute('aria-label', `Obra destacada: ${obra.nombre} — ${obra.tipoObra.nombre} — ${obra.estatus.nombre}`);
    }

    const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
      <div style="font-family: inherit; min-width: 200px;">
        <p style="font-size: 12px; font-weight: 600; color: ${obra.tipoObra.color}; margin: 0 0 2px;">
          ${obra.tipoObra.nombre}${obra.destacada ? ' · ★ Destacada' : ''}
        </p>
        <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">${obra.nombre}</p>
        <p style="font-size: 12px; color: #525252; margin: 0 0 2px;">${obra.municipio} · ${obra.codigo}</p>
        <p style="font-size: 12px; margin: 0;">
          <span style="color: ${obra.estatus.color}; font-weight: 600;">${obra.estatus.nombre}</span>
          · ${obra.avanceFisico}% de avance
        </p>
      </div>
    `);

    const marcador = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(mapa);

    el.addEventListener('click', () => onSeleccionarObraRef.current?.(obra));

    marcadoresRef.current.push(marcador);
  });
}

function esCluster(
  feature: PointFeature<PropiedadesPunto> | ClusterFeature<PropiedadesPunto>
): feature is ClusterFeature<PropiedadesPunto> {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
}

// Trazado de obras lineales (vías, tuberías, tendidos eléctricos): a
// diferencia de los marcadores, se dibuja con una capa GL nativa (fuente
// GeoJSON + `line` layer) en vez de elementos DOM, porque una línea no
// necesita popup/interacción propia y así se aprovecha el renderizado
// vectorial del mapa. No depende del viewport, así que solo se sincroniza
// cuando cambia la lista de obras (no en cada `moveend`).
function construirFeatureCollectionTrazados(obras: ObraMapa[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: obras
      .filter((o): o is ObraMapa & { trazado: [number, number][] } => Boolean(o.trazado && o.trazado.length >= 2))
      .flatMap((o): GeoJSON.Feature[] => {
        const propiedades = { color: o.tipoObra.color };
        // Un área (terreno, urbanismo) es un polígono: el anillo se cierra
        // repitiendo el primer vértice. Sin tipo se asume una línea.
        if (o.trazadoTipo === 'AREA' && o.trazado.length >= 3) {
          return [
            {
              type: 'Feature',
              properties: propiedades,
              geometry: { type: 'Polygon', coordinates: [[...o.trazado, o.trazado[0]]] },
            },
          ];
        }
        return [
          {
            type: 'Feature',
            properties: propiedades,
            geometry: { type: 'LineString', coordinates: o.trazado },
          },
        ];
      }),
  };
}

function sincronizarTrazados(mapa: maplibregl.Map, obras: ObraMapa[]) {
  const data = construirFeatureCollectionTrazados(obras);
  const fuente = mapa.getSource('trazados') as maplibregl.GeoJSONSource | undefined;

  if (fuente) {
    fuente.setData(data);
    return;
  }

  mapa.addSource('trazados', { type: 'geojson', data });
  mapa.addLayer({
    id: 'trazados-area',
    type: 'fill',
    source: 'trazados',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 },
  });
  // La capa `line` dibuja tanto las líneas como el contorno de las áreas.
  mapa.addLayer({
    id: 'trazados-line',
    type: 'line',
    source: 'trazados',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.85 },
  });
}

function crearElementoCluster(cantidad: number): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${cantidad} obras agrupadas — clic para acercar`);

  const tamano = cantidad < 10 ? 32 : cantidad < 50 ? 40 : 48;
  const color = cantidad < 10 ? '#60a5fa' : cantidad < 50 ? '#3b82f6' : '#1d4ed8';

  el.style.width = `${tamano}px`;
  el.style.height = `${tamano}px`;
  el.style.borderRadius = '9999px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.backgroundColor = color;
  el.style.color = 'white';
  el.style.fontWeight = '700';
  el.style.fontSize = cantidad < 50 ? '13px' : '14px';
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
  el.style.cursor = 'pointer';
  el.textContent = String(cantidad);

  return el;
}
