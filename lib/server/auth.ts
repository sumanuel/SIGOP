import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mismo patrón que tienda-web/backend/src/utils/bcrypt.ts y jwt.ts,
// adaptado a Route Handlers de Next.js (sin Express de por medio).

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  sub: string; // usuario.id
  email: string;
  rol: string;
  enteId: string | null;
  /** Rol que exige 2FA y todavía no la tiene: la sesión solo sirve para configurarla. */
  sin2fa?: boolean;
}

/** Roles con poder de publicar o administrar: la verificación en dos pasos es obligatoria. */
export const ROLES_CON_2FA_OBLIGATORIA = ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR'];

/**
 * TWO_FACTOR_REQUIRED=true|false lo fuerza; sin definir, se exige en producción
 * y no en desarrollo (para no estorbar las pruebas locales).
 */
export function dosFactoresObligatorio(): boolean {
  const valor = process.env.TWO_FACTOR_REQUIRED;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

/** Contenido del JWT de sesión para un usuario; marca `sin2fa` cuando corresponde. */
export function payloadDeSesion(u: {
  id: string;
  email: string;
  rol: string;
  enteId: string | null;
  twoFactorSecret: string | null;
}): JwtPayload {
  const payload: JwtPayload = { sub: u.id, email: u.email, rol: u.rol, enteId: u.enteId };
  if (dosFactoresObligatorio() && ROLES_CON_2FA_OBLIGATORIA.includes(u.rol) && !u.twoFactorSecret) {
    payload.sin2fa = true;
  }
  return payload;
}

function getSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (ver .env.example)`);
  }
  return value;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload;
}

// Tokens de un solo propósito y vida corta (paso intermedio del 2FA). Se firman
// con un secreto derivado distinto por propósito, para que NUNCA puedan
// aceptarse como access/refresh token aunque alguien los reenvíe en una cookie.
export type PropositoTokenTemporal = 'login-2fa' | 'configurar-2fa' | 'recuperar-password' | 'baja-suscripcion';

function secretoTemporal(proposito: PropositoTokenTemporal): string {
  return `${getSecret('JWT_REFRESH_SECRET')}:temporal:${proposito}`;
}

export function firmarTokenTemporal(
  proposito: PropositoTokenTemporal,
  claims: Record<string, string>,
  expiraEnSegundos: number
): string {
  return jwt.sign(claims, secretoTemporal(proposito), { expiresIn: expiraEnSegundos });
}

/** Devuelve los claims, o `null` si el token es inválido, expiró o es de otro propósito. */
export function verificarTokenTemporal(
  proposito: PropositoTokenTemporal,
  token: string
): Record<string, string> | null {
  try {
    return jwt.verify(token, secretoTemporal(proposito)) as Record<string, string>;
  } catch {
    return null;
  }
}
