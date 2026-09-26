import type { ObraMapa } from '@/lib/types/obra';

// Datos de marcador de posición para poder ver el mapa funcionando antes de
// tener la API conectada a la base de datos. Mismas 5 obras y coordenadas
// que prisma/seed.ts, para que la demo sea consistente una vez se reemplace
// esto por un fetch real a /api/obras (próximo paso del proyecto).
//
// TODO: reemplazar por `await fetch('/api/obras')` cuando exista el Route
// Handler — ver app/api/obras/route.ts (pendiente).

export const OBRAS_DEMO: ObraMapa[] = [
  {
    id: '1',
    codigo: 'OBR-2026-00001',
    slug: 'hospital-materno-infantil-los-proceres',
    nombre: 'Hospital Materno Infantil Los Próceres',
    tipoObra: { nombre: 'Salud', color: '#DC2626', icono: 'hospital' },
    estatus: { nombre: 'En ejecución', color: '#2563EB' },
    avanceFisico: 45,
    presupuestoAprobado: 85000000,
    estado: 'Distrito Capital',
    municipio: 'Libertador',
    lat: 10.488,
    lng: -66.8791,
  },
  {
    id: '2',
    codigo: 'OBR-2026-00002',
    slug: 'escuela-basica-simon-rodriguez',
    nombre: 'Escuela Básica Bolivariana Simón Rodríguez',
    tipoObra: { nombre: 'Educación', color: '#2563EB', icono: 'school' },
    estatus: { nombre: 'Culminada', color: '#059669' },
    avanceFisico: 100,
    presupuestoAprobado: 4200000,
    estado: 'Miranda',
    municipio: 'Chacao',
    lat: 10.4989,
    lng: -66.8534,
  },
  {
    id: '3',
    codigo: 'OBR-2026-00003',
    slug: 'sistema-agua-potable-el-hatillo',
    nombre: 'Sistema de Agua Potable El Hatillo',
    tipoObra: { nombre: 'Agua Potable', color: '#0891B2', icono: 'droplet' },
    estatus: { nombre: 'Planificada', color: '#94A3B8' },
    avanceFisico: 0,
    presupuestoAprobado: 6800000,
    estado: 'Miranda',
    municipio: 'El Hatillo',
    lat: 10.3897,
    lng: -66.8317,
  },
  {
    id: '4',
    codigo: 'OBR-2026-00004',
    slug: 'complejo-deportivo-parque-del-este',
    nombre: 'Complejo Deportivo Parque del Este',
    tipoObra: { nombre: 'Deporte', color: '#7C3AED', icono: 'trophy' },
    estatus: { nombre: 'Paralizada', color: '#DC2626' },
    avanceFisico: 22,
    presupuestoAprobado: 12500000,
    estado: 'Miranda',
    municipio: 'Sucre',
    lat: 10.4944,
    lng: -66.8464,
  },
  {
    id: '5',
    codigo: 'OBR-2026-00005',
    slug: 'rehabilitacion-avenida-francisco-de-miranda',
    nombre: 'Rehabilitación Avenida Francisco de Miranda',
    tipoObra: { nombre: 'Vialidad', color: '#F59E0B', icono: 'road' },
    estatus: { nombre: 'Inaugurada', color: '#7C3AED' },
    avanceFisico: 100,
    presupuestoAprobado: 9600000,
    estado: 'Miranda',
    municipio: 'Baruta',
    lat: 10.4931,
    lng: -66.8558,
  },
];
