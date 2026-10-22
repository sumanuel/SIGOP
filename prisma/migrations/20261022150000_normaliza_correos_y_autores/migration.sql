-- Los correos de usuarios se guardan en minúsculas (el login y la recuperación ya los normalizan).
UPDATE "usuarios" SET "email" = lower("email") WHERE "email" <> lower("email");

-- Los avances y obras anteriores guardaron el correo del autor: se cambia por su id,
-- para que ya no quede un correo en esos campos.
UPDATE "avances" a SET "registradoPor" = u."id" FROM "usuarios" u WHERE a."registradoPor" = u."email";
UPDATE "obras" o SET "actualizadoPor" = u."id" FROM "usuarios" u WHERE o."actualizadoPor" = u."email";
