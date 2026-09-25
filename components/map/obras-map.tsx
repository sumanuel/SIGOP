'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ObraMapa } from '@/lib/types/obra';
import { OSM_STYLE, CENTRO_VENEZUELA, ZOOM_INICIAL } from '@/lib/map-style';

interface ObrasMapProps {
  obras: ObraMapa[];
  onSeleccionarObra?: (obra: ObraMapa) => void;
}

export default function ObrasMap({ obras, onSeleccionarObra }: ObrasMapProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const marcadoresRef = useRef<maplibregl.Marker[]>([]);

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

    // El contenedor vive dentro de un layout flex (sidebar + footer) cuyo
    // tamaño puede terminar de asentarse después del primer paint (fuentes,
    // hidratación). Sin esto, MapLibre calcula su viewport con el tamaño
    // "viejo" y el mapa queda pequeño hasta que algo dispare un resize.
    const resizeObserver = new ResizeObserver(() => mapa.resize());
    resizeObserver.observe(contenedorRef.current);

    return () => {
      resizeObserver.disconnect();
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Sincroniza los marcadores cada vez que cambia la lista de obras.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    function pintarMarcadores() {
      if (!mapa) return;

      marcadoresRef.current.forEach((marcador) => marcador.remove());
      marcadoresRef.current = obras.map((obra) => {
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
          .setLngLat([obra.lng, obra.lat])
          .setPopup(popup)
          .addTo(mapa);

        el.addEventListener('click', () => onSeleccionarObra?.(obra));

        return marcador;
      });
    }

    if (mapa.isStyleLoaded()) {
      pintarMarcadores();
    } else {
      mapa.once('load', pintarMarcadores);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obras]);

  return <div ref={contenedorRef} className="h-full w-full" />;
}
