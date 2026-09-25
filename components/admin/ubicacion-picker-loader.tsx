'use client';

import dynamic from 'next/dynamic';

const UbicacionPickerMap = dynamic(() => import('./ubicacion-picker-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Cargando mapa…</p>
    </div>
  ),
});

interface UbicacionPickerLoaderProps {
  lat: number | null;
  lng: number | null;
  onCambiar: (lat: number, lng: number) => void;
}

export default function UbicacionPickerLoader(props: UbicacionPickerLoaderProps) {
  return <UbicacionPickerMap {...props} />;
}
