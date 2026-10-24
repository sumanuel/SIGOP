import type { MetadataRoute } from 'next';

// Manifiesto de la PWA: permite instalar SIGOP en la pantalla de inicio del celular o del
// escritorio. Los íconos salen de scripts/generar-iconos.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIGOP — Sistema de Información Geográfica de Obras Públicas',
    short_name: 'SIGOP',
    description: 'Transparencia y seguimiento georreferenciado de obras públicas.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    categories: ['government', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mapa de obras', url: '/', description: 'Ver las obras en el mapa' },
      { name: 'Estadísticas', url: '/estadisticas' },
      { name: 'Obras paralizadas', url: '/obras-paralizadas' },
    ],
  };
}
