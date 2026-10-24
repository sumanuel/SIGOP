import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { HASH_GENESIS, calcularHash, clasificarAvances, datosSelladosDeAvance } from '@/lib/server/integridad/hash';

type Tx = Prisma.TransactionClient;

// Clave del candado que serializa la escritura de la cadena: sin él, dos avances
// guardados a la vez leerían el mismo "último hash" y bifurcarían la cadena.
const CLAVE_CANDADO_CADENA = 7340001;

interface NuevoRegistro {
  entidad: 'Avance';
  entidadId: string;
  obraId: string;
  accion: 'CREAR';
  datos: Record<string, unknown>;
}

/** Agrega un registro a la cadena. Debe llamarse dentro de la misma transacción que el cambio sellado. */
export async function registrarIntegridad(tx: Tx, registro: NuevoRegistro) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_CANDADO_CADENA})`;

  const ultimo = await tx.registroIntegridad.findFirst({ orderBy: { secuencia: 'desc' }, select: { datosHash: true } });
  const hashAnterior = ultimo?.datosHash ?? HASH_GENESIS;

  return tx.registroIntegridad.create({
    data: {
      entidad: registro.entidad,
      entidadId: registro.entidadId,
      obraId: registro.obraId,
      accion: registro.accion,
      datos: registro.datos as Prisma.InputJsonValue,
      datosHash: calcularHash(registro.datos, hashAnterior),
      hashAnterior,
    },
  });
}

export interface EstadoCadena {
  ok: boolean;
  registros: number;
  /** Hash del último registro: se puede anotar para comprobar más adelante que la cadena no se reescribió. */
  cabeza: string | null;
  /** Número de secuencia del primer registro dañado, si lo hay. */
  primerError: { secuencia: number; motivo: string } | null;
}

/**
 * Recorre TODA la cadena: cada registro debe enlazar con el anterior y su hash
 * debe coincidir con el recalculado desde su contenido guardado.
 */
export async function verificarCadena(): Promise<EstadoCadena> {
  const registros = await prisma.registroIntegridad.findMany({ orderBy: { secuencia: 'asc' } });

  let esperadoAnterior = HASH_GENESIS;
  for (const r of registros) {
    if (r.hashAnterior !== esperadoAnterior) {
      return {
        ok: false,
        registros: registros.length,
        cabeza: registros.at(-1)?.datosHash ?? null,
        primerError: { secuencia: r.secuencia, motivo: 'El registro no enlaza con el anterior (falta o se alteró un registro).' },
      };
    }
    if (calcularHash(r.datos, r.hashAnterior) !== r.datosHash) {
      return {
        ok: false,
        registros: registros.length,
        cabeza: registros.at(-1)?.datosHash ?? null,
        primerError: { secuencia: r.secuencia, motivo: 'El contenido del registro no coincide con su sello.' },
      };
    }
    esperadoAnterior = r.datosHash;
  }

  return { ok: true, registros: registros.length, cabeza: registros.at(-1)?.datosHash ?? null, primerError: null };
}

export type EstadoAvance = 'integro' | 'alterado' | 'sin_sello' | 'eliminado';

export interface VerificacionObra {
  ok: boolean;
  cadena: EstadoCadena;
  avances: { total: number; integros: number; sinSello: number; alterados: number; eliminados: number };
  /** Fecha del primer sello de esta obra (los avances anteriores no están sellados). */
  selladoDesde: Date | null;
}

/**
 * Verifica una obra: (1) la cadena completa está intacta y (2) cada avance
 * guardado hoy coincide con lo que se selló cuando se registró.
 */
export async function verificarObra(obraId: string): Promise<VerificacionObra> {
  const [cadena, avances, registros] = await Promise.all([
    verificarCadena(),
    prisma.avance.findMany({ where: { obraId } }),
    prisma.registroIntegridad.findMany({ where: { obraId, entidad: 'Avance' }, orderBy: { secuencia: 'asc' } }),
  ]);

  const conteo = clasificarAvances(avances, registros);

  return {
    ok: cadena.ok && conteo.alterados === 0 && conteo.eliminados === 0,
    cadena,
    avances: conteo,
    selladoDesde: registros[0]?.createdAt ?? null,
  };
}

/**
 * Sella los avances anteriores a la activación del módulo. Deja constancia de
 * lo que había EN ESE MOMENTO: no prueba nada sobre el pasado, solo impide
 * cambios a partir de ahora.
 */
export async function sellarAvancesExistentes(): Promise<{ sellados: number }> {
  let sellados = 0;
  const yaSellados = new Set(
    (await prisma.registroIntegridad.findMany({ where: { entidad: 'Avance' }, select: { entidadId: true } })).map((r) => r.entidadId)
  );
  const pendientes = (await prisma.avance.findMany({ orderBy: { createdAt: 'asc' } })).filter((a) => !yaSellados.has(a.id));

  for (const avance of pendientes) {
    await prisma.$transaction(async (tx) => {
      await registrarIntegridad(tx, {
        entidad: 'Avance',
        entidadId: avance.id,
        obraId: avance.obraId,
        accion: 'CREAR',
        datos: datosSelladosDeAvance(avance),
      });
    });
    sellados++;
  }
  return { sellados };
}

export interface DiagnosticoIntegridad {
  ok: boolean;
  cadena: EstadoCadena;
  /** Avances anteriores a la activación del módulo que todavía no tienen sello. */
  sinSellar: number;
  /** Solo las obras con algún avance alterado o eliminado (las que hay que revisar). */
  obrasConProblemas: { obraId: string; codigo: string; nombre: string; alterados: number; eliminados: number }[];
}

/** Revisión completa para el panel: la cadena entera y, obra por obra, qué no coincide con su sello. */
export async function diagnosticoGeneral(): Promise<DiagnosticoIntegridad> {
  const [cadena, avances, registros, obras] = await Promise.all([
    verificarCadena(),
    prisma.avance.findMany(),
    prisma.registroIntegridad.findMany({ where: { entidad: 'Avance' }, orderBy: { secuencia: 'asc' } }),
    prisma.obra.findMany({ select: { id: true, codigo: true, nombre: true } }),
  ]);

  const avancesPorObra = new Map<string, typeof avances>();
  for (const a of avances) avancesPorObra.set(a.obraId, [...(avancesPorObra.get(a.obraId) ?? []), a]);
  const sellosPorObra = new Map<string, typeof registros>();
  for (const r of registros) sellosPorObra.set(r.obraId, [...(sellosPorObra.get(r.obraId) ?? []), r]);

  const nombres = new Map(obras.map((o) => [o.id, o]));
  const obrasConProblemas: DiagnosticoIntegridad['obrasConProblemas'] = [];
  // Se revisan también obras con sellos pero sin avances (un avance eliminado de una obra que quedó vacía).
  for (const obraId of new Set([...avancesPorObra.keys(), ...sellosPorObra.keys()])) {
    const c = clasificarAvances(avancesPorObra.get(obraId) ?? [], sellosPorObra.get(obraId) ?? []);
    if (c.alterados > 0 || c.eliminados > 0) {
      const obra = nombres.get(obraId);
      obrasConProblemas.push({
        obraId,
        codigo: obra?.codigo ?? '—',
        nombre: obra?.nombre ?? 'Obra eliminada',
        alterados: c.alterados,
        eliminados: c.eliminados,
      });
    }
  }

  const selladas = new Set(registros.map((r) => r.entidadId));
  const sinSellar = avances.filter((a) => !selladas.has(a.id)).length;
  return { ok: cadena.ok && obrasConProblemas.length === 0, cadena, sinSellar, obrasConProblemas };
}
