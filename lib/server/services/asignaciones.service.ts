import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type {
  CrearAsignacionInput,
  ActualizarAsignacionInput,
} from '@/lib/server/validators/asignacion.schema';

/** Errores de negocio (no de validación de forma) que el Route Handler traduce a un status. */
export class AsignacionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Equipo de una obra, ordenado por nivel jerárquico del cargo (para el organigrama). */
export async function listarAsignacionesDeObra(obraId: string) {
  return prisma.obraPersonal.findMany({
    where: { obraId },
    include: { persona: true, cargo: true },
    orderBy: [{ cargo: { nivelJerarquico: 'asc' } }],
  });
}

async function validarSupervisorMismaObra(obraId: string, supervisorId?: string) {
  if (!supervisorId) return;
  const supervisor = await prisma.obraPersonal.findUnique({ where: { id: supervisorId } });
  if (!supervisor || supervisor.obraId !== obraId) {
    throw new AsignacionError(400, 'El supervisor seleccionado no pertenece a esta obra.');
  }
}

export async function crearAsignacion(obraId: string, data: CrearAsignacionInput, usuarioId: string) {
  await validarSupervisorMismaObra(obraId, data.supervisorId);

  try {
    const asignacion = await prisma.obraPersonal.create({
      data: {
        obraId,
        personaId: data.personaId,
        cargoId: data.cargoId,
        area: data.area,
        supervisorId: data.supervisorId,
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : undefined,
        fechaSalida: data.fechaSalida ? new Date(data.fechaSalida) : undefined,
        visiblePublico: data.visiblePublico,
      },
      include: { persona: true, cargo: true },
    });

    await registrarAuditoria({
      usuarioId,
      accion: 'CREATE',
      entidad: 'ObraPersonal',
      entidadId: asignacion.id,
      datosDespues: asignacion,
    });

    return asignacion;
  } catch (error) {
    // P2002: viola @@unique([obraId, personaId, cargoId]).
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new AsignacionError(409, 'Esta persona ya está asignada a esta obra con ese mismo cargo.');
    }
    throw error;
  }
}

export async function actualizarAsignacion(
  id: string,
  data: ActualizarAsignacionInput,
  usuarioId: string
) {
  const antes = await prisma.obraPersonal.findUnique({ where: { id } });
  if (!antes) return null;

  if (data.supervisorId) {
    await validarSupervisorMismaObra(antes.obraId, data.supervisorId);
  }

  const asignacion = await prisma.obraPersonal.update({
    where: { id },
    data: {
      ...data,
      fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : undefined,
      fechaSalida: data.fechaSalida ? new Date(data.fechaSalida) : undefined,
    },
    include: { persona: true, cargo: true },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'UPDATE',
    entidad: 'ObraPersonal',
    entidadId: id,
    datosAntes: antes,
    datosDespues: asignacion,
  });

  return asignacion;
}

export async function eliminarAsignacion(id: string, usuarioId: string) {
  const asignacion = await prisma.obraPersonal.findUnique({ where: { id } });
  if (!asignacion) return null;

  await prisma.obraPersonal.delete({ where: { id } });

  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: 'ObraPersonal',
    entidadId: id,
    datosAntes: asignacion,
  });

  return asignacion;
}
