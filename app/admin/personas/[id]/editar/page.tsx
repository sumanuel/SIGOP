import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerPersona } from '@/lib/server/services/personas.service';
import { PersonaForm } from '@/components/admin/persona-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarPersonaPage({ params }: PageProps) {
  const { id } = await params;
  const persona = await obtenerPersona(id);
  if (!persona) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link
        href="/admin/personas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a personas
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">
        Editar persona — {persona.nombres} {persona.apellidos}
      </h1>

      {persona.asignaciones.length > 0 && (
        <div className="mt-3 rounded-md border border-border p-3 text-sm">
          <p className="mb-1 font-medium">Asignada actualmente en:</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {persona.asignaciones.map((a) => (
              <li key={a.id}>
                {a.obra.nombre} — {a.cargo.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <PersonaForm
          personaId={persona.id}
          valoresIniciales={{
            nombres: persona.nombres,
            apellidos: persona.apellidos,
            fotoUrl: persona.fotoUrl ?? '',
            profesion: persona.profesion ?? '',
            especialidad: persona.especialidad ?? '',
            aniosExperiencia: persona.aniosExperiencia?.toString() ?? '',
            bioCorta: persona.bioCorta ?? '',
            documentoIdentidad: persona.documentoIdentidad ?? '',
            consentimientoPublicacion: persona.consentimientoPublicacion,
          }}
        />
      </div>
    </main>
  );
}
