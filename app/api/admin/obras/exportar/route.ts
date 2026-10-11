import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { generarExcelObras } from '@/lib/server/services/exportaciones.service';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';

const PUBLICACIONES = ['BORRADOR', 'EN_REVISION', 'PUBLICADO'] as const;

// GET /api/admin/obras/exportar?publicacion=BORRADOR|EN_REVISION|PUBLICADO —
// Excel con todas las obras (cualquier estado) para quien administra el panel.
export async function GET(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);

    const valor = request.nextUrl.searchParams.get('publicacion');
    const filtro = PUBLICACIONES.find((p) => p === valor);
    if (valor && !filtro) {
      return NextResponse.json({ error: 'Filtro de publicación inválido' }, { status: 400 });
    }

    const archivo = await generarExcelObras(filtro);

    // Una descarga masiva de datos internos queda registrada: quién y cuándo.
    await registrarAuditoria({
      usuarioId: usuario.sub,
      accion: 'EXPORT',
      entidad: 'Obra',
      entidadId: 'listado',
      datosDespues: { formato: 'xlsx', filtroPublicacion: filtro ?? null },
      ip: obtenerIpCliente(request),
    });

    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(archivo), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sigop-obras-${fecha}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error exportando obras a Excel:', error);
    return NextResponse.json({ error: 'No se pudo generar el Excel' }, { status: 500 });
  }
}
