import Link from 'next/link';

// Pie de página institucional — enlaces son placeholders hasta que existan
// esas páginas (Acerca de, FAQ, Contacto, Datos abiertos).
export function SiteFooter() {
  return (
    <footer className="z-10 flex shrink-0 flex-col gap-2 border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>© {new Date().getFullYear()} SIGOP — Sistema de Información Geográfica de Obras Públicas</p>
      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="#" className="hover:text-foreground">
          Acerca de
        </Link>
        <Link href="#" className="hover:text-foreground">
          Preguntas frecuentes
        </Link>
        <Link href="#" className="hover:text-foreground">
          Contacto
        </Link>
        <Link href="#" className="hover:text-foreground">
          Datos abiertos
        </Link>
      </nav>
    </footer>
  );
}
