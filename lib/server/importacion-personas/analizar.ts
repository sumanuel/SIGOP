import ExcelJS from 'exceljs';
import {
  COLUMNAS,
  ImportacionError,
  MAX_BYTES_IMPORTACION,
  MAX_FILAS_IMPORTACION,
  type AnalisisImportacion,
  type ClaveColumna,
} from '@/lib/server/importacion-personas/columnas';
import { clasificarFilas, type FilaCruda } from '@/lib/server/importacion-personas/clasificar';
import { normalizarTexto, textoCelda } from '@/lib/server/importacion-personas/texto';

const ENCABEZADOS: Record<string, ClaveColumna> = {
  ...Object.fromEntries(COLUMNAS.map((c) => [normalizarTexto(c.encabezado), c.clave])),
  documento: 'documentoIdentidad',
  cedula: 'documentoIdentidad',
  consentimiento: 'consentimiento',
  'anos de experiencia': 'aniosExperiencia',
};

export async function analizarArchivoPersonas(buffer: Buffer): Promise<AnalisisImportacion> {
  if (buffer.length > MAX_BYTES_IMPORTACION) {
    throw new ImportacionError(413, 'El archivo supera los 2 MB.');
  }

  const libro = new ExcelJS.Workbook();
  try {
    // @ts-expect-error — exceljs tipa `load` con su propio Buffer legado.
    await libro.xlsx.load(buffer);
  } catch {
    throw new ImportacionError(400, 'No se pudo leer el archivo. Usa un Excel .xlsx (puedes bajar la plantilla).');
  }

  const hoja = libro.getWorksheet('Personas') ?? libro.worksheets[0];
  if (!hoja) throw new ImportacionError(400, 'El archivo no tiene hojas.');

  // Mapa columna → campo, a partir de los encabezados de la fila 1.
  const columnas = new Map<number, ClaveColumna>();
  hoja.getRow(1).eachCell((celda, numero) => {
    const clave = ENCABEZADOS[normalizarTexto(textoCelda(celda.value).replace(/\*/g, ''))];
    if (clave) columnas.set(numero, clave);
  });
  const claves = new Set(columnas.values());
  if (!claves.has('nombres') || !claves.has('apellidos')) {
    throw new ImportacionError(400, 'No se encontraron las columnas "Nombres" y "Apellidos". Usa la plantilla.');
  }

  const filasCrudas: FilaCruda[] = [];
  hoja.eachRow((row, numeroFila) => {
    if (numeroFila === 1) return;
    const valores: FilaCruda['valores'] = {};
    for (const [columna, clave] of columnas) valores[clave] = textoCelda(row.getCell(columna).value);
    if (Object.values(valores).every((v) => !v)) return; // fila vacía
    filasCrudas.push({ fila: numeroFila, valores });
  });

  if (filasCrudas.length === 0) throw new ImportacionError(400, 'El archivo no tiene filas con datos.');
  if (filasCrudas.length > MAX_FILAS_IMPORTACION) {
    throw new ImportacionError(400, `El archivo tiene ${filasCrudas.length} filas; el máximo es ${MAX_FILAS_IMPORTACION}.`);
  }

  return clasificarFilas(filasCrudas);
}
