import { z } from 'zod';

export const crearPersonaSchema = z.object({
  nombres: z.string().min(1, 'El nombre es obligatorio').max(100),
  apellidos: z.string().min(1, 'El apellido es obligatorio').max(100),
  fotoUrl: z.string().url().max(500).optional(),
  profesion: z.string().max(150).optional(),
  especialidad: z.string().max(150).optional(),
  aniosExperiencia: z.number().int().nonnegative().optional(),
  bioCorta: z.string().max(500).optional(),
  // Privado: nunca se expone en la API pública (ver obtenerObraDetalle).
  documentoIdentidad: z.string().max(50).optional(),
  consentimientoPublicacion: z.boolean().default(false),
});

export type CrearPersonaInput = z.infer<typeof crearPersonaSchema>;

export const actualizarPersonaSchema = crearPersonaSchema.partial();
export type ActualizarPersonaInput = z.infer<typeof actualizarPersonaSchema>;
