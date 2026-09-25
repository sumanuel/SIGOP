'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

interface PersonaPerfilModalProps {
  cargo: string;
  area: string | null;
  fechaIngreso: Date | null;
  persona: {
    nombreCompleto: string;
    fotoUrl: string | null;
    profesion: string | null;
    especialidad: string | null;
    aniosExperiencia: number | null;
    bioCorta: string | null;
  };
  onCerrar: () => void;
}

export function PersonaPerfilModal({ cargo, area, fechaIngreso, persona, onCerrar }: PersonaPerfilModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-lg bg-background p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
          {persona.fotoUrl ? (
            <Image src={persona.fotoUrl} alt={persona.nombreCompleto} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
              {persona.nombreCompleto.charAt(0)}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold">{persona.nombreCompleto}</h2>
          <p className="text-sm text-muted-foreground">{cargo}</p>
          {area && <p className="text-xs text-muted-foreground">Área: {area}</p>}
        </div>

        <dl className="grid w-full grid-cols-2 gap-2 text-left text-xs">
          {persona.profesion && (
            <div>
              <dt className="text-muted-foreground">Profesión</dt>
              <dd>{persona.profesion}</dd>
            </div>
          )}
          {persona.especialidad && (
            <div>
              <dt className="text-muted-foreground">Especialidad</dt>
              <dd>{persona.especialidad}</dd>
            </div>
          )}
          {persona.aniosExperiencia !== null && (
            <div>
              <dt className="text-muted-foreground">Experiencia</dt>
              <dd>{persona.aniosExperiencia} años</dd>
            </div>
          )}
          {fechaIngreso && (
            <div>
              <dt className="text-muted-foreground">En esta obra desde</dt>
              <dd>{new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(fechaIngreso)}</dd>
            </div>
          )}
        </dl>

        {persona.bioCorta && <p className="text-sm text-muted-foreground">{persona.bioCorta}</p>}
      </div>
    </div>
  );
}
