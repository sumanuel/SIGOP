import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { obtenerObraDetalle, actualizarObra, eliminarObra } from '@/lib/server/services/obras.service';
import { actualizarObraSchema } from '@/lib/server/validators/obra.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/obras/[id] — admite id o slug (ver obtenerObraDetalle). Pública
// solo si la obra está PUBLICADO; con sesión admin válida se puede ver
// cualquier estado (para revisar antes de publicar).
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let esAdmin = false;
  try {
    requireAuth(request);
    esAdmin = true;
  } catch {
    esAdmin = false;
  }

  try {
    const obra = await obtenerObraDetalle(id, { soloPublicado: !esAdmin });
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ obra });
  } catch (error) {
    console.error('Error obteniendo el detalle de la obra:', error);
    return NextResponse.json({ error: 'No se pudo obtener la obra' }, { status: 500 });
  }
}

// PUT /api/obras/[id] — actualiza campos de la obra (panel admin).
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR']);
    const { id } = await params;

    const body = await request.json();
    const datos = actualizarObraSchema.parse(body);

    const obra = await actualizarObra(id, datos, { usuarioId: usuario.sub });
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ obra });
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
    console.error('Error actualizando la obra:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la obra' }, { status: 500 });
  }
}

// DELETE /api/obras/[id] — elimina la obra. Reservado a roles con más
// autoridad que un simple editor, dado que es una acción irreversible.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE']);
    const { id } = await params;

    const obra = await eliminarObra(id, usuario.sub);
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error eliminando la obra:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la obra' }, { status: 500 });
  }
}
