'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Check, X, type LucideIcon } from 'lucide-react';

interface CampoConfig {
  key: string;
  label: string;
  tipo: 'text' | 'color' | 'number';
}

interface CatalogoEditorProps {
  recurso: string;
  titulo: string;
  descripcion: string;
  campos: CampoConfig[];
  icono: LucideIcon;
  /** Clases de color para el badge del ícono y el borde superior de la
   * tarjeta — una por catálogo, para separarlos visualmente a simple
   * vista en vez de que todos se vean como una sola lista larga. */
  colorClase: string;
}

type Registro = Record<string, string | number | null> & { id: string };

function valoresVacios(campos: CampoConfig[]): Record<string, string> {
  return Object.fromEntries(campos.map((c) => [c.key, c.tipo === 'number' ? '0' : '']));
}

// Un único componente para los 6 catálogos (tipos de obra, estatus, entes,
// contratistas, fuentes de financiamiento, cargos): todos son la misma
// forma de CRUD sobre una tabla plana, así que en vez de una página por
// catálogo esto solo cambia qué campos mostrar (ver app/admin/catalogos).
export function CatalogoEditor({ recurso, titulo, descripcion, campos, icono: Icono, colorClase }: CatalogoEditorProps) {
  const router = useRouter();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [valoresNuevo, setValoresNuevo] = useState<Record<string, string>>(() => valoresVacios(campos));
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valoresEdicion, setValoresEdicion] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const res = await fetch(`/api/admin/catalogos/${recurso}`);
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (res.status === 403) {
          if (!cancelado) setError('Tu rol no tiene acceso a este catálogo.');
          return;
        }
        if (!res.ok) throw new Error();
        const data: { registros: Registro[] } = await res.json();
        if (!cancelado) {
          setRegistros(data.registros);
          setError(null);
        }
      } catch {
        if (!cancelado) setError('No se pudo cargar el catálogo.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [recurso, router]);

  function aPayload(valores: Record<string, string>) {
    const payload: Record<string, unknown> = {};
    for (const campo of campos) {
      const valor = valores[campo.key];
      payload[campo.key] = campo.tipo === 'number' ? Number(valor || 0) : valor.trim() === '' ? null : valor.trim();
    }
    return payload;
  }

  async function recargar() {
    const res = await fetch(`/api/admin/catalogos/${recurso}`);
    if (res.ok) {
      const data: { registros: Registro[] } = await res.json();
      setRegistros(data.registros);
    }
  }

  async function crear() {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalogos/${recurso}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aPayload(valoresNuevo)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo crear el registro.');
        return;
      }
      setValoresNuevo(valoresVacios(campos));
      setCreando(false);
      await recargar();
    } finally {
      setGuardando(false);
    }
  }

  function iniciarEdicion(registro: Registro) {
    setError(null);
    setEditandoId(registro.id);
    setValoresEdicion(Object.fromEntries(campos.map((c) => [c.key, String(registro[c.key] ?? '')])));
  }

  async function guardarEdicion(id: string) {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalogos/${recurso}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aPayload(valoresEdicion)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo guardar el cambio.');
        return;
      }
      setEditandoId(null);
      await recargar();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(registro: Registro) {
    const etiqueta = String(registro[campos[0].key] ?? 'este registro');
    if (!window.confirm(`¿Eliminar "${etiqueta}"?`)) return;

    const res = await fetch(`/api/admin/catalogos/${recurso}/${registro.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo eliminar el registro.');
      return;
    }
    setRegistros((prev) => prev.filter((r) => r.id !== registro.id));
    if (editandoId === registro.id) setEditandoId(null);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${colorClase}`}>
            <Icono className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">{titulo}</h2>
            <p className="text-xs text-muted-foreground">{descripcion}</p>
          </div>
        </div>
        {!creando && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" /> Nuevo
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="rounded-md bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {campos.map((c) => (
                  <th key={c.key} className="px-2 py-2">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {creando && (
                <tr className="border-t border-border bg-muted/30">
                  {campos.map((c) => (
                    <td key={c.key} className="px-2 py-1.5">
                      <input
                        type={c.tipo === 'color' ? 'color' : c.tipo === 'number' ? 'number' : 'text'}
                        value={valoresNuevo[c.key]}
                        onChange={(e) => setValoresNuevo((v) => ({ ...v, [c.key]: e.target.value }))}
                        className={campoClase}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={guardando}
                        onClick={crear}
                        className="text-primary hover:text-primary/80 disabled:opacity-50"
                        aria-label="Guardar nuevo registro"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreando(false);
                          setValoresNuevo(valoresVacios(campos));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Cancelar"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {registros.map((registro) => {
                const editando = editandoId === registro.id;
                return (
                  <tr key={registro.id} className="border-t border-border">
                    {campos.map((c) => (
                      <td key={c.key} className="px-2 py-1.5">
                        {editando ? (
                          <input
                            type={c.tipo === 'color' ? 'color' : c.tipo === 'number' ? 'number' : 'text'}
                            value={valoresEdicion[c.key] ?? ''}
                            onChange={(e) => setValoresEdicion((v) => ({ ...v, [c.key]: e.target.value }))}
                            className={campoClase}
                          />
                        ) : c.tipo === 'color' && registro[c.key] ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block size-3.5 rounded-full border border-border"
                              style={{ backgroundColor: String(registro[c.key]) }}
                            />
                            {registro[c.key]}
                          </span>
                        ) : (
                          String(registro[c.key] ?? '—')
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-2">
                        {editando ? (
                          <>
                            <button
                              type="button"
                              disabled={guardando}
                              onClick={() => guardarEdicion(registro.id)}
                              className="text-primary hover:text-primary/80 disabled:opacity-50"
                              aria-label="Guardar cambios"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoId(null)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Cancelar edición"
                            >
                              <X className="size-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(registro)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Editar ${registro[campos[0].key]}`}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(registro)}
                              className="text-destructive hover:text-destructive/80"
                              aria-label={`Eliminar ${registro[campos[0].key]}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {registros.length === 0 && !creando && (
                <tr>
                  <td colSpan={campos.length + 1} className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Sin registros todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const campoClase =
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/50';
