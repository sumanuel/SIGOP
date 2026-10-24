import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { actualizarHitoSchema } from '@/lib/server/validators/hito.schema';
import { ROLES_HITOS, HitoError, actualizarHito, eliminarHito } from '@/lib/server/services/hitos.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function responderError(error: unknown, mensaje: string) {
  if (error instanceof AuthError || error instanceof HitoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ error: mensaje }, { status: 500 });
}

// PUT /api/admin/hitos/[id] — edita el nombre, las fechas o si está completado.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_HITOS);
    const { id } = await params;
    const datos = actualizarHitoSchema.parse(await request.json());
    const hito = await actualizarHito(id, datos, usuario.sub, usuario.rol);
    if (!hito) return NextResponse.json({ error: 'Hito no encontrado' }, { status: 404 });
    return NextResponse.json({ hito });
  } catch (error) {
    return responderError(error, 'No se pudo actualizar el hito');
  }
}

// DELETE /api/admin/hitos/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_HITOS);
    const { id } = await params;
    const hito = await eliminarHito(id, usuario.sub, usuario.rol);
    if (!hito) return NextResponse.json({ error: 'Hito no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error, 'No se pudo eliminar el hito');
  }
}
