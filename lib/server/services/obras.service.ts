import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import type { CrearObraInput, ActualizarObraInput } from '@/lib/server/validators/obra.schema';
import type { ObraMapa } from '@/lib/types/obra';

// Los campos `ubicacion`/`trazado` son `Unsupported("geometry...")` en el
// schema: Prisma Client no puede seleccionarlos ni escribirlos, así que todo
// lo relacionado a geometría se resuelve aquí con SQL crudo. Ver
// prisma/POSTGIS_NOTAS.md para el detalle completo de por qué y cómo.

interface FilaObraMapa {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  avanceFisico: number;
  municipio: string;
  tipoObraNombre: string;
  tipoObraColor: string | null;
  tipoObraIcono: string | null;
  estatusNombre: string;
  estatusColor: string | null;
  geojson: { coordinates: [number, number] } | null;
}

/** Obras publicadas con su ubicación, listas para pintar en el mapa. */
export async function listarObrasParaMapa(): Promise<ObraMapa[]> {
  const filas = await prisma.$queryRaw<FilaObraMapa[]>`
    SELECT
      o.id,
      o.codigo,
      o.slug,
      o.nombre,
      o."avanceFisico" AS "avanceFisico",
      m.nombre AS municipio,
      t.nombre AS "tipoObraNombre",
      t.color AS "tipoObraColor",
      t.icono AS "tipoObraIcono",
      e.nombre AS "estatusNombre",
      e.color AS "estatusColor",
      ST_AsGeoJSON(o.ubicacion)::json AS geojson
    FROM obras o
    JOIN tipos_obra t ON t.id = o."tipoObraId"
    JOIN estatus_obra e ON e.id = o."estatusId"
    JOIN municipios m ON m.id = o."municipioId"
    WHERE o."estadoPublicacion" = 'PUBLICADO'
      AND o.ubicacion IS NOT NULL
    ORDER BY o."createdAt" DESC
  `;

  return filas
    .filter((fila): fila is FilaObraMapa & { geojson: { coordinates: [number, number] } } =>
      Boolean(fila.geojson)
    )
    .map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      slug: fila.slug,
      nombre: fila.nombre,
      avanceFisico: fila.avanceFisico,
      municipio: fila.municipio,
      tipoObra: {
        nombre: fila.tipoObraNombre,
        color: fila.tipoObraColor ?? '#6B7280',
        icono: fila.tipoObraIcono ?? 'building',
      },
      estatus: {
        nombre: fila.estatusNombre,
        color: fila.estatusColor ?? '#94A3B8',
      },
      lng: fila.geojson.coordinates[0],
      lat: fila.geojson.coordinates[1],
    }));
}

/** Listado para la tabla del panel admin: todas las obras, cualquier estado de publicación. */
export async function listarObrasAdmin() {
  return prisma.obra.findMany({
    include: {
      tipoObra: { select: { nombre: true } },
      estatus: { select: { nombre: true, color: true } },
      municipio: { select: { nombre: true } },
      estado: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

const INCLUDE_DETALLE = {
  tipoObra: true,
  estatus: true,
  ente: true,
  contratista: true,
  fuenteFinanciamiento: true,
  estado: true,
  municipio: true,
  parroquia: true,
  avances: { orderBy: { fecha: 'desc' as const } },
  hitos: { orderBy: { orden: 'asc' as const } },
  multimedia: { orderBy: { orden: 'asc' as const } },
  personal: {
    include: { persona: true, cargo: true },
  },
  // Solo aprobados: los pendientes/rechazados se moderan en /admin/reportes,
  // nunca llegan a la ficha pública. No se selecciona `correo` (privado).
  reportesCiudadanos: {
    where: { estadoModeracion: 'APROBADO' as const },
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, nombre: true, mensaje: true, fotoUrl: true, createdAt: true },
  },
};

interface ObtenerObraDetalleOpts {
  /** true en el portal público: oculta obras que no estén PUBLICADO. */
  soloPublicado?: boolean;
}

/**
 * Busca una obra por id o por slug (el panel admin navega por id, el portal
 * público por slug — se resuelven ambos con un solo `OR` para no duplicar
 * rutas). Aplica la regla de privacidad del personal: sin consentimiento
 * explícito, solo se expone el cargo, nunca el nombre/foto/datos de la
 * persona (ver PLAN_PROYECTO.md sección 8).
 */
export async function obtenerObraDetalle(idOrSlug: string, opts: ObtenerObraDetalleOpts = {}) {
  const obra = await prisma.obra.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: INCLUDE_DETALLE,
  });

  if (!obra) return null;
  if (opts.soloPublicado && obra.estadoPublicacion !== 'PUBLICADO') return null;

  const [ubicacionRow] = await prisma.$queryRaw<{ geojson: { coordinates: [number, number] } | null }[]>`
    SELECT ST_AsGeoJSON(ubicacion)::json AS geojson FROM obras WHERE id = ${obra.id}
  `;
  const coords = ubicacionRow?.geojson?.coordinates;

  const personal = obra.personal
    .filter((asignacion) => asignacion.visiblePublico || !opts.soloPublicado)
    .map((asignacion) => {
      const mostrarIdentidad =
        asignacion.visiblePublico && asignacion.persona.consentimientoPublicacion;

      return {
        id: asignacion.id,
        cargo: asignacion.cargo.nombre,
        nivelJerarquico: asignacion.cargo.nivelJerarquico,
        area: asignacion.area,
        supervisorId: asignacion.supervisorId,
        fechaIngreso: asignacion.fechaIngreso,
        // Sin consentimiento explícito: solo se ve el cargo, nunca la
        // identidad de la persona (ni siquiera en el panel admin se debería
        // publicar sin este flag — la restricción vive en el dato, no en la vista).
        persona: mostrarIdentidad
          ? {
              nombreCompleto: `${asignacion.persona.nombres} ${asignacion.persona.apellidos}`,
              fotoUrl: asignacion.persona.fotoUrl,
              profesion: asignacion.persona.profesion,
              especialidad: asignacion.persona.especialidad,
              aniosExperiencia: asignacion.persona.aniosExperiencia,
              bioCorta: asignacion.persona.bioCorta,
            }
          : null,
      };
    });

  return {
    ...obra,
    personal,
    lat: coords?.[1] ?? null,
    lng: coords?.[0] ?? null,
  };
}

interface CrearObraContext {
  usuarioId: string;
}

/** Crea una obra en estado BORRADOR (el flujo de aprobación la publica luego). */
export async function crearObra(data: CrearObraInput, ctx: CrearObraContext) {
  const obra = await prisma.obra.create({
    data: {
      codigo: data.codigo,
      slug: data.slug,
      nombre: data.nombre,
      descripcion: data.descripcion,
      tipoObraId: data.tipoObraId,
      estatusId: data.estatusId,
      enteId: data.enteId,
      contratistaId: data.contratistaId,
      fuenteFinanciamientoId: data.fuenteFinanciamientoId,
      estadoId: data.estadoId,
      municipioId: data.municipioId,
      parroquiaId: data.parroquiaId,
      direccion: data.direccion,
      presupuestoAprobado: data.presupuestoAprobado,
      montoEjecutado: data.montoEjecutado,
      moneda: data.moneda,
      fechaAprobacion: data.fechaAprobacion ? new Date(data.fechaAprobacion) : undefined,
      fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
      fechaFinEstimada: data.fechaFinEstimada ? new Date(data.fechaFinEstimada) : undefined,
      fechaFinReal: data.fechaFinReal ? new Date(data.fechaFinReal) : undefined,
      beneficiarios: data.beneficiarios,
      capacidadDescripcion: data.capacidadDescripcion,
      destacada: data.destacada,
      creadoPor: ctx.usuarioId,
      actualizadoPor: ctx.usuarioId,
      estadoPublicacion: 'BORRADOR',
    },
  });

  await prisma.$executeRaw`
    UPDATE obras
    SET ubicacion = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)
    WHERE id = ${obra.id}
  `;

  await registrarAuditoria({
    usuarioId: ctx.usuarioId,
    accion: 'CREATE',
    entidad: 'Obra',
    entidadId: obra.id,
    datosDespues: obra,
  });

  return obra;
}

interface ActualizarObraContext {
  usuarioId: string;
}

export async function actualizarObra(id: string, data: ActualizarObraInput, ctx: ActualizarObraContext) {
  const obraAntes = await prisma.obra.findUnique({ where: { id } });
  if (!obraAntes) return null;

  const { lat, lng, ...campos } = data;

  const obra = await prisma.obra.update({
    where: { id },
    data: {
      ...campos,
      fechaAprobacion: campos.fechaAprobacion ? new Date(campos.fechaAprobacion) : undefined,
      fechaInicio: campos.fechaInicio ? new Date(campos.fechaInicio) : undefined,
      fechaFinEstimada: campos.fechaFinEstimada ? new Date(campos.fechaFinEstimada) : undefined,
      fechaFinReal: campos.fechaFinReal ? new Date(campos.fechaFinReal) : undefined,
      actualizadoPor: ctx.usuarioId,
    },
  });

  if (lat !== undefined && lng !== undefined) {
    await prisma.$executeRaw`
      UPDATE obras
      SET ubicacion = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      WHERE id = ${obra.id}
    `;
  }

  await registrarAuditoria({
    usuarioId: ctx.usuarioId,
    accion: 'UPDATE',
    entidad: 'Obra',
    entidadId: obra.id,
    datosAntes: obraAntes,
    datosDespues: obra,
  });

  return obra;
}

export async function eliminarObra(id: string, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id } });
  if (!obra) return null;

  await prisma.obra.delete({ where: { id } });

  await registrarAuditoria({
    usuarioId,
    accion: 'DELETE',
    entidad: 'Obra',
    entidadId: id,
    datosAntes: obra,
  });

  return obra;
}
