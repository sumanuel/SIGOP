import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  listarAsignacionesDeObra,
  crearAsignacion,
  AsignacionError,
} from '@/lib/server/services/asignaciones.service';
import { crearAsignacionSchema } from '@/lib/server/validators/asignacion.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/obras/[id]/personal — equipo asignado a la obra (para el
// organigrama del panel admin, sin filtrar por consentimiento).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;

    const asignaciones = await listarAsignacionesDeObra(id);
    return NextResponse.json({ asignaciones });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando el equipo de la obra:', error);
    return NextResponse.json({ error: 'No se pudo obtener el equipo de la obra' }, { status: 500 });
  }
}

// POST /api/admin/obras/[id]/personal — asigna una persona ya existente en
// el directorio a esta obra, con su cargo, área y (opcional) supervisor.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const body = await request.json();
    const datos = crearAsignacionSchema.parse(body);

    const asignacion = await crearAsignacion(id, datos, usuario.sub);
    return NextResponse.json({ asignacion }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof AsignacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error asignando persona a la obra:', error);
    return NextResponse.json({ error: 'No se pudo asignar la persona' }, { status: 500 });
  }
}
