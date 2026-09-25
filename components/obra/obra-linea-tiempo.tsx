import { Check } from 'lucide-react';
import { formatearFecha } from '@/lib/format';

interface Hito {
  id: string;
  nombre: string;
  fechaPlanificada: Date | null;
  fechaReal: Date | null;
  completado: boolean;
}

interface ObraLineaTiempoProps {
  fechaAprobacion: Date | null;
  fechaInicio: Date | null;
  fechaFinEstimada: Date | null;
  fechaFinReal: Date | null;
  hitos: Hito[];
}

export function ObraLineaTiempo({
  fechaAprobacion,
  fechaInicio,
  fechaFinEstimada,
  fechaFinReal,
  hitos,
}: ObraLineaTiempoProps) {
  const puntos = [
    { etiqueta: 'Aprobación', fecha: fechaAprobacion, completado: Boolean(fechaAprobacion) },
    { etiqueta: 'Inicio', fecha: fechaInicio, completado: Boolean(fechaInicio) },
    {
      etiqueta: fechaFinReal ? 'Finalización' : 'Fin estimado',
      fecha: fechaFinReal ?? fechaFinEstimada,
      completado: Boolean(fechaFinReal),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Fechas y hitos</h2>

      <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
        {puntos.map((punto) => (
          <li key={punto.etiqueta} className="relative">
            <span
              className={`absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${
                punto.completado ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <p className="text-sm font-medium">{punto.etiqueta}</p>
            <p className="text-xs text-muted-foreground">{formatearFecha(punto.fecha)}</p>
          </li>
        ))}

        {hitos.map((hito) => (
          <li key={hito.id} className="relative">
            <span
              className={`absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${
                hito.completado ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {hito.completado && <Check className="size-2.5" />}
            </span>
            <p className="text-sm font-medium">{hito.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {formatearFecha(hito.fechaReal ?? hito.fechaPlanificada)}
              {!hito.fechaReal && hito.fechaPlanificada && ' (planificado)'}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
