import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearReporteInput } from '@/lib/server/validators/reporte.schema';
import type { EstadoModeracion } from '@prisma/client';

/**
 * Crea un reporte ciudadano en estado PENDIENTE (pasa por moderación antes
 * de ser visible — ver PLAN_PROYECTO.md sección 3.1 "Participación
 * ciudadana"). Devuelve `null` si la obra no existe.
 *
 * Si el honeypot viene lleno, se asume que es un bot: se devuelve un
 * resultado "simulado" sin persistir nada, para no darle al bot ninguna
 * señal de que fue detectado.
 */
export async function crearReporteCiudadano(obraId: string, data: CrearReporteInput) {
  if (data.sitioWeb) {
    return { id: 'omitido', simulado: true as const };
  }

  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } });
  if (!obra) return null;

  return prisma.reporteCiudadano.create({
    data: {
      obraId,
      nombre: data.nombre,
      correo: data.correo,
      mensaje: data.mensaje,
      fotoUrl: data.fotoUrl,
    },
  });
}

/** Bandeja de moderación (panel admin), opcionalmente filtrada por estado. */
export async function listarReportes(estado?: EstadoModeracion) {
  return prisma.reporteCiudadano.findMany({
    where: estado ? { estadoModeracion: estado } : undefined,
    include: { obra: { select: { id: true, nombre: true, codigo: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function moderarReporte(id: string, estado: 'APROBADO' | 'RECHAZADO', usuarioId: string) {
  const antes = await prisma.reporteCiudadano.findUnique({ where: { id } });
  if (!antes) return null;

  const reporte = await prisma.reporteCiudadano.update({
    where: { id },
    data: { estadoModeracion: estado, moderadoPor: usuarioId, moderadoEn: new Date() },
  });

  await registrarAuditoria({
    usuarioId,
    accion: estado === 'APROBADO' ? 'APPROVE' : 'REJECT',
    entidad: 'ReporteCiudadano',
    entidadId: id,
    datosAntes: antes,
    datosDespues: reporte,
  });

  return reporte;
}
