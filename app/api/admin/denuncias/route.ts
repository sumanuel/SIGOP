import { NextResponse, type NextRequest } from 'next/server';
import type { EstadoDenuncia } from '@prisma/client';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { ROLES_DENUNCIAS, contarDenunciasNuevas, listarDenuncias } from '@/lib/server/services/denuncias.service';
import { ESTADOS_DENUNCIA } from '@/lib/denuncia';

// GET /api/admin/denuncias?estado=RECIBIDA|... — bandeja de denuncias.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ROLES_DENUNCIAS);

    const estadoParam = request.nextUrl.searchParams.get('estado');
    const estado = ESTADOS_DENUNCIA.find((e) => e === estadoParam) as EstadoDenuncia | undefined;

    const [denuncias, nuevas] = await Promise.all([listarDenuncias(estado), contarDenunciasNuevas()]);
    return NextResponse.json({ denuncias, nuevas });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando denuncias:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las denuncias' }, { status: 500 });
  }
}
