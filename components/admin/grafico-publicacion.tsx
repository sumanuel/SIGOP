'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GraficoPublicacionProps {
  datos: { estado: string; etiqueta: string; color: string; cantidad: number }[];
}

export function GraficoPublicacion({ datos }: GraficoPublicacionProps) {
  return (
    <div style={{ height: Math.max(140, datos.length * 52) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="etiqueta" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(valor) => [`${valor} obras`, '']} />
          <Bar dataKey="cantidad" radius={4}>
            {datos.map((d) => (
              <Cell key={d.estado} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
