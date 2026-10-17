import Link from 'next/link';
import type { Metadata } from 'next';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { listarObrasParalizadasPublicas, type ObraParalizadaPublica } from '@/lib/server/services/paralizaciones.service';
import { MOTIVO_LEGIBLE, duracionLegible } from '@/lib/paralizacion';

export const metadata: Metadata = {
  title: 'Obras paralizadas — SIGOP',
  description: 'Obras públicas que están paralizadas o que fueron reactivadas, con su motivo y el tiempo detenidas.',
};

// Datos vivos (las paralizaciones cambian a diario y el tiempo transcurrido se calcula al pedir la página).
export const dynamic = 'force-dynamic';

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

export default async function ObrasParalizadasPage() {
  const obras = await listarObrasParalizadasPublicas();
  const paralizadas = obras.filter((o) => o.paralizadaAhora);
  const reactivadas = obras.filter((o) => !o.paralizadaAhora);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Obras paralizadas</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Registro de las obras que se han detenido, con el motivo y las fechas exactas. Solo documenta lo que declara el
        ente responsable: no atribuye responsabilidades.
      </p>

      <section className="mt-8" aria-labelledby="titulo-paralizadas">
        <h2 id="titulo-paralizadas" className="flex items-center gap-2 text-lg font-semibold">
          <PauseCircle className="size-5 text-destructive" aria-hidden="true" />
          Paralizadas actualmente ({paralizadas.length})
        </h2>
        {paralizadas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            No hay obras paralizadas registradas.
          </p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {paralizadas.map((obra) => (
              <TarjetaObra key={obra.slug} obra={obra} />
            ))}
          </ul>
        )}
      </section>

      {reactivadas.length > 0 && (
        <section className="mt-10" aria-labelledby="titulo-reactivadas">
          <h2 id="titulo-reactivadas" className="flex items-center gap-2 text-lg font-semibold">
            <PlayCircle className="size-5 text-success" aria-hidden="true" />
            Reactivadas ({reactivadas.length})
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {reactivadas.map((obra) => (
              <TarjetaObra key={obra.slug} obra={obra} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TarjetaObra({ obra }: { obra: ObraParalizadaPublica }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs text-muted-foreground">
          {obra.tipoObra} · {obra.municipio}, {obra.estado}
        </p>
        <h3 className="mt-0.5 text-base font-semibold leading-snug">
          <Link href={`/obras/${obra.slug}`} className="hover:text-primary hover:underline">
            {obra.nombre}
          </Link>
        </h3>
      </div>

      {obra.paralizadaAhora ? (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
          <PauseCircle className="size-4" aria-hidden="true" />
          {obra.desde ? `Detenida hace ${duracionLegible(obra.diasActual)}` : 'Paralizada (sin fecha registrada)'}
        </p>
      ) : (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          <PlayCircle className="size-4" aria-hidden="true" />
          Reactivada · estuvo detenida {duracionLegible(obra.diasTotal)}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        {obra.paralizadaAhora && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Motivo declarado</dt>
            <dd>{obra.motivoActual ? MOTIVO_LEGIBLE[obra.motivoActual] : 'No registrado'}</dd>
            {obra.descripcionActual && <dd className="text-muted-foreground">{obra.descripcionActual}</dd>}
          </div>
        )}
        {obra.desde && (
          <div>
            <dt className="text-xs text-muted-foreground">Desde</dt>
            <dd>{formatoFecha.format(obra.desde)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">Avance físico</dt>
          <dd className="tabular-nums">{obra.avanceFisico}%</dd>
        </div>
        {obra.periodos > 1 && (
          <div>
            <dt className="text-xs text-muted-foreground">Paralizaciones</dt>
            <dd>
              {obra.periodos} (total {duracionLegible(obra.diasTotal)})
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}
