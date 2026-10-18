import Link from 'next/link';
import type { Metadata } from 'next';
import { EyeOff, FileSearch, Lock, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Denuncias — SIGOP',
  description: 'Denuncia irregularidades en obras públicas de forma anónima y sigue tu caso con un código.',
};

const GARANTIAS = [
  {
    icono: EyeOff,
    titulo: 'Puede ser anónima',
    texto: 'No te pedimos nombre ni correo. No guardamos tu dirección de internet ni datos de tu navegador.',
  },
  {
    icono: Lock,
    titulo: 'Tu contacto, si lo dejas, va cifrado',
    texto: 'Solo lo dejas si quieres que te contacten. Se guarda cifrado y cada vez que alguien lo consulta queda registrado.',
  },
  {
    icono: ShieldCheck,
    titulo: 'La ven pocas personas',
    texto: 'Solo la revisan el super administrador y quien aprueba contenido; el personal del ente responsable de la obra no tiene acceso.',
  },
];

export default function DenunciasPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Denuncias</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Si sabes de una posible irregularidad en una obra pública (sobrecostos, incumplimientos, mala calidad, desvío de
        recursos), puedes decírnoslo aquí. Una denuncia es más seria que una simple observación sobre una obra: pasa a
        un equipo de revisión que puede derivarla a un organismo de control.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/denuncias/nueva"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Hacer una denuncia
        </Link>
        <Link
          href="/denuncias/seguimiento"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileSearch className="size-4" aria-hidden="true" />
          Consultar el estado de mi denuncia
        </Link>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {GARANTIAS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <Icono className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">{titulo}</h2>
            <p className="text-sm text-muted-foreground">{texto}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Cómo funciona</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Describes lo que viste y, si puedes, añades un enlace a la evidencia.</li>
          <li>
            Al enviarla recibes un <strong className="text-foreground">código de seguimiento</strong>. Se muestra una sola
            vez y no se puede recuperar: guárdalo.
          </li>
          <li>
            Con ese código consultas en cualquier momento si tu denuncia fue recibida, está en revisión, fue derivada a
            un organismo o se cerró, y lees los mensajes del equipo.
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Si quieres seguir siendo anónimo/a, no escribas tu nombre ni datos que te identifiquen en la descripción.
          Enviar denuncias falsas con mala intención puede tener consecuencias legales para quien las hace.
        </p>
      </section>
    </div>
  );
}
