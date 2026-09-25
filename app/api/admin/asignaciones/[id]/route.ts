import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  actualizarAsignacion,
  eliminarAsignacion,
  AsignacionError,
} from '@/lib/server/services/asignaciones.service';
import { actualizarAsignacionSchema } from '@/lib/server/validators/asignacion.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/asignaciones/[id] — edita cargo/área/supervisor/fechas de
// una asignación (el registro ObraPersonal, no la persona en sí).
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const body = await request.json();
    const datos = actualizarAsignacionSchema.parse(body);

    const asignacion = await actualizarAsignacion(id, datos, usuario.sub);
    if (!asignacion) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    return NextResponse.json({ asignacion });
  } catch (error) {
    if (error instanceof AuthError || error instanceof AsignacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error actualizando la asignación:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la asignación' }, { status: 500 });
  }
}

// DELETE /api/admin/asignaciones/[id] — quita a la persona de la obra (no
// elimina a la persona del directorio, solo su vínculo con esta obra).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const asignacion = await eliminarAsignacion(id, usuario.sub);
    if (!asignacion) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error eliminando la asignación:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la asignación' }, { status: 500 });
  }
}
