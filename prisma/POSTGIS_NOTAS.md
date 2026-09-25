# Notas: Prisma + PostGIS

Prisma no tiene un tipo nativo de geometría, por eso el schema usa
`Unsupported("geometry(...)")` en `ubicacion`, `trazado` y `geometria`. Esto
funciona bien para crear las columnas, pero implica **3 pasos manuales** que
Prisma no hace solo.

## 1. Habilitar la extensión PostGIS

Prisma intentará ejecutar `CREATE EXTENSION IF NOT EXISTS postgis;` gracias al
bloque `extensions = [postgis]` del `datasource`, pero esto requiere permisos
de superusuario en Postgres. Si tu usuario de aplicación no los tiene, pídele
al DBA (o hazlo tú una vez, con un usuario admin) antes de migrar:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Verifica la versión instalada:

```sql
SELECT postgis_full_version();
```

## 2. Generar la migración y agregar los índices espaciales (GiST)

Los campos `Unsupported(...)` sí se migran automáticamente (Prisma genera la
columna con el tipo exacto que escribiste), pero **los índices GiST no se
pueden declarar en `schema.prisma`** (`@@index` solo genera B-Tree). Hay que
crearlos a mano, una vez, dentro de la migración.

```bash
npx prisma migrate dev --create-only --name init_postgis
```

Abre el archivo `migrations/<timestamp>_init_postgis/migration.sql` generado
y agrega al final:

```sql
-- Índices espaciales (obligatorios para que el mapa sea rápido)
CREATE INDEX obras_ubicacion_gist_idx ON obras USING GIST (ubicacion);
CREATE INDEX obras_trazado_gist_idx   ON obras USING GIST (trazado);

CREATE INDEX estados_geometria_gist_idx    ON estados    USING GIST (geometria);
CREATE INDEX municipios_geometria_gist_idx ON municipios USING GIST (geometria);
CREATE INDEX parroquias_geometria_gist_idx ON parroquias USING GIST (geometria);
```

Luego aplica la migración normalmente:

```bash
npx prisma migrate dev
```

> Si ya migraste sin estos índices, créalos después con
> `npx prisma migrate dev --create-only --name add_gist_indexes` y el mismo
> SQL de arriba.

## 3. Leer y escribir geometría (Prisma Client no lo hace solo)

Los campos `Unsupported(...)` **no aparecen** en el `select`/`where` normal
del cliente generado. Para leer o escribir `ubicacion`/`trazado` hay que usar
SQL crudo con `$queryRaw` / `$executeRaw`. Ejemplos para
`lib/server/services/obras.service.ts`:

### Crear una obra con su ubicación

```ts
import { prisma } from '@/lib/server/prisma';

export async function crearObraConUbicacion(data: {
  nombre: string;
  codigo: string;
  slug: string;
  tipoObraId: string;
  estatusId: string;
  enteId: string;
  estadoId: string;
  municipioId: string;
  lat: number;
  lng: number;
}) {
  // 1. Crear la obra sin la geometría (todos los campos "normales" sí van por Prisma Client)
  const obra = await prisma.obra.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      slug: data.slug,
      tipoObraId: data.tipoObraId,
      estatusId: data.estatusId,
      enteId: data.enteId,
      estadoId: data.estadoId,
      municipioId: data.municipioId,
    },
  });

  // 2. Setear la geometría con SQL crudo
  await prisma.$executeRaw`
    UPDATE obras
    SET ubicacion = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)
    WHERE id = ${obra.id}
  `;

  return obra;
}
```

### Listar obras para el mapa (como GeoJSON, listo para MapLibre)

```ts
export async function listarObrasParaMapa() {
  return prisma.$queryRaw`
    SELECT
      id,
      nombre,
      codigo,
      "avanceFisico"     AS "avanceFisico",
      "estatusId"        AS "estatusId",
      ST_AsGeoJSON(ubicacion)::json AS geojson
    FROM obras
    WHERE "estadoPublicacion" = 'PUBLICADO'
      AND ubicacion IS NOT NULL
  `;
}
```

### Obras cercanas a un punto (radio en metros)

```ts
export async function obrasCercanas(lat: number, lng: number, radioMetros = 5000) {
  return prisma.$queryRaw`
    SELECT id, nombre, codigo,
           ST_Distance(
             ubicacion::geography,
             ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
           ) AS distancia_metros
    FROM obras
    WHERE "estadoPublicacion" = 'PUBLICADO'
      AND ST_DWithin(
            ubicacion::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radioMetros}
          )
    ORDER BY distancia_metros ASC
  `;
}
```

### Obras dentro de un estado (usando el polígono de `estados.geometria`)

```ts
export async function obrasDentroDeEstado(estadoId: string) {
  return prisma.$queryRaw`
    SELECT o.id, o.nombre, o.codigo
    FROM obras o
    JOIN estados e ON e.id = ${estadoId}
    WHERE ST_Within(o.ubicacion, e.geometria)
  `;
}
```

> Alternativa más simple si no necesitas la validación geográfica exacta:
> como `obras.estadoId` ya es una FK directa a `estados`, en el 90% de los
> casos basta con `prisma.obra.findMany({ where: { estadoId } })` — usa
> `ST_Within` solo cuando de verdad necesites la geometría (ej. dibujar el
> mapa por polígono, no por el campo de texto).

## 4. Carga de los límites político-territoriales

Para poblar `geometria` de `estados`/`municipios`/`parroquias` normalmente se
importa un **shapefile o GeoJSON oficial** (INE, ONCTI, o el propio ente) con
`ogr2ogr` (parte de GDAL):

```bash
ogr2ogr -f "PostgreSQL" PG:"host=localhost dbname=sigop user=postgres" \
  municipios_venezuela.geojson -nln municipios_staging
```

Y luego un script de seed (`prisma/seed.ts`) copia de la tabla de staging a
`municipios.geometria` con `ST_Multi(ST_MakeValid(geom))` para evitar
geometrías inválidas.
