import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { moverHitoSchema } from '@/lib/server/validators/hito.schema';
import { ROLES_HITOS, HitoError, moverHito } from '@/lib/server/services/hitos.service';

// POST /api/admin/hitos/[id]/mover — { direccion: "arriba" | "abajo" }.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = requireAuth(request, ROLES_HITOS);
    const { id } = await params;
    const { direccion } = moverHitoSchema.parse(await request.json());
    const hitos = await moverHito(id, direccion, usuario.sub, usuario.rol);
    if (!hitos) return NextResponse.json({ error: 'Hito no encontrado' }, { status: 404 });
    return NextResponse.json({ hitos });
  } catch (error) {
    if (error instanceof AuthError || error instanceof HitoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 });
    console.error('Error moviendo el hito:', error);
    return NextResponse.json({ error: 'No se pudo mover el hito' }, { status: 500 });
  }
}
