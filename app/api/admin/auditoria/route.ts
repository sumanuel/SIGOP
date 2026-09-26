import { NextResponse, type NextRequest } from 'next/server';
import { listarAuditoria, listarValoresDistintosAuditoria } from '@/lib/server/services/auditoria.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

// GET /api/admin/auditoria — visor de la bitácora (PLAN_PROYECTO.md sección
// 3.2, módulo 9: "quién cambió qué, cuándo y desde dónde"). Se escribe desde
// cada servicio de negocio, pero hasta ahora nadie la podía leer desde el
// panel — este endpoint es el primer camino de lectura.
//
// Reservado a roles de supervisión (no EDITOR_OBRA: ese rol genera entradas
// de auditoría, no las revisa).
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR', 'CONSULTA']);

    const params = request.nextUrl.searchParams;
    const desde = params.get('desde');
    const hasta = params.get('hasta');

    const [resultado, valores] = await Promise.all([
      listarAuditoria({
        entidad: params.get('entidad') ?? undefined,
        accion: params.get('accion') ?? undefined,
        entidadId: params.get('entidadId') ?? undefined,
        desde: desde ? new Date(desde) : undefined,
        // Fin del día seleccionado, no medianoche, para que "hasta hoy" incluya hoy.
        hasta: hasta ? new Date(`${hasta}T23:59:59.999`) : undefined,
        pagina: Number(params.get('pagina')) || 1,
      }),
      listarValoresDistintosAuditoria(),
    ]);

    return NextResponse.json({ ...resultado, valoresDisponibles: valores });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando la bitácora de auditoría:', error);
    return NextResponse.json({ error: 'No se pudo obtener la bitácora' }, { status: 500 });
  }
}
