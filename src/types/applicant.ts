// Canonical progression stages + Cancelled
// Individual operational clearance stages: LMIS, Te'shir, Embassy/Wakala
export type ApplicantState =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Request Pending"
  | "Selected"
  | "LMIS"
  | "Te'shir"
  | "Embassy/Wakala"
  | "Processing"
  | "Stamped"
  | "Ticketed"
  | "Departed"
  | "Cancelled";

// Ordered progression stages (excluding Cancelled)
export const CANONICAL_STATES: ApplicantState[] = [
  "Draft",
  "Registered",
  "CV Generated",
  "Selected",
  "LMIS",
  "Te'shir",
  "Embassy/Wakala",
  "Ticketed",
  "Departed",
];

export const STATE_STEP_MAP: Record<string, number> = {
  Draft: 1,
  Registered: 2,
  "CV Generated": 3,
  "Request Pending": 4,
  Selected: 4,
  LMIS: 5,
  "Te'shir": 6,
  "Embassy/Wakala": 7,
  Processing: 5,
  Stamped: 7,
  Ticketed: 8,
  Departed: 9,
  Cancelled: 0,
};

export const STATE_PROGRESS_MAP: Record<string, number> = {
  Draft: 10,
  Registered: 20,
  "CV Generated": 35,
  "Request Pending": 45,
  Selected: 50,
  LMIS: 62,
  "Te'shir": 75,
  "Embassy/Wakala": 88,
  Processing: 62,
  Stamped: 88,
  Ticketed: 95,
  Departed: 100,
  Cancelled: 0,
};

export function resolveApplicantStage(
  applicant: { applicant_state?: string; status?: string; [key: string]: any },
  placement?: { status?: string; corridor_state?: string; [key: string]: any } | null,
  clearanceSteps?: { step_type?: string; status?: string; payment_status?: string }[]
): string {
  const raw = applicant?.applicant_state || applicant?.status || "Draft";

  if (raw === "Draft") return "Draft";
  if (raw === "Registered") return "Registered";
  if (raw === "CV Generated") return "CV Generated";
  if (raw === "Request Pending") return "Request Pending";
  if (raw === "Departed" || placement?.status === "Departed") return "Departed";
  if (raw === "Ticketed" || placement?.status === "Ticketed") return "Ticketed";
  if (raw === "Stamped" || placement?.status === "Stamped") return "Embassy/Wakala";
  if (raw === "Cancelled") return "Cancelled";
  if (raw === "LMIS" || raw === "Te'shir" || raw === "Embassy/Wakala" || raw === "Wakala") {
    return raw === "Wakala" ? "Embassy/Wakala" : raw;
  }

  // If candidate is undergoing clearance:
  if (clearanceSteps && clearanceSteps.length > 0) {
    const lms = clearanceSteps.find((s) => (s.step_type || "").toLowerCase().includes("lmis") || (s.step_type || "").toLowerCase().includes("lms"));
    const inj = clearanceSteps.find((s) => (s.step_type || "").toLowerCase().includes("taeshir") || (s.step_type || "").toLowerCase().includes("injaz") || (s.step_type || "").toLowerCase().includes("telesign"));
    const emb = clearanceSteps.find((s) => (s.step_type || "").toLowerCase().includes("embassy"));

    const isLmsDone = lms?.status === "Completed" || lms?.status === "Issued" || lms?.status === "Approved" || lms?.status === "Complete";
    const isInjDone = inj?.status === "Completed" || inj?.status === "Issued" || inj?.status === "Approved" || inj?.status === "Complete" || inj?.payment_status === "Paid";
    const isEmbDone = emb?.status === "Stamped" || emb?.status === "Completed" || emb?.status === "Approved" || emb?.status === "Issued";

    // Both parallel steps are done:
    if (isLmsDone && isInjDone) {
      if (isEmbDone) {
        if (placement?.status === "Ticketed" || raw === "Ticketed") return "Ticketed";
        if (placement?.status === "Departed" || raw === "Departed") return "Departed";
        return "Embassy/Wakala";
      }
      return "Embassy/Wakala";
    }

    if (!isLmsDone && !isInjDone) return "LMIS";
    if (!isLmsDone) return "LMIS";
    if (!isInjDone) return "Te'shir";
    return "Embassy/Wakala";
  }

  if (raw === "Processing" || placement?.status === "Processing") return "LMIS";

  return raw;
}

export interface IncomeExpenseLog {
  name?: string;
  transaction_type: "Income" | "Expense";
  type?: "Income" | "Expense";
  amount: number;
  date: string;
  description?: string;
  applicant?: string;
  source_doctype?: string;
  creation?: string;
}

export interface Contractor {
  name: string;
  company_name: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  whatsapp_phone?: string;
  active_status?: number;
  status?: "Active" | "Inactive";
  default_commission_amount?: number;
  default_commission_currency?: string;
  notes?: string;
}

export interface ContractRequest {
  name: string;
  applicant: string;
  applicant_name?: string;
  cv_record?: string;
  contractor: string;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Cancelled";
  whatsapp_message_id?: string;
  whatsapp_url?: string;
  whatsapp_api_sent?: boolean;
  sent_at?: string;
  notes?: string;
}

// Authoritative: backend-contract/doctypes/Applicant_Dossier.json
export interface ApplicantDossier {
  name: string;
  applicant: string;
  contract_request?: string;
  contract_status?: string;
  destination_country?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  nationality?: string;
  passport_number?: string;
  cv_record?: string;
  cv_status?: string;
  attached_file?: string;
  is_parsed?: number;
  contract_number?: string;
  visa_number?: string;
  contract_date?: string;
  contract_end_date?: string;
  contract_duration?: string;
  contract_period?: string;
  amount_detail?: number;
  salary?: number;
  currency?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  telephone?: string;
  sponsor_phone?: string;
  employer_street?: string;
  employer_city?: string;
  destination_city?: string;
  employer_mobile?: string;
  contractor_name?: string;
  recruiting_agency_license?: string;
  agency?: string;
  profession?: string;
  job_title?: string;
  working_place?: string;
  period_of_employment?: string;
  status?: "Draft" | "Submitted" | "Approved" | "Rejected" | "Cancelled";
  approval_status?: "Pending" | "Approved" | "Rejected";
  selection_status?: string;
  parsed_at?: string;
  file_attachment?: string;
  file_name?: string;
  notes?: string;
}

// Authoritative: backend-contract/doctypes/LMS_Clearance.json
export interface LMSClearance {
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
  missing_data_requested?: number;
  missing_data_type?: string;
  missing_data_requested_at?: string;
  missing_data_status?: "Pending" | "Received";
  missing_data_notes?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/Wakala_Clearance.json
export interface WakalaClearance {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  employee?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/Injaz_Clearance.json
export interface InjazClearance {
  name: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  employee?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/DSR_Stamp.json
export interface DSRStamp {
  name?: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Completed";
  stamp_number: string;
  stamp_date: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/DSR_Ticket.json
export interface DSRTicket {
  name?: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Booked" | "Cancelled";
  ticket_number: string;
  ticket_details?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/Embassy_Clearance.json
export interface EmbassyClearance {
  name?: string;
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
  fee_status?: "Unpaid" | "Paid";
  fee_amount?: number;
  fee_currency?: string;
  receipt_no?: string;
  payment_date?: string;
  employee?: string;
  remarks?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/Telesign_Clearance.json
export interface TelesignClearance {
  name?: string;
  dsr: string;
  applicant_dossier?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "In Progress" | "Authenticated" | "Completed" | "Failed";
  employee?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/DSR_Departure.json
export interface DSRDeparture {
  name?: string;
  dsr: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  status: "Pending" | "Departed" | "Cancelled";
  departure_time: string;
  medical_2_result?: "Pass" | "Fail" | "";
  medical_2_date?: string;
  medical_2_remark?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// Authoritative: backend-contract/doctypes/DSR.json
export interface DSR {
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
  // Progress status fields (read-only)
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
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

export interface Applicant {
  name: string;
  applicant_type?: "Standard" | "Muayena";
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  gender: "Male" | "Female" | "";
  religion: "Muslim" | "Orthodox" | "Protestant" | "Catholic" | "Other" | "";
  marital_status: "Single" | "Married" | "Divorced" | "Widowed" | "";
  children: number;
  nationality: string;
  phone_number: string;
  alternate_phone?: string;
  email?: string;
  city: string;
  country: string;
  region?: string;
  sub_region?: string;
  address_line_1?: string;
  applicant_address?: string;

  // Stage 2: Registration KYC & Medical
  date_of_birth?: string;
  age?: number;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  place_of_issue?: string;
  job_applied?: string;
  destination_country?: string;
  highest_education?: string;
  education?: string;
  labour_id?: string;
  national_id?: string;
  place_of_birth?: string;
  leaving_town?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_relation?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_relationship?: string;
  next_of_kin_name?: string;
  next_of_kin_contact?: string;
  next_of_kin_relationship?: string;
  coc_status?: string;
  exam_date?: string;
  exam_remaining_days?: number;
  medical_status?: "FIT" | "UNFIT" | "Pending" | "";
  medical_expiry_date?: string;
  medical_remaining_days?: number;

  // Photos & Scans
  profile_photo_url?: string;
  photo_passport?: string;
  photo_full_body?: string;
  passport_scan?: string;

  monthly_salary?: string;
  height?: string;
  weight?: string;
  complexion?: string;
  institution?: string;
  graduation_year?: number;
  current_employer?: string;
  years_of_experience?: number;
  english_level?: string;
  arabic_level?: string;
  experience_country?: string;
  experience_period?: string;
  skill_cleaning?: boolean | string | number;
  skill_cooking?: boolean | string | number;
  skill_washing?: boolean | string | number;
  skill_ironing?: boolean | string | number;
  skill_baby_sitting?: boolean | string | number;
  skill_baby_care?: boolean | string | number;
  skill_children_care?: boolean | string | number;
  skill_arabic_cooking?: boolean | string | number;
  skill_elder_care?: boolean | string | number;
  skill_elderly_care?: boolean | string | number;
  skill_driving?: boolean | string | number;
  skill_sewing?: boolean | string | number;
  remarks?: string;
  medical_remarks?: string;
  education_remarks?: string;

  // Financial & Registration Fees
  fee_required?: boolean;
  registration_fee_amount?: number;

  // Musaned Pre-Registration (Saudi Corridor Requirement)
  is_uploaded_to_musaned?: number | boolean;
  musaned_reference_no?: string;
  musaned_status?: "Not Registered" | "Pending Verification" | "Registered" | "Rejected";
  musaned_uploaded_at?: string;
  musaned_registered_by?: string;

  // State Machine & Accounting
  applicant_state: ApplicantState;
  state_step?: number | string;
  state_progress?: number;
  registration_date?: string;
  total_income: number;
  total_expense: number;
  net_balance: number;

  // CV Record & Contractor Reservation
  cv_record?: string;
  cv_file_url?: string;
  cv_record_data?: CVRecord;
  locked_contractor?: string | null;
  selected_by?: string | null;

  // Cancellation metadata
  cancel_remarks?: string;
  cancelled_at?: string;
  cancelled_by?: string;

  // Financial logs
  income_expense_logs?: IncomeExpenseLog[];

  // Linked entities (read via separate API calls, NOT embedded on Applicant)
  contract_request?: ContractRequest;
  contractor_doc?: ApplicantDossier;

  // Timestamps
  creation?: string;
  modified?: string;
  updated_at?: string;
}

export interface AccountingSummaryResponse {
  total_income: number;
  total_expense: number;
  net_balance: number;
  transaction_count?: number;
  by_stage: {
    stage: string;
    income: number;
    expense: number;
    net: number;
    count?: number;
  }[];
  by_fee_type?: Record<string, number>;
  per_applicant?: {
    applicant: string;
    income: number;
    expense: number;
    net: number;
    applicant_name?: string;
  }[];
  recent_transactions: IncomeExpenseLog[];
}

export interface CVRecord {
  name: string;
  applicant: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  template?: string;
  generated_by?: string;
  generated_date?: string;
  file_attachment?: string;
  version?: number;
  status?: string;
  contract_request?: string;
  has_contract_request?: number;
  contract_request_status?: string;
  nationality?: string;
  religion?: string;
  marital_status?: string;
  children?: number;
  age?: number;
  gender?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  leaving_town?: string;
  height?: string;
  weight?: string;
  complexion?: string;
  photo_passport?: string;
  photo_full_body?: string;
  passport_scan?: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  place_of_issue?: string;
  national_id?: string;
  labour_id?: string;
  job_applied?: string;
  monthly_salary?: string;
  highest_education?: string;
  english_level?: string;
  arabic_level?: string;
  experience_country?: string;
  experience_period?: string;
  skill_cleaning?: string;
  skill_washing?: string;
  skill_ironing?: string;
  skill_baby_sitting?: string;
  skill_children_care?: string;
  skill_cooking?: string;
  skill_arabic_cooking?: string;
  skill_sewing?: string;
  skill_elderly_care?: string;
  email?: string;
  phone_number?: string;
  remarks?: string;
  financials?: IncomeExpenseLog[];
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// 10. AGENCY PORTAL & CANDIDATE DISCOVERY TYPES
// ---------------------------------------------------------------------------

export interface PortalAvailableCandidate {
  name: string; // e.g. "APP-00012"
  applicant_id?: string;
  full_name: string;
  gender: "Male" | "Female" | string;
  age: number;
  date_of_birth?: string;
  nationality: string;
  destination_country: string;
  job_applied: string;
  monthly_salary?: number | string;
  photo_passport?: string;
  photo_full_body?: string;
  skill_cleaning?: number | string | boolean;
  skill_cooking?: number | string | boolean;
  skill_arabic_cooking?: number | string | boolean;
  skill_baby_sitting?: number | string | boolean;
  skill_washing?: number | string | boolean;
  skill_ironing?: number | string | boolean;
  skill_elderly_care?: number | string | boolean;
  skill_driving?: number | string | boolean;
  experience_country?: string;
  experience_period?: string;
  religion?: string;
  place_of_birth?: string;
  leaving_town?: string;
  marital_status?: string;
  complexion?: string;
  passport_number?: string;
  cv_file_url?: string;
  selected_at?: string;
  selected_by?: string;
}

export interface PortalSelectCandidateResponse {
  status: "success" | "error";
  applicant_id: string;
  contractor: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 11. FOREIGN AGENCY COMPLAINTS DESK TYPES
// ---------------------------------------------------------------------------

export const COMPLAINT_CATEGORIES = [
  "Salary Delay / Non-Payment",
  "Food & Nutrition",
  "Living Conditions / Accommodation",
  "Physical / Verbal Abuse",
  "Excessive Work Hours / Overwork",
  "Medical Illness",
  "Runaway / Refusal to Work",
  "Repatriation Request",
  "Other",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number] | string;
export const COMPLAINT_SEVERITIES = [
  "Normal",
  "High",
  "Critical / Emergency",
] as const;

export type ComplaintSeverity = (typeof COMPLAINT_SEVERITIES)[number] | string;

export const COMPLAINT_STATUSES = [
  "Open",
  "Under Investigation",
  "Resolved",
  "Returned / Free Replacement Required",
  "Escalated to MoL / Embassy",
  "Dismissed / Closed",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number] | string;

export const COMPLAINT_OUTCOMES = [
  "Resolved",
  "Returned / Free Replacement Required",
  "Escalated",
  "Dismissed",
] as const;

export type ComplaintOutcome = (typeof COMPLAINT_OUTCOMES)[number] | string;

export interface AgencyComplaint {
  name: string; // e.g. "CMP-00001"
  contractor: string;
  applicant: string;
  full_name?: string;
  passport_number?: string;
  complaint_category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  days_unresolved?: number;
  complaint_details: string;
  attachment?: string;
  assigned_officer?: string;
  resolution_notes?: string;
  outcome?: ComplaintOutcome;
  return_date?: string;
  replacement_applicant?: string;
  creation?: string;
  modified?: string;
}

// ---------------------------------------------------------------------------
// 12. OPERATIONS & EXECUTIVE REPORTING TYPES
// ---------------------------------------------------------------------------

export interface OperationsSummaryResponse {
  period?: {
    from_date: string;
    to_date: string;
  };
  intake: {
    new_applicants: number;
    standard: number;
    muayena: number;
    muslim: number;
    non_muslim: number;
    cvs_generated: number;
    dossiers_created: number;
  };
  medical: {
    fit: number;
    unfit: number;
  };
  clearances: {
    lms_issued: number;
    stamped: number;
    tickets_booked: number;
    departed: number;
  };
  complaints: {
    new_logged: number;
    resolved: number;
    open_backlog: number;
  };
  selections: {
    selected_today: number;
    ksa_pipeline: number;
    kuwait_pipeline: number;
  };
}

// ---------------------------------------------------------------------------
// 13. PASSPORT MRZ OCR EXTRACTION TYPES
// ---------------------------------------------------------------------------

export interface PassportOCRResponse {
  status: "success" | "error" | string;
  data: {
    passport_number?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: "Male" | "Female" | string;
    passport_expiry?: string;
    passport_issue_date?: string;
    place_of_issue?: string;
    raw_mrz?: string;
  };
  message?: string;
}

// ---------------------------------------------------------------------------
// 14. AGENCY PORTAL CONTEXT & PIPELINE TYPES
// ---------------------------------------------------------------------------

export interface AgencyContextResponse {
  user: string;
  full_name: string;
  roles: string[];
  is_internal_staff: boolean;
  contractor: {
    name: string;
    company_name: string;
    country: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    default_commission_amount?: number;
    default_commission_currency?: string;
    active_status?: number;
  };
  vapid_public_key?: string;
  portal_stats?: {
    available_candidates: number;
    my_selected_candidates: number;
    open_complaints: number;
    contractor: string;
  };
}

export interface AgencyPipelineCandidate {
  name: string;
  full_name: string;
  gender: string;
  age: number;
  passport_number: string;
  job_applied: string;
  destination_country: string;
  photo_passport?: string;
  applicant_state: string;
  dossier_name?: string;
  sponsor_name?: string;
  visa_number?: string;
  contract_date?: string;
  contract_duration?: string;
  airline?: string;
  flight_number?: string;
  flight_date?: string;
  route?: string;
  ticket_status?: string;
  departure_time?: string;
  departure_status?: string;
  cv_file_url?: string;
  contractor?: string;
}

export interface UnpaidCommissionSummary {
  total_departed: number;
  agreed_rate: number;
  total_outstanding: number;
  currency: string;
  contractor?: string;
}

export interface UnpaidCommissionCandidate {
  name: string;
  full_name: string;
  passport_number: string;
  departure_date: string;
  destination_country: string;
  sponsor_name?: string;
  rate: number;
  currency: string;
}

export interface CommissionLedgerItem {
  name: string;
  full_name: string;
  passport_number: string;
  job_applied: string;
  destination_country: string;
  contractor: string;
  contractor_name?: string;
  applicant_state: string;
  departure_date?: string;
  flight_number?: string;
  commission_status: "Pending" | "Invoiced" | "Paid" | "Waived" | "Disputed" | string;
  commission_amount: number;
  commission_currency: string;
  commission_paid_date?: string;
  commission_batch_ref?: string;
  is_replacement?: number | boolean;
  religion?: string;
  place_of_birth?: string;
  marital_status?: string;
  gender?: string;
  creation?: string;
}

export interface CommissionSummaryStats {
  total_departed: number;
  total_outstanding_amount: number;
  total_paid_amount: number;
  currency: string;
  total_contractors_count: number;
  unpaid_count: number;
  paid_count: number;
}

// Authoritative Musaned Payload & Response Interfaces
export interface UpdateMusanedStatusPayload {
  applicant: string;
  is_uploaded_to_musaned?: number | boolean;
  musaned_reference_no?: string;
  musaned_status?: "Not Registered" | "Pending Verification" | "Registered" | "Rejected";
}

export interface UpdateMusanedStatusResponse {
  status?: string;
  message?: string;
  musaned_uploaded_at?: string;
  musaned_registered_by?: string;
  can_generate_cv?: boolean;
  applicant?: Partial<Applicant>;
}

