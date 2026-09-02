/**
 * V2 Clearance Lifecycle API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.clearance_api.list_my_clearance_steps
 * - POST /api/method/agency_tracking.clearance_api.start_clearance_step
 * - POST /api/method/agency_tracking.clearance_api.complete_clearance_step
 * - POST /api/method/agency_tracking.clearance_api.reassign_clearance_step
 * - POST /api/method/agency_tracking.clearance_api.submit_embassy_step
 * - POST /api/method/agency_tracking.clearance_api.stamp_embassy_step
 * - POST /api/method/agency_tracking.clearance_api.reject_embassy_step
 * - POST /api/method/agency_tracking.chat_engine.get_placement_officers
 */

import { requestV2 } from "./client";

export interface V2ClearanceStepItem {
  name: string;
  step_type: string;
  sequence_order: number;
  is_mandatory: number | boolean;
  status: "Pending" | "In Progress" | "Issued" | "Complete" | "Submitted" | "Stamped" | "Rejected" | "Cancelled" | string;
  placement: string;
  assigned_officer?: string;
  date_started?: string | null;
  date_completed?: string | null;
  completed_by?: string | null;
  reference_no?: string | null;
  amount?: number | null;
  payment_status?: string | null;
  step_name?: string;
  applicant?: string;
  applicant_name?: string;
  full_name?: string;
  passport_number?: string;
  destination_country?: string;
  placement_name?: string;
  contractor?: string;
  contractor_name?: string;
  creation?: string;
  modified?: string;
  notes?: string;
  rejection_remark?: string;
  [key: string]: any;
}

export type V2ClearanceStep = V2ClearanceStepItem;

/**
 * Fetches the current user's role-scoped clearance step queue.
 */
export async function listMyClearanceStepsV2(): Promise<V2ClearanceStepItem[]> {
  const result = await requestV2<V2ClearanceStepItem[] | { steps?: V2ClearanceStepItem[] }>(
    "/api/method/agency_tracking.clearance_api.list_my_clearance_steps",
    { method: "POST" }
  );

  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray((result as any).steps)) {
    return (result as any).steps;
  }
  return [];
}

/**
 * Marks a Clearance Step In Progress.
 */
export async function startClearanceStepV2(
  clearanceStepName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.start_clearance_step",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
    }
  );
}

/**
 * Marks a non-Embassy Clearance Step Complete (Issued for LMIS; Complete for others).
 */
export async function completeClearanceStepV2(
  clearanceStepName: string,
  referenceNo?: string,
  amount?: number
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.complete_clearance_step",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        ...(referenceNo ? { reference_no: referenceNo } : {}),
        ...(amount !== undefined ? { amount } : {}),
      },
    }
  );
}

/**
 * Reassigns a Clearance Step to a different officer.
 */
export async function reassignClearanceStepV2(
  clearanceStepName: string,
  newOfficerEmail: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.reassign_clearance_step",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        new_officer: newOfficerEmail,
      },
    }
  );
}

/**
 * Submits an Embassy step's documents (Monday schedule).
 */
export async function submitEmbassyStepV2(
  clearanceStepName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.submit_embassy_step",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
    }
  );
}

/**
 * Marks an Embassy step Stamped (Thursday success outcome).
 */
export async function stampEmbassyStepV2(
  clearanceStepName: string,
  referenceNo?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.stamp_embassy_step",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        ...(referenceNo ? { reference_no: referenceNo } : {}),
      },
    }
  );
}

/**
 * Marks an Embassy step Rejected (Thursday failure outcome).
 */
export async function rejectEmbassyStepV2(
  clearanceStepName: string,
  rejectionRemark: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.reject_embassy_step",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        rejection_remark: rejectionRemark,
      },
    }
  );
}

export interface V2PlacementOfficerItem {
  step_type: string;
  user: string;
  full_name?: string;
  [key: string]: any;
}

/**
 * Gets open ToDo assignments for each clearance step on a Placement.
 * Sourced from agency_tracking.chat_engine.get_placement_officers.
 */
export async function getPlacementOfficersV2(
  placementName: string
): Promise<V2PlacementOfficerItem[]> {
  const result = await requestV2<V2PlacementOfficerItem[] | { officers?: V2PlacementOfficerItem[] }>(
    "/api/method/agency_tracking.chat_engine.get_placement_officers",
    {
      method: "POST",
      body: { placement_name: placementName },
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).officers)) return (result as any).officers;
  return [];
}
