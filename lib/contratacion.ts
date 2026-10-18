// Compartido por servidor y cliente (etiquetas y cálculos de contratación).

export const MODALIDADES = ['LICITACION_GENERAL', 'LICITACION_SELECTIVA', 'CONTRATACION_DIRECTA', 'CONSULTA_PRECIOS'] as const;
export type ModalidadClave = (typeof MODALIDADES)[number];

export const MODALIDAD_LEGIBLE: Record<ModalidadClave, string> = {
  LICITACION_GENERAL: 'Licitación general',
  LICITACION_SELECTIVA: 'Licitación selectiva',
  CONTRATACION_DIRECTA: 'Contratación directa',
  CONSULTA_PRECIOS: 'Consulta de precios',
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha límite contractual: firma + plazo + días adicionales de todas las adendas. */
export function fechaLimiteContrato(fechaFirma: Date, plazoEjecucionDias: number, adendas: { diasAdicionales: number }[]): Date {
  const dias = plazoEjecucionDias + adendas.reduce((suma, a) => suma + a.diasAdicionales, 0);
  return new Date(fechaFirma.getTime() + dias * MS_POR_DIA);
}

/** Variación del monto actual respecto al original, en %, con un decimal. */
export function variacionPorcentual(original: number, actual: number): number {
  if (original <= 0) return 0;
  return Math.round(((actual - original) / original) * 1000) / 10;
}

export type NivelDesempeno = 'CONFIABLE' | 'REGULAR' | 'BAJO';

export const NIVEL_DESEMPENO_LEGIBLE: Record<NivelDesempeno, string> = {
  CONFIABLE: 'Confiable',
  REGULAR: 'Regular',
  BAJO: 'Bajo cumplimiento',
};

export function nivelDePuntaje(puntaje: number): NivelDesempeno {
  if (puntaje >= 80) return 'CONFIABLE';
  if (puntaje >= 50) return 'REGULAR';
  return 'BAJO';
}
