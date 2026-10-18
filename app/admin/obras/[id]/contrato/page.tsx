import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { obtenerContratoDeObra } from '@/lib/server/services/contratos.service';
import { GestionContrato } from '@/components/admin/gestion-contrato';
import { fechaLimiteContrato, type ModalidadClave } from '@/lib/contratacion';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContratoDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true, moneda: true, contratistaId: true } });
  if (!obra) notFound();

  const [contrato, catalogos] = await Promise.all([obtenerContratoDeObra(id), obtenerCatalogos()]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Contrato</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionContrato
          obraId={obra.id}
          monedaObra={obra.moneda}
          contratistaObraId={obra.contratistaId}
          contratistas={catalogos.contratistas.map((c) => ({ id: c.id, razonSocial: c.razonSocial }))}
          contrato={
            contrato
              ? {
                  id: contrato.id,
                  numeroContrato: contrato.numeroContrato,
                  modalidad: contrato.modalidad as ModalidadClave,
                  moneda: contrato.moneda,
                  montoOriginal: Number(contrato.montoOriginal),
                  montoActual: Number(contrato.montoActual),
                  fechaFirma: contrato.fechaFirma.toISOString(),
                  plazoEjecucionDias: contrato.plazoEjecucionDias,
                  fechaLimite: fechaLimiteContrato(contrato.fechaFirma, contrato.plazoEjecucionDias, contrato.adendas).toISOString(),
                  contratista: contrato.contratista.razonSocial,
                  adendas: contrato.adendas.map((a) => ({
                    id: a.id,
                    numero: a.numero,
                    motivo: a.motivo,
                    montoAnterior: Number(a.montoAnterior),
                    montoNuevo: Number(a.montoNuevo),
                    diasAdicionales: a.diasAdicionales,
                    fecha: a.fecha.toISOString(),
                  })),
                }
              : null
          }
        />
      </div>
    </main>
  );
}
