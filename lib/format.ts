// Formato de moneda y fechas para Venezuela (es-VE), usado en toda la ficha
// de obra. Acepta number o Prisma.Decimal (que implementa toString()).

export function formatearMoneda(monto: number | { toString(): string }, moneda: string): string {
  const numero = typeof monto === 'number' ? monto : Number(monto.toString());
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: moneda === 'VES' ? 'VES' : moneda,
    maximumFractionDigits: 0,
  }).format(numero);
}

export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return 'Sin definir';
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    date
  );
}

export function formatearFechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return '—';
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    date
  );
}
