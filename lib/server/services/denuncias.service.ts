import { createHash, randomInt } from 'node:crypto';
import type { EstadoDenuncia } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { cifrarSecreto, descifrarSecreto } from '@/lib/server/secret-box';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';
import { ALFABETO_CODIGO, LARGO_CODIGO, formatearCodigo, normalizarCodigo } from '@/lib/denuncia';
import type { CambiarEstadoDenunciaInput, CrearDenunciaInput } from '@/lib/server/validators/denuncia.schema';

// Las denuncias pueden señalar a personal del propio ente, por eso las ven solo
// el super administrador y quien aprueba contenido; NO el administrador de ente
// ni los editores de obra (conflicto de interés).
export const ROLES_DENUNCIAS = ['SUPER_ADMIN', 'APROBADOR'];

/** Regla de negocio de denuncias (no existe, estado inválido…); el Route Handler la traduce a su status. */
export class DenunciaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Del código de seguimiento solo se guarda su hash: si alguien obtiene un
// volcado de la base no puede consultar el estado de las denuncias ajenas. El
// código es aleatorio (60 bits), no secuencial, para que no se pueda adivinar.
const hashCodigo = (crudo: string) => createHash('sha256').update(`sigop-denuncia:${crudo}`).digest('hex');

function generarCodigoCrudo(): string {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return codigo;
}

/**
 * Crea la denuncia y devuelve el código de seguimiento EN CLARO, que es la única
 * vez que existe: no se puede recuperar después. Deliberadamente no se registra
 * IP, agente de navegador ni auditoría con el origen de la petición.
 * Devuelve `null` si el honeypot venía lleno (bot): se simula éxito sin guardar.
 */
export async function crearDenuncia(data: CrearDenunciaInput) {
  if (data.sitioWeb) return { simulada: true as const, codigo: formatearCodigo(generarCodigoCrudo()) };

  let obraId: string | undefined;
  if (data.obraSlug) {
    const obra = await prisma.obra.findFirst({
      where: { slug: data.obraSlug, estadoPublicacion: 'PUBLICADO' },
      select: { id: true },
    });
    if (!obra) throw new DenunciaError(404, 'La obra indicada no existe.');
    obraId = obra.id;
  }

  const crudo = generarCodigoCrudo();
  await prisma.denuncia.create({
    data: {
      obraId,
      codigoHash: hashCodigo(crudo),
      esAnonima: !data.contacto,
      contactoCifrado: data.contacto ? cifrarSecreto(data.contacto) : undefined,
      categoria: data.categoria,
      descripcion: data.descripcion,
      evidenciaUrl: data.evidenciaUrl,
      eventos: { create: { estado: 'RECIBIDA' } },
    },
  });

  return { simulada: false as const, codigo: formatearCodigo(crudo) };
}

export interface SeguimientoPublico {
  categoria: string;
  creadaEn: Date;
  estado: EstadoDenuncia;
  derivadaA: string | null;
  eventos: { estado: EstadoDenuncia; nota: string | null; fecha: Date }[];
}

/**
 * Consulta por código. Devuelve solo lo que es seguro mostrar a quien tenga el
 * código: nunca la descripción ni el contacto, y tampoco el número interno.
 */
export async function consultarSeguimiento(codigo: string): Promise<SeguimientoPublico | null> {
  const crudo = normalizarCodigo(codigo);
  if (!crudo) return null;

  const denuncia = await prisma.denuncia.findUnique({
    where: { codigoHash: hashCodigo(crudo) },
    include: { eventos: { orderBy: { createdAt: 'asc' } } },
  });
  if (!denuncia) return null;

  return {
    categoria: denuncia.categoria,
    creadaEn: denuncia.createdAt,
    estado: denuncia.estado,
    derivadaA: denuncia.derivadaA,
    eventos: denuncia.eventos.map((e) => ({ estado: e.estado, nota: e.nota, fecha: e.createdAt })),
  };
}

// ------------------------------------------------------------------ interno

/** Bandeja interna. No incluye el contacto (ni siquiera cifrado). */
export async function listarDenuncias(estado?: EstadoDenuncia) {
  const denuncias = await prisma.denuncia.findMany({
    where: estado ? { estado } : undefined,
    include: { obra: { select: { id: true, nombre: true, codigo: true } } },
    orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    take: 300,
  });
  return denuncias.map(({ contactoCifrado, codigoHash, ...resto }) => {
    void codigoHash;
    return { ...resto, tieneContacto: Boolean(contactoCifrado) };
  });
}

export async function contarDenunciasNuevas() {
  return prisma.denuncia.count({ where: { estado: 'RECIBIDA' } });
}

export async function obtenerDenuncia(id: string) {
  const denuncia = await prisma.denuncia.findUnique({
    where: { id },
    include: {
      obra: { select: { id: true, nombre: true, codigo: true, slug: true } },
      eventos: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!denuncia) return null;
  const { contactoCifrado, codigoHash, ...resto } = denuncia;
  void codigoHash;
  return { ...resto, tieneContacto: Boolean(contactoCifrado) };
}

export async function cambiarEstadoDenuncia(id: string, data: CambiarEstadoDenunciaInput, usuarioId: string) {
  const antes = await prisma.denuncia.findUnique({ where: { id } });
  if (!antes) throw new DenunciaError(404, 'Denuncia no encontrada.');

  const estado = data.estado as EstadoDenuncia;
  if (estado === 'DERIVADA_CONTRALORIA' && !(data.derivadaA ?? antes.derivadaA)) {
    throw new DenunciaError(400, 'Indica a qué organismo se deriva la denuncia.');
  }

  const despues = await prisma.denuncia.update({
    where: { id },
    data: {
      estado,
      derivadaA: data.derivadaA ?? undefined,
      eventos: { create: { estado, nota: data.nota || undefined } },
    },
  });

  // La bitácora guarda qué cambió y quién, pero no el contenido de la denuncia.
  await registrarAuditoria({
    usuarioId,
    accion: 'CAMBIO_ESTADO_DENUNCIA',
    entidad: 'Denuncia',
    entidadId: id,
    datosAntes: { estado: antes.estado, derivadaA: antes.derivadaA },
    datosDespues: { estado: despues.estado, derivadaA: despues.derivadaA },
  });
  return despues;
}

/** Revela el contacto cifrado. Cada consulta queda en la bitácora: es el dato más sensible del módulo. */
export async function verContactoDenuncia(id: string, usuarioId: string) {
  const denuncia = await prisma.denuncia.findUnique({ where: { id }, select: { contactoCifrado: true } });
  if (!denuncia) throw new DenunciaError(404, 'Denuncia no encontrada.');
  if (!denuncia.contactoCifrado) throw new DenunciaError(404, 'Esta denuncia es anónima: no dejó contacto.');

  await registrarAuditoria({ usuarioId, accion: 'VER_CONTACTO_DENUNCIA', entidad: 'Denuncia', entidadId: id });
  return descifrarSecreto(denuncia.contactoCifrado);
}
