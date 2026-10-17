import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { cambioParalizacionSchema } from '@/lib/server/validators/paralizacion.schema';
import {
  cambiarParalizacion,
  obtenerEstadoParalizacion,
  ParalizacionError,
} from '@/lib/server/services/paralizaciones.service';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/obras/[id]/paralizaciones — historial de periodos y si está paralizada ahora.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;

    const estado = await obtenerEstadoParalizacion(id);
    if (!estado) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    return NextResponse.json(estado);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo las paralizaciones:', error);
    return NextResponse.json({ error: 'No se pudo obtener el historial' }, { status: 500 });
  }
}

// POST /api/admin/obras/[id]/paralizaciones — { accion: "PARALIZAR", motivo, ... } o { accion: "REACTIVAR" }.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const datos = cambioParalizacionSchema.parse(await request.json());
    const periodo = await cambiarParalizacion(id, datos, usuario.sub);
    if (!periodo) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });

    return NextResponse.json({ periodo }, { status: datos.accion === 'PARALIZAR' ? 201 : 200 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ParalizacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    console.error('Error cambiando la paralización:', error);
    return NextResponse.json({ error: 'No se pudo registrar el cambio' }, { status: 500 });
  }
}
