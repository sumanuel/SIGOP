import { z } from 'zod';
import { ROLES_USUARIO } from '@/lib/rol-legible';

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(2).max(150),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(ROLES_USUARIO),
  enteId: z.string().uuid().optional(),
});
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;

// En edición todo es opcional; `password` ausente significa "no cambiarla"
// (ver usuarios.service.ts) — nunca se re-expone la existente.
export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(2).max(150).optional(),
  email: z.string().email('Correo inválido').optional(),
  rol: z.enum(ROLES_USUARIO).optional(),
  enteId: z.string().uuid().nullable().optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
});
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
