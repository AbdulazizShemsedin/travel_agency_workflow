/**
 * V2 Clearance Grid API (#11)
 *
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.clearance_grid.get_clearance_grid_columns
 * - POST /api/method/agency_tracking.clearance_grid.list_clearance_grid
 * - POST /api/method/agency_tracking.clearance_grid.save_clearance_grid
 */

import { requestV2 } from "./client";

export type ClearanceGridStepType =
  | "LMIS Clearance"
  | "Kuwait LMIS"
  | "Taeshir"
  | "Telesign"
  | "Embassy"
  | "Kuwait Embassy";

export interface ClearanceGridColumn {
  name: string;
  label: string;
  type?: "string" | "select" | "date" | "boolean" | "number";
  editable: boolean;
  options?: string[]; // Forward-moves only for status
  width?: number;
}

export interface ClearanceGridRow {
  name: string;
  modified: string;
  applicant: string;
  applicant_name?: string;
  passport_number?: string;
  destination_country?: string;
  step_type: ClearanceGridStepType | string;
  status: string;
  assigned_to?: string;
  assigned_name?: string;
  reference_no?: string;
  rejection_remark?: string;
  date_completed?: string;
  // Step-specific fields
  injaz_application_id?: string;
  injaz_appointment_date?: string;
  injaz_payment_status?: "Paid" | "Unpaid" | string;
  injaz_paid_date?: string;
  wakala_status?: "Pending" | "Paid" | string;
  wakala_reference_no?: string;
  police_ashara_status?: "Pending" | "Scheduled" | "Completed" | "Failed" | string;
  police_ashara_appointment_date?: string;
  police_ashara_remark?: string;
  [key: string]: any;
}

export interface ClearanceGridChange {
  name: string;
  modified: string;
  fields: Record<string, any>;
  override_reason?: string;
}

export interface ClearanceGridSaveResult {
  ok: boolean;
  row?: ClearanceGridRow;
  error?: string;
  field?: string;
  conflict?: boolean;
}

export interface ClearanceGridListResponse {
  data: ClearanceGridRow[];
  total_count: number;
}

/**
 * Fetches column definitions for a clearance grid step type with user-specific editable flags.
 */
export async function getClearanceGridColumnsV2(
  stepType: ClearanceGridStepType | string
): Promise<ClearanceGridColumn[]> {
  const res = await requestV2<
    ClearanceGridColumn[] | { message?: ClearanceGridColumn[] | { columns?: ClearanceGridColumn[] } }
  >("/api/method/agency_tracking.clearance_grid.get_clearance_grid_columns", {
    method: "POST",
    body: { step_type: stepType },
  });

  if (Array.isArray(res)) return res;
  if (res && "message" in res) {
    if (Array.isArray(res.message)) return res.message;
    if (res.message && Array.isArray((res.message as any).columns)) {
      return (res.message as any).columns;
    }
  }
  return [];
}

/**
 * Lists clearance grid rows with optional status, search, and pagination.
 */
export async function listClearanceGridV2(
  stepType: ClearanceGridStepType | string,
  options?: {
    status?: string;
    search?: string;
    limit_start?: number;
    limit_page_length?: number;
    with_total?: number;
    include_closed?: number;
  }
): Promise<ClearanceGridListResponse> {
  const body: Record<string, any> = {
    step_type: stepType,
    with_total: options?.with_total ?? 1,
    limit_start: options?.limit_start ?? 0,
    limit_page_length: Math.min(Math.max(options?.limit_page_length ?? 50, 1), 500),
  };
  if (options?.status) body.status = options.status;
  if (options?.search) body.search = options.search;
  if (options?.include_closed !== undefined) body.include_closed = options.include_closed;

  const res = await requestV2<any>(
    "/api/method/agency_tracking.clearance_grid.list_clearance_grid",
    {
      method: "POST",
      body,
    }
  );

  const payload = res?.message ?? res;
  if (payload && Array.isArray(payload.data)) {
    return {
      data: payload.data,
      total_count: Number(payload.total_count ?? payload.data.length),
    };
  }
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total_count: payload.length,
    };
  }
  return { data: [], total_count: 0 };
}

/**
 * Batch saves changes to clearance grid rows (up to 200 rows per call).
 * Sends only changed cells and keeps modified timestamp for concurrency validation.
 */
export async function saveClearanceGridV2(
  changes: ClearanceGridChange[]
): Promise<ClearanceGridSaveResult[]> {
  if (!changes || changes.length === 0) return [];
  const cappedChanges = changes.slice(0, 200);

  const res = await requestV2<any>(
    "/api/method/agency_tracking.clearance_grid.save_clearance_grid",
    {
      method: "POST",
      body: { changes: cappedChanges },
    }
  );

  const payload = res?.message ?? res;
  if (Array.isArray(payload)) {
    return payload as ClearanceGridSaveResult[];
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results as ClearanceGridSaveResult[];
  }
  return [];
}
