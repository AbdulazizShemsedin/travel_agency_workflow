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
  | "editLms"
  | "editInjaz"
  | "editWakala"
  | "createStamp"
  | "createTicket"
  | "createDeparture"
  | "editEmbassy"
  | "editTelesign";

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
    "agency admin",
    "lms employee",
    "clearance officer",
    "wakala officer",
    "injaz officer",
    "embassy officer",
    "accounts manager",
    "accounts officer",
    "recruiter",
    "intake officer",
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
 * Maps standard application capabilities to the authoritative backend roles.
 * Canonical backend roles:
 * - System Manager
 * - LMS Employee
 * - Accounts Manager
 * - Foreign Agency
 * - Wakala Officer
 * - Injaz Officer
 * - Embassy Officer
 */
const ACTION_ROLE_MAP: Record<PermissionAction, string[]> = {
  manageUsers: ["System Manager", "Agency Admin", "Administrator"],
  viewDashboard: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Recruiter",
    "Clearance Officer",
    "Accounts Officer",
    "Applicant Viewer",
    "LMS Employee",
    "Accounts Manager",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
    "Foreign Agency",
  ],
  viewApplicants: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Recruiter",
    "Clearance Officer",
    "Accounts Officer",
    "Applicant Viewer",
    "LMS Employee",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
  ],
  registerApplicant: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Recruiter",
    "LMS Employee",
  ],
  manageClearances: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "LMS Employee",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
  ],
  viewFinance: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Accounts Officer",
    "Accounts Manager",
  ],
  manageCommission: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Accounts Officer",
    "Accounts Manager",
    "LMS Employee",
  ],
  manageComplaints: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Foreign Agency",
    "LMS Employee",
  ],
  viewReports: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Accounts Officer",
    "Clearance Officer",
    "Accounts Manager",
    "LMS Employee",
  ],
  manageContractors: [
    "System Manager",
    "Agency Admin",
    "Administrator",
  ],
  accessAgentPortal: [
    "Foreign Agency",
    "System Manager",
    "Agency Admin",
    "Administrator",
  ],
  // Processing Stream Capabilities
  editLms: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "LMS Employee",
  ],
  editInjaz: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "Injaz Officer",
  ],
  editWakala: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "Wakala Officer",
  ],
  createStamp: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "Embassy Officer",
  ],
  createTicket: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "LMS Employee",
  ],
  createDeparture: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "LMS Employee",
  ],
  editEmbassy: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "Embassy Officer",
  ],
  editTelesign: [
    "System Manager",
    "Agency Admin",
    "Administrator",
    "Clearance Officer",
    "LMS Employee",
  ],
};

/**
 * Evaluates whether the user's assigned roles allow a specific UI action or section.
 * Backend permissions remain the ultimate security authority.
 */
export function can(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return true; // Default allow for authenticated internal workflow
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return true;
  return hasAnyRole(user, allowedRoles);
}
