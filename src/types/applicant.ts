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
  | "Contract Requested"
  | "Dossier Submitted"
  | "Processing"
  | "Stamped"
  | "Ticketed"
  | "Departed"
  | "Cancelled";

export interface IncomeExpenseLog {
  transaction_type: "Income" | "Expense";
  amount: number;
  date: string;
  description: string;
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
