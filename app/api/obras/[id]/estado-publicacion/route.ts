import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { cambiarEstadoPublicacion, TransicionInvalidaError } from '@/lib/server/services/obras.service';
import { cambiarEstadoPublicacionSchema } from '@/lib/server/validators/obra.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/obras/[id]/estado-publicacion — único camino para mover una obra
// por el flujo Borrador → En revisión → Publicado (ver
// PLAN_PROYECTO.md sección 3.2). No es un PUT genérico: cada `accion` es una
// transición validada en obras.service.ts contra el estado actual y el rol
// de quien la pide, así el campo `estadoPublicacion` nunca se escribe "a
// mano" desde el formulario general de la obra.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR']);
    const { id } = await params;

    const body = await request.json();
    const datos = cambiarEstadoPublicacionSchema.parse(body);

    const obra = await cambiarEstadoPublicacion(id, datos, { usuarioId: usuario.sub, rol: usuario.rol });
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ obra });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    if (error instanceof TransicionInvalidaError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error cambiando el estado de publicación de la obra:', error);
    return NextResponse.json({ error: 'No se pudo cambiar el estado de publicación' }, { status: 500 });
  }
}
