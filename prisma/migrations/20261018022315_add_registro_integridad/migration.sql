-- CreateTable
CREATE TABLE "registro_integridad" (
    "id" TEXT NOT NULL,
    "secuencia" SERIAL NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "datosHash" TEXT NOT NULL,
    "hashAnterior" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_integridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registro_integridad_secuencia_key" ON "registro_integridad"("secuencia");

-- CreateIndex
CREATE INDEX "registro_integridad_entidad_entidadId_idx" ON "registro_integridad"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "registro_integridad_obraId_idx" ON "registro_integridad"("obraId");
