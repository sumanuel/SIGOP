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
import { ObraParalizaciones } from '@/components/obra/obra-paralizaciones';
import { ObraIntegridad } from '@/components/obra/obra-integridad';
import { ObraContratacion } from '@/components/obra/obra-contratacion';
import { ObraPresupuesto } from '@/components/obra/obra-presupuesto';
import { ObraSuscripcion } from '@/components/obra/obra-suscripcion';
import type { ObraMapa } from '@/lib/types/obra';
import { calcularAtrasoDias } from '@/lib/atraso';

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
          presupuestoAprobado: Number(obra.presupuestoAprobado.toString()),
          moneda: obra.moneda,
          anioAprobacion: obra.fechaAprobacion ? obra.fechaAprobacion.getFullYear() : null,
          estado: obra.estado.nombre,
          municipio: obra.municipio.nombre,
          lat: obra.lat,
          lng: obra.lng,
          trazado: obra.trazado,
          trazadoTipo: obra.trazadoTipo,
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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">
      {/* Solo se ve al imprimir / guardar como PDF: identifica el documento. */}
      <div className="mb-4 hidden items-center justify-between border-b-2 border-primary pb-2 text-xs print:flex">
        <span className="text-sm font-bold">SIGOP — Ficha de obra</span>
        <span className="text-muted-foreground">{urlObra}</span>
      </div>

      <ObraHeader
        nombre={obra.nombre}
        codigo={obra.codigo}
        descripcion={obra.descripcion}
        tipoObra={obra.tipoObra}
        estatus={obra.estatus}
        ubicacionTexto={ubicacionTexto}
        destacada={obra.destacada}
        avanceFisico={obra.avanceFisico}
      />

      <div className="mt-6">
        <ObraGaleria multimedia={obra.multimedia} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
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

          <ObraContratacion
            contrato={obra.contrato}
            contratista={obra.contratista ? { id: obra.contratista.id, razonSocial: obra.contratista.razonSocial } : null}
          />

          <ObraPresupuesto partida={obra.partidaPresupuestaria} historial={obra.historialPresupuesto} />

          <ObraAvanceChart
            avanceFisico={obra.avanceFisico}
            avanceFinanciero={obra.avanceFinanciero}
            historial={historial}
            atrasoDias={calcularAtrasoDias(obra)}
          />

          <ObraIntegridad slug={obra.slug} />

          <ObraParalizaciones periodos={obra.paralizaciones} />

          <ObraReportes reportes={obra.reportesCiudadanos} />
        </div>

        <div className="flex flex-col gap-6">
          <ObraFinanzas
            presupuestoAprobado={obra.presupuestoAprobado}
            montoEjecutado={obra.montoEjecutado}
            moneda={obra.moneda}
            fuenteFinanciamiento={obra.fuenteFinanciamiento}
          />

          <ObraSuscripcion slug={obra.slug} />

          <ObraAcciones nombre={obra.nombre} url={urlObra} qrDataUrl={qrDataUrl} slug={obra.slug} />
        </div>
      </div>

      <p className="mt-6 hidden justify-center text-center text-xs text-muted-foreground print:flex">
        Información pública del portal SIGOP, generada el {new Date().toLocaleDateString('es-VE')}. Los datos pueden
        haber cambiado: consulta la versión vigente en el enlace de arriba.
      </p>
    </div>
  );
}
