import { describe, expect, it } from 'vitest';
import { HASH_GENESIS, calcularHash, canonico, clasificarAvances, datosSelladosDeAvance } from '@/lib/server/integridad/hash';

describe('canonico', () => {
  it('no depende del orden de las claves', () => {
    expect(canonico({ b: 1, a: { d: 2, c: 3 } })).toBe(canonico({ a: { c: 3, d: 2 }, b: 1 }));
    expect(canonico({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('ignora claves undefined pero conserva null', () => {
    expect(canonico({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it('respeta el orden de los arreglos', () => {
    expect(canonico([1, 2])).not.toBe(canonico([2, 1]));
  });
});

describe('calcularHash', () => {
  const datos = { obraId: 'o1', avanceFisico: 40 };

  it('es determinista y de 64 caracteres hexadecimales', () => {
    const h = calcularHash(datos, HASH_GENESIS);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(calcularHash({ avanceFisico: 40, obraId: 'o1' }, HASH_GENESIS)).toBe(h);
  });

  it('cambia si cambia el contenido o el hash anterior (cadena)', () => {
    const h = calcularHash(datos, HASH_GENESIS);
    expect(calcularHash({ ...datos, avanceFisico: 41 }, HASH_GENESIS)).not.toBe(h);
    expect(calcularHash(datos, h)).not.toBe(h);
  });
});

describe('datosSelladosDeAvance', () => {
  it('sella solo el contenido público, sin autor', () => {
    const avance = {
      obraId: 'o1',
      avanceFisico: 10,
      avanceFinanciero: 12,
      fecha: new Date('2026-01-02T03:04:05Z'),
      comentario: null,
      registradoPor: 'alguien',
    };
    expect(datosSelladosDeAvance(avance)).toEqual({
      obraId: 'o1',
      avanceFisico: 10,
      avanceFinanciero: 12,
      fecha: '2026-01-02T03:04:05.000Z',
      comentario: null,
    });
  });
});

describe('clasificarAvances', () => {
  const avance = (id: string, fisico = 10) => ({
    id,
    obraId: 'o1',
    avanceFisico: fisico,
    avanceFinanciero: 12,
    fecha: new Date('2026-01-02T03:04:05Z'),
    comentario: null,
  });
  const sello = (a: ReturnType<typeof avance>) => ({ entidadId: a.id, datos: datosSelladosDeAvance(a) });

  it('todo coincide: íntegros', () => {
    const a = avance('a1');
    expect(clasificarAvances([a], [sello(a)])).toEqual({ total: 1, integros: 1, sinSello: 0, alterados: 0, eliminados: 0 });
  });

  it('un avance cambiado después de sellarse se detecta como alterado', () => {
    const original = avance('a1', 10);
    expect(clasificarAvances([avance('a1', 99)], [sello(original)])).toMatchObject({ alterados: 1, integros: 0 });
  });

  it('un avance sin sello se cuenta aparte y no como alterado', () => {
    expect(clasificarAvances([avance('a1')], [])).toMatchObject({ sinSello: 1, alterados: 0 });
  });

  it('un sello cuyo avance ya no existe se cuenta como eliminado', () => {
    expect(clasificarAvances([], [sello(avance('a1'))])).toMatchObject({ eliminados: 1, total: 0 });
  });
});
