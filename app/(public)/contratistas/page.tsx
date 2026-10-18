import Link from 'next/link';
import type { Metadata } from 'next';
import { listarContratistasPublicos } from '@/lib/server/services/contratistas.service';
import { InsigniaDesempeno } from '@/components/contratistas/insignia-desempeno';

export const metadata: Metadata = {
  title: 'Contratistas — SIGOP',
  description: 'Empresas contratistas de obras públicas y su historial de cumplimiento.',
};

export const dynamic = 'force-dynamic';

export default async function ContratistasPage() {
  const contratistas = await listarContratistasPublicos();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contratistas</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Empresas con obras publicadas en el portal y su historial de cumplimiento. El puntaje se calcula automáticamente
        con los datos que declaran los entes responsables: obras entregadas dentro del plazo del contrato, sobrecosto
        respecto al monto original y obras sin paralizaciones. Con pocas obras culminadas es solo orientativo.
      </p>

      {contratistas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay contratistas con obras publicadas.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {contratistas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div>
                <Link href={`/contratistas/${c.id}`} className="font-semibold hover:text-primary hover:underline">
                  {c.razonSocial}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.rif ? `RIF ${c.rif} · ` : ''}
                  {c.obrasPublicadas} obra{c.obrasPublicadas === 1 ? '' : 's'} publicada{c.obrasPublicadas === 1 ? '' : 's'}
                  {c.desempeno.obrasEvaluadas > 0 && ` · ${c.desempeno.obrasEvaluadas} culminada${c.desempeno.obrasEvaluadas === 1 ? '' : 's'}`}
                </p>
              </div>
              <InsigniaDesempeno puntaje={c.desempeno.puntaje} nivel={c.desempeno.nivel} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
