import { describe, expect, it } from 'vitest';
import { normalizarFechas } from '@/lib/hitos';
import { actualizarHitoSchema, crearHitoSchema, moverHitoSchema } from '@/lib/server/validators/hito.schema';

const hoy = new Date('2026-10-23T12:00:00Z');

describe('normalizarFechas', () => {
  it('un hito pendiente nunca conserva fecha real', () => {
    expect(normalizarFechas(false, '2026-01-01T00:00:00.000Z', hoy)).toEqual({ completado: false, fechaReal: null });
  });

  it('un hito completado sin fecha real usa hoy', () => {
    expect(normalizarFechas(true, null, hoy)).toEqual({ completado: true, fechaReal: hoy });
    expect(normalizarFechas(true, undefined, hoy).fechaReal).toEqual(hoy);
  });

  it('un hito completado respeta la fecha real indicada', () => {
    expect(normalizarFechas(true, '2026-03-05T12:00:00.000Z', hoy).fechaReal).toEqual(new Date('2026-03-05T12:00:00.000Z'));
  });
});

describe('validadores de hitos', () => {
  it('el nombre debe tener al menos 3 caracteres y nace pendiente', () => {
    expect(crearHitoSchema.safeParse({ nombre: 'ab' }).success).toBe(false);
    expect(crearHitoSchema.parse({ nombre: 'Vaciado de losa' }).completado).toBe(false);
  });

  it('una actualización parcial no marca como pendiente un hito completado (default de .partial())', () => {
    expect(actualizarHitoSchema.parse({ nombre: 'Nuevo nombre' })).toEqual({ nombre: 'Nuevo nombre' });
  });

  it('solo acepta mover arriba o abajo', () => {
    expect(moverHitoSchema.safeParse({ direccion: 'arriba' }).success).toBe(true);
    expect(moverHitoSchema.safeParse({ direccion: 'lado' }).success).toBe(false);
  });
});
