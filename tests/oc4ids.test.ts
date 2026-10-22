import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  empaquetarOc4ids,
  estatusAOc4ids,
  mapearAOc4ids,
  sectorAOc4ids,
  tipoProyectoAOc4ids,
  type ObraParaOc4ids,
} from '@/lib/server/oc4ids/mapear';

// Esquema oficial de OC4IDS 0.9.5 (open-contracting/infrastructure), copiado a tests/fixtures.
// Es JSON Schema draft-04: se le quita `$schema`/`id` para validarlo con Ajv (draft-07).
const esquema = JSON.parse(readFileSync(new URL('./fixtures/oc4ids-project-schema.json', import.meta.url), 'utf8'));
delete esquema.$schema;
delete esquema.id;
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validar = ajv.compile(esquema);

const d = (s: string) => new Date(s);
const ORIGEN = 'https://sigop.example.gob.ve';

const obraBase: ObraParaOc4ids = {
  codigo: 'OBR-2026-00001',
  slug: 'hospital-central',
  nombre: 'Rehabilitación del Hospital Central',
  descripcion: 'Rehabilitación integral.',
  tipoObra: 'Salud',
  estatus: 'En ejecución',
  ente: 'Ministerio de Obras Públicas',
  fuenteFinanciamiento: 'Presupuesto nacional',
  contratista: { razonSocial: 'Constructora Andina C.A.', rif: 'J-30123456-7' },
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  direccion: 'Av. Principal',
  presupuestoAprobado: 85_000_000,
  montoEjecutado: 38_250_000,
  moneda: 'VES',
  fechaAprobacion: d('2026-01-10T00:00:00Z'),
  fechaInicio: d('2026-02-01T00:00:00Z'),
  fechaFinEstimada: d('2027-02-01T00:00:00Z'),
  fechaFinReal: null,
  beneficiarios: 30_000,
  capacidadDescripcion: '120 camas',
  actualizadoEn: d('2026-10-01T12:00:00Z'),
  punto: [-66.9, 10.5],
  trazado: null,
  hitos: [
    { id: 'h1', nombre: 'Demolición', fechaPlanificada: d('2026-03-01T00:00:00Z'), fechaReal: d('2026-03-05T00:00:00Z'), completado: true },
    { id: 'h2', nombre: 'Estructura', fechaPlanificada: null, fechaReal: null, completado: false },
  ],
  contrato: {
    numeroContrato: 'CT-2026-001',
    modalidad: 'LICITACION_GENERAL',
    moneda: 'VES',
    montoOriginal: 80_000_000,
    montoActual: 85_000_000,
    fechaFirma: d('2026-01-20T00:00:00Z'),
    plazoEjecucionDias: 365,
    documentoUrl: 'https://ejemplo.gob.ve/contrato.pdf',
    adendas: [
      { numero: 1, motivo: 'Ampliación de alcance', montoAnterior: 80_000_000, montoNuevo: 85_000_000, diasAdicionales: 30, documentoUrl: null, fecha: d('2026-06-01T00:00:00Z') },
    ],
  },
};

const errores = () => ajv.errorsText(validar.errors, { separator: '\n' });

describe('mapearAOc4ids', () => {
  it('produce un proyecto válido contra el esquema oficial OC4IDS 0.9', () => {
    const proyecto = mapearAOc4ids(obraBase, ORIGEN);
    expect(validar(proyecto), errores()).toBe(true);
  });

  it('es válido también con los datos mínimos (sin contrato, contratista, ubicación ni fechas)', () => {
    const minima: ObraParaOc4ids = {
      ...obraBase,
      descripcion: null,
      fuenteFinanciamiento: null,
      contratista: null,
      parroquia: null,
      direccion: null,
      fechaAprobacion: null,
      fechaInicio: null,
      fechaFinEstimada: null,
      beneficiarios: null,
      capacidadDescripcion: null,
      punto: null,
      hitos: [],
      contrato: null,
      tipoObra: 'Otro',
    };
    const proyecto = mapearAOc4ids(minima, ORIGEN);
    expect(validar(proyecto), errores()).toBe(true);
    expect(proyecto).not.toHaveProperty('contractingProcesses');
    expect(proyecto).not.toHaveProperty('sector');
  });

  it('una obra culminada con trazado de polígono y moneda USD sigue siendo válida', () => {
    const proyecto = mapearAOc4ids(
      {
        ...obraBase,
        estatus: 'Culminada',
        moneda: 'USD',
        fechaFinReal: d('2026-09-30T00:00:00Z'),
        trazado: { type: 'Polygon', coordinates: [[[-66.9, 10.5], [-66.8, 10.5], [-66.8, 10.6], [-66.9, 10.5]]] },
        contrato: { ...obraBase.contrato!, moneda: 'USD' },
      },
      ORIGEN
    );
    expect(validar(proyecto), errores()).toBe(true);
    expect(proyecto.status).toBe('completion');
    expect(proyecto.completion?.finalValue).toEqual({ amount: 38_250_000, currency: 'USD' });
    expect(proyecto.contractingProcesses?.[0].summary.status).toBe('closed');
  });

  it('refleja el contrato, sus adendas y la fecha límite con los días adicionales', () => {
    const [proceso] = mapearAOc4ids(obraBase, ORIGEN).contractingProcesses!;
    expect(proceso.summary.contractValue).toEqual({ amount: 85_000_000, currency: 'VES' });
    expect(proceso.summary.modifications).toHaveLength(1);
    // firma 2026-01-20 + 365 + 30 días
    expect(proceso.summary.contractPeriod.endDate).toBe(new Date(d('2026-01-20T00:00:00Z').getTime() + 395 * 86_400_000).toISOString());
  });

  it('no incluye contactos ni identificadores internos', () => {
    const texto = JSON.stringify(mapearAOc4ids(obraBase, ORIGEN));
    expect(texto).not.toMatch(/telefono|email|contacto|cedula|documentoIdentidad/i);
    expect(texto).toContain('J-30123456-7'); // el RIF de la empresa es información pública de contratación
  });

  it('el paquete lleva versión, publicador y los proyectos', () => {
    const paquete = empaquetarOc4ids([mapearAOc4ids(obraBase, ORIGEN)], ORIGEN, d('2026-10-22T00:00:00Z'));
    expect(paquete).toMatchObject({ version: '0.9', publishedDate: '2026-10-22T00:00:00.000Z' });
    expect(paquete.projects).toHaveLength(1);
  });
});

describe('correspondencias de catálogos', () => {
  it('estatus → fase del proyecto', () => {
    expect(estatusAOc4ids('Planificada')).toBe('preparation');
    expect(estatusAOc4ids('En ejecución')).toBe('implementation');
    expect(estatusAOc4ids('Paralizada')).toBe('implementation');
    expect(estatusAOc4ids('Culminada')).toBe('completion');
    expect(estatusAOc4ids('Inaugurada')).toBe('maintenance');
    expect(estatusAOc4ids('Algo nuevo')).toBe('identification');
  });

  it('tipo de obra → sector', () => {
    expect(sectorAOc4ids('Salud')).toBe('health');
    expect(sectorAOc4ids('Vialidad')).toBe('transport.road');
    expect(sectorAOc4ids('Agua Potable')).toBe('waterAndWaste');
    expect(sectorAOc4ids('Otro')).toBeNull();
  });

  it('nombre → tipo de proyecto', () => {
    expect(tipoProyectoAOc4ids('Rehabilitación de la vía')).toBe('rehabilitation');
    expect(tipoProyectoAOc4ids('Mantenimiento de puente')).toBe('maintenance');
    expect(tipoProyectoAOc4ids('Ampliación del liceo')).toBe('expansion');
    expect(tipoProyectoAOc4ids('Escuela nueva')).toBe('construction');
  });
});
