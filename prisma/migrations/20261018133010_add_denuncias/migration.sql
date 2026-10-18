-- CreateEnum
CREATE TYPE "EstadoDenuncia" AS ENUM ('RECIBIDA', 'EN_REVISION', 'DERIVADA_CONTRALORIA', 'CERRADA');

-- CreateTable
CREATE TABLE "denuncias" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "obraId" TEXT,
    "codigoHash" TEXT NOT NULL,
    "esAnonima" BOOLEAN NOT NULL DEFAULT true,
    "contactoCifrado" TEXT,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "evidenciaUrl" TEXT,
    "estado" "EstadoDenuncia" NOT NULL DEFAULT 'RECIBIDA',
    "derivadaA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "denuncias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_denuncia" (
    "id" TEXT NOT NULL,
    "denunciaId" TEXT NOT NULL,
    "estado" "EstadoDenuncia" NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "denuncias_numero_key" ON "denuncias"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "denuncias_codigoHash_key" ON "denuncias"("codigoHash");

-- CreateIndex
CREATE INDEX "denuncias_estado_idx" ON "denuncias"("estado");

-- CreateIndex
CREATE INDEX "denuncias_obraId_idx" ON "denuncias"("obraId");

-- CreateIndex
CREATE INDEX "eventos_denuncia_denunciaId_idx" ON "eventos_denuncia"("denunciaId");

-- AddForeignKey
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_denuncia" ADD CONSTRAINT "eventos_denuncia_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "denuncias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
