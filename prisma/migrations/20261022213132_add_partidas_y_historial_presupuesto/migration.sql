-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "partidaPresupuestariaId" TEXT;

-- CreateTable
CREATE TABLE "partidas_presupuestarias" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ejercicioFiscal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partidas_presupuestarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_presupuesto" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "montoAnterior" DECIMAL(18,2) NOT NULL,
    "montoNuevo" DECIMAL(18,2) NOT NULL,
    "moneda" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "documentoUrl" TEXT,
    "registradoPor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partidas_presupuestarias_codigo_key" ON "partidas_presupuestarias"("codigo");

-- CreateIndex
CREATE INDEX "historial_presupuesto_obraId_idx" ON "historial_presupuesto"("obraId");

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_partidaPresupuestariaId_fkey" FOREIGN KEY ("partidaPresupuestariaId") REFERENCES "partidas_presupuestarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_presupuesto" ADD CONSTRAINT "historial_presupuesto_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
