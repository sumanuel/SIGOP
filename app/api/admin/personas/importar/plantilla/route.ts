import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { generarPlantilla } from '@/lib/server/services/importacion-personas.service';

// GET /api/admin/personas/importar/plantilla — Excel de ejemplo para la carga masiva.
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA']);

    const archivo = await generarPlantilla();
    return new NextResponse(new Uint8Array(archivo), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla-personas-sigop.xlsx"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generando la plantilla de personas:', error);
    return NextResponse.json({ error: 'No se pudo generar la plantilla' }, { status: 500 });
  }
}
