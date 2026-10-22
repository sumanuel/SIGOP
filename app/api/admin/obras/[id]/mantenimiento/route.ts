import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { crearIntervencionSchema, garantiaSchema } from '@/lib/server/validators/mantenimiento.schema';
import {
  ROLES_MANTENIMIENTO,
  MantenimientoError,
  crearIntervencion,
  guardarGarantia,
  obtenerMantenimientoDeObra,
} from '@/lib/server/services/mantenimiento.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function responderError(error: unknown, mensaje: string) {
  if (error instanceof AuthError || error instanceof MantenimientoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ error: mensaje }, { status: 500 });
}

// GET /api/admin/obras/[id]/mantenimiento — garantía e intervenciones (null si no hay garantía).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;
    return NextResponse.json({ garantia: await obtenerMantenimientoDeObra(id) });
  } catch (error) {
    return responderError(error, 'No se pudo obtener el mantenimiento');
  }
}

// PUT /api/admin/obras/[id]/mantenimiento — crea o corrige la garantía.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_MANTENIMIENTO);
    const { id } = await params;
    const datos = garantiaSchema.parse(await request.json());
    return NextResponse.json({ garantia: await guardarGarantia(id, datos, usuario.sub) });
  } catch (error) {
    return responderError(error, 'No se pudo guardar la garantía');
  }
}

// POST /api/admin/obras/[id]/mantenimiento — registra una intervención de mantenimiento.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_MANTENIMIENTO);
    const { id } = await params;
    const datos = crearIntervencionSchema.parse(await request.json());
    return NextResponse.json({ intervencion: await crearIntervencion(id, datos, usuario.sub) }, { status: 201 });
  } catch (error) {
    return responderError(error, 'No se pudo registrar la intervención');
  }
}
