import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  esRecursoCatalogo,
  actualizarRegistroCatalogo,
  eliminarRegistroCatalogo,
  obtenerSchemaCatalogo,
  etiquetaCatalogo,
} from '@/lib/server/services/catalogos.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { respuestaErrorPrisma } from '@/lib/server/prisma-error';

interface RouteParams {
  params: Promise<{ recurso: string; id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { recurso, id } = await params;
  if (!esRecursoCatalogo(recurso)) {
    return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
  }

  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const body = await request.json();
    const datos = obtenerSchemaCatalogo(recurso).parse(body);
    const registro = await actualizarRegistroCatalogo(recurso, id, datos, usuario.sub);
    return NextResponse.json({ registro });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: error.flatten() }, { status: 400 });
    }
    const respuesta = respuestaErrorPrisma(error, etiquetaCatalogo(recurso));
    if (respuesta) return respuesta;
    console.error(`Error actualizando un registro de "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo actualizar el registro' }, { status: 500 });
  }
}

// Reservado a SUPER_ADMIN, y sin recurrir a un borrado en cascada: si el
// catálogo está en uso (ver onDelete: Restrict en prisma/schema.prisma),
// Postgres rechaza el DELETE y respuestaErrorPrisma lo traduce a un 409
// legible en vez de dejar caer obras huérfanas.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { recurso, id } = await params;
  if (!esRecursoCatalogo(recurso)) {
    return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
  }

  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    await eliminarRegistroCatalogo(recurso, id, usuario.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const respuesta = respuestaErrorPrisma(error, etiquetaCatalogo(recurso));
    if (respuesta) return respuesta;
    console.error(`Error eliminando un registro de "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo eliminar el registro' }, { status: 500 });
  }
}
