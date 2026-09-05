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

/**
 * Assigns or reassigns a clearance step to an officer (creates the officer's ToDo).
 * Authoritative Backend Endpoint: clearance_api.assign_clearance_step
 * Roles: Manager, Admin, Clearance Officer, System Manager
 */
export async function assignClearanceStepV2(
  clearanceStepName: string,
  user: string
): Promise<{ status?: string; clearance_step?: string; assigned_to?: string; message?: string }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.assign_clearance_step",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        user,
      },
    }
  );
}

/**
 * Lists clearance steps assigned to the calling officer with placement/applicant context.
 * Authoritative Backend Endpoint: clearance_api.list_assigned_steps (alias of list_my_clearance_steps)
 */
export async function listAssignedStepsV2(): Promise<V2ClearanceStepItem[]> {
  const result = await requestV2<V2ClearanceStepItem[] | { steps?: V2ClearanceStepItem[] }>(
    "/api/method/agency_tracking.clearance_api.list_assigned_steps",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).steps)) return (result as any).steps;
  return [];
}

/**
 * Renders the official Injaz PDF document for Saudi Arabia placements.
 * Authoritative Backend Endpoint: clearance_api.render_injaz_pdf
 * Roles: Management, assigned officer, or step's mapped country role
 */
export async function renderInjazPdfV2(clearanceStepName: string): Promise<Blob> {
  return requestV2<Blob>(
    "/api/method/agency_tracking.clearance_api.render_injaz_pdf",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
      headers: {
        Accept: "application/pdf, application/octet-stream, */*",
      },
    }
  );
}

/**
 * Books or updates a Taeshir appointment and Injaz Application ID (E-number).
 * Authoritative Backend Endpoint: clearance_api.set_taeshir_appointment
 */
export async function setTaeshirAppointmentV2(
  clearanceStepName: string,
  appointmentDate: string,
  injazApplicationId: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.set_taeshir_appointment",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        appointment_date: appointmentDate,
        injaz_application_id: injazApplicationId,
      },
    }
  );
}

/**
 * Reschedules a Taeshir appointment without forfeiting Injaz payment.
 * Authoritative Backend Endpoint: clearance_api.reschedule_taeshir_appointment
 */
export async function rescheduleTaeshirAppointmentV2(
  clearanceStepName: string,
  newAppointmentDate: string,
  cause: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.reschedule_taeshir_appointment",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        new_appointment_date: newAppointmentDate,
        cause,
      },
    }
  );
}

/**
 * Records an Injaz visa fee payment.
 * Authoritative Backend Endpoint: clearance_api.record_injaz_payment
 */
export async function recordInjazPaymentV2(
  clearanceStepName: string,
  amount: number,
  currency: string = "USD",
  receiptNumber?: string,
  paidDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.record_injaz_payment",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        amount,
        currency,
        ...(receiptNumber ? { receipt_number: receiptNumber } : {}),
        ...(paidDate ? { paid_date: paidDate } : {}),
      },
    }
  );
}

/**
 * Forfeits a missed Injaz slot and restarts with a fresh application attempt.
 * Authoritative Backend Endpoint: clearance_api.forfeit_injaz_and_restart
 */
export async function forfeitInjazAndRestartV2(
  clearanceStepName: string,
  reason: string,
  newAppointmentDate: string,
  newInjazApplicationId: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.clearance_api.forfeit_injaz_and_restart",
    {
      method: "POST",
      body: {
        clearance_step_name: clearanceStepName,
        reason,
        new_appointment_date: newAppointmentDate,
        new_injaz_application_id: newInjazApplicationId,
      },
    }
  );
}

/**
 * Updates Kuwait Police Ashara fields on a Kuwait LMIS Clearance Step.
 */
export async function updateKuwaitPoliceAsharaV2(
  clearanceStepName: string,
  fields: {
    police_ashara_appointment_date?: string;
    police_ashara_status?: "Pending" | "Scheduled" | "Completed" | "Failed" | string;
    police_ashara_amount?: number;
    police_ashara_remark?: string;
    reference_no?: string;
    [key: string]: any;
  }
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2("/api/method/frappe.client.set_value", {
    method: "POST",
    body: {
      doctype: "Clearance Step",
      name: clearanceStepName,
      fieldname: fields,
    },
  });
}

