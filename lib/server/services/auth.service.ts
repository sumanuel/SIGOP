import { prisma } from '@/lib/server/prisma';
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  payloadDeSesion,
} from '@/lib/server/auth';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { crearTokenLogin2fa } from '@/lib/server/services/dos-factores.service';

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

  // Con 2FA activo todavía NO se emite sesión: el login se completa en
  // completarLoginConCodigo (dos-factores.service.ts) con el código TOTP.
  if (usuario.twoFactorSecret) {
    return { requiere2fa: true as const, token2fa: crearTokenLogin2fa(usuario.id) };
  }

  const payload = payloadDeSesion(usuario);

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await registrarAuditoria({
    usuarioId: usuario.id,
    accion: 'LOGIN',
    entidad: 'Usuario',
    entidadId: usuario.id,
  });

  return { requiere2fa: false as const, usuario, accessToken, refreshToken, debeConfigurar2fa: Boolean(payload.sin2fa) };
}

/**
 * Verifica el refresh token y emite un nuevo par (rotación de refresh token).
 * Consulta la base: una cuenta desactivada o eliminada ya no renueva, y el rol
 * y el ente salen del registro actual (no del token viejo), así que una baja o
 * un cambio de rol surte efecto en cuanto vence el access token (15 min).
 */
export async function renovarSesion(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken); // lanza si es inválido/expiró

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, rol: true, enteId: true, activo: true, twoFactorSecret: true },
  });
  if (!usuario || !usuario.activo) throw new Error('Cuenta inactiva');

  const nuevoPayload = payloadDeSesion(usuario);

  return {
    accessToken: signAccessToken(nuevoPayload),
    refreshToken: signRefreshToken(nuevoPayload),
  };
}
