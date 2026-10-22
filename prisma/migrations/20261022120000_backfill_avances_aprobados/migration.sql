-- Los avances anteriores al flujo de aprobación ya eran públicos: se marcan como aprobados.
UPDATE "avances" SET "aprobadoEn" = "createdAt" WHERE "aprobadoEn" IS NULL;
