import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/server/auth-cookies';

// POST /api/auth/logout — se permite siempre, incluso con un token ya
// vencido: el objetivo es limpiar las cookies del navegador, no validar sesión.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
