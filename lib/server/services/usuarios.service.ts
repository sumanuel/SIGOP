import { prisma } from '@/lib/server/prisma';
import { hashPassword } from '@/lib/server/auth';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearUsuarioInput, ActualizarUsuarioInput } from '@/lib/server/validators/usuario.schema';

/** Lanzado por reglas de negocio propias de usuarios (correo duplicado,
 * dejar el sistema sin ningún super administrador activo, autogestión
 * peligrosa) — el Route Handler lo traduce a un 400/409 legible. */
export class UsuarioError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Nunca se selecciona `password` ni `twoFactorSecret` — ni siquiera para
// devolverlos al propio panel admin. Si un día se necesita el hash (ej. para
// comparar en login), se consulta aparte con su propio `findUnique`.
const SELECCION_PUBLICA = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  enteId: true,
  createdAt: true,
  ente: { select: { id: true, nombre: true } },
} as const;

export async function listarUsuarios() {
  return prisma.usuario.findMany({ select: SELECCION_PUBLICA, orderBy: { nombre: 'asc' } });
}

export async function obtenerUsuario(id: string) {
  return prisma.usuario.findUnique({ where: { id }, select: SELECCION_PUBLICA });
}

export async function crearUsuario(data: CrearUsuarioInput, actorId: string) {
  const existente = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (existente) {
    throw new UsuarioError(409, 'Ya existe un usuario con ese correo.');
  }

  const password = await hashPassword(data.password);

  const usuario = await prisma.usuario.create({
    data: { nombre: data.nombre, email: data.email, password, rol: data.rol, enteId: data.enteId },
    select: SELECCION_PUBLICA,
  });

  await registrarAuditoria({
    usuarioId: actorId,
    accion: 'CREATE',
    entidad: 'Usuario',
    entidadId: usuario.id,
    datosDespues: usuario,
  });

  return usuario;
}

/** `true` si, quitando a `idExcluido`, queda al menos un SUPER_ADMIN activo. */
async function quedaAlMenosUnSuperAdmin(idExcluido: string): Promise<boolean> {
  const otros = await prisma.usuario.count({
    where: { rol: 'SUPER_ADMIN', activo: true, id: { not: idExcluido } },
  });
  return otros > 0;
}

export async function actualizarUsuario(id: string, data: ActualizarUsuarioInput, actorId: string) {
  const antes = await prisma.usuario.findUnique({ where: { id } });
  if (!antes) return null;

  const esUnoMismo = id === actorId;
  if (esUnoMismo && data.activo === false) {
    throw new UsuarioError(400, 'No puedes desactivar tu propia cuenta.');
  }
  if (esUnoMismo && data.rol && data.rol !== antes.rol) {
    throw new UsuarioError(400, 'No puedes cambiar tu propio rol.');
  }

  const dejaDeSerSuperAdminActivo =
    antes.rol === 'SUPER_ADMIN' && antes.activo && ((data.rol && data.rol !== 'SUPER_ADMIN') || data.activo === false);
  if (dejaDeSerSuperAdminActivo && !(await quedaAlMenosUnSuperAdmin(id))) {
    throw new UsuarioError(400, 'Debe quedar al menos un super administrador activo.');
  }

  if (data.email && data.email !== antes.email) {
    const enUso = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (enUso) throw new UsuarioError(409, 'Ya existe un usuario con ese correo.');
  }

  const password = data.password ? await hashPassword(data.password) : undefined;

  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      enteId: data.enteId,
      activo: data.activo,
      password,
    },
    select: SELECCION_PUBLICA,
  });

  await registrarAuditoria({
    usuarioId: actorId,
    accion: 'UPDATE',
    entidad: 'Usuario',
    // `password` nunca debe llegar a la bitácora, ni siquiera hasheada.
    entidadId: id,
    datosAntes: { ...antes, password: undefined, twoFactorSecret: undefined },
    datosDespues: usuario,
  });

  return usuario;
}

export async function eliminarUsuario(id: string, actorId: string) {
  if (id === actorId) {
    throw new UsuarioError(400, 'No puedes eliminar tu propia cuenta.');
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return null;

  if (usuario.rol === 'SUPER_ADMIN' && usuario.activo && !(await quedaAlMenosUnSuperAdmin(id))) {
    throw new UsuarioError(400, 'Debe quedar al menos un super administrador activo.');
  }

  // Sin onDelete: Restrict apuntando a Usuario — las referencias en
  // Auditoria/Avance/Obra son ids sueltos, no relaciones de Prisma, así que
  // el borrado no falla; esas vistas ya muestran "Usuario desconocido"
  // cuando no encuentran el id (ver dashboard.service.ts).
  await prisma.usuario.delete({ where: { id } });

  await registrarAuditoria({
    usuarioId: actorId,
    accion: 'DELETE',
    entidad: 'Usuario',
    entidadId: id,
    datosAntes: { ...usuario, password: undefined, twoFactorSecret: undefined },
  });

  return usuario;
}
