import type { CrearPersonaInput } from '@/lib/server/validators/persona.schema';

// Importación masiva de personas desde Excel (PLAN_PROYECTO.md sección 3.2,
// punto 5). El flujo es en dos pasos —revisar y luego importar— y en ambos se
// analiza el archivo completo en el servidor: nunca se confía en filas ya
// "validadas" que mande el navegador.

export const MAX_BYTES_IMPORTACION = 2 * 1024 * 1024;
export const MAX_FILAS_IMPORTACION = 1000;

export class ImportacionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ClaveColumna = keyof CrearPersonaInput | 'consentimiento';

export interface ColumnaPlantilla {
  clave: ClaveColumna;
  encabezado: string;
  obligatoria?: boolean;
  ancho: number;
  ejemplo: string | number;
  ayuda: string;
}

export const COLUMNAS: ColumnaPlantilla[] = [
  { clave: 'nombres', encabezado: 'Nombres', obligatoria: true, ancho: 24, ejemplo: 'María Fernanda', ayuda: 'Obligatorio.' },
  { clave: 'apellidos', encabezado: 'Apellidos', obligatoria: true, ancho: 24, ejemplo: 'González Pérez', ayuda: 'Obligatorio.' },
  {
    clave: 'documentoIdentidad',
    encabezado: 'Documento de identidad',
    ancho: 22,
    ejemplo: 'V-12.345.678',
    ayuda: 'Opcional. Es privado: nunca se publica. Sirve para detectar duplicados.',
  },
  { clave: 'profesion', encabezado: 'Profesión', ancho: 24, ejemplo: 'Ingeniera civil', ayuda: 'Opcional.' },
  { clave: 'especialidad', encabezado: 'Especialidad', ancho: 24, ejemplo: 'Estructuras', ayuda: 'Opcional.' },
  { clave: 'aniosExperiencia', encabezado: 'Años de experiencia', ancho: 20, ejemplo: 8, ayuda: 'Opcional. Número entero.' },
  {
    clave: 'bioCorta',
    encabezado: 'Bio corta',
    ancho: 40,
    ejemplo: 'Ha dirigido obras de vialidad urbana.',
    ayuda: 'Opcional. Máximo 500 caracteres.',
  },
  {
    clave: 'consentimiento',
    encabezado: 'Consentimiento de publicación',
    ancho: 30,
    ejemplo: 'No',
    ayuda: 'Sí / No. Pon "Sí" solo si la persona autorizó por escrito publicar su nombre y foto. Si lo dejas vacío es "No".',
  },
];

export type EstadoFila = 'valida' | 'duplicada' | 'error';

export interface FilaAnalizada {
  /** Número de fila en el Excel (la 1 es el encabezado). */
  fila: number;
  nombre: string;
  estado: EstadoFila;
  mensajes: string[];
}

export interface AnalisisImportacion {
  total: number;
  validas: number;
  duplicadas: number;
  conError: number;
  filas: FilaAnalizada[];
  /** Datos listos para crear; solo se usan dentro del servidor. */
  porCrear: CrearPersonaInput[];
}
