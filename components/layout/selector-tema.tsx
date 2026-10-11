'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  ORDEN_TEMAS,
  aplicarTema,
  guardarPreferencia,
  leerPreferencia,
  suscribirseATema,
  type PreferenciaTema,
} from '@/lib/tema';

const ETIQUETA: Record<PreferenciaTema, string> = {
  sistema: 'Tema: automático (según el dispositivo)',
  claro: 'Tema: claro',
  oscuro: 'Tema: oscuro',
};

const ICONO = { sistema: Monitor, claro: Sun, oscuro: Moon };

export function SelectorTema() {
  const preferencia = useSyncExternalStore(suscribirseATema, leerPreferencia, () => 'sistema' as PreferenciaTema);

  // En modo "sistema" el tema debe seguir los cambios del dispositivo en vivo.
  useEffect(() => {
    if (preferencia !== 'sistema') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => aplicarTema('sistema');
    media.addEventListener('change', alCambiar);
    return () => media.removeEventListener('change', alCambiar);
  }, [preferencia]);

  // Al imprimir o guardar como PDF siempre se usa el tema claro (fondo
  // oscuro gasta tinta y se lee mal en papel); luego se restaura la preferencia.
  useEffect(() => {
    const antesDeImprimir = () => document.documentElement.classList.remove('dark');
    const despuesDeImprimir = () => aplicarTema(preferencia);
    window.addEventListener('beforeprint', antesDeImprimir);
    window.addEventListener('afterprint', despuesDeImprimir);
    return () => {
      window.removeEventListener('beforeprint', antesDeImprimir);
      window.removeEventListener('afterprint', despuesDeImprimir);
    };
  }, [preferencia]);

  const siguiente =ORDEN_TEMAS[(ORDEN_TEMAS.indexOf(preferencia) + 1) % ORDEN_TEMAS.length];
  const Icono = ICONO[preferencia];

  return (
    <button
      type="button"
      onClick={() => guardarPreferencia(siguiente)}
      aria-label={`${ETIQUETA[preferencia]}. Cambiar a ${ETIQUETA[siguiente].replace('Tema: ', '')}`}
      title={ETIQUETA[preferencia]}
      className="flex size-10 items-center justify-center rounded-md text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icono className="size-5" aria-hidden="true" />
    </button>
  );
}
