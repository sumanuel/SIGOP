import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { cambiarEstadoDenunciaSchema } from '@/lib/server/validators/denuncia.schema';
import {
  ROLES_DENUNCIAS,
  cambiarEstadoDenuncia,
  DenunciaError,
  obtenerDenuncia,
} from '@/lib/server/services/denuncias.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/denuncias/[id] — detalle (sin el contacto, que se pide aparte).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ROLES_DENUNCIAS);
    const { id } = await params;
    const denuncia = await obtenerDenuncia(id);
    if (!denuncia) return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 });
    return NextResponse.json({ denuncia });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error obteniendo la denuncia:', error);
    return NextResponse.json({ error: 'No se pudo obtener la denuncia' }, { status: 500 });
  }
}

// PATCH /api/admin/denuncias/[id] — cambia el estado, el organismo al que se derivó y la nota al denunciante.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_DENUNCIAS);
    const { id } = await params;
    const datos = cambiarEstadoDenunciaSchema.parse(await request.json());
    const denuncia = await cambiarEstadoDenuncia(id, datos, usuario.sub);
    return NextResponse.json({ estado: denuncia.estado });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DenunciaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    console.error('Error actualizando la denuncia:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la denuncia' }, { status: 500 });
  }
}
