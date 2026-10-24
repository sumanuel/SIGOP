'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SelectorTema } from '@/components/layout/selector-tema';

export const EVENTO_ALERTAS = 'sigop-alertas-cambiaron';

const ENLACES = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/obras', label: 'Obras' },
  { href: '/admin/personas', label: 'Personas' },
  { href: '/admin/reportes', label: 'Reportes' },
  { href: '/admin/alertas', label: 'Alertas' },
  { href: '/admin/denuncias', label: 'Denuncias' },
  { href: '/admin/auditoria', label: 'Auditoría' },
  { href: '/admin/integridad', label: 'Integridad' },
  { href: '/admin/catalogos', label: 'Catálogos' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/seguridad', label: 'Seguridad' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertasActivas, setAlertasActivas] = useState(0);
  // null = sin permiso para ver denuncias: el enlace ni se muestra.
  const [denunciasNuevas, setDenunciasNuevas] = useState<number | null>(null);

  // Contador de alertas activas junto al enlace (se ignora si falla o no hay permiso).
  useEffect(() => {
    let cancelado = false;
    const cargarContador = () =>
      fetch('/api/admin/alertas')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelado && data) setAlertasActivas(data.resumen.total);
        })
        .catch(() => {});
    void cargarContador();
    fetch('/api/admin/denuncias')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && data) setDenunciasNuevas(data.nuevas);
      })
      .catch(() => {});
    // La bandeja avisa cuando evalúa o resuelve, para que el contador no quede viejo.
    window.addEventListener(EVENTO_ALERTAS, cargarContador);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_ALERTAS, cargarContador);
    };
  }, []);

  async function cerrarSesion() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <nav className="mb-6 flex items-center justify-between border-b border-border pb-4">
      <div className="flex gap-4 text-sm">
        {ENLACES.filter((e) => e.href !== '/admin/denuncias' || denunciasNuevas !== null).map((enlace) => {
          const activo = pathname === enlace.href;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={activo ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              {enlace.label}
              {enlace.href === '/admin/denuncias' && denunciasNuevas !== null && denunciasNuevas > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white" aria-label={`${denunciasNuevas} denuncias sin atender`}>
                  {denunciasNuevas}
                </span>
              )}
              {enlace.href === '/admin/alertas' && alertasActivas > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white" aria-label={`${alertasActivas} alertas activas`}>
                  {alertasActivas}
                </span>
              )}
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
