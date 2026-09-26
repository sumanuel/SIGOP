import { prisma } from '@/lib/server/prisma';

interface RegistrarAuditoriaParams {
  usuarioId?: string | null;
  accion: string; // CREATE, UPDATE, DELETE, PUBLISH, APPROVE...
  entidad: string; // "Obra", "Persona", "Avance"...
  entidadId: string;
  datosAntes?: unknown;
  datosDespues?: unknown;
  ip?: string | null;
}

/** Serializa a JSON plano (Decimal, Date, etc. de Prisma incluidos). */
function aJsonPlano(valor: unknown) {
  if (valor === undefined) return undefined;
  return JSON.parse(JSON.stringify(valor));
}

/**
 * Registra una entrada inmutable en la bitácora de auditoría. Se llama desde
 * cada servicio que crea/modifica/elimina datos (ver PLAN_PROYECTO.md
 * sección 8: "quién cambió qué, cuándo").
 */
export async function registrarAuditoria(params: RegistrarAuditoriaParams) {
  await prisma.auditoria.create({
    data: {
      usuarioId: params.usuarioId ?? undefined,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      datosAntes: aJsonPlano(params.datosAntes),
      datosDespues: aJsonPlano(params.datosDespues),
      ip: params.ip ?? undefined,
    },
  });
}

interface ListarAuditoriaFiltros {
  entidad?: string;
  accion?: string;
  entidadId?: string;
  usuarioId?: string;
  desde?: Date;
  hasta?: Date;
  pagina?: number;
  porPagina?: number;
}

// `Auditoria.usuarioId` es un string suelto (no una relación de Prisma) a
// propósito: un registro de auditoría debe sobrevivir aunque el usuario que
// lo generó sea eliminado más adelante. Por eso el nombre del usuario se
// resuelve aquí con un segundo query en vez de un `include`.
export async function listarAuditoria(filtros: ListarAuditoriaFiltros = {}) {
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const porPagina = Math.min(Math.max(filtros.porPagina ?? 30, 1), 100);

  const where = {
    entidad: filtros.entidad || undefined,
    accion: filtros.accion || undefined,
    entidadId: filtros.entidadId || undefined,
    usuarioId: filtros.usuarioId || undefined,
    createdAt:
      filtros.desde || filtros.hasta
        ? { gte: filtros.desde, lte: filtros.hasta }
        : undefined,
  };

  const [total, filas] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);

  const usuarioIds = [...new Set(filas.map((f) => f.usuarioId).filter((id): id is string => Boolean(id)))];
  const usuarios = usuarioIds.length
    ? await prisma.usuario.findMany({
        where: { id: { in: usuarioIds } },
        select: { id: true, nombre: true, email: true },
      })
    : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));

  return {
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(Math.ceil(total / porPagina), 1),
    entradas: filas.map((f) => ({
      ...f,
      usuario: f.usuarioId ? (usuarioPorId.get(f.usuarioId) ?? null) : null,
    })),
  };
}

/** Valores distintos de `entidad`/`accion` ya registrados, para poblar los
 * filtros del visor sin tener que mantener una lista fija a mano. */
export async function listarValoresDistintosAuditoria() {
  const [entidades, acciones] = await Promise.all([
    prisma.auditoria.findMany({ distinct: ['entidad'], select: { entidad: true }, orderBy: { entidad: 'asc' } }),
    prisma.auditoria.findMany({ distinct: ['accion'], select: { accion: true }, orderBy: { accion: 'asc' } }),
  ]);
  return {
    entidades: entidades.map((e) => e.entidad),
    acciones: acciones.map((a) => a.accion),
  };
}
