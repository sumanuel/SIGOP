import { NextResponse, type NextRequest } from 'next/server';
import { obtenerProyectoOc4ids } from '@/lib/server/services/oc4ids.service';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

// GET /api/datos-abiertos/oc4ids/OBR-2026-00001 — un proyecto en formato OC4IDS.
export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  try {
    const proyecto = await obtenerProyectoOc4ids(codigo, request.nextUrl.origin);
    if (!proyecto) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    return NextResponse.json(proyecto, { headers: { 'Cache-Control': CACHE } });
  } catch (error) {
    console.error('Error generando el proyecto OC4IDS:', error);
    return NextResponse.json({ error: 'No se pudieron generar los datos' }, { status: 500 });
  }
}
