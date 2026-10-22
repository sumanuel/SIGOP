'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Segundo paso del login cuando la cuenta tiene verificación en dos pasos.
  const [token2fa, setToken2fa] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');

  function entrar() {
    const redirectTo = searchParams.get('redirect') || '/admin';
    router.push(redirectTo);
    router.refresh();
  }

  async function onVerificarCodigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/2fa/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token2fa, codigo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo verificar el código');
        // Un token vencido no se puede reintentar: se vuelve al paso 1.
        if (res.status === 401 && data?.error?.includes('expiró')) {
          setToken2fa(null);
          setPassword('');
        }
        setCodigo('');
        return;
      }

      entrar();
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo iniciar sesión');
        return;
      }

      const data = await res.json();
      if (data.requiere2fa) {
        setToken2fa(data.token2fa);
        return;
      }

      entrar();
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (token2fa) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Verificación en dos pasos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa el código de 6 dígitos que muestra tu app de autenticación.
        </p>

        <form onSubmit={onVerificarCodigo} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="codigo" className="text-sm font-medium">
              Código
            </label>
            <input
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={7}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {enviando ? 'Verificando…' : 'Verificar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setToken2fa(null);
              setCodigo('');
              setPassword('');
              setError(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Volver
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">Panel administrativo de SIGOP</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
        <Link href="/admin/recuperar" className="text-center text-sm text-muted-foreground hover:text-foreground">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      {/* useSearchParams requiere un límite de Suspense en Next.js App Router */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
