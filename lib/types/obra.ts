// Forma de una obra tal como la necesita el mapa público. Es un subconjunto
// de los campos de `Obra` en prisma/schema.prisma, aplanado (sin ids de FK,
// con el nombre/color ya resuelto) para que el componente de mapa no tenga
// que conocer la forma de la base de datos.

export interface ObraMapa {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  tipoObra: {
    nombre: string;
    color: string;
    icono: string;
  };
  estatus: {
    nombre: string;
    color: string;
  };
  avanceFisico: number;
  presupuestoAprobado: number;
  anioAprobacion: number | null;
  estado: string;
  municipio: string;
  lat: number;
  lng: number;
}
