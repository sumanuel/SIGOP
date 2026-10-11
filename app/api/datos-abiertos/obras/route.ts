import { NextResponse, type NextRequest } from 'next/server';
import {
  obtenerObrasAbiertas,
  obrasACsv,
  obrasAGeoJson,
} from '@/lib/server/services/datos-abiertos.service';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

// GET /api/datos-abiertos/obras?formato=json|csv|geojson — API pública, sin
// autenticación: solo obras publicadas y solo campos ya visibles en el portal.
export async function GET(request: NextRequest) {
  const formato = request.nextUrl.searchParams.get('formato') ?? 'json';
  if (!['json', 'csv', 'geojson'].includes(formato)) {
    return NextResponse.json({ error: 'Formato inválido. Usa json, csv o geojson.' }, { status: 400 });
  }

  try {
    const datos = await obtenerObrasAbiertas(request.nextUrl.origin);

    if (formato === 'csv') {
      return new NextResponse(obrasACsv(datos.obras), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sigop-obras.csv"',
          'Cache-Control': CACHE,
        },
      });
    }

    if (formato === 'geojson') {
      return new NextResponse(JSON.stringify(obrasAGeoJson(datos)), {
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sigop-obras.geojson"',
          'Cache-Control': CACHE,
        },
      });
    }

    return NextResponse.json(
      { total: datos.obras.length, obras: datos.obras },
      { headers: { 'Cache-Control': CACHE } }
    );
  } catch (error) {
    console.error('Error generando datos abiertos:', error);
    return NextResponse.json({ error: 'No se pudieron generar los datos' }, { status: 500 });
  }
}
