'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface GraficoPorTipoProps {
  datos: { nombre: string; color: string; cantidad: number }[];
  /** Tipo filtrado en este momento (los demás se atenúan). */
  seleccionado?: string;
  /** Clic en una porción o en la leyenda: filtra por ese tipo (o lo quita si ya estaba). */
  onSeleccionar?: (nombre: string) => void;
}

export function GraficoPorTipo({ datos, seleccionado, onSeleccionar }: GraficoPorTipoProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos con estos filtros.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="cantidad"
              nameKey="nombre"
              innerRadius={50}
              outerRadius={90}
              onClick={(porcion) => onSeleccionar?.(String(porcion.name))}
              style={{ cursor: onSeleccionar ? 'pointer' : undefined }}
            >
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} fillOpacity={!seleccionado || seleccionado === d.nombre ? 1 : 0.25} />
              ))}
            </Pie>
            <Tooltip formatter={(valor, nombre) => [`${valor} obras`, nombre]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {datos
          .slice()
          .sort((a, b) => b.cantidad - a.cantidad)
          .map((d) => (
            <li key={d.nombre}>
              <button
                type="button"
                onClick={() => onSeleccionar?.(d.nombre)}
                aria-pressed={seleccionado === d.nombre}
                className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted ${
                  seleccionado === d.nombre ? 'bg-muted font-semibold' : ''
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="flex-1">{d.nombre}</span>
                <span className="tabular-nums text-muted-foreground">{d.cantidad}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
