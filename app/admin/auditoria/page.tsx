'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

interface EntradaAuditoria {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAntes: Record<string, unknown> | null;
  datosDespues: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  usuario: { id: string; nombre: string; email: string } | null;
}

interface RespuestaAuditoria {
  entradas: EntradaAuditoria[];
  total: number;
  pagina: number;
  totalPaginas: number;
  valoresDisponibles: { entidades: string[]; acciones: string[] };
}

const ACCION_LABEL: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  ENVIAR_A_REVISION: 'Enviado a revisión',
  APROBAR: 'Aprobación',
  RECHAZAR: 'Rechazo',
  DESPUBLICAR: 'Despublicación',
  // Usadas por reportes.service.ts al moderar un reporte ciudadano.
  APPROVE: 'Reporte aprobado',
  REJECT: 'Reporte rechazado',
};

const ACCION_CLASE: Record<string, string> = {
  LOGIN: 'bg-muted text-muted-foreground',
  CREATE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  UPDATE: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  DELETE: 'bg-destructive/10 text-destructive',
  ENVIAR_A_REVISION: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  APROBAR: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  RECHAZAR: 'bg-destructive/10 text-destructive',
  DESPUBLICAR: 'bg-destructive/10 text-destructive',
  APPROVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  REJECT: 'bg-destructive/10 text-destructive',
};

const ENTIDAD_LABEL: Record<string, string> = {
  Obra: 'Obra',
  Persona: 'Persona',
  ObraPersonal: 'Asignación de personal',
  Avance: 'Avance',
  Multimedia: 'Multimedia',
  ReporteCiudadano: 'Reporte ciudadano',
  Usuario: 'Usuario',
};

// Campos que casi nunca importan en un diff visual (timestamps redundantes,
// el propio id). No se ocultan datos sensibles aquí — eso ya se decide en
// cada servicio antes de llamar a registrarAuditoria(); esto es solo ruido.
const CAMPOS_IGNORADOS = new Set(['id', 'updatedAt', 'createdAt']);

function calcularDiff(antes: Record<string, unknown> | null, despues: Record<string, unknown> | null) {
  const claves = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]);
  const filas: { campo: string; antes: unknown; despues: unknown }[] = [];

  for (const campo of claves) {
    if (CAMPOS_IGNORADOS.has(campo)) continue;
    const valorAntes = antes?.[campo];
    const valorDespues = despues?.[campo];
    if (JSON.stringify(valorAntes) === JSON.stringify(valorDespues)) continue;
    filas.push({ campo, antes: valorAntes, despues: valorDespues });
  }

  return filas;
}

function formatearValor(valor: unknown): string {
  if (valor === undefined || valor === null) return '—';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

const filtrosVacios = { entidad: '', accion: '', entidadId: '', desde: '', hasta: '' };

export default function AdminAuditoriaPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<RespuestaAuditoria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [pagina, setPagina] = useState(1);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const params = new URLSearchParams({ pagina: String(pagina) });
        if (filtros.entidad) params.set('entidad', filtros.entidad);
        if (filtros.accion) params.set('accion', filtros.accion);
        if (filtros.entidadId) params.set('entidadId', filtros.entidadId.trim());
        if (filtros.desde) params.set('desde', filtros.desde);
        if (filtros.hasta) params.set('hasta', filtros.hasta);

        const res = await fetch(`/api/admin/auditoria?${params}`);
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (res.status === 403) {
          if (!cancelado) setError('Tu rol no tiene acceso a la bitácora de auditoría.');
          return;
        }
        if (!res.ok) throw new Error();
        const data: RespuestaAuditoria = await res.json();
        if (!cancelado) {
          setDatos(data);
          setError(null);
        }
      } catch {
        if (!cancelado) setError('No se pudo cargar la bitácora.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [filtros, pagina, router]);

  function actualizarFiltro<K extends keyof typeof filtrosVacios>(campo: K, valor: string) {
    setPagina(1);
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  return (
    <main className="p-8">
      <AdminNav />

      <h1 className="text-2xl font-semibold">Bitácora de auditoría</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quién cambió qué, cuándo y desde dónde — cada creación, edición, eliminación y cambio de
        estado de publicación queda registrado aquí de forma inmutable.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Entidad</span>
          <select
            value={filtros.entidad}
            onChange={(e) => actualizarFiltro('entidad', e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {datos?.valoresDisponibles.entidades.map((e) => (
              <option key={e} value={e}>
                {ENTIDAD_LABEL[e] ?? e}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Acción</span>
          <select
            value={filtros.accion}
            onChange={(e) => actualizarFiltro('accion', e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {datos?.valoresDisponibles.acciones.map((a) => (
              <option key={a} value={a}>
                {ACCION_LABEL[a] ?? a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Desde</span>
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => actualizarFiltro('desde', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Hasta</span>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => actualizarFiltro('hasta', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">ID de registro</span>
          <input
            type="text"
            placeholder="ej. id de una obra"
            value={filtros.entidadId}
            onChange={(e) => actualizarFiltro('entidadId', e.target.value)}
            className={`${inputClass} w-56`}
          />
        </label>

        {(filtros.entidad || filtros.accion || filtros.entidadId || filtros.desde || filtros.hasta) && (
          <button
            type="button"
            onClick={() => {
              setPagina(1);
              setFiltros(filtrosVacios);
            }}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : !datos || datos.entradas.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No hay entradas que coincidan con estos filtros.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Usuario</th>
                  <th className="px-4 py-2">Acción</th>
                  <th className="px-4 py-2">Entidad</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {datos.entradas.map((entrada) => {
                  const expandido = expandidoId === entrada.id;
                  const diff = calcularDiff(entrada.datosAntes, entrada.datosDespues);

                  return (
                    <FragmentoFila
                      key={entrada.id}
                      entrada={entrada}
                      diff={diff}
                      expandido={expandido}
                      onToggle={() => setExpandidoId(expandido ? null : entrada.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              {datos.total} entrada{datos.total === 1 ? '' : 's'} · página {datos.pagina} de {datos.totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pagina >= datos.totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function FragmentoFila({
  entrada,
  diff,
  expandido,
  onToggle,
}: {
  entrada: EntradaAuditoria;
  diff: { campo: string; antes: unknown; despues: unknown }[];
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-t border-border">
        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
          {new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(entrada.createdAt)
          )}
        </td>
        <td className="px-4 py-3">
          {entrada.usuario ? (
            <>
              <p className="font-medium">{entrada.usuario.nombre}</p>
              <p className="text-xs text-muted-foreground">{entrada.usuario.email}</p>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Sistema / usuario eliminado</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACCION_CLASE[entrada.accion] ?? 'bg-muted text-muted-foreground'}`}>
            {ACCION_LABEL[entrada.accion] ?? entrada.accion}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium">{ENTIDAD_LABEL[entrada.entidad] ?? entrada.entidad}</p>
          <p className="text-xs text-muted-foreground">{entrada.entidadId}</p>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{entrada.ip ?? '—'}</td>
        <td className="px-4 py-3 text-right">
          {diff.length > 0 && (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {diff.length} cambio{diff.length === 1 ? '' : 's'}
              {expandido ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}
        </td>
      </tr>
      {expandido && (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-4">Campo</th>
                  <th className="py-1 pr-4">Antes</th>
                  <th className="py-1">Después</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((fila) => (
                  <tr key={fila.campo} className="border-t border-border/50">
                    <td className="py-1 pr-4 font-medium">{fila.campo}</td>
                    <td className="py-1 pr-4 text-muted-foreground">{formatearValor(fila.antes)}</td>
                    <td className="py-1">{formatearValor(fila.despues)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';
