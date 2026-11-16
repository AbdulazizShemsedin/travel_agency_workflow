/**
 * Employee & Staff Administration API Layer (V2)
 *
 * Provides authoritative staff management using native Frappe client RPCs:
 * - frappe.client.get_list
 * - frappe.client.get
 * - frappe.client.insert
 * - frappe.client.save
 * - frappe.client.set_value
 * - frappe.client.delete
 */

import { requestV2 } from "./client";

export interface V2EmployeeRecord {
  name: string; // Frappe User name (email address)
  email: string;
  full_name: string;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  mobile_no?: string | null;
  enabled: number; // 1 = Active, 0 = Inactive
  user_type: string;
  creation: string;
  roles: string[];
  read_only_roles?: string[];
}

export interface CreateEmployeePayload {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  password?: string;
  roles: string[];
  send_welcome_email?: boolean;
}

export interface UpdateEmployeeRolesPayload {
  email: string;
  roles: string[];
}

export interface UpdateEmployeeInfoPayload {
  email: string;
  new_email?: string;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  mobile_no?: string | null;
}

export interface ResetEmployeePasswordPayload {
  email: string;
  new_password: string;
}

/**
 * Fast, role-gated employee roster for internal staff.
 * Authoritative Backend Endpoint: employee_api.list_employee_roster (New 2026-09-11)
 * Accessible to any member of INTERNAL_STAFF_ROLES for staff assignment pickers,
 * chat participant dropdowns, staff directories, and clearance officer assignments.
 */
function normalizeAndDeduplicateRoles(rawRoles: unknown[]): string[] {
  if (!Array.isArray(rawRoles)) return [];
  const set = new Set<string>();
  for (const item of rawRoles) {
    const r = typeof item === "string" ? item : (item as any)?.role;
    if (typeof r === "string" && r.trim()) {
      const lower = r.trim().toLowerCase();
      if (lower === "administrator" || lower === "system manager") {
        set.add("Admin");
      } else {
        set.add(r.trim());
      }
    }
  }
  return Array.from(set);
}

export async function listEmployeeRosterV2(): Promise<V2EmployeeRecord[]> {
  const res = await requestV2<{ message?: any[] } | any[]>(
    "/api/method/agency_tracking.api.employee.read?op=list_employee_roster",
    { method: "POST" }
  );
  const list = Array.isArray(res) ? res : Array.isArray((res as any)?.message) ? (res as any).message : [];
  return list.map((u: any) => ({
    name: u.name || u.email,
    email: u.email || u.name,
    full_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
    first_name: u.first_name || "",
    last_name: u.last_name || null,
    phone: u.phone || null,
    mobile_no: u.mobile_no || null,
    enabled: typeof u.enabled === "number" ? u.enabled : u.enabled ? 1 : 0,
    user_type: "System User",
    creation: u.creation || "",
    roles: normalizeAndDeduplicateRoles(u.roles),
    read_only_roles: Array.isArray(u.read_only_roles) ? u.read_only_roles : [],
  }));
}

/**
 * Lists all active and inactive system staff accounts with assigned security roles.
 * Backed by authoritative role-gated agency_tracking.employee_api.list_employee_roster.
 */
export async function listEmployeesV2(): Promise<V2EmployeeRecord[]> {
  return listEmployeeRosterV2();
}

/**
 * Creates a new system employee account with specified credentials and multi-role assignments.
 * Backed by authoritative agency_tracking.employee_api.create_employee.
 */
export async function createEmployeeV2(payload: CreateEmployeePayload): Promise<V2EmployeeRecord> {
  const created = await createEmployeeApiV2({
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone,
    password: payload.password,
    roles: payload.roles,
    send_welcome_email: payload.send_welcome_email,
  });

  const email = payload.email.trim().toLowerCase();
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name?.trim() || "";
  const phone = payload.phone?.trim() || "";

  return {
    name: created.name || email,
    email: created.email || email,
    full_name: created.full_name || `${firstName} ${lastName}`.trim(),
    first_name: created.first_name || firstName,
    last_name: created.last_name || (lastName ? lastName : null),
    phone: created.phone || (phone ? phone : null),
    mobile_no: created.mobile_no || (phone ? phone : null),
    enabled: typeof created.enabled === "number" ? created.enabled : created.enabled ? 1 : 0,
    user_type: created.user_type || "System User",
    creation: created.creation || new Date().toISOString(),
    roles: Array.isArray(created.roles) ? created.roles : payload.roles,
  };
}


/**
 * Updates assigned security roles for an existing employee.
 * Uses agency_tracking.employee_api.update_employee_roles which enforces backend admin-lockout guards.
 */
export async function updateEmployeeRolesV2(
  userEmail: string,
  newRoles: string[]
): Promise<string[]> {
  return updateEmployeeRolesApiV2(userEmail, newRoles);
}

function resolveFrappeUserDocName(userIdentifier: string): string {
  const trimmed = (userIdentifier || "").trim();
  const lower = trimmed.toLowerCase();
  if (lower === "admin@example.com" || lower === "administrator") {
    return "Administrator";
  }
  return trimmed;
}

/**
 * Retrieves the recorded password for a user from their User profile if available.
 * Note: Go backend has no bio field and never stores a readable password. Always returns null.
 */
export async function getUserPasswordV2(_userEmail: string): Promise<string | null> {
  return null;
}

/**
 * Saves/records the plain password into the User profile.
 * Note: Go backend has no bio field and never stores a readable password. No-op.
 */
export async function saveUserPasswordRecordV2(_userEmail: string, _password: string): Promise<void> {
  // No-op per Go backend specification
}

/**
 * Resets employee login password.
 * Uses authoritative agency_tracking.api.employee.write?op=reset_employee_password.
 */
export async function resetEmployeePasswordV2(
  userEmail: string,
  newPassword: string
): Promise<void> {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  await resetEmployeePasswordApiV2(normalizedEmail, newPassword);
}

/**
 * Activates or deactivates an employee account.
 * Uses agency_tracking.employee_api.toggle_employee_status which enforces backend admin-lockout guards.
 */
export async function toggleEmployeeStatusV2(
  userEmail: string,
  enabled: boolean
): Promise<void> {
  await toggleEmployeeStatusApiV2(userEmail, enabled);
}

/**
 * Permanently removes or deactivates an employee account.
 * Uses agency_tracking.employee_api.delete_employee.
 */
export async function deleteEmployeeV2(userEmail: string): Promise<DeleteEmployeeResult> {
  return deleteEmployeeApiV2(userEmail);
}

/**
 * Updates an employee's personal profile information (email, name, phone) via authoritative update_employee_info RPC.
 * Go backend: POST /api/method/agency_tracking.api.employee.write?op=update_employee_info
 */
export async function updateEmployeeInfoV2(
  payload: UpdateEmployeeInfoPayload
): Promise<{ email: string; first_name?: string; last_name?: string; full_name?: string; phone?: string; mobile_no?: string }> {
  const body: Record<string, any> = {
    email: payload.email.trim().toLowerCase(),
    first_name: payload.first_name.trim(),
  };
  if (payload.new_email) {
    body.new_email = payload.new_email.trim().toLowerCase();
  }
  if (payload.last_name !== undefined) {
    body.last_name = payload.last_name != null ? payload.last_name.trim() : "";
  }
  if (payload.phone !== undefined) {
    body.phone = payload.phone != null ? payload.phone.trim() : "";
  }
  if (payload.mobile_no !== undefined) {
    body.mobile_no = payload.mobile_no != null ? payload.mobile_no.trim() : "";
  }

  const res = await requestV2<any>(
    "/api/method/agency_tracking.api.employee.write?op=update_employee_info",
    {
      method: "POST",
      body,
    }
  );

  const finalEmail = body.new_email || body.email;
  return {
    email: res?.email || finalEmail,
    first_name: res?.first_name || body.first_name,
    last_name: res?.last_name || body.last_name,
    full_name: res?.full_name,
    phone: res?.phone || body.phone,
    mobile_no: res?.mobile_no || body.mobile_no,
  };
}

/**
 * ---- employee_api (dedicated staff-admin RPC layer, commit 62a9a19) ----
 * These endpoints are gated to Admin/Manager/System Manager/Administrator
 * (`_check_staff_admin_perm`). Their `roles` output is filtered to this app's
 * own roles and collapses any admin/System Manager role to `["Admin"]`.
 */

export interface EmployeeApiRecord {
  name: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name?: string | null;
  enabled: boolean | number;
  user_type: string;
  creation: string;
  phone?: string | null;
  mobile_no?: string | null;
  roles: string[];
}

/**
 * Lists all staff/admin user accounts via employee_api.list_employees.
 */
export async function listEmployeesApiV2(): Promise<EmployeeApiRecord[]> {
  const result = await requestV2<EmployeeApiRecord[] | { employees?: EmployeeApiRecord[] }>(
    "/api/method/agency_tracking.api.employee.read?op=list_employees",
    { method: "POST" }
  );
  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).employees)) return (result as any).employees;
  return [];
}

/**
 * Creates a staff/admin User via employee_api.create_employee.
 */
export async function createEmployeeApiV2(payload: {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  password?: string;
  roles: string[];
  send_welcome_email?: boolean;
}): Promise<EmployeeApiRecord> {
  const result = await requestV2<EmployeeApiRecord>(
    "/api/method/agency_tracking.api.employee.write?op=create_employee",
    {
      method: "POST",
      body: {
        email: payload.email.trim().toLowerCase(),
        first_name: payload.first_name.trim(),
        ...(payload.last_name?.trim() ? { last_name: payload.last_name.trim() } : {}),
        ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
        ...(payload.password?.trim() ? { password: payload.password.trim() } : {}),
        roles: payload.roles,
        send_welcome_email: payload.send_welcome_email ?? false,
      },
    }
  );
  if (payload.password?.trim()) {
    await saveUserPasswordRecordV2(payload.email.trim().toLowerCase(), payload.password.trim());
  }
  return result;
}

/**
 * Updates an employee's role list via employee_api.update_employee_roles.
 */
export async function updateEmployeeRolesApiV2(
  email: string,
  roles: string[]
): Promise<string[]> {
  const normalizedRoles = normalizeAndDeduplicateRoles(roles);
  const result = await requestV2<any>(
    "/api/method/agency_tracking.api.employee.write?op=update_employee_roles",
    {
      method: "POST",
      body: { email, roles: normalizedRoles },
    }
  );
  const list = Array.isArray(result) ? result : result?.roles;
  return Array.isArray(list) ? normalizeAndDeduplicateRoles(list) : [];
}

/**
 * Resets an employee's password via authoritative employee_api.reset_employee_password RPC.
 * Go backend: POST /api/method/agency_tracking.api.employee.write?op=reset_employee_password
 * Requires a password of at least 8 characters.
 */
export async function resetEmployeePasswordApiV2(
  email: string,
  newPassword: string
): Promise<void> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  await requestV2(
    "/api/method/agency_tracking.api.employee.write?op=reset_employee_password",
    {
      method: "POST",
      body: { email: normalizedEmail, new_password: newPassword.trim() },
    }
  );
}

/**
 * Activates/deactivates an employee via employee_api.toggle_employee_status.
 */
export async function toggleEmployeeStatusApiV2(
  email: string,
  enabled: boolean
): Promise<{ status: string; enabled: boolean }> {
  return requestV2(
    "/api/method/agency_tracking.api.employee.write?op=toggle_employee_status",
    {
      method: "POST",
      body: { email, enabled },
    }
  );
}

export interface DeleteEmployeeResult {
  status: string;
  erased?: number;
  enabled?: number;
  message?: string;
}

/**
 * Deletes an employee via employee_api.delete_employee.
 * Returns { status, erased: 1 } if no history and erased,
 * or { status, erased: 0, enabled: 0, message } if switched off.
 */
export async function deleteEmployeeApiV2(email: string): Promise<DeleteEmployeeResult> {
  const res = await requestV2<DeleteEmployeeResult>(
    "/api/method/agency_tracking.api.employee.write?op=delete_employee",
    { method: "POST", body: { email } }
  );
  return (res as any)?.message || res;
}
