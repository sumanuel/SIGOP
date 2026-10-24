import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { verifyAccessToken } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { listarHitos } from '@/lib/server/services/hitos.service';
import { GestionHitos } from '@/components/admin/gestion-hitos';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HitosDeObraPage({ params }: PageProps) {
  const { id } = await params;

  const obra = await prisma.obra.findUnique({ where: { id }, select: { id: true, nombre: true, estadoPublicacion: true } });
  if (!obra) notFound();

  let rol = '';
  try {
    rol = verifyAccessToken((await cookies()).get('accessToken')?.value ?? '').rol;
  } catch {
    rol = '';
  }
  // Lo que no puede cambiar este rol en esta obra (el servidor lo vuelve a comprobar).
  const bloqueado = rol === 'CONSULTA' || (rol === 'EDITOR_OBRA' && obra.estadoPublicacion === 'PUBLICADO');

  const hitos = await listarHitos(id);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href={`/admin/obras/${obra.id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a la obra
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Hitos de la obra</h1>
      <p className="mt-1 text-sm text-muted-foreground">{obra.nombre}</p>

      <div className="mt-6">
        <GestionHitos
          obraId={obra.id}
          bloqueado={bloqueado}
          hitosIniciales={hitos.map((h) => ({
            id: h.id,
            nombre: h.nombre,
            fechaPlanificada: h.fechaPlanificada?.toISOString() ?? null,
            fechaReal: h.fechaReal?.toISOString() ?? null,
            completado: h.completado,
          }))}
        />
      </div>
    </main>
  );
}
