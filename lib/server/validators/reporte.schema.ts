import { z } from 'zod';

// Reporte ciudadano: canal público, sin login (ver discusión en el chat —
// exigir cuenta mataría la participación y no aporta nada a la moderación,
// que es el control real contra abuso).
export const crearReporteSchema = z.object({
  nombre: z.string().max(120).optional(),
  correo: z.string().email().max(200).optional(),
  mensaje: z.string().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)').max(2000),
  fotoUrl: z.string().url().max(500).optional(),
  // Honeypot: campo oculto en el formulario real (nunca lo llena una
  // persona). Si llega con contenido, es un bot — ver reportes.service.ts.
  sitioWeb: z.string().max(0).optional().or(z.literal('')),
});

export type CrearReporteInput = z.infer<typeof crearReporteSchema>;

export const moderarReporteSchema = z.object({
  estado: z.enum(['APROBADO', 'RECHAZADO']),
});

export type ModerarReporteInput = z.infer<typeof moderarReporteSchema>;
