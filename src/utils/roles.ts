export type UserRoleFlags = {
  role: string;
  isOwner: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isSuperAdmin: boolean;
  canManageFinancials: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
  canViewAuditLogs: boolean;
};

type UserRoleProfile = {
  rol?: unknown;
  role?: unknown;
  tipo?: unknown;
  user_role?: unknown;
} | null | undefined;

export function getUserRoleFlags(userProfile: UserRoleProfile): UserRoleFlags {
  const role = String(
    userProfile?.rol ||
    userProfile?.role ||
    userProfile?.tipo ||
    userProfile?.user_role ||
    ''
  )
    .trim()
    .toLowerCase();

  const isOwner =
    role === 'dueño' ||
    role === 'dueno' ||
    role === 'owner';

  const isAdmin =
    role === 'administrador' ||
    role === 'admin';

  const isSeller =
    role === 'vendedor' ||
    role === 'seller';

  const isSuperAdmin =
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super-admin';

  return {
    role,
    isOwner,
    isAdmin,
    isSeller,
    isSuperAdmin,

    // Operación del negocio
    canManageFinancials: isOwner || isAdmin,

    // Gestión de usuarios del negocio
    canManageUsers: isOwner || isAdmin || isSuperAdmin,

    // Configuración
    canAccessSettings: isOwner || isAdmin || isSuperAdmin,

    // Auditoría
    canViewAuditLogs: isOwner || isSuperAdmin,
  };
}
