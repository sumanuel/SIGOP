'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

interface ObraFila {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  avanceFisico: number;
  estadoPublicacion: 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO';
  updatedAt: string;
  tipoObra: { nombre: string };
  estatus: { nombre: string; color: string | null };
  municipio: { nombre: string };
  estado: { nombre: string };
}

const PUBLICACION_LABEL: Record<ObraFila['estadoPublicacion'], string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
};

const PUBLICACION_CLASE: Record<ObraFila['estadoPublicacion'], string> = {
  BORRADOR: 'bg-muted text-muted-foreground',
  EN_REVISION: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  PUBLICADO: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
};

export default function AdminObrasPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted-foreground">Cargando…</main>}>
      <AdminObrasPageInner />
    </Suspense>
  );
}

function AdminObrasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [obras, setObras] = useState<ObraFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const valorFiltro = searchParams.get('publicacion');
  const filtroPublicacion: ObraFila['estadoPublicacion'] | null =
    valorFiltro === 'BORRADOR' || valorFiltro === 'EN_REVISION' || valorFiltro === 'PUBLICADO'
      ? valorFiltro
      : null;

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch('/api/admin/obras');
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (!res.ok) throw new Error();
        const data: { obras: ObraFila[] } = await res.json();
        if (cancelado) return;
        setObras(data.obras);
        setError(null);
      } catch {
        if (!cancelado) setError('No se pudieron cargar las obras.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function eliminar(obra: ObraFila) {
    if (!window.confirm(`¿Eliminar "${obra.nombre}"? Esta acción no se puede deshacer.`)) return;

    const res = await fetch(`/api/obras/${obra.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo eliminar la obra.');
      return;
    }
    setObras((prev) => prev.filter((o) => o.id !== obra.id));
  }

  return (
    <main className="p-8">
      <AdminNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Obras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crear, editar y publicar las obras que se muestran en el portal.
          </p>
        </div>
        <Link
          href="/admin/obras/nueva"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nueva obra
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {filtroPublicacion && (
        <button
          type="button"
          onClick={() => router.replace('/admin/obras')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70"
        >
          Mostrando solo: {PUBLICACION_LABEL[filtroPublicacion]}
          <X className="size-3.5" />
        </button>
      )}

      {(() => {
        const obrasFiltradas = filtroPublicacion
          ? obras.filter((o) => o.estadoPublicacion === filtroPublicacion)
          : obras;

        if (cargando) {
          return <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>;
        }
        if (obrasFiltradas.length === 0) {
          return (
            <p className="mt-8 text-sm text-muted-foreground">
              {filtroPublicacion ? 'No hay obras en este estado.' : 'Todavía no hay obras registradas.'}
            </p>
          );
        }
        return renderizarTabla(obrasFiltradas);
      })()}
    </main>
  );

  function renderizarTabla(obras: ObraFila[]) {
    return (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Obra</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Ubicación</th>
                <th className="px-4 py-2">Estatus</th>
                <th className="px-4 py-2">Avance</th>
                <th className="px-4 py-2">Publicación</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => (
                <tr key={obra.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{obra.nombre}</p>
                    <p className="text-xs text-muted-foreground">{obra.codigo}</p>
                  </td>
                  <td className="px-4 py-3">{obra.tipoObra.nombre}</td>
                  <td className="px-4 py-3">
                    {obra.municipio.nombre}, {obra.estado.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: obra.estatus.color ?? '#94A3B8' }}
                    >
                      {obra.estatus.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">{obra.avanceFisico}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PUBLICACION_CLASE[obra.estadoPublicacion]}`}
                    >
                      {PUBLICACION_LABEL[obra.estadoPublicacion]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/obras/${obra.id}/editar`}
                        className="text-primary hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => eliminar(obra)}
                        className="text-destructive hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    );
  }
}
