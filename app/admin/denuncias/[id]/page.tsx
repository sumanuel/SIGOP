'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Eye, Lock } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import {
  CATEGORIA_LEGIBLE,
  ESTADOS_DENUNCIA,
  ESTADO_DENUNCIA_LEGIBLE,
  type CategoriaDenuncia,
  type EstadoDenunciaClave,
} from '@/lib/denuncia';

interface Detalle {
  id: string;
  numero: number;
  categoria: string;
  descripcion: string;
  evidenciaUrl: string | null;
  estado: EstadoDenunciaClave;
  derivadaA: string | null;
  esAnonima: boolean;
  tieneContacto: boolean;
  createdAt: string;
  obra: { id: string; nombre: string; codigo: string; slug: string } | null;
  eventos: { id: string; estado: EstadoDenunciaClave; nota: string | null; createdAt: string }[];
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';
const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' });

export default function DetalleDenunciaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [denuncia, setDenuncia] = useState<Detalle | null>(null);
  const [estado, setEstado] = useState<EstadoDenunciaClave>('RECIBIDA');
  const [derivadaA, setDerivadaA] = useState('');
  const [nota, setNota] = useState('');
  const [contacto, setContacto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/admin/denuncias/${id}`);
    if (res.status === 401) return router.replace('/admin/login');
    if (!res.ok) {
      setError(res.status === 403 ? 'Tu rol no tiene acceso a las denuncias.' : 'No se pudo cargar la denuncia.');
      return;
    }
    const data: { denuncia: Detalle } = await res.json();
    setDenuncia(data.denuncia);
    setEstado(data.denuncia.estado);
    setDerivadaA(data.denuncia.derivadaA ?? '');
  }, [id, router]);

  useEffect(() => {
    // Carga inicial: la respuesta llega después, no durante el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const res = await fetch(`/api/admin/denuncias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, derivadaA: derivadaA || undefined, nota: nota || undefined }),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'No se pudo guardar.');
      return;
    }
    setNota('');
    await cargar();
  }

  async function verContacto() {
    if (!window.confirm('Vas a ver el contacto de la persona que denunció. Esta consulta queda registrada en la bitácora. ¿Continuar?')) return;
    const res = await fetch(`/api/admin/denuncias/${id}/contacto`, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? 'No se pudo obtener el contacto.');
      return;
    }
    setContacto(data.contacto);
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <AdminNav />
      <Link href="/admin/denuncias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Volver a las denuncias
      </Link>

      {error && <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {denuncia && (
        <div className="mt-4 flex flex-col gap-6">
          <header>
            <h1 className="text-2xl font-semibold">Denuncia n.º {String(denuncia.numero).padStart(4, '0')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {CATEGORIA_LEGIBLE[denuncia.categoria as CategoriaDenuncia] ?? denuncia.categoria} · recibida el{' '}
              {formatoFecha.format(new Date(denuncia.createdAt))} · {denuncia.esAnonima ? 'anónima' : 'con contacto'}
            </p>
            {denuncia.obra && (
              <p className="mt-1 text-sm">
                Obra:{' '}
                <Link href={`/admin/obras/${denuncia.obra.id}/editar`} className="font-medium text-primary hover:underline">
                  {denuncia.obra.nombre}
                </Link>{' '}
                ({denuncia.obra.codigo})
              </p>
            )}
          </header>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Lo que se denuncia</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{denuncia.descripcion}</p>
            {denuncia.evidenciaUrl && (
              <p className="mt-3 text-sm">
                Evidencia:{' '}
                <a href={denuncia.evidenciaUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
                  {denuncia.evidenciaUrl}
                </a>
              </p>
            )}
          </section>

          {denuncia.tieneContacto && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="size-4" aria-hidden="true" />
                Contacto (cifrado)
              </h2>
              {contacto ? (
                <p className="mt-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">{contacto}</p>
              ) : (
                <button
                  type="button"
                  onClick={verContacto}
                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <Eye className="size-4" aria-hidden="true" />
                  Ver contacto (queda registrado)
                </button>
              )}
            </section>
          )}

          <form onSubmit={guardar} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Gestionar</h2>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoDenunciaClave)} className={inputClass}>
                {ESTADOS_DENUNCIA.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_DENUNCIA_LEGIBLE[e]}
                  </option>
                ))}
              </select>
            </label>
            {estado === 'DERIVADA_CONTRALORIA' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Organismo al que se deriva</span>
                <input value={derivadaA} onChange={(e) => setDerivadaA(e.target.value)} maxLength={200} required className={inputClass} />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Mensaje para quien denunció (opcional)</span>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={1000} rows={3} className={inputClass} />
              <span className="text-xs text-muted-foreground">Lo verá con su código de seguimiento. No incluyas datos sensibles.</span>
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </form>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Historial</h2>
            <ul className="flex flex-col gap-2">
              {[...denuncia.eventos].reverse().map((ev) => (
                <li key={ev.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{ESTADO_DENUNCIA_LEGIBLE[ev.estado]}</p>
                  <p className="text-xs text-muted-foreground">{formatoFecha.format(new Date(ev.createdAt))}</p>
                  {ev.nota && <p className="mt-1">{ev.nota}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
