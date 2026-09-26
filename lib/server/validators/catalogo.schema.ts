import { z } from 'zod';

// Un esquema por catálogo (PLAN_PROYECTO.md sección 3.2, módulo 6). Se usa
// tal cual tanto para crear como para editar — un campo opcional ausente
// significa "no aplica" (NULL en la base), nunca "no lo toques": el cliente
// (components/admin/catalogo-editor.tsx) siempre envía el objeto completo.

const colorHex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Usa el formato #RRGGBB')
  .nullish();

export const tipoObraSchema = z.object({
  nombre: z.string().min(2).max(80),
  icono: z.string().max(40).nullish(),
  color: colorHex,
});
export type TipoObraInput = z.infer<typeof tipoObraSchema>;

export const estatusObraSchema = z.object({
  nombre: z.string().min(2).max(60),
  color: colorHex,
  orden: z.number().int().min(0).default(0),
});
export type EstatusObraInput = z.infer<typeof estatusObraSchema>;

export const enteSchema = z.object({
  nombre: z.string().min(2).max(150),
  siglas: z.string().max(20).nullish(),
});
export type EnteInput = z.infer<typeof enteSchema>;

export const contratistaSchema = z.object({
  razonSocial: z.string().min(2).max(150),
  rif: z.string().max(20).nullish(),
  contacto: z.string().max(100).nullish(),
  telefono: z.string().max(30).nullish(),
  email: z.string().email('Correo inválido').nullish(),
});
export type ContratistaInput = z.infer<typeof contratistaSchema>;

export const fuenteFinanciamientoSchema = z.object({
  nombre: z.string().min(2).max(100),
});
export type FuenteFinanciamientoInput = z.infer<typeof fuenteFinanciamientoSchema>;

export const cargoSchema = z.object({
  nombre: z.string().min(2).max(80),
  nivelJerarquico: z.number().int().min(0).default(0),
  area: z.string().max(60).nullish(),
});
export type CargoInput = z.infer<typeof cargoSchema>;
