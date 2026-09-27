import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { UsuarioForm } from '@/components/admin/usuario-form';

export default async function NuevoUsuarioPage() {
  const catalogos = await obtenerCatalogos();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a usuarios
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Nuevo usuario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Crea una cuenta de acceso al panel administrativo con su rol correspondiente.
      </p>

      <div className="mt-6">
        <UsuarioForm entes={catalogos.entes} />
      </div>
    </main>
  );
}
