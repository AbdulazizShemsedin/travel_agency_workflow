/**
 * V2 Placement Lifecycle API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.placement_api.create_muayena_placement
 * - POST /api/method/agency_tracking.placement_api.upload_contract
 * - POST /api/method/agency_tracking.placement_api.upload_visa
 * - POST /api/method/agency_tracking.placement_api.record_selected_medical_result
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
  contractor: string;
  status: V2PlacementStatus;
  destination_country?: string;
  contract_signed_date?: string;
  medical_result?: "FIT" | "UNFIT" | "Pending";
  medical_examination_date?: string;
  medical_expiry_date?: string;
  ticket_number?: string;
  flight_date?: string;
  ticket_cost?: number;
  [key: string]: any;
}

/**
 * Creates a Placement directly for Muayena track candidate with contract in hand.
 */
export async function createMuayenaPlacementV2(
  applicantName: string,
  contractorName: string,
  fileUrl?: string
): Promise<{ name?: string; placement_name?: string; message?: string }> {
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
 * Attaches a signed contract to a Selected Placement.
 */
export async function uploadContractV2(
  placementName: string,
  fileUrl: string
): Promise<{ message?: string; [key: string]: any }> {
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
