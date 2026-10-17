import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerEstadoParalizacion } from '@/lib/server/services/paralizaciones.service';
import { GestionParalizaciones } from '@/components/admin/gestion-paralizaciones';
import type { MotivoParalizacionClave } from '@/lib/paralizacion';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ParalizacionesDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const estado = await obtenerEstadoParalizacion(id);
  if (!estado) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href={`/admin/obras/${estado.obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Paralizaciones</h1>
      <p className="mt-1 text-sm text-muted-foreground">{estado.obra.nombre}</p>

      <div className="mt-6">
        <GestionParalizaciones
          obraId={estado.obra.id}
          periodosIniciales={estado.periodos.map((p) => ({
            id: p.id,
            motivo: p.motivo as MotivoParalizacionClave,
            descripcion: p.descripcion,
            fechaInicio: p.fechaInicio.toISOString(),
            fechaReactivacion: p.fechaReactivacion?.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}
