'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, Pencil, Trash2, UserPlus } from 'lucide-react';
import { PersonaForm } from '@/components/admin/persona-form';

interface Cargo {
  id: string;
  nombre: string;
  nivelJerarquico: number;
}

interface PersonaResumen {
  id: string;
  nombres: string;
  apellidos: string;
  profesion: string | null;
  consentimientoPublicacion: boolean;
}

interface Asignacion {
  id: string;
  area: string | null;
  supervisorId: string | null;
  fechaIngreso: string | null;
  visiblePublico: boolean;
  persona: PersonaResumen;
  cargo: Cargo;
}

interface GestionPersonalProps {
  obraId: string;
  cargos: Cargo[];
  personasIniciales: PersonaResumen[];
  asignacionesIniciales: Asignacion[];
}

interface FormularioValues {
  personaId: string;
  cargoId: string;
  area: string;
  supervisorId: string;
  fechaIngreso: string;
}

const FORMULARIO_VACIO: FormularioValues = {
  personaId: '',
  cargoId: '',
  area: '',
  supervisorId: '',
  fechaIngreso: '',
};

export function GestionPersonal({
  obraId,
  cargos,
  personasIniciales,
  asignacionesIniciales,
}: GestionPersonalProps) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>(asignacionesIniciales);
  const [personas, setPersonas] = useState<PersonaResumen[]>(personasIniciales);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creandoPersona, setCreandoPersona] = useState(false);
  const [valores, setValores] = useState<FormularioValues>(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const niveles = useMemo(() => {
    const grupos = new Map<number, Asignacion[]>();
    for (const a of asignaciones) {
      const lista = grupos.get(a.cargo.nivelJerarquico) ?? [];
      lista.push(a);
      grupos.set(a.cargo.nivelJerarquico, lista);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a - b);
  }, [asignaciones]);

  function actualizar<K extends keyof FormularioValues>(campo: K, valor: FormularioValues[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarEdicion(a: Asignacion) {
    setEditandoId(a.id);
    setValores({
      personaId: a.persona.id,
      cargoId: a.cargo.id,
      area: a.area ?? '',
      supervisorId: a.supervisorId ?? '',
      fechaIngreso: a.fechaIngreso ? a.fechaIngreso.slice(0, 10) : '',
    });
  }

  function cancelar() {
    setEditandoId(null);
    setCreandoPersona(false);
    setValores(FORMULARIO_VACIO);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const payload = {
      personaId: valores.personaId,
      cargoId: valores.cargoId,
      area: valores.area || undefined,
      supervisorId: valores.supervisorId || undefined,
      fechaIngreso: valores.fechaIngreso ? new Date(valores.fechaIngreso).toISOString() : undefined,
    };

    try {
      const url = editandoId ? `/api/admin/asignaciones/${editandoId}` : `/api/admin/obras/${obraId}/personal`;
      const res = await fetch(url, {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo guardar la asignación.');
        return;
      }

      const data: { asignacion: Asignacion } = await res.json();

      setAsignaciones((prev) =>
        editandoId ? prev.map((a) => (a.id === editandoId ? data.asignacion : a)) : [...prev, data.asignacion]
      );
      cancelar();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function quitar(a: Asignacion) {
    if (!window.confirm(`¿Quitar a ${a.persona.nombres} ${a.persona.apellidos} de esta obra?`)) return;

    const res = await fetch(`/api/admin/asignaciones/${a.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo quitar a la persona.');
      return;
    }
    setAsignaciones((prev) => prev.filter((x) => x.id !== a.id));
  }

  // Un supervisor debe ser alguien ya asignado a esta obra, distinto de la
  // asignación que se está editando (para no crear un ciclo trivial).
  const opcionesSupervisor = asignaciones.filter((a) => a.id !== editandoId);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6">
        {asignaciones.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay personal asignado a esta obra.</p>
        )}

        {niveles.map(([nivel, lista]) => (
          <div key={nivel} className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nivel {nivel}
            </p>
            <div className="flex flex-wrap gap-3">
              {lista.map((a) => (
                <div key={a.id} className="flex w-56 flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {a.persona.nombres} {a.persona.apellidos}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.cargo.nombre}</p>
                      {a.area && <p className="text-xs text-muted-foreground">Área: {a.area}</p>}
                    </div>
                    {a.persona.consentimientoPublicacion ? (
                      <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-label="Con consentimiento" />
                    ) : (
                      <ShieldOff className="size-4 shrink-0 text-muted-foreground" aria-label="Sin consentimiento" />
                    )}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(a)}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Pencil className="size-3" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => quitar(a)}
                      className="inline-flex items-center gap-1 text-destructive hover:underline"
                    >
                      <Trash2 className="size-3" /> Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" />
          {editandoId ? 'Editar asignación' : 'Agregar persona a la obra'}
        </h2>

        {creandoPersona ? (
          // Deliberadamente FUERA del <form> de la asignación: PersonaForm
          // trae su propio <form>, y HTML no permite formularios anidados
          // (el navegador reestructura el DOM y el submit deja de llegar al
          // componente correcto). Se muestra en su lugar, no adentro.
          <div className="rounded-md border border-border p-3">
            <p className="mb-3 text-sm font-medium">Nueva persona</p>
            <PersonaForm
              onCreada={(persona) => {
                setPersonas((prev) => [
                  ...prev,
                  { ...persona, profesion: null, consentimientoPublicacion: false },
                ]);
                setValores((prev) => ({ ...prev, personaId: persona.id }));
                setCreandoPersona(false);
              }}
            />
            <button
              type="button"
              onClick={() => setCreandoPersona(false)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar y volver a la lista
            </button>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Persona</span>
              <div className="flex gap-2">
                <select
                  required
                  value={valores.personaId}
                  onChange={(e) => actualizar('personaId', e.target.value)}
                  disabled={Boolean(editandoId)}
                  className={inputClass}
                >
                  <option value="">Selecciona…</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombres} {p.apellidos}
                      {p.profesion ? ` — ${p.profesion}` : ''}
                    </option>
                  ))}
                </select>
                {!editandoId && (
                  <button
                    type="button"
                    onClick={() => setCreandoPersona(true)}
                    className="shrink-0 rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
                  >
                    + Nueva
                  </button>
                )}
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Cargo</span>
              <select
                required
                value={valores.cargoId}
                onChange={(e) => actualizar('cargoId', e.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona…</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (nivel {c.nivelJerarquico})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Área (opcional)</span>
              <input
                value={valores.area}
                onChange={(e) => actualizar('area', e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Supervisor (opcional)</span>
              <select
                value={valores.supervisorId}
                onChange={(e) => actualizar('supervisorId', e.target.value)}
                className={inputClass}
              >
                <option value="">Sin supervisor directo</option>
                {opcionesSupervisor.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.persona.nombres} {a.persona.apellidos} — {a.cargo.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Fecha de ingreso (opcional)</span>
              <input
                type="date"
                value={valores.fechaIngreso}
                onChange={(e) => actualizar('fechaIngreso', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            {editandoId && (
              <button
                type="button"
                onClick={cancelar}
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
              {enviando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
        )}
      </section>
    </div>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50';
