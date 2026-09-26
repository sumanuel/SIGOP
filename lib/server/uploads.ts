import { mkdir, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

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
}

/**
 * Valida, comprime y guarda una imagen subida (foto de obra, foto de perfil,
 * etc.), más una miniatura. Devuelve las rutas públicas (`/uploads/...`)
 * listas para guardar en `Multimedia.url` / `Persona.fotoUrl`.
 */
export async function guardarImagen(file: File, subcarpeta: string): Promise<ImagenGuardada> {
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    throw new UploadError(400, 'Formato no permitido. Usa JPG, PNG o WebP.');
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new UploadError(400, 'La imagen supera el máximo de 8 MB.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
