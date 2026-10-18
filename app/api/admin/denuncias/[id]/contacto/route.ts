import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { ROLES_DENUNCIAS, DenunciaError, verContactoDenuncia } from '@/lib/server/services/denuncias.service';
import { estaLimitado } from '@/lib/server/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/denuncias/[id]/contacto — revela el contacto cifrado. Es POST
// (no GET) a propósito: cada consulta deja rastro en la bitácora y no debe
// poder dispararse con un enlace ni cachearse.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_DENUNCIAS);
    if (estaLimitado(`denuncia-contacto:${usuario.sub}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiadas consultas seguidas.' }, { status: 429 });
    }

    const { id } = await params;
    const contacto = await verContactoDenuncia(id, usuario.sub);
    return NextResponse.json({ contacto }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DenunciaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error revelando el contacto de una denuncia');
    return NextResponse.json({ error: 'No se pudo obtener el contacto' }, { status: 500 });
  }
}
