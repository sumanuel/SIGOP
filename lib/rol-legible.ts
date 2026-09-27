// Etiquetas en español de RolUsuario (prisma/schema.prisma) — usado tanto en
// el dashboard como en la gestión de usuarios, para no mantener el mismo
// mapa duplicado en dos componentes.
export const ROL_LEGIBLE: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN_ENTE: 'Administrador de ente',
  EDITOR_OBRA: 'Editor de obra',
  APROBADOR: 'Aprobador',
  CONSULTA: 'Consulta',
};

export const ROLES_USUARIO = ['SUPER_ADMIN', 'ADMIN_ENTE', 'EDITOR_OBRA', 'APROBADOR', 'CONSULTA'] as const;
