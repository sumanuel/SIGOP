'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  aplicarFiltros,
  calcularEstadisticas,
  hayFiltros,
  parametrosDeFiltros,
  type FilaEstadistica,
  type FiltrosEstadistica,
} from '@/lib/estadisticas';
import { formatearMoneda } from '@/lib/format';
import { GraficoPorTipo } from '@/components/estadisticas/grafico-por-tipo';
import { GraficoPorEstatus } from '@/components/estadisticas/grafico-por-estatus';
import { GraficoPorEstado } from '@/components/estadisticas/grafico-por-estado';
import { GraficoCulminadasPorAnio } from '@/components/estadisticas/grafico-culminadas-por-anio';
import { RankingEstados } from '@/components/estadisticas/ranking-estados';

interface EstadisticasDinamicasProps {
  filas: FilaEstadistica[];
  filtrosIniciales: FiltrosEstadistica;
}

const selectClass =
  'min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

const unicos = (valores: string[]) => [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));

// Las estadísticas se recalculan en el navegador al filtrar (selectores o clic en
// las gráficas), sin volver al servidor. Los filtros activos viajan en la URL,
// así que el enlace de la página se puede compartir tal como se ve.
export function EstadisticasDinamicas({ filas, filtrosIniciales }: EstadisticasDinamicasProps) {
  const [filtros, setFiltros] = useState<FiltrosEstadistica>(filtrosIniciales);

  const filtradas = useMemo(() => aplicarFiltros(filas, filtros), [filas, filtros]);
  const stats = useMemo(() => calcularEstadisticas(filtradas), [filtradas]);

  // Las opciones salen de TODAS las obras, para que no desaparezcan al filtrar.
  const opciones = useMemo(
    () => ({
      estados: unicos(filas.map((f) => f.estado)),
      tipos: unicos(filas.map((f) => f.tipo)),
      estatus: calcularEstadisticas(filas).porEstatus.map((e) => e.nombre),
      anios: [...new Set(filas.map((f) => f.anioAprobacion).filter((a): a is number => a !== null))].sort((a, b) => b - a),
    }),
    [filas]
  );

  function cambiar(nuevos: FiltrosEstadistica) {
    setFiltros(nuevos);
    const query = parametrosDeFiltros(nuevos);
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }

  /** Clic en una gráfica: activa el filtro, o lo quita si ya estaba activo. */
  const alternar = (campo: 'estado' | 'tipo' | 'estatus') => (valor: string) =>
    cambiar({ ...filtros, [campo]: filtros[campo] === valor ? undefined : valor });

  const etiquetasActivas: { clave: string; texto: string; quitar: () => void }[] = [
    filtros.estado && { clave: 'estado', texto: `Estado: ${filtros.estado}`, quitar: () => cambiar({ ...filtros, estado: undefined }) },
    filtros.tipo && { clave: 'tipo', texto: `Tipo: ${filtros.tipo}`, quitar: () => cambiar({ ...filtros, tipo: undefined }) },
    filtros.estatus && { clave: 'estatus', texto: `Estatus: ${filtros.estatus}`, quitar: () => cambiar({ ...filtros, estatus: undefined }) },
    filtros.anio !== undefined && { clave: 'anio', texto: `Aprobadas en ${filtros.anio}`, quitar: () => cambiar({ ...filtros, anio: undefined }) },
  ].filter((e): e is { clave: string; texto: string; quitar: () => void } => Boolean(e));

  return (
    <div>
      <section aria-label="Filtros" className="rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Estado
            <select value={filtros.estado ?? ''} onChange={(e) => cambiar({ ...filtros, estado: e.target.value || undefined })} className={selectClass}>
              <option value="">Todos</option>
              {opciones.estados.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Tipo de obra
            <select value={filtros.tipo ?? ''} onChange={(e) => cambiar({ ...filtros, tipo: e.target.value || undefined })} className={selectClass}>
              <option value="">Todos</option>
              {opciones.tipos.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Estatus
            <select value={filtros.estatus ?? ''} onChange={(e) => cambiar({ ...filtros, estatus: e.target.value || undefined })} className={selectClass}>
              <option value="">Todos</option>
              {opciones.estatus.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Año de aprobación
            <select
              value={filtros.anio ?? ''}
              onChange={(e) => cambiar({ ...filtros, anio: e.target.value ? Number(e.target.value) : undefined })}
              className={selectClass}
            >
              <option value="">Todos</option>
              {opciones.anios.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{filtradas.length}</span> de {filas.length} obras
            {!hayFiltros(filtros) && ' · toca una gráfica para filtrar'}
          </p>
          {etiquetasActivas.map((e) => (
            <button
              key={e.clave}
              type="button"
              onClick={e.quitar}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {e.texto}
              <X className="size-3.5" aria-label="Quitar filtro" />
            </button>
          ))}
          {hayFiltros(filtros) && (
            <button
              type="button"
              onClick={() => cambiar({})}
              className="min-h-9 rounded-md px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              Quitar todos
            </button>
          )}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Obras" valores={[stats.totalObras.toString()]} />
        <Kpi label="Inversión total" valores={stats.monedas.map((m) => formatearMoneda(stats.inversionPorMoneda[m], m))} />
        <Kpi label="Culminadas / inauguradas" valores={[stats.obrasCulminadas.toString()]} />
        <Kpi label="Avance promedio" valores={[stats.totalObras === 0 ? '—' : `${stats.avancePromedio}%`]} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-semibold">Obras por tipo</h2>
          <GraficoPorTipo datos={stats.porTipo} seleccionado={filtros.tipo} onSeleccionar={alternar('tipo')} />
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-semibold">Obras por estatus</h2>
          <GraficoPorEstatus datos={stats.porEstatus} seleccionado={filtros.estatus} onSeleccionar={alternar('estatus')} />
        </section>

        {stats.monedas.length === 0 ? (
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-4 text-sm font-semibold">Inversión por estado</h2>
            <p className="text-sm text-muted-foreground">Sin datos con estos filtros.</p>
          </section>
        ) : (
          stats.monedas.map((moneda) => (
            <section key={moneda} className="rounded-lg border border-border p-4">
              <h2 className="mb-4 text-sm font-semibold">Inversión por estado ({moneda})</h2>
              <GraficoPorEstado datos={stats.porEstado} moneda={moneda} seleccionado={filtros.estado} onSeleccionar={alternar('estado')} />
            </section>
          ))
        )}
      </div>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Obras culminadas por año</h2>
        <GraficoCulminadasPorAnio datos={stats.culminadasPorAnio} />
      </section>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Ranking de estados por avance promedio</h2>
        <RankingEstados datos={stats.porEstado} monedas={stats.monedas} seleccionado={filtros.estado} onSeleccionar={alternar('estado')} />
      </section>
    </div>
  );
}

function Kpi({ label, valores }: { label: string; valores: string[] }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {valores.length === 0 ? (
        <p className="mt-1 text-lg font-semibold leading-tight sm:text-xl">—</p>
      ) : (
        // Una línea por valor: la inversión se muestra una vez por cada moneda.
        valores.map((valor) => (
          <p key={valor} className="mt-1 text-lg font-semibold leading-tight sm:text-xl">
            {valor}
          </p>
        ))
      )}
    </div>
  );
}
