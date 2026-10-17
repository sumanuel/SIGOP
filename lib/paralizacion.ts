// Compartido por servidor y cliente (etiquetas y cálculo de duraciones).

export const MOTIVOS_PARALIZACION = [
  'FALTA_PRESUPUESTO',
  'INCUMPLIMIENTO_CONTRATISTA',
  'PROBLEMA_LEGAL_PERMISOS',
  'PROBLEMA_TECNICO',
  'CONDICIONES_CLIMATICAS',
  'ORDEN_SUPERIOR',
  'OTRO',
] as const;

export type MotivoParalizacionClave = (typeof MOTIVOS_PARALIZACION)[number];

export const MOTIVO_LEGIBLE: Record<MotivoParalizacionClave, string> = {
  FALTA_PRESUPUESTO: 'Falta de presupuesto',
  INCUMPLIMIENTO_CONTRATISTA: 'Incumplimiento del contratista',
  PROBLEMA_LEGAL_PERMISOS: 'Problema legal o de permisos',
  PROBLEMA_TECNICO: 'Problema técnico',
  CONDICIONES_CLIMATICAS: 'Condiciones climáticas',
  ORDEN_SUPERIOR: 'Orden superior',
  OTRO: 'Otro motivo',
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días completos entre dos fechas (nunca negativo). */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / MS_POR_DIA));
}

/** "2 años y 3 meses", "5 meses", "12 días": aproximado, pensado para titulares. */
export function duracionLegible(dias: number): string {
  if (dias < 31) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  const mesesTotales = Math.floor(dias / 30.44);
  const anios = Math.floor(mesesTotales / 12);
  const meses = mesesTotales % 12;
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  return partes.join(' y ');
}
