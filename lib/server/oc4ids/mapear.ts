import { MODALIDAD_LEGIBLE, fechaLimiteContrato, type ModalidadClave } from '@/lib/contratacion';

// MODULOS_AVANZADOS.md, módulo 7: traducción de una obra de SIGOP al esquema
// OC4IDS (Open Contracting for Infrastructure Data Standard, versión 0.9).
// Función pura, sin base de datos: la validación contra el esquema oficial está
// en tests/oc4ids.test.ts. Solo se publica lo que ya muestra el portal público:
// nunca personal, contactos ni datos de denuncias o reportes.

export interface ObraParaOc4ids {
  codigo: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipoObra: string;
  estatus: string;
  ente: string;
  fuenteFinanciamiento: string | null;
  contratista: { razonSocial: string; rif: string | null } | null;
  estado: string;
  municipio: string;
  parroquia: string | null;
  direccion: string | null;
  presupuestoAprobado: number;
  montoEjecutado: number;
  moneda: string;
  fechaAprobacion: Date | null;
  fechaInicio: Date | null;
  fechaFinEstimada: Date | null;
  fechaFinReal: Date | null;
  beneficiarios: number | null;
  capacidadDescripcion: string | null;
  actualizadoEn: Date;
  /** Punto principal [lng, lat]. */
  punto: [number, number] | null;
  /** Geometría GeoJSON del trazado (LineString o Polygon), si existe. */
  trazado: { type: string; coordinates: unknown } | null;
  hitos: { id: string; nombre: string; fechaPlanificada: Date | null; fechaReal: Date | null; completado: boolean }[];
  contrato: {
    numeroContrato: string;
    modalidad: string;
    moneda: string;
    montoOriginal: number;
    montoActual: number;
    fechaFirma: Date;
    plazoEjecucionDias: number;
    documentoUrl: string | null;
    adendas: {
      numero: number;
      motivo: string;
      montoAnterior: number;
      montoNuevo: number;
      diasAdicionales: number;
      documentoUrl: string | null;
      fecha: Date;
    }[];
  } | null;
}

const iso = (f: Date | null) => (f ? f.toISOString() : undefined);
const valor = (amount: number, currency: string) => ({ amount, currency });

type EstadoProyecto = 'identification' | 'preparation' | 'implementation' | 'completion' | 'maintenance' | 'cancelled';

/** Estatus de SIGOP → fase del proyecto en OC4IDS (lista `projectStatus`). */
export function estatusAOc4ids(estatus: string): EstadoProyecto {
  switch (estatus.trim().toLowerCase()) {
    case 'planificada':
      return 'preparation';
    case 'en ejecución':
    case 'paralizada': // sigue en la fase de ejecución; la paralización se documenta en SIGOP
      return 'implementation';
    case 'culminada':
      return 'completion';
    case 'inaugurada':
      return 'maintenance';
    case 'cancelada':
      return 'cancelled';
    default:
      return 'identification';
  }
}

const SECTORES: [RegExp, string][] = [
  [/salud|hospital/i, 'health'],
  [/educaci|escuel|liceo|universidad/i, 'education'],
  [/vialidad|v[ií]a|carretera|puente/i, 'transport.road'],
  [/vivienda/i, 'socialHousing'],
  [/agua|acueducto|saneamiento|cloaca/i, 'waterAndWaste'],
  [/electric|energ/i, 'energy'],
  [/deporte|recreaci|cultura|parque/i, 'cultureSportsAndRecreation'],
];

export function sectorAOc4ids(tipoObra: string): string | null {
  return SECTORES.find(([re]) => re.test(tipoObra))?.[1] ?? null;
}

/** Tipo de proyecto (lista `projectType`) inferido del nombre; por defecto, construcción. */
export function tipoProyectoAOc4ids(nombre: string): 'construction' | 'maintenance' | 'rehabilitation' | 'expansion' {
  if (/rehabilit|remodel|restaur/i.test(nombre)) return 'rehabilitation';
  if (/mantenimiento/i.test(nombre)) return 'maintenance';
  if (/ampliaci|expansi/i.test(nombre)) return 'expansion';
  return 'construction';
}

export function mapearAOc4ids(obra: ObraParaOc4ids, origen: string) {
  const fichaUrl = `${origen}/obras/${obra.slug}`;
  const estado = estatusAOc4ids(obra.estatus);
  const terminada = estado === 'completion' || estado === 'maintenance';

  // Organizaciones: identificadores internos sencillos, no los id de la base.
  const parties: Record<string, unknown>[] = [
    { id: 'ente', name: obra.ente, roles: ['publicAuthority', 'procuringEntity'] },
  ];
  if (obra.contratista) {
    parties.push({
      id: 'contratista',
      name: obra.contratista.razonSocial,
      roles: ['supplier'],
      ...(obra.contratista.rif ? { identifier: { scheme: 'VE-RIF', id: obra.contratista.rif, legalName: obra.contratista.razonSocial } } : {}),
    });
  }
  if (obra.fuenteFinanciamiento) {
    parties.push({ id: 'financiamiento', name: obra.fuenteFinanciamiento, roles: ['funder'] });
  }

  const direccion = {
    ...(obra.direccion ? { streetAddress: obra.direccion } : {}),
    locality: obra.parroquia ? `${obra.parroquia}, ${obra.municipio}` : obra.municipio,
    region: obra.estado,
    countryName: 'Venezuela',
  };
  const locations: Record<string, unknown>[] = [];
  if (obra.punto) {
    locations.push({
      id: 'ubicacion',
      description: [obra.direccion, obra.municipio, obra.estado].filter(Boolean).join(', '),
      geometry: { type: 'Point', coordinates: obra.punto },
      address: direccion,
    });
  }
  if (obra.trazado) {
    locations.push({
      id: 'trazado',
      description: obra.trazado.type === 'Polygon' ? 'Área de la obra' : 'Trazado de la obra',
      geometry: obra.trazado,
    });
  }

  const sector = sectorAOc4ids(obra.tipoObra);
  const proposito = [
    obra.capacidadDescripcion ? `Capacidad: ${obra.capacidadDescripcion}.` : null,
    obra.beneficiarios ? `Beneficiarios estimados: ${obra.beneficiarios}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const c = obra.contrato;
  const contractingProcesses = c
    ? [
        {
          id: 'contrato',
          summary: {
            externalReference: c.numeroContrato,
            nature: ['construction'],
            title: `Contrato ${c.numeroContrato}`,
            description: `Modalidad de contratación: ${MODALIDAD_LEGIBLE[c.modalidad as ModalidadClave] ?? c.modalidad}.`,
            status: terminada ? 'closed' : 'active',
            tender: { procurementMethodDetails: MODALIDAD_LEGIBLE[c.modalidad as ModalidadClave] ?? c.modalidad },
            ...(obra.contratista ? { suppliers: [{ id: 'contratista', name: obra.contratista.razonSocial }] } : {}),
            contractValue: valor(c.montoActual, c.moneda),
            contractPeriod: {
              startDate: iso(c.fechaFirma),
              endDate: iso(fechaLimiteContrato(c.fechaFirma, c.plazoEjecucionDias, c.adendas)),
            },
            ...(c.documentoUrl ? { documents: [{ id: 'contrato-documento', title: `Contrato ${c.numeroContrato}`, url: c.documentoUrl }] } : {}),
            ...(c.adendas.length
              ? {
                  modifications: c.adendas.map((a) => ({
                    id: `adenda-${a.numero}`,
                    date: iso(a.fecha),
                    description: `Adenda N.º ${a.numero}${a.diasAdicionales ? ` (+${a.diasAdicionales} días)` : ''}`,
                    rationale: a.motivo,
                    oldContractValue: valor(a.montoAnterior, c.moneda),
                    newContractValue: valor(a.montoNuevo, c.moneda),
                  })),
                }
              : {}),
          },
        },
      ]
    : undefined;

  const milestones = obra.hitos.map((h) => ({
    id: h.id,
    title: h.nombre,
    ...(h.fechaPlanificada ? { dueDate: iso(h.fechaPlanificada) } : {}),
    ...(h.fechaReal ? { dateMet: iso(h.fechaReal) } : {}),
    status: h.completado ? 'met' : 'scheduled',
  }));

  return {
    id: `VE-SIGOP-${obra.codigo}`,
    updated: iso(obra.actualizadoEn),
    language: 'es',
    identifiers: [{ scheme: 'SIGOP', id: obra.codigo, uri: fichaUrl }],
    publicAuthority: { id: 'ente', name: obra.ente },
    title: obra.nombre,
    ...(obra.descripcion ? { description: obra.descripcion } : {}),
    status: estado,
    type: tipoProyectoAOc4ids(obra.nombre),
    ...(sector ? { sector: [sector] } : {}),
    ...(proposito ? { purpose: proposito } : {}),
    budget: {
      description: 'Presupuesto aprobado de la obra.',
      amount: valor(obra.presupuestoAprobado, obra.moneda),
      ...(obra.fechaAprobacion ? { approvalDate: iso(obra.fechaAprobacion) } : {}),
    },
    // OC4IDS no admite un `period` vacío: se omite si la obra no tiene fechas.
    ...(obra.fechaInicio || obra.fechaFinEstimada
      ? {
          period: {
            ...(obra.fechaInicio ? { startDate: iso(obra.fechaInicio) } : {}),
            ...(obra.fechaFinEstimada ? { endDate: iso(obra.fechaFinEstimada) } : {}),
          },
        }
      : {}),
    ...(locations.length ? { locations } : {}),
    parties,
    ...(obra.fechaFinReal
      ? {
          completion: {
            endDate: iso(obra.fechaFinReal),
            finalValue: valor(obra.montoEjecutado, obra.moneda),
            finalValueDetails: 'Monto ejecutado registrado en SIGOP.',
          },
        }
      : {}),
    ...(milestones.length ? { milestones } : {}),
    ...(contractingProcesses ? { contractingProcesses } : {}),
    documents: [{ id: 'ficha', title: 'Ficha pública de la obra en SIGOP', url: fichaUrl, format: 'text/html', language: 'es' }],
  };
}

/** Envoltorio de paquete: varios proyectos con los metadatos de quien publica. */
export function empaquetarOc4ids(proyectos: ReturnType<typeof mapearAOc4ids>[], origen: string, publicado = new Date()) {
  return {
    version: '0.9',
    publisher: { name: 'SIGOP — Sistema de Información Geográfica de Obras Públicas', uri: origen },
    publishedDate: publicado.toISOString(),
    projects: proyectos,
  };
}
