import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
          S
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold sm:text-xl">SIGOP</span>
          <span className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
            Sistema de Información Geográfica de Obras Públicas
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="font-medium text-foreground">
          Mapa
        </Link>
        <Link href="/estadisticas" className="text-muted-foreground hover:text-foreground">
          Estadísticas
        </Link>
        <Link href="/admin/login" className="text-muted-foreground hover:text-foreground">
          Acceso administrativo
        </Link>
      </nav>
    </header>
  );
}
