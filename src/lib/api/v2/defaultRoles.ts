/**
 * V2 Corridor Default Role Assignments & Auto-Assignment Engine
 * 
 * Supports Saudi Corridor specialists, Kuwait Corridor specialists,
 * and shared operational roles with configurable default assignees.
 */

import { V2EmployeeRecord } from "./employees";
import { assignClearanceStepV2, V2ClearanceStepItem } from "./clearance";

export interface RoleAssignmentConfig {
  roleName: string;
  category: "Saudi Corridor" | "Kuwait Corridor" | "Operations & Registry";
  label: string;
  description: string;
  defaultStepName?: string;
}

export const CORRIDOR_ROLE_DEFINITIONS: RoleAssignmentConfig[] = [
  // 1. Saudi Corridor Specialists
  {
    roleName: "Saudi LMIS",
    category: "Saudi Corridor",
    label: "Saudi LMIS Specialist",
    description: "Handles Saudi Ministry of Labor clearance, COC test tracking, and labor approval.",
    defaultStepName: "Saudi LMIS",
  },
  {
    roleName: "Saudi Taeshir",
    category: "Saudi Corridor",
    label: "Saudi Taeshir / Biometrics Specialist",
    description: "Coordinates VFS / Taeshir biometric appointments, MOFA Injaz fees, and visa slip references.",
    defaultStepName: "Saudi Taeshir",
  },
  {
    roleName: "Saudi Embassy",
    category: "Saudi Corridor",
    label: "Saudi Embassy & Stamping Specialist",
    description: "Manages consular submissions on Mondays and visa stamping outcomes on Thursdays.",
    defaultStepName: "Saudi Embassy",
  },

  // 2. Kuwait Corridor Specialists
  {
    roleName: "Kuwait LMIS",
    category: "Kuwait Corridor",
    label: "Kuwait LMIS Specialist",
    description: "Handles Kuwait Ministry work permit processing and labor clearance approvals.",
    defaultStepName: "Kuwait LMIS",
  },
  {
    roleName: "Kuwait Telesign",
    category: "Kuwait Corridor",
    label: "Kuwait Telesign Specialist",
    description: "Manages Kuwait Telesign biometric authentication and documentation references.",
    defaultStepName: "Kuwait Telesign",
  },
  {
    roleName: "Kuwait Embassy",
    category: "Kuwait Corridor",
    label: "Kuwait Embassy & Stamping Specialist",
    description: "Manages Kuwait consular submissions, document attestations, and stamping verification.",
    defaultStepName: "Kuwait Embassy",
  },

  // 3. Operations & Registry Staff
  {
    roleName: "Registrar",
    category: "Operations & Registry",
    label: "Candidate Intake Registrar",
    description: "Conducts applicant bio data entry, passport verification, and initial dossier registration.",
  },
  {
    roleName: "Contract Parser",
    category: "Operations & Registry",
    label: "Contract & Visa Processor",
    description: "Extracts and verifies bilateral digital employment contracts, sponsor details, and visas.",
  },
  {
    roleName: "Ticketer",
    category: "Operations & Registry",
    label: "Ticketing & Departure Coordinator",
    description: "Arranges flight bookings, final pre-departure Medical 2 check, and airport dispatch.",
    defaultStepName: "Departure / Ticket",
  },
  {
    roleName: "Clearance Officer",
    category: "Operations & Registry",
    label: "Cross-Corridor Clearance Officer",
    description: "General clearance officer assigned to multi-stage pipeline tasks and dossier handling.",
  },
  {
    roleName: "Finance Manager",
    category: "Operations & Registry",
    label: "Finance & Accounts Manager",
    description: "Reviews income/expense queues, approves candidate fees, and processes commission settlements.",
  },
  {
    roleName: "Complaint Manager",
    category: "Operations & Registry",
    label: "Grievance & Welfare Officer",
    description: "Receives candidate and agency disputes, coordinates returns, and manages country bans.",
  },
  {
    roleName: "Communication Manager",
    category: "Operations & Registry",
    label: "Agency Communications Liaison",
    description: "Supervises staff-to-partner agency communication threads and foreign contractor inquiries.",
  },
  {
    roleName: "Manager",
    category: "Operations & Registry",
    label: "Operations Team Lead",
    description: "Oversees general clearance progress, handles workflow overrides, and inspects daily reports.",
  },
  {
    roleName: "Admin",
    category: "Operations & Registry",
    label: "Agency Administrator",
    description: "Executive agency administrator overseeing candidate pipelines and operational compliance.",
  },
  {
    roleName: "System Manager",
    category: "Operations & Registry",
    label: "System & User Manager",
    description: "Configures staff roles, user accounts, and system-wide operational parameters.",
  },
  {
    roleName: "Administrator",
    category: "Operations & Registry",
    label: "Root Administrator",
    description: "Root system administrator with complete override and administrative authority.",
  },
];

const STORAGE_KEY = "agency_default_role_assignees_v2";

/**
 * Loads configured default assignees from localStorage.
 */
export function getSavedDefaultRoleAssignments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Saves configured default assignees to localStorage.
 */
export function saveDefaultRoleAssignments(assignments: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch (err) {
    console.warn("Unable to save default role assignments to localStorage", err);
  }
}

/**
 * Resolves the default employee for a specific role.
 * 1. Checks explicitly saved assignments.
 * 2. Falls back to the first active employee registered with that role.
 */
export function resolveDefaultEmployeeForRole(
  roleName: string,
  employees: V2EmployeeRecord[],
  savedConfig?: Record<string, string>
): V2EmployeeRecord | null {
  const config = savedConfig || getSavedDefaultRoleAssignments();
  const explicitEmail = config[roleName];

  if (explicitEmail) {
    const found = employees.find(
      (e) => (e.email || e.name || "").toLowerCase() === explicitEmail.toLowerCase() && e.enabled
    );
    if (found) return found;
  }

  // Smart fallback: Find the first active employee holding this exact role
  const match = employees.find((e) => {
    if (!e.enabled) return false;
    const userRoles = Array.isArray(e.roles) ? e.roles : [];
    return userRoles.some(
      (r) => r.toLowerCase().trim() === roleName.toLowerCase().trim()
    );
  });

  return match || null;
}

/**
 * Maps a clearance step to its designated canonical role based on destination country.
 */
export function mapStepToRole(stepType: string, destinationCountry?: string): string {
  const normStep = (stepType || "").toLowerCase().trim();
  const country = (destinationCountry || "").toLowerCase().trim();
  const isKuwait = country === "kuwait";

  // LMIS Step
  if (normStep.includes("lmis") || normStep.includes("lms") || normStep.includes("ministry")) {
    return isKuwait ? "Kuwait LMIS" : "Saudi LMIS";
  }

  // Taeshir / Biometrics / Injaz / Telesign Step
  if (
    normStep.includes("taeshir") ||
    normStep.includes("teshir") ||
    normStep.includes("te'shir") ||
    normStep.includes("injaz") ||
    normStep.includes("biometric") ||
    normStep.includes("telesign")
  ) {
    return isKuwait ? "Kuwait Telesign" : "Saudi Taeshir";
  }

  // Embassy / Stamping Step
  if (normStep.includes("embassy") || normStep.includes("stamping") || normStep.includes("visa stamp")) {
    return isKuwait ? "Kuwait Embassy" : "Saudi Embassy";
  }

  // Ticketing & Flight
  if (normStep.includes("ticket") || normStep.includes("flight") || normStep.includes("departure")) {
    return "Ticketer";
  }

  return isKuwait ? "Kuwait LMIS" : "Saudi LMIS";
}

/**
 * Automatically assigns all corridor steps of an active placement to their default staff.
 */
export async function autoAssignPlacementCorridorSteps(
  placementName: string,
  destinationCountry: string,
  clearanceSteps: V2ClearanceStepItem[],
  employees: V2EmployeeRecord[]
): Promise<{ assignedCount: number; errors: string[] }> {
  const stepsForPlacement = clearanceSteps.filter(
    (s) => s.placement === placementName || s.placement_name === placementName
  );

  if (stepsForPlacement.length === 0) {
    return { assignedCount: 0, errors: ["No clearance steps found for this placement."] };
  }

  const savedConfig = getSavedDefaultRoleAssignments();
  let assignedCount = 0;
  const errors: string[] = [];

  for (const step of stepsForPlacement) {
    const roleName = mapStepToRole(step.step_type || step.name, destinationCountry);
    const assignedEmp = resolveDefaultEmployeeForRole(roleName, employees, savedConfig);

    if (!assignedEmp?.name) {
      errors.push(`No active employee found for role "${roleName}" (Step: ${step.step_type || step.name}).`);
      continue;
    }

    try {
      await assignClearanceStepV2(step.name, assignedEmp.name);
      assignedCount++;
    } catch (err: any) {
      errors.push(`Failed to assign ${step.name} to ${assignedEmp.full_name || assignedEmp.name}: ${err.message}`);
    }
  }

  return { assignedCount, errors };
}
