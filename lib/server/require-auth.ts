import type { NextRequest } from 'next/server';
import { verifyAccessToken, type JwtPayload } from '@/lib/server/auth';

/** Error tipado para que los Route Handlers respondan con el status correcto. */
export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Lee y valida el JWT de la cookie `accessToken`. Lanza `AuthError` (401/403)
 * si falta, es inválido, expiró, o el rol no está en `rolesPermitidos`.
 *
 * Uso en un Route Handler:
 *   const usuario = requireAuth(request, ['SUPER_ADMIN', 'EDITOR_OBRA']);
 */
export function requireAuth(request: NextRequest, rolesPermitidos?: string[]): JwtPayload {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) {
    throw new AuthError(401, 'No autenticado');
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthError(401, 'Sesión inválida o expirada');
  }

  // Rol que exige 2FA sin tenerla: solo puede usar /api/auth/* (configurarla, salir).
  if (payload.sin2fa && !request.nextUrl.pathname.startsWith('/api/auth/')) {
    throw new AuthError(403, 'Debes activar la verificación en dos pasos para continuar (Seguridad de la cuenta).');
  }

  if (rolesPermitidos && !rolesPermitidos.includes(payload.rol)) {
    throw new AuthError(403, 'No tienes permisos para realizar esta acción');
  }

  return payload;
}
