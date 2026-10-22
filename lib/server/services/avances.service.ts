import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearAvanceInput } from '@/lib/server/validators/avance.schema';
import { registrarIntegridad } from '@/lib/server/services/integridad.service';
import { notificarSuscriptores } from '@/lib/server/services/suscripciones.service';
import { datosSelladosDeAvance } from '@/lib/server/integridad/hash';

export async function listarAvancesDeObra(obraId: string) {
  return prisma.avance.findMany({
    where: { obraId },
    orderBy: { fecha: 'desc' },
  });
}

/**
 * `registradoPor` guarda el id del usuario; los avances anteriores a este
 * criterio guardaron su correo. Resuelve ambos a un nombre, para el panel
 * (nunca debe llegar a una respuesta pública).
 */
export async function nombresDeUsuarios(referencias: (string | null)[]) {
  const refs = [...new Set(referencias.filter((r): r is string => Boolean(r)))];
  const mapa = new Map<string, { id: string; nombre: string }>();
  if (!refs.length) return mapa;
  const usuarios = await prisma.usuario.findMany({
    where: { OR: [{ id: { in: refs } }, { email: { in: refs } }] },
    select: { id: true, nombre: true, email: true },
  });
  for (const u of usuarios) {
    mapa.set(u.id, { id: u.id, nombre: u.nombre });
    mapa.set(u.email, { id: u.id, nombre: u.nombre });
  }
  return mapa;
}

/** Roles que pueden aprobar lo que registra un editor (los mismos que aprueban obras). */
export const ROLES_APROBADORES = ['SUPER_ADMIN', 'ADMIN_ENTE', 'APROBADOR'];

export class AvanceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Registra un nuevo avance en el historial (nunca sobrescribe los
 * anteriores — PLAN_PROYECTO.md sección 3.2).
 *
 * En una obra PUBLICADA, el avance de un editor queda PENDIENTE (`aprobadoEn`
 * nulo): no cambia la cifra pública ni avisa a los suscriptores hasta que un
 * aprobador lo apruebe. En una obra aún no publicada, o si quien lo registra
 * ya es aprobador, se aprueba al instante y sincroniza el
 * `avanceFisico`/`avanceFinanciero` "actual" de la obra.
 */
export async function crearAvance(
  obraId: string,
  data: CrearAvanceInput,
  ctx: { usuarioId: string; rol: string }
) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) return null;

  const pendiente = obra.estadoPublicacion === 'PUBLICADO' && !ROLES_APROBADORES.includes(ctx.rol);
  const ahora = new Date();

  // El avance, la cifra actual de la obra y su sello de integridad se guardan
  // juntos: si algo falla, no queda un avance sin sellar.
  const avance = await prisma.$transaction(async (tx) => {
    const creado = await tx.avance.create({
      data: {
        obraId,
        avanceFisico: data.avanceFisico,
        avanceFinanciero: data.avanceFinanciero,
        comentario: data.comentario,
        fecha: data.fecha ? new Date(data.fecha) : undefined,
        registradoPor: ctx.usuarioId,
        ...(pendiente
          ? {}
          : {
              aprobadoEn: ahora,
              aprobadoPor: obra.estadoPublicacion === 'PUBLICADO' ? ctx.usuarioId : null,
            }),
      },
    });
    if (!pendiente) {
      await tx.obra.update({
        where: { id: obraId },
        data: {
          avanceFisico: data.avanceFisico,
          avanceFinanciero: data.avanceFinanciero,
          actualizadoPor: ctx.usuarioId,
        },
      });
    }
    await registrarIntegridad(tx, {
      entidad: 'Avance',
      entidadId: creado.id,
      obraId,
      accion: 'CREAR',
      datos: datosSelladosDeAvance(creado),
    });
    return creado;
  });

  await registrarAuditoria({
    usuarioId: ctx.usuarioId,
    accion: 'CREATE',
    entidad: 'Avance',
    entidadId: avance.id,
    datosDespues: { ...avance, pendienteDeAprobacion: pendiente },
  });

  // Aviso a los suscriptores en segundo plano: un fallo de correo no afecta al avance ya guardado.
  if (!pendiente) {
    void notificarSuscriptores(obraId, {
      tipo: 'AVANCE',
      avanceFisico: data.avanceFisico,
      avanceFinanciero: data.avanceFinanciero,
    });
  }

  return avance;
}

/** Aprueba un avance pendiente: desde ahora es público y fija la cifra actual de la obra. */
export async function aprobarAvance(avanceId: string, ctx: { usuarioId: string; rol: string }) {
  if (!ROLES_APROBADORES.includes(ctx.rol)) {
    throw new AvanceError(403, 'No tienes permiso para aprobar avances.');
  }
  const avance = await prisma.avance.findUnique({ where: { id: avanceId } });
  if (!avance) return null;
  if (avance.aprobadoEn) throw new AvanceError(409, 'Este avance ya está aprobado.');

  const aprobado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.avance.update({
      where: { id: avanceId },
      data: { aprobadoEn: new Date(), aprobadoPor: ctx.usuarioId },
    });
    // La cifra actual sigue al avance aprobado más reciente por fecha; aprobar
    // uno antiguo no pisa uno posterior.
    const masReciente = await tx.avance.findFirst({
      where: { obraId: avance.obraId, aprobadoEn: { not: null } },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
    if (masReciente?.id === actualizado.id) {
      await tx.obra.update({
        where: { id: avance.obraId },
        data: {
          avanceFisico: actualizado.avanceFisico,
          avanceFinanciero: actualizado.avanceFinanciero,
          actualizadoPor: ctx.usuarioId,
        },
      });
    }
    return { actualizado, esLaCifraActual: masReciente?.id === actualizado.id };
  });

  await registrarAuditoria({
    usuarioId: ctx.usuarioId,
    accion: 'APPROVE',
    entidad: 'Avance',
    entidadId: avanceId,
    datosAntes: { aprobadoEn: null },
    datosDespues: { aprobadoEn: aprobado.actualizado.aprobadoEn, aprobadoPor: ctx.usuarioId },
  });

  if (aprobado.esLaCifraActual) {
    void notificarSuscriptores(avance.obraId, {
      tipo: 'AVANCE',
      avanceFisico: avance.avanceFisico,
      avanceFinanciero: avance.avanceFinanciero,
    });
  }
  return aprobado.actualizado;
}
