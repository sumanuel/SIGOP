'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertOctagon, Copy, RefreshCw, ShieldCheck, Stamp } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

interface Diagnostico {
  ok: boolean;
  cadena: { ok: boolean; registros: number; cabeza: string | null; primerError: { secuencia: number; motivo: string } | null };
  sinSellar: number;
  obrasConProblemas: { obraId: string; codigo: string; nombre: string; alterados: number; eliminados: number }[];
}

const formatoHora = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'medium' });

export default function IntegridadPage() {
  const router = useRouter();
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [verificadoEn, setVerificadoEn] = useState<Date | null>(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // La carga inicial arranca con `cargando` en true; los botones lo activan antes de volver a llamar.
  const consultar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/integridad');
      if (res.status === 401) return router.replace('/admin/login');
      const data = await res.json().catch(() => null);
      if (!res.ok) return setError(data?.error ?? 'No se pudo verificar la cadena.');
      setDiagnostico(data.diagnostico);
      setVerificadoEn(new Date());
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [router]);

  const verificar = useCallback(() => {
    setCargando(true);
    return consultar();
  }, [consultar]);

  useEffect(() => {
    // Carga inicial: la respuesta llega después del render, no dentro de él.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void consultar();
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEsSuperAdmin(d?.usuario?.rol === 'SUPER_ADMIN'))
      .catch(() => setEsSuperAdmin(false));
  }, [consultar]);

  async function sellarExistentes() {
    if (!window.confirm('Se sellará el contenido actual de los avances que aún no tienen sello. No prueba nada sobre el pasado: solo impide cambios desde ahora. ¿Continuar?')) return;
    setCargando(true);
    setError(null);
    const res = await fetch('/api/admin/integridad', { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? 'No se pudieron sellar los avances.');
      setCargando(false);
      return;
    }
    setAviso(`Se sellaron ${data.sellados} avances.`);
    await verificar();
  }

  async function copiarCabeza() {
    if (!diagnostico?.cadena.cabeza) return;
    try {
      await navigator.clipboard.writeText(diagnostico.cadena.cabeza);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar. Selecciona el texto manualmente.');
    }
  }

  const ok = diagnostico?.ok;

  return (
    <main className="p-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold">Integridad de los avances</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Cada avance queda sellado en una cadena de hashes: si alguien lo modifica o lo borra directamente en la base de datos,
        esta revisión lo detecta. La ficha pública de cada obra permite la misma verificación a cualquier persona.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={verificar}
          disabled={cargando}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          Verificar ahora
        </button>
        {verificadoEn && <span className="text-xs text-muted-foreground">Última verificación: {formatoHora.format(verificadoEn)}</span>}
      </div>

      {error && (
        <p role="alert" className="mt-4 max-w-2xl rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="mt-4 max-w-2xl rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {aviso}
        </p>
      )}

      {diagnostico && (
        <div className="mt-6 flex max-w-2xl flex-col gap-4">
          <section
            className={`flex items-start gap-3 rounded-xl border p-5 ${
              ok ? 'border-success/30 bg-success/5' : 'border-destructive/40 bg-destructive/5'
            }`}
          >
            {ok ? (
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <AlertOctagon className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <div>
              <h2 className="text-lg font-semibold">{ok ? 'La cadena está íntegra' : 'Se detectaron diferencias'}</h2>
              <p className="text-sm text-muted-foreground">
                {diagnostico.cadena.registros} registros sellados.
                {!diagnostico.cadena.ok && diagnostico.cadena.primerError && (
                  <>
                    {' '}
                    <strong className="text-foreground">
                      Registro n.º {diagnostico.cadena.primerError.secuencia}: {diagnostico.cadena.primerError.motivo}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </section>

          {diagnostico.cadena.cabeza && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold">Sello de la cabeza de la cadena</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Anótalo o publícalo en un lugar externo: si más adelante cambia sin que haya avances nuevos, la cadena se reescribió.
              </p>
              <div className="mt-2 flex items-start gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 text-xs">{diagnostico.cadena.cabeza}</code>
                <button
                  type="button"
                  onClick={copiarCabeza}
                  aria-label="Copiar sello"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted"
                >
                  <Copy className="size-4" aria-hidden="true" />
                </button>
              </div>
              {copiado && <p role="status" className="mt-1 text-xs text-success">Copiado.</p>}
            </section>
          )}

          {diagnostico.obrasConProblemas.length > 0 && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold">Obras con avances que no coinciden con su sello</h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {diagnostico.obrasConProblemas.map((o) => (
                  <li key={o.obraId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3">
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{o.codigo}</span> {o.nombre}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {o.alterados > 0 && <span>{o.alterados} alterados</span>}
                      {o.eliminados > 0 && <span>{o.eliminados} eliminados</span>}
                      <Link href={`/admin/obras/${o.obraId}/avances`} className="font-medium text-primary underline-offset-4 hover:underline">
                        Ver avances
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {diagnostico.sinSellar > 0 && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Stamp className="size-4" aria-hidden="true" />
                {diagnostico.sinSellar} {diagnostico.sinSellar === 1 ? 'avance sin sello' : 'avances sin sello'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Son anteriores a la activación del módulo. Sellarlos deja constancia de su contenido actual: no prueba nada sobre el
                pasado, pero impide que cambien desde ahora.
              </p>
              {esSuperAdmin ? (
                <button
                  type="button"
                  onClick={sellarExistentes}
                  disabled={cargando}
                  className="mt-3 min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Sellar avances existentes
                </button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Solo el super administrador puede sellarlos.</p>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
