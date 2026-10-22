-- CreateTable
CREATE TABLE "garantias_obra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "fechaInicioGarantia" TIMESTAMP(3) NOT NULL,
    "fechaFinGarantia" TIMESTAMP(3) NOT NULL,
    "cubreEstructura" BOOLEAN NOT NULL DEFAULT true,
    "cubreInstalaciones" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garantias_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervenciones_mantenimiento" (
    "id" TEXT NOT NULL,
    "garantiaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo" DECIMAL(18,2),
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "realizadoPor" TEXT,
    "fotoAntesUrl" TEXT,
    "fotoDespuesUrl" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervenciones_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garantias_obra_obraId_key" ON "garantias_obra"("obraId");

-- CreateIndex
CREATE INDEX "intervenciones_mantenimiento_garantiaId_idx" ON "intervenciones_mantenimiento"("garantiaId");

-- AddForeignKey
ALTER TABLE "garantias_obra" ADD CONSTRAINT "garantias_obra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervenciones_mantenimiento" ADD CONSTRAINT "intervenciones_mantenimiento_garantiaId_fkey" FOREIGN KEY ("garantiaId") REFERENCES "garantias_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
