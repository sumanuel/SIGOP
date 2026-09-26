import { prisma } from '@/lib/server/prisma';
import { calcularAtrasoDias } from '@/lib/atraso';

export interface ObraConAtraso {
  id: string;
  codigo: string;
  nombre: string;
  slug: string;
  avanceFisico: number;
  atrasoDias: number;
  estatus: { nombre: string; color: string | null };
}

export interface ActualizacionReciente {
  id: string;
  obraId: string;
  obraNombre: string;
  obraCodigo: string;
  avanceFisico: number;
  comentario: string | null;
  createdAt: Date;
  registradoPor: { id: string; nombre: string } | null;
}

export interface DashboardInterno {
  obrasConAtraso: ObraConAtraso[];
  actualizacionesRecientes: ActualizacionReciente[];
  pendientesAprobacion: number;
}

const LIMITE_OBRAS_ATRASADAS = 10;
const LIMITE_ACTUALIZACIONES = 8;

/**
 * Dashboard interno del panel admin (PLAN_PROYECTO.md sección 3.2, módulo 1:
 * "métricas, obras con atraso, últimas actualizaciones, pendientes por
 * aprobar"). "Obras con atraso" no es un campo guardado — se calcula al
 * vuelo con la misma fórmula que la ficha pública (ver lib/atraso.ts), sobre
 * las obras candidatas (con fecha estimada, sin fecha real de fin, no
 * culminadas al 100%).
 */
export async function obtenerDashboardInterno(): Promise<DashboardInterno> {
  const [obrasCandidatas, avancesRecientes, pendientesAprobacion] = await Promise.all([
    prisma.obra.findMany({
      where: { fechaFinEstimada: { not: null }, fechaFinReal: null, avanceFisico: { lt: 100 } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        slug: true,
        avanceFisico: true,
        fechaFinEstimada: true,
        fechaFinReal: true,
        estatus: { select: { nombre: true, color: true } },
      },
    }),
    prisma.avance.findMany({
      orderBy: { createdAt: 'desc' },
      take: LIMITE_ACTUALIZACIONES,
      select: {
        id: true,
        obraId: true,
        avanceFisico: true,
        comentario: true,
        createdAt: true,
        registradoPor: true,
        obra: { select: { nombre: true, codigo: true } },
      },
    }),
    prisma.obra.count({ where: { estadoPublicacion: 'EN_REVISION' } }),
  ]);

  const obrasConAtraso = obrasCandidatas
    .map((obra) => ({ obra, atrasoDias: calcularAtrasoDias(obra) }))
    .filter((item): item is { obra: (typeof obrasCandidatas)[number]; atrasoDias: number } => (item.atrasoDias ?? 0) > 0)
    .sort((a, b) => b.atrasoDias - a.atrasoDias)
    .slice(0, LIMITE_OBRAS_ATRASADAS)
    .map(({ obra, atrasoDias }) => ({
      id: obra.id,
      codigo: obra.codigo,
      nombre: obra.nombre,
      slug: obra.slug,
      avanceFisico: obra.avanceFisico,
      atrasoDias,
      estatus: obra.estatus,
    }));

  // `registradoPor` es un usuarioId suelto (no una relación de Prisma, mismo
  // motivo que Auditoria.usuarioId — ver auditoria.service.ts): se resuelve
  // el nombre aparte en vez de un `include`.
  const usuarioIds = [...new Set(avancesRecientes.map((a) => a.registradoPor).filter((id): id is string => Boolean(id)))];
  const usuarios = usuarioIds.length
    ? await prisma.usuario.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, nombre: true } })
    : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));

  const actualizacionesRecientes: ActualizacionReciente[] = avancesRecientes.map((a) => ({
    id: a.id,
    obraId: a.obraId,
    obraNombre: a.obra.nombre,
    obraCodigo: a.obra.codigo,
    avanceFisico: a.avanceFisico,
    comentario: a.comentario,
    createdAt: a.createdAt,
    registradoPor: a.registradoPor ? (usuarioPorId.get(a.registradoPor) ?? null) : null,
  }));

  return { obrasConAtraso, actualizacionesRecientes, pendientesAprobacion };
}
