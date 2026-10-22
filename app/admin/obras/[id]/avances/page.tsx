import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { listarAvancesDeObra, nombresDeUsuarios, ROLES_APROBADORES } from '@/lib/server/services/avances.service';
import { GestionAvances } from '@/components/admin/gestion-avances';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AvancesDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true, estadoPublicacion: true } });
  if (!obra) notFound();

  let rol = '';
  try {
    rol = verifyAccessToken((await cookies()).get('accessToken')?.value ?? '').rol;
  } catch {
    rol = '';
  }
  const avances = await listarAvancesDeObra(id);
  const autores = await nombresDeUsuarios(avances.map((a) => a.registradoPor));

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
          puedeAprobar={ROLES_APROBADORES.includes(rol)}
          obraPublicada={obra.estadoPublicacion === 'PUBLICADO'}
          avancesIniciales={avances.map((a) => ({
            id: a.id,
            fecha: a.fecha.toISOString(),
            avanceFisico: a.avanceFisico,
            avanceFinanciero: a.avanceFinanciero,
            comentario: a.comentario,
            aprobado: a.aprobadoEn !== null,
            registradoPor: a.registradoPor ? (autores.get(a.registradoPor)?.nombre ?? a.registradoPor) : null,
          }))}
        />
      </div>
    </main>
  );
}
