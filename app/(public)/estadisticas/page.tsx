import { obtenerFilasEstadisticas } from '@/lib/server/services/estadisticas.service';
import { filtrosDesdeParametros } from '@/lib/estadisticas';
import { EstadisticasDinamicas } from '@/components/estadisticas/estadisticas-dinamicas';

export const metadata = {
  title: 'Estadísticas — SIGOP',
  description: 'Inversión, avance y obras públicas por estado y tipo.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EstadisticasPage({ searchParams }: PageProps) {
  const [filas, params] = await Promise.all([obtenerFilasEstadisticas(), searchParams]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Estadísticas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cifras agregadas de las obras publicadas. Filtra con los selectores o tocando las gráficas. Los
        montos se muestran en la moneda de cada obra, sin conversión de divisas: nunca se suman bolívares
        con dólares.
      </p>

      <div className="mt-6">
        <EstadisticasDinamicas filas={filas} filtrosIniciales={filtrosDesdeParametros(params)} />
      </div>
    </div>
  );
}
