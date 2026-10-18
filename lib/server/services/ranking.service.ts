import { prisma } from '@/lib/server/prisma';
import { calcularAtrasoDias } from '@/lib/atraso';

// Ranking y comparador de obras (MODULOS_AVANZADOS.md, módulo 5). Son agregados
// sobre las obras PUBLICADAS; con el volumen de un piloto se calculan al pedir
// la página (sin vistas materializadas ni tareas programadas).
//
// Los montos NUNCA se suman entre monedas distintas: cada fila lleva su
// inversión desglosada por moneda.

export interface FilaTerritorio {
  clave: string;
  nombre: string;
  /** Solo en municipios: el estado al que pertenecen. */
  estado?: string;
  totalObras: number;
  culminadas: number;
  pctCulminadas: number;
  avancePromedio: number;
  /** % de obras (con fecha estimada) que no van atrasadas; null si ninguna tiene fecha. */
  pctATiempo: number | null;
  /** Promedio de días de atraso de las obras con fecha estimada (a tiempo cuenta 0); null si no hay datos. */
  atrasoPromedioDias: number | null;
  inversionPorMoneda: Record<string, number>;
}

export interface FilaComparador {
  slug: string;
  nombre: string;
  estado: string;
  municipio: string;
  tipoObraId: string;
  estatus: string;
  moneda: string;
  presupuesto: number;
  beneficiarios: number | null;
  costoPorBeneficiario: number | null;
  avanceFisico: number;
  atrasoDias: number | null;
}

export interface DatosRanking {
  porEstado: FilaTerritorio[];
  porMunicipio: FilaTerritorio[];
  obras: FilaComparador[];
  tipos: { id: string; nombre: string }[];
  monedas: string[];
}

const ESTATUS_CULMINADOS = ['culminada', 'inaugurada'];

interface ObraBase {
  avanceFisico: number;
  culminada: boolean;
  atraso: number | null;
  moneda: string;
  presupuesto: number;
}

function agrupar(obras: ObraBase[], clave: string, nombre: string, estado?: string): FilaTerritorio {
  const total = obras.length;
  const culminadas = obras.filter((o) => o.culminada).length;
  const conFecha = obras.filter((o) => o.atraso !== null);
  const inversionPorMoneda: Record<string, number> = {};
  for (const o of obras) inversionPorMoneda[o.moneda] = (inversionPorMoneda[o.moneda] ?? 0) + o.presupuesto;

  return {
    clave,
    nombre,
    estado,
    totalObras: total,
    culminadas,
    pctCulminadas: Math.round((culminadas / total) * 100),
    avancePromedio: Math.round(obras.reduce((s, o) => s + o.avanceFisico, 0) / total),
    pctATiempo:
      conFecha.length === 0 ? null : Math.round((conFecha.filter((o) => (o.atraso ?? 0) <= 0).length / conFecha.length) * 100),
    atrasoPromedioDias:
      conFecha.length === 0 ? null : Math.round(conFecha.reduce((s, o) => s + Math.max(0, o.atraso ?? 0), 0) / conFecha.length),
    inversionPorMoneda,
  };
}

export async function obtenerRanking(): Promise<DatosRanking> {
  const obras = await prisma.obra.findMany({
    where: { estadoPublicacion: 'PUBLICADO' },
    select: {
      slug: true,
      nombre: true,
      moneda: true,
      presupuestoAprobado: true,
      beneficiarios: true,
      avanceFisico: true,
      fechaFinEstimada: true,
      fechaFinReal: true,
      estatus: { select: { nombre: true } },
      tipoObra: { select: { id: true, nombre: true } },
      estado: { select: { id: true, nombre: true } },
      municipio: { select: { id: true, nombre: true } },
    },
  });

  const enriquecidas = obras.map((o) => ({
    obra: o,
    base: {
      avanceFisico: o.avanceFisico,
      culminada: ESTATUS_CULMINADOS.includes(o.estatus.nombre.toLowerCase()),
      atraso: calcularAtrasoDias(o),
      moneda: o.moneda,
      presupuesto: Number(o.presupuestoAprobado),
    } satisfies ObraBase,
  }));

  const porEstado = new Map<string, { nombre: string; lista: ObraBase[] }>();
  const porMunicipio = new Map<string, { nombre: string; estado: string; lista: ObraBase[] }>();
  for (const { obra, base } of enriquecidas) {
    const e = porEstado.get(obra.estado.id) ?? { nombre: obra.estado.nombre, lista: [] };
    e.lista.push(base);
    porEstado.set(obra.estado.id, e);

    const m = porMunicipio.get(obra.municipio.id) ?? { nombre: obra.municipio.nombre, estado: obra.estado.nombre, lista: [] };
    m.lista.push(base);
    porMunicipio.set(obra.municipio.id, m);
  }

  const tipos = new Map<string, string>();
  const monedas = new Set<string>();
  const filasObras: FilaComparador[] = enriquecidas.map(({ obra, base }) => {
    tipos.set(obra.tipoObra.id, obra.tipoObra.nombre);
    monedas.add(obra.moneda);
    const beneficiarios = obra.beneficiarios && obra.beneficiarios > 0 ? obra.beneficiarios : null;
    return {
      slug: obra.slug,
      nombre: obra.nombre,
      estado: obra.estado.nombre,
      municipio: obra.municipio.nombre,
      tipoObraId: obra.tipoObra.id,
      estatus: obra.estatus.nombre,
      moneda: obra.moneda,
      presupuesto: base.presupuesto,
      beneficiarios,
      costoPorBeneficiario: beneficiarios ? base.presupuesto / beneficiarios : null,
      avanceFisico: obra.avanceFisico,
      atrasoDias: base.atraso,
    };
  });

  return {
    porEstado: [...porEstado].map(([id, v]) => agrupar(v.lista, id, v.nombre)),
    porMunicipio: [...porMunicipio].map(([id, v]) => agrupar(v.lista, id, v.nombre, v.estado)),
    obras: filasObras,
    tipos: [...tipos].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    monedas: [...monedas].sort(),
  };
}
