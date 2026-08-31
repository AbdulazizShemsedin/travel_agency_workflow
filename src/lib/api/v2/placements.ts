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
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";

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
  if (isDemoMode()) {
    const res = demoStore.selectCandidate(applicantName, contractorName);
    return { name: res.placement.name, placement_name: res.placement.name, message: "Muayena placement created" };
  }

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
  if (isDemoMode()) {
    return demoStore.getPlacements();
  }

  const filtersParam = typeof filters === "object" ? JSON.stringify(filters) : filters;
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

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).placements)) return (result as any).placements;
  return [];
}

/**
 * Attaches a signed contract to a Selected Placement.
 */
export async function uploadContractV2(
  placementName: string,
  fileUrl: string
): Promise<{ message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { message: "Contract document attached in demo state" };
  }

  return requestV2(
    "/api/method/agency_tracking.placement_api.upload_contract",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        file_url: fileUrl,
      },
    }
  );
}

/**
 * Attaches a Kuwait eVisa document to a Placement.
 */
export async function uploadVisaV2(
  placementName: string,
  fileUrl: string
): Promise<{ message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { message: "Visa document attached in demo state" };
  }

  return requestV2(
    "/api/method/agency_tracking.placement_api.upload_visa",
    {
      method: "POST",
      body: {
        placement_name: placementName,
        file_url: fileUrl,
      },
    }
  );
}

/**
 * Records post-selection medical examination result (FIT / UNFIT).
 * Gates Selected -> Processing. UNFIT automatically cancels Applicant + Placement.
 */
export async function recordSelectedMedicalResultV2(
  placementName: string,
  status: "FIT" | "UNFIT",
  examinationDate?: string,
  expiryDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    if (status === "FIT") {
      demoStore.advancePlacementToProcessing(placementName);
    }
    return { message: `Selected medical result recorded: ${status}` };
  }

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
  if (isDemoMode()) {
    if (status === "FIT") {
      demoStore.recordDeparture(placementName);
    }
    return { message: `Pre-departure medical recorded: ${status}` };
  }

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
  if (isDemoMode()) {
    if (newStatus === "Processing") {
      demoStore.advancePlacementToProcessing(placementName);
    } else if (newStatus === "Stamped") {
      demoStore.advancePlacementToStamped(placementName);
    } else if (newStatus === "Ticketed") {
      demoStore.recordTicket(placementName, { ticket_number: `TKT-${Math.floor(100000 + Math.random() * 900000)}`, flight_date: "2026-03-10" });
    } else if (newStatus === "Departed") {
      demoStore.recordDeparture(placementName);
    }
    return { message: `Placement advanced to ${newStatus}` };
  }

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
  if (isDemoMode()) {
    demoStore.recordTicket(placementName, { ticket_number: ticketNumber, flight_date: flightDate });
    return { message: "Ticket details recorded successfully" };
  }

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
  if (isDemoMode()) {
    return { message: `Reschedule recorded for ${rescheduleDate}` };
  }

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
