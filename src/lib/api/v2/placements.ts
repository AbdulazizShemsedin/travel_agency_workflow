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

import { requestV2, ApiV2Error } from "./client";

export type V2PlacementStatus =
  | "Requested"
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
  contractorName?: string,
  fileUrl?: string
): Promise<{ name?: string; placement_name?: string; message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.create_muayena_placement",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...(contractorName ? { contractor_name: contractorName } : {}),
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
  limitPageLength?: number,
  orderBy?: string,
  limitStart?: number,
  withTotal?: 0
): Promise<V2PlacementRecord[]>;
export async function listPlacementsV2(
  filters: Record<string, any> | any[] | string | undefined,
  limitPageLength: number | undefined,
  orderBy: string | undefined,
  limitStart: number | undefined,
  withTotal: 1
): Promise<{ data: V2PlacementRecord[]; total_count: number }>;
export async function listPlacementsV2(
  filters?: Record<string, any> | any[] | string,
  limitPageLength: number = 100,
  orderBy: string = "creation desc",
  limitStart: number = 0,
  withTotal: number = 0
): Promise<V2PlacementRecord[] | { data: V2PlacementRecord[]; total_count: number }> {
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
  const result = await requestV2<any>(
    "/api/method/agency_tracking.placement_api.list_placements",
    {
      method: "POST",
      body: {
        ...(filtersParam ? { filters: filtersParam } : {}),
        limit_page_length: limitPageLength,
        limit_start: limitStart,
        ...(withTotal ? { with_total: withTotal } : {}),
        order_by: orderBy,
      },
    }
  );

  let list: V2PlacementRecord[] = [];
  if (Array.isArray(result)) {
    list = result;
  } else if (result && Array.isArray((result as any).placements)) {
    list = (result as any).placements;
  } else if (result && Array.isArray((result as any).data)) {
    list = (result as any).data;
  } else if (result && Array.isArray((result as any).items)) {
    list = (result as any).items;
  } else if (result && Array.isArray((result as any).message)) {
    list = (result as any).message;
  }

  if (withTotal) {
    return {
      data: list,
      total_count: Number(result?.total_count ?? list.length),
    };
  }

  return list;
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
  if (!fileUrl) {
    // If no file_url is provided, update the parsed visa fields directly via update_placement_parsed_fields
    return updatePlacementParsedFieldsV2(placementName, {
      ...(visaNumber ? { visa_number: visaNumber } : {}),
      ...(visaIssueDate ? { visa_issue_date: visaIssueDate } : {}),
      ...(visaExpiryDate ? { visa_expiry_date: visaExpiryDate } : {}),
    });
  }
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
 * Records ticket details and flight date.
 * Ticket cost is strictly in ETB (backend rejects any other currency).
 * Re-calling with new ticket cost edits the same ledger row.
 * Returns optional warning if row was voided/rejected by Finance.
 */
export async function recordTicketDetailsV2(
  placementName: string,
  ticketNumber: string,
  flightDate: string,
  ticketCost?: number,
  flightTime?: string
): Promise<{ message?: string; warning?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_ticket_details",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ticket_number: ticketNumber,
        flight_date: flightDate,
        currency: "ETB",
        ...(ticketCost !== undefined && Number(ticketCost) > 0 ? { ticket_cost: Number(ticketCost) } : {}),
        ...(flightTime !== undefined ? { flight_time: flightTime } : {}),
      },
    }
  );
}

/**
 * Records a ticket reschedule.
 * Airport reschedule costs nothing (no cost sent).
 * Internal reschedule requires reschedule_cost (ETB), optional new ticket_number.
 * Pass transaction=<reschedule_transaction> to correct a previously logged internal reschedule.
 */
export async function recordRescheduleV2(
  placementName: string,
  rescheduleDate: string,
  rescheduleCause: "Internal" | "Airport",
  rescheduleCost?: number,
  ticketNumber?: string,
  transaction?: string,
  flightTime?: string
): Promise<{ message?: string; reschedule_transaction?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_reschedule",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        reschedule_date: rescheduleDate,
        reschedule_cause: rescheduleCause,
        currency: "ETB",
        ...(rescheduleCause === "Internal" && rescheduleCost !== undefined ? { reschedule_cost: rescheduleCost } : {}),
        ...(ticketNumber ? { ticket_number: ticketNumber } : {}),
        ...(transaction ? { transaction } : {}),
        ...(flightTime !== undefined ? { flight_time: flightTime } : {}),
      },
    }
  );
}

/**
 * Updates LMIS employer and contract fields on a Placement.
 * Authoritative Backend Endpoint: placement_api.update_placement_for_lmis (New 2026-10-11)
 * Roles: Saudi LMIS, Kuwait LMIS, Manager, Admin
 */
export async function updatePlacementForLmisV2(
  placementName: string,
  fields: {
    employer_city?: string;
    employer_house_number?: string;
    employer_phone?: string;
    employer_alt_phone?: string;
    contract_start_date?: string;
    contract_end_date?: string;
  }
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.update_placement_for_lmis",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...fields,
      },
    }
  );
}

/**
 * Records flight outcome: "Local return" (at Ticketed) or "International return" (at Departed).
 * Authoritative Backend Endpoint: placement_api.record_flight_outcome (New 2026-10-12)
 * Roles: Ticketer, Manager, Admin
 */
export async function recordFlightOutcomeV2(
  placementName: string,
  outcome: "Local return" | "International return" | string,
  outcomeDate?: string,
  reason?: string
): Promise<{ message?: string; replacement_owed?: number; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.record_flight_outcome",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        outcome,
        ...(outcomeDate ? { outcome_date: outcomeDate } : {}),
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Undoes a previously recorded flight outcome.
 * Authoritative Backend Endpoint: placement_api.undo_flight_outcome (New 2026-10-12)
 */
export async function undoFlightOutcomeV2(
  placementName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.undo_flight_outcome",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Clears a pre-departure medical result.
 * Authoritative Backend Endpoint: placement_api.clear_predeparture_medical_result (New 2026-10-12)
 */
export async function clearPredepartureMedicalResultV2(
  placementName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.clear_predeparture_medical_result",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Clears a selected-stage medical result while placement is Selected.
 * Authoritative Backend Endpoint: placement_api.clear_selected_medical_result (New 2026-10-12)
 */
export async function clearSelectedMedicalResultV2(
  placementName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.clear_selected_medical_result",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Undoes a flight reschedule.
 * Authoritative Backend Endpoint: placement_api.undo_reschedule (New 2026-10-12)
 */
export async function undoRescheduleV2(
  placementName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.undo_reschedule",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Waives replacement owed for a returned worker (Manager / Admin).
 * Authoritative Backend Endpoint: placement_api.waive_replacement (New 2026-10-12)
 */
export async function waiveReplacementV2(
  placementName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.waive_replacement",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Undoes waiver of replacement.
 * Authoritative Backend Endpoint: placement_api.undo_waive_replacement (New 2026-10-12)
 */
export async function undoWaiveReplacementV2(
  placementName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.undo_waive_replacement",
    {
      method: "POST",
      body: {
        placement_name: placementName,
      },
    }
  );
}

/**
 * Fetches the full Placement document.
 * Authoritative Backend Endpoint: placement_api.get_placement
 */
export async function getPlacementV2(
  placementName?: string
): Promise<V2PlacementRecord> {
  const result = await requestV2<V2PlacementRecord | { message: V2PlacementRecord }>(
    "/api/method/agency_tracking.placement_api.get_placement",
    {
      method: "POST",
      body: placementName ? { placement_name: placementName } : {},
    }
  );

  if (result && "message" in result && result.message) {
    return result.message as V2PlacementRecord;
  }
  return result as V2PlacementRecord;
}

/**
 * Updates parsed contract and visa fields on a Placement.
 * Authoritative Backend Endpoint: placement_api.update_placement_parsed_fields
 * Roles: Contract Parser, Manager, Admin, System Manager
 */
export async function updatePlacementParsedFieldsV2(
  placementName: string,
  fields: {
    visa_number?: string;
    visa_type?: string;
    visa_issue_date?: string;
    visa_expiry_date?: string;
    visa_reference_number?: string;
    contract_number?: string;
    contract_signed_date?: string;
    employer_name?: string;
    employer_national_id?: string;
    employer_address?: string;
    saudi_agency_name?: string;
    saudi_agency_license?: string;
    kuwait_agency_name?: string;
    kuwait_agency_license?: string;
    employment_site?: string;
    contract_duration?: string;
    [key: string]: any;
  }
): Promise<V2PlacementRecord> {
  const result = await requestV2<V2PlacementRecord | { message: V2PlacementRecord }>(
    "/api/method/agency_tracking.placement_api.update_placement_parsed_fields",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...fields,
      },
    }
  );

  if (result && "message" in result && result.message) {
    return result.message as V2PlacementRecord;
  }
  return result as V2PlacementRecord;
}

/**
 * Lists Placements scoped to the current foreign agency portal user.
 * Accepts optional contractorName for internal staff viewing a specific agency's placements.
 * Authoritative Backend Endpoint: portal_api.list_my_placements
 */
export async function listMyPlacementsV2(
  contractorName?: string
): Promise<V2PlacementRecord[]>;
export async function listMyPlacementsV2(
  contractorName: string | undefined,
  limitStart: number | undefined,
  limitPageLength: number | undefined,
  withTotal: 1
): Promise<{ data: V2PlacementRecord[]; total_count: number }>;
export async function listMyPlacementsV2(
  contractorName?: string,
  limitStart?: number,
  limitPageLength?: number,
  withTotal?: 0
): Promise<V2PlacementRecord[]>;
export async function listMyPlacementsV2(
  limitStart?: number,
  limitPageLength?: number,
  withTotal?: 0
): Promise<V2PlacementRecord[]>;
export async function listMyPlacementsV2(
  limitStart: number | undefined,
  limitPageLength: number | undefined,
  withTotal: 1
): Promise<{ data: V2PlacementRecord[]; total_count: number }>;
export async function listMyPlacementsV2(
  arg1?: string | number,
  arg2?: number,
  arg3?: number,
  arg4?: number
): Promise<V2PlacementRecord[] | { data: V2PlacementRecord[]; total_count: number }> {
  let contractorName: string | undefined;
  let limitStart = 0;
  let limitPageLength: number | undefined;
  let withTotal = 0;

  if (typeof arg1 === "string") {
    contractorName = arg1;
    if (typeof arg2 === "number") limitStart = arg2;
    if (typeof arg3 === "number") limitPageLength = arg3;
    if (typeof arg4 === "number") withTotal = arg4;
  } else if (typeof arg1 === "number") {
    limitStart = arg1;
    if (typeof arg2 === "number") limitPageLength = arg2;
    if (typeof arg3 === "number") withTotal = arg3;
  }

  const body: Record<string, any> = {};
  if (contractorName && contractorName.trim()) {
    body.contractor_name = contractorName.trim();
    body.contractor = contractorName.trim();
  }
  if (limitStart > 0) body.limit_start = limitStart;
  if (limitPageLength !== undefined) body.limit_page_length = limitPageLength;
  if (withTotal) body.with_total = withTotal;

  const result = await requestV2<any>(
    "/api/method/agency_tracking.portal_api.list_my_placements",
    {
      method: "POST",
      body: Object.keys(body).length > 0 ? body : undefined,
    }
  );

  let list: V2PlacementRecord[] = [];
  if (Array.isArray(result)) {
    list = result;
  } else if (result && Array.isArray((result as any).placements)) {
    list = (result as any).placements;
  } else if (result && Array.isArray((result as any).data)) {
    list = (result as any).data;
  } else if (result && Array.isArray((result as any).items)) {
    list = (result as any).items;
  } else if (result && Array.isArray((result as any).message)) {
    list = (result as any).message;
  }

  if (withTotal) {
    return {
      data: list,
      total_count: Number(result?.total_count ?? list.length),
    };
  }

  return list;
}

/**
 * Sets remarks on Ticket & Departure screen (B5: separate Ticket & Departure screen remark).
 * Authoritative Backend Endpoint: placement_api.set_ticketing_remarks
 * Roles: Ticketer, Manager, Admin
 */
export async function setTicketingRemarksV2(
  placementName: string,
  remarks: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.set_ticketing_remarks",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        remarks,
      },
    }
  );
}

export interface V2SelectionRequestItem {
  name: string; // placement internal ID (for API calls; never shown)
  full_name?: string;
  passport_number?: string;
  ref_no?: string;
  agency_name?: string;
  destination_country?: string;
  requested_on?: string;
  applicant?: string;
  is_free_replacement?: number | boolean;
  exchange_for?: string;
  [key: string]: any;
}

/**
 * Lists cases waiting for staff confirmation, oldest first.
 * Authoritative Backend Endpoint: placement_api.list_selection_requests
 * Roles: Registrar, Manager, Admin
 */
export async function listSelectionRequestsV2(): Promise<V2SelectionRequestItem[]> {
  const result = await requestV2<any>(
    "/api/method/agency_tracking.placement_api.list_selection_requests",
    {
      method: "POST",
      body: {},
    }
  );

  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    if (Array.isArray(result.message)) return result.message;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.rows)) return result.rows;
    if (Array.isArray(result.requests)) return result.requests;
    if (result.message && typeof result.message === "object") {
      if (Array.isArray(result.message.data)) return result.message.data;
      if (Array.isArray(result.message.rows)) return result.message.rows;
      if (Array.isArray(result.message.requests)) return result.message.requests;
    }
  }
  if (result === null || result === undefined) return [];
  throw new ApiV2Error(
    "Unexpected response format received from selection requests endpoint.",
    500,
    "InvalidPayloadError",
    undefined,
    result
  );
}

/**
 * Confirms candidate selection. The placement status moves to Selected.
 * Authoritative Backend Endpoint: placement_api.approve_selection_request
 * Roles: Registrar, Manager, Admin
 */
export async function approveSelectionRequestV2(
  placementName: string,
  remarks?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.approve_selection_request",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        ...(remarks ? { remarks } : {}),
      },
    }
  );
}

/**
 * Denies candidate selection. The placement is Cancelled and the candidate leaves every agency's pool.
 * Authoritative Backend Endpoint: placement_api.deny_selection_request
 * Roles: Registrar, Manager, Admin
 */
export async function denySelectionRequestV2(
  placementName: string,
  reason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.deny_selection_request",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        reason,
      },
    }
  );
}

/**
 * Puts an unavailable candidate back into the agency pool.
 * Authoritative Backend Endpoint: placement_api.make_applicant_available
 * Roles: Registrar, Manager, Admin
 */
export async function makeApplicantAvailableV2(
  applicantName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.placement_api.make_applicant_available",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}


