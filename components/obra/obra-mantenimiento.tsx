import { FileImage, ShieldCheck, ShieldAlert, Wrench } from 'lucide-react';
import { formatearMoneda } from '@/lib/format';
import {
  ESTADO_GARANTIA_LEGIBLE,
  TIPO_INTERVENCION_LEGIBLE,
  resumenIntervenciones,
  situacionGarantia,
  type TipoIntervencion,
} from '@/lib/mantenimiento';

interface Intervencion {
  id: string;
  fecha: Date;
  tipo: string;
  descripcion: string;
  costo: { toString(): string } | null;
  moneda: string;
  realizadoPor: string | null;
  fotoAntesUrl: string | null;
  fotoDespuesUrl: string | null;
}

interface Garantia {
  fechaInicioGarantia: Date;
  fechaFinGarantia: Date;
  cubreEstructura: boolean;
  cubreInstalaciones: boolean;
  observaciones: string | null;
  intervenciones: Intervencion[];
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

// "Estado actual" de una obra ya entregada (módulo 8): garantía y mantenimiento
// posterior, para que la obra no desaparezca del radar tras la inauguración.
export function ObraMantenimiento({ garantia }: { garantia: Garantia | null }) {
  if (!garantia) return null;

  const situacion = situacionGarantia(garantia.fechaInicioGarantia, garantia.fechaFinGarantia);
  const resumen = resumenIntervenciones(
    garantia.intervenciones.map((i) => ({ fecha: i.fecha, costo: i.costo === null ? null : Number(i.costo.toString()), moneda: i.moneda }))
  );
  const vencida = situacion.estado === 'VENCIDA';
  const Icono = vencida ? ShieldAlert : ShieldCheck;
  const cubre = [garantia.cubreEstructura && 'estructura', garantia.cubreInstalaciones && 'instalaciones'].filter(Boolean);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Wrench className="size-5" aria-hidden="true" />
        Mantenimiento y garantía
      </h2>

      <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm">
        <Icono className={`mt-0.5 size-5 shrink-0 ${vencida ? 'text-muted-foreground' : 'text-success'}`} aria-hidden="true" />
        <div>
          <p className="font-medium">
            {ESTADO_GARANTIA_LEGIBLE[situacion.estado]}
            {situacion.estado !== 'VENCIDA' && situacion.estado !== 'SIN_INICIAR' && ` — ${situacion.diasRestantes} días restantes`}
          </p>
          <p className="text-muted-foreground">
            Del {formatoFecha.format(garantia.fechaInicioGarantia)} al {formatoFecha.format(garantia.fechaFinGarantia)}
            {cubre.length > 0 && `. Cubre ${cubre.join(' e ')}`}.
          </p>
          {garantia.observaciones && <p className="mt-1 text-muted-foreground">{garantia.observaciones}</p>}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {resumen.total === 0
          ? 'Todavía no se ha registrado ninguna intervención de mantenimiento.'
          : `${resumen.total} ${resumen.total === 1 ? 'intervención registrada' : 'intervenciones registradas'}; la última fue el ${formatoFecha.format(resumen.ultima as Date)}.`}
        {Object.entries(resumen.costosPorMoneda).map(([moneda, monto]) => (
          <span key={moneda}> Costo acumulado: {formatearMoneda(monto, moneda)}.</span>
        ))}
      </p>

      {garantia.intervenciones.length > 0 && (
        <ul className="flex flex-col gap-2">
          {garantia.intervenciones.map((i) => (
            <li key={i.id} className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {TIPO_INTERVENCION_LEGIBLE[i.tipo as TipoIntervencion] ?? i.tipo} · {formatoFecha.format(i.fecha)}
                </span>
                {i.costo !== null && (
                  <span className="tabular-nums text-muted-foreground">{formatearMoneda(i.costo, i.moneda)}</span>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">{i.descripcion}</p>
              {(i.realizadoPor || i.fotoAntesUrl || i.fotoDespuesUrl) && (
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {i.realizadoPor && <span>Realizado por {i.realizadoPor}</span>}
                  {[
                    { url: i.fotoAntesUrl, texto: 'Foto antes' },
                    { url: i.fotoDespuesUrl, texto: 'Foto después' },
                  ].map(
                    ({ url, texto }) =>
                      url && (
                        <a
                          key={texto}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                        >
                          <FileImage className="size-3.5" aria-hidden="true" />
                          {texto}
                        </a>
                      )
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
