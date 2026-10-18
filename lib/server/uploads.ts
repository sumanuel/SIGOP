import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import exifr from 'exifr';

// Guarda dentro de public/ (ver .env.example): es la única carpeta que
// Next.js sirve directo en la web. UPLOADS_DIR se puede sobreescribir, pero
// si apunta fuera de public/ las imágenes quedarían inaccesibles en dev
// (en producción, Nginx/IIS sí podría servir cualquier ruta del disco).
const UPLOADS_ROOT = path.resolve(process.cwd(), process.env.UPLOADS_DIR || './public/uploads');
const UPLOADS_URL_PREFIX = '/uploads';

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB

const TIPOS_VIDEO = new Set(['video/mp4', 'video/webm']);
export const TAMANO_MAXIMO_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export class UploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ImagenGuardada {
  url: string;
  miniaturaUrl: string;
  /** Evidencia de campo (PLAN_PROYECTO.md sección 3.2, módulo 4): fecha y
   * coordenadas del EXIF original, `null` si la foto no las traía (ej. una
   * captura de pantalla, o una cámara sin GPS activado). */
  fechaCaptura: Date | null;
  latitudExif: number | null;
  longitudExif: number | null;
}

interface DatosExif {
  fechaCaptura: Date | null;
  latitudExif: number | null;
  longitudExif: number | null;
}

/**
 * Lee fecha y GPS del EXIF original — hay que hacerlo ANTES de procesar con
 * sharp, porque `.webp()` no conserva EXIF. Nunca lanza: una foto sin EXIF
 * (o con EXIF corrupto) sigue siendo una foto válida, solo sin esa evidencia
 * adicional.
 */
async function extraerExif(buffer: Buffer): Promise<DatosExif> {
  // `exifr.gps()` es el helper dedicado de la librería para coordenadas (más
  // confiable que pedirlas por nombre en `parse`, que solo expone tags
  // crudos); la fecha sí es un tag crudo normal. Cada uno falla
  // independiente — una foto sin GPS no debe perder su fecha, y viceversa.
  const [fecha, gps] = await Promise.all([
    exifr.parse(buffer, ['DateTimeOriginal', 'CreateDate']).catch(() => null),
    exifr.gps(buffer).catch(() => null),
  ]);

  return {
    fechaCaptura: fecha?.DateTimeOriginal ?? fecha?.CreateDate ?? null,
    latitudExif: gps?.latitude ?? null,
    longitudExif: gps?.longitude ?? null,
  };
}

/**
 * Valida, comprime y guarda una imagen subida (foto de obra, foto de perfil,
 * etc.), más una miniatura. Devuelve las rutas públicas (`/uploads/...`)
 * listas para guardar en `Multimedia.url` / `Persona.fotoUrl`, y la
 * evidencia EXIF si la traía.
 */
export async function guardarImagen(file: File, subcarpeta: string): Promise<ImagenGuardada> {
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    throw new UploadError(400, 'Formato no permitido. Usa JPG, PNG o WebP.');
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new UploadError(400, 'La imagen supera el máximo de 8 MB.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const exif = await extraerExif(buffer);

  const carpetaDestino = path.join(UPLOADS_ROOT, subcarpeta);
  await mkdir(carpetaDestino, { recursive: true });

  const nombreBase = randomUUID();
  const nombreArchivo = `${nombreBase}.webp`;
  const nombreMiniatura = `${nombreBase}-thumb.webp`;

  // Convertir a WebP y limitar el ancho máximo: reduce peso sin depender de
  // que el ciudadano/admin suba una foto ya optimizada.
  await sharp(buffer)
    .rotate() // corrige orientación según EXIF antes de descartarlo
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(carpetaDestino, nombreArchivo));

  await sharp(buffer)
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(carpetaDestino, nombreMiniatura));

  return {
    url: `${UPLOADS_URL_PREFIX}/${subcarpeta}/${nombreArchivo}`,
    miniaturaUrl: `${UPLOADS_URL_PREFIX}/${subcarpeta}/${nombreMiniatura}`,
    ...exif,
  };
}

/** Borra los archivos físicos de una imagen guardada con guardarImagen(). Best-effort. */
export async function eliminarImagen(url: string | null | undefined) {
  if (!url || !url.startsWith(UPLOADS_URL_PREFIX)) return;

  const relativo = url.slice(UPLOADS_URL_PREFIX.length);
  const rutaCompleta = path.join(UPLOADS_ROOT, relativo);

  try {
    await unlink(rutaCompleta);
  } catch {
    // El archivo ya no existe o no se pudo borrar — no es un error fatal.
  }
}

// ------------------------------------------------------------------- video

export interface VideoGuardado {
  url: string;
  /** Fotograma de portada (póster), si el navegador pudo generarlo. */
  miniaturaUrl: string | null;
}

type FormatoVideo = 'mp4' | 'webm';

/**
 * Comprueba el CONTENIDO del archivo y no solo el tipo que declara el cliente
 * (que cualquiera puede falsificar): MP4/MOV llevan "ftyp" en el byte 4 y WebM
 * empieza con la cabecera EBML (1A 45 DF A3).
 */
function detectarFormatoVideo(inicio: Buffer): FormatoVideo | null {
  if (inicio.length >= 12 && inicio.subarray(4, 8).toString('ascii') === 'ftyp') return 'mp4';
  if (inicio.length >= 4 && inicio[0] === 0x1a && inicio[1] === 0x45 && inicio[2] === 0xdf && inicio[3] === 0xa3) return 'webm';
  return null;
}

/**
 * Guarda un video tal cual (sin transcodificar: el servidor no tiene ffmpeg) más
 * un póster opcional que genera el navegador al subirlo. El video conserva sus
 * metadatos, que pueden incluir ubicación GPS: se avisa en el panel.
 */
export async function guardarVideo(file: File, subcarpeta: string, poster?: File | null): Promise<VideoGuardado> {
  if (!TIPOS_VIDEO.has(file.type)) {
    throw new UploadError(400, 'Formato de video no permitido. Usa MP4 o WebM.');
  }
  if (file.size > TAMANO_MAXIMO_VIDEO_BYTES) {
    throw new UploadError(400, `El video supera el máximo de ${TAMANO_MAXIMO_VIDEO_BYTES / (1024 * 1024)} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const formato = detectarFormatoVideo(buffer.subarray(0, 16));
  if (!formato) {
    throw new UploadError(400, 'El archivo no es un video MP4 o WebM válido.');
  }

  const carpetaDestino = path.join(UPLOADS_ROOT, subcarpeta);
  await mkdir(carpetaDestino, { recursive: true });

  const nombreBase = randomUUID();
  const nombreArchivo = `${nombreBase}.${formato}`;
  await writeFile(path.join(carpetaDestino, nombreArchivo), buffer);

  let miniaturaUrl: string | null = null;
  if (poster && poster.size > 0) {
    try {
      if (!TIPOS_PERMITIDOS.has(poster.type) || poster.size > TAMANO_MAXIMO_BYTES) throw new Error('póster no válido');
      const nombreMiniatura = `${nombreBase}-thumb.webp`;
      await sharp(Buffer.from(await poster.arrayBuffer()))
        .resize({ width: 640, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(carpetaDestino, nombreMiniatura));
      miniaturaUrl = `${UPLOADS_URL_PREFIX}/${subcarpeta}/${nombreMiniatura}`;
    } catch {
      // Sin póster el video sigue siendo válido: la galería muestra un marcador genérico.
    }
  }

  return { url: `${UPLOADS_URL_PREFIX}/${subcarpeta}/${nombreArchivo}`, miniaturaUrl };
}
