import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { obtenerMantenimientoDeObra } from '@/lib/server/services/mantenimiento.service';
import { GestionMantenimiento } from '@/components/admin/gestion-mantenimiento';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MantenimientoDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true, moneda: true } });
  if (!obra) notFound();

  const garantia = await obtenerMantenimientoDeObra(id);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Mantenimiento y garantía</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionMantenimiento
          obraId={obra.id}
          monedaObra={obra.moneda}
          garantia={
            garantia && {
              fechaInicioGarantia: garantia.fechaInicioGarantia.toISOString(),
              fechaFinGarantia: garantia.fechaFinGarantia.toISOString(),
              cubreEstructura: garantia.cubreEstructura,
              cubreInstalaciones: garantia.cubreInstalaciones,
              observaciones: garantia.observaciones,
            }
          }
          intervenciones={(garantia?.intervenciones ?? []).map((i) => ({
            id: i.id,
            fecha: i.fecha.toISOString(),
            tipo: i.tipo,
            descripcion: i.descripcion,
            costo: i.costo === null ? null : Number(i.costo),
            moneda: i.moneda,
            realizadoPor: i.realizadoPor,
          }))}
        />
      </div>
    </main>
  );
}
