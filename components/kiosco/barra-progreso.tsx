'use client';

import { useEffect, useRef, useState } from 'react';

interface BarraProgresoProps {
  /** Duración total del turno de cada obra. */
  duracionMs: number;
  pausado: boolean;
  /** Se llama una sola vez cuando se completa el tiempo. Para reiniciar la barra, cambia la `key`. */
  onCompletar: () => void;
}

const PASO_MS = 100;

// Barra que se llena durante el turno de cada obra. Se reinicia desmontándola (cambio de `key`).
export function BarraProgreso({ duracionMs, pausado, onCompletar }: BarraProgresoProps) {
  const [transcurrido, setTranscurrido] = useState(0);
  const completarRef = useRef(onCompletar);
  const avisado = useRef(false);

  useEffect(() => {
    completarRef.current = onCompletar;
  }, [onCompletar]);

  useEffect(() => {
    if (pausado) return;
    const reloj = setInterval(() => setTranscurrido((t) => Math.min(duracionMs, t + PASO_MS)), PASO_MS);
    return () => clearInterval(reloj);
  }, [pausado, duracionMs]);

  useEffect(() => {
    if (transcurrido >= duracionMs && !avisado.current) {
      avisado.current = true;
      completarRef.current();
    }
  }, [transcurrido, duracionMs]);

  return (
    <div aria-hidden="true" className="h-1.5 w-full bg-muted">
      <div className="h-full bg-primary transition-[width] duration-100 ease-linear" style={{ width: `${(transcurrido / duracionMs) * 100}%` }} />
    </div>
  );
}
