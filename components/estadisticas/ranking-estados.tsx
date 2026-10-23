import { formatearMoneda } from '@/lib/format';

interface RankingEstadosProps {
  datos: { estado: string; cantidad: number; inversionPorMoneda: Record<string, number>; avancePromedio: number }[];
  monedas: string[];
  seleccionado?: string;
  onSeleccionar?: (estado: string) => void;
}

// Ranking simple por avance promedio (PLAN_PROYECTO.md sección 3.1). Ver
// MODULOS_AVANZADOS.md módulo 5 para una versión más completa (costo por
// unidad, cumplimiento de plazos) si se retoma como mejora futura.
export function RankingEstados({ datos, monedas, seleccionado, onSeleccionar }: RankingEstadosProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos con estos filtros.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Obras</th>
            <th className="py-2 pr-4">Inversión</th>
            <th className="py-2">Avance promedio</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((fila, i) => (
            <tr key={fila.estado} className={`border-t border-border ${seleccionado === fila.estado ? 'bg-muted/60' : ''}`}>
              <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">
                <button
                  type="button"
                  onClick={() => onSeleccionar?.(fila.estado)}
                  aria-pressed={seleccionado === fila.estado}
                  className="-mx-2 min-h-9 rounded-md px-2 text-left hover:bg-muted"
                >
                  {fila.estado}
                </button>
              </td>
              <td className="py-2 pr-4">{fila.cantidad}</td>
              <td className="py-2 pr-4 tabular-nums">
                {monedas.filter((m) => fila.inversionPorMoneda[m]).length === 0
                  ? '—'
                  : monedas
                      .filter((m) => fila.inversionPorMoneda[m])
                      .map((m) => (
                        <span key={m} className="block">
                          {formatearMoneda(fila.inversionPorMoneda[m], m)}
                        </span>
                      ))}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${fila.avancePromedio}%` }}
                    />
                  </div>
                  <span className="tabular-nums">{fila.avancePromedio}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
