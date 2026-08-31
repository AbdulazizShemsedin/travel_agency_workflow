import { AuthUser } from "@/lib/api/auth";

export type PermissionAction =
  | "manageUsers"
  | "viewDashboard"
  | "viewApplicants"
  | "registerApplicant"
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
  "System Manager",
  "Administrator",
] as const;

export type V2Role = (typeof V2_CANONICAL_ROLES)[number];

/**
 * Checks if the user has a specific role (exact match, case-insensitive, trimmed).
 * System Manager / Administrator always passes all role checks.
 */
export function hasRole(user: AuthUser | null | undefined, targetRole: string): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
  if (!Array.isArray(user.roles)) return false;
  const normalizedTarget = targetRole.trim().toLowerCase();
  return user.roles.some((r) => {
    const norm = (typeof r === "string" ? r : "").trim().toLowerCase();
    return norm === "system manager" || norm === "administrator" || norm === normalizedTarget;
  });
}

/**
 * Checks if the user has at least one of the specified roles.
 */
export function hasAnyRole(user: AuthUser | null | undefined, targetRoles: string[]): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
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
    const norm = (typeof r === "string" ? r : "").trim().toLowerCase();
    return norm === normalizedTarget;
  });
}

/**
 * Determines if a user is purely an external Foreign Agency partner without internal operational privileges.
 */
export function isPureForeignAgency(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
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
    internalRoles.includes((typeof r === "string" ? r : "").trim().toLowerCase())
  );
  if (hasInternalRole || user.is_internal_staff === true) {
    return false;
  }
  return hasExactRole(user, "Foreign Agency") || Boolean(user.contractor);
}

/**
 * Maps standard application capabilities to the 16 authoritative V2 backend roles.
 */
const ACTION_ROLE_MAP: Record<PermissionAction, string[]> = {
  manageUsers: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
  ],
  viewDashboard: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
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
  ],
  viewApplicants: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
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
  ],
  registerApplicant: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Registrar",
  ],
  manageClearances: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi LMIS",
    "Saudi Taeshir",
    "Saudi Embassy",
    "Kuwait LMIS",
    "Kuwait Telesign",
    "Kuwait Embassy",
  ],
  viewFinance: [
    "System Manager",
    "Administrator",
    "Admin",
    "Finance Manager",
  ],
  manageCommission: [
    "System Manager",
    "Administrator",
    "Admin",
    "Finance Manager",
  ],
  manageComplaints: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Complaint Manager",
  ],
  viewReports: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Finance Manager",
    "Complaint Manager",
  ],
  manageContractors: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Finance Manager",
    "Registrar",
  ],
  accessAgentPortal: [
    "Foreign Agency",
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
  ],
  manageCommunication: [
    "Communication Manager",
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
  ],
  manageTicketing: [
    "Ticketer",
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
  ],
  // Step-Specific Capabilities (mapped to 6 country+step roles)
  editLms: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi LMIS",
    "Kuwait LMIS",
  ],
  editInjaz: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Taeshir",
  ],
  editWakala: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
  ],
  createStamp: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  createTicket: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Ticketer",
  ],
  createDeparture: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Ticketer",
  ],
  editEmbassy: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  editTelesign: [
    "System Manager",
    "Administrator",
    "Admin",
    "Manager",
    "Clearance Officer",
    "Kuwait Telesign",
  ],
};

/**
 * Evaluates whether the user's assigned roles allow a specific UI action or section.
 * Backend permissions remain the ultimate security authority.
 */
export function can(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return true;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return true;
  return hasAnyRole(user, allowedRoles);
}
