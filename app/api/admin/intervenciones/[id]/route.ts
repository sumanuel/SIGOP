import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { ROLES_MANTENIMIENTO, eliminarIntervencion } from '@/lib/server/services/mantenimiento.service';

// DELETE /api/admin/intervenciones/[id] — quita una intervención registrada por error (queda en la bitácora).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = requireAuth(request, ROLES_MANTENIMIENTO);
    const { id } = await params;
    const eliminada = await eliminarIntervencion(id, usuario.sub);
    if (!eliminada) return NextResponse.json({ error: 'Intervención no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error eliminando la intervención:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la intervención' }, { status: 500 });
  }
}
