import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { evaluarAlertas } from '@/lib/server/services/alertas.service';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { estaLimitado } from '@/lib/server/rate-limit';

// POST /api/admin/alertas/evaluar — "Evaluar ahora": corre el motor de reglas
// fuera del horario diario (por ejemplo tras cargar muchos avances).
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE']);

    // Recorre todas las obras: se limita para que nadie lo dispare en bucle.
    if (estaLimitado(`alertas-evaluar:${usuario.sub}`, 6, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas evaluaciones seguidas. Espera unos minutos.' }, { status: 429 });
    }

    const resultado = await evaluarAlertas();
    await registrarAuditoria({
      usuarioId: usuario.sub,
      accion: 'EVALUAR_ALERTAS',
      entidad: 'Alerta',
      entidadId: 'evaluacion',
      datosDespues: resultado,
    });
    return NextResponse.json({ resultado });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error evaluando alertas:', error);
    return NextResponse.json({ error: 'No se pudo evaluar las alertas' }, { status: 500 });
  }
}
