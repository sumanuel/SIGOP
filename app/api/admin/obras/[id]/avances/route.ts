import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { listarAvancesDeObra, crearAvance } from '@/lib/server/services/avances.service';
import { crearAvanceSchema } from '@/lib/server/validators/avance.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/obras/[id]/avances — historial completo (panel admin).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;

    const avances = await listarAvancesDeObra(id);
    return NextResponse.json({ avances });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando avances:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los avances' }, { status: 500 });
  }
}

// POST /api/admin/obras/[id]/avances — registra un nuevo avance (nunca
// sobrescribe el historial) y actualiza el % "actual" de la obra.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const body = await request.json();
    const datos = crearAvanceSchema.parse(body);

    const avance = await crearAvance(id, datos, { usuarioId: usuario.sub, email: usuario.email });
    if (!avance) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });

    return NextResponse.json({ avance }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error creando avance:', error);
    return NextResponse.json({ error: 'No se pudo registrar el avance' }, { status: 500 });
  }
}
