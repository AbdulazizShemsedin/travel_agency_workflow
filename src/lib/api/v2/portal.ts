/**
 * V2 Foreign Agency Portal API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.portal_api.list_portal_candidates
 * - POST /api/method/agency_tracking.portal_api.select_candidate
 * - POST /api/method/agency_tracking.portal_api.list_my_wakala_requests
 */

import { requestV2 } from "./client";

/**
 * Candidate item presented on Foreign Agency marketplace.
 * Note: Non-PII fields only per backend specification.
 */
export interface V2PortalCandidate {
  name: string;
  applicant_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  age?: number;
  nationality?: string;
  job_applied?: string;
  destination_country?: string;
  experience_period?: string;
  experience_country?: string;
  prior_experience_country?: string;
  prior_experience_duration?: string;
  photo_passport?: string;
  photo_full_body?: string;
  cv_file_url?: string;
  religion?: string;
  arabic_level?: string;
  english_level?: string;
  complexion?: string;
  marital_status?: string;
  children?: number;
  monthly_salary?: string | number;
  [key: string]: any;
}

export interface V2SelectCandidateResponse {
  placement_name?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

export interface V2WakalaRequestItem {
  clearance_step_name: string;
  placement_name?: string;
  applicant_name?: string;
  full_name?: string;
  passport_number?: string;
  status?: string;
  creation?: string;
  due_date?: string;
  [key: string]: any;
}

/**
 * Browses standard-track CV Generated candidates available for foreign agency selection.
 */
export async function listPortalCandidatesV2(): Promise<V2PortalCandidate[]> {
  const result = await requestV2<V2PortalCandidate[] | { candidates?: V2PortalCandidate[] }>(
    "/api/method/agency_tracking.portal_api.list_portal_candidates",
    { method: "POST" }
  );

  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray((result as any).candidates)) {
    return (result as any).candidates;
  }
  return [];
}

/**
 * Selects a candidate (creates an atomic, row-locked Placement).
 */
export async function selectCandidateV2(
  applicantName: string,
  freeReplacementForComplaint?: string
): Promise<V2SelectCandidateResponse> {
  return requestV2<V2SelectCandidateResponse>(
    "/api/method/agency_tracking.portal_api.select_candidate",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...(freeReplacementForComplaint ? { free_replacement_for_complaint: freeReplacementForComplaint } : {}),
      },
    }
  );
}

/**
 * Lists unpaid Wakala-bearing Embassy steps for the agency's own placements.
 */
export async function listMyWakalaRequestsV2(): Promise<V2WakalaRequestItem[]> {
  const result = await requestV2<V2WakalaRequestItem[]>(
    "/api/method/agency_tracking.portal_api.list_my_wakala_requests",
    { method: "POST" }
  );

  return Array.isArray(result) ? result : [];
}
