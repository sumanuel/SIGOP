import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { obtenerPersona, actualizarPersona, eliminarPersona } from '@/lib/server/services/personas.service';
import { actualizarPersonaSchema } from '@/lib/server/validators/persona.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;

    const persona = await obtenerPersona(id);
    if (!persona) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    return NextResponse.json({ persona });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo persona:', error);
    return NextResponse.json({ error: 'No se pudo obtener la persona' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const body = await request.json();
    const datos = actualizarPersonaSchema.parse(body);

    const persona = await actualizarPersona(id, datos, usuario.sub);
    if (!persona) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    return NextResponse.json({ persona });
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
    console.error('Error actualizando persona:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la persona' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE']);
    const { id } = await params;

    const persona = await eliminarPersona(id, usuario.sub);
    if (!persona) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error eliminando persona:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la persona' }, { status: 500 });
  }
}
