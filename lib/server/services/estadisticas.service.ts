import { prisma } from '@/lib/server/prisma';

export interface EstadisticasPublicas {
  totalObras: number;
  /** Presupuesto aprobado por moneda: nunca se suman monedas distintas. */
  inversionPorMoneda: Record<string, number>;
  monedas: string[];
  obrasCulminadas: number;
  avancePromedio: number;
  porTipo: { nombre: string; color: string; cantidad: number }[];
  porEstado: { estado: string; cantidad: number; inversionPorMoneda: Record<string, number>; avancePromedio: number }[];
  culminadasPorAnio: { anio: number; cantidad: number }[];
}

/**
 * Agregados sobre las obras PUBLICADO, para el dashboard público
 * (PLAN_PROYECTO.md sección 3.1). No necesita PostGIS/SQL crudo — son solo
 * conteos y sumas, así que un `findMany` normal de Prisma alcanza.
 */
export async function obtenerEstadisticasPublicas(): Promise<EstadisticasPublicas> {
  const obras = await prisma.obra.findMany({
    where: { estadoPublicacion: 'PUBLICADO' },
    select: {
      avanceFisico: true,
      presupuestoAprobado: true,
      moneda: true,
      fechaFinReal: true,
      estatus: { select: { nombre: true } },
      tipoObra: { select: { nombre: true, color: true } },
      estado: { select: { nombre: true } },
    },
  });

  const totalObras = obras.length;
  const inversionPorMoneda: Record<string, number> = {};
  for (const o of obras) inversionPorMoneda[o.moneda] = (inversionPorMoneda[o.moneda] ?? 0) + Number(o.presupuestoAprobado);
  // Bolívares primero (la moneda de la mayoría de las obras), luego el resto en orden alfabético.
  const monedas = Object.keys(inversionPorMoneda).sort((a, b) => (a === 'VES' ? -1 : b === 'VES' ? 1 : a.localeCompare(b)));
  const obrasCulminadas = obras.filter(
    (o) => o.estatus.nombre === 'Culminada' || o.estatus.nombre === 'Inaugurada'
  ).length;
  const avancePromedio =
    totalObras === 0 ? 0 : Math.round(obras.reduce((acc, o) => acc + o.avanceFisico, 0) / totalObras);

  const tipoMap = new Map<string, { nombre: string; color: string; cantidad: number }>();
  obras.forEach((o) => {
    const previo = tipoMap.get(o.tipoObra.nombre);
    tipoMap.set(o.tipoObra.nombre, {
      nombre: o.tipoObra.nombre,
      color: o.tipoObra.color ?? '#6B7280',
      cantidad: (previo?.cantidad ?? 0) + 1,
    });
  });

  interface AcumEstado {
    estado: string;
    cantidad: number;
    inversionPorMoneda: Record<string, number>;
    avanceSuma: number;
  }
  const estadoMap = new Map<string, AcumEstado>();
  obras.forEach((o) => {
    const previo = estadoMap.get(o.estado.nombre) ?? {
      estado: o.estado.nombre,
      cantidad: 0,
      inversionPorMoneda: {},
      avanceSuma: 0,
    };
    previo.cantidad += 1;
    previo.inversionPorMoneda[o.moneda] = (previo.inversionPorMoneda[o.moneda] ?? 0) + Number(o.presupuestoAprobado);
    previo.avanceSuma += o.avanceFisico;
    estadoMap.set(o.estado.nombre, previo);
  });
  const porEstado = Array.from(estadoMap.values())
    .map((e) => ({
      estado: e.estado,
      cantidad: e.cantidad,
      inversionPorMoneda: e.inversionPorMoneda,
      avancePromedio: Math.round(e.avanceSuma / e.cantidad),
    }))
    .sort((a, b) => b.avancePromedio - a.avancePromedio);

  const anioMap = new Map<number, number>();
  obras.forEach((o) => {
    if (!o.fechaFinReal) return;
    const anio = o.fechaFinReal.getFullYear();
    anioMap.set(anio, (anioMap.get(anio) ?? 0) + 1);
  });
  const culminadasPorAnio = Array.from(anioMap.entries())
    .map(([anio, cantidad]) => ({ anio, cantidad }))
    .sort((a, b) => a.anio - b.anio);

  return {
    totalObras,
    inversionPorMoneda,
    monedas,
    obrasCulminadas,
    avancePromedio,
    porTipo: Array.from(tipoMap.values()),
    porEstado,
    culminadasPorAnio,
  };
}
