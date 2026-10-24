'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from 'lucide-react';

interface HitoVista {
  id: string;
  nombre: string;
  fechaPlanificada: string | null;
  fechaReal: string | null;
  completado: boolean;
}

interface GestionHitosProps {
  obraId: string;
  hitosIniciales: HitoVista[];
  /** Un editor no puede modificar hitos de una obra ya publicada (se muestra el aviso). */
  bloqueado: boolean;
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';
const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeZone: 'UTC' });
const aDia = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const aIso = (dia: string) => (dia ? new Date(`${dia}T12:00:00Z`).toISOString() : null);

const botonIcono =
  'flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40';

export function GestionHitos({ obraId, hitosIniciales, bloqueado }: GestionHitosProps) {
  const router = useRouter();
  const [hitos, setHitos] = useState<HitoVista[]>(hitosIniciales);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [nombre, setNombre] = useState('');
  const [planificada, setPlanificada] = useState('');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editPlanificada, setEditPlanificada] = useState('');
  const [editReal, setEditReal] = useState('');

  async function llamar<T>(url: string, metodo: string, cuerpo?: unknown): Promise<T | null> {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo completar la acción.');
        return null;
      }
      router.refresh();
      return data as T;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const data = await llamar<{ hito: HitoVista }>(`/api/admin/obras/${obraId}/hitos`, 'POST', {
      nombre,
      fechaPlanificada: aIso(planificada),
    });
    if (data) {
      setHitos((prev) => [...prev, data.hito]);
      setNombre('');
      setPlanificada('');
    }
  }

  async function alternarCompletado(h: HitoVista) {
    const data = await llamar<{ hito: HitoVista }>(`/api/admin/hitos/${h.id}`, 'PUT', { completado: !h.completado });
    if (data) setHitos((prev) => prev.map((x) => (x.id === h.id ? data.hito : x)));
  }

  async function mover(h: HitoVista, direccion: 'arriba' | 'abajo') {
    const data = await llamar<{ hitos: HitoVista[] }>(`/api/admin/hitos/${h.id}/mover`, 'POST', { direccion });
    if (data) setHitos(data.hitos);
  }

  async function eliminar(h: HitoVista) {
    if (!window.confirm(`¿Eliminar el hito «${h.nombre}»?`)) return;
    const data = await llamar<{ ok: boolean }>(`/api/admin/hitos/${h.id}`, 'DELETE');
    if (data) setHitos((prev) => prev.filter((x) => x.id !== h.id));
  }

  function empezarEdicion(h: HitoVista) {
    setEditandoId(h.id);
    setEditNombre(h.nombre);
    setEditPlanificada(aDia(h.fechaPlanificada));
    setEditReal(aDia(h.fechaReal));
  }

  async function guardarEdicion(h: HitoVista) {
    const data = await llamar<{ hito: HitoVista }>(`/api/admin/hitos/${h.id}`, 'PUT', {
      nombre: editNombre,
      fechaPlanificada: aIso(editPlanificada),
      // La fecha real solo aplica a un hito completado.
      ...(h.completado ? { fechaReal: aIso(editReal) } : {}),
    });
    if (data) {
      setHitos((prev) => prev.map((x) => (x.id === h.id ? data.hito : x)));
      setEditandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {bloqueado ? (
        <p role="status" className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Esta obra está publicada: los hitos los modifica un aprobador. Aquí solo puedes verlos.
        </p>
      ) : (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Los hitos aparecen en la línea de tiempo pública de la obra, en este orden.
        </p>
      )}

      {!bloqueado && (
        <form onSubmit={agregar} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium">Nuevo hito</span>
            <input
              required
              minLength={3}
              maxLength={150}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Vaciado de la losa"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Fecha planificada</span>
            <input type="date" value={planificada} onChange={(e) => setPlanificada(e.target.value)} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {hitos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta obra todavía no tiene hitos.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {hitos.map((h, i) => (
            <li key={h.id} className="rounded-lg border border-border p-3 text-sm">
              {editandoId === h.id ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="font-medium">Nombre</span>
                    <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} maxLength={150} className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium">Planificada</span>
                    <input type="date" value={editPlanificada} onChange={(e) => setEditPlanificada(e.target.value)} className={inputClass} />
                  </label>
                  {h.completado && (
                    <label className="flex flex-col gap-1.5">
                      <span className="font-medium">Fecha real</span>
                      <input type="date" value={editReal} onChange={(e) => setEditReal(e.target.value)} className={inputClass} />
                    </label>
                  )}
                  <div className="flex gap-1">
                    <button type="button" onClick={() => guardarEdicion(h)} disabled={ocupado} aria-label="Guardar cambios" className={botonIcono}>
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setEditandoId(null)} aria-label="Cancelar edición" className={botonIcono}>
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={h.completado}
                    disabled={bloqueado || ocupado}
                    onChange={() => alternarCompletado(h)}
                    aria-label={`Marcar «${h.nombre}» como ${h.completado ? 'pendiente' : 'completado'}`}
                    className="mt-1 size-4"
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${h.completado ? 'text-muted-foreground line-through' : ''}`}>{h.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.completado && h.fechaReal
                        ? `Completado el ${formatoFecha.format(new Date(h.fechaReal))}`
                        : h.fechaPlanificada
                          ? `Planificado para el ${formatoFecha.format(new Date(h.fechaPlanificada))}`
                          : 'Sin fecha'}
                    </p>
                  </div>
                  {!bloqueado && (
                    <div className="flex shrink-0">
                      <button type="button" onClick={() => mover(h, 'arriba')} disabled={ocupado || i === 0} aria-label="Subir" className={botonIcono}>
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(h, 'abajo')}
                        disabled={ocupado || i === hitos.length - 1}
                        aria-label="Bajar"
                        className={botonIcono}
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => empezarEdicion(h)} aria-label={`Editar «${h.nombre}»`} className={botonIcono}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(h)}
                        disabled={ocupado}
                        aria-label={`Eliminar «${h.nombre}»`}
                        className={`${botonIcono} hover:bg-destructive/10 hover:text-destructive`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
