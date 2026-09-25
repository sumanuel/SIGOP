'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';

interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

const ROL_LEGIBLE: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_ENTE: 'Administrador de ente',
  EDITOR_OBRA: 'Editor de obra',
  APROBADOR: 'Aprobador',
  CONSULTA: 'Consulta',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { usuario: UsuarioSesion }) => {
        if (!cancelado) setUsuario(data.usuario);
      })
      .catch(() => {
        // El middleware (proxy.ts) ya filtra por cookie presente, pero si el
        // access token venció o el usuario fue desactivado, la API es la
        // fuente de verdad: se redirige a login.
        if (!cancelado) router.replace('/admin/login');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  if (cargando) {
    return <main className="p-8 text-sm text-muted-foreground">Cargando…</main>;
  }

  if (!usuario) return null;

  return (
    <main className="p-8">
      <AdminNav />

      <h1 className="text-2xl font-semibold">Panel administrativo — SIGOP</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {usuario.nombre} · {ROL_LEGIBLE[usuario.rol] ?? usuario.rol}
      </p>

      <p className="mt-6 text-sm text-muted-foreground">
        Dashboard interno: obras con atraso, últimas actualizaciones, pendientes por aprobar (por
        implementar).
      </p>
    </main>
  );
}
