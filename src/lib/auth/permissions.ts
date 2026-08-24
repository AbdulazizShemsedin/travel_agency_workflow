import { AuthUser } from "@/lib/api/auth";

export type PermissionAction =
  | "manageUsers"
  | "viewDashboard"
  | "viewApplicants"
  | "registerApplicant"
  | "manageClearances"
  | "viewFinance"
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
  if (!user || !Array.isArray(user.roles)) return false;
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
  if (!user || !Array.isArray(user.roles)) return false;
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
  manageUsers: ["System Manager"],
  viewDashboard: [
    "System Manager",
    "LMS Employee",
    "Accounts Manager",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
    "Foreign Agency",
  ],
  viewApplicants: [
    "System Manager",
    "LMS Employee",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
  ],
  registerApplicant: [
    "System Manager",
    "LMS Employee",
  ],
  manageClearances: [
    "System Manager",
    "LMS Employee",
    "Injaz Officer",
    "Wakala Officer",
    "Embassy Officer",
  ],
  viewFinance: [
    "System Manager",
    "Accounts Manager",
  ],
  manageComplaints: [
    "System Manager",
    "Foreign Agency",
    "LMS Employee",
  ],
  viewReports: [
    "System Manager",
    "Accounts Manager",
    "LMS Employee",
  ],
  manageContractors: [
    "System Manager",
  ],
  accessAgentPortal: [
    "Foreign Agency",
    "System Manager",
  ],
  // Phase 6 Processing Stream Capabilities
  editLms: [
    "System Manager",
    "LMS Employee",
  ],
  editInjaz: [
    "System Manager",
    "Injaz Officer",
  ],
  editWakala: [
    "System Manager",
    "Wakala Officer",
  ],
  createStamp: [
    "System Manager",
    "Embassy Officer",
  ],
  createTicket: [
    "System Manager",
    "LMS Employee",
  ],
  createDeparture: [
    "System Manager",
    "LMS Employee",
  ],
  editEmbassy: [
    "System Manager",
    "Embassy Officer",
  ],
  editTelesign: [
    "System Manager",
    "LMS Employee",
  ],
};

/**
 * Evaluates whether the user's assigned roles allow a specific UI action or section.
 * Backend permissions remain the ultimate security authority.
 */
export function can(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return false;
  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return false;
  return hasAnyRole(user, allowedRoles);
}
