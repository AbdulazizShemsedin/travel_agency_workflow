import {
  Applicant,
  ApplicantFormData,
  ApplicantState,
  ContractorDocument,
  DepartureInfo,
  EmbassyProcessing,
  InjazProcessing,
  LMSProcessing,
  ProcessingRoleType,
  WakalaProcessing,
  StreamAssignmentPayload,
} from "@/types/applicant";
import { calculateRemainingDays, deriveFullName } from "@/lib/validations/applicant.schema";

let applicantCounter = 1254;

export const mockEmployeesList = [
  { id: "EMP-001", name: "Abebe Kebede", role: "Operations Lead", email: "abebe@agency.et", roleType: "All Roles / Operations Lead" },
  { id: "EMP-002", name: "Sara Mohammed", role: "LMS Specialist", email: "sara@agency.et", roleType: "LMS Officer" },
  { id: "EMP-003", name: "Tigist Alemu", role: "Wakala Administrator", email: "tigist@agency.et", roleType: "Wakala Admin" },
  { id: "EMP-004", name: "Dawit Haile", role: "Injaz & Biometrics Officer", email: "dawit@agency.et", roleType: "Injaz Officer" },
  { id: "EMP-005", name: "Khadija Omar", role: "LMS & Departure Officer", email: "khadija@agency.et", roleType: "LMS Officer" },
];

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
      passport_number: "EP1234567",
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
      assigned_role_type: "All Roles / Operations Lead",
      assigned_employee_id: "EMP-001",
      assigned_employee_name: "Abebe Kebede",
      assigned_at: "2024-05-08T10:00:00Z",
      lms_processing: {
        status: "In Progress",
        assigned_employee: "Sara Mohammed",
        ticket_pnr: "ET-8839201",
        flight_number: "ET-402",
        departure_date: "2026-09-28",
        destination: "Riyadh (RUH)",
        additional_field_1: "MOL-CLEARANCE-9941",
        additional_field_2: "INS-MED-2026-441",
        notes: "Flight reservation held, awaiting embassy stamp clearance.",
      },
      injaz_processing: {
        status: "In Progress",
        assigned_employee: "Dawit Haile",
        injaz_app_no: "INJ-7788412",
        teashir_fee: 140,
        biometrics_date: "2026-08-20",
        biometrics_center: "Teashir VFS Global Addis Ababa",
        notes: "Fingerprint biometrics appointment scheduled.",
      },
      wakala_processing: {
        status: "Completed",
        assigned_employee: "Tigist Alemu",
        wakala_number: "WAK-9921448",
        sponsor_auth_code: "ENJAZ-SA-8812",
        foreign_agency_name: "Al-Baraka Recruitment Riyadh",
        completed_at: "2024-05-10T14:30:00Z",
        notes: "Wakala electronic delegation verified.",
      },
      contractor_doc: {
        file_name: "Saudi_Contract_Ahmed_Ali.pdf",
        contractor_name: "Al-Baraka International Recruitment",
        sponsor_name: "Sheikh Khalid Al-Otaibi",
        sponsor_id: "NAT-SA-10928374",
        job_title: "Healthcare Assistant",
        salary: 2200,
        selection_status: "Selected",
        extracted_at: "2024-05-07T09:15:00Z",
        approval_status: "Approved",
        notes: "Contractor approved salary package and visa allocation.",
      },
    },
  ],
  [
    "APP-2024-1249",
    {
      name: "APP-2024-1249",
      first_name: "Ali",
      middle_name: "Hassan",
      last_name: "Ahmed",
      full_name: "Ali Hassan Ahmed",
      gender: "Male",
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
      registration_date: "2024-05-04",
      total_income: 3000,
      total_expense: 500,
      net_balance: 2500,
      cv_record: "CV-2024-002",
      cv_file_url: "/private/files/CV-APP-2024-1249.pdf",
      contractor_doc: {
        file_name: "Contract_Request_Ali_Ahmed.pdf",
        contractor_name: "Gulf Horizons Agency",
        sponsor_name: "Omar Al-Mansoor",
        sponsor_id: "NAT-UAE-774411",
        job_title: "Heavy Equipment Driver",
        salary: 2800,
        selection_status: "Selected",
        extracted_at: "2024-05-06T11:00:00Z",
        approval_status: "Approved",
        notes: "Document approved. Ready for employee assignment.",
      },
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
  [
    "APP-2024-1247",
    {
      name: "APP-2024-1247",
      first_name: "Marta",
      middle_name: "Girma",
      last_name: "Tadesse",
      full_name: "Marta Girma Tadesse",
      gender: "Female",
      religion: "Protestant",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251913998877",
      city: "Addis Ababa",
      country: "Ethiopia",
      date_of_birth: "1999-11-04",
      passport_number: "EP8877665",
      highest_education: "Bachelor's Degree",
      labour_id: "LBR-665544",
      contact_person_name: "Girma Tadesse",
      contact_person_phone: "+251911009988",
      coc_status: "Issued",
      exam_date: "2026-10-10",
      medical_status: "FIT",
      medical_expiry_date: "2026-12-01",
      applicant_state: "CV Generated",
      registration_date: "2024-05-03",
      total_income: 4000,
      total_expense: 800,
      net_balance: 3200,
      cv_record: "CV-2024-003",
      cv_file_url: "/private/files/CV-APP-2024-1247.pdf",
    },
  ],
  [
    "APP-2024-1246",
    {
      name: "APP-2024-1246",
      first_name: "Hanan",
      middle_name: "Zuber",
      last_name: "Ibrahim",
      full_name: "Hanan Zuber Ibrahim",
      gender: "Female",
      religion: "Muslim",
      marital_status: "Married",
      children: 1,
      nationality: "Ethiopia",
      phone_number: "+251912445588",
      city: "Jimma",
      country: "Ethiopia",
      date_of_birth: "1996-03-18",
      passport_number: "EP4455667",
      highest_education: "High School",
      labour_id: "LBR-112233",
      contact_person_name: "Zuber Ibrahim",
      contact_person_phone: "+251911224466",
      coc_status: "Issued",
      exam_date: "2026-09-01",
      medical_status: "FIT",
      medical_expiry_date: "2026-10-30",
      applicant_state: "Request Pending",
      registration_date: "2024-05-02",
      total_income: 3500,
      total_expense: 600,
      net_balance: 2900,
      cv_record: "CV-2024-004",
      cv_file_url: "/private/files/CV-APP-2024-1246.pdf",
    },
  ],
  [
    "APP-2024-1245",
    {
      name: "APP-2024-1245",
      first_name: "Solomon",
      middle_name: "Fikru",
      last_name: "Desta",
      full_name: "Solomon Fikru Desta",
      gender: "Male",
      religion: "Orthodox",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251911776655",
      city: "Bahir Dar",
      country: "Ethiopia",
      date_of_birth: "1995-07-22",
      passport_number: "EP5566778",
      highest_education: "Bachelor's Degree",
      labour_id: "LBR-778899",
      contact_person_name: "Fikru Desta",
      contact_person_phone: "+251911335577",
      coc_status: "Issued",
      exam_date: "2026-08-15",
      medical_status: "FIT",
      medical_expiry_date: "2026-11-15",
      applicant_state: "Departed",
      registration_date: "2024-04-10",
      total_income: 6000,
      total_expense: 2000,
      net_balance: 4000,
      cv_record: "CV-2024-005",
      cv_file_url: "/private/files/CV-APP-2024-1245.pdf",
      departure_info: {
        flight_number: "ET-414",
        departure_date: "2024-05-01",
        departure_time: "08:45 AM",
        airport: "Addis Ababa Bole International (ADD)",
        destination_city: "Jeddah (JED)",
        status: "Departed",
        marked_by: "Sara Mohammed (LMS Officer)",
        marked_at: "2024-05-01T09:00:00Z",
        notes: "Candidate successfully checked in and departed.",
      },
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

export function updateApplicant(id: string, data: Partial<Applicant>): Applicant {
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

export function transitionToRequestPending(id: string): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);
  existing.applicant_state = "Request Pending";
  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function uploadAndExtractContractorDocInStore(
  id: string,
  docData: Partial<ContractorDocument>
): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.contractor_doc = {
    file_name: docData.file_name || "Contractor_Visa_Demand_Doc.pdf",
    file_url: docData.file_url || "/mock_docs/contractor_demand.pdf",
    uploaded_at: new Date().toISOString(),
    contractor_name: docData.contractor_name || "Al-Khaleej Manpower Services",
    sponsor_name: docData.sponsor_name || "Fahad Abdullah Al-Ghamdi",
    sponsor_id: docData.sponsor_id || "SA-ID-10884920",
    job_title: docData.job_title || "Hospitality / Service Attendant",
    salary: docData.salary || 2400,
    selection_status: docData.selection_status || "Selected",
    extracted_at: new Date().toISOString(),
    approval_status: "Pending",
    notes: docData.notes || "Parsed successfully from uploaded contractor visa allotment document.",
  };

  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function approveContractorDocInStore(id: string, approved: boolean): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  if (approved) {
    if (existing.contractor_doc) {
      existing.contractor_doc.approval_status = "Approved";
    }
    existing.applicant_state = "Selected";
  } else {
    // User only rejected the extracted fields; reset extracted info and keep in Request Pending
    if (existing.contractor_doc) {
      existing.contractor_doc.approval_status = "Rejected";
      existing.contractor_doc.extracted_at = undefined;
    }
    existing.applicant_state = "Request Pending";
  }

  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function assignEmployeeInStore(
  ids: string[],
  roleType: ProcessingRoleType = "All Roles / Operations Lead",
  employeeId?: string,
  notes?: string,
  streamAssignments?: StreamAssignmentPayload,
  employeeIds?: string[]
): Applicant[] {
  // Determine primary employee or collaborating employees
  const primaryEmployee = mockEmployeesList.find((e) => e.id === employeeId) || mockEmployeesList[0];
  const collaboratingEmployees = employeeIds && employeeIds.length > 0
    ? mockEmployeesList.filter((e) => employeeIds.includes(e.id))
    : [primaryEmployee];

  const primaryName = collaboratingEmployees.map((e) => e.name).join(", ");
  const lmsStaff = streamAssignments?.lms_employee_name || (roleType === "LMS Officer" ? primaryEmployee.name : "Sara Mohammed (LMS)");
  const injazStaff = streamAssignments?.injaz_employee_name || (roleType === "Injaz Officer" ? primaryEmployee.name : "Dawit Haile (Injaz)");
  const wakalaStaff = streamAssignments?.wakala_employee_name || (roleType === "Wakala Admin" ? primaryEmployee.name : "Tigist Alemu (Wakala)");

  const updatedApplicants: Applicant[] = [];

  ids.forEach((id) => {
    const existing = mockApplicants.get(id);
    if (existing) {
      existing.applicant_state = "Processing";
      existing.assigned_role_type = roleType;
      existing.assigned_employee_id = employeeId || collaboratingEmployees[0]?.id;
      existing.assigned_employee_name = primaryName;
      existing.assigned_at = new Date().toISOString();

      // Initialize parallel processing streams with assigned staff
      existing.lms_processing = {
        status: existing.lms_processing?.status || "In Progress",
        assigned_employee: lmsStaff,
        ticket_pnr: existing.lms_processing?.ticket_pnr || "",
        flight_number: existing.lms_processing?.flight_number || "ET-402",
        departure_date: existing.lms_processing?.departure_date || "",
        destination: existing.lms_processing?.destination || "Riyadh (RUH)",
        additional_field_1: existing.lms_processing?.additional_field_1 || "MOL-CLEARANCE-9941",
        additional_field_2: existing.lms_processing?.additional_field_2 || "INS-MED-2026-441",
        notes: notes || existing.lms_processing?.notes || "LMS workflow initialized.",
      };

      existing.injaz_processing = {
        status: existing.injaz_processing?.status || "In Progress",
        assigned_employee: injazStaff,
        injaz_app_no: existing.injaz_processing?.injaz_app_no || `INJ-${Math.floor(1000000 + Math.random() * 9000000)}`,
        teashir_fee: existing.injaz_processing?.teashir_fee ?? 140,
        biometrics_date: existing.injaz_processing?.biometrics_date || "",
        biometrics_center: existing.injaz_processing?.biometrics_center || "Teashir VFS Global Addis",
        notes: existing.injaz_processing?.notes || "Teashir fingerprint processing active.",
      };

      existing.wakala_processing = {
        status: existing.wakala_processing?.status || "In Progress",
        assigned_employee: wakalaStaff,
        wakala_number: existing.wakala_processing?.wakala_number || `WAK-${Math.floor(1000000 + Math.random() * 9000000)}`,
        sponsor_auth_code: existing.wakala_processing?.sponsor_auth_code || "ENJAZ-AUTH-ACTIVE",
        foreign_agency_name: existing.contractor_doc?.contractor_name || "Authorized Foreign Agency",
        notes: existing.wakala_processing?.notes || "Wakala power of attorney delegation pending endorsement.",
      };

      existing.updated_at = new Date().toISOString();
      mockApplicants.set(id, existing);
      updatedApplicants.push(existing);
    }
  });

  return updatedApplicants;
}

export function updateLmsStreamInStore(id: string, data: Partial<LMSProcessing>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.lms_processing = {
    ...existing.lms_processing,
    ...data,
    status: data.status || existing.lms_processing?.status || "In Progress",
    completed_at: data.status === "Completed" ? new Date().toISOString() : existing.lms_processing?.completed_at,
  };

  // Check if all 3 parallel streams are completed to advance to Embassy/Stamped
  checkAndAdvanceToEmbassy(existing);

  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function updateInjazStreamInStore(id: string, data: Partial<InjazProcessing>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.injaz_processing = {
    ...existing.injaz_processing,
    ...data,
    status: data.status || existing.injaz_processing?.status || "In Progress",
    completed_at: data.status === "Completed" ? new Date().toISOString() : existing.injaz_processing?.completed_at,
  };

  checkAndAdvanceToEmbassy(existing);

  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function updateWakalaStreamInStore(id: string, data: Partial<WakalaProcessing>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.wakala_processing = {
    ...existing.wakala_processing,
    ...data,
    status: data.status || existing.wakala_processing?.status || "In Progress",
    completed_at: data.status === "Completed" ? new Date().toISOString() : existing.wakala_processing?.completed_at,
  };

  checkAndAdvanceToEmbassy(existing);

  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

function checkAndAdvanceToEmbassy(applicant: Applicant) {
  if (
    applicant.lms_processing?.status === "Completed" &&
    applicant.injaz_processing?.status === "Completed" &&
    applicant.wakala_processing?.status === "Completed"
  ) {
    if (applicant.applicant_state === "Processing") {
      applicant.applicant_state = "Embassy/Stamped";
      if (!applicant.embassy_processing) {
        applicant.embassy_processing = {
          status: "Stamped",
          submission_date: new Date().toISOString().split("T")[0],
          visa_number: `VISA-${Math.floor(10000000 + Math.random() * 90000000)}`,
          stamp_date: new Date().toISOString().split("T")[0],
          embassy_name: "Royal Embassy of Saudi Arabia (Addis Ababa)",
          completed_at: new Date().toISOString(),
          notes: "All parallel processing streams cleared. Visa stamped successfully.",
        };
      }
    }
  }
}

export function updateEmbassyStreamInStore(id: string, data: Partial<EmbassyProcessing>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.embassy_processing = {
    ...existing.embassy_processing,
    ...data,
    status: data.status || "Stamped",
    completed_at: new Date().toISOString(),
  };
  existing.applicant_state = "Embassy/Stamped";
  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}

export function markDepartedInStore(id: string, data: Partial<DepartureInfo>): Applicant {
  const existing = mockApplicants.get(id);
  if (!existing) throw new Error(`Applicant ${id} not found.`);

  existing.departure_info = {
    flight_number: data.flight_number || existing.lms_processing?.flight_number || "ET-402",
    departure_date: data.departure_date || existing.lms_processing?.departure_date || new Date().toISOString().split("T")[0],
    departure_time: data.departure_time || "09:30 AM",
    airport: data.airport || "Bole International Airport (ADD)",
    destination_city: data.destination_city || existing.lms_processing?.destination || "Riyadh",
    marked_by: data.marked_by || "LMS Officer (Sara Mohammed)",
    marked_at: new Date().toISOString(),
    status: "Departed",
    notes: data.notes || "Applicant successfully checked in, boarded and departed overseas.",
  };

  existing.applicant_state = "Departed";
  existing.updated_at = new Date().toISOString();
  mockApplicants.set(id, existing);
  return existing;
}
