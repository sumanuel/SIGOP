import { NextResponse, type NextRequest } from 'next/server';
import { obtenerPaqueteOc4ids } from '@/lib/server/services/oc4ids.service';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

// GET /api/datos-abiertos/oc4ids — paquete OC4IDS (estándar de datos de
// infraestructura) con todas las obras publicadas. Público, sin autenticación.
export async function GET(request: NextRequest) {
  try {
    const paquete = await obtenerPaqueteOc4ids(request.nextUrl.origin);
    return NextResponse.json(paquete, { headers: { 'Cache-Control': CACHE } });
  } catch (error) {
    console.error('Error generando el paquete OC4IDS:', error);
    return NextResponse.json({ error: 'No se pudieron generar los datos' }, { status: 500 });
  }
}
