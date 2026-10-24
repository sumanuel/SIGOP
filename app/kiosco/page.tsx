import type { Metadata } from 'next';
import { Kiosco } from '@/components/kiosco/kiosco';
import { opcionesDesdeParametros } from '@/lib/kiosco';

export const metadata: Metadata = {
  title: 'Modo kiosco — SIGOP',
  description: 'Recorrido automático por las obras destacadas, para pantallas en actos públicos.',
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KioscoPage({ searchParams }: PageProps) {
  return <Kiosco opciones={opcionesDesdeParametros(await searchParams)} />;
}
