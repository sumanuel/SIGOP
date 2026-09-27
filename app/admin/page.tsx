'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Clock,
  MessageSquare,
  ScrollText,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import { GraficoPorTipo } from '@/components/estadisticas/grafico-por-tipo';
import { GraficoPublicacion } from '@/components/admin/grafico-publicacion';
import { ROL_LEGIBLE } from '@/lib/rol-legible';

interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

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
  totales: { obras: number; personas: number; reportesPendientes: number };
  obrasPorEstatus: { nombre: string; color: string; cantidad: number }[];
  obrasPorPublicacion: { estado: string; etiqueta: string; color: string; cantidad: number }[];
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

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <TarjetaAcceso
          href="/admin/obras"
          icono={Building2}
          titulo="Obras"
          valor={dashboard?.totales.obras}
          colorClase="border-primary/25 bg-primary/10 text-primary"
        />
        <TarjetaAcceso
          href="/admin/personas"
          icono={Users}
          titulo="Personas"
          valor={dashboard?.totales.personas}
          colorClase="border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-400"
        />
        <TarjetaAcceso
          href="/admin/reportes"
          icono={MessageSquare}
          titulo="Reportes"
          valor={dashboard?.totales.reportesPendientes}
          etiquetaValor="pendientes"
          colorClase="border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        />
        <TarjetaAcceso
          href="/admin/auditoria"
          icono={ScrollText}
          titulo="Auditoría"
          descripcion="Ver bitácora"
          colorClase="border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-400"
        />
        <TarjetaAcceso
          href="/admin/catalogos"
          icono={Tags}
          titulo="Catálogos"
          descripcion="Gestionar valores"
          colorClase="border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        />
        <TarjetaAcceso
          href="/admin/usuarios"
          icono={UserCog}
          titulo="Usuarios"
          descripcion="Roles y accesos"
          colorClase="border-rose-300/60 bg-rose-500/10 text-rose-700 dark:text-rose-400"
        />
      </div>

      {!dashboard ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando métricas…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-border p-4">
              <h2 className="text-sm font-semibold">Obras por estatus</h2>
              <p className="mt-1 text-xs text-muted-foreground">Todas las obras, sin importar su publicación.</p>
              <div className="mt-4">
                <GraficoPorTipo datos={dashboard.obrasPorEstatus} />
              </div>
            </section>

            <section className="rounded-lg border border-border p-4">
              <h2 className="text-sm font-semibold">Estado de publicación</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Borrador → en revisión → publicado (ver panel de aprobación de cada obra).
              </p>
              <div className="mt-4">
                <GraficoPublicacion datos={dashboard.obrasPorPublicacion} />
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
        </>
      )}
    </main>
  );
}

function TarjetaAcceso({
  href,
  icono: Icono,
  titulo,
  valor,
  etiquetaValor,
  descripcion,
  colorClase,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  valor?: number;
  etiquetaValor?: string;
  descripcion?: string;
  colorClase: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:brightness-95 ${colorClase}`}
    >
      <Icono className="size-5" />
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {valor !== undefined ? (
        <p className="text-xl font-semibold leading-tight text-foreground">
          {valor}
          {etiquetaValor && <span className="ml-1 text-xs font-normal text-foreground/60">{etiquetaValor}</span>}
        </p>
      ) : (
        <p className="text-xs text-foreground/60">{descripcion}</p>
      )}
    </Link>
  );
}
