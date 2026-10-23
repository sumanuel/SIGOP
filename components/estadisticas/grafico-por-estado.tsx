'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatearMoneda } from '@/lib/format';

interface GraficoPorEstadoProps {
  datos: { estado: string; inversionPorMoneda: Record<string, number> }[];
  /** Cada gráfica muestra una sola moneda: sumar bolívares con dólares no tiene sentido. */
  moneda: string;
  /** Estado filtrado en este momento (los demás se atenúan). */
  seleccionado?: string;
  onSeleccionar?: (estado: string) => void;
}

export function GraficoPorEstado({ datos, moneda, seleccionado, onSeleccionar }: GraficoPorEstadoProps) {
  const ordenados = datos
    .map((d) => ({ estado: d.estado, inversion: d.inversionPorMoneda[moneda] ?? 0 }))
    .filter((d) => d.inversion > 0)
    .sort((a, b) => b.inversion - a.inversion);

  if (ordenados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos con estos filtros.</p>;
  }

  return (
    <div style={{ height: Math.max(200, ordenados.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordenados} layout="vertical" margin={{ left: 24, right: 16 }}>
          <CartesianGrid horizontal={false} strokeOpacity={0.2} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatearMoneda(Number(v), moneda)}
            tick={{ fontSize: 11 }}
          />
          <YAxis type="category" dataKey="estado" width={110} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(valor) => formatearMoneda(Number(valor), moneda)} />
          <Bar
            dataKey="inversion"
            radius={4}
            onClick={(barra) => onSeleccionar?.(String((barra.payload as { estado: string }).estado))}
            style={{ cursor: onSeleccionar ? 'pointer' : undefined }}
          >
            {ordenados.map((d) => (
              <Cell key={d.estado} fill="var(--color-chart-1)" fillOpacity={!seleccionado || seleccionado === d.estado ? 1 : 0.25} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
