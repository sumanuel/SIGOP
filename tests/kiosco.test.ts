import { describe, expect, it } from 'vitest';
import {
  INTERVALO_MAX_SEG,
  INTERVALO_MIN_SEG,
  INTERVALO_POR_DEFECTO_SEG,
  indiceTrasActualizar,
  indicadoresGlobales,
  moverIndice,
  obrasDelRecorrido,
  opcionesDesdeParametros,
} from '@/lib/kiosco';
import type { ObraMapa } from '@/lib/types/obra';

const obra = (codigo: string, extra: Partial<ObraMapa> = {}): ObraMapa => ({
  id: `id-${codigo}`,
  codigo,
  slug: codigo.toLowerCase(),
  nombre: `Obra ${codigo}`,
  tipoObra: { nombre: 'Salud', color: '#DC2626', icono: 'hospital' },
  estatus: { nombre: 'En ejecución', color: '#2563EB' },
  avanceFisico: 50,
  destacada: false,
  presupuestoAprobado: 100,
  moneda: 'VES',
  anioAprobacion: 2026,
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: null,
  lat: 10,
  lng: -66,
  trazado: null,
  ...extra,
});

describe('opcionesDesdeParametros', () => {
  it('sin parámetros usa los valores por defecto', () => {
    expect(opcionesDesdeParametros({})).toEqual({ intervaloSeg: INTERVALO_POR_DEFECTO_SEG, todas: false, capa: 'calles' });
  });

  it('acota el intervalo entre el mínimo y el máximo', () => {
    expect(opcionesDesdeParametros({ intervalo: '1' }).intervaloSeg).toBe(INTERVALO_MIN_SEG);
    expect(opcionesDesdeParametros({ intervalo: '9999' }).intervaloSeg).toBe(INTERVALO_MAX_SEG);
    expect(opcionesDesdeParametros({ intervalo: '30' }).intervaloSeg).toBe(30);
  });

  it('un intervalo inválido, cero o negativo vuelve al de siempre', () => {
    for (const v of ['abc', '0', '-5', '', 'NaN']) {
      expect(opcionesDesdeParametros({ intervalo: v }).intervaloSeg).toBe(INTERVALO_POR_DEFECTO_SEG);
    }
  });

  it('entiende "todas" y una capa válida; ignora una capa desconocida', () => {
    expect(opcionesDesdeParametros({ todas: '1', capa: 'satelite' })).toMatchObject({ todas: true, capa: 'satelite' });
    expect(opcionesDesdeParametros({ todas: 'Sí' }).todas).toBe(true);
    expect(opcionesDesdeParametros({ todas: 'no', capa: 'hibrido' })).toMatchObject({ todas: false, capa: 'calles' });
  });

  it('toma el primer valor si el parámetro viene repetido', () => {
    expect(opcionesDesdeParametros({ intervalo: ['20', '40'] }).intervaloSeg).toBe(20);
  });
});

describe('obrasDelRecorrido', () => {
  const obras = [obra('C', { destacada: true }), obra('A'), obra('B', { destacada: true })];

  it('muestra solo las destacadas, en orden de código', () => {
    const r = obrasDelRecorrido(obras, false);
    expect(r.soloDestacadas).toBe(true);
    expect(r.obras.map((o) => o.codigo)).toEqual(['B', 'C']);
  });

  it('con "todas" incluye todas las obras', () => {
    expect(obrasDelRecorrido(obras, true).obras.map((o) => o.codigo)).toEqual(['A', 'B', 'C']);
  });

  it('si no hay destacadas, recorre todas para no dejar la pantalla vacía', () => {
    const r = obrasDelRecorrido([obra('A'), obra('B')], false);
    expect(r.soloDestacadas).toBe(false);
    expect(r.obras).toHaveLength(2);
  });

  it('sin obras devuelve una lista vacía', () => {
    expect(obrasDelRecorrido([], false).obras).toEqual([]);
  });

  it('no modifica la lista original', () => {
    const copia = obras.map((o) => o.codigo);
    obrasDelRecorrido(obras, true);
    expect(obras.map((o) => o.codigo)).toEqual(copia);
  });
});

describe('moverIndice', () => {
  it('avanza y retrocede dando la vuelta', () => {
    expect(moverIndice(0, 1, 3)).toBe(1);
    expect(moverIndice(2, 1, 3)).toBe(0);
    expect(moverIndice(0, -1, 3)).toBe(2);
  });

  it('con una sola obra se queda en ella; sin obras, en cero', () => {
    expect(moverIndice(0, 1, 1)).toBe(0);
    expect(moverIndice(0, -1, 1)).toBe(0);
    expect(moverIndice(0, 1, 0)).toBe(0);
  });
});

describe('indiceTrasActualizar', () => {
  const lista = [obra('A'), obra('B'), obra('C')];

  it('conserva la obra que se mostraba aunque cambie su posición', () => {
    expect(indiceTrasActualizar(lista[2], [lista[2], lista[0]])).toBe(0);
  });

  it('si la obra ya no está, vuelve al inicio', () => {
    expect(indiceTrasActualizar(lista[1], [lista[0], lista[2]])).toBe(0);
    expect(indiceTrasActualizar(undefined, lista)).toBe(0);
  });
});

describe('indicadoresGlobales', () => {
  it('cuenta culminadas e inauguradas y promedia el avance', () => {
    const r = indicadoresGlobales([
      obra('A', { avanceFisico: 100, estatus: { nombre: 'Culminada', color: '#000' } }),
      obra('B', { avanceFisico: 0, estatus: { nombre: 'Inaugurada', color: '#000' } }),
      obra('C', { avanceFisico: 50 }),
    ]);
    expect(r).toEqual({ total: 3, culminadas: 2, avancePromedio: 50 });
  });

  it('sin obras no divide por cero', () => {
    expect(indicadoresGlobales([])).toEqual({ total: 0, culminadas: 0, avancePromedio: 0 });
  });
});
