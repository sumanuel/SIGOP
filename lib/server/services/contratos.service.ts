import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type {
  ActualizarContratoInput,
  CrearAdendaInput,
  CrearContratoInput,
} from '@/lib/server/validators/contrato.schema';

/** Regla de negocio de contratos (ya tiene contrato, número repetido…); el Route Handler la traduce a su status. */
export class ContratoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ROLES_CONTRATOS = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA'];

export async function obtenerContratoDeObra(obraId: string) {
  return prisma.contrato.findUnique({
    where: { obraId },
    include: {
      contratista: { select: { id: true, razonSocial: true, rif: true } },
      adendas: { orderBy: { numero: 'asc' } },
    },
  });
}

export async function crearContrato(obraId: string, data: CrearContratoInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true, contratistaId: true } });
  if (!obra) throw new ContratoError(404, 'Obra no encontrada.');

  if (await prisma.contrato.findUnique({ where: { obraId }, select: { id: true } })) {
    throw new ContratoError(409, 'Esta obra ya tiene un contrato. Los cambios se registran como adendas.');
  }
  if (!(await prisma.contratista.findUnique({ where: { id: data.contratistaId }, select: { id: true } }))) {
    throw new ContratoError(400, 'El contratista seleccionado no existe.');
  }

  try {
    const contrato = await prisma.$transaction(async (tx) => {
      const creado = await tx.contrato.create({
        data: {
          obraId,
          contratistaId: data.contratistaId,
          numeroContrato: data.numeroContrato,
          modalidad: data.modalidad,
          moneda: data.moneda,
          montoOriginal: data.montoOriginal,
          montoActual: data.montoOriginal,
          fechaFirma: new Date(data.fechaFirma),
          plazoEjecucionDias: data.plazoEjecucionDias,
          documentoUrl: data.documentoUrl,
          creadoPor: usuarioId,
        },
      });
      // El contratista del contrato es el de la obra: se mantiene sincronizado
      // para que la ficha y el historial del contratista coincidan.
      if (obra.contratistaId !== data.contratistaId) {
        await tx.obra.update({ where: { id: obraId }, data: { contratistaId: data.contratistaId, actualizadoPor: usuarioId } });
      }
      return creado;
    });

    await registrarAuditoria({ usuarioId, accion: 'CREATE', entidad: 'Contrato', entidadId: contrato.id, datosDespues: contrato });
    return contrato;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ContratoError(409, 'Ya existe un contrato con ese número.');
    }
    throw error;
  }
}

export async function actualizarContrato(id: string, data: ActualizarContratoInput, usuarioId: string) {
  const antes = await prisma.contrato.findUnique({ where: { id } });
  if (!antes) throw new ContratoError(404, 'Contrato no encontrado.');

  try {
    const despues = await prisma.contrato.update({ where: { id }, data });
    await registrarAuditoria({ usuarioId, accion: 'UPDATE', entidad: 'Contrato', entidadId: id, datosAntes: antes, datosDespues: despues });
    return despues;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ContratoError(409, 'Ya existe un contrato con ese número.');
    }
    throw error;
  }
}

/**
 * Registra una adenda: nunca sobrescribe el contrato original, solo mueve el
 * monto actual y suma días al plazo. Quedan el monto anterior y el nuevo en la
 * propia adenda, y la numeración es correlativa.
 */
export async function agregarAdenda(contratoId: string, data: CrearAdendaInput, usuarioId: string) {
  const dias = data.diasAdicionales ?? 0;

  const resultado = await prisma
    .$transaction(async (tx) => {
    const contrato = await tx.contrato.findUnique({ where: { id: contratoId }, include: { adendas: { select: { numero: true } } } });
    if (!contrato) throw new ContratoError(404, 'Contrato no encontrado.');

    const montoAnterior = Number(contrato.montoActual);
    if (data.montoNuevo === montoAnterior && dias === 0) {
      throw new ContratoError(400, 'La adenda debe cambiar el monto o ampliar el plazo.');
    }

    const numero = contrato.adendas.reduce((max, a) => Math.max(max, a.numero), 0) + 1;
    const adenda = await tx.contratoAdenda.create({
      data: {
        contratoId,
        numero,
        motivo: data.motivo,
        montoAnterior,
        montoNuevo: data.montoNuevo,
        diasAdicionales: dias,
        documentoUrl: data.documentoUrl,
        registradoPor: usuarioId,
      },
    });
    await tx.contrato.update({ where: { id: contratoId }, data: { montoActual: data.montoNuevo } });
    return adenda;
    })
    .catch((error) => {
      // Dos adendas a la vez pueden pedir el mismo número correlativo: la segunda reintenta.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ContratoError(409, 'Otra adenda se registró al mismo tiempo. Vuelve a intentarlo.');
      }
      throw error;
    });

  await registrarAuditoria({ usuarioId, accion: 'CREATE', entidad: 'ContratoAdenda', entidadId: resultado.id, datosDespues: resultado });
  return resultado;
}
