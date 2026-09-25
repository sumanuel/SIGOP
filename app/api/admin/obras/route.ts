import { NextResponse, type NextRequest } from 'next/server';
import { listarObrasAdmin } from '@/lib/server/services/obras.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET /api/admin/obras — listado para la tabla del panel admin: todas las
// obras sin importar su estado de publicación (a diferencia de GET
// /api/obras, que es público y solo devuelve las ya PUBLICADO).
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);

    const obras = await listarObrasAdmin();
    return NextResponse.json({ obras });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando obras (admin):', error);
    return NextResponse.json({ error: 'No se pudieron obtener las obras' }, { status: 500 });
  }
}
