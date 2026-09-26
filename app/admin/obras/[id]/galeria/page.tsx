import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { listarMultimediaDeObra } from '@/lib/server/services/multimedia.service';
import { listarAvancesDeObra } from '@/lib/server/services/avances.service';
import { GestionGaleria } from '@/components/admin/gestion-galeria';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GaleriaDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!obra) notFound();

  const [multimedia, avances] = await Promise.all([listarMultimediaDeObra(id), listarAvancesDeObra(id)]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Galería de la obra</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionGaleria
          obraId={obra.id}
          multimediaInicial={multimedia.map((m) => ({
            id: m.id,
            url: m.url,
            miniaturaUrl: m.miniaturaUrl,
            titulo: m.titulo,
            etapa: m.etapa,
            esPortada: m.esPortada,
            avanceId: m.avanceId,
            fechaCaptura: m.fechaCaptura ? m.fechaCaptura.toISOString() : null,
            latitudExif: m.latitudExif,
            longitudExif: m.longitudExif,
          }))}
          avancesDisponibles={avances.map((a) => ({ id: a.id, fecha: a.fecha.toISOString(), avanceFisico: a.avanceFisico }))}
        />
      </div>
    </main>
  );
}
