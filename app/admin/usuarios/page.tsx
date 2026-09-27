'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import { ROL_LEGIBLE } from '@/lib/rol-legible';

interface UsuarioFila {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ente: { id: string; nombre: string } | null;
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [miId, setMiId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const [resUsuarios, resMe] = await Promise.all([fetch('/api/admin/usuarios'), fetch('/api/auth/me')]);
        if (resUsuarios.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (resUsuarios.status === 403) {
          if (!cancelado) setError('Tu rol no tiene acceso a la gestión de usuarios.');
          return;
        }
        if (!resUsuarios.ok) throw new Error();

        const data: { usuarios: UsuarioFila[] } = await resUsuarios.json();
        if (cancelado) return;
        setUsuarios(data.usuarios);

        if (resMe.ok) {
          const me: { usuario: { id: string } } = await resMe.json();
          if (!cancelado) setMiId(me.usuario.id);
        }
        setError(null);
      } catch {
        if (!cancelado) setError('No se pudo cargar el listado de usuarios.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function alternarActivo(usuario: UsuarioFila) {
    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !usuario.activo }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo actualizar el usuario.');
      return;
    }
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, activo: !u.activo } : u)));
  }

  async function eliminar(usuario: UsuarioFila) {
    if (!window.confirm(`¿Eliminar a "${usuario.nombre}"? Esta acción no se puede deshacer.`)) return;

    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo eliminar el usuario.');
      return;
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
  }

  return (
    <main className="p-8">
      <AdminNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuentas del panel administrativo y sus roles. Reservado al super administrador.
          </p>
        </div>
        <Link
          href="/admin/usuarios/nueva"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nuevo usuario
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : usuarios.length === 0 && !error ? (
        <p className="mt-8 text-sm text-muted-foreground">Todavía no hay usuarios registrados.</p>
      ) : usuarios.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Ente</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const esUnoMismo = usuario.id === miId;
                return (
                  <tr key={usuario.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {usuario.nombre}
                      {esUnoMismo && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{usuario.email}</td>
                    <td className="px-4 py-3">{ROL_LEGIBLE[usuario.rol] ?? usuario.rol}</td>
                    <td className="px-4 py-3 text-muted-foreground">{usuario.ente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          usuario.activo
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/usuarios/${usuario.id}/editar`} className="text-primary hover:underline">
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={esUnoMismo}
                          onClick={() => alternarActivo(usuario)}
                          className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          disabled={esUnoMismo}
                          onClick={() => eliminar(usuario)}
                          className="text-destructive hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
