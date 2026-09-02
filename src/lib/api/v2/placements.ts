/**
 * V2 Placement Lifecycle API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.placement_api.create_muayena_placement
 * - POST /api/method/agency_tracking.placement_api.list_placements
 * - POST /api/method/agency_tracking.placement_api.upload_contract
 * - POST /api/method/agency_tracking.placement_api.upload_visa
 * - POST /api/method/agency_tracking.placement_api.record_selected_medical_result
 * - POST /api/method/agency_tracking.placement_api.record_predeparture_medical_result
 * - POST /api/method/agency_tracking.placement_api.advance_placement
 * - POST /api/method/agency_tracking.placement_api.record_ticket_details
 * - POST /api/method/agency_tracking.placement_api.record_reschedule
 */

import { requestV2 } from "./client";

export type V2PlacementStatus =
  | "Selected"
  | "Processing"
  | "Stamped"
  | "Ticketed"
  | "Departed"
  | "Cancelled";

export interface V2PlacementRecord {
  name: string;
  applicant: string;
  applicant_name?: string;
  full_name?: string;
  contractor: string;
  contractor_name?: string;
  status: V2PlacementStatus | string;
  destination_country?: string;
  target_job?: string;
  contract_signed_date?: string;
  contract_number?: string;
  visa_number?: string;
  visa_issue_date?: string;
  visa_expiry_date?: string;
  employer_name?: string;
  medical_selected_status?: "FIT" | "UNFIT" | "Pending" | string;
  medical_selected_examination_date?: string;
  medical_selected_expiry_date?: string;
  medical_2_status?: "FIT" | "UNFIT" | "Pending" | string;
  medical_2_examination_date?: string;
  medical_2_date?: string;
  ticket_number?: string;
  flight_date?: string;
  airline?: string;
  pnr_code?: string;
  ticket_cost?: number;
  is_rescheduled?: number | boolean;
  reschedule_date?: string;
  reschedule_cause?: "Internal" | "Airport" | string;
  reschedule_cost?: number;
  cycle_number?: number;
  departed_on?: string;
  corridor_state?: string;
  is_muayena?: number;
  arrival_confirmed?: number;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

/**
 * Creates a Placement directly for Muayena track candidate with contract in hand.
 */
export async function createMuayenaPlacementV2(
  applicantName: string,
  contractorName: string,
  fileUrl?: string
): Promise<{ name?: string; placement_name?: string; message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.create_muayena_placement",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        contractor_name: contractorName,
        ...(fileUrl ? { file_url: fileUrl } : {}),
      },
    }
  );
}

/**
 * Lists Placements the caller's role can read.
 * Authoritative V2 replacement for raw /api/resource/Placement fallback.
 */
export async function listPlacementsV2(
  filters?: Record<string, any> | any[] | string,
  limitPageLength: number = 100,
  orderBy: string = "modified desc"
): Promise<V2PlacementRecord[]> {
  // Guard against TanStack Query passing QueryFunctionContext ({ queryKey, signal }) as filters
  let cleanFilters = filters;
  if (
    cleanFilters &&
    typeof cleanFilters === "object" &&
    ("queryKey" in cleanFilters || "signal" in cleanFilters)
  ) {
    cleanFilters = undefined;
  }

  const filtersParam = typeof cleanFilters === "object" ? JSON.stringify(cleanFilters) : cleanFilters;
  const result = await requestV2<V2PlacementRecord[] | { placements?: V2PlacementRecord[] }>(
    "/api/method/agency_tracking.placement_api.list_placements",
    {
      method: "POST",
      body: {
        ...(filtersParam ? { filters: filtersParam } : {}),
        limit_page_length: limitPageLength,
        order_by: orderBy,
      },
    }
  );

  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray((result as any).placements)) {
    return (result as any).placements;
  }
  return [];
}

/**
 * Uploads a contract file and sets contract fields on Placement.
 */
export async function uploadPlacementContractV2(
  placementName: string,
  fileUrl: string,
  contractNumber?: string,
  contractSignedDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.upload_contract",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        file_url: fileUrl,
        ...(contractNumber ? { contract_number: contractNumber } : {}),
        ...(contractSignedDate ? { contract_signed_date: contractSignedDate } : {}),
      },
    }
  );
}

/**
 * Uploads a visa file and sets visa fields on Placement (Kuwait only).
 */
export async function uploadPlacementVisaV2(
  placementName: string,
  fileUrl: string,
  visaNumber?: string,
  visaIssueDate?: string,
  visaExpiryDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.upload_visa",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        file_url: fileUrl,
        ...(visaNumber ? { visa_number: visaNumber } : {}),
        ...(visaIssueDate ? { visa_issue_date: visaIssueDate } : {}),
        ...(visaExpiryDate ? { visa_expiry_date: visaExpiryDate } : {}),
      },
    }
  );
}

export const uploadContractV2 = uploadPlacementContractV2;
export const uploadVisaV2 = uploadPlacementVisaV2;

/**
 * Records the Stage 1 medical check result (Selected -> Processing gate).
 */
export async function recordSelectedMedicalResultV2(
  placementName: string,
  status: "FIT" | "UNFIT",
  examinationDate?: string,
  expiryDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_selected_medical_result",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        status,
        ...(examinationDate ? { examination_date: examinationDate } : {}),
        ...(expiryDate ? { expiry_date: expiryDate } : {}),
      },
    }
  );
}

/**
 * Records the pre-departure (Medical 2) result (~72h before flight).
 * Gates Ticketed -> Departed. UNFIT automatically cancels Applicant + Placement.
 */
export async function recordPredepartureMedicalResultV2(
  placementName: string,
  status: "FIT" | "UNFIT",
  examinationDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_predeparture_medical_result",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        status,
        ...(examinationDate ? { examination_date: examinationDate } : {}),
      },
    }
  );
}

/**
 * Moves a Placement forward via the sanctioned server state transition.
 */
export async function advancePlacementV2(
  placementName: string,
  newStatus: V2PlacementStatus,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.advance_placement",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        new_status: newStatus,
        ...(overrideReason ? { override_reason: overrideReason } : {}),
      },
    }
  );
}

/**
 * Records ticket details and flight date. Auto-creates pending expense if cost is supplied.
 */
export async function recordTicketDetailsV2(
  placementName: string,
  ticketNumber: string,
  flightDate: string,
  ticketCost?: number,
  currency: string = "ETB"
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_ticket_details",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ticket_number: ticketNumber,
        flight_date: flightDate,
        ...(ticketCost !== undefined ? { ticket_cost: ticketCost, currency } : {}),
      },
    }
  );
}

/**
 * Records a ticket reschedule.
 */
export async function recordRescheduleV2(
  placementName: string,
  rescheduleDate: string,
  rescheduleCause: "Internal" | "Airport",
  rescheduleCost?: number,
  currency: string = "ETB"
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_reschedule",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        reschedule_date: rescheduleDate,
        reschedule_cause: rescheduleCause,
        ...(rescheduleCost !== undefined ? { reschedule_cost: rescheduleCost, currency } : {}),
      },
    }
  );
}
