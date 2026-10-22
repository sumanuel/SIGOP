'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { TIPOS_INTERVENCION, TIPO_INTERVENCION_LEGIBLE, type TipoIntervencion } from '@/lib/mantenimiento';
import { formatearMoneda } from '@/lib/format';

interface GarantiaVista {
  fechaInicioGarantia: string;
  fechaFinGarantia: string;
  cubreEstructura: boolean;
  cubreInstalaciones: boolean;
  observaciones: string | null;
}

interface IntervencionVista {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  costo: number | null;
  moneda: string;
  realizadoPor: string | null;
}

interface GestionMantenimientoProps {
  obraId: string;
  monedaObra: string;
  garantia: GarantiaVista | null;
  intervenciones: IntervencionVista[];
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';
const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });
const aDia = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '');
const aIso = (dia: string) => (dia ? new Date(`${dia}T12:00:00Z`).toISOString() : undefined);

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function GestionMantenimiento({ obraId, monedaObra, garantia, intervenciones }: GestionMantenimientoProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [inicio, setInicio] = useState(aDia(garantia?.fechaInicioGarantia));
  const [fin, setFin] = useState(aDia(garantia?.fechaFinGarantia));
  const [estructura, setEstructura] = useState(garantia?.cubreEstructura ?? true);
  const [instalaciones, setInstalaciones] = useState(garantia?.cubreInstalaciones ?? true);
  const [observaciones, setObservaciones] = useState(garantia?.observaciones ?? '');

  const [tipo, setTipo] = useState<TipoIntervencion>('PREVENTIVO');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costo, setCosto] = useState('');
  const [moneda, setMoneda] = useState(monedaObra);
  const [realizadoPor, setRealizadoPor] = useState('');
  const [fotoAntes, setFotoAntes] = useState('');
  const [fotoDespues, setFotoDespues] = useState('');

  async function enviar(url: string, metodo: string, cuerpo?: unknown): Promise<boolean> {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo completar la acción.');
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardarGarantia(e: FormEvent) {
    e.preventDefault();
    const ok = await enviar(`/api/admin/obras/${obraId}/mantenimiento`, 'PUT', {
      fechaInicioGarantia: aIso(inicio),
      fechaFinGarantia: aIso(fin),
      cubreEstructura: estructura,
      cubreInstalaciones: instalaciones,
      observaciones: observaciones || null,
    });
    if (ok) setAviso('Garantía guardada.');
  }

  async function registrarIntervencion(e: FormEvent) {
    e.preventDefault();
    const ok = await enviar(`/api/admin/obras/${obraId}/mantenimiento`, 'POST', {
      tipo,
      fecha: aIso(fecha),
      descripcion,
      costo: costo ? Number(costo) : undefined,
      moneda,
      realizadoPor: realizadoPor || undefined,
      fotoAntesUrl: fotoAntes || undefined,
      fotoDespuesUrl: fotoDespues || undefined,
    });
    if (ok) {
      setDescripcion('');
      setCosto('');
      setFecha('');
      setRealizadoPor('');
      setFotoAntes('');
      setFotoDespues('');
      setAviso('Intervención registrada.');
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar esta intervención? Quedará registrada en la bitácora.')) return;
    await enviar(`/api/admin/intervenciones/${id}`, 'DELETE');
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        Lo que registres aquí se muestra al instante en la ficha pública de la obra.
      </p>

      <form onSubmit={guardarGarantia} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Garantía de la obra</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Inicio de la garantía">
            <input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Fin de la garantía">
            <input type="date" required value={fin} onChange={(e) => setFin(e.target.value)} className={inputClass} />
          </Campo>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={estructura} onChange={(e) => setEstructura(e.target.checked)} />
            Cubre la estructura
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={instalaciones} onChange={(e) => setInstalaciones(e.target.checked)} />
            Cubre las instalaciones
          </label>
        </div>
        <Campo label="Observaciones (opcional)">
          <textarea rows={2} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputClass} />
        </Campo>
        <button
          type="submit"
          disabled={ocupado}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {garantia ? 'Actualizar garantía' : 'Registrar garantía'}
        </button>
      </form>

      {garantia && (
        <form onSubmit={registrarIntervencion} className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Registrar intervención de mantenimiento</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Tipo">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoIntervencion)} className={inputClass}>
                {TIPOS_INTERVENCION.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_INTERVENCION_LEGIBLE[t]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fecha (vacío = hoy)">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </Campo>
          </div>
          <Campo label="Trabajo realizado">
            <textarea required minLength={10} maxLength={1000} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Costo (opcional)">
              <input type="number" min={0} step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} className={inputClass} />
            </Campo>
            <Campo label="Moneda">
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputClass}>
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </Campo>
            <Campo label="Empresa o dependencia">
              <input type="text" maxLength={150} value={realizadoPor} onChange={(e) => setRealizadoPor(e.target.value)} className={inputClass} />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Enlace a la foto antes (opcional)">
              <input type="url" value={fotoAntes} onChange={(e) => setFotoAntes(e.target.value)} placeholder="https://…" className={inputClass} />
            </Campo>
            <Campo label="Enlace a la foto después (opcional)">
              <input type="url" value={fotoDespues} onChange={(e) => setFotoDespues(e.target.value)} placeholder="https://…" className={inputClass} />
            </Campo>
          </div>
          <button
            type="submit"
            disabled={ocupado}
            className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Registrar intervención
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {aviso}
        </p>
      )}

      {garantia && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Historial de intervenciones</h2>
          {intervenciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se ha registrado ninguna.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {intervenciones.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {TIPO_INTERVENCION_LEGIBLE[i.tipo as TipoIntervencion] ?? i.tipo} · {formatoFecha.format(new Date(i.fecha))}
                      {i.costo !== null && ` · ${formatearMoneda(i.costo, i.moneda)}`}
                    </p>
                    <p className="mt-1 text-muted-foreground">{i.descripcion}</p>
                    {i.realizadoPor && <p className="mt-1 text-xs text-muted-foreground">Realizado por {i.realizadoPor}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminar(i.id)}
                    disabled={ocupado}
                    aria-label="Eliminar intervención"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
