import { Applicant, ApplicantFormData } from "@/types/applicant";
import { calculateRemainingDays, deriveFullName } from "@/lib/validations/applicant.schema";

// In-memory store for development/testing
let applicantCounter = 1251;

const mockApplicants: Map<string, Applicant> = new Map([
  [
    "APP-2024-1250",
    {
      name: "APP-2024-1250",
      first_name: "Ahmed",
      middle_name: "Ali",
      last_name: "Muhammed",
      full_name: "Ahmed Ali Muhammed",
      gender: "Male",
      religion: "Muslim",
      marital_status: "Married",
      children: 2,
      nationality: "Ethiopia",
      phone_number: "+251912131415",
      city: "Addis Ababa",
      country: "Ethiopia",
      region: "Oromia",
      sub_region: "Bole",
      address_line_1: "House 456, St. 22",
      date_of_birth: "1994-05-12",
      passport_number: "A12345678",
      passport_expiry: "2029-05-12",
      highest_education: "Bachelor's Degree",
      institution: "Addis Ababa University",
      graduation_year: 2018,
      current_employer: "Care Global Hospital",
      years_of_experience: 5,
      labour_id: "LBR-998822",
      contact_person_name: "Fatima Muhammed",
      contact_person_phone: "+251911889900",
      coc_status: "Issued",
      exam_date: "2026-09-15",
      exam_remaining_days: 32,
      medical_status: "FIT",
      medical_expiry_date: "2026-11-20",
      medical_remaining_days: 98,
      applicant_state: "Processing",
      registration_date: "2024-05-05",
      fee_required: true,
      registration_fee_amount: 500,
      total_income: 5000,
      total_expense: 1200,
      net_balance: 3800,
      remarks: "Candidate is ready for deployment.",
      education_remarks: "Certified general practitioner credentials verified.",
      medical_remarks: "FIT - All biological tests clear.",
      cv_record: "CV-2024-001",
      cv_file_url: "/private/files/CV-APP-2024-1250.pdf",
    },
  ],
  [
    "APP-2024-1249",
    {
      name: "APP-2024-1249",
      first_name: "Ali",
      middle_name: "",
      last_name: "Ahmed",
      full_name: "Ali Ahmed",
      gender: "Male",
      religion: "Muslim",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251922334455",
      city: "Dire Dawa",
      country: "Ethiopia",
      date_of_birth: "1998-08-20",
      passport_number: "B23456789",
      highest_education: "Associate Degree",
      labour_id: "LBR-334411",
      contact_person_name: "Ahmed Ali",
      contact_person_phone: "+251933445566",
      coc_status: "Pending",
      exam_date: "2026-08-28",
      exam_remaining_days: 14,
      medical_status: "FIT",
      medical_expiry_date: "2026-08-25",
      medical_remaining_days: 11,
      applicant_state: "Registered",
      registration_date: "2024-05-04",
      total_income: 3000,
      total_expense: 500,
      net_balance: 2500,
    },
  ],
  [
    "APP-2024-1248",
    {
      name: "APP-2024-1248",
      first_name: "Tesfaye",
      middle_name: "Mulugeta",
      last_name: "Bekele",
      full_name: "Tesfaye Mulugeta Bekele",
      gender: "Male",
      religion: "Orthodox",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251911445566",
      city: "Hawassa",
      country: "Ethiopia",
      applicant_state: "Draft",
      total_income: 0,
      total_expense: 0,
      net_balance: 0,
    },
  ],
]);

export function getAllApplicants(): Applicant[] {
  return Array.from(mockApplicants.values()).sort((a, b) =>
    (b.created_at || b.name).localeCompare(a.created_at || a.name)
  );
}

export function getApplicantById(id: string): Applicant | undefined {
  return mockApplicants.get(id);
}

export function saveApplicantDraft(data: ApplicantFormData): Applicant {
  const newId = `APP-2026-${String(applicantCounter++).padStart(4, "0")}`;
  const fullName = deriveFullName(data.first_name, data.middle_name, data.last_name);
  const examDays = calculateRemainingDays(data.exam_date);
  const medicalDays = calculateRemainingDays(data.medical_expiry_date);

  const newApplicant: Applicant = {
    ...data,
    name: newId,
    full_name: fullName,
    applicant_state: "Draft",
    registration_date: new Date().toISOString().split("T")[0],
    exam_remaining_days: examDays,
    medical_remaining_days: medicalDays,
    total_income: data.registration_fee_amount || 0,
    total_expense: 0,
    net_balance: data.registration_fee_amount || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockApplicants.set(newId, newApplicant);
  return newApplicant;
}

export function updateApplicant(id: string, data: Partial<ApplicantFormData>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) {
    throw new Error(`Applicant ${id} not found.`);
  }

  const updated: Applicant = {
    ...existing,
    ...data,
    full_name: deriveFullName(
      data.first_name || existing.first_name,
      data.middle_name !== undefined ? data.middle_name : existing.middle_name,
      data.last_name || existing.last_name
    ),
    exam_remaining_days:
      data.exam_date !== undefined
        ? calculateRemainingDays(data.exam_date)
        : existing.exam_remaining_days,
    medical_remaining_days:
      data.medical_expiry_date !== undefined
        ? calculateRemainingDays(data.medical_expiry_date)
        : existing.medical_remaining_days,
    updated_at: new Date().toISOString(),
  };

  mockApplicants.set(id, updated);
  return updated;
}

export function registerApplicantInStore(id: string): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) {
    throw new Error(`Applicant ${id} not found.`);
  }

  // Authoritative backend check: missing required fields
  const missing: string[] = [];
  if (!existing.date_of_birth) missing.push("Date of Birth");
  if (!existing.passport_number) missing.push("Passport Number");
  if (!existing.highest_education) missing.push("Highest Education Level");
  if (!existing.labour_id) missing.push("Labour ID");
  if (!existing.contact_person_name) missing.push("Contact Person Name");
  if (!existing.contact_person_phone) missing.push("Contact Person Phone");
  if (!existing.coc_status) missing.push("COC Status");
  if (!existing.exam_date) missing.push("COC Exam Date");
  if (!existing.medical_status) missing.push("Medical Status");
  if (!existing.medical_expiry_date) missing.push("Medical Expiration Date");

  if (missing.length > 0) {
    const errorMsg = `Missing required field(s): ${missing.join(", ")}`;
    const err = new Error(errorMsg);
    (err as unknown as { serverMessages: string[] }).serverMessages = [errorMsg];
    throw err;
  }

  if (existing.medical_status === "UNFIT") {
    const errorMsg = "Applicant cannot be registered while medical status is UNFIT.";
    const err = new Error(errorMsg);
    (err as unknown as { serverMessages: string[] }).serverMessages = [errorMsg];
    throw err;
  }

  existing.applicant_state = "Registered";
  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function generateCVInStore(id: string) {
  const existing = mockApplicants.get(id);
  if (!existing) {
    throw new Error(`Applicant ${id} not found.`);
  }

  if (existing.applicant_state === "Draft") {
    throw new Error("CV can only be generated for Registered applicants.");
  }

  const cvId = `CV-${id.replace("APP-", "")}`;
  existing.applicant_state = "CV Generated";
  existing.cv_record = cvId;
  existing.cv_file_url = `/private/files/CV-${id}-${cvId}.pdf`;
  existing.updated_at = new Date().toISOString();

  return {
    cv_record: cvId,
    file_url: existing.cv_file_url,
    message: `CV generated successfully: ${cvId}`,
  };
}
