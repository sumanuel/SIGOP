'use client';

import { useEffect } from 'react';

// Registra el service worker (public/sw.js). Solo en producción: en desarrollo un service
// worker guardaría archivos viejos y haría confusos los cambios de código.
export function RegistroServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
        console.error('No se pudo registrar el service worker:', error);
      });
    };

    // Se espera a que termine de cargar la página para no competir con el contenido.
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
  }, []);

  return null;
}
