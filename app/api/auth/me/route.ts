import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET /api/auth/me — quién es el usuario de la sesión actual (usado por el
// panel admin para mostrar el nombre y decidir si redirigir a /admin/login).
export async function GET(request: NextRequest) {
  try {
    const payload = requireAuth(request);

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nombre: true, email: true, rol: true, enteId: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ usuario });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo la sesión:', error);
    return NextResponse.json({ error: 'No se pudo obtener la sesión' }, { status: 500 });
  }
}
