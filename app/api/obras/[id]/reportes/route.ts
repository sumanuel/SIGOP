import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { crearReporteCiudadano } from '@/lib/server/services/reportes.service';
import { crearReporteSchema } from '@/lib/server/validators/reporte.schema';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/obras/[id]/reportes — canal público (sin login) para que un
// ciudadano reporte una observación sobre una obra. Pasa por moderación
// antes de ser visible (ver ReporteCiudadano.estadoModeracion en el schema).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const ip = obtenerIpCliente(request);

  // Máximo 5 envíos cada 10 minutos por IP: suficiente para uso legítimo,
  // bajo para frenar spam automatizado sin recurrir a un CAPTCHA (que
  // perjudica la accesibilidad que busca el proyecto).
  if (estaLimitado(`reporte:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Demasiados envíos desde esta conexión. Intenta de nuevo más tarde.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const datos = crearReporteSchema.parse(body);

    const resultado = await crearReporteCiudadano(id, datos);
    if (resultado === null) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });
    }

    // Mismo mensaje tanto si se guardó de verdad como si fue descartado por
    // honeypot — no le damos pistas a un bot de que fue detectado.
    return NextResponse.json(
      { mensaje: 'Gracias, tu reporte fue recibido y será revisado antes de publicarse.' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Error creando reporte ciudadano:', error);
    return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 });
  }
}
