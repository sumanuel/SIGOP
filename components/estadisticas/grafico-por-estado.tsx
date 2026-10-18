'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatearMoneda } from '@/lib/format';

interface GraficoPorEstadoProps {
  datos: { estado: string; inversionPorMoneda: Record<string, number> }[];
  /** Cada gráfica muestra una sola moneda: sumar bolívares con dólares no tiene sentido. */
  moneda: string;
}

export function GraficoPorEstado({ datos, moneda }: GraficoPorEstadoProps) {
  const ordenados = datos
    .map((d) => ({ estado: d.estado, inversion: d.inversionPorMoneda[moneda] ?? 0 }))
    .filter((d) => d.inversion > 0)
    .sort((a, b) => b.inversion - a.inversion);

  if (ordenados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
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
          <Bar dataKey="inversion" fill="var(--color-chart-1)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
