import { Map as MapIcon, List, Search, Building2, CheckCircle2, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ObraMapa } from '@/lib/types/obra';
import { formatearMoneda } from '@/lib/format';
import { FiltroDesplegable, type FiltroItem } from '@/components/map/filtro-desplegable';

export type Vista = 'mapa' | 'lista';

interface MapSidebarProps {
  /** Todas las obras cargadas (sin filtrar) — para los conteos por filtro. */
  obras: ObraMapa[];
  /** Obras luego de aplicar los filtros — para el resumen. */
  obrasFiltradas: ObraMapa[];
  busqueda: string;
  onCambiarBusqueda: (valor: string) => void;
  vista: Vista;
  onCambiarVista: (vista: Vista) => void;
  tiposActivos: Set<string>;
  onCambiarTipos: (nuevo: Set<string>) => void;
  estadosActivos: Set<string>;
  onCambiarEstados: (nuevo: Set<string>) => void;
  municipiosActivos: Set<string>;
  onCambiarMunicipios: (nuevo: Set<string>) => void;
  estatusActivos: Set<string>;
  onCambiarEstatus: (nuevo: Set<string>) => void;
  aniosActivos: Set<string>;
  onCambiarAnios: (nuevo: Set<string>) => void;
  rangoAvance: [number, number];
  onCambiarRangoAvance: (rango: [number, number]) => void;
  rangoPresupuesto: [number, number];
  limitesPresupuesto: [number, number];
  onCambiarRangoPresupuesto: (rango: [number, number]) => void;
}

/** "2025" o, para obras sin fecha de aprobación, el bucket "Sin fecha". */
export function claveAnio(obra: ObraMapa): string {
  return obra.anioAprobacion !== null ? String(obra.anioAprobacion) : 'Sin fecha';
}

// Panel lateral izquierdo del mapa (PLAN_PROYECTO.md sección 3.1): buscador,
// alternar vista, resumen y filtros. Las categorías con muchos valores
// posibles (estado, municipio, año) usan un desplegable con checkboxes y
// buscador interno en vez de una lista plana — evita que el sidebar se
// vuelva interminable cuando haya obras en decenas de municipios reales.
export function MapSidebar({
  obras,
  obrasFiltradas,
  busqueda,
  onCambiarBusqueda,
  vista,
  onCambiarVista,
  tiposActivos,
  onCambiarTipos,
  estadosActivos,
  onCambiarEstados,
  municipiosActivos,
  onCambiarMunicipios,
  estatusActivos,
  onCambiarEstatus,
  aniosActivos,
  onCambiarAnios,
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

  const tiposItems = construirItems(obras, (o) => [
    { valor: o.tipoObra.nombre, etiqueta: o.tipoObra.nombre, color: o.tipoObra.color },
  ]);
  const estatusItems = construirItems(obras, (o) => [
    { valor: o.estatus.nombre, etiqueta: o.estatus.nombre, color: o.estatus.color },
  ]);
  const estadosItems = construirItems(obras, (o) => [{ valor: o.estado, etiqueta: o.estado }]);
  const municipiosItems = construirItems(obras, (o) => [{ valor: o.municipio, etiqueta: o.municipio }]);
  const aniosItems = construirItems(obras, (o) => [{ valor: claveAnio(o), etiqueta: claveAnio(o) }]).sort(
    (a, b) => (a.valor === 'Sin fecha' ? 1 : b.valor === 'Sin fecha' ? -1 : b.valor.localeCompare(a.valor))
  );

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-primary/10 bg-gradient-to-b from-primary/[0.05] via-background to-background p-4 sm:flex">
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

      <div className="flex rounded-md border border-primary/20 bg-primary/5 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => onCambiarVista('mapa')}
          aria-pressed={vista === 'mapa'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 transition-colors ${
            vista === 'mapa'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapIcon className="size-4" /> Mapa
        </button>
        <button
          type="button"
          onClick={() => onCambiarVista('lista')}
          aria-pressed={vista === 'lista'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 transition-colors ${
            vista === 'lista'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="size-4" /> Lista
        </button>
      </div>

      <section>
        <h2 className="mb-3 border-l-2 border-primary/40 pl-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
          Resumen
        </h2>
        <div className="flex flex-col gap-2">
          <ResumenItem
            icono={Building2}
            label="Obras registradas"
            valor={totalObras}
            colorClase="border-primary/25 bg-primary/10 text-primary"
          />
          <ResumenItem
            icono={CheckCircle2}
            label="Culminadas / inauguradas"
            valor={culminadas}
            colorClase="border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          />
          <ResumenItem
            icono={TrendingUp}
            label="Avance promedio"
            valor={`${avancePromedio}%`}
            colorClase="border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          />
        </div>
      </section>

      <FiltroDesplegable titulo="Tipo de obra" items={tiposItems} activos={tiposActivos} onCambiar={onCambiarTipos} />
      <FiltroDesplegable titulo="Estatus" items={estatusItems} activos={estatusActivos} onCambiar={onCambiarEstatus} />
      <FiltroDesplegable titulo="Estado" items={estadosItems} activos={estadosActivos} onCambiar={onCambiarEstados} />
      <FiltroDesplegable
        titulo="Municipio"
        items={municipiosItems}
        activos={municipiosActivos}
        onCambiar={onCambiarMunicipios}
      />
      <FiltroDesplegable
        titulo="Año de aprobación"
        items={aniosItems}
        activos={aniosActivos}
        onCambiar={onCambiarAnios}
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

/** Arma la lista de opciones únicas + conteo para un FiltroDesplegable. */
function construirItems(
  obras: ObraMapa[],
  extraer: (obra: ObraMapa) => Omit<FiltroItem, 'conteo'>[]
): FiltroItem[] {
  const mapa = new Map<string, FiltroItem>();
  obras.forEach((obra) => {
    extraer(obra).forEach((item) => {
      const previo = mapa.get(item.valor);
      mapa.set(item.valor, { ...item, conteo: (previo?.conteo ?? 0) + 1 });
    });
  });
  return Array.from(mapa.values()).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
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
      <h2 className="mb-3 border-l-2 border-primary/40 pl-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
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

function ResumenItem({
  icono: Icono,
  label,
  valor,
  colorClase,
}: {
  icono: LucideIcon;
  label: string;
  valor: string | number;
  colorClase: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${colorClase}`}>
      <Icono className="size-5 shrink-0" />
      <div>
        <p className="text-xs text-foreground/70">{label}</p>
        <p className="text-xl font-semibold leading-tight text-foreground">{valor}</p>
      </div>
    </div>
  );
}
