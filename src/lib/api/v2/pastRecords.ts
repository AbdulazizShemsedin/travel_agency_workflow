/**
 * V2 Past Records API — Historical Worker Entry & History
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.past_records_api.get_past_record_form
 * - POST /api/method/agency_tracking.past_records_api.create_past_record
 * - POST /api/method/agency_tracking.past_records_api.list_past_records
 * - POST /api/method/agency_tracking.past_records_api.get_past_record
 * - POST /api/method/agency_tracking.past_records_api.undo_past_record
 */

import { requestV2 } from "./client";

export interface V2PastRecordFormConfig {
  stages: string[];
  stage_date_fields?: Record<string, string>;
  entry_tracks: string[];
  corridors: Array<{
    destination_country: string;
    steps?: Array<{
      step_type: string;
      title?: string;
      sequence_index?: number;
      [key: string]: any;
    }>;
    [key: string]: any;
  }>;
  agencies: Array<{
    name: string;
    contractor_name: string;
    country?: string;
    default_rate?: number;
    currency?: string;
    [key: string]: any;
  }>;
  currencies?: string[];
  fee_types?: string[];
  commission_rates?: Array<{
    contractor: string;
    destination_country: string;
    rate: number;
    currency: string;
    entry_track?: string;
    gender?: string;
  }>;
  case_fields?: string[];
  step_fields?: string[];
  injaz_fields?: string[];
  [key: string]: any;
}

export interface V2PastRecordWorkerPayload {
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender: "Male" | "Female" | string;
  entry_track: "Standard" | "Muayena" | string;
  destination_country: string;
  passport_number: string;
  date_of_birth?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  place_of_issue?: string;
  place_of_birth?: string;
  photo_passport?: string;
  passport_scan?: string;
  national_id?: string;
  labour_id?: string;
  nationality?: string;
  phone?: string;
  [key: string]: any;
}

export interface V2PastRecordDatesPayload {
  registered_on: string;
  cv_generated_on?: string;
  selected_on?: string;
  processing_started_on?: string;
  stamped_on?: string;
  ticketed_on?: string;
  departed_on?: string;
  [key: string]: any;
}

export interface V2PastRecordCasePayload {
  contractor: string;
  contract_number?: string;
  contract_date?: string;
  contract_file?: string;
  visa_number?: string;
  visa_date?: string;
  visa_file?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  sponsor_phone?: string;
  sponsor_address?: string;
  ticket_number?: string;
  flight_date?: string;
  flight_time?: string;
  airline?: string;
  ticketing_remarks?: string;
  medical_result?: string;
  medical_date?: string;
  medical_2_result?: string;
  medical_2_date?: string;
  [key: string]: any;
}

export interface V2PastRecordStepPayload {
  step_type: string;
  status: "Pending" | "In Progress" | "Completed" | string;
  date_started?: string;
  date_submitted?: string;
  date_completed?: string;
  reference_no?: string;
  remarks?: string;
  lmis_status?: string;
  taeshir_status?: string;
  wakala_status?: string;
  police_ashara_status?: string;
  injaz?: {
    appointment_date?: string;
    injaz_application_id?: string;
    injaz_amount?: number;
    injaz_currency?: string;
    paid_date?: string;
    receipt_number?: string;
    remark?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface V2PastRecordFeePayload {
  fee_type: string;
  amount: number;
  currency: string;
  paid_on?: string;
  description?: string;
  [key: string]: any;
}

export interface V2PastRecordCommissionPayload {
  contractor?: string;
  amount?: number;
  currency?: string;
  rate?: number;
  notes?: string;
  [key: string]: any;
}

export interface V2PastRecordCreatePayload {
  worker: V2PastRecordWorkerPayload;
  stage: string;
  dates: V2PastRecordDatesPayload;
  case?: V2PastRecordCasePayload;
  steps?: V2PastRecordStepPayload[];
  fees?: V2PastRecordFeePayload[];
  commission?: V2PastRecordCommissionPayload;
}

export interface V2PastRecordItem {
  name: string;
  worker_name?: string;
  full_name?: string;
  passport_number?: string;
  destination_country?: string;
  entry_track?: string;
  stage_reached: string;
  status: "Saved" | "Undone" | string;
  entered_by?: string;
  entered_on?: string;
  creation?: string;
  undone_by?: string;
  undone_on?: string;
  undo_reason?: string;
  undo_blocked_by?: string[];
  applicant?: string;
  placement?: string;
  [key: string]: any;
}

/**
 * Fetches configuration for past record entry form.
 */
export async function getPastRecordFormV2(): Promise<V2PastRecordFormConfig> {
  const result = await requestV2<V2PastRecordFormConfig | { message: V2PastRecordFormConfig }>(
    "/api/method/agency_tracking.past_records_api.get_past_record_form",
    { method: "POST" }
  );

  if (result && "message" in result && (result as any).message) {
    return (result as any).message;
  }
  return result as V2PastRecordFormConfig;
}

/**
 * Creates a complete historical worker record atomically.
 */
export async function createPastRecordV2(
  payload: V2PastRecordCreatePayload
): Promise<{ name?: string; message?: string; applicant?: string; placement?: string; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.past_records_api.create_past_record",
    {
      method: "POST",
      body: payload,
    }
  );
}

/**
 * Lists past record entries with optional filtering.
 */
export async function listPastRecordsV2(params?: {
  status?: string;
  entered_by?: string;
  limit?: number;
  start?: number;
}): Promise<V2PastRecordItem[]> {
  const result = await requestV2<V2PastRecordItem[] | { message: V2PastRecordItem[] }>(
    "/api/method/agency_tracking.past_records_api.list_past_records",
    {
      method: "POST",
      body: params || {},
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).message)) return (result as any).message;
  return [];
}

/**
 * Gets a single past record details by internal record name.
 */
export async function getPastRecordV2(pastRecordName: string): Promise<V2PastRecordItem | null> {
  const result = await requestV2<V2PastRecordItem | { message: V2PastRecordItem }>(
    "/api/method/agency_tracking.past_records_api.get_past_record",
    {
      method: "POST",
      body: { past_record: pastRecordName },
    }
  );

  if (result && "message" in result && (result as any).message) {
    return (result as any).message;
  }
  return result as V2PastRecordItem;
}

/**
 * Irreversibly undoes a past record.
 */
export async function undoPastRecordV2(
  pastRecordName: string,
  reason: string
): Promise<{ message?: string; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.past_records_api.undo_past_record",
    {
      method: "POST",
      body: {
        past_record: pastRecordName,
        reason,
      },
    }
  );
}
