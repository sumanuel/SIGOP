import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { listarUsuarios, crearUsuario, UsuarioError } from '@/lib/server/services/usuarios.service';
import { crearUsuarioSchema } from '@/lib/server/validators/usuario.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET/POST /api/admin/usuarios — gestión de usuarios y roles. Reservado a
// SUPER_ADMIN (PLAN_PROYECTO.md sección 3.2: "Super administrador: todo —
// usuarios, catálogos, configuración"), igual que /admin/catalogos.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN']);
    const usuarios = await listarUsuarios();
    return NextResponse.json({ usuarios });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando usuarios:', error);
    return NextResponse.json({ error: 'No se pudo obtener el listado de usuarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const body = await request.json();
    const datos = crearUsuarioSchema.parse(body);

    const creado = await crearUsuario(datos, usuario.sub);
    return NextResponse.json({ usuario: creado }, { status: 201 });
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
    console.error('Error creando usuario:', error);
    return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
  }
}
