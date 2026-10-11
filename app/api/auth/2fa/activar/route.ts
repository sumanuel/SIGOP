import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { activar2faSchema } from '@/lib/server/validators/dos-factores.schema';
import { confirmarConfiguracion, DosFactoresError } from '@/lib/server/services/dos-factores.service';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/auth/2fa/activar — confirma con un código y guarda el secreto.
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    const { tokenConfiguracion, codigo } = activar2faSchema.parse(await request.json());

    if (estaLimitado(`2fa-activar:${usuario.sub}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    await confirmarConfiguracion(usuario.sub, tokenConfiguracion, codigo);
    return NextResponse.json({ activo: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DosFactoresError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'El código tiene 6 dígitos.' }, { status: 400 });
    }
    console.error('Error activando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo activar la verificación' }, { status: 500 });
  }
}
