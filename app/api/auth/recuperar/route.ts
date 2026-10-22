import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { solicitarRecuperacion } from '@/lib/server/services/recuperacion.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

const schema = z.object({ email: z.string().email('Correo inválido') });

// POST /api/auth/recuperar — { email }. Responde lo mismo exista o no la cuenta.
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 });
    const email = parsed.data.email.toLowerCase();

    // Evita usar el formulario para inundar de correos a alguien o al servidor de correo.
    if (estaLimitado(`recuperar:${obtenerIpCliente(request)}`, 5, 60 * 60 * 1000) || estaLimitado(`recuperar-correo:${email}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Inténtalo de nuevo en un rato.' }, { status: 429 });
    }

    // El enlace se arma con la URL configurada del sitio, NO con el encabezado Host
    // de la petición (que un atacante podría falsear para que el enlace apunte a otro sitio).
    const urlSitio = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const mensaje = await solicitarRecuperacion(email, urlSitio);
    return NextResponse.json({ mensaje });
  } catch {
    console.error('Error solicitando la recuperación de contraseña');
    return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 });
  }
}
