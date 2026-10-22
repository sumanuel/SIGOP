'use client';

import { useState, type FormEvent } from 'react';
import { formatearFecha } from '@/lib/format';

interface Avance {
  id: string;
  fecha: string;
  avanceFisico: number;
  avanceFinanciero: number;
  comentario: string | null;
  registradoPor: string | null;
  aprobado: boolean;
}

interface GestionAvancesProps {
  obraId: string;
  avancesIniciales: Avance[];
  puedeAprobar: boolean;
  obraPublicada: boolean;
}

export function GestionAvances({ obraId, avancesIniciales, puedeAprobar, obraPublicada }: GestionAvancesProps) {
  const [avances, setAvances] = useState<Avance[]>(avancesIniciales);
  const ultimo = avances.find((a) => a.aprobado) ?? avances[0];
  const [aprobando, setAprobando] = useState<string | null>(null);
  const requiereAprobacion = obraPublicada && !puedeAprobar;

  const [avanceFisico, setAvanceFisico] = useState(ultimo?.avanceFisico ?? 0);
  const [avanceFinanciero, setAvanceFinanciero] = useState(ultimo?.avanceFinanciero ?? 0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/obras/${obraId}/avances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avanceFisico, avanceFinanciero, comentario: comentario || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo registrar el avance.');
        return;
      }

      const data: { avance: Avance } = await res.json();
      setAvances((prev) => [{ ...data.avance, aprobado: !requiereAprobacion }, ...prev]);
      setComentario('');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function aprobar(id: string) {
    setAprobando(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/avances/${id}/aprobar`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo aprobar el avance.');
        return;
      }
      setAvances((prev) => prev.map((a) => (a.id === id ? { ...a, aprobado: true } : a)));
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setAprobando(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Registrar nuevo avance</h2>
        <p className="text-xs text-muted-foreground">
          {requiereAprobacion
            ? 'La obra está publicada: el avance queda pendiente y el público no lo verá hasta que un aprobador lo apruebe.'
            : 'Queda en el historial sin borrar los anteriores, y actualiza el porcentaje actual que ve el público.'}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Avance físico: {avanceFisico}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={avanceFisico}
              onChange={(e) => setAvanceFisico(Number(e.target.value))}
              className="accent-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Avance financiero: {avanceFinanciero}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={avanceFinanciero}
              onChange={(e) => setAvanceFinanciero(Number(e.target.value))}
              className="accent-primary"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Comentario (opcional)</span>
          <textarea
            rows={2}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ej.: se culminó la estructura del segundo piso."
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </label>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Registrar avance'}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Historial</h2>
        {avances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se ha registrado ningún avance.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {avances.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{formatearFecha(a.fecha)}</p>
                  <p className="text-xs text-muted-foreground">
                    Físico {a.avanceFisico}% · Financiero {a.avanceFinanciero}%
                  </p>
                </div>
                {!a.aprobado && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      Pendiente de aprobación
                    </span>
                    {puedeAprobar && (
                      <button
                        type="button"
                        onClick={() => aprobar(a.id)}
                        disabled={aprobando === a.id}
                        className="min-h-9 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {aprobando === a.id ? 'Aprobando…' : 'Aprobar y publicar'}
                      </button>
                    )}
                  </div>
                )}
                {a.comentario && <p className="mt-1 text-muted-foreground">{a.comentario}</p>}
                {a.registradoPor && (
                  <p className="mt-1 text-xs text-muted-foreground">Registrado por {a.registradoPor}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
