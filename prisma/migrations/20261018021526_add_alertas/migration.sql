-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('SIN_ACTUALIZACION', 'DESFASE_FINANCIERO', 'VENCIMIENTO_PROXIMO', 'OBRA_VENCIDA', 'PARALIZADA_PROLONGADA');

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "severidad" INTEGER NOT NULL DEFAULT 1,
    "mensaje" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resueltaPor" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertas_obraId_idx" ON "alertas"("obraId");

-- CreateIndex
CREATE INDEX "alertas_tipo_resuelta_idx" ON "alertas"("tipo", "resuelta");

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
