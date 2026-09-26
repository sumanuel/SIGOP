import { z } from 'zod';

// Reglas de validación para crear/actualizar una obra desde el panel admin.
// Los campos de geolocalización (lat/lng) se validan aquí pero se escriben
// aparte con SQL crudo (ver prisma/POSTGIS_NOTAS.md) porque Prisma no puede
// escribir geometría directamente.

export const crearObraSchema = z.object({
  codigo: z.string().min(3).max(40),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug solo puede tener minúsculas, números y guiones'),
  nombre: z.string().min(3).max(200),
  descripcion: z.string().max(4000).optional(),

  tipoObraId: z.string().uuid(),
  estatusId: z.string().uuid(),
  enteId: z.string().uuid(),
  contratistaId: z.string().uuid().optional(),
  fuenteFinanciamientoId: z.string().uuid().optional(),

  estadoId: z.string().uuid(),
  municipioId: z.string().uuid(),
  parroquiaId: z.string().uuid().optional(),
  direccion: z.string().max(300).optional(),

  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),

  // Solo para obras lineales (vías, tuberías, tendidos eléctricos). Se
  // guarda como LINESTRING vía `guardarTrazado()` en obras.service.ts.
  trazado: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .optional(),

  presupuestoAprobado: z.number().nonnegative().default(0),
  montoEjecutado: z.number().nonnegative().default(0),
  moneda: z.string().max(10).default('VES'),

  fechaAprobacion: z.string().datetime().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFinEstimada: z.string().datetime().optional(),
  fechaFinReal: z.string().datetime().optional(),

  beneficiarios: z.number().int().nonnegative().optional(),
  capacidadDescripcion: z.string().max(200).optional(),
  destacada: z.boolean().default(false),
});

export type CrearObraInput = z.infer<typeof crearObraSchema>;

// En una actualización todos los campos son opcionales. `estadoPublicacion`
// NO se incluye aquí a propósito: cambiarlo solo es posible a través de
// `cambiarEstadoPublicacionSchema` (ver más abajo), que valida la transición
// contra el estado actual y el rol de quien la pide — así ningún editor
// puede "saltarse" el flujo Borrador → En revisión → Publicado escribiendo
// el campo directamente en este PUT.
export const actualizarObraSchema = crearObraSchema.partial().extend({
  // `null` explícito permite "quitar" el trazado (la obra dejó de ser lineal).
  trazado: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .nullable()
    .optional(),
});

export type ActualizarObraInput = z.infer<typeof actualizarObraSchema>;

// Acciones del flujo de aprobación (PLAN_PROYECTO.md sección 3.2: "Borrador
// → En revisión → Publicado"). Se modela como acciones de una máquina de
// estados, no como "escribe el enum que quieras", para que cada transición
// pueda validar de dónde viene, hacia dónde va y quién tiene permiso.
export const cambiarEstadoPublicacionSchema = z.object({
  accion: z.enum(['ENVIAR_A_REVISION', 'APROBAR', 'RECHAZAR', 'DESPUBLICAR']),
  comentario: z.string().max(500).optional(),
});

export type CambiarEstadoPublicacionInput = z.infer<typeof cambiarEstadoPublicacionSchema>;
