import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { crearContratoSchema } from '@/lib/server/validators/contrato.schema';
import { ROLES_CONTRATOS, ContratoError, crearContrato, obtenerContratoDeObra } from '@/lib/server/services/contratos.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/obras/[id]/contrato — contrato y adendas de la obra (null si no tiene).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;
    return NextResponse.json({ contrato: await obtenerContratoDeObra(id) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo el contrato:', error);
    return NextResponse.json({ error: 'No se pudo obtener el contrato' }, { status: 500 });
  }
}

// POST /api/admin/obras/[id]/contrato — registra el contrato principal de la obra.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_CONTRATOS);
    const { id } = await params;
    const datos = crearContratoSchema.parse(await request.json());
    const contrato = await crearContrato(id, datos, usuario.sub);
    return NextResponse.json({ contrato }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ContratoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    console.error('Error creando el contrato:', error);
    return NextResponse.json({ error: 'No se pudo registrar el contrato' }, { status: 500 });
  }
}
