import { NextResponse } from 'next/server';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';

// GET /api/catalogos — catálogos de referencia (tipos de obra, estatus,
// entes, contratistas, fuentes de financiamiento, territorio). Sin datos
// sensibles, público: lo usa tanto el formulario admin como, a futuro, los
// filtros del portal público.
export async function GET() {
  try {
    const catalogos = await obtenerCatalogos();
    return NextResponse.json(catalogos);
  } catch (error) {
    console.error('Error obteniendo catálogos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los catálogos' }, { status: 500 });
  }
}
