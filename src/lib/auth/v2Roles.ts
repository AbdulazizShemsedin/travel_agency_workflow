/**
 * Authoritative V2 Custom Role Taxonomy
 * 
 * Sourced directly from `swagger.json` info["x-custom-roles"]
 */

export const V2_CUSTOM_ROLES = [
  "Registrar",
  "Manager",
  "Admin",
  "Clearance Officer",
  "Ticketer",
  "Complaint Manager",
  "Finance Manager",
  "Foreign Agency",
  "Communication Manager",
  "Contract Parser",
  "Saudi LMIS",
  "Saudi Taeshir",
  "Saudi Embassy",
  "Kuwait LMIS",
  "Kuwait Telesign",
  "Kuwait Embassy",
] as const;

export type V2CustomRole = (typeof V2_CUSTOM_ROLES)[number];

export interface V2AuthUser {
  user: string; // email or username
  full_name: string;
  roles: string[];
  contractor?: string | null;
}

/**
 * Checks if user has a specific V2 role (case-sensitive exact match or Admin/Manager override).
 */
export function hasV2Role(user: V2AuthUser | null | undefined, targetRole: V2CustomRole): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  if (user.roles.includes("Admin") || user.roles.includes("Administrator") || user.roles.includes("System Manager")) {
    return true;
  }
  return user.roles.includes(targetRole);
}

/**
 * Checks if user holds at least one of the specified V2 roles.
 */
export function hasAnyV2Role(user: V2AuthUser | null | undefined, targetRoles: V2CustomRole[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  if (user.roles.includes("Admin") || user.roles.includes("Administrator") || user.roles.includes("System Manager")) {
    return true;
  }
  return targetRoles.some((role) => user.roles.includes(role));
}

/**
 * Checks if user is exclusively an external partner agency.
 */
export function isV2ForeignAgency(user: V2AuthUser | null | undefined): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.includes("Foreign Agency") && !user.roles.includes("Admin") && !user.roles.includes("Manager");
}
