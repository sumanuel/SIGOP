import type { Metadata } from 'next';
import { Braces, FileSpreadsheet, Map as MapaIcono } from 'lucide-react';
import { DICCIONARIO_OBRAS } from '@/lib/server/services/datos-abiertos.service';

export const metadata: Metadata = {
  title: 'Datos abiertos — SIGOP',
  description: 'Descarga la información pública de las obras en CSV, GeoJSON o JSON.',
};

const FORMATOS = [
  {
    formato: 'csv',
    titulo: 'CSV',
    icono: FileSpreadsheet,
    descripcion: 'Tabla para Excel, LibreOffice o análisis estadístico. Codificación UTF-8.',
  },
  {
    formato: 'geojson',
    titulo: 'GeoJSON',
    icono: MapaIcono,
    descripcion: 'Ubicaciones y trazados para QGIS, Leaflet u otras herramientas de mapas.',
  },
  {
    formato: 'json',
    titulo: 'JSON',
    icono: Braces,
    descripcion: 'Formato para desarrolladores e integraciones con otras aplicaciones.',
  },
] as const;

// Ruta de la API (no una página): se enlaza con <a>, no con <Link>.
const URL_OC4IDS = '/api/datos-abiertos/oc4ids';

export default function DatosAbiertosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Datos abiertos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Descarga la información pública de las obras para analizarla, cruzarla con otras fuentes o
        construir tus propias visualizaciones. Es libre y no requiere registro.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {FORMATOS.map(({ formato, titulo, icono: Icono, descripcion }) => (
          <section key={formato} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Icono className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <p className="flex-1 text-sm text-muted-foreground">{descripcion}</p>
            <a
              href={`/api/datos-abiertos/obras?formato=${formato}`}
              {...(formato === 'json' ? {} : { download: true })}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {formato === 'json' ? 'Ver JSON' : `Descargar ${titulo}`}
            </a>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Qué incluye</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Solo obras con estado de publicación «Publicado»; se actualiza a medida que se aprueban cambios.</li>
          <li>
            Nunca incluye datos personales del equipo (nombres, cédulas, contactos) ni los reportes
            ciudadanos.
          </li>
          <li>Los montos están en la moneda indicada en cada obra, sin conversión de divisas.</li>
          <li>
            En GeoJSON, cada obra tiene un punto de ubicación y, si es una obra lineal, otro elemento
            con su trazado (campo <code className="rounded bg-muted px-1">tipoGeometria</code>).
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Para integrarlo desde un programa:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/datos-abiertos/obras?formato=json</code>
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Estándar internacional OC4IDS</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Las mismas obras en el formato{' '}
          <a
            href="https://standard.open-contracting.org/infrastructure/latest/es/"
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Contracting for Infrastructure Data Standard (OC4IDS)
          </a>
          , el que usan portales de transparencia de infraestructura de otros países y que facilita
          compararlos. Incluye presupuesto, ubicación, contrato y adendas cuando existen.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a
            href={URL_OC4IDS}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium hover:bg-muted"
          >
            Ver paquete OC4IDS (JSON)
          </a>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Una sola obra por su código:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/datos-abiertos/oc4ids/OBR-2026-00001</code>
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Diccionario de datos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Campo</th>
                <th className="py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {DICCIONARIO_OBRAS.map(({ campo, descripcion }) => (
                <tr key={campo} className="border-t border-border">
                  <td className="py-2 pr-4 align-top">
                    <code className="text-xs">{campo}</code>
                  </td>
                  <td className="py-2 text-muted-foreground">{descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
