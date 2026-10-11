import ExcelJS from 'exceljs';
import type { EstadoPublicacion } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';

// Exportación interna para el panel admin: a diferencia de datos abiertos
// (solo obras publicadas, solo campos públicos), aquí van TODAS las obras con
// su estado de publicación, para que quien administra pueda trabajar en
// Excel. Sigue sin incluir datos personales del equipo.

const ETIQUETA_PUBLICACION: Record<EstadoPublicacion, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
};

export async function generarExcelObras(filtroPublicacion?: EstadoPublicacion): Promise<Buffer> {
  const obras = await prisma.obra.findMany({
    where: filtroPublicacion ? { estadoPublicacion: filtroPublicacion } : undefined,
    include: {
      tipoObra: { select: { nombre: true } },
      estatus: { select: { nombre: true } },
      ente: { select: { nombre: true } },
      contratista: { select: { razonSocial: true } },
      fuenteFinanciamiento: { select: { nombre: true } },
      estado: { select: { nombre: true } },
      municipio: { select: { nombre: true } },
      parroquia: { select: { nombre: true } },
    },
    orderBy: { codigo: 'asc' },
  });

  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIGOP';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Obras', { views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }] });
  hoja.columns = [
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 48 },
    { header: 'Publicación', key: 'publicacion', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 16 },
    { header: 'Estatus', key: 'estatus', width: 16 },
    { header: 'Ente responsable', key: 'ente', width: 36 },
    { header: 'Contratista', key: 'contratista', width: 32 },
    { header: 'Fuente de financiamiento', key: 'fuente', width: 26 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Municipio', key: 'municipio', width: 18 },
    { header: 'Parroquia', key: 'parroquia', width: 18 },
    { header: 'Moneda', key: 'moneda', width: 9 },
    { header: 'Presupuesto aprobado', key: 'presupuesto', width: 22, style: { numFmt: '#,##0.00' } },
    { header: 'Monto ejecutado', key: 'ejecutado', width: 20, style: { numFmt: '#,##0.00' } },
    { header: 'Avance físico (%)', key: 'fisico', width: 16, style: { numFmt: '0.0' } },
    { header: 'Avance financiero (%)', key: 'financiero', width: 20, style: { numFmt: '0.0' } },
    { header: 'Aprobación', key: 'aprobacion', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Inicio', key: 'inicio', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Fin estimado', key: 'finEstimado', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Fin real', key: 'finReal', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Beneficiarios', key: 'beneficiarios', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Capacidad', key: 'capacidad', width: 20 },
    { header: 'Destacada', key: 'destacada', width: 11 },
    { header: 'Actualizada', key: 'actualizada', width: 17, style: { numFmt: 'dd/mm/yyyy hh:mm' } },
  ];

  for (const obra of obras) {
    hoja.addRow({
      codigo: obra.codigo,
      nombre: obra.nombre,
      publicacion: ETIQUETA_PUBLICACION[obra.estadoPublicacion],
      tipo: obra.tipoObra.nombre,
      estatus: obra.estatus.nombre,
      ente: obra.ente.nombre,
      contratista: obra.contratista?.razonSocial ?? '',
      fuente: obra.fuenteFinanciamiento?.nombre ?? '',
      estado: obra.estado.nombre,
      municipio: obra.municipio.nombre,
      parroquia: obra.parroquia?.nombre ?? '',
      moneda: obra.moneda,
      // Decimal de Prisma → número: Excel necesita un número real para sumar.
      presupuesto: Number(obra.presupuestoAprobado),
      ejecutado: Number(obra.montoEjecutado),
      fisico: obra.avanceFisico,
      financiero: obra.avanceFinanciero,
      aprobacion: obra.fechaAprobacion,
      inicio: obra.fechaInicio,
      finEstimado: obra.fechaFinEstimada,
      finReal: obra.fechaFinReal,
      beneficiarios: obra.beneficiarios,
      capacidad: obra.capacidadDescripcion ?? '',
      destacada: obra.destacada ? 'Sí' : 'No',
      actualizada: obra.updatedAt,
    });
  }

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A6E' } };
  encabezado.alignment = { vertical: 'middle', wrapText: true };
  encabezado.height = 32;
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } };

  // Hoja de resumen: totales por moneda (nunca se suman monedas distintas).
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [
    { header: 'Concepto', key: 'concepto', width: 34 },
    { header: 'Valor', key: 'valor', width: 22 },
  ];
  resumen.addRow({ concepto: 'Obras exportadas', valor: obras.length });
  resumen.addRow({
    concepto: 'Filtro de publicación',
    valor: filtroPublicacion ? ETIQUETA_PUBLICACION[filtroPublicacion] : 'Todas',
  });
  resumen.addRow({ concepto: 'Fecha de exportación', valor: new Date() }).getCell(2).numFmt = 'dd/mm/yyyy hh:mm';
  resumen.addRow({});

  const porMoneda = new Map<string, { presupuesto: number; ejecutado: number }>();
  for (const obra of obras) {
    const acumulado = porMoneda.get(obra.moneda) ?? { presupuesto: 0, ejecutado: 0 };
    acumulado.presupuesto += Number(obra.presupuestoAprobado);
    acumulado.ejecutado += Number(obra.montoEjecutado);
    porMoneda.set(obra.moneda, acumulado);
  }
  for (const [moneda, { presupuesto, ejecutado }] of porMoneda) {
    resumen.addRow({ concepto: `Presupuesto aprobado (${moneda})`, valor: presupuesto }).getCell(2).numFmt = '#,##0.00';
    resumen.addRow({ concepto: `Monto ejecutado (${moneda})`, valor: ejecutado }).getCell(2).numFmt = '#,##0.00';
  }

  const porEstatus = new Map<string, number>();
  for (const obra of obras) porEstatus.set(obra.estatus.nombre, (porEstatus.get(obra.estatus.nombre) ?? 0) + 1);
  resumen.addRow({});
  resumen.addRow({ concepto: 'Obras por estatus' }).font = { bold: true };
  for (const [estatus, cantidad] of [...porEstatus].sort((a, b) => b[1] - a[1])) {
    resumen.addRow({ concepto: estatus, valor: cantidad });
  }

  resumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  resumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A6E' } };

  return Buffer.from(await libro.xlsx.writeBuffer());
}
