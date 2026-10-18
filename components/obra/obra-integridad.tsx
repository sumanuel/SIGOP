'use client';

import { useState } from 'react';
import { AlertOctagon, Loader2, ShieldCheck } from 'lucide-react';

interface Verificacion {
  ok: boolean;
  cadena: { ok: boolean; registros: number; cabeza: string | null };
  avances: { total: number; integros: number; sinSello: number; alterados: number; eliminados: number };
  selladoDesde: string | null;
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

// Verificación pública del sello de integridad (MODULOS_AVANZADOS.md, módulo 6).
export function ObraIntegridad({ slug }: { slug: string }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ verificacion: Verificacion; verificadaEn: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verificar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${slug}/integridad`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo verificar en este momento.');
        return;
      }
      setResultado(data);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  const v = resultado?.verificacion;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm print:hidden">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="size-5" aria-hidden="true" />
        Sello de integridad
      </h2>
      <p className="text-sm text-muted-foreground">
        Cada avance registrado queda sellado con una huella digital (SHA-256) encadenada con la del registro anterior,
        como un libro contable. Si alguien altera un avance ya publicado, o un sello, la verificación lo detecta.
      </p>

      <button
        type="button"
        onClick={verificar}
        disabled={cargando}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {cargando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
        {cargando ? 'Verificando…' : v ? 'Verificar de nuevo' : 'Verificar integridad'}
      </button>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {v && (
        <div role="status" aria-live="polite" className="flex flex-col gap-2 text-sm">
          {v.ok ? (
            <p className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 font-medium text-success">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {v.avances.integros === 1
                ? `Íntegro: el avance sellado coincide con su sello y la cadena de ${v.cadena.registros} registros está intacta.`
                : v.avances.integros > 1
                  ? `Íntegro: los ${v.avances.integros} avances sellados coinciden con su sello y la cadena de ${v.cadena.registros} registros está intacta.`
                  : 'La cadena está intacta, pero esta obra aún no tiene avances sellados.'}
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
              <AlertOctagon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Se detectaron diferencias:{' '}
              {[
                !v.cadena.ok && 'la cadena de sellos no es consistente',
                v.avances.alterados > 0 && `${v.avances.alterados} avance(s) no coinciden con su sello`,
                v.avances.eliminados > 0 && `${v.avances.eliminados} avance(s) sellados ya no existen`,
              ]
                .filter(Boolean)
                .join('; ')}
              .
            </p>
          )}

          {v.avances.sinSello > 0 && (
            <p className="text-muted-foreground">
              {v.avances.sinSello} avance{v.avances.sinSello === 1 ? '' : 's'} de esta obra {v.avances.sinSello === 1 ? 'es' : 'son'} anterior
              {v.avances.sinSello === 1 ? '' : 'es'} al sistema de sellos y no están protegidos.
            </p>
          )}
          {v.selladoDesde && (
            <p className="text-muted-foreground">Sellado desde el {formatoFecha.format(new Date(v.selladoDesde))}.</p>
          )}
          {v.cadena.cabeza && (
            <p className="text-xs text-muted-foreground">
              Sello actual de la cadena:{' '}
              <code title={v.cadena.cabeza} className="break-all rounded bg-muted px-1 py-0.5">
                {v.cadena.cabeza.slice(0, 16)}…
              </code>{' '}
              (anótalo: si en el futuro la cadena se reescribiera, este valor dejaría de aparecer).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
