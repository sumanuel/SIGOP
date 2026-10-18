// Compartido por servidor y cliente (etiquetas y formato del código de seguimiento).

export const CATEGORIAS_DENUNCIA = [
  'SOBRECOSTO',
  'INCUMPLIMIENTO_CONTRATO',
  'MALA_CALIDAD',
  'DESVIO_DE_RECURSOS',
  'PERSONAL_FANTASMA',
  'OBRA_ABANDONADA',
  'OTRO',
] as const;

export type CategoriaDenuncia = (typeof CATEGORIAS_DENUNCIA)[number];

export const CATEGORIA_LEGIBLE: Record<CategoriaDenuncia, string> = {
  SOBRECOSTO: 'Sobrecosto o precios inflados',
  INCUMPLIMIENTO_CONTRATO: 'Incumplimiento del contrato o de los plazos',
  MALA_CALIDAD: 'Mala calidad de la obra',
  DESVIO_DE_RECURSOS: 'Desvío de recursos',
  PERSONAL_FANTASMA: 'Personal que no trabaja en la obra',
  OBRA_ABANDONADA: 'Obra abandonada',
  OTRO: 'Otra irregularidad',
};

export type EstadoDenunciaClave = 'RECIBIDA' | 'EN_REVISION' | 'DERIVADA_CONTRALORIA' | 'CERRADA';

export const ESTADOS_DENUNCIA: EstadoDenunciaClave[] = ['RECIBIDA', 'EN_REVISION', 'DERIVADA_CONTRALORIA', 'CERRADA'];

export const ESTADO_DENUNCIA_LEGIBLE: Record<EstadoDenunciaClave, string> = {
  RECIBIDA: 'Recibida',
  EN_REVISION: 'En revisión',
  DERIVADA_CONTRALORIA: 'Derivada a un organismo de control',
  CERRADA: 'Cerrada',
};

// Alfabeto sin caracteres que se confunden al copiarlos a mano (0/O, 1/I/L).
export const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const LARGO_CODIGO = 12;

/** "DEN-ABCD-EFGH-JKMN" a partir de los 12 caracteres crudos. */
export function formatearCodigo(crudo: string): string {
  return `DEN-${crudo.slice(0, 4)}-${crudo.slice(4, 8)}-${crudo.slice(8, 12)}`;
}

/** Acepta el código con o sin prefijo, guiones, espacios o minúsculas; devuelve los 12 caracteres o null. */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = entrada.toUpperCase().replace(/^DEN/, '').replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== LARGO_CODIGO) return null;
  return [...limpio].every((c) => ALFABETO_CODIGO.includes(c)) ? limpio : null;
}
