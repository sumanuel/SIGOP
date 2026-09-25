import { prisma } from '@/lib/server/prisma';

/**
 * Todos los catálogos que necesita el formulario de obra (crear/editar) y,
 * a futuro, los filtros del portal público. Sin datos sensibles — nombres
 * de catálogo, no información personal — así que no requiere autenticación.
 */
export async function obtenerCatalogos() {
  const [tiposObra, estatusObra, entes, contratistas, fuentesFinanciamiento, estados, municipios, parroquias] =
    await Promise.all([
      prisma.tipoObra.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.estatusObra.findMany({ orderBy: { orden: 'asc' } }),
      prisma.ente.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.contratista.findMany({ orderBy: { razonSocial: 'asc' } }),
      prisma.fuenteFinanciamiento.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.estado.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, codigo: true } }),
      prisma.municipio.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, estadoId: true },
      }),
      prisma.parroquia.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, municipioId: true },
      }),
    ]);

  return { tiposObra, estatusObra, entes, contratistas, fuentesFinanciamiento, estados, municipios, parroquias };
}

export type Catalogos = Awaited<ReturnType<typeof obtenerCatalogos>>;
