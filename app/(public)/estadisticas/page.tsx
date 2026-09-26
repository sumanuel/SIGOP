import { obtenerEstadisticasPublicas } from '@/lib/server/services/estadisticas.service';
import { formatearMoneda } from '@/lib/format';
import { GraficoPorTipo } from '@/components/estadisticas/grafico-por-tipo';
import { GraficoPorEstado } from '@/components/estadisticas/grafico-por-estado';
import { GraficoCulminadasPorAnio } from '@/components/estadisticas/grafico-culminadas-por-anio';
import { RankingEstados } from '@/components/estadisticas/ranking-estados';

export const metadata = {
  title: 'Estadísticas — SIGOP',
  description: 'Inversión, avance y obras públicas por estado y tipo.',
};

export default async function EstadisticasPage() {
  const stats = await obtenerEstadisticasPublicas();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Estadísticas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cifras agregadas de todas las obras publicadas. Los montos se muestran en VES sin
        conversión de divisas.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Obras registradas" valor={stats.totalObras.toString()} />
        <Kpi label="Inversión total" valor={formatearMoneda(stats.inversionTotal, 'VES')} />
        <Kpi label="Culminadas / inauguradas" valor={stats.obrasCulminadas.toString()} />
        <Kpi label="Avance promedio" valor={`${stats.avancePromedio}%`} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-semibold">Obras por tipo</h2>
          <GraficoPorTipo datos={stats.porTipo} />
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-semibold">Inversión por estado</h2>
          <GraficoPorEstado datos={stats.porEstado} />
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Obras culminadas por año</h2>
        <GraficoCulminadasPorAnio datos={stats.culminadasPorAnio} />
      </section>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Ranking de estados por avance promedio</h2>
        <RankingEstados datos={stats.porEstado} />
      </section>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-tight sm:text-xl">{valor}</p>
    </div>
  );
}
