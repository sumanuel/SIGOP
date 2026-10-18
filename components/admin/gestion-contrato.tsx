'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2, FileText } from 'lucide-react';
import { MODALIDADES, MODALIDAD_LEGIBLE, variacionPorcentual, type ModalidadClave } from '@/lib/contratacion';
import { formatearMoneda } from '@/lib/format';

interface Adenda {
  id: string;
  numero: number;
  motivo: string;
  montoAnterior: number;
  montoNuevo: number;
  diasAdicionales: number;
  fecha: string;
}

interface ContratoVista {
  id: string;
  numeroContrato: string;
  modalidad: ModalidadClave;
  moneda: string;
  montoOriginal: number;
  montoActual: number;
  fechaFirma: string;
  plazoEjecucionDias: number;
  fechaLimite: string;
  contratista: string;
  adendas: Adenda[];
}

interface GestionContratoProps {
  obraId: string;
  monedaObra: string;
  contratistaObraId: string | null;
  contratistas: { id: string; razonSocial: string }[];
  contrato: ContratoVista | null;
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';
const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

export function GestionContrato({ obraId, monedaObra, contratistaObraId, contratistas, contrato }: GestionContratoProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // formulario de contrato nuevo
  const [contratistaId, setContratistaId] = useState(contratistaObraId ?? '');
  const [numero, setNumero] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadClave>('LICITACION_GENERAL');
  const [moneda, setMoneda] = useState(monedaObra);
  const [monto, setMonto] = useState('');
  const [fechaFirma, setFechaFirma] = useState('');
  const [plazo, setPlazo] = useState('');
  const [documento, setDocumento] = useState('');

  // formulario de adenda
  const [motivo, setMotivo] = useState('');
  const [montoNuevo, setMontoNuevo] = useState('');
  const [dias, setDias] = useState('');

  async function enviar(url: string, cuerpo: unknown) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo guardar.');
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

  function crear(e: FormEvent) {
    e.preventDefault();
    void enviar(`/api/admin/obras/${obraId}/contrato`, {
      contratistaId,
      numeroContrato: numero,
      modalidad,
      moneda,
      montoOriginal: Number(monto),
      fechaFirma: new Date(fechaFirma).toISOString(),
      plazoEjecucionDias: Number(plazo),
      documentoUrl: documento.trim() || undefined,
    });
  }

  async function agregarAdenda(e: FormEvent) {
    e.preventDefault();
    if (!contrato) return;
    const ok = await enviar(`/api/admin/contratos/${contrato.id}/adendas`, {
      motivo,
      montoNuevo: Number(montoNuevo),
      diasAdicionales: dias ? Number(dias) : undefined,
    });
    if (ok) {
      setMotivo('');
      setMontoNuevo('');
      setDias('');
    }
  }

  if (!contrato) {
    return (
      <form onSubmit={crear} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FilePlus2 className="size-4" aria-hidden="true" />
          Registrar el contrato de esta obra
        </h2>
        <p className="text-sm text-muted-foreground">
          El contrato original no se sobrescribe después: los cambios de monto o plazo se registran como adendas.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Contratista</span>
            <select required value={contratistaId} onChange={(e) => setContratistaId(e.target.value)} className={inputClass}>
              <option value="">Selecciona…</option>
              {contratistas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Número de contrato</span>
            <input required value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={60} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Modalidad de contratación</span>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadClave)} className={inputClass}>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {MODALIDAD_LEGIBLE[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Monto original</span>
            <input required type="number" min={0.01} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Moneda</span>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputClass}>
              <option value="VES">Bolívares (VES)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Fecha de firma</span>
            <input required type="date" value={fechaFirma} onChange={(e) => setFechaFirma(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Plazo de ejecución (días)</span>
            <input required type="number" min={1} step={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Enlace al documento del contrato (opcional)</span>
            <input type="url" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="https://…" className={inputClass} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={ocupado}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {ocupado ? 'Guardando…' : 'Registrar contrato'}
        </button>
      </form>
    );
  }

  const variacion = variacionPorcentual(contrato.montoOriginal, contrato.montoActual);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4" aria-hidden="true" />
          Contrato {contrato.numeroContrato}
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Contratista" valor={contrato.contratista} />
          <Dato etiqueta="Modalidad" valor={MODALIDAD_LEGIBLE[contrato.modalidad]} />
          <Dato etiqueta="Monto original" valor={formatearMoneda(contrato.montoOriginal, contrato.moneda)} />
          <Dato
            etiqueta="Monto actual"
            valor={`${formatearMoneda(contrato.montoActual, contrato.moneda)}${variacion !== 0 ? ` (${variacion > 0 ? '+' : ''}${variacion}%)` : ''}`}
          />
          <Dato etiqueta="Firmado" valor={formatoFecha.format(new Date(contrato.fechaFirma))} />
          <Dato etiqueta="Plazo" valor={`${contrato.plazoEjecucionDias} días · vence el ${formatoFecha.format(new Date(contrato.fechaLimite))}`} />
        </dl>
      </section>

      <form onSubmit={agregarAdenda} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Registrar una adenda</h2>
        <p className="text-sm text-muted-foreground">
          Una adenda cambia el monto del contrato y/o amplía su plazo. Queda el historial completo; no se puede borrar.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Motivo</span>
          <textarea required minLength={5} maxLength={500} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nuevo monto del contrato ({contrato.moneda})</span>
            <input required type="number" min={0.01} step="0.01" value={montoNuevo} onChange={(e) => setMontoNuevo(e.target.value)} placeholder={String(contrato.montoActual)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Días adicionales de plazo</span>
            <input type="number" min={0} step={1} value={dias} onChange={(e) => setDias(e.target.value)} placeholder="0" className={inputClass} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={ocupado}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {ocupado ? 'Guardando…' : 'Registrar adenda'}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Adendas ({contrato.adendas.length})</h2>
        {contrato.adendas.length === 0 ? (
          <p className="text-sm text-muted-foreground">El contrato no ha tenido modificaciones.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contrato.adendas.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">Adenda n.º {a.numero}</p>
                <p className="text-muted-foreground">
                  {formatearMoneda(a.montoAnterior, contrato.moneda)} → {formatearMoneda(a.montoNuevo, contrato.moneda)}
                  {a.diasAdicionales > 0 && ` · +${a.diasAdicionales} días`} · {formatoFecha.format(new Date(a.fecha))}
                </p>
                <p className="mt-1">{a.motivo}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
