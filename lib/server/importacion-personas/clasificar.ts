import { prisma } from '@/lib/server/prisma';
import { crearPersonaSchema, type CrearPersonaInput } from '@/lib/server/validators/persona.schema';
import {
  COLUMNAS,
  type AnalisisImportacion,
  type ClaveColumna,
  type FilaAnalizada,
} from '@/lib/server/importacion-personas/columnas';
import { normalizarDocumento, normalizarTexto } from '@/lib/server/importacion-personas/texto';

export type FilaCruda = { fila: number; valores: Partial<Record<ClaveColumna, string>> };

const SI = new Set(['si', 's', 'yes', 'y', 'true', '1', 'x']);
const NO = new Set(['no', 'n', 'false', '0']);

/** Valida cada fila y marca duplicados contra el directorio y contra el propio archivo. */
export async function clasificarFilas(filasCrudas: FilaCruda[]): Promise<AnalisisImportacion> {
  const existentes = await prisma.persona.findMany({
    select: { nombres: true, apellidos: true, documentoIdentidad: true },
  });
  const documentosVistos = new Set(
    existentes.flatMap((p) => (p.documentoIdentidad ? [normalizarDocumento(p.documentoIdentidad)] : []))
  );
  const nombresVistos = new Set(existentes.map((p) => normalizarTexto(`${p.nombres} ${p.apellidos}`)));

  const filas: FilaAnalizada[] = [];
  const porCrear: CrearPersonaInput[] = [];

  for (const { fila, valores } of filasCrudas) {
    const nombre = `${valores.nombres ?? ''} ${valores.apellidos ?? ''}`.trim() || '(sin nombre)';
    const mensajes: string[] = [];

    let aniosExperiencia: number | undefined;
    if (valores.aniosExperiencia) {
      const numero = Number(valores.aniosExperiencia.replace(',', '.'));
      if (!Number.isInteger(numero) || numero < 0) mensajes.push('Años de experiencia: debe ser un número entero.');
      else aniosExperiencia = numero;
    }

    let consentimientoPublicacion = false;
    const textoConsentimiento = normalizarTexto(valores.consentimiento ?? '');
    if (textoConsentimiento) {
      if (SI.has(textoConsentimiento)) consentimientoPublicacion = true;
      else if (!NO.has(textoConsentimiento)) mensajes.push('Consentimiento: escribe "Sí" o "No".');
    }

    const resultado = crearPersonaSchema.safeParse({
      nombres: valores.nombres ?? '',
      apellidos: valores.apellidos ?? '',
      documentoIdentidad: valores.documentoIdentidad || undefined,
      profesion: valores.profesion || undefined,
      especialidad: valores.especialidad || undefined,
      bioCorta: valores.bioCorta || undefined,
      aniosExperiencia,
      consentimientoPublicacion,
    });

    if (!resultado.success) {
      for (const problema of resultado.error.issues) {
        const campo = String(problema.path[0] ?? '');
        const etiqueta = COLUMNAS.find((c) => c.clave === campo)?.encabezado ?? campo;
        mensajes.push(`${etiqueta}: ${problema.message}`);
      }
    }

    if (!resultado.success || mensajes.length > 0) {
      filas.push({ fila, nombre, estado: 'error', mensajes });
      continue;
    }

    const datos = resultado.data;
    const claveDocumento = datos.documentoIdentidad ? normalizarDocumento(datos.documentoIdentidad) : null;
    const claveNombre = normalizarTexto(`${datos.nombres} ${datos.apellidos}`);

    // Con documento, la identidad se decide por el documento; sin él, por el
    // nombre (puede haber homónimos: en ese caso se omite y se avisa).
    const duplicada = claveDocumento ? documentosVistos.has(claveDocumento) : nombresVistos.has(claveNombre);
    if (duplicada) {
      filas.push({
        fila,
        nombre,
        estado: 'duplicada',
        mensajes: [
          claveDocumento
            ? 'Ya existe una persona con ese documento (o está repetida en el archivo).'
            : 'Ya existe una persona con ese nombre y esta fila no trae documento para confirmar si es la misma. Si es otra persona, agrégala a mano.',
        ],
      });
      continue;
    }

    if (claveDocumento) documentosVistos.add(claveDocumento);
    nombresVistos.add(claveNombre);
    porCrear.push(datos);
    filas.push({ fila, nombre, estado: 'valida', mensajes: [] });
  }

  return {
    total: filas.length,
    validas: porCrear.length,
    duplicadas: filas.filter((f) => f.estado === 'duplicada').length,
    conError: filas.filter((f) => f.estado === 'error').length,
    filas,
    porCrear,
  };
}
