import type { EstadoPublicacion } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { validarCambioDeEstatus } from '@/lib/server/services/paralizaciones.service';
import type {
  CrearObraInput,
  ActualizarObraInput,
  CambiarEstadoPublicacionInput,
} from '@/lib/server/validators/obra.schema';
import type { ObraMapa } from '@/lib/types/obra';

// Los campos `ubicacion`/`trazado` son `Unsupported("geometry...")` en el
// schema: Prisma Client no puede seleccionarlos ni escribirlos, así que todo
// lo relacionado a geometría se resuelve aquí con SQL crudo. Ver
// prisma/POSTGIS_NOTAS.md para el detalle completo de por qué y cómo.

type GeometriaTrazado = { type: string; coordinates: unknown };

interface FilaObraMapa {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  avanceFisico: number;
  presupuestoAprobado: number;
  moneda: string;
  anioAprobacion: number | null;
  estado: string;
  municipio: string;
  tipoObraNombre: string;
  tipoObraColor: string | null;
  tipoObraIcono: string | null;
  estatusNombre: string;
  estatusColor: string | null;
  geojson: { coordinates: [number, number] } | null;
  trazadoGeojson: GeometriaTrazado | null;
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
      o."presupuestoAprobado"::float AS "presupuestoAprobado",
      o.moneda AS moneda,
      EXTRACT(YEAR FROM o."fechaAprobacion")::int AS "anioAprobacion",
      es.nombre AS estado,
      m.nombre AS municipio,
      t.nombre AS "tipoObraNombre",
      t.color AS "tipoObraColor",
      t.icono AS "tipoObraIcono",
      e.nombre AS "estatusNombre",
      e.color AS "estatusColor",
      ST_AsGeoJSON(o.ubicacion)::json AS geojson,
      ST_AsGeoJSON(o.trazado)::json AS "trazadoGeojson"
    FROM obras o
    JOIN tipos_obra t ON t.id = o."tipoObraId"
    JOIN estatus_obra e ON e.id = o."estatusId"
    JOIN municipios m ON m.id = o."municipioId"
    JOIN estados es ON es.id = o."estadoId"
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
      presupuestoAprobado: fila.presupuestoAprobado,
      moneda: fila.moneda,
      anioAprobacion: fila.anioAprobacion,
      estado: fila.estado,
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
      ...extraerTrazado(fila.trazadoGeojson),
    }));
}

/**
 * Soporta LineString (vía, tubería: un único trazado continuo) y Polygon
 * (terreno, urbanismo, parque: solo el anillo exterior). `trazado` es
 * `geometry(Geometry, 4326)` en el schema, sin restricción de subtipo, así
 * que ambos caben sin migrar nada. Del polígono se quita el punto final
 * repetido: el cliente trabaja con los vértices y el cierre se hace al
 * guardar y al dibujar.
 */
function extraerTrazado(geojson: GeometriaTrazado | null): {
  trazado: [number, number][] | null;
  trazadoTipo?: 'LINEA' | 'AREA';
} {
  if (!geojson) return { trazado: null };
  if (geojson.type === 'LineString') {
    return { trazado: geojson.coordinates as [number, number][], trazadoTipo: 'LINEA' };
  }
  if (geojson.type === 'Polygon') {
    const anillo = (geojson.coordinates as [number, number][][])[0] ?? [];
    return { trazado: anillo.slice(0, -1), trazadoTipo: 'AREA' };
  }
  return { trazado: null };
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
  paralizaciones: { orderBy: { fechaInicio: 'desc' as const } },
  contrato: { include: { adendas: { orderBy: { numero: 'asc' as const } } } },
  hitos: { orderBy: { orden: 'asc' as const } },
  multimedia: { orderBy: { orden: 'asc' as const } },
  personal: {
    include: {
      // Otras obras de la persona (perfil público): solo asignaciones visibles
      // en obras PUBLICADAS; la obra actual se descarta al armar la respuesta.
      persona: {
        include: {
          asignaciones: {
            where: { visiblePublico: true, obra: { estadoPublicacion: 'PUBLICADO' as const } },
            include: { obra: { select: { id: true, nombre: true, slug: true } }, cargo: { select: { nombre: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      cargo: true,
    },
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

  const [geoRow] = await prisma.$queryRaw<
    {
      geojson: { coordinates: [number, number] } | null;
      trazadoGeojson: GeometriaTrazado | null;
    }[]
  >`
    SELECT
      ST_AsGeoJSON(ubicacion)::json AS geojson,
      ST_AsGeoJSON(trazado)::json AS "trazadoGeojson"
    FROM obras WHERE id = ${obra.id}
  `;
  const coords = geoRow?.geojson?.coordinates;
  const { trazado, trazadoTipo } = extraerTrazado(geoRow?.trazadoGeojson ?? null);

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
              otrasObras: asignacion.persona.asignaciones
                .filter((otra) => otra.obra.id !== obra.id)
                .map((otra) => ({ nombre: otra.obra.nombre, slug: otra.obra.slug, cargo: otra.cargo.nombre })),
            }
          : null,
      };
    });

  const detalle = {
    ...obra,
    personal,
    lat: coords?.[1] ?? null,
    lng: coords?.[0] ?? null,
    trazado,
    trazadoTipo,
  };
  return opts.soloPublicado ? sinDatosPrivados(detalle) : detalle;
}

/**
 * Proyección pública: la ficha y `GET /api/obras/[id]` salen del mismo objeto
 * que usa el panel, así que aquí se vacían los datos que nunca deben publicarse
 * (contacto del contratista, autores internos, GPS del EXIF). Se anulan en vez
 * de borrarlos para conservar la forma del tipo.
 */
function sinDatosPrivados<T extends {
  contratista: { contacto: string | null; telefono: string | null; email: string | null } | null;
  avances: { registradoPor: string | null }[];
  paralizaciones: { responsableRegistro: string | null }[];
  multimedia: { latitudExif: number | null; longitudExif: number | null }[];
  contrato: { creadoPor: string | null } | null;
  creadoPor: string | null;
  actualizadoPor: string | null;
}>(obra: T): T {
  return {
    ...obra,
    creadoPor: null,
    actualizadoPor: null,
    contratista: obra.contratista && { ...obra.contratista, contacto: null, telefono: null, email: null },
    avances: obra.avances.map((a) => ({ ...a, registradoPor: null })),
    paralizaciones: obra.paralizaciones.map((p) => ({ ...p, responsableRegistro: null })),
    multimedia: obra.multimedia.map((m) => ({ ...m, latitudExif: null, longitudExif: null })),
    contrato: obra.contrato && { ...obra.contrato, creadoPor: null },
  };
}

/**
 * Guarda el trazado como WKT `LINESTRING(...)` o `POLYGON((...))`. Los puntos
 * ya vienen validados como números por Zod (`crearObraSchema`), así que
 * interpolarlos en el WKT es seguro — Prisma sigue parametrizando el WKT
 * completo como texto; PostGIS es quien lo interpreta del lado del servidor
 * con `ST_GeomFromText`. Un polígono se cierra repitiendo el primer vértice.
 */
async function guardarTrazado(obraId: string, puntos: [number, number][], tipo: 'LINEA' | 'AREA' = 'LINEA') {
  const lista = (pts: [number, number][]) => pts.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  const wkt =
    tipo === 'AREA' ? `POLYGON((${lista([...puntos, puntos[0]])}))` : `LINESTRING(${lista(puntos)})`;
  await prisma.$executeRaw`
    UPDATE obras
    SET trazado = ST_SetSRID(ST_GeomFromText(${wkt}), 4326)
    WHERE id = ${obraId}
  `;
}

interface CrearObraContext {
  usuarioId: string;
}

/** Crea una obra en estado BORRADOR (el flujo de aprobación la publica luego). */
export async function crearObra(data: CrearObraInput, ctx: CrearObraContext) {
  // Una obra no puede nacer "Paralizada": el motivo se registra aparte.
  await validarCambioDeEstatus(null, data.estatusId, null, ctx.usuarioId);

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

  if (data.trazado && data.trazado.length >= 2) {
    await guardarTrazado(obra.id, data.trazado, data.trazadoTipo);
  }

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

  const { lat, lng, trazado, trazadoTipo, ...campos } = data;

  if (campos.estatusId) {
    await validarCambioDeEstatus(id, campos.estatusId, obraAntes.estatusId, ctx.usuarioId);
  }

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

  if (trazado !== undefined) {
    if (trazado === null || trazado.length < 2) {
      // Se permite "quitar" el trazado (ej. la obra dejó de ser lineal).
      await prisma.$executeRaw`UPDATE obras SET trazado = NULL WHERE id = ${obra.id}`;
    } else {
      await guardarTrazado(obra.id, trazado, trazadoTipo);
    }
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

/** Lanzado cuando la acción pedida no aplica al estado actual de la obra o
 * al rol de quien la pide — el Route Handler la traduce a un 409/403. */
export class TransicionInvalidaError extends Error {}

interface Transicion {
  desde: EstadoPublicacion;
  hacia: EstadoPublicacion;
  // Roles que además de SUPER_ADMIN pueden ejecutar esta transición.
  rolesPermitidos: string[];
}

// Máquina de estados del flujo Borrador → En revisión → Publicado
// (PLAN_PROYECTO.md sección 3.2). Cada acción solo es válida desde un
// estado concreto: esto es lo que impide que un editor "salte" directo a
// Publicado, o que alguien sin rol de aprobador publique su propio trabajo.
const TRANSICIONES: Record<CambiarEstadoPublicacionInput['accion'], Transicion> = {
  ENVIAR_A_REVISION: {
    desde: 'BORRADOR',
    hacia: 'EN_REVISION',
    rolesPermitidos: ['ADMIN_ENTE', 'EDITOR_OBRA'],
  },
  APROBAR: {
    desde: 'EN_REVISION',
    hacia: 'PUBLICADO',
    rolesPermitidos: ['ADMIN_ENTE', 'APROBADOR'],
  },
  RECHAZAR: {
    desde: 'EN_REVISION',
    hacia: 'BORRADOR',
    rolesPermitidos: ['ADMIN_ENTE', 'APROBADOR'],
  },
  DESPUBLICAR: {
    desde: 'PUBLICADO',
    hacia: 'BORRADOR',
    rolesPermitidos: ['ADMIN_ENTE'],
  },
};

interface CambiarEstadoPublicacionContext {
  usuarioId: string;
  rol: string;
}

export async function cambiarEstadoPublicacion(
  id: string,
  input: CambiarEstadoPublicacionInput,
  ctx: CambiarEstadoPublicacionContext
) {
  const transicion = TRANSICIONES[input.accion];

  if (ctx.rol !== 'SUPER_ADMIN' && !transicion.rolesPermitidos.includes(ctx.rol)) {
    throw new TransicionInvalidaError('No tienes permiso para realizar esta acción de publicación.');
  }

  const obraAntes = await prisma.obra.findUnique({ where: { id } });
  if (!obraAntes) return null;

  if (obraAntes.estadoPublicacion !== transicion.desde) {
    throw new TransicionInvalidaError(
      `La obra está en "${obraAntes.estadoPublicacion}"; la acción "${input.accion}" requiere que esté en "${transicion.desde}".`
    );
  }

  const obra = await prisma.obra.update({
    where: { id },
    data: { estadoPublicacion: transicion.hacia, actualizadoPor: ctx.usuarioId },
  });

  await registrarAuditoria({
    usuarioId: ctx.usuarioId,
    accion: input.accion,
    entidad: 'Obra',
    entidadId: obra.id,
    datosAntes: obraAntes,
    datosDespues: input.comentario ? { ...obra, comentario: input.comentario } : obra,
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
