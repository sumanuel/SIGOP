import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { listarObrasParaMapa, crearObra } from '@/lib/server/services/obras.service';
import { crearObraSchema } from '@/lib/server/validators/obra.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET /api/obras — lista pública de obras publicadas, para el mapa principal.
export async function GET() {
  try {
    const obras = await listarObrasParaMapa();
    return NextResponse.json({ obras });
  } catch (error) {
    console.error('Error listando obras para el mapa:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de obras' }, { status: 500 });
  }
}

// POST /api/obras — crea una obra (panel admin). Queda en estado BORRADOR;
// el flujo de aprobación (sección 3.2 del plan) la publica más adelante.
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA']);

    const body = await request.json();
    const datos = crearObraSchema.parse(body);

    const obra = await crearObra(datos, { usuarioId: usuario.sub });
    return NextResponse.json({ obra }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error creando obra:', error);
    return NextResponse.json({ error: 'No se pudo crear la obra' }, { status: 500 });
  }
}
