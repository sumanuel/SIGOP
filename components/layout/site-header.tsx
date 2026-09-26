import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b-2 border-primary/15 bg-background px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-base font-bold text-primary-foreground shadow-sm">
          S
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-foreground sm:text-xl">SIGOP</span>
          <span className="hidden text-xs font-medium text-foreground/60 sm:block sm:text-sm">
            Sistema de Información Geográfica de Obras Públicas
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/" className="text-foreground hover:text-primary">
          Mapa
        </Link>
        <Link href="/estadisticas" className="text-foreground/70 hover:text-primary">
          Estadísticas
        </Link>
        <Link href="/admin/login" className="text-foreground/70 hover:text-primary">
          Acceso administrativo
        </Link>
      </nav>
    </header>
  );
}
