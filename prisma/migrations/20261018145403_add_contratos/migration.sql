-- CreateEnum
CREATE TYPE "ModalidadContratacion" AS ENUM ('LICITACION_GENERAL', 'LICITACION_SELECTIVA', 'CONTRATACION_DIRECTA', 'CONSULTA_PRECIOS');

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "contratistaId" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "modalidad" "ModalidadContratacion" NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "montoActual" DECIMAL(18,2) NOT NULL,
    "fechaFirma" TIMESTAMP(3) NOT NULL,
    "plazoEjecucionDias" INTEGER NOT NULL,
    "documentoUrl" TEXT,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_adendas" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "montoAnterior" DECIMAL(18,2) NOT NULL,
    "montoNuevo" DECIMAL(18,2) NOT NULL,
    "diasAdicionales" INTEGER NOT NULL DEFAULT 0,
    "documentoUrl" TEXT,
    "registradoPor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrato_adendas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_obraId_key" ON "contratos"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numeroContrato_key" ON "contratos"("numeroContrato");

-- CreateIndex
CREATE INDEX "contratos_contratistaId_idx" ON "contratos"("contratistaId");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_adendas_contratoId_numero_key" ON "contrato_adendas"("contratoId", "numero");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "contratistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_adendas" ADD CONSTRAINT "contrato_adendas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
