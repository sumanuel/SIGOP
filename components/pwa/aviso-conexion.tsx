'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
}

// Franja que avisa cuando el dispositivo se queda sin internet: lo que se ve puede ser la
// última copia guardada (service worker) y no la información más reciente.
export function AvisoConexion() {
  // En el servidor se asume que hay conexión, para que el HTML inicial no muestre el aviso.
  const enLinea = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true
  );

  if (enLinea) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 print:hidden dark:bg-amber-900/40 dark:text-amber-100"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      Sin conexión: puedes estar viendo la última información guardada en este dispositivo.
    </div>
  );
}
