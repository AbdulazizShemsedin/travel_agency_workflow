/**
 * Processing Module Types — Contract-First
 *
 * Authoritative source: backend-contract/doctypes/*.json
 * DO NOT add fields that are not in the contract.
 *
 * Read path:
 *   Applicant → Applicant Dossier (via applicant) → DSR (via applicant_dossier)
 *     → LMS Clearance, Injaz Clearance, Wakala Clearance,
 *       Embassy Clearance, Telesign Clearance,
 *       DSR Stamp, DSR Ticket, DSR Departure (all via dsr)
 */

import type { IncomeExpenseLog } from "./applicant";

// ---------------------------------------------------------------------------
// Contract RBAC Roles (from RBAC.md)
// ---------------------------------------------------------------------------
export type ContractRole =
  | "System Manager"
  | "Administrator"
  | "Agency Admin"
  | "Recruiter"
  | "Clearance Officer"
  | "Accounts Officer"
  | "Applicant Viewer"
  | "Guest";

// ---------------------------------------------------------------------------
// DSR — Daily Status Report (from DSR.json)
// ---------------------------------------------------------------------------
export interface DSRRecord {
  name: string;
  applicant_dossier: string;
  destination_country?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  sponsor_name?: string;
  contractor_name?: string;
  agency?: string;
  // Progress status fields (read-only, backend-populated)
  lms_status?: string;
  wakala_status?: string;
  injaz_status?: string;
  telesign_status?: string;
  embassy_status?: string;
  stamp_status?: string;
  ticket_status?: string;
  departure_status?: string;
  // Manager override
  manager_override?: number;
  override_by?: string;
  override_at?: string;
  override_reason?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  // Timestamps
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// LMS Clearance (from LMS_Clearance.json)
// Status: Pending | Issued | Rejected
// ---------------------------------------------------------------------------
export interface LMSClearanceRecord {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Issued" | "Rejected";
  issued_on?: string;
  employee?: string;
  // Missing data request
  missing_data_requested?: number;
  missing_data_type?: string;
  missing_data_requested_at?: string;
  missing_data_status?: "Pending" | "Received";
  missing_data_notes?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Injaz Clearance (from Injaz_Clearance.json)
// Status: Pending | Completed
// ---------------------------------------------------------------------------
export interface InjazClearanceRecord {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  employee?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Wakala Clearance (from Wakala_Clearance.json)
// Status: Pending | Completed
// ---------------------------------------------------------------------------
export interface WakalaClearanceRecord {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  employee?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Embassy Clearance (from Embassy_Clearance.json)
// Status: Pending | Submitted | Approved | Rejected
// ---------------------------------------------------------------------------
export interface EmbassyClearanceRecord {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  destination_country?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Submitted" | "Approved" | "Rejected";
  submission_date?: string;
  approval_date?: string;
  // Fee
  fee_status?: "Unpaid" | "Paid";
  fee_amount?: number;
  fee_currency?: string;
  receipt_no?: string;
  payment_date?: string;
  // Assignment
  employee?: string;
  remarks?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Telesign Clearance (from Telesign_Clearance.json)
// Status: Pending | In Progress | Authenticated | Completed | Failed
// ---------------------------------------------------------------------------
export interface TelesignClearanceRecord {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "In Progress" | "Authenticated" | "Completed" | "Failed";
  employee?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// DSR Stamp (from DSR_Stamp.json)
// Status: Pending | Completed
// ---------------------------------------------------------------------------
export interface DSRStampRecord {
  name: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  stamp_number: string;
  stamp_date: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// DSR Ticket (from DSR_Ticket.json)
// Status: Pending | Booked | Cancelled
// ---------------------------------------------------------------------------
export interface DSRTicketRecord {
  name: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Booked" | "Cancelled";
  ticket_number: string;
  ticket_details?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// DSR Departure (from DSR_Departure.json)
// Status: Pending | Departed | Cancelled
// ---------------------------------------------------------------------------
export interface DSRDepartureRecord {
  name: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Departed" | "Cancelled";
  departure_time: string;
  // Medical 2 (Pre-Departure)
  medical_2_result?: "Pass" | "Fail" | "";
  medical_2_date?: string;
  medical_2_remark?: string;
  // Financials
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// Aggregated Processing Data (result of the full read path)
// ---------------------------------------------------------------------------
export interface ProcessingData {
  /** The Applicant Dossier linked to the applicant */
  dossier: {
    name: string;
    applicant: string;
    contract_request?: string;
    attached_file?: string;
    is_parsed?: number;
    contract_number?: string;
    visa_number?: string;
    sponsor_name?: string;
    sponsor_id?: string;
    telephone?: string;
    contractor_name?: string;
    agency?: string;
    amount_detail?: number;
    contract_duration?: string;
    contract_date?: string;
    contract_end_date?: string;
    profession?: string;
  } | null;

  /** The DSR record linked to the dossier */
  dsr: DSRRecord | null;

  /** Clearance streams linked to the DSR */
  lms: LMSClearanceRecord | null;
  injaz: InjazClearanceRecord | null;
  wakala: WakalaClearanceRecord | null;
  embassy: EmbassyClearanceRecord | null;
  telesign: TelesignClearanceRecord | null;

  /** Deployment records linked to the DSR */
  stamp: DSRStampRecord | null;
  ticket: DSRTicketRecord | null;
  departure: DSRDepartureRecord | null;
}

/** Stream identifiers for assignment UI */
export type ProcessingStream =
  | "lms"
  | "injaz"
  | "wakala"
  | "embassy"
  | "telesign"
  | "stamp"
  | "ticket"
  | "departure";

/** Maps stream key to the DocType name for API calls */
export const STREAM_DOCTYPE_MAP: Record<ProcessingStream, string> = {
  lms: "LMS Clearance",
  injaz: "Injaz Clearance",
  wakala: "Wakala Clearance",
  embassy: "Embassy Clearance",
  telesign: "Telesign Clearance",
  stamp: "DSR Stamp",
  ticket: "DSR Ticket",
  departure: "DSR Departure",
};
