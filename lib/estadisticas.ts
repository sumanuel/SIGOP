// Cálculo de las estadísticas públicas. Compartido por servidor y cliente: el
// servidor entrega una fila mínima por obra publicada (sin nombres ni
// ubicaciones exactas) y el navegador recalcula al filtrar, sin nuevas
// consultas. Los montos nunca se suman entre monedas distintas.

export interface FilaEstadistica {
  estado: string;
  tipo: string;
  tipoColor: string;
  estatus: string;
  estatusColor: string;
  estatusOrden: number;
  moneda: string;
  presupuesto: number;
  avance: number;
  anioAprobacion: number | null;
  anioFinReal: number | null;
}

export interface FiltrosEstadistica {
  estado?: string;
  tipo?: string;
  estatus?: string;
  /** Año de aprobación de la obra. */
  anio?: number;
}

export interface Estadisticas {
  totalObras: number;
  /** Presupuesto aprobado por moneda. */
  inversionPorMoneda: Record<string, number>;
  monedas: string[];
  obrasCulminadas: number;
  avancePromedio: number;
  porTipo: { nombre: string; color: string; cantidad: number }[];
  porEstatus: { nombre: string; color: string; cantidad: number }[];
  porEstado: { estado: string; cantidad: number; inversionPorMoneda: Record<string, number>; avancePromedio: number }[];
  culminadasPorAnio: { anio: number; cantidad: number }[];
}

export function aplicarFiltros(filas: FilaEstadistica[], f: FiltrosEstadistica): FilaEstadistica[] {
  return filas.filter(
    (o) =>
      (!f.estado || o.estado === f.estado) &&
      (!f.tipo || o.tipo === f.tipo) &&
      (!f.estatus || o.estatus === f.estatus) &&
      (f.anio === undefined || o.anioAprobacion === f.anio)
  );
}

export function hayFiltros(f: FiltrosEstadistica): boolean {
  return Boolean(f.estado || f.tipo || f.estatus || f.anio !== undefined);
}

const ESTATUS_TERMINADOS = ['Culminada', 'Inaugurada'];

function sumar(acumulado: Record<string, number>, moneda: string, monto: number) {
  acumulado[moneda] = (acumulado[moneda] ?? 0) + monto;
}

export function calcularEstadisticas(filas: FilaEstadistica[]): Estadisticas {
  const totalObras = filas.length;
  const inversionPorMoneda: Record<string, number> = {};
  for (const o of filas) sumar(inversionPorMoneda, o.moneda, o.presupuesto);
  // Bolívares primero (la moneda de la mayoría de las obras), luego el resto en orden alfabético.
  const monedas = Object.keys(inversionPorMoneda).sort((a, b) => (a === 'VES' ? -1 : b === 'VES' ? 1 : a.localeCompare(b)));

  const tipos = new Map<string, { nombre: string; color: string; cantidad: number }>();
  const estatus = new Map<string, { nombre: string; color: string; cantidad: number; orden: number }>();
  const estados = new Map<string, { estado: string; cantidad: number; inversionPorMoneda: Record<string, number>; avanceSuma: number }>();
  const anios = new Map<number, number>();

  for (const o of filas) {
    const t = tipos.get(o.tipo);
    tipos.set(o.tipo, { nombre: o.tipo, color: o.tipoColor, cantidad: (t?.cantidad ?? 0) + 1 });

    const s = estatus.get(o.estatus);
    estatus.set(o.estatus, { nombre: o.estatus, color: o.estatusColor, orden: o.estatusOrden, cantidad: (s?.cantidad ?? 0) + 1 });

    const e = estados.get(o.estado) ?? { estado: o.estado, cantidad: 0, inversionPorMoneda: {}, avanceSuma: 0 };
    e.cantidad += 1;
    sumar(e.inversionPorMoneda, o.moneda, o.presupuesto);
    e.avanceSuma += o.avance;
    estados.set(o.estado, e);

    if (o.anioFinReal !== null) anios.set(o.anioFinReal, (anios.get(o.anioFinReal) ?? 0) + 1);
  }

  return {
    totalObras,
    inversionPorMoneda,
    monedas,
    obrasCulminadas: filas.filter((o) => ESTATUS_TERMINADOS.includes(o.estatus)).length,
    avancePromedio: totalObras === 0 ? 0 : Math.round(filas.reduce((suma, o) => suma + o.avance, 0) / totalObras),
    porTipo: [...tipos.values()],
    porEstatus: [...estatus.values()].sort((a, b) => a.orden - b.orden).map(({ nombre, color, cantidad }) => ({ nombre, color, cantidad })),
    porEstado: [...estados.values()]
      .map((e) => ({
        estado: e.estado,
        cantidad: e.cantidad,
        inversionPorMoneda: e.inversionPorMoneda,
        avancePromedio: Math.round(e.avanceSuma / e.cantidad),
      }))
      .sort((a, b) => b.avancePromedio - a.avancePromedio),
    culminadasPorAnio: [...anios.entries()].map(([anio, cantidad]) => ({ anio, cantidad })).sort((a, b) => a.anio - b.anio),
  };
}

/** Lee los filtros de la URL (`?estado=…&tipo=…&estatus=…&anio=2026`); ignora valores inválidos. */
export function filtrosDesdeParametros(params: Record<string, string | string[] | undefined>): FiltrosEstadistica {
  const texto = (v: string | string[] | undefined) => {
    const valor = Array.isArray(v) ? v[0] : v;
    return valor && valor.length <= 100 ? valor : undefined;
  };
  const anio = Number(texto(params.anio));
  return {
    estado: texto(params.estado),
    tipo: texto(params.tipo),
    estatus: texto(params.estatus),
    anio: Number.isInteger(anio) && anio >= 1900 && anio <= 2200 ? anio : undefined,
  };
}

/** Parámetros de URL de los filtros activos (para compartir el enlace). */
export function parametrosDeFiltros(f: FiltrosEstadistica): string {
  const p = new URLSearchParams();
  if (f.estado) p.set('estado', f.estado);
  if (f.tipo) p.set('tipo', f.tipo);
  if (f.estatus) p.set('estatus', f.estatus);
  if (f.anio !== undefined) p.set('anio', String(f.anio));
  return p.toString();
}
