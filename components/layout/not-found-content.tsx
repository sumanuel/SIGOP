import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

// Contenido compartido entre app/not-found.tsx (rutas totalmente
// desconocidas) y app/(public)/not-found.tsx (ej. una obra con slug
// inexistente) — mismo mensaje, cada uno decide si envuelve con
// header/footer.
export function NotFoundContent() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPinOff className="size-8 text-muted-foreground" />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">Error 404</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Página no encontrada</h1>
      </div>

      <p className="max-w-sm text-sm text-muted-foreground">
        La obra o la página que buscas no existe, fue movida, o todavía no ha sido publicada.
      </p>

      <Link
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver al mapa
      </Link>
    </main>
  );
}
