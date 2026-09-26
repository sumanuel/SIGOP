import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import {
  tipoObraSchema,
  estatusObraSchema,
  enteSchema,
  contratistaSchema,
  fuenteFinanciamientoSchema,
  cargoSchema,
} from '@/lib/server/validators/catalogo.schema';

/**
 * Todos los catálogos que necesita el formulario de obra (crear/editar) y,
 * a futuro, los filtros del portal público. Sin datos sensibles — nombres
 * de catálogo, no información personal — así que no requiere autenticación.
 */
export async function obtenerCatalogos() {
  const [tiposObra, estatusObra, entes, contratistas, fuentesFinanciamiento, estados, municipios, parroquias] =
    await Promise.all([
      prisma.tipoObra.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.estatusObra.findMany({ orderBy: { orden: 'asc' } }),
      prisma.ente.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.contratista.findMany({ orderBy: { razonSocial: 'asc' } }),
      prisma.fuenteFinanciamiento.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.estado.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, codigo: true } }),
      prisma.municipio.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, estadoId: true },
      }),
      prisma.parroquia.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, municipioId: true },
      }),
    ]);

  return { tiposObra, estatusObra, entes, contratistas, fuentesFinanciamiento, estados, municipios, parroquias };
}

export type Catalogos = Awaited<ReturnType<typeof obtenerCatalogos>>;

// ========================================
// CRUD de catálogos desde el panel admin (PLAN_PROYECTO.md sección 3.2,
// módulo 6). Los 6 catálogos son tablas planas con la misma forma de
// operaciones (listar/crear/actualizar/eliminar), así que en vez de repetir
// esa lógica 6 veces se resuelve con una tabla de configuración por
// "recurso" (el slug usado en la URL) y funciones genéricas que la leen.
// Reservado a SUPER_ADMIN — ver tabla de roles del plan ("catálogos" es
// permiso exclusivo del super administrador).
// ========================================

// Los delegados de Prisma no comparten un tipo común lo bastante preciso
// como para tipar esto sin `any` en la firma interna; los seis wrappers
// exportados abajo sí quedan con el tipo de entrada correcto (el que infiere
// cada schema de Zod), que es lo que de verdad usan los Route Handlers.
type DelegadoCatalogo = {
  findMany: (args?: { orderBy?: unknown }) => Promise<{ id: string }[]>;
  findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  create: (args: { data: unknown }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<{ id: string }>;
};

// `campoObraEnUso`: solo se declara para los catálogos cuya FK en `Obra` es
// `onDelete: SetNull` (contratista, fuenteFinanciamiento) — a diferencia de
// los otros 4, que son `onDelete: Restrict` y ya hacen que Postgres rechace
// el DELETE por sí solo (ver P2003 en prisma-error.ts). Sin este chequeo
// explícito, borrar un contratista en uso desasignaría silenciosamente esa
// obra en vez de bloquear el borrado — inaceptable en un sistema de control
// de obras públicas.
const RECURSOS_CATALOGO = {
  'tipos-obra': {
    entidadAuditoria: 'TipoObra',
    etiqueta: 'el tipo de obra',
    schema: tipoObraSchema,
    delegado: prisma.tipoObra as unknown as DelegadoCatalogo,
    orderBy: { nombre: 'asc' },
    campoObraEnUso: null,
  },
  'estatus-obra': {
    entidadAuditoria: 'EstatusObra',
    etiqueta: 'el estatus de obra',
    schema: estatusObraSchema,
    delegado: prisma.estatusObra as unknown as DelegadoCatalogo,
    orderBy: { orden: 'asc' },
    campoObraEnUso: null,
  },
  entes: {
    entidadAuditoria: 'Ente',
    etiqueta: 'el ente',
    schema: enteSchema,
    delegado: prisma.ente as unknown as DelegadoCatalogo,
    orderBy: { nombre: 'asc' },
    campoObraEnUso: null,
  },
  contratistas: {
    entidadAuditoria: 'Contratista',
    etiqueta: 'el contratista',
    schema: contratistaSchema,
    delegado: prisma.contratista as unknown as DelegadoCatalogo,
    orderBy: { razonSocial: 'asc' },
    campoObraEnUso: 'contratistaId' as const,
  },
  'fuentes-financiamiento': {
    entidadAuditoria: 'FuenteFinanciamiento',
    etiqueta: 'la fuente de financiamiento',
    schema: fuenteFinanciamientoSchema,
    delegado: prisma.fuenteFinanciamiento as unknown as DelegadoCatalogo,
    orderBy: { nombre: 'asc' },
    campoObraEnUso: 'fuenteFinanciamientoId' as const,
  },
  cargos: {
    entidadAuditoria: 'Cargo',
    etiqueta: 'el cargo',
    schema: cargoSchema,
    delegado: prisma.cargo as unknown as DelegadoCatalogo,
    orderBy: { nombre: 'asc' },
    campoObraEnUso: null,
  },
} as const;

export type RecursoCatalogo = keyof typeof RECURSOS_CATALOGO;

export function esRecursoCatalogo(valor: string): valor is RecursoCatalogo {
  return Object.prototype.hasOwnProperty.call(RECURSOS_CATALOGO, valor);
}

export function obtenerSchemaCatalogo(recurso: RecursoCatalogo) {
  return RECURSOS_CATALOGO[recurso].schema;
}

export function etiquetaCatalogo(recurso: RecursoCatalogo) {
  return RECURSOS_CATALOGO[recurso].etiqueta;
}

export async function listarRegistrosCatalogo(recurso: RecursoCatalogo) {
  const config = RECURSOS_CATALOGO[recurso];
  return config.delegado.findMany({ orderBy: config.orderBy });
}

export async function crearRegistroCatalogo(recurso: RecursoCatalogo, data: unknown, usuarioId: string) {
  const config = RECURSOS_CATALOGO[recurso];
  const registro = await config.delegado.create({ data });
  await registrarAuditoria({
    usuarioId,
    accion: 'CREATE',
    entidad: config.entidadAuditoria,
    entidadId: registro.id,
    datosDespues: registro,
  });
  return registro;
}

export async function actualizarRegistroCatalogo(
  recurso: RecursoCatalogo,
  id: string,
  data: unknown,
  usuarioId: string
) {
  const config = RECURSOS_CATALOGO[recurso];
  const antes = await config.delegado.findUnique({ where: { id } });
  const registro = await config.delegado.update({ where: { id }, data });
  await registrarAuditoria({
    usuarioId,
    accion: 'UPDATE',
    entidad: config.entidadAuditoria,
    entidadId: id,
    datosAntes: antes,
    datosDespues: registro,
  });
  return registro;
}

/** Lanzado cuando un catálogo con FK `onDelete: SetNull` está en uso — ver
 * el comentario sobre `campoObraEnUso` más arriba. */
export class RegistroEnUsoError extends Error {}

export async function eliminarRegistroCatalogo(recurso: RecursoCatalogo, id: string, usuarioId: string) {
  const config = RECURSOS_CATALOGO[recurso];

  if (config.campoObraEnUso) {
    const enUso = await prisma.obra.count({ where: { [config.campoObraEnUso]: id } });
    if (enUso > 0) {
      throw new RegistroEnUsoError(
        `No se puede eliminar: ${config.etiqueta} está en uso por ${enUso} obra(s).`
      );
    }
  }

  const registro = await config.delegado.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: config.entidadAuditoria,
    entidadId: id,
    datosAntes: registro,
  });
  return registro;
}
