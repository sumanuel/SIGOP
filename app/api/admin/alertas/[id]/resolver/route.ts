import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { AlertaError, resolverAlerta } from '@/lib/server/services/alertas.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/alertas/[id]/resolver — marca la alerta como atendida.
// No vuelve a generarse durante unos días aunque la condición siga.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR']);
    const { id } = await params;

    const alerta = await resolverAlerta(id, usuario.sub);
    return NextResponse.json({ alerta });
  } catch (error) {
    if (error instanceof AuthError || error instanceof AlertaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error resolviendo la alerta:', error);
    return NextResponse.json({ error: 'No se pudo resolver la alerta' }, { status: 500 });
  }
}
