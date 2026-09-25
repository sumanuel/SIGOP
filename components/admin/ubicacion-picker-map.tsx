'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OSM_STYLE, CENTRO_VENEZUELA, ZOOM_INICIAL } from '@/lib/map-style';

interface UbicacionPickerMapProps {
  lat: number | null;
  lng: number | null;
  onCambiar: (lat: number, lng: number) => void;
}

// Selector de ubicación por clic (PLAN_PROYECTO.md sección 3.2): el admin
// hace clic en el mapa (o arrastra el marcador) para fijar el punto de la
// obra, en vez de teclear coordenadas a mano.
export default function UbicacionPickerMap({ lat, lng, onCambiar }: UbicacionPickerMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const marcadorRef = useRef<maplibregl.Marker | null>(null);
  const onCambiarRef = useRef(onCambiar);

  // Mantiene la ref al día sin mutarla durante el render (ver reglas de
  // react-hooks sobre refs); los handlers de abajo siempre leen la versión
  // más reciente de onCambiar sin tener que reconstruir el mapa por eso.
  useEffect(() => {
    onCambiarRef.current = onCambiar;
  }, [onCambiar]);

  // Inicializa el mapa y el marcador una sola vez.
  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const centroInicial: [number, number] =
      lat !== null && lng !== null ? [lng, lat] : CENTRO_VENEZUELA;

    const mapa = new maplibregl.Map({
      container: contenedorRef.current,
      style: OSM_STYLE,
      center: centroInicial,
      zoom: lat !== null && lng !== null ? 13 : ZOOM_INICIAL,
      attributionControl: false,
    });

    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapa.addControl(new maplibregl.AttributionControl({ compact: true }));

    const marcador = new maplibregl.Marker({ draggable: true, color: '#1d4ed8' })
      .setLngLat(centroInicial)
      .addTo(mapa);

    marcador.on('dragend', () => {
      const posicion = marcador.getLngLat();
      onCambiarRef.current(posicion.lat, posicion.lng);
    });

    mapa.on('click', (e) => {
      marcador.setLngLat(e.lngLat);
      onCambiarRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    const resizeObserver = new ResizeObserver(() => mapa.resize());
    resizeObserver.observe(contenedorRef.current);

    mapaRef.current = mapa;
    marcadorRef.current = marcador;

    return () => {
      resizeObserver.disconnect();
      mapa.remove();
      mapaRef.current = null;
    };
    // Solo se inicializa una vez; los cambios posteriores de lat/lng
    // (ej. escritos a mano) se sincronizan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el marcador si lat/lng cambian desde fuera (ej. el admin
  // escribió las coordenadas a mano en vez de hacer clic).
  useEffect(() => {
    if (!marcadorRef.current || lat === null || lng === null) return;
    const actual = marcadorRef.current.getLngLat();
    if (Math.abs(actual.lat - lat) > 1e-9 || Math.abs(actual.lng - lng) > 1e-9) {
      marcadorRef.current.setLngLat([lng, lat]);
      mapaRef.current?.easeTo({ center: [lng, lat] });
    }
  }, [lat, lng]);

  return <div ref={contenedorRef} className="h-full w-full" />;
}
