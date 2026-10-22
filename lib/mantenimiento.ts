// Compartido por servidor y cliente (módulo 8: mantenimiento post-entrega).

export const TIPOS_INTERVENCION = ['PREVENTIVO', 'CORRECTIVO'] as const;
export type TipoIntervencion = (typeof TIPOS_INTERVENCION)[number];

export const TIPO_INTERVENCION_LEGIBLE: Record<TipoIntervencion, string> = {
  PREVENTIVO: 'Preventivo',
  CORRECTIVO: 'Correctivo',
};

/** Una garantía que vence en este plazo se muestra como "por vencer". */
export const DIAS_GARANTIA_POR_VENCER = 60;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type EstadoGarantia = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'SIN_INICIAR';

export interface SituacionGarantia {
  estado: EstadoGarantia;
  /** Días que faltan para el vencimiento (0 si ya venció o aún no inicia). */
  diasRestantes: number;
}

/** Situación de una garantía en `ahora`: vencida el día siguiente a su fecha de fin. */
export function situacionGarantia(inicio: Date, fin: Date, ahora = new Date()): SituacionGarantia {
  if (ahora.getTime() < inicio.getTime()) return { estado: 'SIN_INICIAR', diasRestantes: 0 };
  if (ahora.getTime() > fin.getTime()) return { estado: 'VENCIDA', diasRestantes: 0 };
  const diasRestantes = Math.ceil((fin.getTime() - ahora.getTime()) / MS_POR_DIA);
  return { estado: diasRestantes <= DIAS_GARANTIA_POR_VENCER ? 'POR_VENCER' : 'VIGENTE', diasRestantes };
}

export const ESTADO_GARANTIA_LEGIBLE: Record<EstadoGarantia, string> = {
  VIGENTE: 'En garantía',
  POR_VENCER: 'Garantía por vencer',
  VENCIDA: 'Garantía vencida',
  SIN_INICIAR: 'Garantía aún no iniciada',
};

/**
 * Último mantenimiento y suma de costos por moneda (nunca se mezclan VES y USD).
 */
export function resumenIntervenciones(
  intervenciones: { fecha: Date; costo: number | null; moneda: string }[]
): { total: number; ultima: Date | null; costosPorMoneda: Record<string, number> } {
  const costosPorMoneda: Record<string, number> = {};
  let ultima: Date | null = null;
  for (const i of intervenciones) {
    if (i.costo !== null) costosPorMoneda[i.moneda] = (costosPorMoneda[i.moneda] ?? 0) + i.costo;
    if (!ultima || i.fecha.getTime() > ultima.getTime()) ultima = i.fecha;
  }
  return { total: intervenciones.length, ultima, costosPorMoneda };
}
