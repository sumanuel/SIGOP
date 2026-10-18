import type { Metadata } from 'next';
import { SeguimientoDenuncia } from '@/components/denuncias/seguimiento-denuncia';

export const metadata: Metadata = {
  title: 'Seguimiento de denuncia — SIGOP',
  robots: { index: false },
};

export default function SeguimientoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Seguimiento de tu denuncia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Escribe el código que recibiste al enviarla (empieza por <code>DEN-</code>). No necesitas iniciar sesión ni decir
        quién eres.
      </p>
      <SeguimientoDenuncia />
    </div>
  );
}
