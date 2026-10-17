'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { MOTIVOS_PARALIZACION, MOTIVO_LEGIBLE, diasEntre, duracionLegible, type MotivoParalizacionClave } from '@/lib/paralizacion';

interface Periodo {
  id: string;
  motivo: MotivoParalizacionClave;
  descripcion: string | null;
  fechaInicio: string;
  fechaReactivacion: string | null;
}

interface GestionParalizacionesProps {
  obraId: string;
  periodosIniciales: Periodo[];
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

export function GestionParalizaciones({ obraId, periodosIniciales }: GestionParalizacionesProps) {
  const router = useRouter();
  const [periodos, setPeriodos] = useState(periodosIniciales);
  const [motivo, setMotivo] = useState<MotivoParalizacionClave>('FALTA_PRESUPUESTO');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaReactivacion, setFechaReactivacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abierto = periodos.find((p) => p.fechaReactivacion === null);

  async function enviar(cuerpo: Record<string, unknown>) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/obras/${obraId}/paralizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo registrar el cambio.');
        return;
      }
      // Se recarga la pantalla del servidor: así el historial y el estatus quedan consistentes.
      setPeriodos((prev) => {
        const nuevo: Periodo = {
          id: data.periodo.id,
          motivo: data.periodo.motivo,
          descripcion: data.periodo.descripcion,
          fechaInicio: data.periodo.fechaInicio,
          fechaReactivacion: data.periodo.fechaReactivacion,
        };
        return cuerpo.accion === 'PARALIZAR' ? [nuevo, ...prev] : prev.map((p) => (p.id === nuevo.id ? nuevo : p));
      });
      setDescripcion('');
      setFechaInicio('');
      setFechaReactivacion('');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  function paralizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void enviar({
      accion: 'PARALIZAR',
      motivo,
      descripcion: descripcion || undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : undefined,
    });
  }

  function reactivar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void enviar({
      accion: 'REACTIVAR',
      fechaReactivacion: fechaReactivacion ? new Date(fechaReactivacion).toISOString() : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {abierto ? (
        <form onSubmit={reactivar} className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PauseCircle className="size-4 text-destructive" aria-hidden="true" />
            La obra está paralizada
          </h2>
          <p className="text-sm text-muted-foreground">
            {MOTIVO_LEGIBLE[abierto.motivo]} · desde el {formatoFecha.format(new Date(abierto.fechaInicio))} (
            {duracionLegible(diasEntre(new Date(abierto.fechaInicio), new Date()))})
            {abierto.descripcion ? ` — ${abierto.descripcion}` : ''}
          </p>
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className="text-sm font-medium">Fecha de reactivación (opcional, por defecto hoy)</span>
            <input
              type="date"
              value={fechaReactivacion}
              onChange={(e) => setFechaReactivacion(e.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <PlayCircle className="size-4" aria-hidden="true" />
            {ocupado ? 'Guardando…' : 'Reactivar la obra'}
          </button>
        </form>
      ) : (
        <form onSubmit={paralizar} className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PauseCircle className="size-4" aria-hidden="true" />
            Registrar una paralización
          </h2>
          <p className="text-sm text-muted-foreground">
            El motivo es obligatorio: queda en el historial público de la obra. El estatus cambia a «Paralizada»
            automáticamente.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Motivo</span>
            <select
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoParalizacionClave)}
              className={inputClass}
            >
              {MOTIVOS_PARALIZACION.map((m) => (
                <option key={m} value={m}>
                  {MOTIVO_LEGIBLE[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Detalle (opcional)</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000}
              rows={3}
              className={inputClass}
            />
          </label>
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className="text-sm font-medium">Desde (opcional, por defecto hoy)</span>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="w-fit rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            {ocupado ? 'Guardando…' : 'Paralizar la obra'}
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Historial ({periodos.length})</h2>
        {periodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta obra no ha tenido paralizaciones.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {periodos.map((p) => {
              const fin = p.fechaReactivacion ? new Date(p.fechaReactivacion) : new Date();
              return (
                <li key={p.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{MOTIVO_LEGIBLE[p.motivo]}</p>
                  <p className="text-muted-foreground">
                    {formatoFecha.format(new Date(p.fechaInicio))} →{' '}
                    {p.fechaReactivacion ? formatoFecha.format(new Date(p.fechaReactivacion)) : 'sigue paralizada'} ·{' '}
                    {duracionLegible(diasEntre(new Date(p.fechaInicio), fin))}
                  </p>
                  {p.descripcion && <p className="mt-1 text-muted-foreground">{p.descripcion}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
