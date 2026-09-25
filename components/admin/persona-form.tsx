'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface PersonaFormValues {
  nombres: string;
  apellidos: string;
  fotoUrl: string;
  profesion: string;
  especialidad: string;
  aniosExperiencia: string;
  bioCorta: string;
  documentoIdentidad: string;
  consentimientoPublicacion: boolean;
}

const VALORES_VACIOS: PersonaFormValues = {
  nombres: '',
  apellidos: '',
  fotoUrl: '',
  profesion: '',
  especialidad: '',
  aniosExperiencia: '',
  bioCorta: '',
  documentoIdentidad: '',
  consentimientoPublicacion: false,
};

interface PersonaFormProps {
  personaId?: string;
  valoresIniciales?: Partial<PersonaFormValues>;
  /** Si se pasa, en vez de redirigir a /admin/personas se llama con la persona creada. */
  onCreada?: (persona: { id: string; nombres: string; apellidos: string }) => void;
}

export function PersonaForm({ personaId, valoresIniciales, onCreada }: PersonaFormProps) {
  const router = useRouter();
  const esEdicion = Boolean(personaId);
  const [valores, setValores] = useState<PersonaFormValues>({ ...VALORES_VACIOS, ...valoresIniciales });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar<K extends keyof PersonaFormValues>(campo: K, valor: PersonaFormValues[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const payload = {
      nombres: valores.nombres,
      apellidos: valores.apellidos,
      fotoUrl: valores.fotoUrl || undefined,
      profesion: valores.profesion || undefined,
      especialidad: valores.especialidad || undefined,
      aniosExperiencia: valores.aniosExperiencia ? Number(valores.aniosExperiencia) : undefined,
      bioCorta: valores.bioCorta || undefined,
      documentoIdentidad: valores.documentoIdentidad || undefined,
      consentimientoPublicacion: valores.consentimientoPublicacion,
    };

    try {
      const res = await fetch(esEdicion ? `/api/admin/personas/${personaId}` : '/api/admin/personas', {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo guardar la persona.');
        return;
      }

      if (onCreada) {
        const data = await res.json();
        onCreada(data.persona);
        return;
      }

      router.push('/admin/personas');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nombres">
          <input
            required
            value={valores.nombres}
            onChange={(e) => actualizar('nombres', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Apellidos">
          <input
            required
            value={valores.apellidos}
            onChange={(e) => actualizar('apellidos', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Profesión">
          <input
            value={valores.profesion}
            onChange={(e) => actualizar('profesion', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Especialidad">
          <input
            value={valores.especialidad}
            onChange={(e) => actualizar('especialidad', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Años de experiencia">
          <input
            type="number"
            min={0}
            value={valores.aniosExperiencia}
            onChange={(e) => actualizar('aniosExperiencia', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Foto (URL)">
          <input
            type="url"
            placeholder="https://…"
            value={valores.fotoUrl}
            onChange={(e) => actualizar('fotoUrl', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Biografía corta" span2>
          <textarea
            rows={2}
            value={valores.bioCorta}
            onChange={(e) => actualizar('bioCorta', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Documento de identidad (privado, uso interno)" span2>
          <input
            value={valores.documentoIdentidad}
            onChange={(e) => actualizar('documentoIdentidad', e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            Nunca se muestra en el portal público — solo uso administrativo.
          </p>
        </Campo>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={valores.consentimientoPublicacion}
          onChange={(e) => actualizar('consentimientoPublicacion', e.target.checked)}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span>
          <strong>Consentimiento de publicación.</strong> Sin marcar esto, la persona aparecerá en el
          organigrama público solo con su cargo — nunca su nombre, foto ni datos personales.
        </span>
      </label>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        {!onCreada && (
          <button
            type="button"
            onClick={() => router.push('/admin/personas')}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear persona'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span2 ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
