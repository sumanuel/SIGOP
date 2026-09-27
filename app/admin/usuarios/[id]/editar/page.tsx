import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerUsuario } from '@/lib/server/services/usuarios.service';
import { obtenerCatalogos } from '@/lib/server/services/catalogos.service';
import { UsuarioForm } from '@/components/admin/usuario-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({ params }: PageProps) {
  const { id } = await params;

  const [usuario, catalogos] = await Promise.all([obtenerUsuario(id), obtenerCatalogos()]);
  if (!usuario) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a usuarios
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Editar usuario — {usuario.nombre}</h1>

      <div className="mt-6">
        <UsuarioForm
          usuarioId={usuario.id}
          entes={catalogos.entes}
          valoresIniciales={{
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            enteId: usuario.enteId ?? '',
            activo: usuario.activo,
          }}
        />
      </div>
    </main>
  );
}
