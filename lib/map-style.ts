import type maplibregl from 'maplibre-gl';

// Estilo con teselas raster de OpenStreetMap — no requiere API key, ideal
// para desarrollo y para el piloto. Ver PLAN_PROYECTO.md sección 5: para
// producción se puede cambiar a un proveedor con teselas vectoriales
// (ej. MapTiler) solo reemplazando este objeto.
export const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Centro aproximado de Venezuela.
export const CENTRO_VENEZUELA: [number, number] = [-66.5897, 8.0];
export const ZOOM_INICIAL = 5.6;
