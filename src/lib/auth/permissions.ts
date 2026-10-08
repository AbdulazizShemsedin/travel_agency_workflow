import { AuthUser } from "@/lib/api/auth";

export type PermissionAction =
  | "manageUsers"
  | "viewDashboard"
  | "viewApplicants"
  | "registerApplicant"
  | "generateCv"
  | "manageClearances"
  | "viewFinance"
  | "manageCommission"
  | "manageComplaints"
  | "viewReports"
  | "manageContractors"
  | "accessAgentPortal"
  | "manageCommunication"
  | "manageTicketing"
  | "editLms"
  | "editInjaz"
  | "editWakala"
  | "createStamp"
  | "createTicket"
  | "createDeparture"
  | "editEmbassy"
  | "editTelesign";

export const V2_CANONICAL_ROLES = [
  "Registrar",
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

export type V2Role = (typeof V2_CANONICAL_ROLES)[number];

/**
 * Normalizes any role representation (string, { role: string }, { name: string }) to a clean lowercase string.
 */
export function extractRoleName(r: unknown): string {
  if (typeof r === "string") return r.trim().toLowerCase();
  if (r && typeof r === "object") {
    const roleObj = r as Record<string, unknown>;
    if (typeof roleObj.role === "string") return roleObj.role.trim().toLowerCase();
    if (typeof roleObj.name === "string") return roleObj.name.trim().toLowerCase();
  }
  return "";
}

/**
 * Checks if the user has a specific role (exact match, case-insensitive, trimmed).
 * System Manager / Administrator always passes all role checks.
 */
export function hasRole(user: AuthUser | null | undefined, targetRole: string): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return true;
  if (!Array.isArray(user.roles)) return false;
  const normalizedTarget = targetRole.trim().toLowerCase();
  return user.roles.some((r) => {
    const norm = extractRoleName(r);
    return (
      norm === "system manager" ||
      norm === "administrator" ||
      norm === "admin" ||
      norm === normalizedTarget
    );
  });
}

/**
 * Checks if the user has at least one of the specified roles.
 */
export function hasAnyRole(user: AuthUser | null | undefined, targetRoles: string[]): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return true;
  if (!Array.isArray(user.roles)) return false;
  return targetRoles.some((role) => hasRole(user, role));
}

/**
 * Checks if the user has all of the specified roles.
 */
export function hasAllRoles(user: AuthUser | null | undefined, targetRoles: string[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return targetRoles.every((role) => hasRole(user, role));
}

/**
 * Checks if the user explicitly has a specific role (exact string match, case-insensitive).
 * Does NOT auto-expand System Manager or Administrator.
 */
export function hasExactRole(user: AuthUser | null | undefined, targetRole: string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const normalizedTarget = targetRole.trim().toLowerCase();
  return user.roles.some((r) => {
    const norm = extractRoleName(r);
    return norm === normalizedTarget;
  });
}

/**
 * Checks if the user holds an authoritative administrative role
 * (Administrator, System Manager, or Admin).
 */
export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return true;
  if (!Array.isArray(user.roles)) return false;
  return user.roles.some((r) => {
    const norm = extractRoleName(r);
    return norm === "administrator" || norm === "system manager" || norm === "admin";
  });
}

/**
 * Determines if a user is purely an external Foreign Agency partner without internal operational privileges.
 */
export function isPureForeignAgency(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return false;
  if (user.is_internal_staff === true) return false;

  const internalRoles = [
    "system manager",
    "administrator",
    "manager",
    "admin",
    "registrar",
    "clearance officer",
    "ticketer",
    "complaint manager",
    "finance manager",
    "communication manager",
    "contract parser",
    "saudi lmis",
    "saudi taeshir",
    "saudi embassy",
    "kuwait lmis",
    "kuwait telesign",
    "kuwait embassy",
  ];
  const hasInternalRole = (user.roles || []).some((r) =>
    internalRoles.includes(extractRoleName(r))
  );
  if (hasInternalRole) {
    return false;
  }
  return hasExactRole(user, "Foreign Agency");
}

/**
 * Maps standard application capabilities to the 16 authoritative V2 backend roles.
 */
const ACTION_ROLE_MAP: Record<PermissionAction, string[]> = {
  manageUsers: [
    "Admin",
  ],
  viewDashboard: [
    "Admin",
    "Registrar",
    "Clearance Officer",
    "Ticketer",
    "Complaint Manager",
    "Finance Manager",
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
  ],
  viewApplicants: [
    "Admin",
    "Registrar",
    "Clearance Officer",
    "Ticketer",
    "Complaint Manager",
    "Finance Manager",
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
  ],
  registerApplicant: [
    "Admin",
    "Registrar",
  ],
  generateCv: [
    "Admin",
    "Registrar",
    "CV",
  ],
  manageClearances: [
    "Admin",
    "Clearance Officer",
    "Saudi LMIS",
    "Saudi Taeshir",
    "Saudi Embassy",
    "Kuwait LMIS",
    "Kuwait Telesign",
    "Kuwait Embassy",
  ],
  viewFinance: [
    "Admin",
    "Finance Manager",
  ],
  manageCommission: [
    "Admin",
    "Finance Manager",
  ],
  manageComplaints: [
    "Admin",
    "Complaint Manager",
  ],
  viewReports: [
    "Admin",
    "Finance Manager",
    "Manager",
  ],
  manageContractors: [
    "Admin",
  ],
  accessAgentPortal: [
    "Foreign Agency",
    "Admin",
  ],
  manageCommunication: [
    "Communication Manager",
    "Admin",
    "Registrar",
    "Clearance Officer",
    "Ticketer",
    "Complaint Manager",
    "Finance Manager",
    "Contract Parser",
    "Saudi LMIS",
    "Saudi Taeshir",
    "Saudi Embassy",
    "Kuwait LMIS",
    "Kuwait Telesign",
    "Kuwait Embassy",
    "Foreign Agency",
  ],
  manageTicketing: [
    "Ticketer",
    "Admin",
  ],
  // Step-Specific Capabilities (mapped to 6 country+step roles)
  editLms: [
    "Admin",
    "Clearance Officer",
    "Saudi LMIS",
    "Kuwait LMIS",
  ],
  editInjaz: [
    "Admin",
    "Clearance Officer",
    "Saudi Taeshir",
  ],
  editWakala: [
    "Admin",
    "Clearance Officer",
    "Saudi Embassy",
  ],
  createStamp: [
    "Admin",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  createTicket: [
    "Admin",
    "Ticketer",
  ],
  createDeparture: [
    "Admin",
    "Ticketer",
  ],
  editEmbassy: [
    "Admin",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  editTelesign: [
    "Admin",
    "Clearance Officer",
    "Kuwait Telesign",
  ],
};

/**
 * Evaluates whether the user's assigned roles allow a specific UI action or section.
 * Backend permissions remain the ultimate security authority.
 */
export function can(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return true;
  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return false;
  return hasAnyRole(user, allowedRoles);
}

export const hasPermission = can;

/**
 * Maps frontend routes to required PermissionActions for route-level guarding.
 * Routes not listed here are accessible to all authenticated users.
 */
export const ROUTE_PERMISSION_MAP: Record<string, PermissionAction> = {
  "/dashboard": "viewDashboard",
  "/applicants": "viewApplicants",
  "/applicants/new": "registerApplicant",
  "/chat": "manageCommunication",
  "/employees": "manageUsers",
  "/contractors": "manageContractors",
  "/commission": "manageCommission",
  "/complaints": "manageComplaints",
  "/reports": "viewReports",
  "/expenses-income": "viewFinance",
};

/**
 * Role display names normalized for UI — backend role names like
 * "System Manager", "Administrator" are mapped to a cleaner label.
 */
const ROLE_DISPLAY_OVERRIDES: Record<string, string> = {
  "system manager": "Admin",
  "administrator": "Admin",
  "manager": "Admin",
};

/**
 * Normalizes a backend role string to its user-facing display label.
 * "System Manager", "Administrator", "Manager" all map to "Admin".
 * Other roles pass through unchanged.
 */
export function normalizeRoleDisplay(role: string): string {
  const key = role.trim().toLowerCase();
  return ROLE_DISPLAY_OVERRIDES[key] || role;
}

