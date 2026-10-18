'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, MessageSquareWarning } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import {
  CATEGORIA_LEGIBLE,
  ESTADOS_DENUNCIA,
  ESTADO_DENUNCIA_LEGIBLE,
  type CategoriaDenuncia,
  type EstadoDenunciaClave,
} from '@/lib/denuncia';

interface FilaDenuncia {
  id: string;
  numero: number;
  categoria: string;
  estado: EstadoDenunciaClave;
  esAnonima: boolean;
  tieneContacto: boolean;
  derivadaA: string | null;
  createdAt: string;
  obra: { id: string; nombre: string; codigo: string } | null;
}

const CLASE_ESTADO: Record<EstadoDenunciaClave, string> = {
  RECIBIDA: 'bg-destructive/10 text-destructive',
  EN_REVISION: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  DERIVADA_CONTRALORIA: 'bg-primary/10 text-primary',
  CERRADA: 'bg-muted text-muted-foreground',
};

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminDenunciasPage() {
  const router = useRouter();
  const [estado, setEstado] = useState('');
  const [filas, setFilas] = useState<FilaDenuncia[]>([]);
  const [nuevas, setNuevas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/denuncias${estado ? `?estado=${estado}` : ''}`);
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (res.status === 403) {
        setError('Tu rol no tiene acceso a las denuncias.');
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFilas(data.denuncias);
      setNuevas(data.nuevas);
      setError(null);
    } catch {
      setError('No se pudieron cargar las denuncias.');
    } finally {
      setCargando(false);
    }
  }, [estado, router]);

  useEffect(() => {
    // Carga inicial y al cambiar de filtro: la respuesta llega después, no en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  return (
    <main className="p-8">
      <AdminNav />
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <MessageSquareWarning className="size-6" aria-hidden="true" />
        Denuncias ciudadanas
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Material sensible: solo lo ven el super administrador y quien aprueba contenido. No incluye ninguna dirección de
        internet ni dato del navegador de quien denuncia.
      </p>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5">
            <option value="">Todos</option>
            {ESTADOS_DENUNCIA.map((e) => (
              <option key={e} value={e}>
                {ESTADO_DENUNCIA_LEGIBLE[e]}
              </option>
            ))}
          </select>
        </label>
        {nuevas > 0 && <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white">{nuevas} sin atender</span>}
      </div>

      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : filas.length === 0 && !error ? (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay denuncias con ese filtro.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">N.º</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Obra</th>
                <th className="px-4 py-2">Recibida</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-3 tabular-nums">{String(f.numero).padStart(4, '0')}</td>
                  <td className="px-4 py-3">
                    {CATEGORIA_LEGIBLE[f.categoria as CategoriaDenuncia] ?? f.categoria}
                    {f.tieneContacto && (
                      <span title="Dejó un medio de contacto (cifrado)" className="ml-2 inline-flex align-middle text-muted-foreground">
                        <Lock className="size-3.5" aria-label="Con contacto" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.obra ? `${f.obra.nombre}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatoFecha.format(new Date(f.createdAt))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASE_ESTADO[f.estado]}`}>{ESTADO_DENUNCIA_LEGIBLE[f.estado]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/denuncias/${f.id}`} className="text-primary hover:underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
