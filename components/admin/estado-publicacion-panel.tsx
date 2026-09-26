'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type EstadoPublicacion = 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO';
type AccionPublicacion = 'ENVIAR_A_REVISION' | 'APROBAR' | 'RECHAZAR' | 'DESPUBLICAR';

interface EstadoPublicacionPanelProps {
  obraId: string;
  estadoActual: EstadoPublicacion;
}

const ESTADO_LABEL: Record<EstadoPublicacion, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
};

const ESTADO_CLASE: Record<EstadoPublicacion, string> = {
  BORRADOR: 'bg-muted text-muted-foreground',
  EN_REVISION: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  PUBLICADO: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
};

// Qué acciones puede iniciar cada rol, para cada estado — debe reflejar
// exactamente TRANSICIONES en lib/server/services/obras.service.ts. Se
// duplica aquí solo para decidir qué botones mostrar; el servidor es quien
// de verdad valida la transición y el rol antes de aplicar el cambio.
const ACCIONES_POR_ESTADO: Record<EstadoPublicacion, { accion: AccionPublicacion; roles: string[] }[]> = {
  BORRADOR: [{ accion: 'ENVIAR_A_REVISION', roles: ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'] }],
  EN_REVISION: [
    { accion: 'APROBAR', roles: ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR'] },
    { accion: 'RECHAZAR', roles: ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR'] },
  ],
  PUBLICADO: [{ accion: 'DESPUBLICAR', roles: ['SUPER_ADMIN', 'ADMIN_ENTE'] }],
};

const ACCION_LABEL: Record<AccionPublicacion, string> = {
  ENVIAR_A_REVISION: 'Enviar a revisión',
  APROBAR: 'Aprobar y publicar',
  RECHAZAR: 'Rechazar (volver a borrador)',
  DESPUBLICAR: 'Despublicar (volver a borrador)',
};

const ACCION_ESTILO: Record<AccionPublicacion, string> = {
  ENVIAR_A_REVISION: 'bg-primary text-primary-foreground hover:bg-primary/90',
  APROBAR: 'bg-emerald-600 text-white hover:bg-emerald-700',
  RECHAZAR: 'border border-destructive text-destructive hover:bg-destructive/10',
  DESPUBLICAR: 'border border-destructive text-destructive hover:bg-destructive/10',
};

// Panel de aprobación (PLAN_PROYECTO.md sección 3.2: "Ningún cambio llega al
// portal público sin aprobación"). A propósito vive separado del formulario
// general de la obra: cada botón dispara su propia petición a
// /api/obras/[id]/estado-publicacion en vez de depender de "Guardar
// cambios", para que cambiar el estado de publicación quede como una acción
// explícita y auditable, no un campo más de un formulario largo.
export function EstadoPublicacionPanel({ obraId, estadoActual }: EstadoPublicacionPanelProps) {
  const router = useRouter();
  const [rol, setRol] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<AccionPublicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [mostrarComentario, setMostrarComentario] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { usuario: { rol: string } } | null) => {
        if (!cancelado && data) setRol(data.usuario.rol);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  async function ejecutar(accion: AccionPublicacion, comentario?: string) {
    setError(null);
    setEnviando(accion);
    try {
      const res = await fetch(`/api/obras/${obraId}/estado-publicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, comentario: comentario || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo cambiar el estado de publicación.');
        return;
      }
      setMostrarComentario(false);
      setComentarioRechazo('');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  const accionesDisponibles = rol
    ? ACCIONES_POR_ESTADO[estadoActual].filter((a) => a.roles.includes(rol))
    : [];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Estado de publicación:</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CLASE[estadoActual]}`}>
          {ESTADO_LABEL[estadoActual]}
        </span>
      </div>

      {rol && accionesDisponibles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Tu rol no tiene acciones disponibles para este estado.
        </p>
      )}

      {accionesDisponibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {accionesDisponibles.map(({ accion }) =>
            accion === 'RECHAZAR' ? (
              <button
                key={accion}
                type="button"
                disabled={enviando !== null}
                onClick={() => setMostrarComentario((v) => !v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${ACCION_ESTILO[accion]}`}
              >
                {ACCION_LABEL[accion]}
              </button>
            ) : (
              <button
                key={accion}
                type="button"
                disabled={enviando !== null}
                onClick={() => ejecutar(accion)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${ACCION_ESTILO[accion]}`}
              >
                {enviando === accion ? 'Procesando…' : ACCION_LABEL[accion]}
              </button>
            )
          )}
        </div>
      )}

      {mostrarComentario && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <textarea
            value={comentarioRechazo}
            onChange={(e) => setComentarioRechazo(e.target.value)}
            placeholder="Motivo del rechazo (opcional, queda en la bitácora)"
            rows={2}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
          <button
            type="button"
            disabled={enviando !== null}
            onClick={() => ejecutar('RECHAZAR', comentarioRechazo)}
            className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            Confirmar rechazo
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
