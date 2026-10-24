import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { normalizarFechas } from '@/lib/hitos';
import type { ActualizarHitoInput, CrearHitoInput } from '@/lib/server/validators/hito.schema';

/** Regla de negocio de hitos (obra publicada y rol de editor…); el Route Handler la traduce a su status. */
export class HitoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ROLES_HITOS = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR'];

/** Los hitos salen en la ficha pública: en una obra publicada, un editor debe pedirlo a un aprobador. */
async function verificarPermiso(obraId: string, rol: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { estadoPublicacion: true } });
  if (!obra) throw new HitoError(404, 'Obra no encontrada.');
  if (obra.estadoPublicacion === 'PUBLICADO' && rol === 'EDITOR_OBRA') {
    throw new HitoError(403, 'Esta obra está publicada: pídele a un aprobador que modifique sus hitos.');
  }
}

export async function listarHitos(obraId: string) {
  return prisma.hito.findMany({ where: { obraId }, orderBy: { orden: 'asc' } });
}

export async function crearHito(obraId: string, data: CrearHitoInput, usuarioId: string, rol: string) {
  await verificarPermiso(obraId, rol);
  const ultimo = await prisma.hito.aggregate({ where: { obraId }, _max: { orden: true } });
  const fechas = normalizarFechas(data.completado, data.fechaReal);

  const hito = await prisma.hito.create({
    data: {
      obraId,
      nombre: data.nombre,
      fechaPlanificada: data.fechaPlanificada ? new Date(data.fechaPlanificada) : null,
      ...fechas,
      orden: (ultimo._max.orden ?? 0) + 1,
    },
  });
  await registrarAuditoria({ usuarioId, accion: 'CREATE', entidad: 'Hito', entidadId: hito.id, datosDespues: hito });
  return hito;
}

export async function actualizarHito(id: string, data: ActualizarHitoInput, usuarioId: string, rol: string) {
  const antes = await prisma.hito.findUnique({ where: { id } });
  if (!antes) return null;
  await verificarPermiso(antes.obraId, rol);

  // Solo se recalcula el estado si la petición toca `completado` o `fechaReal`.
  const tocaEstado = data.completado !== undefined || data.fechaReal !== undefined;
  const fechas = tocaEstado
    ? normalizarFechas(data.completado ?? antes.completado, data.fechaReal ?? antes.fechaReal?.toISOString())
    : null;

  const hito = await prisma.hito.update({
    where: { id },
    data: {
      nombre: data.nombre,
      ...(data.fechaPlanificada !== undefined
        ? { fechaPlanificada: data.fechaPlanificada ? new Date(data.fechaPlanificada) : null }
        : {}),
      ...(fechas ?? {}),
    },
  });
  await registrarAuditoria({ usuarioId, accion: 'UPDATE', entidad: 'Hito', entidadId: id, datosAntes: antes, datosDespues: hito });
  return hito;
}

/** Intercambia el orden con el hito vecino; no hace nada en los extremos. */
export async function moverHito(id: string, direccion: 'arriba' | 'abajo', usuarioId: string, rol: string) {
  const hito = await prisma.hito.findUnique({ where: { id } });
  if (!hito) return null;
  await verificarPermiso(hito.obraId, rol);

  const hitos = await listarHitos(hito.obraId);
  const i = hitos.findIndex((h) => h.id === id);
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (j < 0 || j >= hitos.length) return hitos;

  // Se reasignan posiciones consecutivas: así tampoco importa si había órdenes repetidos.
  const nuevo = [...hitos];
  [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
  await prisma.$transaction(nuevo.map((h, posicion) => prisma.hito.update({ where: { id: h.id }, data: { orden: posicion + 1 } })));
  await registrarAuditoria({ usuarioId, accion: 'UPDATE', entidad: 'Hito', entidadId: id, datosDespues: { reordenado: direccion } });
  return listarHitos(hito.obraId);
}

export async function eliminarHito(id: string, usuarioId: string, rol: string) {
  const hito = await prisma.hito.findUnique({ where: { id } });
  if (!hito) return null;
  await verificarPermiso(hito.obraId, rol);
  await prisma.hito.delete({ where: { id } });
  await registrarAuditoria({ usuarioId, accion: 'DELETE', entidad: 'Hito', entidadId: id, datosAntes: hito });
  return hito;
}
