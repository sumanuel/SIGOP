import type { TipoAlerta } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { DIAS_SILENCIO_TRAS_RESOLVER, evaluarObra } from '@/lib/server/alertas/reglas';

/** Regla de negocio de alertas (no existe, ya resuelta…); el Route Handler la traduce a su status. */
export class AlertaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ResultadoEvaluacion {
  evaluadas: number;
  creadas: number;
  actualizadas: number;
  autoResueltas: number;
  ejecutadaEn: Date;
}

// Solo una evaluación a la vez: si el cron y alguien con el botón "Evaluar
// ahora" coinciden, el segundo espera el resultado del primero en vez de
// duplicar alertas.
let evaluacionEnCurso: Promise<ResultadoEvaluacion> | null = null;
let ultimaEvaluacion: ResultadoEvaluacion | null = null;

export function obtenerUltimaEvaluacion() {
  return ultimaEvaluacion;
}

export function evaluarAlertas(): Promise<ResultadoEvaluacion> {
  evaluacionEnCurso ??= ejecutarEvaluacion().finally(() => {
    evaluacionEnCurso = null;
  });
  return evaluacionEnCurso;
}

const claveAlerta = (obraId: string, tipo: TipoAlerta) => `${obraId}|${tipo}`;

async function ejecutarEvaluacion(): Promise<ResultadoEvaluacion> {
  const ahora = new Date();

  const obras = await prisma.obra.findMany({
    where: { estadoPublicacion: 'PUBLICADO' },
    select: {
      id: true,
      avanceFisico: true,
      avanceFinanciero: true,
      createdAt: true,
      fechaInicio: true,
      fechaFinEstimada: true,
      estatus: { select: { nombre: true } },
      avances: { where: { aprobadoEn: { not: null } }, orderBy: { fecha: 'desc' }, take: 1, select: { fecha: true } },
      paralizaciones: { where: { fechaReactivacion: null }, take: 1, select: { fechaInicio: true } },
    },
  });

  const abiertas = await prisma.alerta.findMany({ where: { resuelta: false } });
  const abiertasPorClave = new Map(abiertas.map((a) => [claveAlerta(a.obraId, a.tipo), a]));

  // Resueltas a mano hace poco: se respeta la decisión de quien las cerró.
  const desdeSilencio = new Date(ahora.getTime() - DIAS_SILENCIO_TRAS_RESOLVER * 24 * 60 * 60 * 1000);
  const silenciadas = await prisma.alerta.findMany({
    where: { resuelta: true, resueltaPor: { not: null }, resueltaEn: { gte: desdeSilencio } },
    select: { obraId: true, tipo: true },
  });
  const silenciadasClaves = new Set(silenciadas.map((a) => claveAlerta(a.obraId, a.tipo)));

  const vigentes = new Set<string>();
  let creadas = 0;
  let actualizadas = 0;

  for (const obra of obras) {
    const calculadas = evaluarObra(
      {
        estatus: obra.estatus.nombre,
        avanceFisico: obra.avanceFisico,
        avanceFinanciero: obra.avanceFinanciero,
        createdAt: obra.createdAt,
        fechaInicio: obra.fechaInicio,
        fechaFinEstimada: obra.fechaFinEstimada,
        ultimoAvance: obra.avances[0]?.fecha ?? null,
        paralizadaDesde: obra.paralizaciones[0]?.fechaInicio ?? null,
      },
      ahora
    );

    for (const calculada of calculadas) {
      const clave = claveAlerta(obra.id, calculada.tipo);
      vigentes.add(clave);

      const existente = abiertasPorClave.get(clave);
      if (existente) {
        if (existente.mensaje !== calculada.mensaje || existente.severidad !== calculada.severidad) {
          await prisma.alerta.update({
            where: { id: existente.id },
            data: { mensaje: calculada.mensaje, severidad: calculada.severidad },
          });
          actualizadas++;
        }
      } else if (!silenciadasClaves.has(clave)) {
        await prisma.alerta.create({
          data: { obraId: obra.id, tipo: calculada.tipo, severidad: calculada.severidad, mensaje: calculada.mensaje },
        });
        creadas++;
      }
    }
  }

  // Lo que ya no se cumple (o de obras que dejaron de evaluarse) se resuelve solo.
  const obsoletas = abiertas.filter((a) => !vigentes.has(claveAlerta(a.obraId, a.tipo)));
  if (obsoletas.length > 0) {
    await prisma.alerta.updateMany({
      where: { id: { in: obsoletas.map((a) => a.id) } },
      data: { resuelta: true, resueltaEn: ahora, resueltaPor: null },
    });
  }

  ultimaEvaluacion = { evaluadas: obras.length, creadas, actualizadas, autoResueltas: obsoletas.length, ejecutadaEn: ahora };
  return ultimaEvaluacion;
}

interface FiltrosAlertas {
  estado?: 'activas' | 'resueltas';
  tipo?: TipoAlerta;
  obraId?: string;
}

export async function listarAlertas({ estado = 'activas', tipo, obraId }: FiltrosAlertas = {}) {
  return prisma.alerta.findMany({
    where: { resuelta: estado === 'resueltas', ...(tipo ? { tipo } : {}), ...(obraId ? { obraId } : {}) },
    include: { obra: { select: { id: true, nombre: true, codigo: true, slug: true } } },
    orderBy: estado === 'activas' ? [{ severidad: 'desc' }, { createdAt: 'desc' }] : [{ resueltaEn: 'desc' }],
    take: 300,
  });
}

export async function contarAlertasActivas() {
  const grupos = await prisma.alerta.groupBy({ by: ['severidad'], where: { resuelta: false }, _count: true });
  const porSeveridad = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  for (const g of grupos) porSeveridad[g.severidad] = g._count;
  return { total: grupos.reduce((s, g) => s + g._count, 0), criticas: porSeveridad[3] ?? 0, porSeveridad };
}

export async function resolverAlerta(id: string, usuarioId: string) {
  const alerta = await prisma.alerta.findUnique({ where: { id } });
  if (!alerta) throw new AlertaError(404, 'Alerta no encontrada.');
  if (alerta.resuelta) throw new AlertaError(409, 'La alerta ya está resuelta.');

  const resuelta = await prisma.alerta.update({
    where: { id },
    data: { resuelta: true, resueltaPor: usuarioId, resueltaEn: new Date() },
  });
  await registrarAuditoria({
    usuarioId,
    accion: 'RESOLVER_ALERTA',
    entidad: 'Alerta',
    entidadId: id,
    datosAntes: alerta,
    datosDespues: resuelta,
  });
  return resuelta;
}
