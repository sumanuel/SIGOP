'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import UbicacionPickerLoader from '@/components/admin/ubicacion-picker-loader';
import TrazadoPickerLoader from '@/components/admin/trazado-picker-loader';
import { slugify } from '@/lib/slugify';
import type { Catalogos } from '@/lib/server/services/catalogos.service';

interface ObraFormValues {
  codigo: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipoObraId: string;
  estatusId: string;
  enteId: string;
  contratistaId: string;
  fuenteFinanciamientoId: string;
  estadoId: string;
  municipioId: string;
  parroquiaId: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
  tieneTrazado: boolean;
  trazado: [number, number][];
  trazadoTipo: 'LINEA' | 'AREA';
  presupuestoAprobado: number;
  montoEjecutado: number;
  moneda: string;
  fechaAprobacion: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  fechaFinReal: string;
  beneficiarios: string;
  capacidadDescripcion: string;
  destacada: boolean;
}

const VALORES_VACIOS: ObraFormValues = {
  codigo: '',
  slug: '',
  nombre: '',
  descripcion: '',
  tipoObraId: '',
  estatusId: '',
  enteId: '',
  contratistaId: '',
  fuenteFinanciamientoId: '',
  estadoId: '',
  municipioId: '',
  parroquiaId: '',
  direccion: '',
  lat: null,
  lng: null,
  tieneTrazado: false,
  trazado: [],
  trazadoTipo: 'LINEA',
  presupuestoAprobado: 0,
  montoEjecutado: 0,
  moneda: 'VES',
  fechaAprobacion: '',
  fechaInicio: '',
  fechaFinEstimada: '',
  fechaFinReal: '',
  beneficiarios: '',
  capacidadDescripcion: '',
  destacada: false,
};

// Al crear una obra el formulario se recorre por pasos (es largo y asusta);
// al editar se muestra completo para poder saltar directo a lo que se cambia.
const PASOS = ['Datos generales', 'Ubicación', 'Finanzas y fechas', 'Impacto y resumen'];

interface ObraFormProps {
  catalogos: Catalogos;
  obraId?: string;
  valoresIniciales?: Partial<ObraFormValues>;
}

export function ObraForm({ catalogos, obraId, valoresIniciales }: ObraFormProps) {
  const router = useRouter();
  const esEdicion = Boolean(obraId);
  const modoPasos = !esEdicion;
  const [paso, setPaso] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const mostrar = (n: number) => !modoPasos || paso === n;

  const [valores, setValores] = useState<ObraFormValues>({ ...VALORES_VACIOS, ...valoresIniciales });
  const [slugTocado, setSlugTocado] = useState(esEdicion); // en edición no se auto-regenera
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const municipiosFiltrados = useMemo(
    () => catalogos.municipios.filter((m) => m.estadoId === valores.estadoId),
    [catalogos.municipios, valores.estadoId]
  );
  const parroquiasFiltradas = useMemo(
    () => catalogos.parroquias.filter((p) => p.municipioId === valores.municipioId),
    [catalogos.parroquias, valores.municipioId]
  );

  function actualizar<K extends keyof ObraFormValues>(campo: K, valor: ObraFormValues[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  function onNombreChange(nombre: string) {
    setValores((prev) => ({
      ...prev,
      nombre,
      slug: slugTocado ? prev.slug : slugify(nombre),
    }));
  }

  function onEstadoChange(estadoId: string) {
    setValores((prev) => ({ ...prev, estadoId, municipioId: '', parroquiaId: '' }));
  }

  function onMunicipioChange(municipioId: string) {
    setValores((prev) => ({ ...prev, municipioId, parroquiaId: '' }));
  }

  /** Revisa el paso actual: campos obligatorios (validación nativa) y mapa. Devuelve el error, o null. */
  function validarPaso(n: number): string | null {
    const campos = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );
    for (const campo of campos ?? []) {
      if (!campo.checkValidity()) {
        campo.reportValidity();
        return 'Completa los campos obligatorios de este paso.';
      }
    }
    if (n === 2) {
      if (valores.lat === null || valores.lng === null) {
        return 'Selecciona la ubicación de la obra haciendo clic en el mapa.';
      }
      const minimo = valores.trazadoTipo === 'AREA' ? 3 : 2;
      if (valores.tieneTrazado && valores.trazado.length < minimo) {
        return `Dibuja ${valores.trazadoTipo === 'AREA' ? 'el área' : 'el trazado'} en el mapa (al menos ${minimo} puntos) o desmarca la opción de trazado.`;
      }
    }
    return null;
  }

  function irAPaso(n: number) {
    setPaso(n);
    formRef.current?.scrollIntoView({ block: 'start' });
  }

  function avanzar() {
    const problema = validarPaso(paso);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    irAPaso(paso + 1);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Enter en un paso intermedio equivale a "Siguiente", no a guardar.
    if (modoPasos && paso < PASOS.length) {
      avanzar();
      return;
    }

    if (valores.lat === null || valores.lng === null) {
      setError('Selecciona la ubicación de la obra haciendo clic en el mapa.');
      if (modoPasos) setPaso(2);
      return;
    }

    const puntosMinimos = valores.trazadoTipo === 'AREA' ? 3 : 2;
    if (valores.tieneTrazado && valores.trazado.length < puntosMinimos) {
      setError(
        `Dibuja ${valores.trazadoTipo === 'AREA' ? 'el área' : 'el trazado'} en el mapa (al menos ${puntosMinimos} puntos) o desmarca la opción de trazado.`
      );
      if (modoPasos) setPaso(2);
      return;
    }

    setEnviando(true);

    const isoOUndefined = (fecha: string) => (fecha ? new Date(fecha).toISOString() : undefined);

    const payload = {
      codigo: valores.codigo,
      slug: valores.slug,
      nombre: valores.nombre,
      descripcion: valores.descripcion || undefined,
      tipoObraId: valores.tipoObraId,
      estatusId: valores.estatusId,
      enteId: valores.enteId,
      contratistaId: valores.contratistaId || undefined,
      fuenteFinanciamientoId: valores.fuenteFinanciamientoId || undefined,
      estadoId: valores.estadoId,
      municipioId: valores.municipioId,
      parroquiaId: valores.parroquiaId || undefined,
      direccion: valores.direccion || undefined,
      lat: valores.lat,
      lng: valores.lng,
      trazado:
        valores.tieneTrazado && valores.trazado.length >= puntosMinimos ? valores.trazado : esEdicion ? null : undefined,
      trazadoTipo: valores.tieneTrazado ? valores.trazadoTipo : undefined,
      presupuestoAprobado: valores.presupuestoAprobado,
      montoEjecutado: valores.montoEjecutado,
      moneda: valores.moneda,
      fechaAprobacion: isoOUndefined(valores.fechaAprobacion),
      fechaInicio: isoOUndefined(valores.fechaInicio),
      fechaFinEstimada: isoOUndefined(valores.fechaFinEstimada),
      fechaFinReal: isoOUndefined(valores.fechaFinReal),
      beneficiarios: valores.beneficiarios ? Number(valores.beneficiarios) : undefined,
      capacidadDescripcion: valores.capacidadDescripcion || undefined,
      destacada: valores.destacada,
    };

    try {
      const res = await fetch(esEdicion ? `/api/obras/${obraId}` : '/api/obras', {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo guardar la obra.');
        return;
      }

      const guardada: { obra?: { devueltaARevision?: boolean } } | null = await res.json().catch(() => null);
      if (guardada?.obra?.devueltaARevision) {
        window.alert(
          'La obra se guardó, pero como cambiaste datos sensibles de una obra publicada volvió a "En revisión": no se verá en el portal hasta que un aprobador la apruebe de nuevo.'
        );
      }
      router.push('/admin/obras');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-8">
      {modoPasos && (
        <nav aria-label="Pasos para crear la obra">
          <ol className="flex flex-wrap gap-2 text-sm">
            {PASOS.map((nombre, i) => {
              const n = i + 1;
              const actual = n === paso;
              const hecho = n < paso;
              return (
                <li key={nombre} className="flex-1 basis-40">
                  <button
                    type="button"
                    // Volver a un paso ya completado siempre se permite; avanzar solo con "Siguiente".
                    disabled={n > paso}
                    onClick={() => {
                      setError(null);
                      irAPaso(n);
                    }}
                    aria-current={actual ? 'step' : undefined}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                      actual
                        ? 'border-primary bg-primary/10 font-medium'
                        : hecho
                          ? 'border-border hover:bg-muted'
                          : 'border-border text-muted-foreground opacity-60'
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        hecho ? 'bg-success text-background' : actual ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {hecho ? <Check className="size-3.5" aria-hidden="true" /> : n}
                    </span>
                    {nombre}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <Seccion titulo="Datos generales" visible={mostrar(1)}>
        <Campo label="Nombre de la obra" span2>
          <input
            required
            value={valores.nombre}
            onChange={(e) => onNombreChange(e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Código">
          <input
            required
            placeholder="OBR-2026-00006"
            value={valores.codigo}
            onChange={(e) => actualizar('codigo', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Slug (URL)">
          <input
            required
            value={valores.slug}
            onChange={(e) => {
              setSlugTocado(true);
              actualizar('slug', e.target.value);
            }}
            className={inputClass}
          />
        </Campo>
        <Campo label="Descripción" span2>
          <textarea
            rows={3}
            value={valores.descripcion}
            onChange={(e) => actualizar('descripcion', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Tipo de obra">
          <select
            required
            value={valores.tipoObraId}
            onChange={(e) => actualizar('tipoObraId', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {catalogos.tiposObra.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Estatus">
          <select
            required
            value={valores.estatusId}
            onChange={(e) => actualizar('estatusId', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {catalogos.estatusObra.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Ente responsable">
          <select
            required
            value={valores.enteId}
            onChange={(e) => actualizar('enteId', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {catalogos.entes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Contratista (opcional)">
          <select
            value={valores.contratistaId}
            onChange={(e) => actualizar('contratistaId', e.target.value)}
            className={inputClass}
          >
            <option value="">Sin asignar</option>
            {catalogos.contratistas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="">
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valores.destacada}
              onChange={(e) => actualizar('destacada', e.target.checked)}
              className="size-4 rounded border-input"
            />
            Obra destacada (aparece resaltada en el portal)
          </label>
        </Campo>
      </Seccion>

      <Seccion titulo="Ubicación" visible={mostrar(2)}>
        <Campo label="Estado">
          <select
            required
            value={valores.estadoId}
            onChange={(e) => onEstadoChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {catalogos.estados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Municipio">
          <select
            required
            value={valores.municipioId}
            onChange={(e) => onMunicipioChange(e.target.value)}
            disabled={!valores.estadoId}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {municipiosFiltrados.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Parroquia (opcional)">
          <select
            value={valores.parroquiaId}
            onChange={(e) => actualizar('parroquiaId', e.target.value)}
            disabled={!valores.municipioId}
            className={inputClass}
          >
            <option value="">Sin especificar</option>
            {parroquiasFiltradas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Dirección (opcional)" span2>
          <input
            value={valores.direccion}
            onChange={(e) => actualizar('direccion', e.target.value)}
            className={inputClass}
          />
        </Campo>

        <div className="col-span-full flex flex-col gap-2">
          <p className="text-sm font-medium">
            Punto de la obra <span className="text-muted-foreground">(haz clic en el mapa)</span>
          </p>
          <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
            <UbicacionPickerLoader
              lat={valores.lat}
              lng={valores.lng}
              onCambiar={(lat, lng) => setValores((prev) => ({ ...prev, lat, lng }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {valores.lat !== null && valores.lng !== null
              ? `Lat ${valores.lat.toFixed(5)}, Lng ${valores.lng.toFixed(5)}`
              : 'Sin ubicación seleccionada todavía.'}
          </p>
        </div>

        <div className="col-span-full flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={valores.tieneTrazado}
              onChange={(e) => actualizar('tieneTrazado', e.target.checked)}
              className="size-4 rounded border-input"
            />
            ¿Esta obra tiene trazado? (vía, tubería, tendido eléctrico, terreno o urbanismo)
          </label>

          {valores.tieneTrazado && (
            <>
              <fieldset className="flex flex-wrap items-center gap-4 text-sm">
                <legend className="sr-only">Tipo de trazado</legend>
                {(['LINEA', 'AREA'] as const).map((tipo) => (
                  <label key={tipo} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="trazadoTipo"
                      checked={valores.trazadoTipo === tipo}
                      onChange={() => actualizar('trazadoTipo', tipo)}
                      className="size-4"
                    />
                    {tipo === 'LINEA' ? 'Línea (vía, tubería, tendido)' : 'Área (terreno, urbanismo, parque)'}
                  </label>
                ))}
              </fieldset>
              <p className="text-sm text-muted-foreground">
                {valores.trazadoTipo === 'AREA'
                  ? 'Haz clic en el mapa para marcar las esquinas del área, en orden (el contorno se cierra solo).'
                  : 'Haz clic en el mapa para ir agregando puntos del trazado, en orden.'}
              </p>
              <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
                <TrazadoPickerLoader
                  puntos={valores.trazado}
                  centro={valores.lat !== null && valores.lng !== null ? [valores.lng, valores.lat] : null}
                  tipo={valores.trazadoTipo}
                  onCambiar={(trazado) => actualizar('trazado', trazado)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => actualizar('trazado', valores.trazado.slice(0, -1))}
                  disabled={valores.trazado.length === 0}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Deshacer último punto
                </button>
                <button
                  type="button"
                  onClick={() => actualizar('trazado', [])}
                  disabled={valores.trazado.length === 0}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Limpiar trazado
                </button>
                <p className="text-xs text-muted-foreground">{valores.trazado.length} punto(s)</p>
              </div>
            </>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Finanzas" visible={mostrar(3)}>
        <Campo label="Presupuesto aprobado">
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={valores.presupuestoAprobado}
            onChange={(e) => actualizar('presupuestoAprobado', e.target.valueAsNumber || 0)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Monto ejecutado">
          <input
            type="number"
            min={0}
            step="0.01"
            value={valores.montoEjecutado}
            onChange={(e) => actualizar('montoEjecutado', e.target.valueAsNumber || 0)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Moneda">
          <select value={valores.moneda} onChange={(e) => actualizar('moneda', e.target.value)} className={inputClass}>
            <option value="VES">Bolívares (VES)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </Campo>
        <Campo label="Fuente de financiamiento (opcional)">
          <select
            value={valores.fuenteFinanciamientoId}
            onChange={(e) => actualizar('fuenteFinanciamientoId', e.target.value)}
            className={inputClass}
          >
            <option value="">Sin especificar</option>
            {catalogos.fuentesFinanciamiento.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </Seccion>

      <Seccion titulo="Fechas" visible={mostrar(3)}>
        <Campo label="Aprobación">
          <input
            type="date"
            value={valores.fechaAprobacion}
            onChange={(e) => actualizar('fechaAprobacion', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Inicio">
          <input
            type="date"
            value={valores.fechaInicio}
            onChange={(e) => actualizar('fechaInicio', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Fin estimado">
          <input
            type="date"
            value={valores.fechaFinEstimada}
            onChange={(e) => actualizar('fechaFinEstimada', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Fin real (si ya culminó)">
          <input
            type="date"
            value={valores.fechaFinReal}
            onChange={(e) => actualizar('fechaFinReal', e.target.value)}
            className={inputClass}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Impacto" visible={mostrar(4)}>
        <Campo label="Beneficiarios estimados (opcional)">
          <input
            type="number"
            min={0}
            value={valores.beneficiarios}
            onChange={(e) => actualizar('beneficiarios', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Capacidad (opcional)" span2>
          <input
            placeholder='Ej.: "120 camas", "800 estudiantes", "14 km"'
            value={valores.capacidadDescripcion}
            onChange={(e) => actualizar('capacidadDescripcion', e.target.value)}
            className={inputClass}
          />
        </Campo>
      </Seccion>

      {modoPasos && paso === PASOS.length && (
        <section aria-label="Resumen de la obra" className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h2 className="mb-2 font-semibold">Revisa antes de crear</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Resumen etiqueta="Obra" valor={`${valores.nombre} (${valores.codigo})`} />
            <Resumen
              etiqueta="Tipo / estatus"
              valor={`${catalogos.tiposObra.find((t) => t.id === valores.tipoObraId)?.nombre ?? '—'} / ${catalogos.estatusObra.find((x) => x.id === valores.estatusId)?.nombre ?? '—'}`}
            />
            <Resumen
              etiqueta="Ubicación"
              valor={`${municipiosFiltrados.find((m) => m.id === valores.municipioId)?.nombre ?? '—'}, ${catalogos.estados.find((x) => x.id === valores.estadoId)?.nombre ?? '—'}`}
            />
            <Resumen
              etiqueta="Trazado"
              valor={
                valores.tieneTrazado
                  ? `${valores.trazadoTipo === 'AREA' ? 'Área' : 'Línea'} de ${valores.trazado.length} puntos`
                  : 'Sin trazado'
              }
            />
            <Resumen
              etiqueta="Presupuesto aprobado"
              valor={`${valores.presupuestoAprobado.toLocaleString('es-VE')} ${valores.moneda}`}
            />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            La obra se crea como borrador; se publica después desde el flujo de aprobación.
          </p>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3">
        <div>
          {modoPasos && paso > 1 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                irAPaso(paso - 1);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Anterior
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/obras')}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          {modoPasos && paso < PASOS.length ? (
            <button
              type="button"
              onClick={avanzar}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear obra'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50';

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{etiqueta}:</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

function Seccion({ titulo, visible = true, children }: { titulo: string; visible?: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span2 ? 'sm:col-span-2' : ''}`}>
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
    </label>
  );
}
