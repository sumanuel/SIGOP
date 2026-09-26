'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OSM_STYLE, CENTRO_VENEZUELA, ZOOM_INICIAL } from '@/lib/map-style';

interface TrazadoPickerMapProps {
  puntos: [number, number][];
  centro: [number, number] | null;
  onCambiar: (puntos: [number, number][]) => void;
}

const FUENTE_TRAZADO = 'trazado-en-edicion';
const CAPA_LINEA = 'trazado-en-edicion-linea';
const CAPA_PUNTOS = 'trazado-en-edicion-puntos';

// Dibujo de trazado por clics (vías, tuberías, tendidos eléctricos): cada
// clic agrega un punto al final de la línea. No usa un marcador arrastrable
// como el selector de ubicación puntual porque acá la cantidad de puntos es
// variable — se sincroniza como una capa GeoJSON que se redibuja en cada
// cambio (ver `sincronizarTrazados` en components/map/obras-map.tsx, mismo
// enfoque de fuente + capa `line`).
export default function TrazadoPickerMap({ puntos, centro, onCambiar }: TrazadoPickerMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const puntosRef = useRef(puntos);
  const onCambiarRef = useRef(onCambiar);

  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

  useEffect(() => {
    onCambiarRef.current = onCambiar;
  }, [onCambiar]);

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const centroInicial = centro ?? CENTRO_VENEZUELA;

    const mapa = new maplibregl.Map({
      container: contenedorRef.current,
      style: OSM_STYLE,
      center: centroInicial,
      zoom: centro ? 13 : ZOOM_INICIAL,
      attributionControl: false,
    });

    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapa.addControl(new maplibregl.AttributionControl({ compact: true }));

    mapa.on('load', () => {
      dibujar(mapa, puntosRef.current);
    });

    mapa.on('click', (e) => {
      const nuevos: [number, number][] = [...puntosRef.current, [e.lngLat.lng, e.lngLat.lat]];
      puntosRef.current = nuevos;
      dibujar(mapa, nuevos);
      onCambiarRef.current(nuevos);
    });

    const resizeObserver = new ResizeObserver(() => mapa.resize());
    resizeObserver.observe(contenedorRef.current);

    mapaRef.current = mapa;

    return () => {
      resizeObserver.disconnect();
      mapa.remove();
      mapaRef.current = null;
    };
    // Solo se inicializa una vez; los cambios de `puntos` desde fuera (ej.
    // "Deshacer"/"Limpiar" en el formulario) se sincronizan abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redibuja cuando `puntos` cambia desde fuera del mapa (botones del form).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (mapa.isStyleLoaded()) {
      dibujar(mapa, puntos);
    } else {
      mapa.once('load', () => dibujar(mapa, puntos));
    }
  }, [puntos]);

  return <div ref={contenedorRef} className="h-full w-full" />;
}

function dibujar(mapa: maplibregl.Map, puntos: [number, number][]) {
  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: puntos.length >= 2 ? puntos : [] },
      },
      ...puntos.map(
        (p): GeoJSON.Feature => ({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: p },
        })
      ),
    ],
  };

  const fuente = mapa.getSource(FUENTE_TRAZADO) as maplibregl.GeoJSONSource | undefined;
  if (fuente) {
    fuente.setData(data);
    return;
  }

  mapa.addSource(FUENTE_TRAZADO, { type: 'geojson', data });
  mapa.addLayer({
    id: CAPA_LINEA,
    type: 'line',
    source: FUENTE_TRAZADO,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#1d4ed8', 'line-width': 4, 'line-opacity': 0.85 },
  });
  mapa.addLayer({
    id: CAPA_PUNTOS,
    type: 'circle',
    source: FUENTE_TRAZADO,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 5,
      'circle-color': '#1d4ed8',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}
