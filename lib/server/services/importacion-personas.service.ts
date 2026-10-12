import { prisma } from '@/lib/server/prisma';
import { ImportacionError, type AnalisisImportacion } from '@/lib/server/importacion-personas/columnas';

export { analizarArchivoPersonas } from '@/lib/server/importacion-personas/analizar';
export { generarPlantilla } from '@/lib/server/importacion-personas/plantilla';
export { ImportacionError } from '@/lib/server/importacion-personas/columnas';
export type { AnalisisImportacion } from '@/lib/server/importacion-personas/columnas';

/**
 * Crea todas las personas válidas en una sola transacción: o entra el lote
 * completo o no entra nada. Cada persona queda auditada como CREATE, más una
 * entrada IMPORT que resume el lote.
 */
export async function importarPersonas(analisis: AnalisisImportacion, usuarioId: string, nombreArchivo: string) {
  if (analisis.porCrear.length === 0) {
    throw new ImportacionError(400, 'No hay filas válidas para importar.');
  }

  const ahora = new Date();
  const loteId = `lote-${ahora.toISOString()}`;

  const creadas = await prisma.$transaction(
    async (tx) => {
      const personas = [];
      for (const datos of analisis.porCrear) {
        personas.push(
          await tx.persona.create({
            data: { ...datos, fechaConsentimiento: datos.consentimientoPublicacion ? ahora : undefined },
          })
        );
      }

      await tx.auditoria.createMany({
        data: [
          ...personas.map((p) => ({
            usuarioId,
            accion: 'CREATE',
            entidad: 'Persona',
            entidadId: p.id,
            // El documento de identidad es privado y la bitácora la ve más gente: no se copia.
            datosDespues: JSON.parse(
              JSON.stringify({ ...p, documentoIdentidad: p.documentoIdentidad ? '[privado]' : null })
            ),
          })),
          {
            usuarioId,
            accion: 'IMPORT',
            entidad: 'Persona',
            entidadId: loteId,
            datosDespues: {
              archivo: nombreArchivo,
              creadas: personas.length,
              omitidasPorDuplicado: analisis.duplicadas,
              omitidasPorError: analisis.conError,
            },
          },
        ],
      });

      return personas;
    },
    { timeout: 60_000 }
  );

  return { creadas: creadas.length };
}
