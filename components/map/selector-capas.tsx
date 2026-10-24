'use client';

import { Layers } from 'lucide-react';
import { CAPAS_MAPA, type CapaMapa } from '@/lib/map-style';

interface SelectorCapasProps {
  capa: CapaMapa;
  onCambiar: (capa: CapaMapa) => void;
}

// Alterna la capa base del mapa (calles, satélite o relieve).
export function SelectorCapas({ capa, onCambiar }: SelectorCapasProps) {
  return (
    <div
      role="group"
      aria-label="Capa del mapa"
      className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-md backdrop-blur"
    >
      <Layers className="ml-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {CAPAS_MAPA.map(({ id, etiqueta }) => (
        <button
          key={id}
          type="button"
          onClick={() => onCambiar(id)}
          aria-pressed={capa === id}
          className={`min-h-9 rounded-md px-2.5 text-xs font-medium transition-colors ${
            capa === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}
