import { NextResponse } from 'next/server';

function codigoPrisma(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return null;
}

/**
 * Traduce los códigos de error de Prisma más comunes en un CRUD a una
 * respuesta HTTP legible, para no repetir el mismo `if` en cada Route
 * Handler. Devuelve `null` si el error no es uno de estos casos conocidos,
 * para que el caller siga con su manejo genérico (log + 500).
 */
export function respuestaErrorPrisma(error: unknown, etiqueta: string): NextResponse | null {
  const codigo = codigoPrisma(error);

  if (codigo === 'P2002') {
    return NextResponse.json({ error: `Ya existe ${etiqueta} con ese nombre.` }, { status: 409 });
  }
  if (codigo === 'P2003' || codigo === 'P2014') {
    return NextResponse.json(
      { error: `No se puede eliminar: ${etiqueta} está en uso por una o más obras.` },
      { status: 409 }
    );
  }
  if (codigo === 'P2025') {
    return NextResponse.json({ error: `No se encontró ${etiqueta}.` }, { status: 404 });
  }
  return null;
}
