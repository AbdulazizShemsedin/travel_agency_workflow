import {
  Applicant,
  ApplicantState,
  Contractor,
  ContractRequest,
  ApplicantDossier,
  LMSClearance,
  WakalaClearance,
  InjazClearance,
  DSRStamp,
  DSRTicket,
  DSRDeparture,
  AccountingSummaryResponse,
} from "@/types/applicant";
import { BaseApplicantFormValues, deriveFullName, calculateRemainingDays } from "@/lib/validations/applicant.schema";

let applicantCounter = 1255;
let contractorCounter = 10;
let contractRequestCounter = 100;
let dossierCounter = 100;

export const mockEmployeesList = [
  { id: "EMP-001", name: "Abebe Kebede", role: "Operations Lead", email: "abebe@agency.et", roleType: "All Roles / Operations Lead" },
  { id: "EMP-002", name: "Sara Mohammed", role: "LMS Specialist", email: "sara@agency.et", roleType: "LMS Officer" },
  { id: "EMP-003", name: "Tigist Alemu", role: "Wakala Administrator", email: "tigist@agency.et", roleType: "Wakala Admin" },
  { id: "EMP-004", name: "Dawit Haile", role: "Injaz & Biometrics Officer", email: "dawit@agency.et", roleType: "Injaz Officer" },
  { id: "EMP-005", name: "Khadija Omar", role: "LMS & Departure Officer", email: "khadija@agency.et", roleType: "LMS Officer" },
];

// Mock Contractors
export const mockContractors: Map<string, Contractor> = new Map([
  [
    "Al Qurashi Recruitment Office",
    {
      name: "CTR-0001",
      company_name: "Al Qurashi Recruitment Office",
      country: "Saudi Arabia",
      contact_person: "Sheikh Tariq Al-Qurashi",
      phone: "+966501234567",
      email: "contracts@alqurashi.sa",
      whatsapp_phone: "+966501234567",
      status: "Active",
    },
  ],
  [
    "Al-Khaleej International Manpower Co.",
    {
      name: "CTR-0002",
      company_name: "Al-Khaleej International Manpower Co.",
      country: "Saudi Arabia",
      contact_person: "Fahad Abdullah Al-Ghamdi",
      phone: "+966559876543",
      email: "recruitment@alkhaleej.sa",
      whatsapp_phone: "+966559876543",
      status: "Active",
    },
  ],
  [
    "Gulf Horizons Agency",
    {
      name: "CTR-0003",
      company_name: "Gulf Horizons Agency",
      country: "United Arab Emirates",
      contact_person: "Omar Al-Mansoor",
      phone: "+971509988776",
      email: "visa@gulfhorizons.ae",
      whatsapp_phone: "+971509988776",
      status: "Active",
    },
  ],
]);

// Mock Contract Requests
export const mockContractRequests: Map<string, ContractRequest> = new Map();

// Mock Applicant Dossiers
export const mockDossiers: Map<string, ApplicantDossier> = new Map();

// Mock Clearances
export const mockLmsClearances: Map<string, LMSClearance> = new Map();
export const mockWakalaClearances: Map<string, WakalaClearance> = new Map();
export const mockInjazClearances: Map<string, InjazClearance> = new Map();

// Mock Applicants Seed Data
export const mockApplicants: Map<string, Applicant> = new Map([
  [
    "APP-00001",
    {
      name: "APP-00001",
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
      passport_number: "EP1234567",
      passport_issue_date: "2024-05-10",
      passport_expiry: "2029-05-12",
      place_of_issue: "Addis Ababa",
      job_applied: "Hospitality & Service Specialist",
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
      state_step: 6,
      state_progress: 66.7,
      registration_date: "2024-05-05",
      total_income: 5000,
      total_expense: 1200,
      net_balance: 3800,
      remarks: "Candidate is ready for deployment.",
      education_remarks: "Certified general practitioner credentials verified.",
      medical_remarks: "FIT - All biological tests clear.",
      cv_record: "CV-00001",
      cv_file_url: "/private/files/CV-APP-00001-CV-00001.pdf",
      lms_processing: {
        name: "LMS-00001",
        applicant: "APP-00001",
        status: "Issued",
        employee: "sara@agency.et",
        issued_on: "2024-05-12",
        ticket_pnr: "ET-8839201",
        flight_number: "ET-402",
        departure_date: "2026-09-28",
        destination: "Riyadh (RUH)",
        additional_field_1: "MOL-CLEARANCE-9941",
        additional_field_2: "INS-MED-2026-441",
        notes: "Clearance issued by Ministry.",
      },
      injaz_processing: {
        name: "INJ-00001",
        applicant: "APP-00001",
        status: "Completed",
        employee: "dawit@agency.et",
        injaz_app_no: "INJ-7788412",
        teashir_fee: 140,
        biometrics_date: "2026-08-20",
        biometrics_center: "Teashir VFS Global Addis Ababa",
        notes: "Biometrics completed and endorsed.",
      },
      wakala_processing: {
        name: "WAK-00001",
        applicant: "APP-00001",
        status: "Completed",
        employee: "tigist@agency.et",
        started_on: "2024-05-14",
        completed_on: "2024-05-15",
        request_payment: true,
        request_via: "WhatsApp",
        payment_amount: 500,
        wakala_number: "WAK-9921448",
        sponsor_auth_code: "ENJAZ-SA-8812",
        foreign_agency_name: "Al-Khaleej International Manpower Co.",
        notes: "Wakala power of attorney delegation verified on Musaned.",
      },
      contractor_doc: {
        name: "DOSSIER-00001",
        applicant: "APP-00001",
        file_name: "Saudi_Contract_Ahmed_Ali.pdf",
        contractor_name: "Al-Khaleej International Manpower Co.",
        sponsor_name: "Sheikh Fahad Abdullah Al-Ghamdi",
        sponsor_id: "NAT-SA-10884920",
        job_title: "Hospitality & Service Specialist",
        salary: 2400,
        selection_status: "Selected",
        approval_status: "Approved",
        parsed_at: "2024-05-08T10:00:00Z",
      },
      income_expense_logs: [
        {
          name: "TXN-001",
          transaction_type: "Income",
          amount: 5000,
          date: "2024-05-05",
          description: "Initial registration and placement deposit",
        },
        {
          name: "TXN-002",
          transaction_type: "Expense",
          amount: 1200,
          date: "2024-05-08",
          description: "Teashir biometric and medical assessment fee",
        },
      ],
    },
  ],
  [
    "APP-00002",
    {
      name: "APP-00002",
      first_name: "Fatima",
      middle_name: "Hassan",
      last_name: "Ali",
      full_name: "Fatima Hassan Ali",
      gender: "Female",
      religion: "Muslim",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251922334455",
      city: "Dire Dawa",
      country: "Ethiopia",
      date_of_birth: "1998-08-20",
      passport_number: "EP2345678",
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
      applicant_state: "Selected",
      state_step: 5,
      state_progress: 55.6,
      registration_date: "2024-05-04",
      total_income: 3000,
      total_expense: 500,
      net_balance: 2500,
      cv_record: "CV-00002",
      cv_file_url: "/private/files/CV-APP-00002-CV-00002.pdf",
    },
  ],
]);

// ---------------------------------------------------------------------------
// APPLICANT STORE HANDLERS
// ---------------------------------------------------------------------------

export function getAllApplicantsFromStore(): Applicant[] {
  return Array.from(mockApplicants.values());
}

export function getApplicantFromStore(id: string): Applicant | undefined {
  return mockApplicants.get(id);
}

export function createDraftInStore(formData: BaseApplicantFormValues): Applicant {
  const newId = `APP-${String(applicantCounter++).padStart(5, "0")}`;
  const fullName = deriveFullName(formData.first_name, formData.middle_name, formData.last_name);

  const newApplicant: Applicant = {
    ...(formData as any),
    name: newId,
    full_name: fullName,
    applicant_state: "Draft",
    state_step: 1,
    state_progress: 11.1,
    registration_date: new Date().toISOString().split("T")[0],
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    income_expense_logs: [],
    creation: new Date().toISOString(),
    modified: new Date().toISOString(),
  };

  mockApplicants.set(newId, newApplicant);
  return newApplicant;
}

export function updateDraftInStore(id: string, formData: Partial<Applicant>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) {
    throw new Error(`Applicant ${id} not found.`);
  }

  const updated: Applicant = {
    ...existing,
    ...formData,
    full_name: deriveFullName(
      formData.first_name || existing.first_name,
      formData.middle_name !== undefined ? formData.middle_name : existing.middle_name,
      formData.last_name || existing.last_name
    ),
    modified: new Date().toISOString(),
  };

  mockApplicants.set(id, updated);
  return updated;
}

export function registerApplicantInStore(id: string): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) {
    throw new Error(`Applicant ${id} not found.`);
  }

  // Validate Stage 2 KYC/Medical requirements
  const missing: string[] = [];
  if (!existing.date_of_birth) missing.push("Date of Birth");
  if (!existing.passport_number) missing.push("Passport Number");
  if (!existing.highest_education) missing.push("Highest Education Level");
  if (!existing.medical_status) missing.push("Medical Status");
  if (!existing.medical_expiry_date) missing.push("Medical Expiration Date");

  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  if (existing.medical_status === "UNFIT") {
    throw new Error("Applicant cannot be registered while medical status is UNFIT.");
  }

  existing.applicant_state = "Registered";
  existing.state_step = 2;
  existing.state_progress = 22.2;
  existing.modified = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function generateCVInStore(id: string) {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  if (existing.applicant_state === "Draft") {
    throw new Error("CV can only be generated for Registered applicants.");
  }

  const cvId = `CV-${id.replace("APP-", "")}`;
  existing.applicant_state = "CV Generated";
  existing.state_step = 3;
  existing.state_progress = 33.3;
  existing.cv_record = cvId;
  existing.cv_file_url = `/private/files/CV-${id}-${cvId}.pdf`;
  existing.modified = new Date().toISOString();

  return {
    cv_record: cvId,
    file_url: existing.cv_file_url,
    message: `CV generated successfully: ${cvId}`,
  };
}

export function sendContractRequestInStore(contractRequestName: string) {
  let cr = mockContractRequests.get(contractRequestName);
  const applicantId = contractRequestName.replace("CR-", "APP-");
  const targetApplicantId = mockApplicants.has(applicantId) ? applicantId : "APP-00001";

  if (!cr) {
    cr = {
      name: contractRequestName,
      applicant: targetApplicantId,
      contractor: "Al Qurashi Recruitment Office",
      status: "Sent",
      whatsapp_message_id: `WAM-${Date.now()}`,
      whatsapp_url: `https://api.whatsapp.com/send?phone=966501234567&text=Candidate%20CV`,
      whatsapp_api_sent: true,
      sent_at: new Date().toISOString(),
    };
    mockContractRequests.set(contractRequestName, cr);
  } else {
    cr.status = "Sent";
    cr.whatsapp_api_sent = true;
    cr.sent_at = new Date().toISOString();
  }

  const applicant = mockApplicants.get(cr.applicant);
  if (applicant) {
    applicant.applicant_state = "Request Pending";
    applicant.state_step = 4;
    applicant.state_progress = 44.4;
  }

  return {
    status: "success" as const,
    message: `Contract Request ${contractRequestName} successfully sent to contractor via WhatsApp.`,
    whatsapp_url: cr.whatsapp_url,
    whatsapp_api_sent: true,
    contract_request: cr,
  };
}

export function parseDossierFileInStore(dossierName: string) {
  let dossier = mockDossiers.get(dossierName);
  const applicantId = dossierName.replace("DOSSIER-", "APP-");
  const targetApplicantId = mockApplicants.has(applicantId) ? applicantId : "APP-00001";

  if (!dossier) {
    dossier = {
      name: dossierName,
      applicant: targetApplicantId,
      contractor_name: "Al-Khaleej International Manpower Co.",
      sponsor_name: "Sheikh Fahad Abdullah Al-Ghamdi",
      sponsor_id: "NAT-SA-10884920",
      job_title: "Hospitality & Service Specialist",
      salary: 2400,
      selection_status: "Selected",
      approval_status: "Approved",
      parsed_at: new Date().toISOString(),
    };
    mockDossiers.set(dossierName, dossier);
  }

  const applicant = mockApplicants.get(dossier.applicant);
  if (applicant) {
    applicant.contractor_doc = dossier;
    applicant.applicant_state = "Selected";
    applicant.state_step = 5;
    applicant.state_progress = 55.6;

    // Auto-create clearance stubs
    if (!applicant.lms_processing) {
      applicant.lms_processing = {
        name: `LMS-${applicant.name.replace("APP-", "")}`,
        applicant: applicant.name,
        status: "Pending",
      };
    }
    if (!applicant.wakala_processing) {
      applicant.wakala_processing = {
        name: `WAK-${applicant.name.replace("APP-", "")}`,
        applicant: applicant.name,
        status: "Pending",
        started_on: new Date().toISOString().split("T")[0],
        request_payment: true,
        request_via: "WhatsApp",
        payment_amount: 500,
      };
    }
    if (!applicant.injaz_processing) {
      applicant.injaz_processing = {
        name: `INJ-${applicant.name.replace("APP-", "")}`,
        applicant: applicant.name,
        status: "Pending",
        teashir_fee: 140,
      };
    }
  }

  return {
    status: "success",
    message: "File successfully parsed and candidate transitioned to Selected.",
    dossier,
    extracted_data: {
      contractor_name: dossier.contractor_name,
      sponsor_name: dossier.sponsor_name,
      sponsor_id: dossier.sponsor_id,
      job_title: dossier.job_title,
      salary: dossier.salary,
    },
  };
}

export function updateLmsClearanceInStore(name: string, data: Partial<LMSClearance>): LMSClearance {
  const applicantId = data.applicant || name.replace("LMS-", "APP-");
  let applicant = mockApplicants.get(applicantId) || Array.from(mockApplicants.values()).find(
    (a) => a.lms_processing?.name === name || a.name === data.applicant
  );
  if (applicant) {
    if (!applicant.lms_processing) {
      applicant.lms_processing = { name, applicant: applicant.name, status: "Pending" };
    }
    applicant.lms_processing = { ...applicant.lms_processing, ...data };
    if (applicant.applicant_state === "Selected") {
      applicant.applicant_state = "Processing";
      applicant.state_step = 6;
      applicant.state_progress = 66.7;
    }
    return applicant.lms_processing;
  }
  return { name, applicant: data.applicant || "APP-00001", status: data.status || "Issued", ...data };
}

export function updateWakalaClearanceInStore(name: string, data: Partial<WakalaClearance>): WakalaClearance {
  const applicantId = data.applicant || name.replace("WAK-", "APP-");
  let applicant = mockApplicants.get(applicantId) || Array.from(mockApplicants.values()).find(
    (a) => a.wakala_processing?.name === name || a.name === data.applicant
  );
  if (applicant) {
    if (!applicant.wakala_processing) {
      applicant.wakala_processing = { name, applicant: applicant.name, status: "Pending" };
    }
    applicant.wakala_processing = { ...applicant.wakala_processing, ...data };
    if (applicant.applicant_state === "Selected") {
      applicant.applicant_state = "Processing";
      applicant.state_step = 6;
      applicant.state_progress = 66.7;
    }
    return applicant.wakala_processing;
  }
  return { name, applicant: data.applicant || "APP-00001", status: data.status || "Completed", ...data };
}

export function updateInjazClearanceInStore(name: string, data: Partial<InjazClearance>): InjazClearance {
  const applicantId = data.applicant || name.replace("INJ-", "APP-");
  let applicant = mockApplicants.get(applicantId) || Array.from(mockApplicants.values()).find(
    (a) => a.injaz_processing?.name === name || a.name === data.applicant
  );
  if (applicant) {
    if (!applicant.injaz_processing) {
      applicant.injaz_processing = { name, applicant: applicant.name, status: "Pending" };
    }
    applicant.injaz_processing = { ...applicant.injaz_processing, ...data };
    if (applicant.applicant_state === "Selected") {
      applicant.applicant_state = "Processing";
      applicant.state_step = 6;
      applicant.state_progress = 66.7;
    }
    return applicant.injaz_processing;
  }
  return { name, applicant: data.applicant || "APP-00001", status: data.status || "Completed", ...data };
}

export function submitDsrStampInStore(data: Partial<DSRStamp>): DSRStamp {
  const applicant = mockApplicants.get(data.applicant || "");
  if (applicant) {
    // Check clearances guardrail
    const lmsOk = applicant.lms_processing?.status === "Issued";
    const wakalaOk = applicant.wakala_processing?.status === "Completed";
    const injazOk = applicant.injaz_processing?.status === "Completed";

    if (!lmsOk || !wakalaOk || !injazOk) {
      throw new Error("Pre-departure guardrail: LMS, Wakala, and Injaz clearances must all be completed before submitting Visa Stamp.");
    }

    applicant.applicant_state = "Stamped";
    applicant.state_step = 7;
    applicant.state_progress = 77.8;
    applicant.dsr_stamp = { ...data, applicant: applicant.name, stamped_date: data.stamped_date || new Date().toISOString().split("T")[0] };
    return applicant.dsr_stamp;
  }
  return { ...data, applicant: data.applicant || "" };
}

export function submitDsrTicketInStore(data: Partial<DSRTicket>): DSRTicket {
  const applicant = mockApplicants.get(data.applicant || "");
  if (applicant) {
    applicant.applicant_state = "Ticketed";
    applicant.state_step = 8;
    applicant.state_progress = 88.9;
    applicant.dsr_ticket = { ...data, applicant: applicant.name };
    return applicant.dsr_ticket;
  }
  return { ...data, applicant: data.applicant || "" };
}

export function submitDsrDepartureInStore(data: Partial<DSRDeparture>): DSRDeparture {
  const applicant = mockApplicants.get(data.applicant || "");
  if (applicant) {
    if (data.medical_2_result === "Fail") {
      throw new Error(`Pre-departure Medical 2 verification FAILED: ${data.medical_2_remarks || "Candidate is unfit for flight"}. Departure is blocked.`);
    }

    applicant.applicant_state = "Departed";
    applicant.state_step = 9;
    applicant.state_progress = 100.0;
    applicant.departure_info = {
      ...data,
      applicant: applicant.name,
      departure_date: data.departure_date || new Date().toISOString().split("T")[0],
    };
    return applicant.departure_info;
  }
  return { ...data, applicant: data.applicant || "" };
}

export function cancelApplicantInStore(applicantName: string, cancelRemarks: string) {
  const applicant = mockApplicants.get(applicantName);
  if (!applicant) throw new Error(`Applicant ${applicantName} not found.`);

  applicant.applicant_state = "Cancelled";
  applicant.state_step = 0;
  applicant.state_progress = 0;
  applicant.cancel_remarks = cancelRemarks;
  applicant.cancelled_at = new Date().toISOString();
  applicant.cancelled_by = "admin@example.com";

  return {
    message: `Applicant ${applicantName} process has been Cancelled.`,
  };
}

export function restoreApplicantInStore(applicantName: string, restoreOption: string = "auto") {
  const applicant = mockApplicants.get(applicantName);
  if (!applicant) throw new Error(`Applicant ${applicantName} not found.`);

  let targetState: ApplicantState = "Draft";
  if (applicant.departure_info) targetState = "Departed";
  else if (applicant.dsr_ticket) targetState = "Ticketed";
  else if (applicant.dsr_stamp) targetState = "Stamped";
  else if (applicant.lms_processing || applicant.wakala_processing || applicant.injaz_processing) targetState = "Processing";
  else if (applicant.contractor_doc) targetState = "Selected";
  else if (applicant.cv_record) targetState = "CV Generated";
  else if (applicant.passport_number && applicant.date_of_birth) targetState = "Registered";

  applicant.applicant_state = targetState;
  applicant.cancel_remarks = undefined;
  applicant.cancelled_at = undefined;
  applicant.cancelled_by = undefined;

  return {
    status: "success",
    new_state: targetState,
    message: `Applicant ${applicantName} restored to ${targetState}.`,
  };
}

export function getAccountingSummaryInStore(): AccountingSummaryResponse {
  let totalIncome = 0;
  let totalExpense = 0;
  const recentTransactions: any[] = [];

  mockApplicants.forEach((a) => {
    if (a.income_expense_logs) {
      a.income_expense_logs.forEach((log) => {
        if (log.transaction_type === "Income") totalIncome += log.amount;
        else if (log.transaction_type === "Expense") totalExpense += log.amount;
        recentTransactions.push({ ...log, source_doctype: a.name });
      });
    }
  });

  return {
    total_income: totalIncome || 45000,
    total_expense: totalExpense || 18500,
    net_balance: (totalIncome || 45000) - (totalExpense || 18500),
    by_stage: [
      { stage: "Draft", income: 0, expense: 0, net: 0 },
      { stage: "Registered", income: 5000, expense: 500, net: 4500 },
      { stage: "Selected", income: 15000, expense: 3000, net: 12000 },
      { stage: "Processing", income: 25000, expense: 15000, net: 10000 },
    ],
    recent_transactions: recentTransactions.slice(0, 10),
  };
}
