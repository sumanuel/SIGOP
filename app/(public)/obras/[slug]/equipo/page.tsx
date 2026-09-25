import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { obtenerObraDetalle } from '@/lib/server/services/obras.service';
import { Organigrama } from '@/components/equipo/organigrama';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const obra = await obtenerObraDetalle(slug, { soloPublicado: true });
  if (!obra) return { title: 'Obra no encontrada — SIGOP' };
  return { title: `Equipo de trabajo — ${obra.nombre} — SIGOP` };
}

export default async function EquipoDeTrabajoPage({ params }: PageProps) {
  const { slug } = await params;
  const obra = await obtenerObraDetalle(slug, { soloPublicado: true });
  if (!obra) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/obras/${obra.slug}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Equipo de trabajo</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-8">
        <Organigrama personal={obra.personal} />
      </div>
    </div>
  );
}
