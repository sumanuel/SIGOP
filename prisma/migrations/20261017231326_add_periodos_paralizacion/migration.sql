-- CreateEnum
CREATE TYPE "MotivoParalizacion" AS ENUM ('FALTA_PRESUPUESTO', 'INCUMPLIMIENTO_CONTRATISTA', 'PROBLEMA_LEGAL_PERMISOS', 'PROBLEMA_TECNICO', 'CONDICIONES_CLIMATICAS', 'ORDEN_SUPERIOR', 'OTRO');

-- CreateTable
CREATE TABLE "periodos_paralizacion" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "motivo" "MotivoParalizacion" NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaReactivacion" TIMESTAMP(3),
    "responsableRegistro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodos_paralizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periodos_paralizacion_obraId_idx" ON "periodos_paralizacion"("obraId");

-- CreateIndex
CREATE INDEX "periodos_paralizacion_motivo_idx" ON "periodos_paralizacion"("motivo");

-- AddForeignKey
ALTER TABLE "periodos_paralizacion" ADD CONSTRAINT "periodos_paralizacion_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
