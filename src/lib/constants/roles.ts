/**
 * Single Source of Truth for User Roles.
 * All logic checks for permissions and role assignments should use these constants.
 */

export const USER_ROLES = {
  ADMIN: "admin",
  COACH: "coach",
  STUDENT: "student",
  RECEPTION: "reception",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ALL_ROLES = Object.values(USER_ROLES);

/**
 * Metadata for UI display and visualization.
 */
export const ROLE_INFO: Record<UserRole, { label: string; color: string }> = {
  [USER_ROLES.ADMIN]: {
    label: "Administrador",
    color: "#000",
  },
  [USER_ROLES.COACH]: {
    label: "Professor",
    color: "#2563EB",
  },
  [USER_ROLES.STUDENT]: {
    label: "Atleta",
    color: "#666",
  },
  [USER_ROLES.RECEPTION]: {
    label: "Recepção",
    color: "#16A34A",
  },
};

/**
 * Utility to get role information safely.
 */
export function getRoleInfo(role: string | null | undefined) {
  const normalized = (role?.toLowerCase() || USER_ROLES.STUDENT) as UserRole;
  return ROLE_INFO[normalized] || ROLE_INFO[USER_ROLES.STUDENT];
}
