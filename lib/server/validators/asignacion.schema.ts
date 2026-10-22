import { z } from 'zod';

export const crearAsignacionSchema = z.object({
  personaId: z.string().uuid(),
  cargoId: z.string().uuid(),
  area: z.string().max(100).optional(),
  // id de otra ObraPersonal dentro de la misma obra (jerarquía del organigrama).
  supervisorId: z.string().uuid().optional(),
  fechaIngreso: z.string().datetime().optional(),
  fechaSalida: z.string().datetime().optional(),
  visiblePublico: z.boolean().default(true),
});

export type CrearAsignacionInput = z.infer<typeof crearAsignacionSchema>;

// Zod 4: `.partial()` conserva los `.default()`, así que un PUT sin el campo
// volvería a publicar a quien estaba oculto. Se redeclara sin valor por defecto.
export const actualizarAsignacionSchema = crearAsignacionSchema
  .partial()
  .extend({ visiblePublico: z.boolean().optional() });
export type ActualizarAsignacionInput = z.infer<typeof actualizarAsignacionSchema>;
