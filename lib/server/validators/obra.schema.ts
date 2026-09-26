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

// En una actualización todos los campos son opcionales, más el estatus de
// publicación (parte del flujo Borrador → En revisión → Publicado).
export const actualizarObraSchema = crearObraSchema.partial().extend({
  estadoPublicacion: z.enum(['BORRADOR', 'EN_REVISION', 'PUBLICADO']).optional(),
  // `null` explícito permite "quitar" el trazado (la obra dejó de ser lineal).
  trazado: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .nullable()
    .optional(),
});

export type ActualizarObraInput = z.infer<typeof actualizarObraSchema>;
