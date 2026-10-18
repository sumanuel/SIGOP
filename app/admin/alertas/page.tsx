'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertOctagon, AlertTriangle, BellRing, CheckCheck, Info, RefreshCw } from 'lucide-react';
import { AdminNav, EVENTO_ALERTAS } from '@/components/admin/admin-nav';

type Tipo = 'SIN_ACTUALIZACION' | 'DESFASE_FINANCIERO' | 'VENCIMIENTO_PROXIMO' | 'OBRA_VENCIDA' | 'PARALIZADA_PROLONGADA';

interface AlertaFila {
  id: string;
  tipo: Tipo;
  severidad: number;
  mensaje: string;
  resuelta: boolean;
  resueltaPor: string | null;
  resueltaEn: string | null;
  createdAt: string;
  obra: { id: string; nombre: string; codigo: string; slug: string };
}

interface Respuesta {
  alertas: AlertaFila[];
  resumen: { total: number; criticas: number };
  ultimaEvaluacion: { evaluadas: number; creadas: number; autoResueltas: number; ejecutadaEn: string } | null;
}

const TIPO_LEGIBLE: Record<Tipo, string> = {
  SIN_ACTUALIZACION: 'Sin actualización',
  DESFASE_FINANCIERO: 'Desfase financiero',
  VENCIMIENTO_PROXIMO: 'Vencimiento próximo',
  OBRA_VENCIDA: 'Obra vencida',
  PARALIZADA_PROLONGADA: 'Paralizada por mucho tiempo',
};

const SEVERIDAD: Record<number, { etiqueta: string; clase: string; Icono: typeof Info }> = {
  1: { etiqueta: 'Informativa', clase: 'bg-muted text-muted-foreground', Icono: Info },
  2: { etiqueta: 'Advertencia', clase: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100', Icono: AlertTriangle },
  3: { etiqueta: 'Crítica', clase: 'bg-destructive/10 text-destructive', Icono: AlertOctagon },
};

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' });

export default function AlertasPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<'activas' | 'resueltas'>('activas');
  const [tipo, setTipo] = useState('');
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const params = new URLSearchParams({ estado });
    if (tipo) params.set('tipo', tipo);
    try {
      const res = await fetch(`/api/admin/alertas?${params}`);
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!res.ok) throw new Error();
      setDatos(await res.json());
      setError(null);
    } catch {
      setError('No se pudieron cargar las alertas.');
    } finally {
      setCargando(false);
    }
  }, [estado, tipo, router]);

  useEffect(() => {
    // Carga inicial y al cambiar de filtro: la respuesta llega después, no en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  async function evaluarAhora() {
    setEvaluando(true);
    setMensaje(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/alertas/evaluar', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo evaluar.');
        return;
      }
      const r = data.resultado;
      setMensaje(`Se evaluaron ${r.evaluadas} obras: ${r.creadas} alertas nuevas y ${r.autoResueltas} resueltas solas.`);
      await cargar();
      window.dispatchEvent(new Event(EVENTO_ALERTAS));
    } catch {
      setError('Error de conexión.');
    } finally {
      setEvaluando(false);
    }
  }

  async function resolver(alerta: AlertaFila) {
    const res = await fetch(`/api/admin/alertas/${alerta.id}/resolver`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo resolver la alerta.');
      return;
    }
    await cargar();
    window.dispatchEvent(new Event(EVENTO_ALERTAS));
  }

  return (
    <main className="p-8">
      <AdminNav />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BellRing className="size-6" aria-hidden="true" />
            Alertas de gestión
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            El sistema revisa las obras publicadas una vez al día y avisa de lo que necesita atención. Las alertas se
            cierran solas cuando el problema desaparece; si resuelves una a mano, no vuelve a aparecer durante 7 días.
          </p>
        </div>
        <button
          type="button"
          onClick={evaluarAhora}
          disabled={evaluando}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${evaluando ? 'animate-spin' : ''}`} aria-hidden="true" />
          {evaluando ? 'Evaluando…' : 'Evaluar ahora'}
        </button>
      </div>

      {datos?.ultimaEvaluacion && (
        <p className="mt-2 text-xs text-muted-foreground">
          Última evaluación desde este servidor: {formatoFecha.format(new Date(datos.ultimaEvaluacion.ejecutadaEn))}
        </p>
      )}
      {mensaje && <p role="status" className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{mensaje}</p>}
      {error && <p role="alert" className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex overflow-hidden rounded-md border border-border" role="group" aria-label="Estado">
          {(['activas', 'resueltas'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEstado(e)}
              aria-pressed={estado === e}
              className={`px-3 py-1.5 ${estado === e ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {e === 'activas' ? `Activas${datos ? ` (${datos.resumen.total})` : ''}` : 'Resueltas'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5"
          >
            <option value="">Todos</option>
            {(Object.keys(TIPO_LEGIBLE) as Tipo[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LEGIBLE[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : datos && datos.alertas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {estado === 'activas' ? 'No hay alertas activas. Todo en orden.' : 'No hay alertas resueltas con ese filtro.'}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {datos?.alertas.map((alerta) => {
            const sev = SEVERIDAD[alerta.severidad] ?? SEVERIDAD[1];
            return (
              <li key={alerta.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.clase}`}>
                      <sev.Icono className="size-3" aria-hidden="true" />
                      {sev.etiqueta}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{TIPO_LEGIBLE[alerta.tipo]}</span>
                  </div>
                  <p className="text-sm">{alerta.mensaje}</p>
                  <p className="text-xs text-muted-foreground">
                    <Link href={`/admin/obras/${alerta.obra.id}/editar`} className="font-medium text-primary hover:underline">
                      {alerta.obra.nombre}
                    </Link>{' '}
                    · {alerta.obra.codigo} · desde {formatoFecha.format(new Date(alerta.createdAt))}
                    {alerta.resuelta && alerta.resueltaEn &&
                      ` · resuelta ${formatoFecha.format(new Date(alerta.resueltaEn))} ${alerta.resueltaPor ? 'por un usuario' : 'automáticamente'}`}
                  </p>
                </div>
                {!alerta.resuelta && (
                  <button
                    type="button"
                    onClick={() => resolver(alerta)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <CheckCheck className="size-4" aria-hidden="true" />
                    Marcar como resuelta
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
