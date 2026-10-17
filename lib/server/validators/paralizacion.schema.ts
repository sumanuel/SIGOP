import { z } from 'zod';
import { MOTIVOS_PARALIZACION } from '@/lib/paralizacion';

export const paralizarObraSchema = z.object({
  accion: z.literal('PARALIZAR'),
  motivo: z.enum(MOTIVOS_PARALIZACION),
  descripcion: z.string().max(1000).optional(),
  // Si no viene, se toma "hoy"; permite registrar una paralización que ya empezó antes.
  fechaInicio: z.string().datetime().optional(),
});

export const reactivarObraSchema = z.object({
  accion: z.literal('REACTIVAR'),
  fechaReactivacion: z.string().datetime().optional(),
});

export const cambioParalizacionSchema = z.discriminatedUnion('accion', [paralizarObraSchema, reactivarObraSchema]);
export type CambioParalizacionInput = z.infer<typeof cambioParalizacionSchema>;
