'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GraficoPorEstatusProps {
  datos: { nombre: string; color: string; cantidad: number }[];
  seleccionado?: string;
  onSeleccionar?: (nombre: string) => void;
}

export function GraficoPorEstatus({ datos, seleccionado, onSeleccionar }: GraficoPorEstatusProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos con estos filtros.</p>;
  }

  return (
    <div>
      <div style={{ height: Math.max(180, datos.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid horizontal={false} strokeOpacity={0.2} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(valor) => [`${valor} obras`, 'Cantidad']} />
            <Bar
              dataKey="cantidad"
              radius={4}
              onClick={(barra) => onSeleccionar?.(String((barra.payload as { nombre: string }).nombre))}
              style={{ cursor: onSeleccionar ? 'pointer' : undefined }}
            >
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} fillOpacity={!seleccionado || seleccionado === d.nombre ? 1 : 0.25} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {datos.map((d) => (
          <button
            key={d.nombre}
            type="button"
            onClick={() => onSeleccionar?.(d.nombre)}
            aria-pressed={seleccionado === d.nombre}
            className={`min-h-9 rounded-full border border-border px-3 text-xs hover:bg-muted ${
              seleccionado === d.nombre ? 'bg-muted font-semibold' : ''
            }`}
          >
            {d.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
