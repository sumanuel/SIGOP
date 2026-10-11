import { z } from 'zod';

const codigo = z.string().regex(/^\s*\d{3}\s?\d{3}\s*$/, 'El código tiene 6 dígitos');

export const verificarLogin2faSchema = z.object({ token2fa: z.string().min(1), codigo });
export const activar2faSchema = z.object({ tokenConfiguracion: z.string().min(1), codigo });
export const desactivar2faSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
  codigo,
});
