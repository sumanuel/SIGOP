import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { listarAsignacionesDeObra } from '@/lib/server/services/asignaciones.service';
import { listarPersonas } from '@/lib/server/services/personas.service';
import { GestionPersonal } from '@/components/admin/gestion-personal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonalDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!obra) notFound();

  const [cargos, personas, asignaciones] = await Promise.all([
    prisma.cargo.findMany({ orderBy: { nivelJerarquico: 'asc' } }),
    listarPersonas(),
    listarAsignacionesDeObra(id),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Personal de la obra</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionPersonal
          obraId={obra.id}
          cargos={cargos}
          personasIniciales={personas.map((p) => ({
            id: p.id,
            nombres: p.nombres,
            apellidos: p.apellidos,
            profesion: p.profesion,
            consentimientoPublicacion: p.consentimientoPublicacion,
          }))}
          asignacionesIniciales={asignaciones.map((a) => ({
            id: a.id,
            area: a.area,
            supervisorId: a.supervisorId,
            fechaIngreso: a.fechaIngreso ? a.fechaIngreso.toISOString() : null,
            visiblePublico: a.visiblePublico,
            persona: {
              id: a.persona.id,
              nombres: a.persona.nombres,
              apellidos: a.persona.apellidos,
              profesion: a.persona.profesion,
              consentimientoPublicacion: a.persona.consentimientoPublicacion,
            },
            cargo: { id: a.cargo.id, nombre: a.cargo.nombre, nivelJerarquico: a.cargo.nivelJerarquico },
          }))}
        />
      </div>
    </main>
  );
}
