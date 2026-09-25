'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import UbicacionPickerLoader from '@/components/admin/ubicacion-picker-loader';
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
  estadoPublicacion: 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO';
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
  estadoPublicacion: 'BORRADOR',
};

interface ObraFormProps {
  catalogos: Catalogos;
  obraId?: string;
  valoresIniciales?: Partial<ObraFormValues>;
}

export function ObraForm({ catalogos, obraId, valoresIniciales }: ObraFormProps) {
  const router = useRouter();
  const esEdicion = Boolean(obraId);

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (valores.lat === null || valores.lng === null) {
      setError('Selecciona la ubicación de la obra haciendo clic en el mapa.');
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
      ...(esEdicion ? { estadoPublicacion: valores.estadoPublicacion } : {}),
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

      router.push('/admin/obras');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <Seccion titulo="Datos generales">
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

        {esEdicion && (
          <Campo label="Estado de publicación">
            <select
              value={valores.estadoPublicacion}
              onChange={(e) =>
                actualizar('estadoPublicacion', e.target.value as ObraFormValues['estadoPublicacion'])
              }
              className={inputClass}
            >
              <option value="BORRADOR">Borrador</option>
              <option value="EN_REVISION">En revisión</option>
              <option value="PUBLICADO">Publicado</option>
            </select>
          </Campo>
        )}

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

      <Seccion titulo="Ubicación">
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
      </Seccion>

      <Seccion titulo="Finanzas">
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

      <Seccion titulo="Fechas">
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

      <Seccion titulo="Impacto">
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

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/obras')}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear obra'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
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
