import { describe, expect, it } from 'vitest';
import { evaluarObra, type DatosObraParaAlertas } from '@/lib/server/alertas/reglas';

const AHORA = new Date('2026-10-22T12:00:00Z');
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000);

const base: DatosObraParaAlertas = {
  estatus: 'En ejecución',
  avanceFisico: 50,
  avanceFinanciero: 50,
  createdAt: dias(-400),
  fechaInicio: dias(-300),
  fechaFinEstimada: dias(200),
  ultimoAvance: dias(-5),
  paralizadaDesde: null,
};

const tipos = (o: Partial<DatosObraParaAlertas>) => evaluarObra({ ...base, ...o }, AHORA).map((a) => a.tipo);

describe('evaluarObra', () => {
  it('una obra sana no genera alertas', () => {
    expect(tipos({})).toEqual([]);
  });

  it('las obras culminadas o inauguradas nunca alertan', () => {
    expect(tipos({ estatus: 'Culminada', avanceFinanciero: 100, avanceFisico: 10, fechaFinEstimada: dias(-50) })).toEqual([]);
    expect(tipos({ estatus: 'Inaugurada', ultimoAvance: dias(-500) })).toEqual([]);
  });

  it('SIN_ACTUALIZACION pasa de 30 días y sube a severidad 3 pasados 90', () => {
    expect(tipos({ ultimoAvance: dias(-30) })).toEqual([]);
    expect(tipos({ ultimoAvance: dias(-31) })).toEqual(['SIN_ACTUALIZACION']);
    const [leve] = evaluarObra({ ...base, ultimoAvance: dias(-45) }, AHORA);
    const [grave] = evaluarObra({ ...base, ultimoAvance: dias(-91) }, AHORA);
    expect([leve.severidad, grave.severidad]).toEqual([2, 3]);
  });

  it('SIN_ACTUALIZACION solo aplica a obras en ejecución y no paralizadas', () => {
    expect(tipos({ estatus: 'Planificada', ultimoAvance: dias(-200) })).toEqual([]);
    expect(tipos({ paralizadaDesde: dias(-10), ultimoAvance: dias(-200) })).toEqual([]);
  });

  it('sin ningún avance cuenta desde el inicio de la obra', () => {
    const [alerta] = evaluarObra({ ...base, ultimoAvance: null, fechaInicio: dias(-60) }, AHORA);
    expect(alerta.tipo).toBe('SIN_ACTUALIZACION');
    expect(alerta.mensaje).toContain('Nunca');
  });

  it('DESFASE_FINANCIERO solo supera los 20 puntos', () => {
    expect(tipos({ avanceFinanciero: 70, avanceFisico: 50 })).toEqual([]);
    expect(tipos({ avanceFinanciero: 71, avanceFisico: 50 })).toEqual(['DESFASE_FINANCIERO']);
    expect(tipos({ avanceFinanciero: 20, avanceFisico: 60 })).toEqual([]);
  });

  it('OBRA_VENCIDA si la fecha pasó y falta avance físico', () => {
    expect(tipos({ fechaFinEstimada: dias(-1), avanceFisico: 80, avanceFinanciero: 80 })).toEqual(['OBRA_VENCIDA']);
    expect(tipos({ fechaFinEstimada: dias(-1), avanceFisico: 100, avanceFinanciero: 100 })).toEqual([]);
  });

  it('VENCIMIENTO_PROXIMO: en 30 días y por debajo del 90 % físico', () => {
    expect(tipos({ fechaFinEstimada: dias(20), avanceFisico: 60, avanceFinanciero: 60 })).toEqual(['VENCIMIENTO_PROXIMO']);
    expect(tipos({ fechaFinEstimada: dias(20), avanceFisico: 95, avanceFinanciero: 95 })).toEqual([]);
    expect(tipos({ fechaFinEstimada: dias(45), avanceFisico: 10, avanceFinanciero: 10 })).toEqual([]);
  });

  it('PARALIZADA_PROLONGADA pasa de 90 días y es grave desde un año', () => {
    expect(tipos({ paralizadaDesde: dias(-90) })).toEqual([]);
    const [media] = evaluarObra({ ...base, paralizadaDesde: dias(-120) }, AHORA);
    const [grave] = evaluarObra({ ...base, paralizadaDesde: dias(-400) }, AHORA);
    expect([media.tipo, media.severidad, grave.severidad]).toEqual(['PARALIZADA_PROLONGADA', 2, 3]);
  });
});
