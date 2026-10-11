import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { dosFactoresActivo } from '@/lib/server/services/dos-factores.service';

// GET /api/auth/2fa/estado — ¿tiene la sesión actual el 2FA activado?
export async function GET(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    return NextResponse.json({ activo: await dosFactoresActivo(usuario.sub) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error consultando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo consultar el estado' }, { status: 500 });
  }
}
