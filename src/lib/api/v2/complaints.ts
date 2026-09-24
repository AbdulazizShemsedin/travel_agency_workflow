/**
 * V2 Complaints Desk API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.complaint_api.create_complaint
 * - POST /api/method/agency_tracking.complaint_api.acknowledge_complaint
 * - POST /api/method/agency_tracking.complaint_api.list_unresolved_complaints
 * - POST /api/method/agency_tracking.complaint_api.resolve_complaint
 * - POST /api/method/agency_tracking.report_api.get_complaint_aging_report
 */

import { requestV2 } from "./client";

export type V2ComplaintResolutionStatus =
  | "Resolved"
  | "Returned - Free Replacement Required"
  | "Escalated"
  | "Dismissed";

export interface V2ComplaintRecord {
  name: string;
  display_no?: number;
  placement: string;
  applicant?: string;
  full_name?: string;
  contractor?: string;
  contractor_name?: string;
  status: "New" | "Unresolved" | "Resolved" | "Returned - Free Replacement Required" | "Escalated" | "Dismissed" | string;
  description: string;
  worker_status_at_complaint: string;
  days_unresolved?: number;
  resolution_notes?: string;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

export type V2ComplaintItem = V2ComplaintRecord;

export interface V2ComplaintAgingReport {
  new_count?: number;
  unresolved_count?: number;
  resolved_count?: number;
  aging_breakdown?: Array<{ days: number; count: number }>;
  [key: string]: any;
}

/**
 * Logs a complaint against a placed worker.
 * Explicit placement (or applicant) is required -- no random-placement default.
 */
export async function createComplaintV2(
  placement: string,
  description: string,
  workerStatusAtComplaint: string,
  extra?: { applicant?: string; applicant_name?: string }
): Promise<{ name?: string; message?: string }> {
  return requestV2(
    "/api/method/agency_tracking.complaint_api.create_complaint",
    {
      method: "POST",
      body: {
        placement,
        description,
        worker_status_at_complaint: workerStatusAtComplaint,
        ...(extra?.applicant ? { applicant: extra.applicant } : {}),
        ...(extra?.applicant_name ? { applicant_name: extra.applicant_name } : {}),
      },
    }
  );
}

/**
 * Acknowledges a complaint (New -> Unresolved).
 */
export async function acknowledgeComplaintV2(
  complaintName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.complaint_api.acknowledge_complaint",
    {
      method: "POST",
      body: { complaint_name: complaintName },
    }
  );
}

/**
 * Lists Unresolved complaints, oldest-first.
 */
export async function listUnresolvedComplaintsV2(): Promise<V2ComplaintRecord[]> {
  const result = await requestV2<V2ComplaintRecord[] | { complaints?: V2ComplaintRecord[] }>(
    "/api/method/agency_tracking.complaint_api.list_unresolved_complaints",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).complaints)) return (result as any).complaints;
  return [];
}

/**
 * Resolves a complaint.
 */
export async function resolveComplaintV2(
  complaintName: string,
  newStatus: V2ComplaintResolutionStatus,
  resolutionNotes?: string,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.complaint_api.resolve_complaint",
    {
      method: "POST",
      body: {
        complaint_name: complaintName,
        new_status: newStatus,
        ...(resolutionNotes ? { resolution_notes: resolutionNotes } : {}),
        ...(overrideReason ? { override_reason: overrideReason } : {}),
      },
    }
  );
}

/**
 * Lists freshly-raised complaints (status New), oldest-first -- the triage inbox.
 * RBAC: Complaint Manager / Manager / Admin.
 */
export async function listNewComplaintsV2(): Promise<V2ComplaintRecord[]> {
  const result = await requestV2<V2ComplaintRecord[] | { message?: V2ComplaintRecord[] }>(
    "/api/method/agency_tracking.complaint_api.list_new_complaints",
    { method: "GET" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).message)) return (result as any).message;
  return [];
}

/**
 * Lists all complaints, or a single-status slice (e.g. New, Unresolved, Resolved, Dismissed).
 * Supports pagination params (limit_start, limit_page_length, with_total=1).
 * RBAC: Complaint Manager / Manager / Admin.
 */
export async function listComplaintsV2(
  status?: string,
  limitStart?: number,
  limitPageLength?: number,
  withTotal?: 0
): Promise<V2ComplaintRecord[]>;
export async function listComplaintsV2(
  status: string | undefined,
  limitStart: number | undefined,
  limitPageLength: number | undefined,
  withTotal: 1
): Promise<{ data: V2ComplaintRecord[]; total_count: number }>;
export async function listComplaintsV2(
  status?: string,
  limitStart: number = 0,
  limitPageLength?: number,
  withTotal: number = 0
): Promise<V2ComplaintRecord[] | { data: V2ComplaintRecord[]; total_count: number }> {
  const params = new URLSearchParams();
  if (status && status.trim() && status !== "All") {
    params.set("status", status.trim());
  }
  if (limitStart > 0) {
    params.set("limit_start", String(limitStart));
  }
  if (limitPageLength !== undefined) {
    params.set("limit_page_length", String(limitPageLength));
  }
  if (withTotal) {
    params.set("with_total", "1");
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  const result = await requestV2<any>(
    `/api/method/agency_tracking.complaint_api.list_complaints${query}`,
    { method: "GET" }
  );

  let list: V2ComplaintRecord[] = [];
  if (Array.isArray(result)) list = result;
  else if (result && Array.isArray((result as any).data)) list = (result as any).data;
  else if (result && Array.isArray((result as any).message)) list = (result as any).message;
  else if (result && Array.isArray((result as any).complaints)) list = (result as any).complaints;

  if (withTotal) {
    return {
      data: list,
      total_count: Number(result?.total_count ?? list.length),
    };
  }

  return list;
}
