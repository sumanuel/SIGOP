'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const ENLACES = [
  { href: '/', label: 'Mapa' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/admin/login', label: 'Acceso administrativo' },
];

// En pantallas angostas los 3 enlaces ya no caben junto al logo (se
// apretaban contra "SIGOP" o partían "Acceso administrativo" en dos
// líneas) — a partir de `sm` se ocultan detrás de un botón de menú.
export function SiteHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b-2 border-primary/15 bg-background px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3" onClick={() => setMenuAbierto(false)}>
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

      <nav className="hidden items-center gap-4 text-sm font-medium sm:flex">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={enlace.href === '/' ? 'text-foreground hover:text-primary' : 'text-foreground/70 hover:text-primary'}
          >
            {enlace.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuAbierto}
        className="flex items-center justify-center rounded-md p-2 text-foreground hover:bg-primary/10 sm:hidden"
      >
        {menuAbierto ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {menuAbierto && (
        <nav className="absolute inset-x-0 top-16 flex flex-col border-b-2 border-primary/15 bg-background p-2 text-sm font-medium shadow-lg sm:hidden">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuAbierto(false)}
              className={`rounded-md px-3 py-2.5 hover:bg-primary/10 ${
                enlace.href === '/' ? 'text-foreground' : 'text-foreground/70'
              }`}
            >
              {enlace.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
