import { NextResponse, type NextRequest } from 'next/server';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { requireAuth } from '@/lib/server/require-auth';

// GET /api/catalogos — catálogos de referencia (tipos de obra, estatus,
// entes, contratistas, fuentes de financiamiento, territorio). Público, pero
// el contacto de los contratistas (teléfono, correo) solo sale con sesión.
export async function GET(request: NextRequest) {
  let conContacto = false;
  try {
    requireAuth(request);
    conContacto = true;
  } catch {
    conContacto = false;
  }

  try {
    const catalogos = await obtenerCatalogos({ conContacto });
    return NextResponse.json(catalogos);
  } catch (error) {
    console.error('Error obteniendo catálogos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los catálogos' }, { status: 500 });
  }
}
