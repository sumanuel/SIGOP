import { z } from 'zod';
import { urlHttp } from '@/lib/server/validators/url';
import { MODALIDADES } from '@/lib/contratacion';

export const crearContratoSchema = z.object({
  contratistaId: z.string().uuid(),
  numeroContrato: z.string().trim().min(1, 'El número de contrato es obligatorio.').max(60),
  modalidad: z.enum(MODALIDADES),
  moneda: z.string().trim().min(1).max(10),
  montoOriginal: z.number().positive('El monto debe ser mayor que cero.'),
  fechaFirma: z.string().datetime(),
  plazoEjecucionDias: z.number().int().min(1, 'El plazo debe ser de al menos 1 día.').max(10000),
  documentoUrl: urlHttp().max(500).optional(),
});
export type CrearContratoInput = z.infer<typeof crearContratoSchema>;

// Solo se corrigen datos descriptivos. El monto original, el plazo y la fecha de
// firma no se editan: los cambios de monto o plazo se registran como adendas.
export const actualizarContratoSchema = z.object({
  numeroContrato: z.string().trim().min(1).max(60).optional(),
  modalidad: z.enum(MODALIDADES).optional(),
  documentoUrl: urlHttp().max(500).nullable().optional(),
});
export type ActualizarContratoInput = z.infer<typeof actualizarContratoSchema>;

export const crearAdendaSchema = z.object({
  motivo: z.string().trim().min(5, 'Explica el motivo de la adenda.').max(500),
  montoNuevo: z.number().positive('El monto debe ser mayor que cero.'),
  diasAdicionales: z.number().int().min(0).max(10000).optional(),
  documentoUrl: urlHttp().max(500).optional(),
});
export type CrearAdendaInput = z.infer<typeof crearAdendaSchema>;
