'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo procesar la solicitud.');
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
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
        </p>

        {mensaje ? (
          <p role="status" className="mt-6 rounded-md bg-success/10 px-3 py-3 text-sm text-success">
            {mensaje}
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Correo</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : 'Enviarme el enlace'}
            </button>
          </form>
        )}

        <Link href="/admin/login" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
