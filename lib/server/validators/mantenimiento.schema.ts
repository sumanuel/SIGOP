import { z } from 'zod';
import { urlHttp } from '@/lib/server/validators/url';
import { TIPOS_INTERVENCION } from '@/lib/mantenimiento';

export const garantiaSchema = z
  .object({
    fechaInicioGarantia: z.string().datetime(),
    fechaFinGarantia: z.string().datetime(),
    cubreEstructura: z.boolean(),
    cubreInstalaciones: z.boolean(),
    observaciones: z.string().trim().max(500).nullish(),
  })
  .refine((g) => new Date(g.fechaFinGarantia).getTime() > new Date(g.fechaInicioGarantia).getTime(), {
    message: 'La garantía debe terminar después de su fecha de inicio.',
    path: ['fechaFinGarantia'],
  });
export type GarantiaInput = z.infer<typeof garantiaSchema>;

export const crearIntervencionSchema = z.object({
  fecha: z.string().datetime().optional(),
  tipo: z.enum(TIPOS_INTERVENCION),
  descripcion: z.string().trim().min(10, 'Describe el trabajo realizado (mínimo 10 caracteres).').max(1000),
  costo: z.number().nonnegative().optional(),
  moneda: z.string().trim().min(1).max(10).default('VES'),
  realizadoPor: z.string().trim().max(150).optional(),
  fotoAntesUrl: urlHttp().max(500).optional(),
  fotoDespuesUrl: urlHttp().max(500).optional(),
});
export type CrearIntervencionInput = z.infer<typeof crearIntervencionSchema>;
