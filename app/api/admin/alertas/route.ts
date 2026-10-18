import { NextResponse, type NextRequest } from 'next/server';
import type { TipoAlerta } from '@prisma/client';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { contarAlertasActivas, listarAlertas, obtenerUltimaEvaluacion } from '@/lib/server/services/alertas.service';
import { TIPO_ALERTA_LEGIBLE } from '@/lib/server/alertas/reglas';

// GET /api/admin/alertas?estado=activas|resueltas&tipo=...&obraId=... — bandeja de alertas.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);

    const params = request.nextUrl.searchParams;
    const estado = params.get('estado') === 'resueltas' ? 'resueltas' : 'activas';
    const tipoParam = params.get('tipo');
    const tipo = tipoParam && tipoParam in TIPO_ALERTA_LEGIBLE ? (tipoParam as TipoAlerta) : undefined;
    const obraId = params.get('obraId') ?? undefined;

    const [alertas, resumen] = await Promise.all([listarAlertas({ estado, tipo, obraId }), contarAlertasActivas()]);
    return NextResponse.json({ alertas, resumen, ultimaEvaluacion: obtenerUltimaEvaluacion() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando alertas:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las alertas' }, { status: 500 });
  }
}
