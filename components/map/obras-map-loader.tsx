'use client';

import dynamic from 'next/dynamic';
import type { ObraMapa } from '@/lib/types/obra';

// MapLibre GL toca `window`/WebGL al cargar — se carga solo en el cliente
// (ssr: false) para evitar errores durante el renderizado en el servidor.
const ObrasMap = dynamic(() => import('./obras-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Cargando mapa…</p>
    </div>
  ),
});

interface ObrasMapLoaderProps {
  obras: ObraMapa[];
  onSeleccionarObra?: (obra: ObraMapa) => void;
}

export default function ObrasMapLoader(props: ObrasMapLoaderProps) {
  return <ObrasMap {...props} />;
}
