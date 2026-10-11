'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

interface Configuracion {
  secreto: string;
  qr: string;
  tokenConfiguracion: string;
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

async function llamar(url: string, cuerpo?: unknown) {
  const res = await fetch(url, {
    method: cuerpo === undefined && url.endsWith('estado') ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export default function SeguridadPage() {
  const router = useRouter();
  const [activo, setActivo] = useState<boolean | null>(null);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    llamar('/api/auth/2fa/estado').then((r) => {
      if (cancelado) return;
      if (r.status === 401) router.replace('/admin/login');
      else if (r.ok) setActivo(r.data.activo);
      else setError('No se pudo consultar el estado de la verificación.');
    });
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function empezar() {
    setOcupado(true);
    setError(null);
    setMensaje(null);
    const r = await llamar('/api/auth/2fa/configurar', {});
    setOcupado(false);
    if (!r.ok) return setError(r.data?.error ?? 'No se pudo iniciar la configuración.');
    setConfiguracion(r.data);
    setCodigo('');
  }

  async function activar(e: FormEvent) {
    e.preventDefault();
    if (!configuracion) return;
    setOcupado(true);
    setError(null);
    const r = await llamar('/api/auth/2fa/activar', { tokenConfiguracion: configuracion.tokenConfiguracion, codigo });
    setOcupado(false);
    if (!r.ok) return setError(r.data?.error ?? 'No se pudo activar la verificación.');
    setActivo(true);
    setConfiguracion(null);
    setCodigo('');
    setMensaje('Verificación en dos pasos activada. Desde ahora se te pedirá un código al iniciar sesión.');
  }

  async function desactivar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    const r = await llamar('/api/auth/2fa/desactivar', { password, codigo });
    setOcupado(false);
    if (!r.ok) return setError(r.data?.error ?? 'No se pudo desactivar la verificación.');
    setActivo(false);
    setCodigo('');
    setPassword('');
    setMensaje('Verificación en dos pasos desactivada.');
  }

  return (
    <main className="p-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold">Seguridad de la cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Protege tu acceso con un código temporal además de la contraseña.
      </p>

      <section className="mt-6 max-w-xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 items-center justify-center rounded-lg border ${
              activo ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            {activo ? <ShieldCheck className="size-5" aria-hidden="true" /> : <ShieldOff className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <h2 className="text-lg font-semibold">Verificación en dos pasos</h2>
            <p className="text-sm text-muted-foreground">
              {activo === null ? 'Consultando…' : activo ? 'Activada' : 'Desactivada'}
            </p>
          </div>
        </div>

        {mensaje && <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{mensaje}</p>}
        {error && <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {activo === false && !configuracion && (
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Necesitas una app de autenticación en tu celular (Google Authenticator, Microsoft Authenticator,
              Authy, 1Password…). Al activarla, cada inicio de sesión pedirá el código que ella muestra.
            </p>
            <button
              type="button"
              onClick={empezar}
              disabled={ocupado}
              className="w-fit rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Activar verificación
            </button>
          </div>
        )}

        {activo === false && configuracion && (
          <form onSubmit={activar} className="mt-4 flex flex-col gap-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Abre tu app de autenticación y agrega una cuenta nueva.</li>
              <li>Escanea este código QR (o escribe la clave a mano).</li>
              <li>Escribe aquí el código de 6 dígitos que te muestra la app.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={configuracion.qr} alt="Código QR para la app de autenticación" className="size-[220px] rounded-md border border-border bg-white" />
            <p className="text-muted-foreground">
              Clave manual: <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">{configuracion.secreto}</code>
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Código de 6 dígitos</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={7}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`${inputClass} w-40 text-center tracking-[0.3em]`}
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={ocupado}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Confirmar y activar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfiguracion(null);
                  setError(null);
                }}
                className="rounded-md border border-border px-4 py-2 hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {activo && (
          <form onSubmit={desactivar} className="mt-4 flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Para desactivarla confirma tu contraseña y un código vigente de tu app. Si perdiste el celular, pide
              a un super administrador que reinicie tu verificación desde «Usuarios».
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Contraseña</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Código de 6 dígitos</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={7}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="w-fit rounded-md border border-destructive/40 px-4 py-2 font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Desactivar verificación
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
