import { describe, expect, it } from 'vitest';
import {
  aplicarFiltros,
  calcularEstadisticas,
  filtrosDesdeParametros,
  hayFiltros,
  parametrosDeFiltros,
  serieTemporal,
  type FilaEstadistica,
} from '@/lib/estadisticas';

const fila = (o: Partial<FilaEstadistica>): FilaEstadistica => ({
  estado: 'Miranda',
  tipo: 'Salud',
  tipoColor: '#DC2626',
  estatus: 'En ejecución',
  estatusColor: '#2563EB',
  estatusOrden: 2,
  moneda: 'VES',
  presupuesto: 100,
  avance: 50,
  anioAprobacion: 2026,
  anioFinReal: null,
  ...o,
});

const filas = [
  fila({ presupuesto: 1000, avance: 40 }),
  fila({ estado: 'Zulia', tipo: 'Vialidad', presupuesto: 500, avance: 100, estatus: 'Culminada', estatusOrden: 4, anioFinReal: 2025, anioAprobacion: 2024 }),
  fila({ estado: 'Zulia', tipo: 'Salud', moneda: 'USD', presupuesto: 70, avance: 20, estatus: 'Planificada', estatusOrden: 1, anioAprobacion: 2026 }),
  fila({ estado: 'Miranda', tipo: 'Vialidad', presupuesto: 300, avance: 70, estatus: 'Inaugurada', estatusOrden: 5, anioFinReal: 2026, anioAprobacion: null }),
];

describe('calcularEstadisticas', () => {
  const s = calcularEstadisticas(filas);

  it('suma la inversión por moneda sin mezclarlas, con VES primero', () => {
    expect(s.inversionPorMoneda).toEqual({ VES: 1800, USD: 70 });
    expect(s.monedas).toEqual(['VES', 'USD']);
  });

  it('cuenta culminadas (Culminada e Inaugurada) y promedia el avance', () => {
    expect(s.totalObras).toBe(4);
    expect(s.obrasCulminadas).toBe(2);
    expect(s.avancePromedio).toBe(58);
  });

  it('agrupa por tipo y ordena los estatus por su orden', () => {
    expect(s.porTipo.find((t) => t.nombre === 'Salud')?.cantidad).toBe(2);
    expect(s.porEstatus.map((e) => e.nombre)).toEqual(['Planificada', 'En ejecución', 'Culminada', 'Inaugurada']);
  });

  it('el ranking de estados va de mayor a menor avance, con inversión por moneda', () => {
    expect(s.porEstado.map((e) => [e.estado, e.avancePromedio])).toEqual([['Zulia', 60], ['Miranda', 55]]);
    expect(s.porEstado.find((e) => e.estado === 'Zulia')?.inversionPorMoneda).toEqual({ VES: 500, USD: 70 });
  });

  it('sin obras no hay división por cero', () => {
    expect(calcularEstadisticas([])).toMatchObject({ totalObras: 0, avancePromedio: 0, monedas: [], porEstado: [] });
  });
});

describe('aplicarFiltros', () => {
  it('sin filtros devuelve todo', () => {
    expect(aplicarFiltros(filas, {})).toHaveLength(4);
    expect(hayFiltros({})).toBe(false);
  });

  it('combina los filtros con "y"', () => {
    expect(aplicarFiltros(filas, { estado: 'Zulia' })).toHaveLength(2);
    expect(aplicarFiltros(filas, { estado: 'Zulia', tipo: 'Salud' })).toHaveLength(1);
    expect(aplicarFiltros(filas, { estatus: 'Culminada' })).toHaveLength(1);
  });

  it('filtra por año de aprobación; las obras sin fecha no coinciden con ningún año', () => {
    expect(aplicarFiltros(filas, { anio: 2026 })).toHaveLength(2);
    expect(aplicarFiltros(filas, { anio: 2024 })).toHaveLength(1);
    expect(hayFiltros({ anio: 2026 })).toBe(true);
  });

  it('al filtrar, las cifras se recalculan solo con lo que queda', () => {
    const s = calcularEstadisticas(aplicarFiltros(filas, { estado: 'Miranda' }));
    expect(s.inversionPorMoneda).toEqual({ VES: 1300 });
  });
});

describe('filtros en la URL', () => {
  it('ida y vuelta', () => {
    const f = { estado: 'Distrito Capital', tipo: 'Agua Potable', anio: 2026 };
    const query = parametrosDeFiltros(f);
    expect(filtrosDesdeParametros(Object.fromEntries(new URLSearchParams(query)))).toEqual({ ...f, estatus: undefined });
  });

  it('descarta valores inválidos o demasiado largos', () => {
    const f = filtrosDesdeParametros({ anio: 'abc', estado: 'x'.repeat(200), tipo: ['Salud', 'Otro'] });
    expect(f).toEqual({ anio: undefined, estado: undefined, tipo: 'Salud', estatus: undefined });
    expect(filtrosDesdeParametros({ anio: '99999' }).anio).toBeUndefined();
  });

  it('sin filtros no genera parámetros', () => {
    expect(parametrosDeFiltros({})).toBe('');
  });
});

describe('serieTemporal', () => {
  it('cuenta aprobadas por año de aprobación y culminadas por año de fin real, rellenando los años vacíos', () => {
    // aprobadas: 2026 ×2, 2024 ×1 (la obra sin fecha no entra); culminadas: 2025, 2026
    expect(serieTemporal(filas, { metrica: 'obras' })).toEqual([
      { anio: 2024, aprobadas: 1, culminadas: 0 },
      { anio: 2025, aprobadas: 0, culminadas: 1 },
      { anio: 2026, aprobadas: 2, culminadas: 1 },
    ]);
  });

  it('el acumulado va sumando año tras año', () => {
    expect(serieTemporal(filas, { metrica: 'obras', acumulado: true }).map((p) => [p.aprobadas, p.culminadas])).toEqual([
      [1, 0],
      [1, 1],
      [3, 2],
    ]);
  });

  it('la inversión solo suma la moneda pedida (nunca VES con USD)', () => {
    const ves = serieTemporal(filas, { metrica: 'inversion', moneda: 'VES' });
    expect(ves.find((p) => p.anio === 2026)).toEqual({ anio: 2026, aprobadas: 1000, culminadas: 300 });
    const usd = serieTemporal(filas, { metrica: 'inversion', moneda: 'USD' });
    expect(usd).toEqual([{ anio: 2026, aprobadas: 70, culminadas: 0 }]);
  });

  it('sin fechas devuelve una serie vacía', () => {
    expect(serieTemporal([fila({ anioAprobacion: null })], { metrica: 'obras' })).toEqual([]);
    expect(serieTemporal([], { metrica: 'obras' })).toEqual([]);
  });
});
