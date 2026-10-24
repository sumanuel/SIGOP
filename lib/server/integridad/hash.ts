import { createHash } from 'node:crypto';

// Funciones puras del sello de integridad (MODULOS_AVANZADOS.md, módulo 6).
// Se mantienen aparte del acceso a la base para poder probarlas sin ella.

/** Hash "génesis": el anterior del primer registro de la cadena. */
export const HASH_GENESIS = '0'.repeat(64);

/**
 * JSON canónico: claves ordenadas y sin espacios, para que el mismo contenido
 * produzca siempre exactamente el mismo texto (JSONB reordena las claves al
 * guardar, así que no se puede depender del orden de inserción).
 */
export function canonico(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor) ?? 'null';
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  const objeto = valor as Record<string, unknown>;
  const claves = Object.keys(objeto)
    .filter((k) => objeto[k] !== undefined)
    .sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(objeto[k])}`).join(',')}}`;
}

/** SHA-256 de (contenido canónico + hash del registro anterior). */
export function calcularHash(datos: unknown, hashAnterior: string): string {
  return createHash('sha256').update(canonico(datos) + hashAnterior).digest('hex');
}

/** Contenido de un avance que queda sellado (no incluye datos personales). */
export function datosSelladosDeAvance(avance: {
  obraId: string;
  avanceFisico: number;
  avanceFinanciero: number;
  fecha: Date;
  comentario: string | null;
}) {
  return {
    obraId: avance.obraId,
    avanceFisico: avance.avanceFisico,
    avanceFinanciero: avance.avanceFinanciero,
    fecha: avance.fecha.toISOString(),
    comentario: avance.comentario ?? null,
  };
}

type AvanceSellable = Parameters<typeof datosSelladosDeAvance>[0] & { id: string };

export interface ConteoAvances {
  total: number;
  integros: number;
  sinSello: number;
  alterados: number;
  eliminados: number;
}

/**
 * Compara los avances guardados hoy con lo que se selló al registrarlos:
 * íntegro (coincide), alterado (cambió), sin sello (anterior al módulo) y
 * eliminado (tiene sello pero ya no existe en la tabla).
 */
export function clasificarAvances(avances: AvanceSellable[], sellos: { entidadId: string; datos: unknown }[]): ConteoAvances {
  const selloPorAvance = new Map(sellos.map((s) => [s.entidadId, s]));
  const idsActuales = new Set(avances.map((a) => a.id));

  let integros = 0;
  let sinSello = 0;
  let alterados = 0;
  for (const avance of avances) {
    const sello = selloPorAvance.get(avance.id);
    if (!sello) sinSello++;
    else if (canonico(sello.datos) === canonico(datosSelladosDeAvance(avance))) integros++;
    else alterados++;
  }
  const eliminados = [...selloPorAvance.keys()].filter((id) => !idsActuales.has(id)).length;
  return { total: avances.length, integros, sinSello, alterados, eliminados };
}
