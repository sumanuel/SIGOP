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
  const sinDatos = aprobado <= 0 && ejecutado <= 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Ejecución financiera</h2>

      {sinDatos ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          La información financiera de esta obra aún no ha sido registrada.
        </p>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatearMoneda(ejecutado, moneda)}</p>
            <p className="text-sm text-muted-foreground">
              ejecutados de {formatearMoneda(aprobado, moneda)} aprobados
            </p>
          </div>

          <div
            role="progressbar"
            aria-label="Porcentaje del presupuesto ejecutado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">{porcentaje}% del presupuesto ejecutado</p>
        </>
      )}

      {fuenteFinanciamiento && (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          Fuente de financiamiento: <span className="font-medium text-foreground">{fuenteFinanciamiento.nombre}</span>
        </p>
      )}
    </section>
  );
}
