import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { RecuperacionError, restablecerPassword } from '@/lib/server/services/recuperacion.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

const schema = z.object({
  token: z.string().min(10).max(2000),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(200),
});

// POST /api/auth/restablecer — { token, password }. El enlace vale una vez y 30 minutos.
export async function POST(request: NextRequest) {
  try {
    if (estaLimitado(`restablecer:${obtenerIpCliente(request)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    await restablecerPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RecuperacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error restableciendo la contraseña');
    return NextResponse.json({ error: 'No se pudo restablecer la contraseña' }, { status: 500 });
  }
}
