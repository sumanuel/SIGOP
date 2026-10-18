import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado } from '@/lib/server/rate-limit';
import { verificarObra, type VerificacionObra } from '@/lib/server/services/integridad.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Recorrer la cadena completa cuesta lo mismo para cualquier visitante: se
// guarda el resultado unos segundos para que no se pueda usar como carga.
const VIGENCIA_CACHE_MS = 30_000;
const cache = new Map<string, { hasta: number; resultado: VerificacionObra }>();

// GET /api/obras/[id]/integridad — verificación pública del sello de integridad
// de una obra publicada (acepta id o slug). No revela datos internos: solo
// conteos y si la cadena está intacta.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (estaLimitado(`integridad:${obtenerIpCliente(request)}`, 30, 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas verificaciones seguidas. Espera un minuto.' }, { status: 429 });
    }

    const { id } = await params;
    const obra = await prisma.obra.findFirst({
      where: { OR: [{ id }, { slug: id }], estadoPublicacion: 'PUBLICADO' },
      select: { id: true },
    });
    if (!obra) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });

    const enCache = cache.get(obra.id);
    if (enCache && enCache.hasta > Date.now()) {
      return NextResponse.json({ verificacion: enCache.resultado, verificadaEn: new Date(enCache.hasta - VIGENCIA_CACHE_MS) });
    }

    const resultado = await verificarObra(obra.id);
    cache.set(obra.id, { hasta: Date.now() + VIGENCIA_CACHE_MS, resultado });
    return NextResponse.json({ verificacion: resultado, verificadaEn: new Date() });
  } catch (error) {
    console.error('Error verificando la integridad:', error);
    return NextResponse.json({ error: 'No se pudo verificar la integridad' }, { status: 500 });
  }
}
