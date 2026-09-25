-- Índices espaciales GiST (obligatorios para que las consultas geográficas
-- del mapa sean rápidas). Prisma no puede declararlos en schema.prisma
-- (@@index solo genera B-Tree) — ver prisma/POSTGIS_NOTAS.md, sección 2.

CREATE INDEX IF NOT EXISTS obras_ubicacion_gist_idx ON "obras" USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS obras_trazado_gist_idx ON "obras" USING GIST (trazado);

CREATE INDEX IF NOT EXISTS estados_geometria_gist_idx ON "estados" USING GIST (geometria);
CREATE INDEX IF NOT EXISTS municipios_geometria_gist_idx ON "municipios" USING GIST (geometria);
CREATE INDEX IF NOT EXISTS parroquias_geometria_gist_idx ON "parroquias" USING GIST (geometria);
