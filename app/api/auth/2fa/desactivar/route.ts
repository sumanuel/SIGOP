import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { desactivar2faSchema } from '@/lib/server/validators/dos-factores.schema';
import { desactivarPropio, DosFactoresError } from '@/lib/server/services/dos-factores.service';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/auth/2fa/desactivar — exige contraseña y código vigentes.
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    const { password, codigo } = desactivar2faSchema.parse(await request.json());

    if (estaLimitado(`2fa-desactivar:${usuario.sub}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    await desactivarPropio(usuario.sub, password, codigo);
    return NextResponse.json({ activo: false });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DosFactoresError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Completa la contraseña y el código de 6 dígitos.' }, { status: 400 });
    }
    console.error('Error desactivando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo desactivar la verificación' }, { status: 500 });
  }
}
