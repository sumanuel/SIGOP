import ExcelJS from 'exceljs';
import { COLUMNAS, MAX_FILAS_IMPORTACION } from '@/lib/server/importacion-personas/columnas';

export async function generarPlantilla(): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIGOP';

  const hoja = libro.addWorksheet('Personas', { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({
    header: c.obligatoria ? `${c.encabezado} *` : c.encabezado,
    key: c.clave,
    width: c.ancho,
  }));
  hoja.addRow(Object.fromEntries(COLUMNAS.map((c) => [c.clave, c.ejemplo])));

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A6E' } };
  encabezado.alignment = { vertical: 'middle', wrapText: true };
  encabezado.height = 30;
  hoja.getRow(2).font = { italic: true, color: { argb: 'FF6B7280' } };

  // Lista desplegable Sí/No en la columna de consentimiento.
  const columnaConsentimiento = COLUMNAS.findIndex((c) => c.clave === 'consentimiento') + 1;
  for (let fila = 2; fila <= MAX_FILAS_IMPORTACION + 1; fila++) {
    hoja.getCell(fila, columnaConsentimiento).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Sí,No"'],
    };
  }

  const instrucciones = libro.addWorksheet('Instrucciones');
  instrucciones.columns = [
    { header: 'Columna', key: 'columna', width: 32 },
    { header: 'Qué poner', key: 'ayuda', width: 100 },
  ];
  for (const c of COLUMNAS) {
    instrucciones.addRow({ columna: c.obligatoria ? `${c.encabezado} *` : c.encabezado, ayuda: c.ayuda });
  }
  instrucciones.addRow({});
  for (const nota of [
    `Máximo ${MAX_FILAS_IMPORTACION} filas por archivo.`,
    'La fila 2 de la hoja "Personas" es un ejemplo: bórrala antes de importar.',
    'Las personas que ya existen (mismo documento, o mismo nombre si no tienen documento) se omiten.',
    'La foto se agrega después, editando a la persona en el panel.',
    'Antes de importar verás un resumen y podrás corregir errores sin que se guarde nada.',
  ]) {
    instrucciones.addRow({ columna: '•', ayuda: nota });
  }
  instrucciones.getRow(1).font = { bold: true };

  return Buffer.from(await libro.xlsx.writeBuffer());
}
