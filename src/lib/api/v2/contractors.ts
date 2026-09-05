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
  entry_track: "Standard" | "Muayena" | string;
  gender: "Male" | "Female" | string;
  rate: number;
  currency: "Country Currency" | "SAR" | "KWD" | "USD" | "ETB" | "AED" | "QAR" | string;
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
  try {
    return await requestV2(
      "/api/method/agency_tracking.contractor_api.update_contractor",
      {
        method: "POST",
        body: {
          name,
          contractor_name: payload.contractor_name || payload.company_name,
          company_name: payload.company_name,
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
  } catch (err: any) {
    // If the dedicated endpoint fails or is in a direct backend environment, fallback to direct frappe.client updates
    try {
      const current = await getContractorV2(name);
      if (!current) throw err;

      const fieldUpdates: Record<string, any> = {};
      if (payload.country) fieldUpdates.country = payload.country;
      if (payload.communication_manager !== undefined) fieldUpdates.communication_manager = payload.communication_manager;
      if (payload.notes !== undefined) fieldUpdates.notes = payload.notes;

      if (Object.keys(fieldUpdates).length > 0) {
        await requestV2("/api/method/frappe.client.set_value", {
          method: "POST",
          body: {
            doctype: "Contractor",
            name,
            fieldname: fieldUpdates,
          },
        });
      }

      // Update linked User if present
      if (current.user && current.user.toLowerCase() !== "administrator") {
        const userUpdates: Record<string, any> = {};
        if (payload.contact_person) userUpdates.first_name = payload.contact_person;
        if (payload.phone !== undefined) userUpdates.phone = payload.phone;
        if (payload.whatsapp !== undefined) userUpdates.mobile_no = payload.whatsapp;

        if (Object.keys(userUpdates).length > 0) {
          await requestV2("/api/method/frappe.client.set_value", {
            method: "POST",
            body: {
              doctype: "User",
              name: current.user,
              fieldname: userUpdates,
            },
          });
        }
      }

      return { success: true, name };
    } catch {
      throw err;
    }
  }
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
      entry_track?: "Standard" | "Muayena" | string;
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

/**
 * Reads a Contractor's configured default commission rate table.
 * Authoritative Backend Endpoint: contractor_api.get_commission_rates
 * Roles: Manager, Admin, Finance Manager, Registrar, System Manager
 * Falls back to reading Contractor.default_commission_rates cleanly without noisy warnings.
 */
export async function getCommissionRatesV2(
  contractor: string
): Promise<V2ContractorCommissionRate[]> {
  try {
    const result = await requestV2<V2ContractorCommissionRate[] | { message: V2ContractorCommissionRate[] }>(
      "/api/method/agency_tracking.contractor_api.get_commission_rates",
      {
        method: "POST",
        body: { contractor },
      }
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray((result as any).message)) return (result as any).message;
  } catch {
    // Quietly continue to read from Contractor record
  }

  try {
    const contractorDoc = await getContractorV2(contractor);
    if (contractorDoc && Array.isArray(contractorDoc.default_commission_rates)) {
      return contractorDoc.default_commission_rates.map((r: any) => ({
        destination_country: r.destination_country || "Saudi Arabia",
        entry_track: (r.entry_track || "Standard") as "Standard" | "Muayena",
        gender: (r.gender || "Female") as "Female" | "Male" | "Both",
        rate: Number(r.rate) || 0,
        currency: r.currency || "Country Currency",
      }));
    }
  } catch {
    // Return empty array if not configured
  }

  return [];
}

/**
 * Replaces (full overwrite) an agency's default commission rate table.
 * Authoritative Backend Endpoint: contractor_api.set_commission_rates
 * Roles: Manager, Admin, Finance Manager, Registrar, System Manager
 * Note: This is a full replacement, not a merge. Always send the complete desired table.
 * Falls back to persisting via frappe.client.save on Contractor DocType if the endpoint is not yet enabled on the server.
 */
function normalizeRateCurrency(currency: string | undefined, country: string): string {
  const allowed = ["SAR", "KWD", "USD", "ETB", "AED", "QAR"];
  if (currency && allowed.includes(currency)) return currency;
  switch (country) {
    case "Saudi Arabia":
      return "SAR";
    case "Kuwait":
      return "KWD";
    case "United Arab Emirates":
      return "AED";
    case "Qatar":
      return "QAR";
    default:
      return "USD";
  }
}

export async function setCommissionRatesV2(
  contractor: string,
  rates: V2ContractorCommissionRate[]
): Promise<V2ContractorCommissionRate[]> {
  const cleanedRates = rates.map((r) => ({
    destination_country: r.destination_country,
    entry_track: r.entry_track,
    gender: r.gender,
    rate: Number(r.rate) || 0,
    currency: normalizeRateCurrency(r.currency, r.destination_country),
  }));

  try {
    const result = await requestV2<V2ContractorCommissionRate[] | { message: V2ContractorCommissionRate[] }>(
      "/api/method/agency_tracking.contractor_api.set_commission_rates",
      {
        method: "POST",
        body: {
          contractor,
          rates: cleanedRates,
        },
      }
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray((result as any).message)) return (result as any).message;
    return cleanedRates;
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    // Only attempt legacy DocType fallback if the server specifically lacks the endpoint method attribute
    if (
      errMsg.includes("has no attribute 'set_commission_rates'") ||
      errMsg.includes("Failed to get method for command agency_tracking.contractor_api.set_commission_rates")
    ) {
      console.warn(`[Contractors] contractor_api.set_commission_rates unavailable on server, saving directly to Contractor doc:`, errMsg);
      await updateContractorBatchConfigV2(contractor, {
        default_commission_rates: cleanedRates,
      });
      return cleanedRates;
    }
    throw err;
  }
}


