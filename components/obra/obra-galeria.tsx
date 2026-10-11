'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ImageOff, X } from 'lucide-react';

interface MultimediaItem {
  id: string;
  url: string;
  titulo: string | null;
  etapa: 'ANTES' | 'DURANTE' | 'DESPUES' | null;
  esPortada: boolean;
}

interface ObraGaleriaProps {
  multimedia: MultimediaItem[];
}

export function ObraGaleria({ multimedia }: ObraGaleriaProps) {
  const [visorIndex, setVisorIndex] = useState<number | null>(null);
  const [posicionSlider, setPosicionSlider] = useState(50);

  const ordenadas = useMemo(
    () => [...multimedia].sort((a, b) => (b.esPortada ? 1 : 0) - (a.esPortada ? 1 : 0)),
    [multimedia]
  );

  const antes = multimedia.find((m) => m.etapa === 'ANTES');
  const despues = multimedia.find((m) => m.etapa === 'DESPUES');

  // Cierra el visor con Escape.
  useEffect(() => {
    if (visorIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisorIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visorIndex]);

  if (ordenadas.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        <ImageOff className="size-6" aria-hidden="true" />
        Aún no hay fotografías de esta obra
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ordenadas.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVisorIndex(i)}
            aria-label={`Ampliar: ${item.titulo ?? 'foto de la obra'}`}
            className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={item.url}
              alt={item.titulo ?? 'Foto de la obra'}
              fill
              sizes="(min-width: 640px) 25vw, 50vw"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>

      {antes && despues && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Antes / Después
          </p>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
            <Image src={despues.url} alt="Después" fill className="object-cover" unoptimized />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - posicionSlider}% 0 0)` }}
            >
              <Image src={antes.url} alt="Antes" fill className="object-cover" unoptimized />
            </div>
            <div
              className="absolute inset-y-0 w-0.5 bg-white shadow"
              style={{ left: `${posicionSlider}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={posicionSlider}
              onChange={(e) => setPosicionSlider(Number(e.target.value))}
              aria-label="Deslizar para comparar antes y después"
              className="absolute inset-x-0 bottom-2 mx-auto w-3/4 accent-primary"
            />
          </div>
        </div>
      )}

      {visorIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visor de fotografía"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setVisorIndex(null)}
        >
          <button
            type="button"
            onClick={() => setVisorIndex(null)}
            aria-label="Cerrar visor"
            autoFocus
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" />
          </button>
          <div className="relative h-[80vh] w-full max-w-4xl">
            <Image
              src={ordenadas[visorIndex].url}
              alt={ordenadas[visorIndex].titulo ?? 'Foto de la obra'}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
