import { Search } from 'lucide-react';
import type { ObraMapa } from '@/lib/types/obra';
import { formatearMoneda } from '@/lib/format';

interface MapSidebarProps {
  /** Todas las obras cargadas (sin filtrar) — para los conteos por filtro. */
  obras: ObraMapa[];
  /** Obras luego de aplicar los filtros — para el resumen. */
  obrasFiltradas: ObraMapa[];
  busqueda: string;
  onCambiarBusqueda: (valor: string) => void;
  tiposActivos: Set<string>;
  onToggleTipo: (tipo: string) => void;
  estadosActivos: Set<string>;
  onToggleEstado: (estado: string) => void;
  municipiosActivos: Set<string>;
  onToggleMunicipio: (municipio: string) => void;
  estatusActivos: Set<string>;
  onToggleEstatus: (estatus: string) => void;
  rangoAvance: [number, number];
  onCambiarRangoAvance: (rango: [number, number]) => void;
  rangoPresupuesto: [number, number];
  limitesPresupuesto: [number, number];
  onCambiarRangoPresupuesto: (rango: [number, number]) => void;
}

// Panel lateral izquierdo del mapa (PLAN_PROYECTO.md sección 3.1): buscador,
// resumen y filtros (tipo, estado, municipio, estatus, rango de avance,
// rango de presupuesto). Oculto en móvil por ahora (el mapa ocupa todo el
// ancho); una versión "cajón" deslizable queda pendiente.
export function MapSidebar({
  obras,
  obrasFiltradas,
  busqueda,
  onCambiarBusqueda,
  tiposActivos,
  onToggleTipo,
  estadosActivos,
  onToggleEstado,
  municipiosActivos,
  onToggleMunicipio,
  estatusActivos,
  onToggleEstatus,
  rangoAvance,
  onCambiarRangoAvance,
  rangoPresupuesto,
  limitesPresupuesto,
  onCambiarRangoPresupuesto,
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
  const conteoPorTipo = contarPor(obras, (o) => o.tipoObra.nombre);

  const estadosUnicos = Array.from(new Set(obras.map((o) => o.estado))).sort();
  const conteoPorEstado = contarPor(obras, (o) => o.estado);

  const municipiosUnicos = Array.from(new Set(obras.map((o) => o.municipio))).sort();
  const conteoPorMunicipio = contarPor(obras, (o) => o.municipio);

  const estatusUnicos = Array.from(
    new Map(obras.map((o) => [o.estatus.nombre, o.estatus])).values()
  );
  const conteoPorEstatus = contarPor(obras, (o) => o.estatus.nombre);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-background p-4 sm:flex">
      <label className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código…"
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </label>

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
        titulo="Estatus"
        activos={estatusActivos}
        onToggle={onToggleEstatus}
        items={estatusUnicos.map((estatus) => ({
          valor: estatus.nombre,
          etiqueta: estatus.nombre,
          color: estatus.color,
          conteo: conteoPorEstatus.get(estatus.nombre) ?? 0,
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

      <FiltroSeccion
        titulo="Municipio"
        activos={municipiosActivos}
        onToggle={onToggleMunicipio}
        items={municipiosUnicos.map((municipio) => ({
          valor: municipio,
          etiqueta: municipio,
          conteo: conteoPorMunicipio.get(municipio) ?? 0,
        }))}
      />

      <RangoDoble
        titulo="Rango de avance"
        minimoAbsoluto={0}
        maximoAbsoluto={100}
        valor={rangoAvance}
        onCambiar={onCambiarRangoAvance}
        formatear={(v) => `${v}%`}
      />

      <RangoDoble
        titulo="Rango de presupuesto"
        minimoAbsoluto={limitesPresupuesto[0]}
        maximoAbsoluto={limitesPresupuesto[1]}
        valor={rangoPresupuesto}
        onCambiar={onCambiarRangoPresupuesto}
        // Muestra siempre en VES: el filtro compara montos crudos sin
        // convertir divisas, así que si hay obras en USD el número no
        // representa su equivalente real — suficiente para un primer corte,
        // pendiente de una conversión con tasa de cambio si hace falta.
        formatear={(v) => formatearMoneda(v, 'VES')}
      />
    </aside>
  );
}

function contarPor<T>(items: T[], clave: (item: T) => string): Map<string, number> {
  const mapa = new Map<string, number>();
  items.forEach((item) => {
    const k = clave(item);
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  });
  return mapa;
}

interface FiltroItem {
  valor: string;
  etiqueta: string;
  color?: string | null;
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

function RangoDoble({
  titulo,
  minimoAbsoluto,
  maximoAbsoluto,
  valor,
  onCambiar,
  formatear,
}: {
  titulo: string;
  minimoAbsoluto: number;
  maximoAbsoluto: number;
  valor: [number, number];
  onCambiar: (rango: [number, number]) => void;
  formatear: (v: number) => string;
}) {
  const [minimo, maximo] = valor;
  const esRangoCompleto = minimo <= minimoAbsoluto && maximo >= maximoAbsoluto;

  // Si el mínimo y el máximo absolutos son iguales (ej. una sola obra
  // cargada), un slider no tiene nada que mostrar — se omite la sección.
  if (minimoAbsoluto >= maximoAbsoluto) return null;

  function onCambiarMinimo(v: number) {
    onCambiar([Math.min(v, maximo), maximo]);
  }

  function onCambiarMaximo(v: number) {
    onCambiar([minimo, Math.max(v, minimo)]);
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatear(minimo)}</span>
          <span>{formatear(maximo)}</span>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Mínimo</span>
            <input
              type="range"
              min={minimoAbsoluto}
              max={maximoAbsoluto}
              value={minimo}
              onChange={(e) => onCambiarMinimo(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Máximo</span>
            <input
              type="range"
              min={minimoAbsoluto}
              max={maximoAbsoluto}
              value={maximo}
              onChange={(e) => onCambiarMaximo(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
        </div>
        {!esRangoCompleto && (
          <button
            type="button"
            onClick={() => onCambiar([minimoAbsoluto, maximoAbsoluto])}
            className="self-start text-xs text-primary hover:underline"
          >
            Restablecer
          </button>
        )}
      </div>
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
