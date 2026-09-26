'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GraficoCulminadasPorAnioProps {
  datos: { anio: number; cantidad: number }[];
}

export function GraficoCulminadasPorAnio({ datos }: GraficoCulminadasPorAnioProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay obras culminadas registradas.</p>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.2} />
          <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(valor) => [`${valor} obras`, 'Culminadas']} />
          <Bar dataKey="cantidad" fill="var(--color-chart-3)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
