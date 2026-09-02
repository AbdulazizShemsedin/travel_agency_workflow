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
 */
export async function createComplaintV2(
  placement: string,
  description: string,
  workerStatusAtComplaint: string
): Promise<{ name?: string; message?: string }> {
  return requestV2(
    "/api/method/agency_tracking.complaint_api.create_complaint",
    {
      method: "POST",
      body: {
        placement,
        description,
        worker_status_at_complaint: workerStatusAtComplaint,
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
