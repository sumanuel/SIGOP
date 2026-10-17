import { PauseCircle } from 'lucide-react';
import { MOTIVO_LEGIBLE, diasEntre, duracionLegible, type MotivoParalizacionClave } from '@/lib/paralizacion';

interface PeriodoPublico {
  id: string;
  motivo: string;
  descripcion: string | null;
  fechaInicio: Date;
  fechaReactivacion: Date | null;
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

// Historial de paralizaciones en la ficha pública: solo fechas y motivo declarado.
export function ObraParalizaciones({ periodos }: { periodos: PeriodoPublico[] }) {
  if (periodos.length === 0) return null;

  const ahora = new Date();
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <PauseCircle className="size-5" aria-hidden="true" />
        Historial de paralizaciones
      </h2>
      <ul className="flex flex-col gap-2">
        {periodos.map((p) => (
          <li key={p.id} className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="font-medium">{MOTIVO_LEGIBLE[p.motivo as MotivoParalizacionClave] ?? p.motivo}</p>
            <p className="text-muted-foreground">
              {formatoFecha.format(p.fechaInicio)} →{' '}
              {p.fechaReactivacion ? formatoFecha.format(p.fechaReactivacion) : 'continúa paralizada'} ·{' '}
              {duracionLegible(diasEntre(p.fechaInicio, p.fechaReactivacion ?? ahora))}
            </p>
            {p.descripcion && <p className="mt-1 text-muted-foreground">{p.descripcion}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
