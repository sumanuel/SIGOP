import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface ObraHeaderProps {
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoObra: { nombre: string; color: string | null };
  estatus: { nombre: string; color: string | null };
  ubicacionTexto: string;
  destacada: boolean;
}

export function ObraHeader({
  nombre,
  codigo,
  descripcion,
  tipoObra,
  estatus,
  ubicacionTexto,
  destacada,
}: ObraHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al mapa
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: tipoObra.color ?? '#6B7280' }}
        >
          {tipoObra.nombre}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: estatus.color ?? '#94A3B8' }}
        >
          {estatus.nombre}
        </span>
        {destacada && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            Obra destacada
          </span>
        )}
        <span className="text-xs text-muted-foreground">{codigo}</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{nombre}</h1>
      <p className="text-sm text-muted-foreground">{ubicacionTexto}</p>

      {descripcion && <p className="max-w-3xl text-sm leading-relaxed sm:text-base">{descripcion}</p>}
    </div>
  );
}
