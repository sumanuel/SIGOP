'use client';

import dynamic from 'next/dynamic';

const TrazadoPickerMap = dynamic(() => import('./trazado-picker-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Cargando mapa…</p>
    </div>
  ),
});

interface TrazadoPickerLoaderProps {
  puntos: [number, number][];
  centro: [number, number] | null;
  onCambiar: (puntos: [number, number][]) => void;
}

export default function TrazadoPickerLoader(props: TrazadoPickerLoaderProps) {
  return <TrazadoPickerMap {...props} />;
}
