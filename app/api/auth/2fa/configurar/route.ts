import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { iniciarConfiguracion, DosFactoresError } from '@/lib/server/services/dos-factores.service';

// POST /api/auth/2fa/configurar — genera el secreto y el QR (aún sin activar).
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    return NextResponse.json(await iniciarConfiguracion(usuario.sub, usuario.email));
  } catch (error) {
    if (error instanceof AuthError || error instanceof DosFactoresError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error iniciando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo iniciar la configuración' }, { status: 500 });
  }
}
