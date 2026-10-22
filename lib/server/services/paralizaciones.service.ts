import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { notificarSuscriptores } from '@/lib/server/services/suscripciones.service';
import { MOTIVO_LEGIBLE, diasEntre, type MotivoParalizacionClave } from '@/lib/paralizacion';
import type { CambioParalizacionInput } from '@/lib/server/validators/paralizacion.schema';

// MODULOS_AVANZADOS.md, módulo 2: una obra puede paralizarse varias veces; cada
// periodo guarda motivo y fechas exactas, en vez de un estatus sin explicación.

/** Regla de negocio de paralizaciones (ya paralizada, sin periodo abierto…); el Route Handler la traduce a su status. */
export class ParalizacionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Los estatus son un catálogo editable: se buscan por nombre (sin distinguir
// mayúsculas) y, si alguien los renombró, se avisa en vez de fallar en silencio.
const ESTATUS_PARALIZADA = 'Paralizada';
const ESTATUS_REACTIVADA = 'En ejecución';

async function estatusPorNombre(nombre: string) {
  const estatus = await prisma.estatusObra.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
  if (!estatus) {
    throw new ParalizacionError(409, `No existe el estatus "${nombre}" en el catálogo; créalo para poder usar esta función.`);
  }
  return estatus;
}

export async function esEstatusParalizada(estatusId: string): Promise<boolean> {
  const estatus = await prisma.estatusObra.findUnique({ where: { id: estatusId }, select: { nombre: true } });
  return estatus?.nombre.toLowerCase() === ESTATUS_PARALIZADA.toLowerCase();
}

export function periodoAbierto<T extends { fechaReactivacion: Date | null }>(periodos: T[]): T | undefined {
  return periodos.find((p) => p.fechaReactivacion === null);
}

/** Suma de días de todos los periodos; el abierto cuenta hasta `hasta` (hoy por defecto). */
export function diasParalizadaTotal(
  periodos: { fechaInicio: Date; fechaReactivacion: Date | null }[],
  hasta = new Date()
): number {
  return periodos.reduce((suma, p) => suma + diasEntre(p.fechaInicio, p.fechaReactivacion ?? hasta), 0);
}

export async function listarPeriodos(obraId: string) {
  return prisma.periodoParalizacion.findMany({ where: { obraId }, orderBy: { fechaInicio: 'desc' } });
}

export async function obtenerEstadoParalizacion(obraId: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: { id: true, nombre: true, estatus: { select: { nombre: true } } },
  });
  if (!obra) return null;
  const periodos = await listarPeriodos(obraId);
  const abierto = periodoAbierto(periodos);
  return {
    obra,
    periodos,
    paralizadaAhora: Boolean(abierto),
    diasTotal: diasParalizadaTotal(periodos),
  };
}

export async function cambiarParalizacion(obraId: string, data: CambioParalizacionInput, usuarioId: string, rol: string) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) return null;

  // Paralizar o reactivar una obra publicada cambia lo que ve el público y avisa
  // a los suscriptores: un editor debe pedírselo a un aprobador.
  if (obra.estadoPublicacion === 'PUBLICADO' && rol === 'EDITOR_OBRA') {
    throw new ParalizacionError(403, 'Esta obra está publicada: pídele a un aprobador que registre la paralización o la reactivación.');
  }

  const ahora = new Date();
  const abierto = await prisma.periodoParalizacion.findFirst({ where: { obraId, fechaReactivacion: null } });

  if (data.accion === 'PARALIZAR') {
    if (abierto) throw new ParalizacionError(409, 'La obra ya está paralizada.');

    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : ahora;
    if (fechaInicio.getTime() > ahora.getTime() + 24 * 60 * 60 * 1000) {
      throw new ParalizacionError(400, 'La fecha de inicio no puede estar en el futuro.');
    }
    const estatus = await estatusPorNombre(ESTATUS_PARALIZADA);

    const periodo = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.periodoParalizacion.create({
        data: { obraId, motivo: data.motivo, descripcion: data.descripcion, fechaInicio, responsableRegistro: usuarioId },
      });
      await tx.obra.update({ where: { id: obraId }, data: { estatusId: estatus.id, actualizadoPor: usuarioId } });
      return nuevo;
    });

    await registrarAuditoria({
      usuarioId,
      accion: 'PARALIZAR',
      entidad: 'Obra',
      entidadId: obraId,
      datosAntes: { estatusId: obra.estatusId },
      datosDespues: { estatusId: estatus.id, periodo },
    });
    void notificarSuscriptores(obraId, { tipo: 'PARALIZADA', motivo: MOTIVO_LEGIBLE[data.motivo].toLowerCase() });
    return periodo;
  }

  if (!abierto) throw new ParalizacionError(409, 'La obra no está paralizada.');

  const fechaReactivacion = data.fechaReactivacion ? new Date(data.fechaReactivacion) : ahora;
  if (fechaReactivacion.getTime() < abierto.fechaInicio.getTime()) {
    throw new ParalizacionError(400, 'La reactivación no puede ser anterior al inicio de la paralización.');
  }
  if (fechaReactivacion.getTime() > ahora.getTime() + 24 * 60 * 60 * 1000) {
    throw new ParalizacionError(400, 'La fecha de reactivación no puede estar en el futuro.');
  }
  const estatus = await estatusPorNombre(ESTATUS_REACTIVADA);

  const periodo = await prisma.$transaction(async (tx) => {
    const cerrado = await tx.periodoParalizacion.update({ where: { id: abierto.id }, data: { fechaReactivacion } });
    await tx.obra.update({ where: { id: obraId }, data: { estatusId: estatus.id, actualizadoPor: usuarioId } });
    return cerrado;
  });

  await registrarAuditoria({
    usuarioId,
    accion: 'REACTIVAR',
    entidad: 'Obra',
    entidadId: obraId,
    datosAntes: { estatusId: obra.estatusId, periodo: abierto },
    datosDespues: { estatusId: estatus.id, periodo },
  });
  void notificarSuscriptores(obraId, { tipo: 'REACTIVADA' });
  return periodo;
}

/**
 * Usada por obras.service al editar/crear una obra: cambiar el estatus a
 * "Paralizada" a mano se rechaza (hay que registrar el motivo), y salir de
 * "Paralizada" cierra el periodo abierto para que el historial no quede incoherente.
 */
export async function validarCambioDeEstatus(obraId: string | null, nuevoEstatusId: string, estatusAnteriorId: string | null, usuarioId: string) {
  if (nuevoEstatusId === estatusAnteriorId) return;

  if (await esEstatusParalizada(nuevoEstatusId)) {
    throw new ParalizacionError(
      400,
      'Para paralizar una obra usa la pantalla "Paralizaciones": el motivo es obligatorio y queda en el historial.'
    );
  }

  if (obraId && estatusAnteriorId && (await esEstatusParalizada(estatusAnteriorId))) {
    const abierto = await prisma.periodoParalizacion.findFirst({ where: { obraId, fechaReactivacion: null } });
    if (abierto) {
      const cerrado = await prisma.periodoParalizacion.update({ where: { id: abierto.id }, data: { fechaReactivacion: new Date() } });
      await registrarAuditoria({
        usuarioId,
        accion: 'REACTIVAR',
        entidad: 'Obra',
        entidadId: obraId,
        datosAntes: { periodo: abierto },
        datosDespues: { periodo: cerrado, motivo: 'estatus cambiado desde la edición de la obra' },
      });
    }
  }
}

export interface ObraParalizadaPublica {
  slug: string;
  nombre: string;
  tipoObra: string;
  estado: string;
  municipio: string;
  avanceFisico: number;
  /** Paralizada hoy (true) o ya reactivada (false). */
  paralizadaAhora: boolean;
  motivoActual: MotivoParalizacionClave | null;
  descripcionActual: string | null;
  desde: Date | null;
  diasActual: number;
  diasTotal: number;
  periodos: number;
}

/**
 * Obras PUBLICADAS que están paralizadas o que lo estuvieron: es contenido de
 * contraloría social, así que documenta con fechas exactas (sin acusar a nadie).
 */
export async function listarObrasParalizadasPublicas(): Promise<ObraParalizadaPublica[]> {
  const obras = await prisma.obra.findMany({
    where: {
      estadoPublicacion: 'PUBLICADO',
      OR: [{ paralizaciones: { some: {} } }, { estatus: { nombre: { equals: ESTATUS_PARALIZADA, mode: 'insensitive' } } }],
    },
    include: {
      paralizaciones: { orderBy: { fechaInicio: 'desc' } },
      tipoObra: { select: { nombre: true } },
      estado: { select: { nombre: true } },
      municipio: { select: { nombre: true } },
      estatus: { select: { nombre: true } },
    },
  });

  const ahora = new Date();
  return obras
    .map((obra) => {
      const abierto = periodoAbierto(obra.paralizaciones);
      const esParalizada = obra.estatus.nombre.toLowerCase() === ESTATUS_PARALIZADA.toLowerCase();
      return {
        slug: obra.slug,
        nombre: obra.nombre,
        tipoObra: obra.tipoObra.nombre,
        estado: obra.estado.nombre,
        municipio: obra.municipio.nombre,
        avanceFisico: obra.avanceFisico,
        paralizadaAhora: Boolean(abierto) || esParalizada,
        motivoActual: (abierto?.motivo as MotivoParalizacionClave | undefined) ?? null,
        descripcionActual: abierto?.descripcion ?? null,
        desde: abierto?.fechaInicio ?? null,
        diasActual: abierto ? diasEntre(abierto.fechaInicio, ahora) : 0,
        diasTotal: diasParalizadaTotal(obra.paralizaciones, ahora),
        periodos: obra.paralizaciones.length,
      };
    })
    .sort((a, b) => Number(b.paralizadaAhora) - Number(a.paralizadaAhora) || b.diasTotal - a.diasTotal);
}
