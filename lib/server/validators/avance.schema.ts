import { z } from 'zod';

export const crearAvanceSchema = z.object({
  avanceFisico: z.number().min(0).max(100),
  avanceFinanciero: z.number().min(0).max(100),
  comentario: z.string().max(1000).optional(),
  fecha: z.string().datetime().optional(),
});

export type CrearAvanceInput = z.infer<typeof crearAvanceSchema>;
