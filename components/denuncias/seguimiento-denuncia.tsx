'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import {
  CATEGORIA_LEGIBLE,
  ESTADOS_DENUNCIA,
  ESTADO_DENUNCIA_LEGIBLE,
  type CategoriaDenuncia,
  type EstadoDenunciaClave,
} from '@/lib/denuncia';

interface Seguimiento {
  categoria: string;
  creadaEn: string;
  estado: EstadoDenunciaClave;
  derivadaA: string | null;
  eventos: { estado: EstadoDenunciaClave; nota: string | null; fecha: string }[];
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short' });

export function SeguimientoDenuncia() {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Seguimiento | null>(null);

  async function consultar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch('/api/denuncias/seguimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo consultar.');
        return;
      }
      setResultado(data.seguimiento);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  const indiceActual = resultado ? ESTADOS_DENUNCIA.indexOf(resultado.estado) : -1;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <form onSubmit={consultar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Código de seguimiento</span>
          <input
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="DEN-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-ring/50"
          />
        </label>
        <button
          type="submit"
          disabled={cargando}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {cargando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {resultado && (
        <section aria-live="polite" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              {CATEGORIA_LEGIBLE[resultado.categoria as CategoriaDenuncia] ?? resultado.categoria} · enviada el{' '}
              {formatoFecha.format(new Date(resultado.creadaEn))}
            </p>
            <h2 className="mt-1 text-lg font-semibold">Estado: {ESTADO_DENUNCIA_LEGIBLE[resultado.estado]}</h2>
            {resultado.derivadaA && <p className="text-sm text-muted-foreground">Derivada a: {resultado.derivadaA}</p>}
          </div>

          <ol className="flex flex-wrap gap-2 text-xs" aria-label="Etapas">
            {ESTADOS_DENUNCIA.map((estado, i) => (
              <li
                key={estado}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  i <= indiceActual ? 'border-primary/40 bg-primary/10 font-medium' : 'border-border text-muted-foreground'
                }`}
                aria-current={i === indiceActual ? 'step' : undefined}
              >
                {i <= indiceActual ? <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                {ESTADO_DENUNCIA_LEGIBLE[estado]}
              </li>
            ))}
          </ol>

          <div>
            <h3 className="text-sm font-semibold">Historial</h3>
            <ul className="mt-2 flex flex-col gap-3">
              {[...resultado.eventos].reverse().map((evento, i) => (
                <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{ESTADO_DENUNCIA_LEGIBLE[evento.estado]}</p>
                  <p className="text-xs text-muted-foreground">{formatoFecha.format(new Date(evento.fecha))}</p>
                  {evento.nota && <p className="mt-1">{evento.nota}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
