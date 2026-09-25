import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { ObraForm } from '@/components/admin/obra-form';

export default async function NuevaObraPage() {
  const catalogos = await obtenerCatalogos();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href="/admin/obras"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a obras
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Nueva obra</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Se crea en estado <strong>Borrador</strong> — pásala a &quot;Publicado&quot; desde la edición
        cuando esté lista para el portal.
      </p>

      <div className="mt-6">
        <ObraForm catalogos={catalogos} />
      </div>
    </main>
  );
}
