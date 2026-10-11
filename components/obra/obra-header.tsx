import Link from 'next/link';
import { ChevronLeft, MapPin, Star } from 'lucide-react';

interface ObraHeaderProps {
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoObra: { nombre: string; color: string | null };
  estatus: { nombre: string; color: string | null };
  ubicacionTexto: string;
  destacada: boolean;
  /** Avance físico 0-100; si se omite no se muestra la barra de resumen. */
  avanceFisico?: number;
}

// Etiqueta con punto de color: el color acompaña al texto (que mantiene
// contraste propio) en vez de ser el fondo, para cumplir WCAG AA con
// cualquier color configurado desde el admin.
function Etiqueta({ texto, color, fuerte = false }: { texto: string; color: string; fuerte?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-card-foreground ${
        fuerte ? 'font-semibold' : 'font-medium'
      }`}
    >
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {texto}
    </span>
  );
}

export function ObraHeader({
  nombre,
  codigo,
  descripcion,
  tipoObra,
  estatus,
  ubicacionTexto,
  destacada,
  avanceFisico,
}: ObraHeaderProps) {
  const avance = avanceFisico === undefined ? null : Math.max(0, Math.min(100, Math.round(avanceFisico)));

  return (
    <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <Link
        href="/"
        className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Volver al mapa
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta texto={`Estado: ${estatus.nombre}`} color={estatus.color ?? '#94A3B8'} fuerte />
        <Etiqueta texto={tipoObra.nombre} color={tipoObra.color ?? '#6B7280'} />
        {destacada && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            <Star className="size-3" aria-hidden="true" />
            Obra destacada
          </span>
        )}
        <span className="text-xs text-muted-foreground">Código {codigo}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{nombre}</h1>
        {ubicacionTexto && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {ubicacionTexto}
          </p>
        )}
      </div>

      {avance !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Avance físico</span>
            <span className="text-2xl font-bold tabular-nums">{avance}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance físico de la obra"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={avance}
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${avance}%` }} />
          </div>
        </div>
      )}

      {descripcion && (
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/90 sm:text-base">{descripcion}</p>
      )}
    </header>
  );
}
