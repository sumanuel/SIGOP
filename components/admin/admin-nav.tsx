'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SelectorTema } from '@/components/layout/selector-tema';

const ENLACES = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/obras', label: 'Obras' },
  { href: '/admin/personas', label: 'Personas' },
  { href: '/admin/reportes', label: 'Reportes' },
  { href: '/admin/auditoria', label: 'Auditoría' },
  { href: '/admin/catalogos', label: 'Catálogos' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/seguridad', label: 'Seguridad' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <nav className="mb-6 flex items-center justify-between border-b border-border pb-4">
      <div className="flex gap-4 text-sm">
        {ENLACES.map((enlace) => {
          const activo = pathname === enlace.href;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={activo ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              {enlace.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <SelectorTema />
        <button
          type="button"
          onClick={cerrarSesion}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
