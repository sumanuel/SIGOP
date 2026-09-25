import { formatearMoneda } from '@/lib/format';

interface ObraFinanzasProps {
  presupuestoAprobado: { toString(): string };
  montoEjecutado: { toString(): string };
  moneda: string;
  fuenteFinanciamiento: { nombre: string } | null;
}

export function ObraFinanzas({
  presupuestoAprobado,
  montoEjecutado,
  moneda,
  fuenteFinanciamiento,
}: ObraFinanzasProps) {
  const aprobado = Number(presupuestoAprobado.toString());
  const ejecutado = Number(montoEjecutado.toString());
  const porcentaje = aprobado > 0 ? Math.min(100, Math.round((ejecutado / aprobado) * 100)) : 0;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Ejecución financiera
      </h2>

      <div>
        <p className="text-2xl font-bold">{formatearMoneda(ejecutado, moneda)}</p>
        <p className="text-xs text-muted-foreground">
          de {formatearMoneda(aprobado, moneda)} aprobados
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{porcentaje}% ejecutado</p>

      {fuenteFinanciamiento && (
        <p className="text-xs text-muted-foreground">
          Fuente de financiamiento: <span className="text-foreground">{fuenteFinanciamiento.nombre}</span>
        </p>
      )}
    </section>
  );
}
