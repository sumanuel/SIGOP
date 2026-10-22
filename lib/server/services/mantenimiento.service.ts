import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearIntervencionInput, GarantiaInput } from '@/lib/server/validators/mantenimiento.schema';

/** Regla de negocio del mantenimiento (obra sin garantía…); el Route Handler la traduce a su status. */
export class MantenimientoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Sin EDITOR_OBRA a propósito: esto se publica de inmediato en la ficha de obras ya
// entregadas (siempre publicadas), así que lo registran quienes pueden aprobar.
export const ROLES_MANTENIMIENTO = ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR'];

export async function obtenerMantenimientoDeObra(obraId: string) {
  return prisma.garantiaObra.findUnique({
    where: { obraId },
    include: { intervenciones: { orderBy: { fecha: 'desc' } } },
  });
}

/** Crea o corrige la garantía de la obra (una por obra). */
export async function guardarGarantia(obraId: string, data: GarantiaInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } });
  if (!obra) throw new MantenimientoError(404, 'Obra no encontrada.');

  const antes = await prisma.garantiaObra.findUnique({ where: { obraId } });
  const campos = {
    fechaInicioGarantia: new Date(data.fechaInicioGarantia),
    fechaFinGarantia: new Date(data.fechaFinGarantia),
    cubreEstructura: data.cubreEstructura,
    cubreInstalaciones: data.cubreInstalaciones,
    observaciones: data.observaciones || null,
    registradoPor: usuarioId,
  };
  const garantia = await prisma.garantiaObra.upsert({
    where: { obraId },
    create: { obraId, ...campos },
    update: campos,
  });

  await registrarAuditoria({
    usuarioId,
    accion: antes ? 'UPDATE' : 'CREATE',
    entidad: 'GarantiaObra',
    entidadId: garantia.id,
    datosAntes: antes ?? undefined,
    datosDespues: garantia,
  });
  return garantia;
}

export async function crearIntervencion(obraId: string, data: CrearIntervencionInput, usuarioId: string) {
  const garantia = await prisma.garantiaObra.findUnique({ where: { obraId }, select: { id: true } });
  if (!garantia) throw new MantenimientoError(409, 'Registra primero la garantía de la obra.');
  if (data.fecha && new Date(data.fecha).getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new MantenimientoError(400, 'La fecha de la intervención no puede estar en el futuro.');
  }

  const intervencion = await prisma.intervencionMantenimiento.create({
    data: {
      garantiaId: garantia.id,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      tipo: data.tipo,
      descripcion: data.descripcion,
      costo: data.costo,
      moneda: data.moneda,
      realizadoPor: data.realizadoPor || null,
      fotoAntesUrl: data.fotoAntesUrl,
      fotoDespuesUrl: data.fotoDespuesUrl,
      registradoPor: usuarioId,
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREATE',
    entidad: 'IntervencionMantenimiento',
    entidadId: intervencion.id,
    datosDespues: intervencion,
  });
  return intervencion;
}

export async function eliminarIntervencion(id: string, usuarioId: string) {
  const intervencion = await prisma.intervencionMantenimiento.findUnique({ where: { id } });
  if (!intervencion) return null;
  await prisma.intervencionMantenimiento.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: 'IntervencionMantenimiento',
    entidadId: id,
    datosAntes: intervencion,
  });
  return intervencion;
}
