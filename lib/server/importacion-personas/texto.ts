import type ExcelJS from 'exceljs';

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizarDocumento(valor: string): string {
  return valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** Texto de una celda de ExcelJS (puede ser texto enriquecido, fórmula, enlace, fecha…). */
export function textoCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
    // Fórmulas: se toma el último resultado calculado, nunca se evalúan.
    if ('result' in valor && valor.result !== undefined) return textoCelda(valor.result as ExcelJS.CellValue);
    if ('text' in valor && typeof valor.text === 'string') return valor.text.trim();
  }
  return '';
}
