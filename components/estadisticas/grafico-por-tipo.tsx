'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface GraficoPorTipoProps {
  datos: { nombre: string; color: string; cantidad: number }[];
}

export function GraficoPorTipo({ datos }: GraficoPorTipoProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="cantidad" nameKey="nombre" innerRadius={50} outerRadius={90}>
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(valor, nombre) => [`${valor} obras`, nombre]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {datos
          .slice()
          .sort((a, b) => b.cantidad - a.cantidad)
          .map((d) => (
            <li key={d.nombre} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1">{d.nombre}</span>
              <span className="tabular-nums text-muted-foreground">{d.cantidad}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
