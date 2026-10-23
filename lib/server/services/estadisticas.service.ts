import { prisma } from '@/lib/server/prisma';
import type { FilaEstadistica } from '@/lib/estadisticas';

/**
 * Una fila mínima por obra PUBLICADA (sin nombre, código ni ubicación exacta)
 * para el dashboard público (PLAN_PROYECTO.md sección 3.1). Los agregados y
 * filtros se calculan con lib/estadisticas.ts, en el navegador y sin nuevas
 * consultas. Son solo conteos y sumas: no necesita PostGIS ni SQL crudo.
 */
export async function obtenerFilasEstadisticas(): Promise<FilaEstadistica[]> {
  const obras = await prisma.obra.findMany({
    where: { estadoPublicacion: 'PUBLICADO' },
    select: {
      avanceFisico: true,
      presupuestoAprobado: true,
      moneda: true,
      fechaAprobacion: true,
      fechaFinReal: true,
      estatus: { select: { nombre: true, color: true, orden: true } },
      tipoObra: { select: { nombre: true, color: true } },
      estado: { select: { nombre: true } },
    },
  });

  return obras.map((o) => ({
    estado: o.estado.nombre,
    tipo: o.tipoObra.nombre,
    tipoColor: o.tipoObra.color ?? '#6B7280',
    estatus: o.estatus.nombre,
    estatusColor: o.estatus.color ?? '#94A3B8',
    estatusOrden: o.estatus.orden,
    moneda: o.moneda,
    presupuesto: Number(o.presupuestoAprobado),
    avance: o.avanceFisico,
    anioAprobacion: o.fechaAprobacion ? o.fechaAprobacion.getFullYear() : null,
    anioFinReal: o.fechaFinReal ? o.fechaFinReal.getFullYear() : null,
  }));
}
