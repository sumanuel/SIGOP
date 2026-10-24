import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { crearHitoSchema } from '@/lib/server/validators/hito.schema';
import { ROLES_HITOS, HitoError, crearHito, listarHitos } from '@/lib/server/services/hitos.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function responderError(error: unknown, mensaje: string) {
  if (error instanceof AuthError || error instanceof HitoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  console.error(mensaje, error);
  return NextResponse.json({ error: mensaje }, { status: 500 });
}

// GET /api/admin/obras/[id]/hitos — hitos de la obra en orden.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, [...ROLES_HITOS, 'CONSULTA']);
    const { id } = await params;
    return NextResponse.json({ hitos: await listarHitos(id) });
  } catch (error) {
    return responderError(error, 'No se pudieron obtener los hitos');
  }
}

// POST /api/admin/obras/[id]/hitos — agrega un hito al final.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_HITOS);
    const { id } = await params;
    const datos = crearHitoSchema.parse(await request.json());
    return NextResponse.json({ hito: await crearHito(id, datos, usuario.sub, usuario.rol) }, { status: 201 });
  } catch (error) {
    return responderError(error, 'No se pudo crear el hito');
  }
}
