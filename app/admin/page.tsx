'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
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

interface ObraConAtraso {
  id: string;
  codigo: string;
  nombre: string;
  slug: string;
  avanceFisico: number;
  atrasoDias: number;
  estatus: { nombre: string; color: string | null };
}

interface ActualizacionReciente {
  id: string;
  obraId: string;
  obraNombre: string;
  obraCodigo: string;
  avanceFisico: number;
  comentario: string | null;
  createdAt: string;
  registradoPor: { id: string; nombre: string } | null;
}

interface DashboardInterno {
  obrasConAtraso: ObraConAtraso[];
  actualizacionesRecientes: ActualizacionReciente[];
  pendientesAprobacion: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardInterno | null>(null);

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

  useEffect(() => {
    let cancelado = false;
    fetch('/api/admin/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DashboardInterno | null) => {
        if (!cancelado && data) setDashboard(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

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

      {dashboard && dashboard.pendientesAprobacion > 0 && (
        <Link
          href="/admin/obras?publicacion=EN_REVISION"
          className="mt-6 flex w-fit items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
        >
          {dashboard.pendientesAprobacion} obra{dashboard.pendientesAprobacion === 1 ? '' : 's'} pendiente
          {dashboard.pendientesAprobacion === 1 ? '' : 's'} de aprobación →
        </Link>
      )}

      {!dashboard ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando métricas…</p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-amber-600" />
              Obras con atraso
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Fecha estimada de finalización ya vencida y avance físico incompleto.
            </p>

            {dashboard.obrasConAtraso.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Ninguna obra activa está atrasada.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {dashboard.obrasConAtraso.map((obra) => (
                  <li key={obra.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/obras/${obra.id}/editar`}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {obra.nombre}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {obra.codigo} · {obra.avanceFisico}% de avance
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      {obra.atrasoDias} día{obra.atrasoDias === 1 ? '' : 's'} de atraso
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-primary" />
              Últimas actualizaciones
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Avances más recientes registrados en cualquier obra.</p>

            {dashboard.actualizacionesRecientes.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Todavía no se ha registrado ningún avance.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {dashboard.actualizacionesRecientes.map((act) => (
                  <li key={act.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/admin/obras/${act.obraId}/avances`}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {act.obraNombre}
                      </Link>
                      <span className="shrink-0 text-xs font-medium">{act.avanceFisico}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {act.registradoPor?.nombre ?? 'Usuario desconocido'} ·{' '}
                      {new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(
                        new Date(act.createdAt)
                      )}
                    </p>
                    {act.comentario && (
                      <p className="mt-1 text-xs text-muted-foreground">&ldquo;{act.comentario}&rdquo;</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
