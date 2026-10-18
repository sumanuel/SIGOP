import type { Metadata } from 'next';
import { obtenerRanking } from '@/lib/server/services/ranking.service';
import { RankingVista } from '@/components/ranking/ranking-vista';

export const metadata: Metadata = {
  title: 'Ranking y comparador — SIGOP',
  description: 'Compara estados, municipios y obras similares por avance, cumplimiento de plazos e inversión.',
};

// Cifras vivas: el atraso depende de la fecha de hoy.
export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const datos = await obtenerRanking();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ranking y comparador</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Compara cómo avanzan las obras públicas publicadas por estado y municipio, o busca obras del mismo tipo para ver
        cuánto cuestan por beneficiario. Haz clic en el encabezado de una columna para ordenar. Las cifras dependen de lo
        que declara cada ente responsable.
      </p>

      <RankingVista datos={datos} />
    </div>
  );
}
