import type { ObraMapa } from '@/lib/types/obra';

interface MapSidebarProps {
  /** Todas las obras cargadas (sin filtrar) — para los conteos por filtro. */
  obras: ObraMapa[];
  /** Obras luego de aplicar los filtros — para el resumen. */
  obrasFiltradas: ObraMapa[];
  tiposActivos: Set<string>;
  onToggleTipo: (tipo: string) => void;
  estadosActivos: Set<string>;
  onToggleEstado: (estado: string) => void;
}

// Panel lateral izquierdo del mapa (PLAN_PROYECTO.md sección 3.1): resumen
// general + filtros por tipo de obra y por estado (territorial). Oculto en
// móvil por ahora (el mapa ocupa todo el ancho); una versión "cajón"
// deslizable queda pendiente.
export function MapSidebar({
  obras,
  obrasFiltradas,
  tiposActivos,
  onToggleTipo,
  estadosActivos,
  onToggleEstado,
}: MapSidebarProps) {
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

  const estadosUnicos = Array.from(new Set(obras.map((o) => o.estado))).sort();
  const conteoPorEstado = new Map<string, number>();
  obras.forEach((o) => {
    conteoPorEstado.set(o.estado, (conteoPorEstado.get(o.estado) ?? 0) + 1);
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

      <FiltroSeccion
        titulo="Tipo de obra"
        activos={tiposActivos}
        onToggle={onToggleTipo}
        items={tiposUnicos.map((tipo) => ({
          valor: tipo.nombre,
          etiqueta: tipo.nombre,
          color: tipo.color,
          conteo: conteoPorTipo.get(tipo.nombre) ?? 0,
        }))}
      />

      <FiltroSeccion
        titulo="Estado"
        activos={estadosActivos}
        onToggle={onToggleEstado}
        items={estadosUnicos.map((estado) => ({
          valor: estado,
          etiqueta: estado,
          conteo: conteoPorEstado.get(estado) ?? 0,
        }))}
      />
    </aside>
  );
}

interface FiltroItem {
  valor: string;
  etiqueta: string;
  color?: string;
  conteo: number;
}

function FiltroSeccion({
  titulo,
  items,
  activos,
  onToggle,
}: {
  titulo: string;
  items: FiltroItem[];
  activos: Set<string>;
  onToggle: (valor: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const activo = activos.has(item.valor);
          return (
            <li key={item.valor}>
              <button
                type="button"
                onClick={() => onToggle(item.valor)}
                aria-pressed={activo}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground hover:opacity-100 ${
                  activo ? 'text-foreground' : 'text-muted-foreground opacity-50'
                }`}
              >
                {item.color && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="flex-1 text-left">{item.etiqueta}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{item.conteo}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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
