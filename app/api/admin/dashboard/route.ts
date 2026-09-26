import { NextResponse, type NextRequest } from 'next/server';
import { obtenerDashboardInterno } from '@/lib/server/services/dashboard.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET /api/admin/dashboard — métricas del dashboard interno del panel admin
// (PLAN_PROYECTO.md sección 3.2, módulo 1). Mismos roles que el listado
// general de obras (GET /api/admin/obras): es una vista de solo lectura,
// útil para cualquiera con acceso al panel.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const dashboard = await obtenerDashboardInterno();
    return NextResponse.json(dashboard);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo el dashboard interno:', error);
    return NextResponse.json({ error: 'No se pudo obtener el dashboard' }, { status: 500 });
  }
}
