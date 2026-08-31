/**
 * V2 Applicant Lifecycle API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.applicant_api.create_applicant
 * - POST /api/method/agency_tracking.applicant_api.get_applicant
 * - POST /api/method/agency_tracking.applicant_api.register_applicant
 * - POST /api/method/agency_tracking.applicant_api.update_applicant
 * - POST /api/method/agency_tracking.applicant_api.update_applicant_for_lmis
 * - POST /api/method/agency_tracking.applicant_api.cancel_applicant
 * - POST /api/method/agency_tracking.applicant_api.restart_applicant
 * - POST /api/method/agency_tracking.applicant_api.log_applicant_fee
 * 
 * BLOCKER A NOTE:
 * The Swagger specification lacks an internal staff `list_applicants` endpoint.
 * `listApplicantsV2Adapter` is isolated here with an explicit contract gap marker.
 */

import { requestV2 } from "./client";

export type V2ApplicantLifecycleStatus =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Cancelled";

export interface V2CreateApplicantPayload {
  full_name: string;
  gender: "Male" | "Female" | "Other";
  nationality: string;
  entry_track: "Standard" | "Muayena";
  destination_country?: string;
  [key: string]: any;
}

export interface V2ApplicantDetails {
  name: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender: string;
  nationality: string;
  entry_track: "Standard" | "Muayena";
  status: V2ApplicantLifecycleStatus | string;
  destination_country?: string;
  passport_number?: string;
  phone_number?: string;
  job_applied?: string;
  active_placement?: string;
  cv_file_url?: string;
  photo_passport?: string;
  medical_status?: string;
  cycle_number?: number;
  [key: string]: any;
}

export interface V2LmisUpdatePayload {
  applicant_name: string;
  national_id?: string;
  labor_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  coc_status?: "Pending" | "Issued" | "Not Started";
  exam_date?: string;
}

/**
 * Opens a new Applicant file at Draft status.
 */
export async function createApplicantV2(
  payload: V2CreateApplicantPayload
): Promise<{ name?: string; message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.create_applicant",
    {
      method: "POST",
      body: payload,
    }
  );
}

/**
 * Fetches a single Applicant's full document as a dictionary.
 */
export async function getApplicantV2(
  applicantName: string
): Promise<V2ApplicantDetails> {
  return requestV2<V2ApplicantDetails>(
    "/api/method/agency_tracking.applicant_api.get_applicant",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
}

/**
 * Promotes an Applicant from Draft -> Registered.
 * Field-floor and medical checks are validated server-side.
 */
export async function registerApplicantV2(
  applicantName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.register_applicant",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
}

/**
 * Edits an Applicant at Draft or Registered.
 *destination_country changes are validated against Applicant Country Ban.
 */
export async function updateApplicantV2(
  applicantName: string,
  extraFields?: Record<string, any>,
  overrideBan?: boolean,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.update_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...(extraFields || {}),
        ...(overrideBan ? { override_ban: true, override_reason: overrideReason } : {}),
      },
    }
  );
}

/**
 * LMIS-stage field updates (national_id, labor_id, emergency contact, COC).
 * Narrow allowlisted edit surface for candidate at LMIS clearance step.
 */
export async function updateApplicantForLmisV2(
  payload: V2LmisUpdatePayload
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.update_applicant_for_lmis",
    {
      method: "POST",
      body: payload,
    }
  );
}

/**
 * Cancels an Applicant (global escape hatch from Registered/CV Generated).
 * Freezes active placement and linked clearance steps to Cancelled.
 */
export async function cancelApplicantV2(
  applicantName: string,
  reason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.cancel_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        reason,
      },
    }
  );
}

/**
 * Restarts a Cancelled Applicant back to Draft or Registered.
 * Automatically increments cycle_number.
 */
export async function restartApplicantV2(
  applicantName: string,
  targetStatus: "Draft" | "Registered"
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.restart_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        target_status: targetStatus,
      },
    }
  );
}

/**
 * Manually logs the candidate Registration Fee to the Finance ledger.
 */
export async function logApplicantFeeV2(
  applicantName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.log_applicant_fee",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
}

/**
 * BLOCKER A ADAPTER:
 * Isolated adapter for listing internal applicants.
 * Because `swagger.json` does not provide an authoritative `list_applicants` RPC,
 * this function explicitly identifies the missing contract dependency.
 */
export async function listApplicantsV2Adapter(): Promise<{
  isBlocked: true;
  blockerReason: string;
  data: V2ApplicantDetails[];
}> {
  return {
    isBlocked: true,
    blockerReason: "BLOCKER A: No whitelisted 'list_applicants' RPC endpoint is documented in Swagger v1.0.0.",
    data: [],
  };
}
