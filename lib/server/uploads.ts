import { mkdir, unlink } from 'fs/promises';
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
