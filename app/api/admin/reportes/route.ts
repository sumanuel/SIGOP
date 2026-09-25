import { NextResponse, type NextRequest } from 'next/server';
import { listarReportes } from '@/lib/server/services/reportes.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import type { EstadoModeracion } from '@prisma/client';

const ESTADOS_VALIDOS: EstadoModeracion[] = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

// GET /api/admin/reportes?estado=PENDIENTE — bandeja de moderación del panel
// admin. Sin `estado`, devuelve todos los reportes.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR']);

    const estadoParam = request.nextUrl.searchParams.get('estado');
    const estado = ESTADOS_VALIDOS.includes(estadoParam as EstadoModeracion)
      ? (estadoParam as EstadoModeracion)
      : undefined;

    const reportes = await listarReportes(estado);
    return NextResponse.json({ reportes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando reportes ciudadanos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los reportes' }, { status: 500 });
  }
}
