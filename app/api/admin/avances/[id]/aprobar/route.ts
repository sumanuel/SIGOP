import { NextResponse, type NextRequest } from 'next/server';
import { aprobarAvance, AvanceError, ROLES_APROBADORES } from '@/lib/server/services/avances.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/avances/[id]/aprobar — un aprobador publica un avance pendiente.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_APROBADORES);
    const { id } = await params;
    const avance = await aprobarAvance(id, { usuarioId: usuario.sub, rol: usuario.rol });
    if (!avance) return NextResponse.json({ error: 'Avance no encontrado' }, { status: 404 });
    return NextResponse.json({ avance });
  } catch (error) {
    if (error instanceof AuthError || error instanceof AvanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error aprobando avance:', error);
    return NextResponse.json({ error: 'No se pudo aprobar el avance' }, { status: 500 });
  }
}
