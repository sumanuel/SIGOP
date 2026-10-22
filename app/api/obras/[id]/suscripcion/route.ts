import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { SuscripcionError, solicitarSuscripcion } from '@/lib/server/services/suscripciones.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

const schema = z.object({
  correo: z.string().trim().email('Escribe un correo válido.').max(200),
  // Honeypot: un humano no lo ve; si viene lleno se responde "bien" sin hacer nada.
  sitioWeb: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/obras/[slug]/suscripcion — { correo }. El parámetro es el slug de la obra.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    const correo = parsed.data.correo.toLowerCase();

    // Cada solicitud manda un correo a un tercero: se limita por IP y por destinatario.
    if (estaLimitado(`suscribir:${obtenerIpCliente(request)}`, 8, 60 * 60 * 1000) || estaLimitado(`suscribir-correo:${correo}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Inténtalo de nuevo en un rato.' }, { status: 429 });
    }

    if (parsed.data.sitioWeb) {
      return NextResponse.json({ mensaje: 'Te enviamos un correo para confirmar tu suscripción. Si no llega, revisa la carpeta de spam.' });
    }

    const { id } = await params;
    const mensaje = await solicitarSuscripcion(id, correo);
    return NextResponse.json({ mensaje });
  } catch (error) {
    if (error instanceof SuscripcionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error solicitando la suscripción');
    return NextResponse.json({ error: 'No se pudo procesar la suscripción' }, { status: 500 });
  }
}
