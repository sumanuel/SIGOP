// Umbral deliberadamente laxo (WCAG 1.4.11 pide 3:1): colores habituales como
// el ámbar o el gris pizarra rondan 2:1–2.5:1 y los marcadores ya llevan borde
// e ícono; solo avisamos cuando el color casi se confunde con el fondo.
const MINIMO_NO_TEXTO = 2;
const FONDO_CLARO = '#FFFFFF';
const FONDO_OSCURO = '#171717';

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(hex.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razon(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Devuelve en qué tema el color casi no se distingue del fondo, o null si se ve bien en ambos. */
export function temaConPocoContraste(hex: string): 'claro' | 'oscuro' | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  if (razon(hex, FONDO_CLARO) < MINIMO_NO_TEXTO) return 'claro';
  if (razon(hex, FONDO_OSCURO) < MINIMO_NO_TEXTO) return 'oscuro';
  return null;
}
