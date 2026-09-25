/**
 * Seed inicial de SIGOP.
 *
 * Carga catálogos base, una región piloto (Distrito Capital + Miranda, sin
 * geometría de límites todavía — ver prisma/POSTGIS_NOTAS.md para la carga
 * completa vía GeoJSON/shapefile), un usuario administrador y 5 obras de
 * demostración con ubicación, personal, avances e hitos.
 *
 * Uso:
 *   npx tsx prisma/seed.ts
 *   (o "npm run prisma:seed" si se agrega el script en package.json)
 */

import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ========================================
// 1. Catálogos
// ========================================

const TIPOS_OBRA = [
  { nombre: 'Salud', icono: 'hospital', color: '#DC2626' },
  { nombre: 'Educación', icono: 'school', color: '#2563EB' },
  { nombre: 'Vialidad', icono: 'road', color: '#F59E0B' },
  { nombre: 'Vivienda', icono: 'home', color: '#059669' },
  { nombre: 'Agua Potable', icono: 'droplet', color: '#0891B2' },
  { nombre: 'Electricidad', icono: 'zap', color: '#CA8A04' },
  { nombre: 'Deporte', icono: 'trophy', color: '#7C3AED' },
  { nombre: 'Otro', icono: 'building', color: '#6B7280' },
] as const;

const ESTATUS_OBRA = [
  { nombre: 'Planificada', color: '#94A3B8', orden: 1 },
  { nombre: 'En ejecución', color: '#2563EB', orden: 2 },
  { nombre: 'Paralizada', color: '#DC2626', orden: 3 },
  { nombre: 'Culminada', color: '#059669', orden: 4 },
  { nombre: 'Inaugurada', color: '#7C3AED', orden: 5 },
] as const;

const FUENTES_FINANCIAMIENTO = [
  'Presupuesto Nacional',
  'Presupuesto Regional',
  'Presupuesto Municipal',
  'Financiamiento Internacional',
  'Fondo Mixto',
] as const;

const CARGOS = [
  { nombre: 'Jefe de Obra', nivelJerarquico: 1, area: 'Dirección' },
  { nombre: 'Ingeniero Residente', nivelJerarquico: 2, area: 'Ingeniería' },
  { nombre: 'Supervisor de Cuadrilla', nivelJerarquico: 3, area: 'Campo' },
  { nombre: 'Obrero', nivelJerarquico: 4, area: 'Campo' },
  { nombre: 'Personal de Mantenimiento', nivelJerarquico: 4, area: 'Apoyo' },
  { nombre: 'Personal de Seguridad', nivelJerarquico: 4, area: 'Apoyo' },
] as const;

const ENTES = [
  { nombre: 'Ministerio del Poder Popular para Obras Públicas y Vivienda', siglas: 'MOPV' },
  { nombre: 'Alcaldía Bolivariana de Libertador', siglas: 'ABL' },
  { nombre: 'Gobernación del Estado Miranda', siglas: 'GEM' },
] as const;

const CONTRATISTAS = [
  { razonSocial: 'Constructora Andina C.A.', rif: 'J-30123456-7', contacto: 'Ing. María Pérez' },
  { razonSocial: 'Inversiones y Construcciones del Centro C.A.', rif: 'J-30987654-3', contacto: 'Ing. Carlos Rojas' },
] as const;

// ========================================
// 2. Territorio (región piloto, sin geometría todavía)
// ========================================
// El resto de los 24 estados y ~335 municipios de Venezuela se cargan más
// adelante vía GeoJSON/shapefile (ver prisma/POSTGIS_NOTAS.md, sección 4).
// Aquí solo se siembra la región piloto para poder cargar obras de prueba.

const ESTADOS_PILOTO = [
  { nombre: 'Distrito Capital', codigo: 'DC' },
  { nombre: 'Miranda', codigo: 'MI' },
] as const;

const MUNICIPIOS_PILOTO = [
  { nombre: 'Libertador', estado: 'DC' },
  { nombre: 'Chacao', estado: 'MI' },
  { nombre: 'Baruta', estado: 'MI' },
  { nombre: 'El Hatillo', estado: 'MI' },
  { nombre: 'Sucre', estado: 'MI' },
] as const;

const PARROQUIAS_PILOTO = [
  { nombre: 'Catedral', municipio: 'Libertador' },
  { nombre: 'San Bernardino', municipio: 'Libertador' },
  { nombre: 'El Recreo', municipio: 'Libertador' },
] as const;

// ========================================
// 3. Obras de demostración
// ========================================
// Coordenadas aproximadas del área metropolitana de Caracas, solo para demo.

interface ObraDemo {
  codigo: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipoObra: (typeof TIPOS_OBRA)[number]['nombre'];
  estatus: (typeof ESTATUS_OBRA)[number]['nombre'];
  municipio: (typeof MUNICIPIOS_PILOTO)[number]['nombre'];
  contratista: string | null;
  fuente: (typeof FUENTES_FINANCIAMIENTO)[number];
  lat: number;
  lng: number;
  presupuestoAprobado: string;
  montoEjecutado: string;
  avanceFisico: number;
  avanceFinanciero: number;
  beneficiarios: number;
  capacidadDescripcion: string;
  fechaAprobacion?: string;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  fechaFinReal?: string;
  destacada: boolean;
}

const OBRAS_DEMO: ObraDemo[] = [
  {
    codigo: 'OBR-2026-00001',
    slug: 'hospital-materno-infantil-los-proceres',
    nombre: 'Hospital Materno Infantil Los Próceres',
    descripcion: 'Construcción de un hospital materno infantil con capacidad para 120 camas.',
    tipoObra: 'Salud',
    estatus: 'En ejecución',
    municipio: 'Libertador',
    contratista: 'Constructora Andina C.A.',
    fuente: 'Presupuesto Nacional',
    lat: 10.488,
    lng: -66.8791,
    presupuestoAprobado: '85000000.00',
    montoEjecutado: '38250000.00',
    avanceFisico: 45,
    avanceFinanciero: 45,
    beneficiarios: 45000,
    capacidadDescripcion: '120 camas',
    fechaAprobacion: '2025-02-10',
    fechaInicio: '2025-04-01',
    fechaFinEstimada: '2027-04-01',
    destacada: true,
  },
  {
    codigo: 'OBR-2026-00002',
    slug: 'escuela-basica-simon-rodriguez',
    nombre: 'Escuela Básica Bolivariana Simón Rodríguez',
    descripcion: 'Ampliación y rehabilitación integral de una escuela básica para 800 estudiantes.',
    tipoObra: 'Educación',
    estatus: 'Culminada',
    municipio: 'Chacao',
    contratista: 'Inversiones y Construcciones del Centro C.A.',
    fuente: 'Presupuesto Municipal',
    lat: 10.4989,
    lng: -66.8534,
    presupuestoAprobado: '4200000.00',
    montoEjecutado: '4180000.00',
    avanceFisico: 100,
    avanceFinanciero: 99,
    beneficiarios: 800,
    capacidadDescripcion: '800 estudiantes',
    fechaAprobacion: '2024-01-15',
    fechaInicio: '2024-03-01',
    fechaFinEstimada: '2024-11-01',
    fechaFinReal: '2024-11-20',
    destacada: true,
  },
  {
    codigo: 'OBR-2026-00003',
    slug: 'sistema-agua-potable-el-hatillo',
    nombre: 'Sistema de Agua Potable El Hatillo',
    descripcion: 'Instalación de nueva tubería matriz y tanque de almacenamiento.',
    tipoObra: 'Agua Potable',
    estatus: 'Planificada',
    municipio: 'El Hatillo',
    contratista: null,
    fuente: 'Financiamiento Internacional',
    lat: 10.3897,
    lng: -66.8317,
    presupuestoAprobado: '6800000.00',
    montoEjecutado: '0.00',
    avanceFisico: 0,
    avanceFinanciero: 0,
    beneficiarios: 12000,
    capacidadDescripcion: '14 km de tubería',
    fechaAprobacion: '2026-01-05',
    destacada: false,
  },
  {
    codigo: 'OBR-2026-00004',
    slug: 'complejo-deportivo-parque-del-este',
    nombre: 'Complejo Deportivo Parque del Este',
    descripcion: 'Construcción de un complejo deportivo multiuso, actualmente detenido por revisión de permisos.',
    tipoObra: 'Deporte',
    estatus: 'Paralizada',
    municipio: 'Sucre',
    contratista: 'Constructora Andina C.A.',
    fuente: 'Presupuesto Regional',
    lat: 10.4944,
    lng: -66.8464,
    presupuestoAprobado: '12500000.00',
    montoEjecutado: '3100000.00',
    avanceFisico: 22,
    avanceFinanciero: 25,
    beneficiarios: 30000,
    capacidadDescripcion: 'Cancha múltiple + piscina olímpica',
    fechaAprobacion: '2024-06-01',
    fechaInicio: '2024-09-01',
    fechaFinEstimada: '2026-03-01',
    destacada: false,
  },
  {
    codigo: 'OBR-2026-00005',
    slug: 'rehabilitacion-avenida-francisco-de-miranda',
    nombre: 'Rehabilitación Avenida Francisco de Miranda',
    descripcion: 'Repavimentación y señalización de 6 km de vía principal.',
    tipoObra: 'Vialidad',
    estatus: 'Inaugurada',
    municipio: 'Baruta',
    contratista: 'Inversiones y Construcciones del Centro C.A.',
    fuente: 'Presupuesto Regional',
    lat: 10.4931,
    lng: -66.8558,
    presupuestoAprobado: '9600000.00',
    montoEjecutado: '9550000.00',
    avanceFisico: 100,
    avanceFinanciero: 100,
    beneficiarios: 90000,
    capacidadDescripcion: '6 km',
    fechaAprobacion: '2024-02-01',
    fechaInicio: '2024-03-15',
    fechaFinEstimada: '2024-09-15',
    fechaFinReal: '2024-09-10',
    destacada: true,
  },
];

// ========================================
// Helpers
// ========================================

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

async function seedCatalogos() {
  console.log('→ Catálogos...');

  const tiposObra = await Promise.all(
    TIPOS_OBRA.map((t) =>
      prisma.tipoObra.upsert({ where: { nombre: t.nombre }, update: {}, create: t })
    )
  );

  const estatusObra = await Promise.all(
    ESTATUS_OBRA.map((e) =>
      prisma.estatusObra.upsert({ where: { nombre: e.nombre }, update: {}, create: e })
    )
  );

  const fuentes = await Promise.all(
    FUENTES_FINANCIAMIENTO.map((nombre) =>
      prisma.fuenteFinanciamiento.upsert({ where: { nombre }, update: {}, create: { nombre } })
    )
  );

  const cargos = await Promise.all(
    CARGOS.map((c) =>
      prisma.cargo.upsert({ where: { nombre: c.nombre }, update: {}, create: c })
    )
  );

  const entes = await Promise.all(
    ENTES.map((e) =>
      prisma.ente.upsert({ where: { nombre: e.nombre }, update: {}, create: e })
    )
  );

  const contratistas = await Promise.all(
    CONTRATISTAS.map((c) =>
      prisma.contratista.upsert({ where: { razonSocial: c.razonSocial }, update: {}, create: c })
    )
  );

  console.log(
    `  ✓ ${tiposObra.length} tipos de obra, ${estatusObra.length} estatus, ${fuentes.length} fuentes de financiamiento, ${cargos.length} cargos, ${entes.length} entes, ${contratistas.length} contratistas`
  );

  return { tiposObra, estatusObra, fuentes, cargos, entes, contratistas };
}

async function seedTerritorio() {
  console.log('→ Territorio (región piloto)...');

  const estados = new Map<string, { id: string }>();
  for (const e of ESTADOS_PILOTO) {
    const estado = await prisma.estado.upsert({
      where: { codigo: e.codigo },
      update: {},
      create: { nombre: e.nombre, codigo: e.codigo },
    });
    estados.set(e.codigo, estado);
  }

  const municipios = new Map<string, { id: string }>();
  for (const m of MUNICIPIOS_PILOTO) {
    const estado = estados.get(m.estado);
    if (!estado) throw new Error(`Estado no encontrado para municipio ${m.nombre}: ${m.estado}`);
    const municipio = await prisma.municipio.upsert({
      where: { estadoId_nombre: { estadoId: estado.id, nombre: m.nombre } },
      update: {},
      create: { nombre: m.nombre, estadoId: estado.id },
    });
    municipios.set(m.nombre, municipio);
  }

  const parroquias = new Map<string, { id: string }>();
  for (const p of PARROQUIAS_PILOTO) {
    const municipio = municipios.get(p.municipio);
    if (!municipio) throw new Error(`Municipio no encontrado para parroquia ${p.nombre}: ${p.municipio}`);
    const parroquia = await prisma.parroquia.upsert({
      where: { municipioId_nombre: { municipioId: municipio.id, nombre: p.nombre } },
      update: {},
      create: { nombre: p.nombre, municipioId: municipio.id },
    });
    parroquias.set(p.nombre, parroquia);
  }

  console.log(
    `  ✓ ${estados.size} estados, ${municipios.size} municipios, ${parroquias.size} parroquias (piloto — el resto del país se carga vía GeoJSON, ver POSTGIS_NOTAS.md)`
  );

  return { estados, municipios, parroquias };
}

async function seedUsuarioAdmin(entes: { id: string; nombre: string }[]) {
  console.log('→ Usuario administrador...');

  const enteMinisterio = entes.find((e) => e.nombre.includes('Ministerio'));
  const email = 'admin@sigop.gob.ve';
  const passwordTemporal = 'CambiaEstaClave123!';
  const password = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      nombre: 'Administrador SIGOP',
      rol: RolUsuario.SUPER_ADMIN,
      enteId: enteMinisterio?.id,
    },
  });

  console.log(`  ✓ Usuario admin: ${email} / ${passwordTemporal}`);
  console.log('  ⚠ Cambia esta contraseña apenas inicies sesión por primera vez.');
}

/** Crea una obra y le asigna su punto de ubicación con SQL crudo (ver POSTGIS_NOTAS.md). */
async function crearObraConUbicacion(params: {
  obraData: Parameters<typeof prisma.obra.create>[0]['data'];
  lat: number;
  lng: number;
}) {
  const obra = await prisma.obra.create({ data: params.obraData });

  await prisma.$executeRaw`
    UPDATE obras
    SET ubicacion = ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)
    WHERE id = ${obra.id}
  `;

  return obra;
}

async function seedObras(ctx: {
  tiposObra: { id: string; nombre: string }[];
  estatusObra: { id: string; nombre: string }[];
  fuentes: { id: string; nombre: string }[];
  entes: { id: string; nombre: string }[];
  contratistas: { id: string; razonSocial: string }[];
  municipios: Map<string, { id: string }>;
}) {
  console.log('→ Obras de demostración...');

  const enteDefault = ctx.entes[0];

  const obrasCreadas: { id: string; nombre: string }[] = [];

  for (const demo of OBRAS_DEMO) {
    const tipoObra = ctx.tiposObra.find((t) => t.nombre === demo.tipoObra);
    const estatus = ctx.estatusObra.find((e) => e.nombre === demo.estatus);
    const municipio = ctx.municipios.get(demo.municipio);
    const fuente = ctx.fuentes.find((f) => f.nombre === demo.fuente);
    const contratista = demo.contratista
      ? ctx.contratistas.find((c) => c.razonSocial === demo.contratista)
      : undefined;

    if (!tipoObra || !estatus || !municipio) {
      throw new Error(`Datos de catálogo/territorio faltantes para la obra ${demo.nombre}`);
    }

    // Idempotencia manual: si ya existe una obra con este código, no la duplicamos
    // ni la volvemos a actualizar (evita generar avances/fotos repetidos en cada
    // corrida del seed).
    const existente = await prisma.obra.findUnique({ where: { codigo: demo.codigo } });
    if (existente) {
      obrasCreadas.push(existente);
      continue;
    }

    const obra = await crearObraConUbicacion({
      lat: demo.lat,
      lng: demo.lng,
      obraData: {
        codigo: demo.codigo,
        slug: demo.slug,
        nombre: demo.nombre,
        descripcion: demo.descripcion,
        tipoObraId: tipoObra.id,
        estatusId: estatus.id,
        enteId: enteDefault.id,
        contratistaId: contratista?.id,
        fuenteFinanciamientoId: fuente?.id,
        estadoId: (await prisma.municipio.findUniqueOrThrow({ where: { id: municipio.id } })).estadoId,
        municipioId: municipio.id,
        presupuestoAprobado: demo.presupuestoAprobado,
        montoEjecutado: demo.montoEjecutado,
        avanceFisico: demo.avanceFisico,
        avanceFinanciero: demo.avanceFinanciero,
        beneficiarios: demo.beneficiarios,
        capacidadDescripcion: demo.capacidadDescripcion,
        fechaAprobacion: toDate(demo.fechaAprobacion),
        fechaInicio: toDate(demo.fechaInicio),
        fechaFinEstimada: toDate(demo.fechaFinEstimada),
        fechaFinReal: toDate(demo.fechaFinReal),
        destacada: demo.destacada,
        estadoPublicacion: 'PUBLICADO',
      },
    });

    // Un avance inicial de ejemplo (historial de avance físico/financiero)
    await prisma.avance.create({
      data: {
        obraId: obra.id,
        avanceFisico: demo.avanceFisico,
        avanceFinanciero: demo.avanceFinanciero,
        comentario: 'Avance inicial cargado durante la puesta en marcha del sistema.',
        registradoPor: 'seed',
      },
    });

    // Una foto de portada de ejemplo (placeholder — reemplazar por fotos reales)
    await prisma.multimedia.create({
      data: {
        obraId: obra.id,
        tipo: 'IMAGEN',
        url: '/uploads/demo/placeholder-obra.jpg',
        titulo: 'Vista general',
        esPortada: true,
      },
    });

    obrasCreadas.push(obra);
  }

  console.log(`  ✓ ${obrasCreadas.length} obras (con ubicación, avance inicial y foto de portada)`);
  return obrasCreadas;
}

async function seedPersonal(ctx: {
  cargos: { id: string; nombre: string }[];
  obraHospital: { id: string };
}) {
  console.log('→ Personal de demostración (organigrama del Hospital Los Próceres)...');

  const cargoJefe = ctx.cargos.find((c) => c.nombre === 'Jefe de Obra')!;
  const cargoIngeniero = ctx.cargos.find((c) => c.nombre === 'Ingeniero Residente')!;
  const cargoSupervisor = ctx.cargos.find((c) => c.nombre === 'Supervisor de Cuadrilla')!;
  const cargoObrero = ctx.cargos.find((c) => c.nombre === 'Obrero')!;

  const jefeDeObra = await prisma.persona.create({
    data: {
      nombres: 'Ramón',
      apellidos: 'Gutiérrez',
      profesion: 'Ingeniero Civil',
      aniosExperiencia: 18,
      consentimientoPublicacion: true,
      fechaConsentimiento: new Date(),
    },
  });

  const asignacionJefe = await prisma.obraPersonal.create({
    data: {
      obraId: ctx.obraHospital.id,
      personaId: jefeDeObra.id,
      cargoId: cargoJefe.id,
      area: 'Dirección',
      fechaIngreso: new Date('2025-04-01'),
    },
  });

  const ingenieroResidente = await prisma.persona.create({
    data: {
      nombres: 'Andrea',
      apellidos: 'Suárez',
      profesion: 'Ingeniera Civil',
      aniosExperiencia: 9,
      consentimientoPublicacion: true,
      fechaConsentimiento: new Date(),
    },
  });

  const asignacionIngeniero = await prisma.obraPersonal.create({
    data: {
      obraId: ctx.obraHospital.id,
      personaId: ingenieroResidente.id,
      cargoId: cargoIngeniero.id,
      area: 'Ingeniería',
      supervisorId: asignacionJefe.id,
      fechaIngreso: new Date('2025-04-05'),
    },
  });

  const supervisorCuadrilla = await prisma.persona.create({
    data: {
      nombres: 'José',
      apellidos: 'Martínez',
      profesion: 'Técnico en Construcción Civil',
      aniosExperiencia: 12,
      consentimientoPublicacion: true,
      fechaConsentimiento: new Date(),
    },
  });

  const asignacionSupervisor = await prisma.obraPersonal.create({
    data: {
      obraId: ctx.obraHospital.id,
      personaId: supervisorCuadrilla.id,
      cargoId: cargoSupervisor.id,
      area: 'Campo',
      supervisorId: asignacionIngeniero.id,
      fechaIngreso: new Date('2025-04-10'),
    },
  });

  const obreroNombres = [
    ['Luis', 'Fernández'],
    ['Pedro', 'Rojas'],
  ];

  for (const [nombres, apellidos] of obreroNombres) {
    const obrero = await prisma.persona.create({
      data: {
        nombres,
        apellidos,
        profesion: 'Obrero de construcción',
        // Sin consentimiento explícito todavía: se muestra solo con cargo, sin nombre/foto.
        consentimientoPublicacion: false,
      },
    });

    await prisma.obraPersonal.create({
      data: {
        obraId: ctx.obraHospital.id,
        personaId: obrero.id,
        cargoId: cargoObrero.id,
        area: 'Campo',
        supervisorId: asignacionSupervisor.id,
        fechaIngreso: new Date('2025-04-15'),
        visiblePublico: true, // visible pero sin datos personales, por falta de consentimiento
      },
    });
  }

  console.log('  ✓ 5 personas asignadas con jerarquía (Jefe → Ingeniero → Supervisor → 2 Obreros)');
}

// ========================================
// Main
// ========================================

async function main() {
  console.log('🌱 Iniciando seed de SIGOP...\n');

  const { tiposObra, estatusObra, fuentes, cargos, entes, contratistas } = await seedCatalogos();
  const { municipios } = await seedTerritorio();
  await seedUsuarioAdmin(entes);

  const obras = await seedObras({
    tiposObra,
    estatusObra,
    fuentes,
    entes,
    contratistas,
    municipios,
  });

  const obraHospital = obras.find((o) => o.nombre.includes('Hospital'));
  if (obraHospital) {
    await seedPersonal({ cargos, obraHospital });
  }

  console.log('\n✅ Seed completado.');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
