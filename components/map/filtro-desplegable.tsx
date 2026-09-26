'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { normalizarTexto } from '@/lib/texto';

export interface FiltroItem {
  valor: string;
  etiqueta: string;
  color?: string | null;
  conteo: number;
}

interface FiltroDesplegableProps {
  titulo: string;
  items: FiltroItem[];
  activos: Set<string>;
  onCambiar: (nuevo: Set<string>) => void;
}

// Filtro tipo "autofiltro de Excel": colapsado por defecto (todos activos),
// con buscador interno cuando la lista es larga (ej. municipios). Evita que
// una categoría con muchos valores reales vuelva interminable el sidebar.
export function FiltroDesplegable({ titulo, items, activos, onCambiar }: FiltroDesplegableProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  if (items.length === 0) return null;

  const todosActivos = activos.size >= items.length;
  const busquedaNorm = normalizarTexto(busqueda);
  const itemsFiltrados = busquedaNorm
    ? items.filter((i) => normalizarTexto(i.etiqueta).includes(busquedaNorm))
    : items;

  function alternar(valor: string) {
    const nuevo = new Set(activos);
    if (nuevo.has(valor)) {
      nuevo.delete(valor);
    } else {
      nuevo.add(valor);
    }
    onCambiar(nuevo);
  }

  function seleccionarTodo() {
    onCambiar(new Set(items.map((i) => i.valor)));
  }

  function borrarSeleccion() {
    onCambiar(new Set());
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border-l-2 border-primary/40 px-1 py-1.5 pl-2 text-left hover:bg-primary/5"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
          {titulo}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary/80">
          {todosActivos ? 'Todos' : `${activos.size} de ${items.length}`}
          <ChevronDown className={`size-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {abierto && (
        <div className="mt-1 flex flex-col gap-2 rounded-md border border-primary/15 bg-primary/[0.03] p-2">
          {items.length > 6 && (
            <label className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-input bg-background py-1 pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring/50"
              />
            </label>
          )}

          <div className="flex gap-3 text-xs">
            <button type="button" onClick={seleccionarTodo} className="text-primary hover:underline">
              Marcar todos
            </button>
            <button type="button" onClick={borrarSeleccion} className="text-primary hover:underline">
              Borrar selección
            </button>
          </div>

          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {itemsFiltrados.length === 0 ? (
              <li className="px-1 py-1 text-xs text-muted-foreground">Sin resultados.</li>
            ) : (
              itemsFiltrados.map((item) => (
                <li key={item.valor}>
                  <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={activos.has(item.valor)}
                      onChange={() => alternar(item.valor)}
                      className="size-3.5 rounded border-input"
                    />
                    {item.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{item.etiqueta}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{item.conteo}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
