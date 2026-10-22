import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { SuscripcionError, confirmarSuscripcion, darDeBaja } from '@/lib/server/services/suscripciones.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

const schema = z.object({ token: z.string().min(10).max(2000) });

interface RouteParams {
  params: Promise<{ accion: string }>;
}

// POST /api/suscripciones/confirmar | /api/suscripciones/baja — { token }.
// Son POST (y la página pide un clic) para que los programas que "visitan" los
// enlaces de los correos (antivirus, vistas previas) no confirmen ni den de baja solos.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accion } = await params;
    if (accion !== 'confirmar' && accion !== 'baja') return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (estaLimitado(`suscripcion-${accion}:${obtenerIpCliente(request)}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'El enlace está incompleto.' }, { status: 400 });

    const resultado = accion === 'confirmar' ? await confirmarSuscripcion(parsed.data.token) : await darDeBaja(parsed.data.token);
    return NextResponse.json({ ok: true, obra: resultado.obra });
  } catch (error) {
    if (error instanceof SuscripcionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error en la suscripción');
    return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 500 });
  }
}
