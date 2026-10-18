import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import { MODALIDAD_LEGIBLE, fechaLimiteContrato, variacionPorcentual, type ModalidadClave } from '@/lib/contratacion';
import { formatearMoneda } from '@/lib/format';

interface ContratoPublico {
  numeroContrato: string;
  modalidad: string;
  moneda: string;
  montoOriginal: { toString(): string };
  montoActual: { toString(): string };
  fechaFirma: Date;
  plazoEjecucionDias: number;
  adendas: { id: string; numero: number; motivo: string; montoAnterior: { toString(): string }; montoNuevo: { toString(): string }; diasAdicionales: number; fecha: Date }[];
}

interface ObraContratacionProps {
  contrato: ContratoPublico | null;
  contratista: { id: string; razonSocial: string } | null;
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

// Cómo se contrató la obra: modalidad, monto original vs actual y adendas.
export function ObraContratacion({ contrato, contratista }: ObraContratacionProps) {
  if (!contrato) return null;

  const original = Number(contrato.montoOriginal.toString());
  const actual = Number(contrato.montoActual.toString());
  const variacion = variacionPorcentual(original, actual);
  const limite = fechaLimiteContrato(contrato.fechaFirma, contrato.plazoEjecucionDias, contrato.adendas);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <FileSignature className="size-5" aria-hidden="true" />
        Contratación
      </h2>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Dato etiqueta="Contrato n.º" valor={contrato.numeroContrato} />
        <Dato etiqueta="Modalidad" valor={MODALIDAD_LEGIBLE[contrato.modalidad as ModalidadClave] ?? contrato.modalidad} />
        {contratista && (
          <div>
            <dt className="text-xs text-muted-foreground">Contratista</dt>
            <dd className="font-medium">
              <Link href={`/contratistas/${contratista.id}`} className="text-primary hover:underline">
                {contratista.razonSocial}
              </Link>
            </dd>
          </div>
        )}
        <Dato etiqueta="Firmado" valor={formatoFecha.format(contrato.fechaFirma)} />
        <Dato etiqueta="Monto original" valor={formatearMoneda(original, contrato.moneda)} />
        <Dato
          etiqueta="Monto actual"
          valor={`${formatearMoneda(actual, contrato.moneda)}${variacion !== 0 ? ` (${variacion > 0 ? '+' : ''}${variacion}%)` : ''}`}
        />
        <Dato etiqueta="Plazo contractual" valor={`${contrato.plazoEjecucionDias} días · vence el ${formatoFecha.format(limite)}`} />
      </dl>

      {contrato.adendas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Modificaciones (adendas)</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {contrato.adendas.map((a) => (
              <li key={a.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  Adenda n.º {a.numero} · {formatoFecha.format(a.fecha)}
                </p>
                <p className="text-muted-foreground">
                  {formatearMoneda(Number(a.montoAnterior.toString()), contrato.moneda)} →{' '}
                  {formatearMoneda(Number(a.montoNuevo.toString()), contrato.moneda)}
                  {a.diasAdicionales > 0 && ` · +${a.diasAdicionales} días de plazo`}
                </p>
                <p className="mt-1">{a.motivo}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
