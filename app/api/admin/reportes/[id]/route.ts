import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { moderarReporte } from '@/lib/server/services/reportes.service';
import { moderarReporteSchema } from '@/lib/server/validators/reporte.schema';
import { requireAuth, AuthError } from '@/lib/server/require-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/reportes/[id] — aprueba o rechaza un reporte ciudadano.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR']);
    const { id } = await params;

    const body = await request.json();
    const { estado } = moderarReporteSchema.parse(body);

    const reporte = await moderarReporte(id, estado, usuario.sub);
    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ reporte });
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
    console.error('Error moderando reporte ciudadano:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el reporte' }, { status: 500 });
  }
}
