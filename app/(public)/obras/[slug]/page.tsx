import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { obtenerObraDetalle } from '@/lib/server/services/obras.service';
import { ObraHeader } from '@/components/obra/obra-header';
import { ObraGaleria } from '@/components/obra/obra-galeria';
import { ObraDatosGenerales } from '@/components/obra/obra-datos-generales';
import { ObraFinanzas } from '@/components/obra/obra-finanzas';
import { ObraLineaTiempo } from '@/components/obra/obra-linea-tiempo';
import { ObraAvanceChart } from '@/components/obra/obra-avance-chart';
import { ObraAcciones } from '@/components/obra/obra-acciones';
import { ObraReportes } from '@/components/obra/obra-reportes';
import type { ObraMapa } from '@/lib/types/obra';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function cargarObra(slug: string) {
  const obra = await obtenerObraDetalle(slug, { soloPublicado: true });
  if (!obra) notFound();
  return obra;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const obra = await obtenerObraDetalle(slug, { soloPublicado: true });
  if (!obra) return { title: 'Obra no encontrada — SIGOP' };

  return {
    title: `${obra.nombre} — SIGOP`,
    description: obra.descripcion ?? undefined,
  };
}

/** Días de atraso: negativo/0 = a tiempo, positivo = atrasada. `null` si no aplica. */
function calcularAtrasoDias(obra: {
  fechaFinEstimada: Date | null;
  fechaFinReal: Date | null;
  avanceFisico: number;
}): number | null {
  if (!obra.fechaFinEstimada) return null;

  const referencia = obra.fechaFinReal ?? (obra.avanceFisico < 100 ? new Date() : null);
  if (!referencia) return null;

  const diffMs = referencia.getTime() - obra.fechaFinEstimada.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default async function ObraFichaPage({ params }: PageProps) {
  const { slug } = await params;
  const obra = await cargarObra(slug);

  const ubicacionTexto = [obra.direccion, obra.municipio.nombre, obra.estado.nombre]
    .filter(Boolean)
    .join(', ');

  const mapaObra: ObraMapa | null =
    obra.lat !== null && obra.lng !== null
      ? {
          id: obra.id,
          codigo: obra.codigo,
          slug: obra.slug,
          nombre: obra.nombre,
          tipoObra: {
            nombre: obra.tipoObra.nombre,
            color: obra.tipoObra.color ?? '#6B7280',
            icono: obra.tipoObra.icono ?? 'building',
          },
          estatus: { nombre: obra.estatus.nombre, color: obra.estatus.color ?? '#94A3B8' },
          avanceFisico: obra.avanceFisico,
          municipio: obra.municipio.nombre,
          lat: obra.lat,
          lng: obra.lng,
        }
      : null;

  const historial = [...obra.avances]
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map((a) => ({
      fecha: a.fecha.toISOString(),
      avanceFisico: a.avanceFisico,
      avanceFinanciero: a.avanceFinanciero,
    }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const urlObra = `${siteUrl}/obras/${obra.slug}`;
  const qrDataUrl = await QRCode.toDataURL(urlObra, { margin: 1, width: 280 });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <ObraHeader
        nombre={obra.nombre}
        codigo={obra.codigo}
        descripcion={obra.descripcion}
        tipoObra={obra.tipoObra}
        estatus={obra.estatus}
        ubicacionTexto={ubicacionTexto}
        destacada={obra.destacada}
      />

      <div className="mt-6">
        <ObraGaleria multimedia={obra.multimedia} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <ObraDatosGenerales
            ente={obra.ente}
            contratista={obra.contratista}
            beneficiarios={obra.beneficiarios}
            capacidadDescripcion={obra.capacidadDescripcion}
            direccion={obra.direccion}
            mapaObra={mapaObra}
          />

          <ObraLineaTiempo
            fechaAprobacion={obra.fechaAprobacion}
            fechaInicio={obra.fechaInicio}
            fechaFinEstimada={obra.fechaFinEstimada}
            fechaFinReal={obra.fechaFinReal}
            hitos={obra.hitos}
          />

          <ObraAvanceChart
            avanceFisico={obra.avanceFisico}
            avanceFinanciero={obra.avanceFinanciero}
            historial={historial}
            atrasoDias={calcularAtrasoDias(obra)}
          />

          <ObraReportes reportes={obra.reportesCiudadanos} />
        </div>

        <div className="flex flex-col gap-6">
          <ObraFinanzas
            presupuestoAprobado={obra.presupuestoAprobado}
            montoEjecutado={obra.montoEjecutado}
            moneda={obra.moneda}
            fuenteFinanciamiento={obra.fuenteFinanciamiento}
          />

          <ObraAcciones nombre={obra.nombre} url={urlObra} qrDataUrl={qrDataUrl} slug={obra.slug} />
        </div>
      </div>
    </div>
  );
}
