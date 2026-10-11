import QRCode from 'qrcode';
import { prisma } from '@/lib/server/prisma';
import {
  comparePassword,
  firmarTokenTemporal,
  signAccessToken,
  signRefreshToken,
  verificarTokenTemporal,
  type JwtPayload,
} from '@/lib/server/auth';
import { cifrarSecreto, descifrarSecreto } from '@/lib/server/secret-box';
import { construirUriOtpauth, generarSecretoTotp, verificarCodigoTotp } from '@/lib/server/totp';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';

/** Regla de negocio del 2FA (código incorrecto, ya activado…) — el Route
 * Handler la traduce a su status legible. */
export class DosFactoresError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const VIGENCIA_LOGIN_SEG = 5 * 60;
const VIGENCIA_CONFIGURACION_SEG = 10 * 60;

// Un usuario tiene 2FA activo si y solo si `twoFactorSecret` no es null: el
// secreto solo se guarda cuando el usuario ya demostró, con un código válido,
// que su app de autenticación lo registró bien (ver confirmarConfiguracion).

export async function dosFactoresActivo(usuarioId: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { twoFactorSecret: true } });
  return Boolean(usuario?.twoFactorSecret);
}

export function crearTokenLogin2fa(usuarioId: string): string {
  return firmarTokenTemporal('login-2fa', { sub: usuarioId }, VIGENCIA_LOGIN_SEG);
}

/** Segundo paso del login: valida el token temporal + el código y emite la sesión. */
export async function completarLoginConCodigo(tokenLogin: string, codigo: string) {
  const claims = verificarTokenTemporal('login-2fa', tokenLogin);
  if (!claims) throw new DosFactoresError(401, 'La verificación expiró. Inicia sesión de nuevo.');

  const usuario = await prisma.usuario.findUnique({ where: { id: claims.sub } });
  if (!usuario || !usuario.activo || !usuario.twoFactorSecret) {
    throw new DosFactoresError(401, 'La verificación expiró. Inicia sesión de nuevo.');
  }

  if (!verificarCodigoTotp(descifrarSecreto(usuario.twoFactorSecret), codigo)) {
    throw new DosFactoresError(401, 'Código incorrecto. Revisa tu app de autenticación.');
  }

  const payload: JwtPayload = { sub: usuario.id, email: usuario.email, rol: usuario.rol, enteId: usuario.enteId };

  await registrarAuditoria({ usuarioId: usuario.id, accion: 'LOGIN', entidad: 'Usuario', entidadId: usuario.id });

  return { usuario, accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
}

/** Genera un secreto nuevo y su QR. Todavía NO se guarda: eso ocurre al confirmar. */
export async function iniciarConfiguracion(usuarioId: string, email: string) {
  if (await dosFactoresActivo(usuarioId)) {
    throw new DosFactoresError(409, 'La verificación en dos pasos ya está activada.');
  }

  const secreto = generarSecretoTotp();
  const uri = construirUriOtpauth(secreto, email);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  // El secreto viaja dentro de un token firmado de vida corta en vez de
  // guardarse a medias en la base: si el usuario abandona el proceso, no
  // queda nada a medio configurar que pueda bloquearle el login.
  const tokenConfiguracion = firmarTokenTemporal(
    'configurar-2fa',
    { sub: usuarioId, secreto: cifrarSecreto(secreto) },
    VIGENCIA_CONFIGURACION_SEG
  );

  return { secreto, qr, tokenConfiguracion };
}

export async function confirmarConfiguracion(usuarioId: string, tokenConfiguracion: string, codigo: string) {
  const claims = verificarTokenTemporal('configurar-2fa', tokenConfiguracion);
  if (!claims || claims.sub !== usuarioId) {
    throw new DosFactoresError(400, 'La configuración expiró. Vuelve a empezar.');
  }

  const secreto = descifrarSecreto(claims.secreto);
  if (!verificarCodigoTotp(secreto, codigo)) {
    throw new DosFactoresError(400, 'Código incorrecto. Revisa tu app de autenticación e inténtalo de nuevo.');
  }

  if (await dosFactoresActivo(usuarioId)) {
    throw new DosFactoresError(409, 'La verificación en dos pasos ya está activada.');
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { twoFactorSecret: cifrarSecreto(secreto) } });
  await registrarAuditoria({
    usuarioId,
    accion: '2FA_ACTIVADO',
    entidad: 'Usuario',
    entidadId: usuarioId,
  });
}

/** El propio usuario la desactiva: exige contraseña Y un código vigente. */
export async function desactivarPropio(usuarioId: string, password: string, codigo: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.twoFactorSecret) {
    throw new DosFactoresError(409, 'La verificación en dos pasos no está activada.');
  }
  if (!(await comparePassword(password, usuario.password))) {
    throw new DosFactoresError(400, 'La contraseña es incorrecta.');
  }
  if (!verificarCodigoTotp(descifrarSecreto(usuario.twoFactorSecret), codigo)) {
    throw new DosFactoresError(400, 'Código incorrecto. Revisa tu app de autenticación.');
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { twoFactorSecret: null } });
  await registrarAuditoria({ usuarioId, accion: '2FA_DESACTIVADO', entidad: 'Usuario', entidadId: usuarioId });
}

/** Recuperación: un super administrador quita el 2FA de otra cuenta (celular perdido). */
export async function reiniciarDeOtroUsuario(usuarioObjetivoId: string, actorId: string) {
  if (usuarioObjetivoId === actorId) {
    throw new DosFactoresError(400, 'Para desactivar tu propia verificación usa la página Seguridad.');
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioObjetivoId },
    select: { id: true, twoFactorSecret: true },
  });
  if (!usuario) throw new DosFactoresError(404, 'Usuario no encontrado.');
  if (!usuario.twoFactorSecret) throw new DosFactoresError(409, 'Ese usuario no tiene verificación en dos pasos.');

  await prisma.usuario.update({ where: { id: usuarioObjetivoId }, data: { twoFactorSecret: null } });
  await registrarAuditoria({
    usuarioId: actorId,
    accion: '2FA_REINICIADO',
    entidad: 'Usuario',
    entidadId: usuarioObjetivoId,
  });
}
