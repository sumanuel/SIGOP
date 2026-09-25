import { NextResponse, type NextRequest } from 'next/server';
import { renovarSesion } from '@/lib/server/services/auth.service';
import { setAuthCookies, clearAuthCookies } from '@/lib/server/auth-cookies';

// POST /api/auth/refresh — cambia un refresh token válido por un par nuevo
// (rotación), sin pedir contraseña de nuevo. El cliente admin lo llama
// cuando una petición responde 401 por access token vencido.
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No hay sesión que renovar' }, { status: 401 });
  }

  try {
    const tokens = renovarSesion(refreshToken);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch {
    const response = NextResponse.json(
      { error: 'La sesión expiró, inicia sesión de nuevo' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }
}
