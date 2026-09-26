import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  esRecursoCatalogo,
  listarRegistrosCatalogo,
  crearRegistroCatalogo,
  obtenerSchemaCatalogo,
  etiquetaCatalogo,
} from '@/lib/server/services/catalogos.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { respuestaErrorPrisma } from '@/lib/server/prisma-error';

interface RouteParams {
  params: Promise<{ recurso: string }>;
}

// GET/POST /api/admin/catalogos/[recurso] — CRUD de catálogos (tipos de
// obra, estatus, entes, contratistas, fuentes de financiamiento, cargos).
// No confundir con el público GET /api/catalogos (solo lectura, sin
// autenticación, usado por los filtros del portal y el formulario de obra):
// este es el de gestión, reservado a SUPER_ADMIN — ver PLAN_PROYECTO.md
// sección 3.2, tabla de roles.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { recurso } = await params;
  if (!esRecursoCatalogo(recurso)) {
    return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
  }

  try {
    requireAuth(request, ['SUPER_ADMIN']);
    const registros = await listarRegistrosCatalogo(recurso);
    return NextResponse.json({ registros });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`Error listando el catálogo "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo obtener el catálogo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { recurso } = await params;
  if (!esRecursoCatalogo(recurso)) {
    return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
  }

  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const body = await request.json();
    const datos = obtenerSchemaCatalogo(recurso).parse(body);
    const registro = await crearRegistroCatalogo(recurso, datos, usuario.sub);
    return NextResponse.json({ registro }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    const respuesta = respuestaErrorPrisma(error, etiquetaCatalogo(recurso));
    if (respuesta) return respuesta;
    console.error(`Error creando un registro en "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo crear el registro' }, { status: 500 });
  }
}
