'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { ObraMapa } from '@/lib/types/obra';
import { ReportarObraForm } from '@/components/map/reportar-obra-form';

interface ObraDetallePanelProps {
  obra: ObraMapa;
  onCerrar: () => void;
}

// Panel deslizable que aparece al presionar un punto del mapa
// (PLAN_PROYECTO.md sección 3.1, "Ficha del proyecto"). Por ahora muestra
// solo el resumen que ya viaja con el marcador; la ficha completa (fechas,
// presupuesto, galería, equipo de trabajo) vive en /obras/[slug], pendiente
// de implementar junto con app/api/obras/[id]/route.ts.
export function ObraDetallePanel({ obra, onCerrar }: ObraDetallePanelProps) {
  const [mostrandoReporte, setMostrandoReporte] = useState(false);

  return (
    <div className="absolute right-4 top-4 flex w-[min(22rem,calc(100%-2rem))] flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: obra.tipoObra.color }}>
            {obra.tipoObra.nombre}
          </p>
          <h2 className="text-base font-semibold leading-snug">{obra.nombre}</h2>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {obra.municipio} · {obra.codigo}
      </p>

      <div className="flex items-center gap-2 text-sm">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: obra.estatus.color }}
        >
          {obra.estatus.nombre}
        </span>
        <span className="text-muted-foreground">{obra.avanceFisico}% de avance</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${obra.avanceFisico}%` }}
        />
      </div>

      <div className="flex gap-2">
        <Link
          href={`/obras/${obra.slug}`}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ver ficha completa
        </Link>
        {!mostrandoReporte && (
          <button
            type="button"
            onClick={() => setMostrandoReporte(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Reportar
          </button>
        )}
      </div>

      {mostrandoReporte && (
        <ReportarObraForm obraId={obra.id} onCerrar={() => setMostrandoReporte(false)} />
      )}
    </div>
  );
}
