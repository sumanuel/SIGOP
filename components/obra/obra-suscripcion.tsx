'use client';

import { useState, type FormEvent } from 'react';
import { BellRing } from 'lucide-react';

// Formulario de la ficha pública para recibir avisos por correo de una obra.
export function ObraSuscripcion({ slug }: { slug: string }) {
  const [correo, setCorreo] = useState('');
  const [sitioWeb, setSitioWeb] = useState(''); // honeypot
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${slug}/suscripcion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, sitioWeb }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo procesar la suscripción.');
        return;
      }
      setMensaje(data.mensaje);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm print:hidden">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BellRing className="size-5" aria-hidden="true" />
        Recibir avisos de esta obra
      </h2>
      <p className="text-sm text-muted-foreground">
        Te escribimos por correo cuando la obra tenga un nuevo avance, se paralice o se reactive. Puedes darte de baja
        desde cualquier mensaje.
      </p>

      {mensaje ? (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{mensaje}</p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Tu correo</span>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
          </label>
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              No llenar este campo
              <input tabIndex={-1} autoComplete="off" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} />
            </label>
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Suscribirme'}
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
