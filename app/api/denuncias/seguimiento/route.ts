import { NextResponse, type NextRequest } from 'next/server';
import { seguimientoSchema } from '@/lib/server/validators/denuncia.schema';
import { consultarSeguimiento } from '@/lib/server/services/denuncias.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/denuncias/seguimiento — { codigo }. Es POST y no GET para que el
// código no quede en la URL (historial del navegador, registros de acceso).
export async function POST(request: NextRequest) {
  try {
    // Frena el intento de adivinar códigos (el espacio es de 60 bits, pero igual se limita).
    if (estaLimitado(`seguimiento:${obtenerIpCliente(request)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas consultas. Espera unos minutos.' }, { status: 429 });
    }

    const parsed = seguimientoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe tu código de seguimiento.' }, { status: 400 });

    const seguimiento = await consultarSeguimiento(parsed.data.codigo);
    // Mismo mensaje para "formato inválido" y "no existe": no revela nada de más.
    if (!seguimiento) {
      return NextResponse.json({ error: 'No encontramos una denuncia con ese código. Revisa que esté completo.' }, { status: 404 });
    }
    return NextResponse.json({ seguimiento }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Error consultando el seguimiento de una denuncia');
    return NextResponse.json({ error: 'No se pudo consultar' }, { status: 500 });
  }
}
