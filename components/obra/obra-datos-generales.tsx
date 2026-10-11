import ObrasMapLoader from '@/components/map/obras-map-loader';
import type { ObraMapa } from '@/lib/types/obra';

interface ObraDatosGeneralesProps {
  ente: { nombre: string; siglas: string | null };
  contratista: { razonSocial: string; rif: string | null } | null;
  beneficiarios: number | null;
  capacidadDescripcion: string | null;
  direccion: string | null;
  mapaObra: ObraMapa | null;
}

export function ObraDatosGenerales({
  ente,
  contratista,
  beneficiarios,
  capacidadDescripcion,
  direccion,
  mapaObra,
}: ObraDatosGeneralesProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Datos generales</h2>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Dato etiqueta="Ente responsable" valor={ente.siglas ? `${ente.nombre} (${ente.siglas})` : ente.nombre} />
        <Dato
          etiqueta="Empresa contratista"
          valor={
            contratista
              ? contratista.rif
                ? `${contratista.razonSocial} — ${contratista.rif}`
                : contratista.razonSocial
              : null
          }
        />
        <Dato
          etiqueta="Beneficiarios estimados"
          valor={beneficiarios !== null ? beneficiarios.toLocaleString('es-VE') : null}
        />
        <Dato etiqueta="Capacidad" valor={capacidadDescripcion} />
        <div className="sm:col-span-2">
          <Dato etiqueta="Dirección" valor={direccion} />
        </div>
      </dl>

      {mapaObra ? (
        <div className="h-64 w-full overflow-hidden rounded-lg border border-border print:hidden">
          <ObrasMapLoader obras={[mapaObra]} />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          La ubicación en el mapa aún no está disponible para esta obra.
        </p>
      )}
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className={valor ? 'text-sm' : 'text-sm text-muted-foreground'}>{valor ?? 'No informado'}</dd>
    </div>
  );
}
