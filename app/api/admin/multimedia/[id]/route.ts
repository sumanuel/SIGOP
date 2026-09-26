import { NextResponse, type NextRequest } from 'next/server';
import { eliminarFoto, marcarComoPortada } from '@/lib/server/services/multimedia.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/multimedia/[id] — de momento solo soporta marcar como portada.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const body = await request.json();
    if (body.esPortada !== true) {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    const multimedia = await marcarComoPortada(id, usuario.sub);
    if (!multimedia) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });

    return NextResponse.json({ multimedia });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error actualizando la foto:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la foto' }, { status: 500 });
  }
}

// DELETE /api/admin/multimedia/[id] — elimina la foto (registro + archivos en disco).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const multimedia = await eliminarFoto(id, usuario.sub);
    if (!multimedia) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error eliminando la foto:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la foto' }, { status: 500 });
  }
}
