import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { verificarLogin2faSchema } from '@/lib/server/validators/dos-factores.schema';
import { completarLoginConCodigo, DosFactoresError } from '@/lib/server/services/dos-factores.service';
import { setAuthCookies } from '@/lib/server/auth-cookies';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/auth/2fa/verificar — segundo paso del login con 2FA.
export async function POST(request: NextRequest) {
  try {
    const { token2fa, codigo } = verificarLogin2faSchema.parse(await request.json());

    // Un código de 6 dígitos se puede adivinar por fuerza bruta si no se
    // limita: 5 intentos cada 5 min por IP y 10 por token.
    const ip = obtenerIpCliente(request);
    if (estaLimitado(`2fa:ip:${ip}`, 5, 5 * 60 * 1000) || estaLimitado(`2fa:token:${token2fa}`, 10, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    const { usuario, accessToken, refreshToken } = await completarLoginConCodigo(token2fa, codigo);

    const response = NextResponse.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
    setAuthCookies(response, { accessToken, refreshToken });
    return response;
  } catch (error) {
    if (error instanceof DosFactoresError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'El código tiene 6 dígitos.' }, { status: 400 });
    }
    console.error('Error verificando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo verificar el código' }, { status: 500 });
  }
}
