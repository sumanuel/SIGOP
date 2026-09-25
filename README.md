# SIGOP — Sistema de Información Geográfica de Obras Públicas

Plataforma de transparencia y seguimiento georreferenciado de obras públicas
(hospitales, escuelas, carreteras, viviendas, etc.). Ver [PLAN_PROYECTO.md](./PLAN_PROYECTO.md)
para el alcance completo y [MODULOS_AVANZADOS.md](./MODULOS_AVANZADOS.md) para
la profundización de módulos avanzados.

## Stack

- **Next.js** (App Router) — portal público, panel admin y API (Route
  Handlers) en un solo proyecto, un solo proceso.
- **Prisma + PostgreSQL/PostGIS** — ver `prisma/schema.prisma` y
  `prisma/POSTGIS_NOTAS.md` (pasos manuales necesarios para PostGIS que
  Prisma no hace solo).
- **Tailwind CSS + shadcn/ui**.
- Sin Docker: pensado para correr como proceso Node nativo en un solo
  servidor (ver sección 12 del plan).

## Requisitos previos

- Node.js 20+ (probado con Node 24).
- PostgreSQL 16+ con la extensión **PostGIS** disponible.

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar el archivo de variables de entorno y completar los valores reales:

   ```bash
   cp .env.example .env
   ```

3. Generar el cliente de Prisma y aplicar las migraciones:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

   > Antes de la primera migración, revisa `prisma/POSTGIS_NOTAS.md` —
   > necesitas habilitar la extensión `postgis` en la base de datos y agregar
   > a mano los índices GiST (Prisma no los genera automáticamente).

4. Cargar los datos de demostración (catálogos, región piloto, obras de
   ejemplo, usuario administrador):

   ```bash
   npm run prisma:seed
   ```

5. Levantar el proyecto (frontend + panel admin + API, todo en un solo
   proceso y un solo puerto):

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta todo en modo desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción (un solo proceso) |
| `npm run lint` | ESLint |
| `npm run prisma:generate` | Regenera el cliente de Prisma |
| `npm run prisma:migrate` | Crea/aplica migraciones (desarrollo) |
| `npm run prisma:studio` | Abre Prisma Studio para inspeccionar la BD |
| `npm run prisma:seed` | Carga los datos de demostración |

## Estructura

```
app/
  (público)      → mapa, ficha de obra, equipo de trabajo
  admin/         → panel administrativo (protegido por proxy.ts)
  api/           → Route Handlers = la API (mismo proceso, mismo puerto)
lib/
  server/        → servicios, prisma.ts, auth.ts
prisma/
  schema.prisma  → modelo de datos (con PostGIS)
  seed.ts        → datos de demostración
  POSTGIS_NOTAS.md → pasos manuales de PostGIS (extensión, índices GiST, queries)
uploads/         → imágenes de las obras (no versionado)
```

Ver la sección 10 de [PLAN_PROYECTO.md](./PLAN_PROYECTO.md) para el detalle
completo de la estructura planeada.
