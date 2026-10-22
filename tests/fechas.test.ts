import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularAtrasoDias } from '@/lib/atraso';
import { diasEntre, duracionLegible } from '@/lib/paralizacion';
import { temaConPocoContraste } from '@/lib/contraste';

describe('diasEntre / duracionLegible', () => {
  it('cuenta días completos y nunca es negativo', () => {
    expect(diasEntre(new Date('2026-01-01'), new Date('2026-01-11'))).toBe(10);
    expect(diasEntre(new Date('2026-01-11'), new Date('2026-01-01'))).toBe(0);
  });

  it('redacta la duración en días, meses y años', () => {
    expect(duracionLegible(1)).toBe('1 día');
    expect(duracionLegible(12)).toBe('12 días');
    expect(duracionLegible(150)).toBe('4 meses');
    expect(duracionLegible(800)).toBe('2 años y 2 meses');
  });
});

describe('calcularAtrasoDias', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('no aplica sin fecha estimada', () => {
    expect(calcularAtrasoDias({ fechaFinEstimada: null, fechaFinReal: null, avanceFisico: 10 })).toBeNull();
  });

  it('una obra en curso se compara contra hoy', () => {
    const r = calcularAtrasoDias({ fechaFinEstimada: new Date('2026-10-12T12:00:00Z'), fechaFinReal: null, avanceFisico: 50 });
    expect(r).toBe(10);
  });

  it('una obra terminada se compara contra su fecha real, no contra hoy', () => {
    const r = calcularAtrasoDias({
      fechaFinEstimada: new Date('2026-06-10T12:00:00Z'),
      fechaFinReal: new Date('2026-06-05T12:00:00Z'),
      avanceFisico: 100,
    });
    expect(r).toBe(-5);
  });

  it('al 100 % sin fecha real no hay atraso que medir', () => {
    expect(calcularAtrasoDias({ fechaFinEstimada: new Date('2026-01-01'), fechaFinReal: null, avanceFisico: 100 })).toBeNull();
  });
});

describe('temaConPocoContraste', () => {
  it('detecta colores que se pierden contra el fondo', () => {
    expect(temaConPocoContraste('#FFFFFF')).toBe('claro');
    expect(temaConPocoContraste('#171717')).toBe('oscuro');
  });
  it('acepta colores visibles en ambos temas y valores inválidos', () => {
    expect(temaConPocoContraste('#2563EB')).toBeNull();
    expect(temaConPocoContraste('azul')).toBeNull();
  });
});
