'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { serieTemporal, type FilaEstadistica, type MetricaSerie } from '@/lib/estadisticas';
import { formatearMoneda } from '@/lib/format';

interface GraficoEvolucionProps {
  /** Obras ya filtradas (sin el filtro de año, que dejaría una sola columna). */
  filas: FilaEstadistica[];
  monedas: string[];
  /** Año de aprobación filtrado en este momento (se resalta en la línea). */
  anioSeleccionado?: number;
  /** Clic en un año: filtra las obras aprobadas ese año (o quita el filtro si ya estaba). */
  onSeleccionarAnio?: (anio: number) => void;
}

const selectClass =
  'min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

// Texto corto para el eje: 1,2 M, 850 mil… (el tooltip muestra el monto completo).
const abreviar = (n: number) =>
  new Intl.NumberFormat('es-VE', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function GraficoEvolucion({ filas, monedas, anioSeleccionado, onSeleccionarAnio }: GraficoEvolucionProps) {
  const [metrica, setMetrica] = useState<MetricaSerie>('obras');
  const [monedaElegida, setMonedaElegida] = useState<string | null>(null);
  const [acumulado, setAcumulado] = useState(false);

  // Si la moneda elegida ya no existe con los filtros actuales, se usa la primera disponible.
  const moneda = monedaElegida && monedas.includes(monedaElegida) ? monedaElegida : monedas[0];
  const datos = useMemo(
    () => serieTemporal(filas, { metrica, moneda, acumulado }),
    [filas, metrica, moneda, acumulado]
  );

  const formatear = (valor: number) => (metrica === 'inversion' ? formatearMoneda(valor, moneda) : `${valor} ${valor === 1 ? 'obra' : 'obras'}`);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Mostrar
          <select value={metrica} onChange={(e) => setMetrica(e.target.value as MetricaSerie)} className={selectClass}>
            <option value="obras">Cantidad de obras</option>
            <option value="inversion">Inversión aprobada</option>
          </select>
        </label>

        {metrica === 'inversion' && monedas.length > 1 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Moneda
            <select value={moneda} onChange={(e) => setMonedaElegida(e.target.value)} className={selectClass}>
              {monedas.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        )}

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={acumulado} onChange={(e) => setAcumulado(e.target.checked)} className="size-4" />
          Acumulado
        </label>
      </div>

      {datos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay fechas registradas para mostrar la evolución con estos filtros.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datos}
              margin={{ left: 0, right: 16, top: 8 }}
              onClick={(estado) => {
                const anio = Number(estado?.activeLabel);
                if (Number.isInteger(anio)) onSeleccionarAnio?.(anio);
              }}
              style={{ cursor: onSeleccionarAnio ? 'pointer' : undefined }}
            >
              <CartesianGrid vertical={false} strokeOpacity={0.2} />
              <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                width={metrica === 'inversion' ? 56 : 36}
                tickFormatter={(v) => (metrica === 'inversion' ? abreviar(Number(v)) : String(v))}
              />
              <Tooltip formatter={(valor, nombre) => [formatear(Number(valor)), nombre]} labelFormatter={(anio) => `Año ${anio}`} />
              <Legend />
              {anioSeleccionado !== undefined && (
                <ReferenceLine x={anioSeleccionado} stroke="var(--color-primary)" strokeDasharray="4 4" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="aprobadas" name="Aprobadas" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="culminadas" name="Culminadas" stroke="var(--color-chart-3)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {datos.length > 0 && onSeleccionarAnio && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Ver obras aprobadas en:</span>
          {datos.map((p) => (
            <button
              key={p.anio}
              type="button"
              onClick={() => onSeleccionarAnio(p.anio)}
              aria-pressed={anioSeleccionado === p.anio}
              className={`min-h-9 rounded-full border border-border px-3 text-xs hover:bg-muted ${
                anioSeleccionado === p.anio ? 'bg-muted font-semibold' : ''
              }`}
            >
              {p.anio}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        «Aprobadas» se cuentan por su año de aprobación y «culminadas» por su fecha real de fin; las obras sin esa fecha no
        aparecen en la línea correspondiente. {metrica === 'inversion' && `Montos en ${moneda}, sin mezclar monedas.`}
      </p>
    </div>
  );
}
