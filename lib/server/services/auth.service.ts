import { prisma } from '@/lib/server/prisma';
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from '@/lib/server/auth';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';

/**
 * Valida credenciales y emite un par de tokens. Devuelve `null` tanto si el
 * usuario no existe como si la contraseña es incorrecta — el mismo mensaje
 * genérico evita que alguien pueda usar el login para adivinar qué correos
 * están registrados (enumeración de usuarios).
 */
export async function autenticarUsuario(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) return null;

  const valido = await comparePassword(password, usuario.password);
  if (!valido) return null;

  const payload: JwtPayload = {
    sub: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    enteId: usuario.enteId,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'LOGIN',
    entidad: 'Usuario',
    entidadId: usuario.id,
  });

  return { usuario, accessToken, refreshToken };
}

/** Verifica el refresh token y emite un nuevo par (rotación de refresh token). */
export function renovarSesion(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken); // lanza si es inválido/expiró

  const nuevoPayload: JwtPayload = {
    sub: payload.sub,
    email: payload.email,
    rol: payload.rol,
    enteId: payload.enteId,
  };

  return {
    accessToken: signAccessToken(nuevoPayload),
    refreshToken: signRefreshToken(nuevoPayload),
  };
}
