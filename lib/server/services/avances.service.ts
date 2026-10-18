import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearAvanceInput } from '@/lib/server/validators/avance.schema';
import { registrarIntegridad } from '@/lib/server/services/integridad.service';
import { datosSelladosDeAvance } from '@/lib/server/integridad/hash';

export async function listarAvancesDeObra(obraId: string) {
  return prisma.avance.findMany({
    where: { obraId },
    orderBy: { fecha: 'desc' },
  });
}

/**
 * Registra un nuevo avance en el historial (nunca sobrescribe los
 * anteriores — PLAN_PROYECTO.md sección 3.2) y sincroniza el
 * `avanceFisico`/`avanceFinanciero` "actual" de la obra con este último
 * reporte, que es lo que se muestra como cifra principal en la ficha
 * pública y en el círculo de progreso.
 */
export async function crearAvance(
  obraId: string,
  data: CrearAvanceInput,
  ctx: { usuarioId: string; email: string }
) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) return null;

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
        registradoPor: ctx.email,
      },
    });
    await tx.obra.update({
      where: { id: obraId },
      data: {
        avanceFisico: data.avanceFisico,
        avanceFinanciero: data.avanceFinanciero,
        actualizadoPor: ctx.email,
      },
    });
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
    datosDespues: avance,
  });

  return avance;
}
