'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatearFechaCorta } from '@/lib/format';

interface PuntoAvance {
  fecha: string; // ISO
  avanceFisico: number;
  avanceFinanciero: number;
}

interface ObraAvanceChartProps {
  avanceFisico: number;
  avanceFinanciero: number;
  historial: PuntoAvance[];
  /** Atraso en días: positivo = atrasada, null si no se puede calcular. */
  atrasoDias: number | null;
}

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function ObraAvanceChart({ avanceFisico, avanceFinanciero, historial, atrasoDias }: ObraAvanceChartProps) {
  const offset = CIRCUNFERENCIA - (avanceFisico / 100) * CIRCUNFERENCIA;

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Avance</h2>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
        <div
          role="img"
          aria-label={`Avance físico: ${avanceFisico}%`}
          className="relative size-32 shrink-0"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RADIO} className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={RADIO}
              className="fill-none stroke-primary transition-all duration-200"
              strokeWidth="10"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{avanceFisico}%</span>
            <span className="text-xs text-muted-foreground">avance físico</span>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">Avance financiero:</span>{' '}
            <span className="tabular-nums">{avanceFinanciero}%</span>
          </p>
          {atrasoDias !== null && (
            <p
              className={`inline-flex w-fit items-center gap-2 rounded-md px-3 py-1.5 font-medium ${
                atrasoDias > 0
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-success/10 text-success'
              }`}
            >
              {atrasoDias > 0 ? (
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              )}
              {atrasoDias > 0
                ? `Atraso estimado: ${atrasoDias} día${atrasoDias === 1 ? '' : 's'}`
                : 'Sin atraso respecto a la fecha planificada'}
            </p>
          )}

          {historial.length > 1 ? (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded" style={{ backgroundColor: 'var(--color-chart-1)' }} />
                  Físico
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--color-chart-2)' }} />
                  Financiero
                </span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historial} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={(valor: string) => formatearFechaCorta(valor)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(label) =>
                        formatearFechaCorta(typeof label === 'string' ? label : undefined)
                      }
                      formatter={(valor, nombre) => [
                        `${valor}%`,
                        nombre === 'avanceFisico' ? 'Físico' : 'Financiero',
                      ]}
                    />
                    <Line type="monotone" dataKey="avanceFisico" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="avanceFinanciero"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-muted-foreground">
              Todavía no hay suficientes reportes de avance para mostrar la evolución en el tiempo.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
