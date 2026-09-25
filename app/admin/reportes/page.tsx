'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Mail, User } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

type EstadoModeracion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

interface Reporte {
  id: string;
  nombre: string | null;
  correo: string | null;
  mensaje: string;
  fotoUrl: string | null;
  estadoModeracion: EstadoModeracion;
  createdAt: string;
  obra: { id: string; nombre: string; codigo: string; slug: string };
}

const PESTANAS: { valor: EstadoModeracion | 'TODOS'; etiqueta: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'APROBADO', etiqueta: 'Aprobados' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados' },
  { valor: 'TODOS', etiqueta: 'Todos' },
];

const ESTADO_CLASE: Record<EstadoModeracion, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  APROBADO: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  RECHAZADO: 'bg-destructive/10 text-destructive',
};

const ESTADO_LABEL: Record<EstadoModeracion, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

export default function AdminReportesPage() {
  const router = useRouter();
  const [pestana, setPestana] = useState<EstadoModeracion | 'TODOS'>('PENDIENTE');
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const query = pestana === 'TODOS' ? '' : `?estado=${pestana}`;
        const res = await fetch(`/api/admin/reportes${query}`);
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (!res.ok) throw new Error();
        const data: { reportes: Reporte[] } = await res.json();
        if (!cancelado) {
          setReportes(data.reportes);
          setError(null);
        }
      } catch {
        if (!cancelado) setError('No se pudieron cargar los reportes.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [pestana, router]);

  async function moderar(reporte: Reporte, estado: 'APROBADO' | 'RECHAZADO') {
    setProcesandoId(reporte.id);
    try {
      const res = await fetch(`/api/admin/reportes/${reporte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? 'No se pudo actualizar el reporte.');
        return;
      }

      // Si estamos viendo "Pendientes", el reporte moderado desaparece de
      // esta lista; en cualquier otra pestaña, se actualiza su badge in situ.
      if (pestana === 'PENDIENTE') {
        setReportes((prev) => prev.filter((r) => r.id !== reporte.id));
      } else {
        setReportes((prev) => prev.map((r) => (r.id === reporte.id ? { ...r, estadoModeracion: estado } : r)));
      }
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <main className="p-8">
      <AdminNav />

      <h1 className="text-2xl font-semibold">Reportes ciudadanos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Observaciones enviadas por el público desde el portal — revisa antes de que se consideren
        publicadas.
      </p>

      <div className="mt-6 flex gap-1 border-b border-border">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => setPestana(p.valor)}
            className={`border-b-2 px-3 py-2 text-sm ${
              pestana === p.valor
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {cargando ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : reportes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay reportes en esta bandeja.</p>
        ) : (
          reportes.map((reporte) => (
            <div key={reporte.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/obras/${reporte.obra.slug}`}
                    target="_blank"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {reporte.obra.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {reporte.obra.codigo} ·{' '}
                    {new Intl.DateTimeFormat('es-VE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(reporte.createdAt))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASE[reporte.estadoModeracion]}`}
                >
                  {ESTADO_LABEL[reporte.estadoModeracion]}
                </span>
              </div>

              <p className="text-sm">{reporte.mensaje}</p>

              {(reporte.nombre || reporte.correo) && (
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {reporte.nombre && (
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3" /> {reporte.nombre}
                    </span>
                  )}
                  {reporte.correo && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" /> {reporte.correo}
                    </span>
                  )}
                </div>
              )}

              {reporte.estadoModeracion === 'PENDIENTE' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={procesandoId === reporte.id}
                    onClick={() => moderar(reporte, 'APROBADO')}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="size-3" /> Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={procesandoId === reporte.id}
                    onClick={() => moderar(reporte, 'RECHAZADO')}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    <X className="size-3" /> Rechazar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
