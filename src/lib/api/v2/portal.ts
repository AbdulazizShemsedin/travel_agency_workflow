/**
 * V2 Foreign Agency Portal API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.portal_api.list_portal_candidates
 * - POST /api/method/agency_tracking.portal_api.select_candidate
 * - POST /api/method/agency_tracking.portal_api.list_my_wakala_requests
 */

import { requestV2 } from "./client";
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";

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
  if (isDemoMode()) {
    const candidates = demoStore.getApplicants().filter(
      (a) => (a.applicant_state === "CV Generated" || a.applicant_state === "Registered") && !a.active_placement
    );
    return candidates.map((a) => ({
      name: a.name,
      applicant_name: a.full_name || a.first_name,
      full_name: a.full_name || a.first_name,
      gender: a.gender,
      age: a.age,
      nationality: a.nationality || "Ethiopian",
      job_applied: a.target_job,
      destination_country: a.destination_country,
      photo_passport: a.photo_url || "/placeholder-user.jpg",
      religion: a.religion,
      experience_period: `${a.experience_years || 0} years`,
    }));
  }

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
  if (isDemoMode()) {
    const res = demoStore.selectCandidate(applicantName, "CON-001");
    return {
      placement_name: res.placement.name,
      status: "Selected",
      message: `Candidate ${applicantName} selected successfully. Placement ${res.placement.name} generated.`,
    };
  }

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
  if (isDemoMode()) {
    return [];
  }

  const result = await requestV2<V2WakalaRequestItem[] | { requests?: V2WakalaRequestItem[] }>(
    "/api/method/agency_tracking.portal_api.list_my_wakala_requests",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).requests)) return (result as any).requests;
  return [];
}
