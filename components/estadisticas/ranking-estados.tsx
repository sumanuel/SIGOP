import { formatearMoneda } from '@/lib/format';

interface RankingEstadosProps {
  datos: { estado: string; cantidad: number; inversion: number; avancePromedio: number }[];
}

// Ranking simple por avance promedio (PLAN_PROYECTO.md sección 3.1). Ver
// MODULOS_AVANZADOS.md módulo 5 para una versión más completa (costo por
// unidad, cumplimiento de plazos) si se retoma como mejora futura.
export function RankingEstados({ datos }: RankingEstadosProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
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
            <tr key={fila.estado} className="border-t border-border">
              <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">{fila.estado}</td>
              <td className="py-2 pr-4">{fila.cantidad}</td>
              <td className="py-2 pr-4">{formatearMoneda(fila.inversion, 'VES')}</td>
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
