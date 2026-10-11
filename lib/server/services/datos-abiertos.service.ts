import { prisma } from '@/lib/server/prisma';

// Datos abiertos: solo obras PUBLICADAS y solo campos que ya muestra el portal
// público. Nunca se incluye personal (personas, cédulas, contactos) ni
// reportes ciudadanos — ver sección 8 del plan (protección de datos).

export interface ObraAbierta {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoObra: string;
  estatus: string;
  ente: string;
  contratista: string | null;
  contratistaRif: string | null;
  fuenteFinanciamiento: string | null;
  estado: string;
  municipio: string;
  parroquia: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  presupuestoAprobado: number;
  montoEjecutado: number;
  moneda: string;
  fechaAprobacion: string | null;
  fechaInicio: string | null;
  fechaFinEstimada: string | null;
  fechaFinReal: string | null;
  avanceFisico: number;
  avanceFinanciero: number;
  beneficiarios: number | null;
  capacidad: string | null;
  fichaUrl: string;
  actualizadoEn: string;
}

interface FilaObraAbierta extends Omit<ObraAbierta, 'fichaUrl' | 'latitud' | 'longitud'> {
  slug: string;
  ubicacionGeojson: { coordinates: [number, number] } | null;
  trazadoGeojson: { type: string; coordinates: unknown } | null;
}

export interface DatosAbiertosObras {
  obras: ObraAbierta[];
  trazados: { codigo: string; coordinates: unknown }[];
}

export async function obtenerObrasAbiertas(origen: string): Promise<DatosAbiertosObras> {
  const filas = await prisma.$queryRaw<FilaObraAbierta[]>`
    SELECT
      o.codigo,
      o.slug,
      o.nombre,
      o.descripcion,
      t.nombre AS "tipoObra",
      e.nombre AS estatus,
      en.nombre AS ente,
      c."razonSocial" AS contratista,
      c.rif AS "contratistaRif",
      f.nombre AS "fuenteFinanciamiento",
      es.nombre AS estado,
      m.nombre AS municipio,
      p.nombre AS parroquia,
      o.direccion,
      o."presupuestoAprobado"::float AS "presupuestoAprobado",
      o."montoEjecutado"::float AS "montoEjecutado",
      o.moneda,
      to_char(o."fechaAprobacion", 'YYYY-MM-DD') AS "fechaAprobacion",
      to_char(o."fechaInicio", 'YYYY-MM-DD') AS "fechaInicio",
      to_char(o."fechaFinEstimada", 'YYYY-MM-DD') AS "fechaFinEstimada",
      to_char(o."fechaFinReal", 'YYYY-MM-DD') AS "fechaFinReal",
      o."avanceFisico" AS "avanceFisico",
      o."avanceFinanciero" AS "avanceFinanciero",
      o.beneficiarios,
      o."capacidadDescripcion" AS capacidad,
      to_char(o."updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "actualizadoEn",
      ST_AsGeoJSON(o.ubicacion)::json AS "ubicacionGeojson",
      ST_AsGeoJSON(o.trazado)::json AS "trazadoGeojson"
    FROM obras o
    JOIN tipos_obra t ON t.id = o."tipoObraId"
    JOIN estatus_obra e ON e.id = o."estatusId"
    JOIN entes en ON en.id = o."enteId"
    LEFT JOIN contratistas c ON c.id = o."contratistaId"
    LEFT JOIN fuentes_financiamiento f ON f.id = o."fuenteFinanciamientoId"
    JOIN estados es ON es.id = o."estadoId"
    JOIN municipios m ON m.id = o."municipioId"
    LEFT JOIN parroquias p ON p.id = o."parroquiaId"
    WHERE o."estadoPublicacion" = 'PUBLICADO'
    ORDER BY o.codigo
  `;

  const obras: ObraAbierta[] = [];
  const trazados: DatosAbiertosObras['trazados'] = [];

  for (const { slug, ubicacionGeojson, trazadoGeojson, ...resto } of filas) {
    obras.push({
      ...resto,
      latitud: ubicacionGeojson?.coordinates[1] ?? null,
      longitud: ubicacionGeojson?.coordinates[0] ?? null,
      fichaUrl: `${origen}/obras/${slug}`,
    });
    if (trazadoGeojson) trazados.push({ codigo: resto.codigo, coordinates: trazadoGeojson });
  }

  return { obras, trazados };
}

const COLUMNAS_CSV: (keyof ObraAbierta)[] = [
  'codigo',
  'nombre',
  'descripcion',
  'tipoObra',
  'estatus',
  'ente',
  'contratista',
  'contratistaRif',
  'fuenteFinanciamiento',
  'estado',
  'municipio',
  'parroquia',
  'direccion',
  'latitud',
  'longitud',
  'presupuestoAprobado',
  'montoEjecutado',
  'moneda',
  'fechaAprobacion',
  'fechaInicio',
  'fechaFinEstimada',
  'fechaFinReal',
  'avanceFisico',
  'avanceFinanciero',
  'beneficiarios',
  'capacidad',
  'fichaUrl',
  'actualizadoEn',
];

function celdaCsv(valor: string | number | null): string {
  if (valor === null) return '';
  let texto = String(valor);
  // Evita inyección de fórmulas al abrir el CSV en Excel/LibreOffice; solo
  // aplica a texto, no a números (un monto negativo no debe prefijarse).
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV con BOM UTF-8 para que Excel respete tildes y eñes. */
export function obrasACsv(obras: ObraAbierta[]): string {
  const filas = obras.map((obra) => COLUMNAS_CSV.map((col) => celdaCsv(obra[col])).join(','));
  return '﻿' + [COLUMNAS_CSV.join(','), ...filas].join('\r\n') + '\r\n';
}

export function obrasAGeoJson({ obras, trazados }: DatosAbiertosObras) {
  const puntos = obras
    .filter((obra) => obra.latitud !== null && obra.longitud !== null)
    .map(({ latitud, longitud, ...propiedades }) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [longitud, latitud] },
      properties: { ...propiedades, tipoGeometria: 'ubicacion' },
    }));

  const lineas = trazados.map(({ codigo, coordinates }) => ({
    type: 'Feature' as const,
    geometry: coordinates,
    properties: { codigo, tipoGeometria: 'trazado' },
  }));

  return { type: 'FeatureCollection' as const, features: [...puntos, ...lineas] };
}

/** Diccionario de datos: se muestra en la página pública y documenta las columnas. */
export const DICCIONARIO_OBRAS: { campo: keyof ObraAbierta; descripcion: string }[] = [
  { campo: 'codigo', descripcion: 'Código único de la obra (ej. OBR-2026-00005).' },
  { campo: 'nombre', descripcion: 'Nombre de la obra.' },
  { campo: 'descripcion', descripcion: 'Descripción general.' },
  { campo: 'tipoObra', descripcion: 'Categoría (Salud, Educación, Vialidad…).' },
  { campo: 'estatus', descripcion: 'Estatus de ejecución (En ejecución, Inaugurada…).' },
  { campo: 'ente', descripcion: 'Ente público responsable.' },
  { campo: 'contratista', descripcion: 'Empresa contratista, si aplica.' },
  { campo: 'contratistaRif', descripcion: 'RIF de la contratista.' },
  { campo: 'fuenteFinanciamiento', descripcion: 'Origen de los recursos.' },
  { campo: 'estado', descripcion: 'Estado donde se ubica la obra.' },
  { campo: 'municipio', descripcion: 'Municipio.' },
  { campo: 'parroquia', descripcion: 'Parroquia.' },
  { campo: 'direccion', descripcion: 'Dirección o referencia.' },
  { campo: 'latitud', descripcion: 'Latitud en grados decimales (WGS84).' },
  { campo: 'longitud', descripcion: 'Longitud en grados decimales (WGS84).' },
  { campo: 'presupuestoAprobado', descripcion: 'Presupuesto aprobado, en la moneda indicada.' },
  { campo: 'montoEjecutado', descripcion: 'Monto ejecutado a la fecha, en la moneda indicada.' },
  { campo: 'moneda', descripcion: 'Moneda de los montos (VES, USD…). No hay conversión.' },
  { campo: 'fechaAprobacion', descripcion: 'Fecha de aprobación (AAAA-MM-DD).' },
  { campo: 'fechaInicio', descripcion: 'Fecha de inicio (AAAA-MM-DD).' },
  { campo: 'fechaFinEstimada', descripcion: 'Fecha estimada de culminación (AAAA-MM-DD).' },
  { campo: 'fechaFinReal', descripcion: 'Fecha real de culminación (AAAA-MM-DD).' },
  { campo: 'avanceFisico', descripcion: 'Avance físico, de 0 a 100.' },
  { campo: 'avanceFinanciero', descripcion: 'Avance financiero, de 0 a 100.' },
  { campo: 'beneficiarios', descripcion: 'Beneficiarios estimados.' },
  { campo: 'capacidad', descripcion: 'Capacidad o magnitud (120 camas, 14 km…).' },
  { campo: 'fichaUrl', descripcion: 'Enlace a la ficha pública de la obra.' },
  { campo: 'actualizadoEn', descripcion: 'Última actualización del registro (UTC, ISO 8601).' },
];
