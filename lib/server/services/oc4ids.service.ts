import { prisma } from '@/lib/server/prisma';
import { empaquetarOc4ids, mapearAOc4ids, type ObraParaOc4ids } from '@/lib/server/oc4ids/mapear';

// Exportación OC4IDS (MODULOS_AVANZADOS.md, módulo 7): solo obras PUBLICADAS y
// solo los campos que el portal ya muestra.

interface FilaGeometria {
  id: string;
  ubicacion: { coordinates: [number, number] } | null;
  trazado: { type: string; coordinates: unknown } | null;
}

async function cargarObras(where: { codigo?: string }): Promise<ObraParaOc4ids[]> {
  const obras = await prisma.obra.findMany({
    where: { estadoPublicacion: 'PUBLICADO', ...where },
    orderBy: { codigo: 'asc' },
    include: {
      tipoObra: { select: { nombre: true } },
      estatus: { select: { nombre: true } },
      ente: { select: { nombre: true } },
      fuenteFinanciamiento: { select: { nombre: true } },
      contratista: { select: { razonSocial: true, rif: true } },
      estado: { select: { nombre: true } },
      municipio: { select: { nombre: true } },
      parroquia: { select: { nombre: true } },
      hitos: { orderBy: { orden: 'asc' } },
      contrato: { include: { adendas: { orderBy: { numero: 'asc' } } } },
    },
  });
  if (obras.length === 0) return [];

  const ids = obras.map((o) => o.id);
  const geometrias = await prisma.$queryRaw<FilaGeometria[]>`
    SELECT id, ST_AsGeoJSON(ubicacion)::json AS ubicacion, ST_AsGeoJSON(trazado)::json AS trazado
    FROM obras WHERE id = ANY(${ids}::text[])
  `;
  const geometriaPorId = new Map(geometrias.map((g) => [g.id, g]));

  return obras.map((o) => ({
    codigo: o.codigo,
    slug: o.slug,
    nombre: o.nombre,
    descripcion: o.descripcion,
    tipoObra: o.tipoObra.nombre,
    estatus: o.estatus.nombre,
    ente: o.ente.nombre,
    fuenteFinanciamiento: o.fuenteFinanciamiento?.nombre ?? null,
    contratista: o.contratista,
    estado: o.estado.nombre,
    municipio: o.municipio.nombre,
    parroquia: o.parroquia?.nombre ?? null,
    direccion: o.direccion,
    presupuestoAprobado: Number(o.presupuestoAprobado),
    montoEjecutado: Number(o.montoEjecutado),
    moneda: o.moneda,
    fechaAprobacion: o.fechaAprobacion,
    fechaInicio: o.fechaInicio,
    fechaFinEstimada: o.fechaFinEstimada,
    fechaFinReal: o.fechaFinReal,
    beneficiarios: o.beneficiarios,
    capacidadDescripcion: o.capacidadDescripcion,
    actualizadoEn: o.updatedAt,
    punto: geometriaPorId.get(o.id)?.ubicacion?.coordinates ?? null,
    trazado: geometriaPorId.get(o.id)?.trazado ?? null,
    hitos: o.hitos,
    contrato: o.contrato && {
      numeroContrato: o.contrato.numeroContrato,
      modalidad: o.contrato.modalidad,
      moneda: o.contrato.moneda,
      montoOriginal: Number(o.contrato.montoOriginal),
      montoActual: Number(o.contrato.montoActual),
      fechaFirma: o.contrato.fechaFirma,
      plazoEjecucionDias: o.contrato.plazoEjecucionDias,
      documentoUrl: o.contrato.documentoUrl,
      adendas: o.contrato.adendas.map((a) => ({
        numero: a.numero,
        motivo: a.motivo,
        montoAnterior: Number(a.montoAnterior),
        montoNuevo: Number(a.montoNuevo),
        diasAdicionales: a.diasAdicionales,
        documentoUrl: a.documentoUrl,
        fecha: a.fecha,
      })),
    },
  }));
}

/** Paquete OC4IDS con todas las obras publicadas. */
export async function obtenerPaqueteOc4ids(origen: string) {
  const obras = await cargarObras({});
  return empaquetarOc4ids(obras.map((o) => mapearAOc4ids(o, origen)), origen);
}

/** Un proyecto OC4IDS por código de obra (OBR-2026-00001); null si no existe o no está publicada. */
export async function obtenerProyectoOc4ids(codigo: string, origen: string) {
  const [obra] = await cargarObras({ codigo });
  return obra ? mapearAOc4ids(obra, origen) : null;
}
