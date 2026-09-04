/**
 * V2 Foreign Contractor & Agency API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.contractor_api.list_contractors
 * - POST /api/method/agency_tracking.contractor_api.create_contractor
 */

import { requestV2 } from "./client";

export interface V2ContractorCommissionRate {
  name?: string;
  destination_country: string;
  rate: number;
  currency: "SAR" | "KWD" | "USD" | "ETB" | "AED" | "QAR" | string;
  gender?: "Both" | "Male" | "Female" | string;
  [key: string]: any;
}

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
  batch_mode?: "Manual Only" | "Auto-Threshold" | string;
  batch_threshold?: number;
  default_commission_rates?: V2ContractorCommissionRate[];
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
  if (result && Array.isArray((result as any).message)) return (result as any).message;
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
 * Updates an existing Contractor record and its linked foreign agency contact details
 * via the dedicated whitelisted contractor_api.update_contractor endpoint.
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
    user?: string;
    [key: string]: any;
  }
): Promise<any> {
  return await requestV2(
    "/api/method/agency_tracking.contractor_api.update_contractor",
    {
      method: "POST",
      body: {
        name,
        contractor_name: payload.contractor_name || payload.company_name,
        country: payload.country,
        contact_person: payload.contact_person,
        communication_manager: payload.communication_manager,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        email: payload.email,
        notes: payload.notes,
      },
    }
  );
}

/**
 * Fetches a single Contractor record by name, including child default_commission_rates.
 */
export async function getContractorV2(name: string): Promise<V2ContractorRecord | null> {
  const result = await requestV2<any>("/api/method/frappe.client.get", {
    method: "POST",
    body: {
      doctype: "Contractor",
      name,
    },
  });
  return result || null;
}

/**
 * Updates Contractor batch configuration (batch_mode, batch_threshold) and default commission rates
 * via frappe.client.save.
 */
export async function updateContractorBatchConfigV2(
  contractorName: string,
  config: {
    batch_mode?: "Manual Only" | "Auto-Threshold" | string;
    batch_threshold?: number;
    default_commission_rates?: Array<{
      destination_country: string;
      rate: number;
      currency: string;
      gender?: "Both" | "Male" | "Female" | string;
    }>;
  }
): Promise<V2ContractorRecord> {
  // First fetch current doc to preserve other fields
  const current = await getContractorV2(contractorName);
  if (!current) {
    throw new Error(`Contractor "${contractorName}" not found.`);
  }

  const updatedDoc = {
    ...current,
    ...(config.batch_mode !== undefined ? { batch_mode: config.batch_mode } : {}),
    ...(config.batch_threshold !== undefined ? { batch_threshold: config.batch_threshold } : {}),
    ...(config.default_commission_rates !== undefined
      ? { default_commission_rates: config.default_commission_rates }
      : {}),
  };

  const saveRes = await requestV2<any>("/api/method/frappe.client.save", {
    method: "POST",
    body: {
      doc: updatedDoc,
    },
  });

  return saveRes;
}


