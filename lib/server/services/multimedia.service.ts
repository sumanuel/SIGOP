import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { guardarImagen, eliminarImagen } from '@/lib/server/uploads';
import type { TipoMultimedia, EtapaMultimedia } from '@prisma/client';

export async function listarMultimediaDeObra(obraId: string) {
  return prisma.multimedia.findMany({
    where: { obraId },
    orderBy: { orden: 'asc' },
  });
}

interface AgregarFotoInput {
  file: File;
  titulo?: string;
  etapa?: EtapaMultimedia;
  esPortada?: boolean;
}

/** Sube el archivo a disco y crea el registro Multimedia asociado a la obra. */
export async function agregarFoto(obraId: string, data: AgregarFotoInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } });
  if (!obra) return null;

  const { url, miniaturaUrl } = await guardarImagen(data.file, `obras/${obraId}`);

  // Solo una foto de portada por obra: si esta se marca como portada,
  // se desmarca cualquier otra que ya lo fuera.
  if (data.esPortada) {
    await prisma.multimedia.updateMany({
      where: { obraId, esPortada: true },
      data: { esPortada: false },
    });
  }

  const ultimaOrden = await prisma.multimedia.count({ where: { obraId } });

  const multimedia = await prisma.multimedia.create({
    data: {
      obraId,
      tipo: 'IMAGEN' as TipoMultimedia,
      url,
      miniaturaUrl,
      titulo: data.titulo,
      etapa: data.etapa,
      esPortada: data.esPortada ?? false,
      orden: ultimaOrden,
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'CREATE',
    entidad: 'Multimedia',
    entidadId: multimedia.id,
    datosDespues: multimedia,
  });

  return multimedia;
}

export async function eliminarFoto(id: string, usuarioId: string) {
  const multimedia = await prisma.multimedia.findUnique({ where: { id } });
  if (!multimedia) return null;

  await prisma.multimedia.delete({ where: { id } });
  await eliminarImagen(multimedia.url);
  await eliminarImagen(multimedia.miniaturaUrl);

  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: 'Multimedia',
    entidadId: id,
    datosAntes: multimedia,
  });

  return multimedia;
}

export async function marcarComoPortada(id: string, usuarioId: string) {
  const multimedia = await prisma.multimedia.findUnique({ where: { id } });
  if (!multimedia) return null;

  await prisma.multimedia.updateMany({
    where: { obraId: multimedia.obraId, esPortada: true },
    data: { esPortada: false },
  });

  const actualizada = await prisma.multimedia.update({
    where: { id },
    data: { esPortada: true },
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'UPDATE',
    entidad: 'Multimedia',
    entidadId: id,
    datosAntes: multimedia,
    datosDespues: actualizada,
  });

  return actualizada;
}
