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
