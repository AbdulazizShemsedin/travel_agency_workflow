// Canonical 9-stage progression + Cancelled matching Frappe v15 Backend
export type ApplicantState =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Request Pending"
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
  "Request Pending",
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
  "Request Pending": 4,
  Selected: 5,
  Processing: 6,
  Stamped: 7,
  Ticketed: 8,
  Departed: 9,
  Cancelled: 0,
};

export const STATE_PROGRESS_MAP: Record<ApplicantState, number> = {
  Draft: 11.1,
  Registered: 22.2,
  "CV Generated": 33.3,
  "Request Pending": 44.4,
  Selected: 55.6,
  Processing: 66.7,
  Stamped: 77.8,
  Ticketed: 88.9,
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
  file_name?: string;
  contractor_name?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  job_title?: string;
  salary?: number;
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

  // Stage 2: Registration KYC & Medical
  date_of_birth?: string;
  age?: number;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  place_of_issue?: string;
  job_applied?: string;
  highest_education?: string;
  labour_id?: string;
  national_id?: string;
  place_of_birth?: string;
  leaving_town?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
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

  // CV Record
  cv_record?: string;
  cv_file_url?: string;
  cv_record_data?: CVRecord;

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

