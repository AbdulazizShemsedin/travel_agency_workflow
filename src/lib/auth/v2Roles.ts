/**
 * Authoritative V2 Custom Role Taxonomy
 * 
 * Sourced directly from `swagger.json` info["x-custom-roles"]
 */

export const V2_CUSTOM_ROLES = [
  "Admin",
  "Manager",
  "Registrar",
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
  "CV",
  "Medical Officer",
] as const;

export type V2CustomRole = (typeof V2_CUSTOM_ROLES)[number];

export interface V2AuthUser {
  user?: string; // email or username
  email?: string;
  full_name?: string;
  roles: string[];
  read_only_roles?: string[];
  contractor?: any;
  is_internal_staff?: boolean;
}

export function isRoleReadOnly(user: V2AuthUser | null | undefined, targetRole: string): boolean {
  if (!user) return false;
  const usernameLower = (user.user || "").toLowerCase().trim();
  if (usernameLower === "administrator") return false;

  const normRoles = (user.roles || []).map((r) => (typeof r === "string" ? r : "").trim().toLowerCase());
  // Administrative full-access roles are never read-only
  if (normRoles.some((r) => r === "admin" || r === "system manager" || r === "administrator")) {
    return false;
  }

  const targetLower = targetRole.trim().toLowerCase().replace(" (view)", "");
  if (targetLower === "admin" || targetLower === "system manager" || targetLower === "administrator") {
    return false;
  }

  // Check read_only_roles array
  const roSet = new Set((user.read_only_roles || []).map((r) => r.trim().toLowerCase()));
  if (roSet.has(targetLower)) return true;

  // Check if roles contains role with "(View)" suffix
  return normRoles.some((r) => r === `${targetLower} (view)`);
}

const ADMIN_OVERRIDE_ROLES = new Set([
  "admin",
  "administrator",
  "system manager",
]);

/**
 * Checks if user has a specific V2 role (case-insensitive match or Admin override).
 * Note: Foreign Agency is an external contractor identity that cannot be spoofed by Admin.
 */
export function hasV2Role(user: V2AuthUser | null | undefined, targetRole: V2CustomRole | string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const cleanTarget = targetRole.trim().toLowerCase().replace(" (view)", "");

  // Foreign Agency cannot be spoofed by administrative role expansion
  if (cleanTarget === "foreign agency") {
    return user.roles.some((r) => String(r).trim().toLowerCase() === "foreign agency");
  }

  const usernameLower = (user.user || "").toLowerCase().trim();
  if (usernameLower === "administrator") {
    return true;
  }
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase().replace(" (view)", ""));
  if (normRoles.some((r) => ADMIN_OVERRIDE_ROLES.has(r))) {
    return true;
  }
  return normRoles.includes(cleanTarget);
}

/**
 * Checks if user holds at least one of the specified V2 roles.
 */
export function hasAnyV2Role(user: V2AuthUser | null | undefined, targetRoles: (V2CustomRole | string)[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return targetRoles.some((role) => hasV2Role(user, role));
}

export const STAFF_SELECTION_ROLES = new Set([
  "admin",
  "administrator",
  "system manager",
  "manager",
]);

/**
 * Checks if user is an internal staff member authorized for direct candidate selection
 * (holds Administrator, Manager, Admin, or System Manager).
 */
export function isStaffSelectionUser(user: V2AuthUser | null | undefined): boolean {
  if (!user) return false;
  const username = (user.user || user.email || "").toLowerCase().trim();
  if (username === "administrator") return true;
  if (!Array.isArray(user.roles)) return false;
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase().replace(" (view)", ""));
  return normRoles.some((r) => STAFF_SELECTION_ROLES.has(r));
}

/**
 * Checks if user is a pure external Foreign Agency (holds 'Foreign Agency'
 * and does NOT hold Manager, Admin, System Manager, or Administrator).
 */
export function isPureForeignAgency(user: V2AuthUser | null | undefined): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const username = (user.user || user.email || "").toLowerCase().trim();
  if (username === "administrator") return false;
  const normRoles = user.roles.map((r) => (typeof r === "string" ? r : "").trim().toLowerCase().replace(" (view)", ""));
  const hasForeignRole = normRoles.includes("foreign agency");
  const hasStaffRole = normRoles.some((r) => STAFF_SELECTION_ROLES.has(r));
  return hasForeignRole && !hasStaffRole;
}

/**
 * Checks if user is exclusively an external partner agency.
 */
export function isV2ForeignAgency(user: V2AuthUser | null | undefined): boolean {
  return isPureForeignAgency(user);
}
