import { describe, expect, it } from 'vitest';
import { CAPAS_MAPA, CAPA_POR_DEFECTO, crearEstiloMapaPublico, esCapaMapa, idCapaMapa } from '@/lib/map-style';

describe('capas del mapa público', () => {
  it('reconoce solo capas válidas (el valor viene de localStorage, que cualquiera puede tocar)', () => {
    expect(esCapaMapa('satelite')).toBe(true);
    expect(esCapaMapa('relieve')).toBe(true);
    expect(esCapaMapa('hibrido')).toBe(false);
    expect(esCapaMapa(null)).toBe(false);
  });

  it('el estilo tiene una capa por cada capa base y solo la inicial está visible', () => {
    for (const { id } of CAPAS_MAPA) {
      const visibles = crearEstiloMapaPublico(id).layers.filter((l) => l.layout?.visibility === 'visible');
      expect(visibles.map((l) => l.id)).toEqual([idCapaMapa(id)]);
    }
  });

  it('sin indicar capa usa la de siempre', () => {
    const visible = crearEstiloMapaPublico().layers.find((l) => l.layout?.visibility === 'visible');
    expect(visible?.id).toBe(idCapaMapa(CAPA_POR_DEFECTO));
  });

  it('cada capa tiene su fuente de teselas con atribución (exigida por los proveedores)', () => {
    const { sources } = crearEstiloMapaPublico();
    for (const { id } of CAPAS_MAPA) {
      const fuente = sources[id] as { tiles: string[]; attribution?: string };
      expect(fuente.tiles.every((t) => t.startsWith('https://'))).toBe(true);
      expect(fuente.attribution).toBeTruthy();
    }
  });
});
