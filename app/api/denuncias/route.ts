import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { crearDenunciaSchema } from '@/lib/server/validators/denuncia.schema';
import { crearDenuncia, DenunciaError } from '@/lib/server/services/denuncias.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/denuncias — recibe una denuncia ciudadana, anónima salvo que la persona deje contacto.
//
// Privacidad: la IP se usa SOLO para el límite de envíos, que vive en memoria
// del proceso; no se guarda en la base ni en la bitácora, y esta ruta no
// escribe en el log nada del origen de la petición.
export async function POST(request: NextRequest) {
  try {
    if (estaLimitado(`denuncia:${obtenerIpCliente(request)}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Has enviado varias denuncias seguidas. Espera un rato e inténtalo de nuevo.' }, { status: 429 });
    }

    const datos = crearDenunciaSchema.parse(await request.json());
    const resultado = await crearDenuncia(datos);

    return NextResponse.json({ codigo: resultado.codigo }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof DenunciaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      const primero = error.issues[0]?.message;
      return NextResponse.json({ error: primero ?? 'Datos inválidos' }, { status: 400 });
    }
    console.error('Error recibiendo una denuncia');
    return NextResponse.json({ error: 'No se pudo registrar la denuncia' }, { status: 500 });
  }
}
