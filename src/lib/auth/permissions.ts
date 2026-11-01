import { AuthUser } from "@/lib/api/auth";

export type PermissionAction =
  | "manageUsers"
  | "viewDashboard"
  | "viewApplicants"
  | "registerApplicant"
  | "generateCv"
  | "manageClearances"
  | "viewClearances"
  | "viewFinance"
  | "manageFinance"
  | "viewCommission"
  | "manageCommission"
  | "viewComplaints"
  | "manageComplaints"
  | "viewReports"
  | "viewAdminReports"
  | "manageContractors"
  | "manageSelectionRequests"
  | "accessAgentPortal"
  | "manageCommunication"
  | "viewTicketing"
  | "manageTicketing"
  | "manageMedical"
  | "editLms"
  | "editInjaz"
  | "editWakala"
  | "createStamp"
  | "createTicket"
  | "createDeparture"
  | "editEmbassy"
  | "editTelesign";

export const V2_CANONICAL_ROLES = [
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

export type V2Role = (typeof V2_CANONICAL_ROLES)[number];

/**
 * Normalizes any role representation (string, { role: string }, { name: string }) to a clean lowercase string.
 * Strips "(view)" suffix to resolve the base canonical role name.
 */
export function extractRoleName(r: unknown): string {
  if (typeof r === "string") {
    let s = r.trim().toLowerCase();
    if (s.endsWith(" (view)")) {
      s = s.replace(" (view)", "").trim();
    }
    return s;
  }
  if (r && typeof r === "object") {
    const roleObj = r as Record<string, unknown>;
    if (typeof roleObj.role === "string") {
      let s = roleObj.role.trim().toLowerCase();
      if (s.endsWith(" (view)")) s = s.replace(" (view)", "").trim();
      return s;
    }
    if (typeof roleObj.name === "string") {
      let s = roleObj.name.trim().toLowerCase();
      if (s.endsWith(" (view)")) s = s.replace(" (view)", "").trim();
      return s;
    }
  }
  return "";
}

/**
 * Checks if the user has a specific role (exact match, case-insensitive, trimmed).
 * System Manager / Administrator always passes internal staff role checks.
 * Note: Foreign Agency is an external partner identity that cannot be spoofed by administrative role expansion.
 */
export function hasRole(user: AuthUser | null | undefined, targetRole: string): boolean {
  if (!user) return false;
  const normalizedTarget = targetRole.trim().toLowerCase().replace(" (view)", "");
  if (!Array.isArray(user.roles)) return false;

  // Foreign Agency is strictly an external contractor identity
  if (normalizedTarget === "foreign agency") {
    return hasExactRole(user, "Foreign Agency");
  }

  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  if (emailOrName === "administrator") return true;

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
 * Set of mutation actions that alter server state and require write capability.
 * A role held as read-only cannot execute any mutation action.
 */
export const MUTATION_ACTIONS = new Set<PermissionAction>([
  "manageUsers",
  "registerApplicant",
  "generateCv",
  "manageClearances",
  "manageFinance",
  "manageCommission",
  "manageComplaints",
  "manageContractors",
  "manageSelectionRequests",
  "manageTicketing",
  "manageMedical",
  "editLms",
  "editInjaz",
  "editWakala",
  "createStamp",
  "createTicket",
  "createDeparture",
  "editEmbassy",
  "editTelesign",
]);

/**
 * Maps standard application capabilities to the authoritative backend roles.
 */
const ACTION_ROLE_MAP: Record<PermissionAction, string[]> = {
  manageUsers: [
    "Admin",
  ],
  viewDashboard: [
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
    "CV",
    "Medical Officer",
  ],
  viewApplicants: [
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
    "CV",
    "Medical Officer",
  ],
  registerApplicant: [
    "Admin",
    "Manager",
    "Registrar",
  ],
  generateCv: [
    "Admin",
    "Manager",
    "Registrar",
    "CV",
  ],
  viewClearances: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Ticketer",
    "Saudi LMIS",
    "Saudi Taeshir",
    "Saudi Embassy",
    "Kuwait LMIS",
    "Kuwait Telesign",
    "Kuwait Embassy",
  ],
  manageClearances: [
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
    "Admin",
    "Finance Manager",
  ],
  manageFinance: [
    "Admin",
    "Finance Manager",
  ],
  viewCommission: [
    "Admin",
    "Finance Manager",
  ],
  manageCommission: [
    "Admin",
    "Finance Manager",
  ],
  viewComplaints: [
    "Admin",
    "Manager",
    "Complaint Manager",
  ],
  manageComplaints: [
    "Admin",
    "Manager",
    "Complaint Manager",
  ],
  viewReports: [
    "Admin",
    "Manager",
    "Finance Manager",
  ],
  viewAdminReports: [
    "Admin",
  ],
  manageContractors: [
    "Admin",
  ],
  manageSelectionRequests: [
    "Admin",
    "Manager",
    "Registrar",
  ],
  accessAgentPortal: [
    "Foreign Agency",
    "Admin",
  ],
  manageCommunication: [
    "Admin",
    "Manager",
    "Communication Manager",
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
    "CV",
    "Medical Officer",
  ],
  viewTicketing: [
    "Admin",
    "Manager",
    "Ticketer",
  ],
  manageTicketing: [
    "Admin",
    "Manager",
    "Ticketer",
  ],
  manageMedical: [
    "Admin",
    "Manager",
    "Medical Officer",
    "Contract Parser",
    "Ticketer",
  ],
  // Step-Specific Capabilities (mapped to 6 country+step roles)
  editLms: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi LMIS",
    "Kuwait LMIS",
  ],
  editInjaz: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Taeshir",
  ],
  editWakala: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
  ],
  createStamp: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  createTicket: [
    "Admin",
    "Manager",
    "Ticketer",
  ],
  createDeparture: [
    "Admin",
    "Manager",
    "Ticketer",
  ],
  editEmbassy: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Saudi Embassy",
    "Kuwait Embassy",
  ],
  editTelesign: [
    "Admin",
    "Manager",
    "Clearance Officer",
    "Kuwait Telesign",
  ],
};

/**
 * Evaluates whether the user's assigned roles allow a specific UI action or section.
 * Backend permissions remain the ultimate security authority.
 *
 * Rules:
 * 1. Unauthenticated or null user -> false (Fail-closed).
 * 2. Administrator / System Manager / Admin -> true (except foreign agency portal requires Foreign Agency or explicit Admin).
 * 3. Mutation actions require that the user has at least one role in allowedRoles that is NOT in read_only_roles.
 * 4. View actions are granted if the user holds any allowed role (whether read-only or read-write).
 */
export function can(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return false;
  const emailOrName = (user.email || user.full_name || "").toLowerCase().trim();
  const isAdmin =
    emailOrName === "administrator" ||
    isAdminUser(user);

  // Administrative users hold universal permissions across internal actions
  if (isAdmin) {
    return true;
  }

  const allowedRoles = ACTION_ROLE_MAP[action];
  if (!allowedRoles) return false;

  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  const readOnlySet = new Set(
    (Array.isArray(user.read_only_roles) ? user.read_only_roles : []).map((r) =>
      r.toLowerCase().trim()
    )
  );

  // Also check if any role string in userRoles carries the "(View)" suffix
  userRoles.forEach((r) => {
    const s = String(r).toLowerCase().trim();
    if (s.endsWith(" (view)")) {
      readOnlySet.add(s.replace(" (view)", "").trim());
    }
  });

  const isMutation = MUTATION_ACTIONS.has(action);

  return allowedRoles.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    // Check if user has this role
    const hasThisRole = userRoles.some((r) => {
      const norm = extractRoleName(r);
      return norm === normAllowed;
    });

    if (!hasThisRole) return false;

    // If it's a mutation, this matching role must NOT be read-only
    if (isMutation) {
      if (readOnlySet.has(normAllowed)) {
        return false;
      }
    }

    return true;
  });
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
  "/selection-requests": "manageSelectionRequests",
  "/chat": "manageCommunication",
  "/employees": "manageUsers",
  "/contractors": "manageContractors",
  "/commission": "viewCommission",
  "/complaints": "viewComplaints",
  "/reports": "viewReports",
  "/expenses-income": "viewFinance",
  "/agent": "accessAgentPortal",
};

/**
 * Role display names normalized for UI — backend role names like
 * "System Manager", "Administrator" are mapped to a cleaner label.
 */
const ROLE_DISPLAY_OVERRIDES: Record<string, string> = {
  "system manager": "Admin",
  "administrator": "Admin",
};

/**
 * Normalizes a backend role string to its user-facing display label.
 * "System Manager" and "Administrator" map to "Admin".
 * Other roles pass through unchanged.
 */
export function normalizeRoleDisplay(role: string): string {
  const key = role.trim().toLowerCase();
  return ROLE_DISPLAY_OVERRIDES[key] || role;
}

/**
 * Checks if a specific role is assigned in read-only mode for a user.
 */
export function isRoleReadOnly(role: string, user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const usernameLower = (user.email || "").toLowerCase().trim();
  if (usernameLower === "administrator") return false;

  const normRoles = (user.roles || []).map((r) => String(r).trim().toLowerCase());
  if (normRoles.some((r) => r === "admin" || r === "system manager" || r === "administrator")) {
    return false;
  }

  const targetLower = role.trim().toLowerCase().replace(/\s*\(view\)$/i, "");
  if (targetLower === "admin" || targetLower === "system manager" || targetLower === "administrator") {
    return false;
  }

  const roSet = new Set((user.read_only_roles || []).map((r) => String(r).trim().toLowerCase()));
  if (roSet.has(targetLower)) return true;

  return normRoles.some((r) => r === `${targetLower} (view)`);
}

