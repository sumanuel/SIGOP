import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
  UsuarioError,
} from '@/lib/server/services/usuarios.service';
import { actualizarUsuarioSchema } from '@/lib/server/validators/usuario.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN']);
    const { id } = await params;

    const usuario = await obtenerUsuario(id);
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ usuario });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo usuario:', error);
    return NextResponse.json({ error: 'No se pudo obtener el usuario' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = requireAuth(request, ['SUPER_ADMIN']);
    const { id } = await params;

    const body = await request.json();
    const datos = actualizarUsuarioSchema.parse(body);

    const usuario = await actualizarUsuario(id, datos, actor.sub);
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ usuario });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    if (error instanceof UsuarioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error actualizando usuario:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el usuario' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = requireAuth(request, ['SUPER_ADMIN']);
    const { id } = await params;

    const usuario = await eliminarUsuario(id, actor.sub);
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof UsuarioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error eliminando usuario:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el usuario' }, { status: 500 });
  }
}
