import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import { reiniciarDeOtroUsuario, DosFactoresError } from '@/lib/server/services/dos-factores.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/admin/usuarios/[id]/2fa — recuperación: un super administrador
// quita el 2FA de otra cuenta cuando su dueño perdió el celular.
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const actor = requireAuth(request, ['SUPER_ADMIN']);
    const { id } = await params;
    await reiniciarDeOtroUsuario(id, actor.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof DosFactoresError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error reiniciando 2FA:', error);
    return NextResponse.json({ error: 'No se pudo reiniciar la verificación' }, { status: 500 });
  }
}
