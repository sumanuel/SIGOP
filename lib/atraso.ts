/**
 * Días de atraso de una obra: negativo o 0 = a tiempo, positivo = atrasada,
 * `null` si no aplica (sin fecha estimada, o ya culminada a tiempo).
 * Compartido entre la ficha pública de la obra y el dashboard interno del
 * panel admin — una sola fórmula, para que ambos coincidan siempre.
 */
export function calcularAtrasoDias(obra: {
  fechaFinEstimada: Date | null;
  fechaFinReal: Date | null;
  avanceFisico: number;
}): number | null {
  if (!obra.fechaFinEstimada) return null;

  const referencia = obra.fechaFinReal ?? (obra.avanceFisico < 100 ? new Date() : null);
  if (!referencia) return null;

  const diffMs = referencia.getTime() - obra.fechaFinEstimada.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
