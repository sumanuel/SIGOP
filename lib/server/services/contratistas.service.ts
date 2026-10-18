import { prisma } from '@/lib/server/prisma';
import { fechaLimiteContrato } from '@/lib/contratacion';
import { calcularDesempeno, type Desempeno, type ObraParaDesempeno } from '@/lib/server/contratistas/desempeno';

// Datos PÚBLICOS de contratistas. Solo obras publicadas y solo razón social y
// RIF (que ya se muestran en la ficha de cada obra): el correo, el teléfono y el
// contacto del contratista nunca salen de aquí.

const ESTATUS_CULMINADOS = ['culminada', 'inaugurada'];

const INCLUDE_OBRAS = {
  where: { estadoPublicacion: 'PUBLICADO' as const },
  select: {
    slug: true,
    nombre: true,
    moneda: true,
    avanceFisico: true,
    fechaFinEstimada: true,
    fechaFinReal: true,
    estatus: { select: { nombre: true } },
    municipio: { select: { nombre: true } },
    estado: { select: { nombre: true } },
    contrato: {
      select: {
        numeroContrato: true,
        modalidad: true,
        moneda: true,
        montoOriginal: true,
        montoActual: true,
        fechaFirma: true,
        plazoEjecucionDias: true,
        adendas: { select: { diasAdicionales: true } },
      },
    },
    _count: { select: { paralizaciones: true } },
  },
};

type ObraConContrato = Awaited<ReturnType<typeof cargarObras>>[number];

async function cargarObras(contratistaId: string) {
  return prisma.obra.findMany({ ...INCLUDE_OBRAS, where: { ...INCLUDE_OBRAS.where, contratistaId }, orderBy: { createdAt: 'desc' } });
}

function aDatosDesempeno(obra: ObraConContrato): ObraParaDesempeno {
  const c = obra.contrato;
  return {
    culminada: ESTATUS_CULMINADOS.includes(obra.estatus.nombre.toLowerCase()),
    fechaFinReal: obra.fechaFinReal,
    // Con contrato manda el plazo contractual (con adendas); sin él, la fecha estimada de la obra.
    fechaLimite: c ? fechaLimiteContrato(c.fechaFirma, c.plazoEjecucionDias, c.adendas) : obra.fechaFinEstimada,
    montoOriginal: c ? Number(c.montoOriginal) : null,
    montoActual: c ? Number(c.montoActual) : null,
    tuvoParalizacion: obra._count.paralizaciones > 0,
  };
}

export interface ContratistaResumen {
  id: string;
  razonSocial: string;
  rif: string | null;
  obrasPublicadas: number;
  desempeno: Desempeno;
}

export async function listarContratistasPublicos(): Promise<ContratistaResumen[]> {
  const contratistas = await prisma.contratista.findMany({
    where: { obras: { some: { estadoPublicacion: 'PUBLICADO' } } },
    select: { id: true, razonSocial: true, rif: true },
    orderBy: { razonSocial: 'asc' },
  });

  const resumenes = await Promise.all(
    contratistas.map(async (c) => {
      const obras = await cargarObras(c.id);
      return { ...c, obrasPublicadas: obras.length, desempeno: calcularDesempeno(obras.map(aDatosDesempeno)) };
    })
  );
  // Primero los que tienen puntaje (de mayor a menor); los demás, al final.
  return resumenes.sort((a, b) => (b.desempeno.puntaje ?? -1) - (a.desempeno.puntaje ?? -1) || a.razonSocial.localeCompare(b.razonSocial, 'es'));
}

export async function obtenerContratistaPublico(id: string) {
  const contratista = await prisma.contratista.findUnique({ where: { id }, select: { id: true, razonSocial: true, rif: true } });
  if (!contratista) return null;

  const obras = await cargarObras(id);
  if (obras.length === 0) return null; // sin obras publicadas no hay nada que mostrar

  return {
    ...contratista,
    desempeno: calcularDesempeno(obras.map(aDatosDesempeno)),
    obras: obras.map((o) => ({
      slug: o.slug,
      nombre: o.nombre,
      ubicacion: `${o.municipio.nombre}, ${o.estado.nombre}`,
      estatus: o.estatus.nombre,
      avanceFisico: o.avanceFisico,
      paralizaciones: o._count.paralizaciones,
      contrato: o.contrato
        ? {
            numeroContrato: o.contrato.numeroContrato,
            modalidad: o.contrato.modalidad,
            moneda: o.contrato.moneda,
            montoOriginal: Number(o.contrato.montoOriginal),
            montoActual: Number(o.contrato.montoActual),
          }
        : null,
    })),
  };
}
