import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginInput = z.infer<typeof loginSchema>;
