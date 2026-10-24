import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { BotonReintentar } from '@/components/pwa/boton-reintentar';

export const metadata: Metadata = { title: 'Sin conexión — SIGOP', robots: { index: false } };

// El service worker muestra esta página cuando no hay conexión y la página pedida no se había guardado antes.
export default function SinConexionPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <WifiOff className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold tracking-tight">Sin conexión</h1>
      <p className="text-sm text-muted-foreground">
        No pudimos cargar esta página porque tu dispositivo no tiene internet y todavía no la habías visitado. Las páginas que
        ya abriste siguen disponibles; también puedes volver a intentarlo cuando recuperes la señal.
      </p>
      <BotonReintentar />
    </div>
  );
}
