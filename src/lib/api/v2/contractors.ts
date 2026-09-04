/**
 * V2 Foreign Contractor & Agency API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.contractor_api.list_contractors
 * - POST /api/method/agency_tracking.contractor_api.create_contractor
 */

import { requestV2 } from "./client";

export interface V2ContractorRecord {
  name: string;
  contractor_name: string;
  company_name?: string;
  country: string;
  user?: string;
  user_email?: string;
  user_first_name?: string;
  communication_manager?: string;
  contact_person?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  active_status?: number | boolean;
  notes?: string;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

export type V2ContractorItem = V2ContractorRecord;

export interface V2CreateContractorPayload {
  contractor_name?: string;
  company_name?: string;
  country?: string;
  user_email?: string;
  user_first_name?: string;
  communication_manager?: string;
  contact_person?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Lists Contractors the caller's role can manage.
 */
export async function listContractorsV2(
  filters?: Record<string, any> | any[] | string,
  limitPageLength: number = 100
): Promise<V2ContractorRecord[]> {
  const filtersParam = typeof filters === "object" ? JSON.stringify(filters) : filters;
  const result = await requestV2<V2ContractorRecord[] | { contractors?: V2ContractorRecord[] }>(
    "/api/method/agency_tracking.contractor_api.list_contractors",
    {
      method: "POST",
      body: {
        ...(filtersParam ? { filters: filtersParam } : {}),
        limit_page_length: limitPageLength,
      },
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).contractors)) return (result as any).contractors;
  return [];
}

/**
 * Registers a new foreign agency and creates its linked portal user.
 */
export async function createContractorV2(
  payload: V2CreateContractorPayload
): Promise<{ name?: string; contractor_name?: string; company_name?: string; message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.contractor_api.create_contractor",
    {
      method: "POST",
      body: {
        contractor_name: payload.contractor_name || payload.company_name || "New Agency",
        country: payload.country || "Saudi Arabia",
        user_email: payload.user_email || payload.email || `agency_${Date.now()}@agency.com`,
        user_first_name: payload.user_first_name || payload.contact_person || "Agency Contact",
        ...(payload.communication_manager ? { communication_manager: payload.communication_manager } : {}),
      },
    }
  );
}

/**
 * Updates an existing Contractor record in Frappe.
 */
export async function updateContractorV2(
  name: string,
  payload: {
    contractor_name?: string;
    company_name?: string;
    country?: string;
    contact_person?: string;
    communication_manager?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    notes?: string;
    [key: string]: any;
  }
): Promise<any> {
  const fieldnamePayload: Record<string, any> = {};
  if (payload.contractor_name !== undefined) fieldnamePayload.contractor_name = payload.contractor_name;
  if (payload.country !== undefined) fieldnamePayload.country = payload.country;
  if (payload.communication_manager !== undefined) fieldnamePayload.communication_manager = payload.communication_manager;
  if (payload.contact_person !== undefined) fieldnamePayload.contact_person = payload.contact_person;
  if (payload.phone !== undefined) fieldnamePayload.phone = payload.phone;
  if (payload.whatsapp !== undefined) fieldnamePayload.whatsapp = payload.whatsapp;
  if (payload.email !== undefined) fieldnamePayload.email = payload.email;
  if (payload.notes !== undefined) fieldnamePayload.notes = payload.notes;

  return requestV2("/api/method/frappe.client.set_value", {
    method: "POST",
    body: {
      doctype: "Contractor",
      name,
      fieldname: fieldnamePayload,
    },
  });
}

