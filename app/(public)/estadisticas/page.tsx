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
        Cifras agregadas de todas las obras publicadas. Los montos se muestran en la moneda de
        cada obra, sin conversión de divisas: nunca se suman bolívares con dólares.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Obras registradas" valores={[stats.totalObras.toString()]} />
        <Kpi
          label="Inversión total"
          valores={stats.monedas.map((m) => formatearMoneda(stats.inversionPorMoneda[m], m))}
        />
        <Kpi label="Culminadas / inauguradas" valores={[stats.obrasCulminadas.toString()]} />
        <Kpi label="Avance promedio" valores={[`${stats.avancePromedio}%`]} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-sm font-semibold">Obras por tipo</h2>
          <GraficoPorTipo datos={stats.porTipo} />
        </section>

        {stats.monedas.length === 0 ? (
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-4 text-sm font-semibold">Inversión por estado</h2>
            <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
          </section>
        ) : (
          stats.monedas.map((moneda) => (
            <section key={moneda} className="rounded-lg border border-border p-4">
              <h2 className="mb-4 text-sm font-semibold">Inversión por estado ({moneda})</h2>
              <GraficoPorEstado datos={stats.porEstado} moneda={moneda} />
            </section>
          ))
        )}
      </div>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Obras culminadas por año</h2>
        <GraficoCulminadasPorAnio datos={stats.culminadasPorAnio} />
      </section>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-semibold">Ranking de estados por avance promedio</h2>
        <RankingEstados datos={stats.porEstado} monedas={stats.monedas} />
      </section>
    </div>
  );
}

function Kpi({ label, valores }: { label: string; valores: string[] }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {valores.length === 0 ? (
        <p className="mt-1 text-lg font-semibold leading-tight sm:text-xl">—</p>
      ) : (
        // Una línea por valor: la inversión se muestra una vez por cada moneda.
        valores.map((valor) => (
          <p key={valor} className="mt-1 text-lg font-semibold leading-tight sm:text-xl">
            {valor}
          </p>
        ))
      )}
    </div>
  );
}
