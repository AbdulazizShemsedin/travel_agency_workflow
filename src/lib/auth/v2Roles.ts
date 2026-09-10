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
  is_internal_staff?: boolean;
}

const ADMIN_OVERRIDE_ROLES = new Set([
  "admin",
  "administrator",
  "system manager",
  "agency admin",
  "manager",
]);

/**
 * Checks if user has a specific V2 role (case-insensitive match or Admin/Manager override).
 */
export function hasV2Role(user: V2AuthUser | null | undefined, targetRole: V2CustomRole | string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const usernameLower = (user.user || "").toLowerCase().trim();
  if (usernameLower === "administrator" || usernameLower.startsWith("admin")) {
    return true;
  }
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase());
  if (normRoles.some((r) => ADMIN_OVERRIDE_ROLES.has(r))) {
    return true;
  }
  return normRoles.includes(targetRole.trim().toLowerCase());
}

/**
 * Checks if user holds at least one of the specified V2 roles.
 */
export function hasAnyV2Role(user: V2AuthUser | null | undefined, targetRoles: (V2CustomRole | string)[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const usernameLower = (user.user || "").toLowerCase().trim();
  if (usernameLower === "administrator" || usernameLower.startsWith("admin")) {
    return true;
  }
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase());
  if (normRoles.some((r) => ADMIN_OVERRIDE_ROLES.has(r))) {
    return true;
  }
  const normTargets = targetRoles.map((role) => role.trim().toLowerCase());
  return normTargets.some((role) => normRoles.includes(role));
}

/**
 * Checks if user is exclusively an external partner agency.
 */
export function isV2ForeignAgency(user: V2AuthUser | null | undefined): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase());
  const isForeign = normRoles.includes("foreign agency");
  const isAdminOrManager = normRoles.some((r) => ADMIN_OVERRIDE_ROLES.has(r));
  return isForeign && !isAdminOrManager;
}
