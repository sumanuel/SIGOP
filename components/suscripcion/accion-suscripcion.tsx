'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Textos {
  titulo: string;
  descripcion: string;
  boton: string;
  exito: (obra: string | null) => string;
}

const TEXTOS: Record<'confirmar' | 'baja', Textos> = {
  confirmar: {
    titulo: 'Confirmar suscripción',
    descripcion: 'Confirma que quieres recibir avisos por correo sobre esta obra.',
    boton: 'Sí, confirmar',
    exito: (obra) => `¡Listo! Recibirás avisos sobre${obra ? ` "${obra}"` : ' la obra'} cuando haya novedades.`,
  },
  baja: {
    titulo: 'Darse de baja',
    descripcion: 'Dejarás de recibir avisos por correo sobre esta obra.',
    boton: 'Dejar de recibir avisos',
    exito: (obra) => `Listo: ya no recibirás avisos${obra ? ` sobre "${obra}"` : ''}.`,
  },
};

function Contenido({ accion }: { accion: 'confirmar' | 'baja' }) {
  const token = useSearchParams().get('token') ?? '';
  const textos = TEXTOS[accion];
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'listo'>('inicial');
  const [obra, setObra] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar() {
    setEstado('enviando');
    setError(null);
    try {
      const res = await fetch(`/api/suscripciones/${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo completar la acción.');
        setEstado('inicial');
        return;
      }
      setObra(data.obra ?? null);
      setEstado('listo');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setEstado('inicial');
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{textos.titulo}</h1>

      {estado === 'listo' ? (
        <p role="status" className="mt-4 rounded-md bg-success/10 px-3 py-3 text-sm text-success">
          {textos.exito(obra)}
        </p>
      ) : !token ? (
        <p className="mt-4 text-sm text-muted-foreground">El enlace está incompleto. Abre el enlace completo del correo.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{textos.descripcion}</p>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <button
            type="button"
            onClick={ejecutar}
            disabled={estado === 'enviando'}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {estado === 'enviando' ? 'Un momento…' : textos.boton}
          </button>
        </>
      )}

      <Link href="/" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Volver al mapa
      </Link>
    </div>
  );
}

export function AccionSuscripcion({ accion }: { accion: 'confirmar' | 'baja' }) {
  // useSearchParams requiere un límite de Suspense en Next.js App Router
  return (
    <Suspense fallback={null}>
      <Contenido accion={accion} />
    </Suspense>
  );
}
