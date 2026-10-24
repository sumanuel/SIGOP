// Genera los íconos de la PWA (public/icons/*.png) a partir del logotipo "S" del encabezado.
// Se ejecuta a mano cuando cambie el logotipo: `node scripts/generar-iconos.mjs`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SALIDA = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(SALIDA, { recursive: true });

// `margen` reserva la "zona segura" de los íconos maskable: el sistema los recorta con
// formas distintas (círculo, cuadrado redondeado), así que el logo va en el 60 % central.
function svg(tamano, { redondeado, letra }) {
  const radio = redondeado ? Math.round(tamano * 0.22) : 0;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="0 0 ${tamano} ${tamano}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="${tamano}" height="${tamano}" rx="${radio}" fill="url(#g)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${Math.round(tamano * letra)}" fill="#FFFFFF">S</text>
</svg>`);
}

const iconos = [
  { archivo: 'icon-192.png', tamano: 192, redondeado: true, letra: 0.62 },
  { archivo: 'icon-512.png', tamano: 512, redondeado: true, letra: 0.62 },
  { archivo: 'icon-maskable-512.png', tamano: 512, redondeado: false, letra: 0.42 },
  { archivo: 'apple-touch-icon.png', tamano: 180, redondeado: false, letra: 0.56 },
];

for (const { archivo, tamano, redondeado, letra } of iconos) {
  await sharp(svg(tamano, { redondeado, letra })).png().toFile(join(SALIDA, archivo));
  console.log('generado', archivo);
}
