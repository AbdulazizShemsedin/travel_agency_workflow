/**
 * V2 Foreign Contractor & Agency API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.contractor_api.list_contractors
 * - POST /api/method/agency_tracking.contractor_api.create_contractor
 */

import { requestV2 } from "./client";
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";

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
  if (isDemoMode()) {
    return demoStore.getContractors();
  }

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
  if (isDemoMode()) {
    const created = demoStore.createContractor(payload);
    return {
      name: created.name,
      contractor_name: created.contractor_name,
      company_name: created.contractor_name,
      message: "Contractor registered successfully",
    };
  }

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
