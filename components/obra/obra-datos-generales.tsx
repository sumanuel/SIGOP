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
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Datos generales</h2>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Dato etiqueta="Ente responsable" valor={ente.siglas ? `${ente.nombre} (${ente.siglas})` : ente.nombre} />
        {contratista && (
          <Dato
            etiqueta="Empresa contratista"
            valor={contratista.rif ? `${contratista.razonSocial} — ${contratista.rif}` : contratista.razonSocial}
          />
        )}
        {beneficiarios !== null && (
          <Dato etiqueta="Beneficiarios estimados" valor={beneficiarios.toLocaleString('es-VE')} />
        )}
        {capacidadDescripcion && <Dato etiqueta="Capacidad" valor={capacidadDescripcion} />}
        {direccion && <Dato etiqueta="Dirección" valor={direccion} />}
      </dl>

      {mapaObra && (
        <div className="h-64 w-full overflow-hidden rounded-lg border border-border">
          <ObrasMapLoader obras={[mapaObra]} />
        </div>
      )}
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}
