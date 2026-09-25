import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { listarPersonas, crearPersona } from '@/lib/server/services/personas.service';
import { crearPersonaSchema } from '@/lib/server/validators/persona.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

// GET /api/admin/personas — directorio único de personas.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const personas = await listarPersonas();
    return NextResponse.json({ personas });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando personas:', error);
    return NextResponse.json({ error: 'No se pudo obtener el directorio de personas' }, { status: 500 });
  }
}

// POST /api/admin/personas — crea una persona en el directorio (aún sin
// asignar a ninguna obra; eso se hace después en /api/admin/obras/[id]/personal).
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);

    const body = await request.json();
    const datos = crearPersonaSchema.parse(body);

    const persona = await crearPersona(datos, usuario.sub);
    return NextResponse.json({ persona }, { status: 201 });
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
    console.error('Error creando persona:', error);
    return NextResponse.json({ error: 'No se pudo crear la persona' }, { status: 500 });
  }
}
