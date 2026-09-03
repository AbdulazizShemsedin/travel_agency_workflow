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

export interface ResetEmployeePasswordPayload {
  email: string;
  new_password: string;
}

/**
 * Lists all active and inactive system staff accounts, enriching each with assigned security roles.
 */
export async function listEmployeesV2(): Promise<V2EmployeeRecord[]> {
  const users = await requestV2<any[]>("/api/method/frappe.client.get_list", {
    method: "POST",
    body: {
      doctype: "User",
      fields: [
        "name",
        "email",
        "full_name",
        "first_name",
        "last_name",
        "enabled",
        "user_type",
        "creation",
        "phone",
        "mobile_no",
      ],
      filters: [
        ["User", "user_type", "=", "System User"],
        ["User", "name", "!=", "Guest"],
      ],
      order_by: "creation desc",
      limit_page_length: 100,
    },
  });

  if (!Array.isArray(users)) {
    return [];
  }

  // Enrich users with their assigned security roles in parallel
  const enrichedUsers: V2EmployeeRecord[] = await Promise.all(
    users.map(async (u) => {
      try {
        const docRes = await requestV2<any>("/api/method/frappe.client.get", {
          method: "POST",
          body: {
            doctype: "User",
            name: u.name,
          },
        });
        const doc = docRes?.message || docRes;
        const roles: string[] = Array.isArray(doc?.roles)
          ? doc.roles
              .map((r: any) => (typeof r === "string" ? r : r?.role))
              .filter(Boolean)
          : [];

        return {
          name: u.name || u.email,
          email: u.email || u.name,
          full_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
          first_name: u.first_name || "",
          last_name: u.last_name || null,
          phone: u.phone || u.mobile_no || null,
          mobile_no: u.mobile_no || u.phone || null,
          enabled: typeof u.enabled === "number" ? u.enabled : 1,
          user_type: u.user_type || "System User",
          creation: u.creation || new Date().toISOString(),
          roles,
        };
      } catch {
        return {
          name: u.name || u.email,
          email: u.email || u.name,
          full_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
          first_name: u.first_name || "",
          last_name: u.last_name || null,
          phone: u.phone || u.mobile_no || null,
          mobile_no: u.mobile_no || u.phone || null,
          enabled: typeof u.enabled === "number" ? u.enabled : 1,
          user_type: u.user_type || "System User",
          creation: u.creation || new Date().toISOString(),
          roles: [],
        };
      }
    })
  );

  return enrichedUsers;
}

/**
 * Creates a new system employee account with specified credentials and multi-role assignments.
 */
export async function createEmployeeV2(payload: CreateEmployeePayload): Promise<V2EmployeeRecord> {
  const email = payload.email.trim().toLowerCase();
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name?.trim() || "";
  const phone = payload.phone?.trim() || "";
  const password = payload.password?.trim() || "AgencyStaff123!";

  // Ensure Desk User role is present for UI access
  const roleSet = new Set(payload.roles);
  roleSet.add("Desk User");

  const doc = {
    doctype: "User",
    email,
    first_name: firstName,
    last_name: lastName,
    phone,
    mobile_no: phone,
    new_password: password,
    send_welcome_email: payload.send_welcome_email ? 1 : 0,
    roles: Array.from(roleSet).map((role) => ({
      doctype: "Has Role",
      role,
    })),
  };

  const res = await requestV2<any>("/api/method/frappe.client.insert", {
    method: "POST",
    body: { doc },
  });

  const created = res?.message || res;
  return {
    name: created.name || email,
    email: created.email || email,
    full_name: created.full_name || `${firstName} ${lastName}`.trim(),
    first_name: created.first_name || firstName,
    last_name: created.last_name || lastName,
    phone: created.phone || phone,
    mobile_no: created.mobile_no || phone,
    enabled: created.enabled ?? 1,
    user_type: created.user_type || "System User",
    creation: created.creation || new Date().toISOString(),
    roles: Array.from(roleSet),
  };
}

/**
 * Updates assigned security roles for an existing employee.
 */
export async function updateEmployeeRolesV2(
  userEmail: string,
  newRoles: string[]
): Promise<string[]> {
  const res = await requestV2<any>("/api/method/frappe.client.get", {
    method: "POST",
    body: { doctype: "User", name: userEmail },
  });

  const userDoc = res?.message || res;
  if (!userDoc) {
    throw new Error(`Failed to load employee record for ${userEmail}`);
  }

  // Ensure Desk User is retained
  const roleSet = new Set(newRoles);
  roleSet.add("Desk User");

  userDoc.roles = Array.from(roleSet).map((role) => ({
    doctype: "Has Role",
    role,
  }));

  const saveRes = await requestV2<any>("/api/method/frappe.client.save", {
    method: "POST",
    body: { doc: userDoc },
  });

  const savedDoc = saveRes?.message || saveRes;
  const updatedRoles: string[] = Array.isArray(savedDoc?.roles)
    ? savedDoc.roles.map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean)
    : Array.from(roleSet);

  return updatedRoles;
}

/**
 * Resets employee login password.
 */
export async function resetEmployeePasswordV2(
  userEmail: string,
  newPassword: string
): Promise<void> {
  await requestV2("/api/method/frappe.client.set_value", {
    method: "POST",
    body: {
      doctype: "User",
      name: userEmail,
      fieldname: "new_password",
      value: newPassword.trim(),
    },
  });
}

/**
 * Activates or deactivates an employee account.
 */
export async function toggleEmployeeStatusV2(
  userEmail: string,
  enabled: boolean
): Promise<void> {
  await requestV2("/api/method/frappe.client.set_value", {
    method: "POST",
    body: {
      doctype: "User",
      name: userEmail,
      fieldname: "enabled",
      value: enabled ? 1 : 0,
    },
  });
}

/**
 * Permanently removes an employee account.
 */
export async function deleteEmployeeV2(userEmail: string): Promise<void> {
  await requestV2("/api/method/frappe.client.delete", {
    method: "POST",
    body: {
      doctype: "User",
      name: userEmail,
    },
  });
}
