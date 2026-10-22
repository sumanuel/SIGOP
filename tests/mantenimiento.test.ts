import { describe, expect, it } from 'vitest';
import { resumenIntervenciones, situacionGarantia } from '@/lib/mantenimiento';
import { crearIntervencionSchema, garantiaSchema } from '@/lib/server/validators/mantenimiento.schema';

const d = (s: string) => new Date(s);
const inicio = d('2026-01-01T00:00:00Z');
const fin = d('2027-01-01T00:00:00Z');

describe('situacionGarantia', () => {
  it('vigente con más de 60 días por delante', () => {
    expect(situacionGarantia(inicio, fin, d('2026-06-01T00:00:00Z'))).toMatchObject({ estado: 'VIGENTE' });
  });

  it('por vencer dentro de los últimos 60 días, con los días restantes', () => {
    const r = situacionGarantia(inicio, fin, d('2026-11-22T00:00:00Z'));
    expect(r.estado).toBe('POR_VENCER');
    expect(r.diasRestantes).toBe(40);
  });

  it('vencida después de la fecha de fin', () => {
    expect(situacionGarantia(inicio, fin, d('2027-01-02T00:00:00Z'))).toEqual({ estado: 'VENCIDA', diasRestantes: 0 });
  });

  it('el mismo día del fin todavía está vigente (por vencer)', () => {
    expect(situacionGarantia(inicio, fin, d('2027-01-01T00:00:00Z')).estado).toBe('POR_VENCER');
  });

  it('antes de su inicio no ha comenzado', () => {
    expect(situacionGarantia(inicio, fin, d('2025-12-01T00:00:00Z')).estado).toBe('SIN_INICIAR');
  });
});

describe('resumenIntervenciones', () => {
  it('sin intervenciones no hay última fecha ni costos', () => {
    expect(resumenIntervenciones([])).toEqual({ total: 0, ultima: null, costosPorMoneda: {} });
  });

  it('toma la fecha más reciente sin importar el orden', () => {
    const r = resumenIntervenciones([
      { fecha: d('2026-03-01'), costo: null, moneda: 'VES' },
      { fecha: d('2026-09-01'), costo: null, moneda: 'VES' },
      { fecha: d('2026-05-01'), costo: null, moneda: 'VES' },
    ]);
    expect(r.ultima).toEqual(d('2026-09-01'));
    expect(r.total).toBe(3);
  });

  it('suma los costos por moneda sin mezclar VES con USD', () => {
    const r = resumenIntervenciones([
      { fecha: d('2026-03-01'), costo: 1000, moneda: 'VES' },
      { fecha: d('2026-04-01'), costo: 500, moneda: 'VES' },
      { fecha: d('2026-05-01'), costo: 80, moneda: 'USD' },
      { fecha: d('2026-06-01'), costo: null, moneda: 'USD' },
    ]);
    expect(r.costosPorMoneda).toEqual({ VES: 1500, USD: 80 });
  });
});

describe('validadores de mantenimiento', () => {
  const garantia = {
    fechaInicioGarantia: '2026-01-01T00:00:00.000Z',
    fechaFinGarantia: '2027-01-01T00:00:00.000Z',
    cubreEstructura: true,
    cubreInstalaciones: false,
  };

  it('la garantía debe terminar después de iniciar', () => {
    expect(garantiaSchema.safeParse(garantia).success).toBe(true);
    expect(garantiaSchema.safeParse({ ...garantia, fechaFinGarantia: garantia.fechaInicioGarantia }).success).toBe(false);
  });

  it('la intervención exige tipo válido y una descripción real', () => {
    const base = { tipo: 'PREVENTIVO', descripcion: 'Revisión del sistema eléctrico.' };
    expect(crearIntervencionSchema.parse(base).moneda).toBe('VES');
    expect(crearIntervencionSchema.safeParse({ ...base, tipo: 'OTRO' }).success).toBe(false);
    expect(crearIntervencionSchema.safeParse({ ...base, descripcion: 'corta' }).success).toBe(false);
    expect(crearIntervencionSchema.safeParse({ ...base, costo: -1 }).success).toBe(false);
  });

  it('las fotos solo aceptan http(s)', () => {
    const base = { tipo: 'CORRECTIVO', descripcion: 'Reparación de filtración en techo.' };
    expect(crearIntervencionSchema.safeParse({ ...base, fotoAntesUrl: 'https://x.com/a.jpg' }).success).toBe(true);
    expect(crearIntervencionSchema.safeParse({ ...base, fotoAntesUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});
