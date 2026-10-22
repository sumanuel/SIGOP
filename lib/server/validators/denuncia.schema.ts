import { z } from 'zod';
import { urlHttp } from '@/lib/server/validators/url';
import { CATEGORIAS_DENUNCIA, ESTADOS_DENUNCIA } from '@/lib/denuncia';

export const crearDenunciaSchema = z.object({
  obraSlug: z.string().max(200).optional(),
  categoria: z.enum(CATEGORIAS_DENUNCIA),
  descripcion: z.string().trim().min(30, 'Describe lo ocurrido con al menos 30 caracteres.').max(4000),
  evidenciaUrl: urlHttp('El enlace de evidencia no es válido.').max(500).optional(),
  // Opcional: solo si la persona quiere que la contacten. Se guarda cifrado.
  contacto: z.string().trim().max(200).optional(),
  // Honeypot: un humano no lo ve; si viene lleno se descarta en silencio.
  sitioWeb: z.string().optional(),
});
export type CrearDenunciaInput = z.infer<typeof crearDenunciaSchema>;

export const seguimientoSchema = z.object({ codigo: z.string().min(1).max(40) });

export const cambiarEstadoDenunciaSchema = z.object({
  estado: z.enum(ESTADOS_DENUNCIA as [string, ...string[]]),
  derivadaA: z.string().trim().max(200).optional(),
  // Mensaje para el denunciante; lo verá con su código de seguimiento.
  nota: z.string().trim().max(1000).optional(),
});
export type CambiarEstadoDenunciaInput = z.infer<typeof cambiarEstadoDenunciaSchema>;
