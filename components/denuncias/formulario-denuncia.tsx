'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, Copy, KeyRound } from 'lucide-react';
import { CATEGORIAS_DENUNCIA, CATEGORIA_LEGIBLE, type CategoriaDenuncia } from '@/lib/denuncia';

interface FormularioDenunciaProps {
  obra: { slug: string; nombre: string } | null;
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

export function FormularioDenuncia({ obra }: FormularioDenunciaProps) {
  const [categoria, setCategoria] = useState<CategoriaDenuncia>('SOBRECOSTO');
  const [descripcion, setDescripcion] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [dejarContacto, setDejarContacto] = useState(false);
  const [contacto, setContacto] = useState('');
  const [sitioWeb, setSitioWeb] = useState(''); // honeypot
  const [conObra, setConObra] = useState(Boolean(obra));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraSlug: conObra && obra ? obra.slug : undefined,
          categoria,
          descripcion,
          evidenciaUrl: evidenciaUrl.trim() || undefined,
          contacto: dejarContacto && contacto.trim() ? contacto.trim() : undefined,
          sitioWeb,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo enviar la denuncia.');
        return;
      }
      setCodigo(data.codigo);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Portapapeles no disponible: la persona puede seleccionarlo a mano.
    }
  }

  if (codigo) {
    return (
      <section aria-live="polite" className="mt-6 flex flex-col gap-4 rounded-xl border border-success/30 bg-success/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound className="size-5 text-success" aria-hidden="true" />
          Denuncia recibida
        </h2>
        <p className="text-sm">
          Este es tu código de seguimiento. <strong>Se muestra una sola vez y no se puede recuperar</strong>: anótalo o
          cópialo ahora.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-md border border-border bg-background px-4 py-3 text-xl font-bold tracking-wider">{codigo}</code>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            {copiado ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar código'}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Con este código podrás ver cómo avanza tu denuncia, sin necesidad de decir quién eres.
        </p>
        <Link href="/denuncias/seguimiento" className="w-fit text-sm font-medium text-primary hover:underline">
          Ir a la consulta de seguimiento →
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-6 flex flex-col gap-5">
      {obra && (
        <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <input type="checkbox" checked={conObra} onChange={(e) => setConObra(e.target.checked)} className="mt-0.5 size-4" />
          <span>
            Esta denuncia es sobre la obra <strong>{obra.nombre}</strong>
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">¿Qué tipo de irregularidad es?</span>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDenuncia)} className={inputClass}>
          {CATEGORIAS_DENUNCIA.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LEGIBLE[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cuéntanos qué pasó</span>
        <textarea
          required
          minLength={30}
          maxLength={4000}
          rows={7}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={inputClass}
          aria-describedby="ayuda-descripcion"
        />
        <span id="ayuda-descripcion" className="flex justify-between text-xs text-muted-foreground">
          <span>Qué viste, dónde, cuándo. Si quieres seguir anónimo/a, no escribas datos que te identifiquen.</span>
          <span className="tabular-nums">{descripcion.length}/4000</span>
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Enlace a evidencia (opcional)</span>
        <input type="url" value={evidenciaUrl} onChange={(e) => setEvidenciaUrl(e.target.value)} placeholder="https://…" className={inputClass} />
      </label>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium">¿Quieres que te contacten?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dejarContacto} onChange={(e) => setDejarContacto(e.target.checked)} className="size-4" />
          Sí, dejo un medio de contacto (si no, la denuncia queda anónima)
        </label>
        {dejarContacto && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Correo o teléfono. Se guarda cifrado.</span>
            <input value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={200} className={inputClass} />
          </label>
        )}
      </fieldset>

      {/* Honeypot: un humano no lo ve ni lo llena; los bots sí. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No llenar este campo
          <input tabIndex={-1} autoComplete="off" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} />
        </label>
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex min-h-11 w-fit items-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {enviando ? 'Enviando…' : 'Enviar denuncia'}
      </button>
    </form>
  );
}
