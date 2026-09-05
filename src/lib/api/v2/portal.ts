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

  let list: V2PortalCandidate[] = [];
  if (Array.isArray(result)) {
    list = result;
  } else if (result && Array.isArray((result as any).candidates)) {
    list = (result as any).candidates;
  } else if (result && Array.isArray((result as any).message)) {
    list = (result as any).message;
  }

  return list.map((cand) => {
    let computedAge = Number(cand.age) || 0;
    if (!computedAge && cand.date_of_birth) {
      const birth = new Date(cand.date_of_birth);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age > 0) computedAge = age;
      }
    }
    return {
      ...cand,
      age: computedAge || cand.age,
      photo_passport:
        cand.photo_passport ||
        (cand as any).photograph ||
        (cand as any).photo ||
        (cand as any).profile_photo_url ||
        "",
      photo_full_body:
        cand.photo_full_body ||
        (cand as any).photo_portrait ||
        (cand as any).full_body_photo ||
        "",
    };
  });
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
 * Lists pending Musaned Wakala authorization requests for the current foreign agency.
 */
export async function listMyWakalaRequestsV2(): Promise<V2WakalaRequestItem[]> {
  const result = await requestV2<V2WakalaRequestItem[] | { requests?: V2WakalaRequestItem[] }>(
    "/api/method/agency_tracking.portal_api.list_my_wakala_requests",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).requests)) return (result as any).requests;
  return [];
}
