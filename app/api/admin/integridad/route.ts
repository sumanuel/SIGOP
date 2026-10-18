import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { sellarAvancesExistentes, verificarCadena } from '@/lib/server/services/integridad.service';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';

// GET /api/admin/integridad — estado de la cadena completa.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    return NextResponse.json({ cadena: await verificarCadena() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error verificando la cadena:', error);
    return NextResponse.json({ error: 'No se pudo verificar la cadena' }, { status: 500 });
  }
}

// POST /api/admin/integridad — sella los avances anteriores a la activación del módulo.
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const resultado = await sellarAvancesExistentes();
    await registrarAuditoria({
      usuarioId: usuario.sub,
      accion: 'SELLAR_EXISTENTES',
      entidad: 'RegistroIntegridad',
      entidadId: 'cadena',
      datosDespues: resultado,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error sellando avances existentes:', error);
    return NextResponse.json({ error: 'No se pudieron sellar los avances' }, { status: 500 });
  }
}
