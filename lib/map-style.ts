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

// Capas base del mapa público. Todas son teselas raster gratuitas y sin API key; cada
// una exige citar su fuente (la atribución se muestra sola en la esquina del mapa).
// Ojo: "gratuito" no es "sin límites": las teselas de OpenStreetMap y OpenTopoMap son
// para uso moderado, y las de Esri tienen sus propias condiciones. Con mucho tráfico en
// producción hay que cambiar a un proveedor con contrato (MapTiler, Stadia…) o servir
// teselas propias; basta con reemplazar las URL de este archivo (y la CSP en next.config.ts).
export type CapaMapa = 'calles' | 'satelite' | 'relieve';

export const CAPAS_MAPA: { id: CapaMapa; etiqueta: string }[] = [
  { id: 'calles', etiqueta: 'Calles' },
  { id: 'satelite', etiqueta: 'Satélite' },
  { id: 'relieve', etiqueta: 'Relieve' },
];

export const CAPA_POR_DEFECTO: CapaMapa = 'calles';

export function esCapaMapa(valor: unknown): valor is CapaMapa {
  return CAPAS_MAPA.some((c) => c.id === valor);
}

/** Id de la capa de MapLibre que corresponde a cada capa base. */
export const idCapaMapa = (capa: CapaMapa) => `capa-${capa}`;

// Un solo estilo con las tres capas apiladas; solo `capaInicial` está visible (así no se descargan teselas de las otras). Cambiar de capa es
// alternar `visibility` (no se reemplaza el estilo), así los trazados de las obras que se
// dibujan encima no se pierden.
export function crearEstiloMapaPublico(capaInicial: CapaMapa = CAPA_POR_DEFECTO): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      calles: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
      satelite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics',
      },
      relieve: {
        type: 'raster',
        tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 17,
        attribution: '&copy; OpenStreetMap contributors, SRTM | Estilo &copy; OpenTopoMap (CC-BY-SA)',
      },
    },
    layers: CAPAS_MAPA.map(({ id }) => ({
      id: idCapaMapa(id),
      type: 'raster' as const,
      source: id,
      layout: { visibility: id === capaInicial ? ('visible' as const) : ('none' as const) },
    })),
  };
}

// Centro aproximado de Venezuela.
export const CENTRO_VENEZUELA: [number, number] = [-66.5897, 8.0];
export const ZOOM_INICIAL = 5.6;
