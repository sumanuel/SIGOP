import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { loginSchema } from '@/lib/server/validators/auth.schema';
import { autenticarUsuario } from '@/lib/server/services/auth.service';
import { setAuthCookies } from '@/lib/server/auth-cookies';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Bloqueo tras intentos fallidos (PLAN_PROYECTO.md sección 3.2): 8
    // intentos cada 15 min por IP+correo, para frenar fuerza bruta sin
    // afectar a alguien que solo se equivocó una vez de contraseña.
    const ip = obtenerIpCliente(request);
    if (estaLimitado(`login:${ip}:${email}`, 8, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
        { status: 429 }
      );
    }

    const resultado = await autenticarUsuario(email, password);
    if (!resultado) {
      // Mensaje genérico a propósito: no revela si el correo existe o no.
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }

    const { usuario, accessToken, refreshToken } = resultado;

    const response = NextResponse.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
    setAuthCookies(response, { accessToken, refreshToken });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500 });
  }
}
