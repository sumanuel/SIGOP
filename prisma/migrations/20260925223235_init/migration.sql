-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('BORRADOR', 'EN_REVISION', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "TipoMultimedia" AS ENUM ('IMAGEN', 'VIDEO', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "EtapaMultimedia" AS ENUM ('ANTES', 'DURANTE', 'DESPUES');

-- CreateEnum
CREATE TYPE "EstadoModeracion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "estados" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "geometria" geometry(MultiPolygon, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estadoId" TEXT NOT NULL,
    "geometria" geometry(MultiPolygon, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parroquias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "geometria" geometry(MultiPolygon, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parroquias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_obra" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estatus_obra" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estatus_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "siglas" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratistas" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rif" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuentes_financiamiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuentes_financiamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelJerarquico" INTEGER NOT NULL DEFAULT 0,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoObraId" TEXT NOT NULL,
    "estatusId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "contratistaId" TEXT,
    "fuenteFinanciamientoId" TEXT,
    "estadoId" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "parroquiaId" TEXT,
    "direccion" TEXT,
    "ubicacion" geometry(Point, 4326),
    "trazado" geometry(Geometry, 4326),
    "presupuestoAprobado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoEjecutado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "fechaAprobacion" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "avanceFisico" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avanceFinanciero" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beneficiarios" INTEGER,
    "capacidadDescripcion" TEXT,
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "estadoPublicacion" "EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "creadoPor" TEXT,
    "actualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avances" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avanceFisico" DOUBLE PRECISION NOT NULL,
    "avanceFinanciero" DOUBLE PRECISION NOT NULL,
    "comentario" TEXT,
    "registradoPor" TEXT,
    "aprobadoPor" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hitos" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaPlanificada" TIMESTAMP(3),
    "fechaReal" TIMESTAMP(3),
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multimedia" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "avanceId" TEXT,
    "tipo" "TipoMultimedia" NOT NULL DEFAULT 'IMAGEN',
    "url" TEXT NOT NULL,
    "miniaturaUrl" TEXT,
    "titulo" TEXT,
    "etapa" "EtapaMultimedia",
    "esPortada" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaCaptura" TIMESTAMP(3),
    "latitudExif" DOUBLE PRECISION,
    "longitudExif" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multimedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "profesion" TEXT,
    "especialidad" TEXT,
    "aniosExperiencia" INTEGER,
    "bioCorta" TEXT,
    "documentoIdentidad" TEXT,
    "consentimientoPublicacion" BOOLEAN NOT NULL DEFAULT false,
    "fechaConsentimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obra_personal" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "area" TEXT,
    "supervisorId" TEXT,
    "fechaIngreso" TIMESTAMP(3),
    "fechaSalida" TIMESTAMP(3),
    "visiblePublico" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CONSULTA',
    "twoFactorSecret" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "enteId" TEXT,
    "estadoRestriccionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_ciudadanos" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT,
    "correo" TEXT,
    "mensaje" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "estadoModeracion" "EstadoModeracion" NOT NULL DEFAULT 'PENDIENTE',
    "moderadoPor" TEXT,
    "moderadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_ciudadanos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "tokenConfirmacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_nombre_key" ON "estados"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estados_codigo_key" ON "estados"("codigo");

-- CreateIndex
CREATE INDEX "municipios_estadoId_idx" ON "municipios"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "municipios_estadoId_nombre_key" ON "municipios"("estadoId", "nombre");

-- CreateIndex
CREATE INDEX "parroquias_municipioId_idx" ON "parroquias"("municipioId");

-- CreateIndex
CREATE UNIQUE INDEX "parroquias_municipioId_nombre_key" ON "parroquias"("municipioId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_obra_nombre_key" ON "tipos_obra"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estatus_obra_nombre_key" ON "estatus_obra"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "entes_nombre_key" ON "entes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "contratistas_razonSocial_key" ON "contratistas"("razonSocial");

-- CreateIndex
CREATE UNIQUE INDEX "contratistas_rif_key" ON "contratistas"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "fuentes_financiamiento_nombre_key" ON "fuentes_financiamiento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nombre_key" ON "cargos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "obras_codigo_key" ON "obras"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "obras_slug_key" ON "obras"("slug");

-- CreateIndex
CREATE INDEX "obras_estatusId_idx" ON "obras"("estatusId");

-- CreateIndex
CREATE INDEX "obras_tipoObraId_idx" ON "obras"("tipoObraId");

-- CreateIndex
CREATE INDEX "obras_estadoId_idx" ON "obras"("estadoId");

-- CreateIndex
CREATE INDEX "obras_municipioId_idx" ON "obras"("municipioId");

-- CreateIndex
CREATE INDEX "obras_estadoPublicacion_idx" ON "obras"("estadoPublicacion");

-- CreateIndex
CREATE INDEX "obras_destacada_idx" ON "obras"("destacada");

-- CreateIndex
CREATE INDEX "obras_createdAt_idx" ON "obras"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "avances_obraId_fecha_idx" ON "avances"("obraId", "fecha" DESC);

-- CreateIndex
CREATE INDEX "hitos_obraId_idx" ON "hitos"("obraId");

-- CreateIndex
CREATE INDEX "multimedia_obraId_idx" ON "multimedia"("obraId");

-- CreateIndex
CREATE INDEX "multimedia_avanceId_idx" ON "multimedia"("avanceId");

-- CreateIndex
CREATE INDEX "personas_apellidos_nombres_idx" ON "personas"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "obra_personal_obraId_idx" ON "obra_personal"("obraId");

-- CreateIndex
CREATE INDEX "obra_personal_personaId_idx" ON "obra_personal"("personaId");

-- CreateIndex
CREATE INDEX "obra_personal_supervisorId_idx" ON "obra_personal"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "obra_personal_obraId_personaId_cargoId_key" ON "obra_personal"("obraId", "personaId", "cargoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_enteId_idx" ON "usuarios"("enteId");

-- CreateIndex
CREATE INDEX "usuarios_estadoRestriccionId_idx" ON "usuarios"("estadoRestriccionId");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidadId_idx" ON "auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "auditoria_usuarioId_idx" ON "auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoria_createdAt_idx" ON "auditoria"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "reportes_ciudadanos_obraId_idx" ON "reportes_ciudadanos"("obraId");

-- CreateIndex
CREATE INDEX "reportes_ciudadanos_estadoModeracion_idx" ON "reportes_ciudadanos"("estadoModeracion");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_tokenConfirmacion_key" ON "suscripciones"("tokenConfirmacion");

-- CreateIndex
CREATE INDEX "suscripciones_obraId_idx" ON "suscripciones"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_obraId_correo_key" ON "suscripciones"("obraId", "correo");

-- AddForeignKey
ALTER TABLE "municipios" ADD CONSTRAINT "municipios_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parroquias" ADD CONSTRAINT "parroquias_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_tipoObraId_fkey" FOREIGN KEY ("tipoObraId") REFERENCES "tipos_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_estatusId_fkey" FOREIGN KEY ("estatusId") REFERENCES "estatus_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "entes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_fuenteFinanciamientoId_fkey" FOREIGN KEY ("fuenteFinanciamientoId") REFERENCES "fuentes_financiamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_parroquiaId_fkey" FOREIGN KEY ("parroquiaId") REFERENCES "parroquias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances" ADD CONSTRAINT "avances_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hitos" ADD CONSTRAINT "hitos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multimedia" ADD CONSTRAINT "multimedia_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multimedia" ADD CONSTRAINT "multimedia_avanceId_fkey" FOREIGN KEY ("avanceId") REFERENCES "avances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra_personal" ADD CONSTRAINT "obra_personal_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra_personal" ADD CONSTRAINT "obra_personal_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra_personal" ADD CONSTRAINT "obra_personal_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra_personal" ADD CONSTRAINT "obra_personal_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "obra_personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "entes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_estadoRestriccionId_fkey" FOREIGN KEY ("estadoRestriccionId") REFERENCES "estados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_ciudadanos" ADD CONSTRAINT "reportes_ciudadanos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
