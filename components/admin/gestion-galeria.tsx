'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, MapPin, Play, Star, Trash2, X } from 'lucide-react';

interface FotoMultimedia {
  id: string;
  url: string;
  tipo: 'IMAGEN' | 'VIDEO' | 'DOCUMENTO';
  miniaturaUrl: string | null;
  titulo: string | null;
  etapa: 'ANTES' | 'DURANTE' | 'DESPUES' | null;
  esPortada: boolean;
  avanceId: string | null;
  fechaCaptura: string | null;
  latitudExif: number | null;
  longitudExif: number | null;
}

interface AvanceDisponible {
  id: string;
  fecha: string;
  avanceFisico: number;
}

interface GestionGaleriaProps {
  obraId: string;
  multimediaInicial: FotoMultimedia[];
  avancesDisponibles: AvanceDisponible[];
}

type EstadoCola = 'pendiente' | 'subiendo' | 'listo' | 'error';

interface ItemCola {
  id: string;
  archivo: File;
  vista: string;
  estado: EstadoCola;
  mensaje?: string;
}

// Mismos límites que valida el servidor (lib/server/uploads.ts); se revisan
// aquí primero para avisar antes de gastar una subida.
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_VIDEO = ['video/mp4', 'video/webm'];
const TIPOS_PERMITIDOS = [...TIPOS_IMAGEN, ...TIPOS_VIDEO];
const TAMANO_MAXIMO_IMAGEN = 8 * 1024 * 1024;
const TAMANO_MAXIMO_VIDEO = 50 * 1024 * 1024;

const esVideo = (archivo: File) => TIPOS_VIDEO.includes(archivo.type);

/**
 * Saca un fotograma del video en el navegador para usarlo de póster (el
 * servidor no tiene ffmpeg). Devuelve null si el navegador no puede decodificar
 * el video o tarda demasiado: el video se sube igual, solo sin póster.
 */
function capturarFotograma(archivo: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement('video');
    const terminar = (resultado: Blob | null) => {
      clearTimeout(temporizador);
      URL.revokeObjectURL(url);
      resolve(resultado);
    };
    const temporizador = setTimeout(() => terminar(null), 8000);

    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.onerror = () => terminar(null);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      const ancho = Math.min(640, video.videoWidth || 640);
      const alto = Math.round(ancho * ((video.videoHeight || 360) / (video.videoWidth || 640)));
      const lienzo = document.createElement('canvas');
      lienzo.width = ancho;
      lienzo.height = alto;
      lienzo.getContext('2d')?.drawImage(video, 0, 0, ancho, alto);
      lienzo.toBlob((blob) => terminar(blob), 'image/jpeg', 0.8);
    };
    video.src = url;
  });
}
const MAX_ARCHIVOS_POR_LOTE = 20;

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

export function GestionGaleria({ obraId, multimediaInicial, avancesDisponibles }: GestionGaleriaProps) {
  const [fotos, setFotos] = useState<FotoMultimedia[]>(multimediaInicial);
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [titulo, setTitulo] = useState('');
  const [etapa, setEtapa] = useState('');
  const [avanceId, setAvanceId] = useState('');
  const [esPortada, setEsPortada] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const colaRef = useRef<ItemCola[]>([]);

  // Libera las vistas previas (URLs de objeto) al salir de la pantalla.
  useEffect(() => {
    colaRef.current = cola;
  }, [cola]);
  useEffect(() => {
    return () => colaRef.current.forEach((item) => URL.revokeObjectURL(item.vista));
  }, []);

  const pendientes = cola.filter((item) => item.estado === 'pendiente' || item.estado === 'error');
  const variasFotos = cola.length > 1;
  // Un video nunca es la portada de la obra.
  const soloVideo = cola.length === 1 && esVideo(cola[0].archivo);

  function agregarArchivos(lista: FileList | File[]) {
    setAviso(null);
    const nuevos: ItemCola[] = [];
    const rechazados: string[] = [];

    for (const archivo of Array.from(lista)) {
      if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
        rechazados.push(`${archivo.name}: solo JPG, PNG, WebP, MP4 o WebM`);
      } else if (archivo.size > (esVideo(archivo) ? TAMANO_MAXIMO_VIDEO : TAMANO_MAXIMO_IMAGEN)) {
        rechazados.push(`${archivo.name}: supera ${esVideo(archivo) ? 50 : 8} MB`);
      } else if (cola.length + nuevos.length >= MAX_ARCHIVOS_POR_LOTE) {
        rechazados.push(`${archivo.name}: máximo ${MAX_ARCHIVOS_POR_LOTE} archivos por lote`);
      } else {
        nuevos.push({
          id: crypto.randomUUID(),
          archivo,
          vista: URL.createObjectURL(archivo),
          estado: 'pendiente',
        });
      }
    }

    if (nuevos.length > 0) setCola((prev) => [...prev, ...nuevos]);
    if (rechazados.length > 0) setAviso(`No se agregaron: ${rechazados.join('; ')}.`);
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) agregarArchivos(e.target.files);
    e.target.value = ''; // permite volver a elegir el mismo archivo
  }

  function alSoltar(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files.length > 0) agregarArchivos(e.dataTransfer.files);
  }

  function quitar(id: string) {
    setCola((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.vista);
      return prev.filter((i) => i.id !== id);
    });
  }

  function actualizarItem(id: string, cambios: Partial<ItemCola>) {
    setCola((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));
  }

  async function subirUno(item: ItemCola, comoPortada: boolean) {
    actualizarItem(item.id, { estado: 'subiendo', mensaje: undefined });
    try {
      const formData = new FormData();
      formData.append('archivo', item.archivo);
      if (esVideo(item.archivo)) {
        const poster = await capturarFotograma(item.archivo);
        if (poster) formData.append('miniatura', poster, 'poster.jpg');
      }
      if (titulo) formData.append('titulo', titulo);
      if (etapa) formData.append('etapa', etapa);
      if (avanceId) formData.append('avanceId', avanceId);
      formData.append('esPortada', String(comoPortada));

      const res = await fetch(`/api/admin/obras/${obraId}/multimedia`, {
        method: 'POST',
        body: formData, // sin Content-Type manual: el navegador arma el boundary del multipart
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        actualizarItem(item.id, { estado: 'error', mensaje: data?.error ?? 'No se pudo subir el archivo.' });
        return;
      }

      const data: { multimedia: FotoMultimedia } = await res.json();
      setFotos((prev) => [...(comoPortada ? prev.map((f) => ({ ...f, esPortada: false })) : prev), data.multimedia]);
      actualizarItem(item.id, { estado: 'listo' });
    } catch {
      actualizarItem(item.id, { estado: 'error', mensaje: 'Error de conexión.' });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAviso(null);
    if (pendientes.length === 0) {
      setAviso('Elige o arrastra al menos una imagen.');
      return;
    }

    setSubiendo(true);
    // En orden y de a una: cada foto pasa por EXIF + conversión en el servidor
    // y así el orden de la galería coincide con el de la lista.
    // La portada solo aplica cuando se sube una única foto.
    const soloUna = cola.length === 1;
    for (const item of pendientes) {
      await subirUno(item, esPortada && soloUna);
    }
    setSubiendo(false);
    if (esPortada && soloUna) setEsPortada(false);
  }

  function limpiarTerminadas() {
    setCola((prev) => {
      prev.filter((i) => i.estado === 'listo').forEach((i) => URL.revokeObjectURL(i.vista));
      return prev.filter((i) => i.estado !== 'listo');
    });
  }

  async function marcarPortada(foto: FotoMultimedia) {
    const res = await fetch(`/api/admin/multimedia/${foto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esPortada: true }),
    });
    if (!res.ok) {
      window.alert('No se pudo marcar como portada.');
      return;
    }
    setFotos((prev) => prev.map((f) => ({ ...f, esPortada: f.id === foto.id })));
  }

  async function eliminar(foto: FotoMultimedia) {
    if (!window.confirm('¿Eliminar esta foto?')) return;

    const res = await fetch(`/api/admin/multimedia/${foto.id}`, { method: 'DELETE' });
    if (!res.ok) {
      window.alert('No se pudo eliminar la foto.');
      return;
    }
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ImagePlus className="size-4" />
          Subir fotos y videos
        </h2>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
            arrastrando ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
          }`}
        >
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Arrastra tus fotos o videos aquí, o haz clic para elegirlos</span>
          <span className="text-xs text-muted-foreground">
            Fotos JPG, PNG o WebP (hasta 8 MB) · videos MP4 o WebM (hasta 50 MB) · máximo {MAX_ARCHIVOS_POR_LOTE} por lote
          </span>
          <input
            type="file"
            accept={TIPOS_PERMITIDOS.join(',')}
            multiple
            onChange={alElegir}
            className="sr-only"
            aria-label="Elegir fotos o videos de la obra"
          />
        </label>

        {cola.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cola.map((item) => (
              <li key={item.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  {esVideo(item.archivo) ? (
                    <>
                      {/* El navegador muestra el primer fotograma como vista previa. */}
                      <video src={item.vista} muted playsInline preload="metadata" className="size-full object-cover" />
                      <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        <Play className="size-2.5" aria-hidden="true" /> Video
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.vista} alt="" className="size-full object-cover" />
                  )}
                  {item.estado !== 'subiendo' && item.estado !== 'listo' && (
                    <button
                      type="button"
                      onClick={() => quitar(item.id)}
                      aria-label={`Quitar ${item.archivo.name}`}
                      disabled={subiendo}
                      className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="truncate text-xs" title={item.archivo.name}>
                  {item.archivo.name}
                </p>
                <p
                  role="status"
                  className={`flex items-center gap-1 text-[11px] ${
                    item.estado === 'error'
                      ? 'text-destructive'
                      : item.estado === 'listo'
                        ? 'text-success'
                        : 'text-muted-foreground'
                  }`}
                >
                  {item.estado === 'subiendo' && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                  {item.estado === 'listo' && <CheckCircle2 className="size-3" aria-hidden="true" />}
                  {item.estado === 'error' && <AlertCircle className="size-3" aria-hidden="true" />}
                  {item.estado === 'pendiente' && 'Lista para subir'}
                  {item.estado === 'subiendo' && 'Subiendo…'}
                  {item.estado === 'listo' && 'Subida'}
                  {item.estado === 'error' && (item.mensaje ?? 'Error')}
                </p>
              </li>
            ))}
          </ul>
        )}

        {cola.some((i) => esVideo(i.archivo)) && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Los videos se publican tal cual, sin recomprimir: conservan sus datos internos, que pueden incluir la
            ubicación GPS de la grabación. Para que carguen rápido en el celular, graba en 720p y de menos de 2 minutos.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Título (opcional){variasFotos && <span className="font-normal text-muted-foreground"> · se usa en todas</span>}
            </span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Etapa (opcional){variasFotos && <span className="font-normal text-muted-foreground"> · se usa en todas</span>}
            </span>
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={inputClass}>
              <option value="">Sin especificar</option>
              <option value="ANTES">Antes</option>
              <option value="DURANTE">Durante</option>
              <option value="DESPUES">Después</option>
            </select>
          </label>
        </div>

        {avancesDisponibles.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Vincular a un avance (opcional)</span>
            <select value={avanceId} onChange={(e) => setAvanceId(e.target.value)} className={inputClass}>
              <option value="">Sin vincular</option>
              {avancesDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(a.fecha))} — {a.avanceFisico}%
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={esPortada && !variasFotos && !soloVideo}
            disabled={variasFotos || soloVideo}
            onChange={(e) => setEsPortada(e.target.checked)}
            className="size-4 rounded border-input disabled:opacity-50"
          />
          Usar como foto de portada
          {variasFotos && (
            <span className="text-xs text-muted-foreground">(con varias fotos, elige la portada después en la galería)</span>
          )}
        </label>

        {aviso && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{aviso}</p>}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {cola.some((i) => i.estado === 'listo') && !subiendo && (
            <button type="button" onClick={limpiarTerminadas} className="text-sm text-muted-foreground hover:text-foreground">
              Limpiar las subidas
            </button>
          )}
          <button
            type="submit"
            disabled={subiendo || pendientes.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {subiendo
              ? 'Subiendo…'
              : pendientes.length > 1
                ? `Subir ${pendientes.length} fotos`
                : 'Subir foto'}
          </button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Galería ({fotos.length})</h2>
        {fotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fotos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((foto) => (
              <div key={foto.id} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  {foto.tipo === 'VIDEO' ? (
                    <>
                      {foto.miniaturaUrl && <Image src={foto.miniaturaUrl} alt="" fill className="object-cover" unoptimized />}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <span className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white">
                          <Play className="size-4 translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <Image
                      src={foto.miniaturaUrl ?? foto.url}
                      alt={foto.titulo ?? 'Foto de la obra'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {foto.esPortada && (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Portada
                    </span>
                  )}
                </div>
                {foto.titulo && <p className="truncate text-xs">{foto.titulo}</p>}
                {(foto.fechaCaptura || (foto.latitudExif && foto.longitudExif)) && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    Evidencia de campo
                    {foto.fechaCaptura &&
                      ` · ${new Intl.DateTimeFormat('es-VE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(foto.fechaCaptura))}`}
                  </p>
                )}
                <div className="flex justify-between text-xs">
                  {foto.tipo === 'IMAGEN' ? (
                    <button
                      type="button"
                      onClick={() => marcarPortada(foto)}
                      disabled={foto.esPortada}
                      className="inline-flex items-center gap-1 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      <Star className="size-3" /> Portada
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Video</span>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminar(foto)}
                    className="inline-flex items-center gap-1 text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
