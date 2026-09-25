import type { ObraMapa } from '@/lib/types/obra';

interface MapSidebarProps {
  /** Todas las obras cargadas (sin filtrar) — para los conteos por tipo. */
  obras: ObraMapa[];
  /** Obras luego de aplicar el filtro — para el resumen. */
  obrasFiltradas: ObraMapa[];
  tiposActivos: Set<string>;
  onToggleTipo: (tipo: string) => void;
}

// Panel lateral izquierdo del mapa (PLAN_PROYECTO.md sección 3.1): resumen
// general + filtro por tipo de obra. Oculto en móvil por ahora (el mapa
// ocupa todo el ancho); una versión "cajón" deslizable queda pendiente.
export function MapSidebar({ obras, obrasFiltradas, tiposActivos, onToggleTipo }: MapSidebarProps) {
  const totalObras = obrasFiltradas.length;
  const culminadas = obrasFiltradas.filter(
    (o) => o.estatus.nombre === 'Culminada' || o.estatus.nombre === 'Inaugurada'
  ).length;
  const avancePromedio =
    totalObras === 0
      ? 0
      : Math.round(obrasFiltradas.reduce((acc, o) => acc + o.avanceFisico, 0) / totalObras);

  const tiposUnicos = Array.from(
    new Map(obras.map((o) => [o.tipoObra.nombre, o.tipoObra])).values()
  );
  const conteoPorTipo = new Map<string, number>();
  obras.forEach((o) => {
    conteoPorTipo.set(o.tipoObra.nombre, (conteoPorTipo.get(o.tipoObra.nombre) ?? 0) + 1);
  });

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-background p-4 sm:flex">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen
        </h2>
        <div className="flex flex-col gap-2">
          <ResumenItem label="Obras registradas" valor={totalObras} />
          <ResumenItem label="Culminadas / inauguradas" valor={culminadas} />
          <ResumenItem label="Avance promedio" valor={`${avancePromedio}%`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo de obra
        </h2>
        <ul className="flex flex-col gap-1">
          {tiposUnicos.map((tipo) => {
            const activo = tiposActivos.has(tipo.nombre);
            return (
              <li key={tipo.nombre}>
                <button
                  type="button"
                  onClick={() => onToggleTipo(tipo.nombre)}
                  aria-pressed={activo}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground hover:opacity-100 ${
                    activo ? 'text-foreground' : 'text-muted-foreground opacity-50'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tipo.color }}
                  />
                  <span className="flex-1 text-left">{tipo.nombre}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {conteoPorTipo.get(tipo.nombre) ?? 0}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}

function ResumenItem({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold leading-tight">{valor}</p>
    </div>
  );
}
