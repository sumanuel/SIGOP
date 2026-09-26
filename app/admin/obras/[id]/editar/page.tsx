import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { obtenerObraDetalle } from '@/lib/server/services/obras.service';
import { ObraForm } from '@/components/admin/obra-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

function aFechaInput(fecha: Date | null): string {
  if (!fecha) return '';
  return fecha.toISOString().slice(0, 10); // yyyy-mm-dd para <input type="date">
}

export default async function EditarObraPage({ params }: PageProps) {
  const { id } = await params;

  const [catalogos, obra] = await Promise.all([
    obtenerCatalogos(),
    obtenerObraDetalle(id, { soloPublicado: false }),
  ]);

  if (!obra) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href="/admin/obras"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a obras
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Editar obra</h1>
          <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/obras/${obra.id}/avances`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Avances
          </Link>
          <Link
            href={`/admin/obras/${obra.id}/galeria`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Galería
          </Link>
          <Link
            href={`/admin/obras/${obra.id}/personal`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Personal
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ObraForm
          catalogos={catalogos}
          obraId={obra.id}
          valoresIniciales={{
            codigo: obra.codigo,
            slug: obra.slug,
            nombre: obra.nombre,
            descripcion: obra.descripcion ?? '',
            tipoObraId: obra.tipoObraId,
            estatusId: obra.estatusId,
            enteId: obra.enteId,
            contratistaId: obra.contratistaId ?? '',
            fuenteFinanciamientoId: obra.fuenteFinanciamientoId ?? '',
            estadoId: obra.estadoId,
            municipioId: obra.municipioId,
            parroquiaId: obra.parroquiaId ?? '',
            direccion: obra.direccion ?? '',
            lat: obra.lat,
            lng: obra.lng,
            presupuestoAprobado: Number(obra.presupuestoAprobado.toString()),
            montoEjecutado: Number(obra.montoEjecutado.toString()),
            moneda: obra.moneda,
            fechaAprobacion: aFechaInput(obra.fechaAprobacion),
            fechaInicio: aFechaInput(obra.fechaInicio),
            fechaFinEstimada: aFechaInput(obra.fechaFinEstimada),
            fechaFinReal: aFechaInput(obra.fechaFinReal),
            beneficiarios: obra.beneficiarios?.toString() ?? '',
            capacidadDescripcion: obra.capacidadDescripcion ?? '',
            destacada: obra.destacada,
            estadoPublicacion: obra.estadoPublicacion,
          }}
        />
      </div>
    </main>
  );
}
