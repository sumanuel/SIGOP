import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { guardarImagen, eliminarImagen, UploadError } from '@/lib/server/uploads';
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
  /** Vincula la foto al avance que la generó (PLAN_PROYECTO.md sección 3.2,
   * módulo 4) — opcional, ej. una foto subida desde la galería general no
   * viene de ningún avance en particular. */
  avanceId?: string;
}

/** Sube el archivo a disco y crea el registro Multimedia asociado a la obra. */
export async function agregarFoto(obraId: string, data: AgregarFotoInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } });
  if (!obra) return null;

  // Si viene un avanceId, debe pertenecer a esta obra — evita que alguien
  // cuelgue una foto en el avance de otra obra manipulando el request.
  if (data.avanceId) {
    const avance = await prisma.avance.findUnique({ where: { id: data.avanceId }, select: { obraId: true } });
    if (!avance || avance.obraId !== obraId) {
      throw new UploadError(400, 'El avance indicado no pertenece a esta obra.');
    }
  }

  const { url, miniaturaUrl, fechaCaptura, latitudExif, longitudExif } = await guardarImagen(
    data.file,
    `obras/${obraId}`
  );

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
      avanceId: data.avanceId,
      tipo: 'IMAGEN' as TipoMultimedia,
      url,
      miniaturaUrl,
      titulo: data.titulo,
      etapa: data.etapa,
      esPortada: data.esPortada ?? false,
      orden: ultimaOrden,
      fechaCaptura,
      latitudExif,
      longitudExif,
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
