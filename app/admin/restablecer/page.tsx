'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function FormularioRestablecer() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== repetida) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo restablecer la contraseña.');
        return;
      }
      setListo(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Enlace incompleto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abre el enlace completo del correo, o <Link href="/admin/recuperar" className="text-primary hover:underline">pide uno nuevo</Link>.
        </p>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Contraseña actualizada</h1>
        <p role="status" className="mt-3 rounded-md bg-success/10 px-3 py-3 text-sm text-success">
          Ya puedes iniciar sesión con tu contraseña nueva.
        </p>
        <Link
          href="/admin/login"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold">Elige una contraseña nueva</h1>
      <p className="mt-1 text-sm text-muted-foreground">Mínimo 8 caracteres.</p>

      <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Contraseña nueva</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Repítela</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}{' '}
            {/venció|usó|válido/.test(error) && (
              <Link href="/admin/recuperar" className="underline">
                Pedir un enlace nuevo
              </Link>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      {/* useSearchParams requiere un límite de Suspense en Next.js App Router */}
      <Suspense fallback={null}>
        <FormularioRestablecer />
      </Suspense>
    </main>
  );
}
