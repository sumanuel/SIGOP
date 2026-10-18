import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { obtenerContratistaPublico } from '@/lib/server/services/contratistas.service';
import { InsigniaDesempeno } from '@/components/contratistas/insignia-desempeno';
import { MODALIDAD_LEGIBLE, variacionPorcentual, type ModalidadClave } from '@/lib/contratacion';
import { formatearMoneda } from '@/lib/format';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const c = await obtenerContratistaPublico(id);
  return { title: c ? `${c.razonSocial} — SIGOP` : 'Contratista no encontrado — SIGOP' };
}

export default async function ContratistaPage({ params }: PageProps) {
  const { id } = await params;
  const c = await obtenerContratistaPublico(id);
  if (!c) notFound();

  const d = c.desempeno;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/contratistas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Volver a contratistas
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{c.razonSocial}</h1>
          {c.rif && <p className="text-sm text-muted-foreground">RIF {c.rif}</p>}
        </div>
        <InsigniaDesempeno puntaje={d.puntaje} nivel={d.nivel} />
      </header>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Historial de cumplimiento</h2>
        {d.puntaje === null ? (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no hay obras culminadas de este contratista con las que calcular un puntaje.</p>
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Dato etiqueta="Obras culminadas" valor={String(d.obrasEvaluadas)} />
              <Dato etiqueta="Entregadas a tiempo" valor={d.pctATiempo === null ? 'Sin datos' : `${d.pctATiempo}%`} />
              <Dato etiqueta="Sobrecosto promedio" valor={d.sobrecostoPromedioPct === null ? 'Sin contratos' : `${d.sobrecostoPromedioPct}%`} />
              <Dato etiqueta="Sin paralizaciones" valor={d.pctSinParalizacion === null ? 'Sin datos' : `${d.pctSinParalizacion}%`} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Puntaje = 50% plazos + 30% sobrecosto + 20% paralizaciones. Se calcula automáticamente con los datos
              declarados por los entes responsables y no constituye una calificación oficial.
            </p>
          </>
        )}
      </section>

      <section className="mt-6" aria-labelledby="titulo-obras">
        <h2 id="titulo-obras" className="text-lg font-semibold">
          Obras ({c.obras.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {c.obras.map((o) => (
            <li key={o.slug} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <Link href={`/obras/${o.slug}`} className="font-semibold hover:text-primary hover:underline">
                {o.nombre}
              </Link>
              <p className="text-xs text-muted-foreground">
                {o.ubicacion} · {o.estatus} · avance {o.avanceFisico}%
                {o.paralizaciones > 0 && ` · ${o.paralizaciones} paralización${o.paralizaciones === 1 ? '' : 'es'}`}
              </p>
              {o.contrato && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Contrato {o.contrato.numeroContrato} · {MODALIDAD_LEGIBLE[o.contrato.modalidad as ModalidadClave]} ·{' '}
                  {formatearMoneda(o.contrato.montoOriginal, o.contrato.moneda)}
                  {o.contrato.montoActual !== o.contrato.montoOriginal &&
                    ` → ${formatearMoneda(o.contrato.montoActual, o.contrato.moneda)} (${variacionPorcentual(o.contrato.montoOriginal, o.contrato.montoActual) > 0 ? '+' : ''}${variacionPorcentual(o.contrato.montoOriginal, o.contrato.montoActual)}%)`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-base font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
