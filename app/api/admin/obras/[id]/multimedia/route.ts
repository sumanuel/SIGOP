import { NextResponse, type NextRequest } from 'next/server';
import {
  listarMultimediaDeObra,
  agregarFoto,
} from '@/lib/server/services/multimedia.service';
import { UploadError } from '@/lib/server/uploads';
import { requireAuth, AuthError } from '@/lib/server/require-auth';
import type { EtapaMultimedia } from '@prisma/client';

const ROLES_GESTION = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];
const ETAPAS_VALIDAS: EtapaMultimedia[] = ['ANTES', 'DURANTE', 'DESPUES'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/obras/[id]/multimedia — galería completa (panel admin).
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    requireAuth(request, ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA']);
    const { id } = await params;

    const multimedia = await listarMultimediaDeObra(id);
    return NextResponse.json({ multimedia });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listando la galería:', error);
    return NextResponse.json({ error: 'No se pudo obtener la galería' }, { status: 500 });
  }
}

// POST /api/admin/obras/[id]/multimedia — sube una foto (multipart/form-data:
// campo "archivo" + opcionales "titulo", "etapa", "esPortada").
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const usuario = requireAuth(request, ROLES_GESTION);
    const { id } = await params;

    const form = await request.formData();
    const archivo = form.get('archivo');
    if (!(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json({ error: 'Falta el archivo de imagen.' }, { status: 400 });
    }

    const etapaForm = form.get('etapa');
    const etapa =
      typeof etapaForm === 'string' && ETAPAS_VALIDAS.includes(etapaForm as EtapaMultimedia)
        ? (etapaForm as EtapaMultimedia)
        : undefined;

    const multimedia = await agregarFoto(
      id,
      {
        file: archivo,
        titulo: typeof form.get('titulo') === 'string' ? String(form.get('titulo')) : undefined,
        etapa,
        esPortada: form.get('esPortada') === 'true',
      },
      usuario.sub
    );

    if (!multimedia) return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 });

    return NextResponse.json({ multimedia }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error subiendo la foto:', error);
    return NextResponse.json({ error: 'No se pudo subir la foto' }, { status: 500 });
  }
}
