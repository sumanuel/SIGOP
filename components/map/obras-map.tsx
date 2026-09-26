'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { ObraMapa } from '@/lib/types/obra';
import { OSM_STYLE, CENTRO_VENEZUELA, ZOOM_INICIAL } from '@/lib/map-style';

interface ObrasMapProps {
  obras: ObraMapa[];
  onSeleccionarObra?: (obra: ObraMapa) => void;
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

export default function ObrasMap({ obras, onSeleccionarObra }: ObrasMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const marcadoresRef = useRef<maplibregl.Marker[]>([]);
  const indiceRef = useRef<Indice | null>(null);
  const obrasPorIdRef = useRef<Map<string, ObraMapa>>(new Map());
  const onSeleccionarObraRef = useRef(onSeleccionarObra);

  useEffect(() => {
    onSeleccionarObraRef.current = onSeleccionarObra;
  }, [onSeleccionarObra]);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const mapa = new maplibregl.Map({
      container: contenedorRef.current,
      style: OSM_STYLE,
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
    el.setAttribute('aria-label', `${obra.nombre} — ${obra.estatus.nombre}`);
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.borderRadius = '9999px';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
    el.style.backgroundColor = obra.tipoObra.color;
    el.style.cursor = 'pointer';

    const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
      <div style="font-family: inherit; min-width: 200px;">
        <p style="font-size: 12px; font-weight: 600; color: ${obra.tipoObra.color}; margin: 0 0 2px;">
          ${obra.tipoObra.nombre}
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
