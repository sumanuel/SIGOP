import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { actualizarContratoSchema } from '@/lib/server/validators/contrato.schema';
import { ROLES_CONTRATOS, ContratoError, actualizarContrato } from '@/lib/server/services/contratos.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/contratos/[id] — corrige número, modalidad o documento. El
// monto y el plazo no se editan: cambian solo con adendas.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_CONTRATOS);
    const { id } = await params;
    const datos = actualizarContratoSchema.parse(await request.json());
    const contrato = await actualizarContrato(id, datos, usuario.sub);
    return NextResponse.json({ contrato });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ContratoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    console.error('Error actualizando el contrato:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el contrato' }, { status: 500 });
  }
}
