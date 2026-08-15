import {
  Applicant,
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
import { BaseApplicantFormValues } from "@/lib/validations/applicant.schema";

export interface ApiError {
  message: string;
  statusCode?: number;
  serverMessages?: string[];
}

export interface CVGenerationResponse {
  message: {
    cv_record: string;
    file_url: string;
    message: string;
  };
}

export interface ContractRequestResponse {
  message: {
    status: "success" | "error";
    message: string;
    whatsapp_url?: string;
    whatsapp_api_sent?: boolean;
    contract_request?: ContractRequest;
  };
}

export interface BatchContractRequestResponse {
  message: {
    total: number;
    created_count: number;
    sent_count: number;
    failed_count: number;
    results: unknown[];
  };
}

export interface ParseDossierResponse {
  message: {
    status?: string;
    message: string;
    dossier?: ApplicantDossier;
    extracted_data?: {
      contractor_name?: string;
      sponsor_name?: string;
      sponsor_id?: string;
      job_title?: string;
      salary?: number;
    };
  } | string;
}

export interface CancelApplicantResponse {
  message: string;
}

export interface RestoreApplicantResponse {
  message: {
    status: string;
    new_state: string;
    message: string;
  };
}

// Frappe API response wrapper
interface FrappeResponse<T> {
  data?: T;
  message?: T;
  _server_messages?: string;
  exc?: string;
}

// Generic error handler
async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    let serverMsgs: string[] = [];

    try {
      const errBody = await res.json();
      if (errBody._server_messages) {
        try {
          const parsed = JSON.parse(errBody._server_messages);
          if (Array.isArray(parsed)) {
            serverMsgs = parsed.map((m: unknown) => {
              if (typeof m === "string") {
                try {
                  const inner = JSON.parse(m);
                  return inner.message || m;
                } catch {
                  return m;
                }
              }
              return String(m);
            });
            errorMsg = serverMsgs.join(" • ");
          }
        } catch {
          errorMsg = errBody._server_messages;
        }
      } else if (errBody.message) {
        errorMsg = typeof errBody.message === "string" ? errBody.message : JSON.stringify(errBody.message);
      } else if (errBody.exc) {
        errorMsg = "Server Exception occurred during processing.";
      }
    } catch {
      // Use fallback errorMsg
    }

    const apiError: ApiError = {
      message: errorMsg,
      statusCode: res.status,
      serverMessages: serverMsgs,
    };
    throw apiError;
  }

  const json = (await res.json()) as FrappeResponse<T>;
  if (json.data !== undefined) return json.data;
  if (json.message !== undefined) return json.message as T;
  return json as unknown as T;
}

// ---------------------------------------------------------------------------
// 1. APPLICANT REST & LIFECYCLE RPCS
// ---------------------------------------------------------------------------

// Create Draft: POST /api/resource/Applicant
export async function createApplicantDraft(
  data: BaseApplicantFormValues
): Promise<Applicant> {
  const res = await fetch("/api/resource/Applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<Applicant>(res);
}

// Update Applicant: PUT /api/resource/Applicant/{id}
export async function updateApplicantDraft(
  applicantName: string,
  data: Partial<BaseApplicantFormValues> | Partial<Applicant>
): Promise<Applicant> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<Applicant>(res);
}

// Get Single Applicant: GET /api/resource/Applicant/{id}
export async function getApplicant(applicantName: string): Promise<Applicant> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`);
  return handleApiResponse<Applicant>(res);
}

// List Applicants: GET /api/resource/Applicant
export async function getApplicantsList(): Promise<Applicant[]> {
  const res = await fetch("/api/resource/Applicant");
  return handleApiResponse<Applicant[]>(res);
}

// RPC 1: Register Applicant
export async function registerApplicant(
  applicantName: string
): Promise<{ message: string; applicant?: Applicant }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantName }),
    }
  );
  return handleApiResponse<{ message: string; applicant?: Applicant }>(res);
}

// RPC 2: Generate CV PDF
export async function generateCV(
  applicantName: string
): Promise<CVGenerationResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantName }),
    }
  );
  return handleApiResponse<CVGenerationResponse>(res);
}

// RPC 3: Cancel Applicant Process
export async function cancelApplicant(
  applicantName: string,
  cancelRemarks: string
): Promise<CancelApplicantResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.cancel_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: applicantName,
        cancel_remarks: cancelRemarks,
      }),
    }
  );
  return handleApiResponse<CancelApplicantResponse>(res);
}

// RPC 4: Restore Cancelled Applicant
export async function restoreApplicant(
  applicantName: string,
  restoreOption: "auto" | "reset" = "auto"
): Promise<RestoreApplicantResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.restore_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: applicantName,
        restore_option: restoreOption,
      }),
    }
  );
  return handleApiResponse<RestoreApplicantResponse>(res);
}

// ---------------------------------------------------------------------------
// 2. CONTRACTOR & CONTRACT REQUESTS (WHATSAPP INTEGRATION)
// ---------------------------------------------------------------------------

// List Contractors: GET /api/resource/Contractor
export async function getContractorsList(): Promise<Contractor[]> {
  const res = await fetch("/api/resource/Contractor");
  return handleApiResponse<Contractor[]>(res);
}

// Create Contractor: POST /api/resource/Contractor
export async function createContractor(data: Partial<Contractor>): Promise<Contractor> {
  const res = await fetch("/api/resource/Contractor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<Contractor>(res);
}

// Send Single Contract Request (Meta WhatsApp Cloud API + Web URL generation)
export async function sendContractRequestApi(
  contractRequestName: string
): Promise<ContractRequestResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.contract_request.contract_request.send_contract_request",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_request_name: contractRequestName }),
    }
  );
  return handleApiResponse<ContractRequestResponse>(res);
}

// Batch Send Contract Requests
export async function batchSendContractRequestsApi(
  cvReferences: string[],
  contractor: string
): Promise<BatchContractRequestResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.contract_request.contract_request.batch_send_contract_requests",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cv_references: cvReferences,
        contractor: contractor,
      }),
    }
  );
  return handleApiResponse<BatchContractRequestResponse>(res);
}

// ---------------------------------------------------------------------------
// 3. APPLICANT DOSSIER & OCR PARSING
// ---------------------------------------------------------------------------

// Create Dossier: POST /api/resource/Applicant Dossier
export async function createApplicantDossier(data: Partial<ApplicantDossier>): Promise<ApplicantDossier> {
  const res = await fetch("/api/resource/Applicant Dossier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<ApplicantDossier>(res);
}

// Parse Dossier File RPC
export async function parseDossierFileApi(
  dossierName: string
): Promise<ParseDossierResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant_dossier.applicant_dossier.parse_dossier_file",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossier_name: dossierName }),
    }
  );
  return handleApiResponse<ParseDossierResponse>(res);
}

// ---------------------------------------------------------------------------
// 4. CLEARANCES (LMS, WAKALA, INJAZ) - STANDARD REST RESOURCE CRUD
// ---------------------------------------------------------------------------

// Update LMS Clearance: PUT /api/resource/LMS Clearance/{id}
export async function updateLmsClearanceApi(
  name: string,
  data: Partial<LMSClearance>
): Promise<LMSClearance> {
  const res = await fetch(`/api/resource/LMS Clearance/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<LMSClearance>(res);
}

// Update Wakala Clearance: PUT /api/resource/Wakala Clearance/{id}
export async function updateWakalaClearanceApi(
  name: string,
  data: Partial<WakalaClearance>
): Promise<WakalaClearance> {
  const res = await fetch(`/api/resource/Wakala Clearance/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<WakalaClearance>(res);
}

// Update Injaz Clearance: PUT /api/resource/Injaz Clearance/{id}
export async function updateInjazClearanceApi(
  name: string,
  data: Partial<InjazClearance>
): Promise<InjazClearance> {
  const res = await fetch(`/api/resource/Injaz Clearance/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<InjazClearance>(res);
}

// Assign Employee to Clearances (Frappe User Permission & ToDo automation)
export async function assignEmployeeApi(
  applicantIds: string[],
  roleType: string,
  employeeId: string,
  streamAssignments?: { lms?: string; injaz?: string; wakala?: string }
): Promise<{ message: string }> {
  for (const id of applicantIds) {
    if (streamAssignments?.lms) {
      await updateLmsClearanceApi(`LMS-${id.replace("APP-", "")}`, { applicant: id, employee: streamAssignments.lms, status: "Pending" });
    }
    if (streamAssignments?.injaz) {
      await updateInjazClearanceApi(`INJ-${id.replace("APP-", "")}`, { applicant: id, employee: streamAssignments.injaz, status: "Pending" });
    }
    if (streamAssignments?.wakala) {
      await updateWakalaClearanceApi(`WAK-${id.replace("APP-", "")}`, { applicant: id, employee: streamAssignments.wakala, status: "Pending" });
    }
    if (!streamAssignments) {
      await updateApplicantDraft(id, {
        applicant_state: "Processing",
        assigned_employee_id: employeeId,
        assigned_role_type: roleType,
      });
    }
  }
  return { message: "Employees successfully assigned across clearances." };
}

// ---------------------------------------------------------------------------
// 5. PRE-DEPARTURE GUARDRAIL STAGES (STAMP, TICKET, DEPARTURE)
// ---------------------------------------------------------------------------

// Create/Update DSR Stamp: POST /api/resource/DSR Stamp
export async function submitDsrStampApi(data: Partial<DSRStamp>): Promise<DSRStamp> {
  const res = await fetch("/api/resource/DSR Stamp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<DSRStamp>(res);
}

// Create/Update DSR Ticket: POST /api/resource/DSR Ticket
export async function submitDsrTicketApi(data: Partial<DSRTicket>): Promise<DSRTicket> {
  const res = await fetch("/api/resource/DSR Ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<DSRTicket>(res);
}

// Create/Update DSR Departure: POST /api/resource/DSR Departure
export async function submitDsrDepartureApi(data: Partial<DSRDeparture>): Promise<DSRDeparture> {
  const res = await fetch("/api/resource/DSR Departure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<DSRDeparture>(res);
}

// ---------------------------------------------------------------------------
// 6. UNIVERSAL FILE UPLOAD (POST /api/method/upload_file)
// ---------------------------------------------------------------------------

export async function uploadFileApi(
  file: File,
  doctype: string = "Applicant",
  docname: string = "",
  fieldname: string = "file_attachment",
  isPrivate: boolean = true
): Promise<{ message: { file_url: string; name: string } }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doctype", doctype);
  formData.append("docname", docname);
  formData.append("fieldname", fieldname);
  formData.append("is_private", isPrivate ? "1" : "0");

  const res = await fetch("/api/method/upload_file", {
    method: "POST",
    body: formData,
  });
  return handleApiResponse<{ message: { file_url: string; name: string } }>(res);
}

// ---------------------------------------------------------------------------
// 7. ACCOUNTING & FINANCIAL SUMMARY DASHBOARD RPC
// ---------------------------------------------------------------------------

export async function getAccountingSummaryApi(): Promise<AccountingSummaryResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.get_accounting_summary"
  );
  return handleApiResponse<AccountingSummaryResponse>(res);
}
