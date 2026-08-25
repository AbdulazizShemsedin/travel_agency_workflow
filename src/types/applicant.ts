// Canonical 8-stage progression + Cancelled matching Frappe v15 Backend
export type ApplicantState =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Selected"
  | "Processing"
  | "Stamped"
  | "Ticketed"
  | "Departed"
  | "Cancelled";

export const CANONICAL_STATES: ApplicantState[] = [
  "Draft",
  "Registered",
  "CV Generated",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
];

export const STATE_STEP_MAP: Record<ApplicantState, number> = {
  Draft: 1,
  Registered: 2,
  "CV Generated": 3,
  Selected: 4,
  Processing: 5,
  Stamped: 6,
  Ticketed: 7,
  Departed: 8,
  Cancelled: 0,
};

export const STATE_PROGRESS_MAP: Record<ApplicantState, number> = {
  Draft: 12.5,
  Registered: 25.0,
  "CV Generated": 37.5,
  Selected: 50.0,
  Processing: 62.5,
  Stamped: 75.0,
  Ticketed: 87.5,
  Departed: 100.0,
  Cancelled: 0.0,
};

export type StreamStatus = "Pending" | "In Progress" | "Completed" | "Issued" | "Rejected";

export type ProcessingRoleType =
  | "All Roles / Operations Lead"
  | "LMS Officer"
  | "Injaz Officer"
  | "Wakala Admin"
  | "Embassy Liaison";

export interface StreamAssignmentPayload {
  applicant_names: string[];
  role_type?: ProcessingRoleType;
  employee_id?: string;
  stream_assignments?: {
    lms?: string;
    injaz?: string;
    wakala?: string;
  };
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

export interface ApplicantDossier {
  name: string;
  applicant: string;
  contract_request?: string;
  file_attachment?: string;
  attached_file?: string;
  file_name?: string;
  contractor_name?: string;
  contract_number?: string;
  visa_number?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  sponsor_phone?: string;
  job_title?: string;
  salary?: number;
  currency?: string;
  contract_period?: string;
  destination_city?: string;
  destination_country?: string;
  selection_status?: string;
  parsed_at?: string;
  approval_status?: "Pending" | "Approved" | "Rejected";
  notes?: string;
}

export interface LMSClearance {
  name: string;
  dsr?: string;
  applicant: string;
  status: "Pending" | "Issued" | "Rejected";
  employee?: string;
  issued_on?: string;
  ticket_pnr?: string;
  flight_number?: string;
  departure_date?: string;
  destination?: string;
  additional_field_1?: string;
  additional_field_2?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface WakalaClearance {
  name: string;
  dsr?: string;
  applicant: string;
  status: "Pending" | "Completed";
  employee?: string;
  wakala_number?: string;
  sponsor_auth_code?: string;
  foreign_agency_name?: string;
  started_on?: string;
  completed_on?: string;
  request_payment?: boolean;
  request_via?: "WhatsApp" | "Email" | "SMS";
  payment_amount?: number;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface InjazClearance {
  name: string;
  dsr?: string;
  applicant: string;
  status: "Pending" | "Completed";
  employee?: string;
  injaz_app_no?: string;
  teashir_fee?: number;
  biometrics_date?: string;
  biometrics_center?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface DSRStamp {
  name?: string;
  dsr?: string;
  applicant: string;
  visa_number?: string;
  stamped_date?: string;
  embassy_reference?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface DSRTicket {
  name?: string;
  dsr?: string;
  applicant: string;
  ticket_pnr?: string;
  flight_number?: string;
  departure_date?: string;
  destination?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface EmbassyClearance {
  name?: string;
  applicant: string;
  status: "Pending" | "Submitted" | "Approved" | "Rejected";
  submission_date?: string;
  approval_date?: string;
  visa_number?: string;
  employee?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface TelesignClearance {
  name?: string;
  applicant: string;
  status: "Pending" | "Verified" | "Rejected";
  verification_date?: string;
  caller_agent?: string;
  employee?: string;
  audio_recording_url?: string;
  notes?: string;
}

export interface DSRDeparture {
  name?: string;
  dsr?: string;
  applicant: string;
  flight_number?: string;
  departure_date?: string;
  departure_time?: string;
  airport?: string;
  destination_city?: string;
  medical_2_result?: "Pass" | "Fail";
  medical_2_remarks?: string;
  notes?: string;
  financials?: IncomeExpenseLog[];
}

export interface DSR {
  name: string;
  applicant: string;
  dossier?: string;
  status: "Active" | "Stamped" | "Ticketed" | "Departed" | "Cancelled";
  lms_clearance?: string;
  wakala_clearance?: string;
  injaz_clearance?: string;
  financials?: IncomeExpenseLog[];
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
  skill_cleaning?: boolean | string;
  skill_cooking?: boolean | string;
  skill_washing?: boolean | string;
  skill_ironing?: boolean | string;
  skill_baby_sitting?: boolean | string;
  skill_baby_care?: boolean | string;
  skill_children_care?: boolean | string;
  skill_arabic_cooking?: boolean | string;
  skill_elder_care?: boolean | string;
  skill_elderly_care?: boolean | string;
  skill_driving?: boolean | string;
  skill_sewing?: boolean | string;
  remarks?: string;
  medical_remarks?: string;
  education_remarks?: string;

  // Financial & Registration Fees
  fee_required?: boolean;
  registration_fee_amount?: number;

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

  // Assigned employee compatibility
  assigned_role_type?: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  assigned_at?: string;

  // Financial logs
  income_expense_logs?: IncomeExpenseLog[];

  // Linked clearances and entities
  contract_request?: ContractRequest;
  lms_processing?: LMSClearance;
  wakala_processing?: WakalaClearance;
  injaz_processing?: InjazClearance;
  contractor_doc?: ApplicantDossier;
  dsr_stamp?: DSRStamp;
  dsr_ticket?: DSRTicket;
  departure_info?: DSRDeparture;

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
  experience_country?: string;
  experience_period?: string;
  religion?: string;
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

export type ComplaintSeverity = "Critical" | "High" | "Medium" | "Low";
export type ComplaintStatus = "Open" | "In Progress" | "Resolved" | "Closed" | string;

export interface AgencyComplaint {
  name: string; // e.g. "COMP-00015"
  contractor: string;
  applicant: string;
  full_name?: string;
  passport_number?: string;
  complaint_category:
    | "Medical Refusal / Unfit on Arrival"
    | "Refusal to Work / Runaway"
    | "Worker Incompetence / Skill Mismatch"
    | "Legal / Law Enforcement Violation"
    | "Passport / Documentation Error"
    | "Other";
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  days_unresolved?: number;
  complaint_details: string;
  attachment?: string;
  resolution_notes?: string;
  outcome?:
    | "Returned / Free Replacement Required"
    | "Resolved via Mediation"
    | "Contract Terminated with Sponsor"
    | "Worker Transferred"
    | "Dismissed / Invalid Claim"
    | string;
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

