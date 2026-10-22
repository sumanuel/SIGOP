import { ArrowRight, FileText } from 'lucide-react';
import { formatearMoneda } from '@/lib/format';

interface Partida {
  codigo: string;
  descripcion: string;
  ejercicioFiscal: number;
}

interface CambioPresupuesto {
  id: string;
  montoAnterior: { toString(): string };
  montoNuevo: { toString(): string };
  moneda: string;
  motivo: string;
  documentoUrl: string | null;
  fecha: Date;
}

const formatoFecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

// Respaldo legal del presupuesto en la ficha pública: la partida oficial y cada
// vez que el monto aprobado cambió, con su justificación (módulo 10).
export function ObraPresupuesto({ partida, historial }: { partida: Partida | null; historial: CambioPresupuesto[] }) {
  if (!partida && historial.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Respaldo presupuestario</h2>

      {partida && (
        <p className="text-sm text-muted-foreground">
          Partida <span className="font-mono font-medium text-foreground">{partida.codigo}</span> — {partida.descripcion}{' '}
          (ejercicio fiscal {partida.ejercicioFiscal}).
        </p>
      )}

      {historial.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Modificaciones del presupuesto</h3>
          <ul className="flex flex-col gap-2">
            {historial.map((c) => (
              <li key={c.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="flex flex-wrap items-center gap-1.5 font-medium tabular-nums">
                  {formatearMoneda(c.montoAnterior, c.moneda)}
                  <ArrowRight className="size-4 text-muted-foreground" aria-label="cambió a" />
                  {formatearMoneda(c.montoNuevo, c.moneda)}
                </p>
                <p className="mt-1 text-muted-foreground">{c.motivo}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {formatoFecha.format(c.fecha)}
                  {c.documentoUrl && (
                    <a
                      href={c.documentoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <FileText className="size-3.5" aria-hidden="true" />
                      Documento de respaldo
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
