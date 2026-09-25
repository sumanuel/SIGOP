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
