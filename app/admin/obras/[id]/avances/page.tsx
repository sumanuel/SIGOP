import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { listarAvancesDeObra } from '@/lib/server/services/avances.service';
import { GestionAvances } from '@/components/admin/gestion-avances';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AvancesDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!obra) notFound();

  const avances = await listarAvancesDeObra(id);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Avances de la obra</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionAvances
          obraId={obra.id}
          avancesIniciales={avances.map((a) => ({
            id: a.id,
            fecha: a.fecha.toISOString(),
            avanceFisico: a.avanceFisico,
            avanceFinanciero: a.avanceFinanciero,
            comentario: a.comentario,
            registradoPor: a.registradoPor,
          }))}
        />
      </div>
    </main>
  );
}
