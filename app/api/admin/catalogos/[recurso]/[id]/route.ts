import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  esRecursoCatalogo,
  actualizarRegistroCatalogo,
  eliminarRegistroCatalogo,
  obtenerSchemaCatalogo,
  etiquetaCatalogo,
  RegistroEnUsoError,
} from '@/lib/server/services/catalogos.service';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { respuestaErrorPrisma } from '@/lib/server/prisma-error';

interface RouteParams {
  params: Promise<{ recurso: string; id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  let recurso: string | undefined;
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const { id, recurso: recursoParam } = await params;
    recurso = recursoParam;
    if (!esRecursoCatalogo(recurso)) {
      return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
    }
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
    if (recurso && esRecursoCatalogo(recurso)) {
      const respuesta = respuestaErrorPrisma(error, etiquetaCatalogo(recurso));
      if (respuesta) return respuesta;
    }
    console.error(`Error actualizando un registro de "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo actualizar el registro' }, { status: 500 });
  }
}

// Reservado a SUPER_ADMIN. La mayoría de los catálogos son onDelete:
// Restrict (Postgres rechaza el DELETE con P2003 si están en uso), pero
// contratistas/fuentes-financiamiento son onDelete: SetNull — para esos dos,
// eliminarRegistroCatalogo() chequea el uso explícitamente y lanza
// RegistroEnUsoError, para no desasignar en silencio una obra existente.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let recurso: string | undefined;
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN']);
    const { id, recurso: recursoParam } = await params;
    recurso = recursoParam;
    if (!esRecursoCatalogo(recurso)) {
      return NextResponse.json({ error: 'Catálogo no reconocido' }, { status: 404 });
    }
    await eliminarRegistroCatalogo(recurso, id, usuario.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof RegistroEnUsoError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (recurso && esRecursoCatalogo(recurso)) {
      const respuesta = respuestaErrorPrisma(error, etiquetaCatalogo(recurso));
      if (respuesta) return respuesta;
    }
    console.error(`Error eliminando un registro de "${recurso}":`, error);
    return NextResponse.json({ error: 'No se pudo eliminar el registro' }, { status: 500 });
  }
}
