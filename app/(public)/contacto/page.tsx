import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Contacto — SIGOP',
  description: 'Cómo comunicarte con el equipo responsable de SIGOP.',
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contacto</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este es un proyecto piloto — los canales de contacto oficiales del ente responsable se
        definirán al desplegar SIGOP en producción. Mientras tanto, puedes usar los siguientes
        medios.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Correo institucional</p>
            <a href="mailto:contacto@sigop.gob.ve" className="text-sm text-primary hover:underline">
              contacto@sigop.gob.ve
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <MessageSquare className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">¿Tienes una observación sobre una obra puntual?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Entra a la ficha de esa obra desde el{' '}
              <Link href="/" className="text-primary hover:underline">
                mapa
              </Link>{' '}
              y usa la opción para reportar una observación — llega directo al equipo que gestiona
              esa obra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
