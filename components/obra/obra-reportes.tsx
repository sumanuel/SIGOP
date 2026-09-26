import Image from 'next/image';
import { MessageSquare } from 'lucide-react';
import { formatearFecha } from '@/lib/format';

interface ReporteAprobado {
  id: string;
  nombre: string | null;
  mensaje: string;
  fotoUrl: string | null;
  createdAt: Date;
}

interface ObraReportesProps {
  reportes: ReporteAprobado[];
}

// Observaciones ciudadanas ya aprobadas por un moderador (ver
// /admin/reportes) — los pendientes o rechazados nunca llegan aquí.
export function ObraReportes({ reportes }: ObraReportesProps) {
  if (reportes.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="size-5" />
        Observaciones de la comunidad
      </h2>

      <div className="flex flex-col gap-3">
        {reportes.map((reporte) => (
          <div key={reporte.id} className="rounded-lg border border-border p-3">
            <p className="text-sm">{reporte.mensaje}</p>

            {reporte.fotoUrl && (
              <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-md">
                <Image src={reporte.fotoUrl} alt="Foto adjunta al reporte" fill className="object-cover" unoptimized />
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {reporte.nombre ?? 'Anónimo'} · {formatearFecha(reporte.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
