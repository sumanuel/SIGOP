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

function Marcador({ completado }: { completado: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute -left-[31px] top-0.5 flex size-5 items-center justify-center rounded-full border-2 ${
        completado
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-transparent'
      }`}
    >
      {completado && <Check className="size-3" />}
    </span>
  );
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
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Fechas y hitos</h2>

      <ol className="ml-2.5 flex flex-col gap-4 border-l-2 border-border pl-5">
        {puntos.map((punto) => (
          <li key={punto.etiqueta} className="relative">
            <Marcador completado={punto.completado} />
            <p className="text-sm font-medium">{punto.etiqueta}</p>
            <p className="text-sm text-muted-foreground">
              {formatearFecha(punto.fecha)}
              {punto.completado ? '' : ' · pendiente'}
            </p>
          </li>
        ))}

        {hitos.map((hito) => (
          <li key={hito.id} className="relative">
            <Marcador completado={hito.completado} />
            <p className="text-sm font-medium">
              {hito.nombre}
              <span className="sr-only">{hito.completado ? ' (completado)' : ' (pendiente)'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {formatearFecha(hito.fechaReal ?? hito.fechaPlanificada)}
              {!hito.fechaReal && hito.fechaPlanificada && ' (planificado)'}
            </p>
          </li>
        ))}
      </ol>

      {hitos.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no se han registrado hitos para esta obra.</p>
      )}
    </section>
  );
}
