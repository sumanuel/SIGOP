import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PersonaForm } from '@/components/admin/persona-form';

export default function NuevaPersonaPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href="/admin/personas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a personas
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">Nueva persona</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Se agrega al directorio general. Para asignarla a una obra, hazlo desde la ficha de esa obra.
      </p>

      <div className="mt-6">
        <PersonaForm />
      </div>
    </main>
  );
}
