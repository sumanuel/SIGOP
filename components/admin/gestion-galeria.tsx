'use client';

import { useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Star, Trash2, Upload } from 'lucide-react';

interface FotoMultimedia {
  id: string;
  url: string;
  miniaturaUrl: string | null;
  titulo: string | null;
  etapa: 'ANTES' | 'DURANTE' | 'DESPUES' | null;
  esPortada: boolean;
}

interface GestionGaleriaProps {
  obraId: string;
  multimediaInicial: FotoMultimedia[];
}

export function GestionGaleria({ obraId, multimediaInicial }: GestionGaleriaProps) {
  const [fotos, setFotos] = useState<FotoMultimedia[]>(multimediaInicial);
  const [titulo, setTitulo] = useState('');
  const [etapa, setEtapa] = useState('');
  const [esPortada, setEsPortada] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const archivo = inputArchivoRef.current?.files?.[0];
    if (!archivo) {
      setError('Selecciona una imagen.');
      return;
    }

    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (titulo) formData.append('titulo', titulo);
      if (etapa) formData.append('etapa', etapa);
      formData.append('esPortada', String(esPortada));

      const res = await fetch(`/api/admin/obras/${obraId}/multimedia`, {
        method: 'POST',
        body: formData, // sin Content-Type manual: el navegador arma el boundary del multipart
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo subir la foto.');
        return;
      }

      const data: { multimedia: FotoMultimedia } = await res.json();
      setFotos((prev) => [
        ...(esPortada ? prev.map((f) => ({ ...f, esPortada: false })) : prev),
        data.multimedia,
      ]);

      setTitulo('');
      setEtapa('');
      setEsPortada(false);
      if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
    }
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
          <Upload className="size-4" />
          Subir foto
        </h2>

        <input
          ref={inputArchivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-sm"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Título (opcional)</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Etapa (opcional)</span>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Sin especificar</option>
              <option value="ANTES">Antes</option>
              <option value="DURANTE">Durante</option>
              <option value="DESPUES">Después</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={esPortada}
            onChange={(e) => setEsPortada(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Usar como foto de portada
        </label>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={subiendo}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {subiendo ? 'Subiendo…' : 'Subir foto'}
        </button>
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
                  <Image
                    src={foto.miniaturaUrl ?? foto.url}
                    alt={foto.titulo ?? 'Foto de la obra'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {foto.esPortada && (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Portada
                    </span>
                  )}
                </div>
                {foto.titulo && <p className="truncate text-xs">{foto.titulo}</p>}
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => marcarPortada(foto)}
                    disabled={foto.esPortada}
                    className="inline-flex items-center gap-1 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    <Star className="size-3" /> Portada
                  </button>
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
