import type { ObraMapa } from '@/lib/types/obra';

interface ObrasListaProps {
  obras: ObraMapa[];
  onSeleccionar: (obra: ObraMapa) => void;
}

// Vista alternativa al mapa (PLAN_PROYECTO.md sección 3.1: "Alternar vista
// Mapa / Lista") — útil en obras densas donde varios marcadores se pisan, o
// simplemente para quien prefiere hojear una lista. Respeta los mismos
// filtros que el mapa; al hacer clic abre el mismo panel de detalle.
export function ObrasLista({ obras, onSeleccionar }: ObrasListaProps) {
  if (obras.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Ninguna obra coincide con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {obras.map((obra) => (
          <button
            key={obra.id}
            type="button"
            onClick={() => onSeleccionar(obra)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary hover:shadow-sm"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: obra.tipoObra.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{obra.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {obra.codigo} · {obra.municipio}, {obra.estado}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: obra.estatus.color }}
            >
              {obra.estatus.nombre}
            </span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {obra.avanceFisico}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
