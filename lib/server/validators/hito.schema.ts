import { z } from 'zod';

export const crearHitoSchema = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(150),
  fechaPlanificada: z.string().datetime().nullish(),
  fechaReal: z.string().datetime().nullish(),
  completado: z.boolean().default(false),
});
export type CrearHitoInput = z.infer<typeof crearHitoSchema>;

// Zod 4: `.partial()` conserva los `.default()`; sin redeclarar `completado`, un PUT sin
// ese campo marcaría el hito como pendiente.
export const actualizarHitoSchema = crearHitoSchema.partial().extend({ completado: z.boolean().optional() });
export type ActualizarHitoInput = z.infer<typeof actualizarHitoSchema>;

export const moverHitoSchema = z.object({ direccion: z.enum(['arriba', 'abajo']) });
