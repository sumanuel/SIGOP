import type { ObraMapa } from '@/lib/types/obra';
import { esCapaMapa, CAPA_POR_DEFECTO, type CapaMapa } from '@/lib/map-style';

// Lógica del modo kiosco (/kiosco): recorrido automático por las obras para pantallas en
// actos públicos. Todo es puro para poder probarlo sin navegador.

export const INTERVALO_POR_DEFECTO_SEG = 15;
export const INTERVALO_MIN_SEG = 5;
export const INTERVALO_MAX_SEG = 120;

export interface OpcionesKiosco {
  /** Segundos que se muestra cada obra. */
  intervaloSeg: number;
  /** Incluir todas las obras, no solo las destacadas. */
  todas: boolean;
  capa: CapaMapa;
}

/** Lee `?intervalo=20&todas=1&capa=satelite`; lo inválido vuelve al valor por defecto. */
export function opcionesDesdeParametros(params: Record<string, string | string[] | undefined>): OpcionesKiosco {
  const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const intervalo = Number(primero(params.intervalo));
  const capa = primero(params.capa);
  return {
    intervaloSeg: Number.isFinite(intervalo) && intervalo > 0
      ? Math.min(INTERVALO_MAX_SEG, Math.max(INTERVALO_MIN_SEG, Math.round(intervalo)))
      : INTERVALO_POR_DEFECTO_SEG,
    todas: ['1', 'true', 'si', 'sí'].includes((primero(params.todas) ?? '').toLowerCase()),
    capa: esCapaMapa(capa) ? capa : CAPA_POR_DEFECTO,
  };
}

/**
 * Obras del recorrido: las destacadas; si no hay ninguna (o se pidieron todas), todas las
 * obras, para que la pantalla nunca quede vacía. Orden estable por código.
 */
export function obrasDelRecorrido(obras: ObraMapa[], todas: boolean): { obras: ObraMapa[]; soloDestacadas: boolean } {
  const destacadas = obras.filter((o) => o.destacada);
  const usarDestacadas = !todas && destacadas.length > 0;
  const lista = (usarDestacadas ? destacadas : obras).slice().sort((a, b) => a.codigo.localeCompare(b.codigo));
  return { obras: lista, soloDestacadas: usarDestacadas };
}

/** Siguiente posición del recorrido, dando la vuelta al final (`paso` = 1 o -1). */
export function moverIndice(actual: number, paso: 1 | -1, total: number): number {
  if (total <= 0) return 0;
  return (((actual + paso) % total) + total) % total;
}

/**
 * Tras recargar la lista (los datos cambian), conserva la obra que se estaba mostrando si
 * sigue en el recorrido; si no, vuelve al inicio.
 */
export function indiceTrasActualizar(actual: ObraMapa | undefined, nuevas: ObraMapa[]): number {
  if (!actual) return 0;
  const i = nuevas.findIndex((o) => o.id === actual.id);
  return i >= 0 ? i : 0;
}

/** Indicadores globales que se muestran arriba (sobre todas las obras, no solo el recorrido). */
export function indicadoresGlobales(obras: ObraMapa[]) {
  const culminadas = obras.filter((o) => o.estatus.nombre === 'Culminada' || o.estatus.nombre === 'Inaugurada').length;
  const avancePromedio = obras.length === 0 ? 0 : Math.round(obras.reduce((suma, o) => suma + o.avanceFisico, 0) / obras.length);
  return { total: obras.length, culminadas, avancePromedio };
}
