import type { Metadata } from 'next';
import { prisma } from '@/lib/server/prisma';
import { FormularioDenuncia } from '@/components/denuncias/formulario-denuncia';

export const metadata: Metadata = {
  title: 'Hacer una denuncia — SIGOP',
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ obra?: string }>;
}

export default async function NuevaDenunciaPage({ searchParams }: PageProps) {
  const { obra: slug } = await searchParams;

  const obra = slug
    ? await prisma.obra.findFirst({ where: { slug, estadoPublicacion: 'PUBLICADO' }, select: { slug: true, nombre: true } })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hacer una denuncia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cuéntanos qué viste. No es obligatorio decir quién eres. Antes de empezar, puedes leer{' '}
        <a href="/denuncias" className="text-primary hover:underline">
          cómo te protegemos
        </a>
        .
      </p>

      <FormularioDenuncia obra={obra} />
    </div>
  );
}
