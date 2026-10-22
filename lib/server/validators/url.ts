import { z } from 'zod';

/**
 * URL absoluta http(s). `z.string().url()` también acepta `javascript:` y
 * `data:`, que no deben llegar a un `<a href>` ni a un `<img src>`.
 */
export const urlHttp = (mensaje = 'El enlace no es válido.') =>
  z
    .string()
    .url(mensaje)
    .refine((valor) => /^https?:\/\//i.test(valor), mensaje);
