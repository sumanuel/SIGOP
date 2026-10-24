'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// El evento no está en los tipos estándar de TypeScript (solo Chromium lo emite).
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Enlace del pie de página para instalar SIGOP como aplicación. Chrome y Edge permiten
// instalar con un botón; Safari en iPhone no, así que se muestran las instrucciones.
export function BotonInstalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instrucciones, setInstrucciones] = useState(false);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(true); // hasta saber que no, no se muestra nada

  useEffect(() => {
    // Datos que solo existen en el navegador: se leen una vez al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalada(yaInstalada());
    setIos(esIOS());

    const alPedirInstalar = (e: Event) => {
      e.preventDefault(); // evita el aviso automático del navegador: se ofrece desde el pie
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => {
      setInstalada(true);
      setEvento(null);
    };
    window.addEventListener('beforeinstallprompt', alPedirInstalar);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alPedirInstalar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (instalada || (!evento && !ios)) return null;

  async function instalar() {
    if (!evento) return setInstrucciones((v) => !v);
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  return (
    <span className="relative">
      <button type="button" onClick={instalar} className="inline-flex items-center gap-1 hover:text-primary" aria-expanded={!evento ? instrucciones : undefined}>
        <Download className="size-3.5" aria-hidden="true" />
        Instalar aplicación
      </button>
      {instrucciones && !evento && (
        <span role="note" className="absolute bottom-full right-0 mb-2 w-60 rounded-md border border-border bg-background p-3 text-xs font-normal text-foreground shadow-lg">
          En Safari, toca el botón <strong>Compartir</strong> y luego <strong>Agregar a pantalla de inicio</strong>.
        </span>
      )}
    </span>
  );
}
