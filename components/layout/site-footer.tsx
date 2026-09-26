import Link from 'next/link';

// Pie de página institucional. "Datos abiertos" sigue como placeholder
// (href="#") hasta que exista esa funcionalidad — ver PLAN_PROYECTO.md
// sección 3.1, todavía no implementada.
export function SiteFooter() {
  return (
    <footer className="z-10 flex shrink-0 flex-col gap-2 border-t border-border bg-background px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>© {new Date().getFullYear()} SIGOP — Sistema de Información Geográfica de Obras Públicas</p>
      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/acerca-de" className="hover:text-foreground">
          Acerca de
        </Link>
        <Link href="/preguntas-frecuentes" className="hover:text-foreground">
          Preguntas frecuentes
        </Link>
        <Link href="/contacto" className="hover:text-foreground">
          Contacto
        </Link>
        <Link href="#" className="hover:text-foreground">
          Datos abiertos
        </Link>
      </nav>
    </footer>
  );
}
