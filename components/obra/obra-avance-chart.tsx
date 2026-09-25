'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Avance</h2>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={RADIO} className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={RADIO}
              className="fill-none stroke-primary transition-all"
              strokeWidth="10"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{avanceFisico}%</span>
            <span className="text-[10px] text-muted-foreground">avance físico</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 text-sm">
          <p>
            <span className="font-medium">Avance financiero:</span> {avanceFinanciero}%
          </p>
          {atrasoDias !== null && (
            <p className={atrasoDias > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}>
              {atrasoDias > 0
                ? `Atraso estimado: ${atrasoDias} día${atrasoDias === 1 ? '' : 's'}`
                : 'Sin atraso respecto a la fecha planificada'}
            </p>
          )}

          {historial.length > 1 && (
            <div className="mt-2 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historial} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(valor: string) => formatearFechaCorta(valor)}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
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
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
