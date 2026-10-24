/**
 * `completado` y `fechaReal` van de la mano: un hito completado sin fecha real
 * usa `hoy`; uno pendiente no puede tener fecha real.
 */
export function normalizarFechas(completado: boolean, fechaReal: string | null | undefined, hoy = new Date()) {
  if (!completado) return { completado: false, fechaReal: null as Date | null };
  return { completado: true, fechaReal: fechaReal ? new Date(fechaReal) : hoy };
}
