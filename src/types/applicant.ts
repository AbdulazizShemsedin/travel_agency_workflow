export type Gender = "Male" | "Female";

export type Religion = "Muslim" | "Orthodox" | "Protestant" | "Catholic" | "Other";

export type MaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";

export type HighestEducation =
  | "High School"
  | "Associate Degree"
  | "Bachelor's Degree"
  | "Master's Degree"
  | "Doctorate"
  | "Other";

export type COCStatus = "Pending" | "Issued" | "Not Started";

export type MedicalStatus = "FIT" | "UNFIT" | "Pending";

export type ApplicantState =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Request Pending"
  | "Selected"
  | "Processing"
  | "Embassy/Stamped"
  | "Departed"
  | "Cancelled";

export type ProcessingRoleType =
  | "All Roles / Operations Lead"
  | "LMS Officer"
  | "Wakala Admin"
  | "Injaz Officer";

export interface StreamAssignmentPayload {
  lms_employee_id?: string;
  lms_employee_name?: string;
  injaz_employee_id?: string;
  injaz_employee_name?: string;
  wakala_employee_id?: string;
  wakala_employee_name?: string;
}

export type StreamStatus = "Pending" | "In Progress" | "Completed" | "Rejected";

export interface IncomeExpenseLog {
  transaction_type: "Income" | "Expense";
  amount: number;
  date: string;
  description: string;
}

export interface LMSProcessing {
  status: StreamStatus;
  assigned_employee?: string;
  ticket_pnr?: string;
  flight_number?: string;
  departure_date?: string;
  destination?: string;
  additional_field_1?: string; // e.g. Labor Ministry Clearance Ref
  additional_field_2?: string; // e.g. Transit Visa / Insurance Ref
  completed_at?: string;
  notes?: string;
}

export interface InjazProcessing {
  status: StreamStatus;
  assigned_employee?: string;
  injaz_app_no?: string;
  teashir_fee?: number; // Teashir (Fingerprint) Processing Fee
  biometrics_date?: string;
  biometrics_center?: string;
  completed_at?: string;
  notes?: string;
}

export interface WakalaProcessing {
  status: StreamStatus;
  assigned_employee?: string;
  started_on?: string;
  completed_on?: string;
  request_payment?: boolean;
  request_via?: "WhatsApp" | "Email" | "SMS";
  payment_amount?: number;
  wakala_number?: string;
  sponsor_auth_code?: string;
  foreign_agency_name?: string;
  completed_at?: string;
  notes?: string;
}

export interface ContractorDocument {
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  contractor_name?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  job_title?: string;
  salary?: number;
  selection_status?: "Selected" | "Not Selected" | "Pending Review";
  extracted_at?: string;
  approval_status?: "Pending" | "Approved" | "Rejected";
  notes?: string;
}

export interface EmbassyProcessing {
  submission_date?: string;
  visa_number?: string;
  stamp_date?: string;
  embassy_name?: string;
  status?: "Pending Submission" | "Under Review" | "Stamped" | "Rejected";
  completed_at?: string;
  notes?: string;
}

export interface DepartureInfo {
  flight_number?: string;
  departure_date?: string;
  departure_time?: string;
  airport?: string;
  destination_city?: string;
  marked_by?: string;
  marked_at?: string;
  status?: "Scheduled" | "Departed" | "Delayed" | "Cancelled";
  notes?: string;
}

export interface ApplicantFormData {
  // Stage 1: Mandatory for Draft
  first_name: string;
  last_name: string;
  gender?: Gender | "";
  religion?: Religion | "";
  marital_status?: MaritalStatus | "";
  children: number;
  nationality: string;
  phone_number: string;
  city: string;
  country: string;

  // Stage 2: Required for Registration
  date_of_birth?: string;
  passport_number?: string;
  highest_education?: HighestEducation | "";
  labour_id?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  coc_status?: COCStatus | "";
  exam_date?: string;
  medical_status?: MedicalStatus | "";
  medical_expiry_date?: string;

  // Stage 3: Optional Fields
  middle_name?: string;
  alternate_phone?: string;
  email?: string;
  region?: string;
  sub_region?: string;
  address_line_1?: string;
  national_id?: string;
  passport_expiry?: string;
  institution?: string;
  graduation_year?: number | "";
  current_employer?: string;
  years_of_experience?: number | "";
  remarks?: string;
  medical_remarks?: string;
  education_remarks?: string;

  // Visual/UI context fields from Figma
  fee_required?: boolean;
  registration_fee_amount?: number;
  profile_photo_url?: string;
}

export interface Applicant extends ApplicantFormData {
  name: string; // Identifier e.g. "APP-00001"
  full_name: string;
  applicant_state: ApplicantState;
  registration_date?: string;
  exam_remaining_days?: number;
  medical_remaining_days?: number;
  total_income: number;
  total_expense: number;
  net_balance: number;
  income_expense_logs?: IncomeExpenseLog[];
  cv_record?: string;
  cv_file_url?: string;
  
  // Pipeline stage attachments
  contractor_doc?: ContractorDocument;
  assigned_role_type?: ProcessingRoleType;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  assigned_at?: string;
  
  // Parallel processing streams
  lms_processing?: LMSProcessing;
  injaz_processing?: InjazProcessing;
  wakala_processing?: WakalaProcessing;
  embassy_processing?: EmbassyProcessing;
  departure_info?: DepartureInfo;

  created_at?: string;
  updated_at?: string;
}

export interface BackendResponse<T = unknown> {
  message?: T;
  data?: T;
  exc?: string;
  _server_messages?: string;
}

export interface CVGenerationResponse {
  cv_record: string;
  file_url: string;
  message: string;
}
