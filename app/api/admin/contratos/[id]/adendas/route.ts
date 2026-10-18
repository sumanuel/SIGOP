import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { crearAdendaSchema } from '@/lib/server/validators/contrato.schema';
import { ROLES_CONTRATOS, ContratoError, agregarAdenda } from '@/lib/server/services/contratos.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/contratos/[id]/adendas — registra una modificación de monto y/o plazo.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_CONTRATOS);
    const { id } = await params;
    const datos = crearAdendaSchema.parse(await request.json());
    const adenda = await agregarAdenda(id, datos, usuario.sub);
    return NextResponse.json({ adenda }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ContratoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    console.error('Error registrando la adenda:', error);
    return NextResponse.json({ error: 'No se pudo registrar la adenda' }, { status: 500 });
  }
}
