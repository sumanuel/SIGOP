import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import {
  analizarArchivoPersonas,
  importarPersonas,
  ImportacionError,
} from '@/lib/server/services/importacion-personas.service';
import { MAX_BYTES_IMPORTACION } from '@/lib/server/importacion-personas/columnas';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

// POST /api/admin/personas/importar?modo=revisar|importar — multipart con el
// campo `archivo` (.xlsx). `revisar` no guarda nada: solo devuelve el resumen
// por fila. `importar` vuelve a analizar el archivo y crea las filas válidas.
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);

    const modo = request.nextUrl.searchParams.get('modo');
    if (modo !== 'revisar' && modo !== 'importar') {
      return NextResponse.json({ error: 'Modo inválido. Usa revisar o importar.' }, { status: 400 });
    }

    const form = await request.formData();
    const archivo = form.get('archivo');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo Excel.' }, { status: 400 });
    }
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'El archivo debe ser un Excel .xlsx.' }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES_IMPORTACION) {
      return NextResponse.json({ error: 'El archivo supera los 2 MB.' }, { status: 413 });
    }

    const analisis = await analizarArchivoPersonas(Buffer.from(await archivo.arrayBuffer()));
    // `porCrear` (los datos completos, incluido el documento) nunca sale al navegador.
    const resumen = {
      total: analisis.total,
      validas: analisis.validas,
      duplicadas: analisis.duplicadas,
      conError: analisis.conError,
      filas: analisis.filas,
    };

    if (modo === 'revisar') {
      return NextResponse.json(resumen);
    }

    const resultado = await importarPersonas(analisis, usuario.sub, archivo.name);
    return NextResponse.json({ ...resumen, ...resultado }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ImportacionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error importando personas:', error);
    return NextResponse.json({ error: 'No se pudo procesar el archivo' }, { status: 500 });
  }
}
