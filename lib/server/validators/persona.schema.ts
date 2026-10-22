import { z } from 'zod';
import { urlHttp } from '@/lib/server/validators/url';

export const crearPersonaSchema = z.object({
  nombres: z.string().min(1, 'El nombre es obligatorio').max(100),
  apellidos: z.string().min(1, 'El apellido es obligatorio').max(100),
  fotoUrl: urlHttp().max(500).optional(),
  profesion: z.string().max(150).optional(),
  especialidad: z.string().max(150).optional(),
  aniosExperiencia: z.number().int().nonnegative().optional(),
  bioCorta: z.string().max(500).optional(),
  // Privado: nunca se expone en la API pública (ver obtenerObraDetalle).
  documentoIdentidad: z.string().max(50).optional(),
  consentimientoPublicacion: z.boolean().default(false),
});

export type CrearPersonaInput = z.infer<typeof crearPersonaSchema>;

// Zod 4: `.partial()` conserva los `.default()`, así que un PUT sin el campo
// revocaría el consentimiento. Se redeclara sin valor por defecto.
export const actualizarPersonaSchema = crearPersonaSchema
  .partial()
  .extend({ consentimientoPublicacion: z.boolean().optional() });
export type ActualizarPersonaInput = z.infer<typeof actualizarPersonaSchema>;
