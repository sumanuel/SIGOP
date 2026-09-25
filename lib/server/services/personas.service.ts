import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearPersonaInput, ActualizarPersonaInput } from '@/lib/server/validators/persona.schema';

/** Directorio único de personas (una persona puede estar en varias obras). */
export async function listarPersonas() {
  return prisma.persona.findMany({
    orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    include: { _count: { select: { asignaciones: true } } },
  });
}

export async function obtenerPersona(id: string) {
  return prisma.persona.findUnique({
    where: { id },
    include: {
      asignaciones: {
        include: { obra: { select: { id: true, nombre: true, slug: true } }, cargo: true },
      },
    },
  });
}

export async function crearPersona(data: CrearPersonaInput, usuarioId: string) {
  const persona = await prisma.persona.create({
    data: {
      ...data,
      fechaConsentimiento: data.consentimientoPublicacion ? new Date() : undefined,
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREATE',
    entidad: 'Persona',
    entidadId: persona.id,
    datosDespues: persona,
  });

  return persona;
}

export async function actualizarPersona(id: string, data: ActualizarPersonaInput, usuarioId: string) {
  const antes = await prisma.persona.findUnique({ where: { id } });
  if (!antes) return null;

  // Si se activa el consentimiento por primera vez, se registra la fecha
  // (si ya estaba activo y se vuelve a guardar, no se pisa la fecha original).
  const fechaConsentimiento =
    data.consentimientoPublicacion && !antes.consentimientoPublicacion ? new Date() : undefined;

  const persona = await prisma.persona.update({
    where: { id },
    data: { ...data, ...(fechaConsentimiento ? { fechaConsentimiento } : {}) },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'UPDATE',
    entidad: 'Persona',
    entidadId: id,
    datosAntes: antes,
    datosDespues: persona,
  });

  return persona;
}

export async function eliminarPersona(id: string, usuarioId: string) {
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) return null;

  // onDelete: Cascade en ObraPersonal.personaId — se eliminan también sus asignaciones.
  await prisma.persona.delete({ where: { id } });

  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: 'Persona',
    entidadId: id,
    datosAntes: persona,
  });

  return persona;
}
