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
export type PropositoTokenTemporal = 'login-2fa' | 'configurar-2fa';

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
