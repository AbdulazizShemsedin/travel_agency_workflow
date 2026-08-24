import {
  Applicant,
  CVRecord,
  Contractor,
  ContractRequest,
  ApplicantDossier,
  LMSClearance,
  WakalaClearance,
  InjazClearance,
  EmbassyClearance,
  TelesignClearance,
  DSRStamp,
  DSRTicket,
  DSRDeparture,
  AccountingSummaryResponse,
  PortalAvailableCandidate,
  PortalSelectCandidateResponse,
  AgencyComplaint,
  OperationsSummaryResponse,
  PassportOCRResponse,
  AgencyContextResponse,
  AgencyPipelineCandidate,
  UnpaidCommissionSummary,
  UnpaidCommissionCandidate,
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
    whatsapp_api_message?: string;
    whatsapp_number?: string;
    contractor_name?: string;
    contract_request?: ContractRequest | string;
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
  const rawText = await res.text();
  let json: any = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = { message: rawText };
  }

  const hasException = !res.ok || !!(json.exc || json.exception || json.exc_type);

  if (hasException) {
    let errorMsg = json.exception || `HTTP Error ${res.status}: ${res.statusText}`;
    let serverMsgs: string[] = [];

    if (json._server_messages) {
      try {
        const parsed = JSON.parse(json._server_messages);
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
        errorMsg = json._server_messages;
      }
    } else if (json.message && typeof json.message === "string") {
      errorMsg = json.message;
    } else if (json.exception && typeof json.exception === "string") {
      // Strip python traceback if present
      const match = json.exception.match(/ValidationError: (.*)/) || json.exception.match(/Exception: (.*)/);
      errorMsg = match ? match[1] : json.exception;
    }

    const apiError: ApiError = {
      message: errorMsg,
      statusCode: res.status >= 400 ? res.status : 400,
      serverMessages: serverMsgs,
    };
    throw apiError;
  }

  if (json.data !== undefined) return json.data;
  if (json.message !== undefined) return json.message as T;
  return json as unknown as T;
}

// ---------------------------------------------------------------------------
// 1. APPLICANT REST & LIFECYCLE RPCS
// ---------------------------------------------------------------------------

// Normalizer function to map frontend form values to Frappe DocType schema
export function mapFormValuesToFrappeApplicant(
  data: Partial<BaseApplicantFormValues> | Partial<Applicant> | Record<string, any>
): Record<string, any> {
  const payload: Record<string, any> = { ...data };

  // Map contact fields to backend schema
  if (data.contact_person_name && !payload.emergency_contact_name) {
    payload.emergency_contact_name = data.contact_person_name;
  }
  if (data.contact_person_phone && !payload.emergency_contact_phone) {
    payload.emergency_contact_phone = data.contact_person_phone;
  }
  if (data.address_line_1 && !payload.applicant_address) {
    payload.applicant_address = data.address_line_1;
  }

  // Ensure defaults
  if (!payload.applicant_type) {
    payload.applicant_type = "Standard";
  }
  if (!payload.destination_country) {
    payload.destination_country = "Saudi Arabia";
  }

  return payload;
}

// Create Draft: POST /api/resource/Applicant
export async function createApplicantDraft(
  data: BaseApplicantFormValues
): Promise<Applicant> {
  const payload = mapFormValuesToFrappeApplicant(data);
  const res = await fetch("/api/resource/Applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<Applicant>(res);
}

// Update Applicant: PUT /api/resource/Applicant/{id}
export async function updateApplicantDraft(
  applicantName: string,
  data: Partial<BaseApplicantFormValues> | Partial<Applicant>
): Promise<Applicant> {
  const payload = mapFormValuesToFrappeApplicant(data);
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<Applicant>(res);
}

// Get Single Applicant: GET /api/resource/Applicant/{id} with deep relational enrichment
export async function getApplicant(applicantName: string): Promise<Applicant> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`);
  let raw = await handleApiResponse<Applicant | Applicant[]>(res);
  if (Array.isArray(raw)) {
    raw = raw.find((a) => a.name === applicantName) || raw[0];
  }
  const app = raw as Applicant;
  if (!app) return app;

  try {
    // Enrich with CV Record if present (latest)
    const cvRes = await fetch(`/api/resource/CV%20Record?filters=[["applicant","=","${encodeURIComponent(applicantName)}"]]&fields=["*"]&order_by=creation%20desc&limit_page_length=1`);
    const cvData = await cvRes.json();
    if (cvData.data && cvData.data.length > 0) {
      const cv = cvData.data[0] as CVRecord;
      app.cv_record = cv.name;
      app.cv_file_url = cv.file_attachment;
      app.cv_record_data = cv;
    }

    // Enrich with Contract Request if present
    const crRes = await fetch(`/api/resource/Contract%20Request?filters=[["applicant","=","${encodeURIComponent(applicantName)}"]]&fields=["*"]`);
    const crData = await crRes.json();
    if (crData.data && crData.data.length > 0) {
      const cr = crData.data[0];
      app.contract_request = {
        name: cr.name,
        applicant: cr.applicant,
        contractor: cr.contractor,
        status: cr.status,
        whatsapp_url: cr.contractor_whatsapp ? `https://api.whatsapp.com/send?phone=${cr.contractor_whatsapp.replace(/[^0-9]/g, "")}&text=Hello%20${encodeURIComponent(cr.contractor_person || "Partner")}%2C%20please%20review%20candidate%20CV%20for%20${encodeURIComponent(app.full_name)}%20(ID:%20${app.name})` : undefined,
        sent_at: cr.created_date,
      };
    }

    // Enrich with Applicant Dossier if present
    const dosRes = await fetch(`/api/resource/Applicant%20Dossier?filters=[["applicant","=","${encodeURIComponent(applicantName)}"]]&fields=["*"]`);
    const dosData = await dosRes.json();
    if (dosData.data && dosData.data.length > 0) {
      const dos = dosData.data[0];
      app.contractor_doc = {
        name: dos.name,
        applicant: dos.applicant,
        contract_request: dos.contract_request,
        contractor_name: dos.contractor_name,
        sponsor_name: dos.sponsor_name,
        sponsor_id: dos.sponsor_id,
        job_title: dos.job_title || "Hospitality & Domestic Specialist",
        salary: dos.amount_detail || 1200,
        selection_status: dos.is_parsed ? "Selected" : "Pending",
        parsed_at: dos.creation,
        file_name: dos.attached_file ? dos.attached_file.split("/").pop() : "Contractor_Demand_Dossier.pdf",
        file_attachment: dos.attached_file,
      };
    }

    // Enrich with Clearances (LMS, Injaz, Wakala)
    const lmsRes = await fetch(`/api/resource/LMS%20Clearance?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const lmsData = await lmsRes.json();
    if (lmsData.data && lmsData.data.length > 0) {
      const lms = lmsData.data[0];
      app.lms_processing = {
        name: lms.name,
        applicant: app.name,
        status: lms.status,
        employee: lms.employee || app.assigned_employee_id,
        issued_on: lms.issued_on,
      };
    } else if (app.assigned_employee_id) {
      const cleanId = String(app.name || "").replace("APP-", "");
      app.lms_processing = {
        name: `LMS-${cleanId}`,
        applicant: app.name || "",
        status: "Pending",
        employee: app.assigned_employee_id,
      };
    }

    const injRes = await fetch(`/api/resource/Injaz%20Clearance?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const injData = await injRes.json();
    if (injData.data && injData.data.length > 0) {
      const inj = injData.data[0];
      app.injaz_processing = {
        name: inj.name,
        applicant: app.name,
        status: inj.status,
        employee: inj.employee || app.assigned_employee_id,
      };
    } else if (app.assigned_employee_id) {
      const cleanId = String(app.name || "").replace("APP-", "");
      app.injaz_processing = {
        name: `INJ-${cleanId}`,
        applicant: app.name || "",
        status: "Pending",
        employee: app.assigned_employee_id,
      };
    }

    const wakRes = await fetch(`/api/resource/Wakala%20Clearance?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const wakData = await wakRes.json();
    if (wakData.data && wakData.data.length > 0) {
      const wak = wakData.data[0];
      app.wakala_processing = {
        name: wak.name,
        applicant: app.name,
        status: wak.status,
        employee: wak.employee || app.assigned_employee_id,
      };
    } else if (app.assigned_employee_id) {
      const cleanId = String(app.name || "").replace("APP-", "");
      app.wakala_processing = {
        name: `WAK-${cleanId}`,
        applicant: app.name || "",
        status: "Pending",
        employee: app.assigned_employee_id,
      };
    }

    // Enrich with DSR Stamp, Ticket, Departure
    const stampRes = await fetch(`/api/resource/DSR%20Stamp?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const stampData = await stampRes.json();
    if (stampData.data && stampData.data.length > 0) {
      const st = stampData.data[0];
      app.dsr_stamp = {
        name: st.name,
        applicant: app.name,
        visa_number: st.stamp_number,
        stamped_date: st.stamp_date,
      };
    }

    const ticketRes = await fetch(`/api/resource/DSR%20Ticket?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const ticketData = await ticketRes.json();
    if (ticketData.data && ticketData.data.length > 0) {
      const tk = ticketData.data[0];
      app.dsr_ticket = {
        name: tk.name,
        applicant: app.name,
        ticket_pnr: tk.ticket_number,
        flight_number: "ET-402",
      };
    }

    const depRes = await fetch(`/api/resource/DSR%20Departure?filters=[["full_name","=","${encodeURIComponent(app.full_name || app.first_name)}"]]&fields=["*"]`);
    const depData = await depRes.json();
    if (depData.data && depData.data.length > 0) {
      const dp = depData.data[0];
      app.departure_info = {
        name: dp.name,
        applicant: app.name,
        departure_time: dp.departure_time,
        medical_2_result: dp.medical_2_result || "Pass",
      };
    }
  } catch (enrichErr) {
    console.warn("Applicant enrichment warning:", enrichErr);
  }

  return app;
}

// List Applicants: GET /api/resource/Applicant
export async function getApplicantsList(): Promise<Applicant[]> {
  const res = await fetch("/api/resource/Applicant");
  return handleApiResponse<Applicant[]>(res);
}

// RPC 1: Register Applicant (Stage 1 -> Stage 2)
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

// RPC 2: Generate CV PDF (Stage 2 -> Stage 3)
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

// Get CV Record directly: GET /api/resource/CV Record
export async function getCVRecord(applicantNameOrCvName: string): Promise<CVRecord | null> {
  if (applicantNameOrCvName.startsWith("CV-")) {
    const res = await fetch(`/api/resource/CV%20Record/${encodeURIComponent(applicantNameOrCvName)}`);
    return handleApiResponse<CVRecord>(res);
  }
  const res = await fetch(`/api/resource/CV%20Record?filters=[["applicant","=","${encodeURIComponent(applicantNameOrCvName)}"]]&fields=["*"]`);
  const json = await res.json();
  if (json.data && json.data.length > 0) {
    return json.data[0] as CVRecord;
  }
  return null;
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
// 2. CONTRACTOR & CONTRACT REQUESTS (Stage 3 -> Stage 4)
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

// Send Single Contract Request: Creates/updates Contract Request in Frappe and triggers send_contract_request RPC
export async function sendContractRequestApi(
  applicantId: string,
  contractorName: string = "tutu"
): Promise<ContractRequestResponse> {
  // 1. Fetch applicant details to get full name and passport
  let applicantData: Applicant | null = null;
  try {
    const appRes = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantId)}`);
    const appJson = await appRes.json();
    applicantData = appJson.data;
  } catch {
    // optional enrichment
  }

  // 2. Resolve CV Record for this applicant
  const cvRes = await fetch(`/api/resource/CV%20Record?filters=[["applicant","=","${encodeURIComponent(applicantId)}"]]&fields=["*"]`);
  const cvData = await cvRes.json();
  const cvRecord = cvData.data?.[0];
  const cleanId = String(applicantId || "").replace("APP-", "");
  let cvName = cvRecord?.name || `CV-${cleanId}`;

  // 3. Resolve Contractor details (phone, whatsapp)
  let contractorRecord: Contractor | null = null;
  try {
    const conRes = await fetch(`/api/resource/Contractor/${encodeURIComponent(contractorName)}`);
    const conJson = await conRes.json();
    contractorRecord = conJson.data;
  } catch {
    // optional enrichment
  }

  // 4. Check or create Contract Request
  const checkCr = await fetch(`/api/resource/Contract%20Request?filters=[["applicant","=","${encodeURIComponent(applicantId)}"]]&fields=["*"]&order_by=creation%20desc&limit_page_length=1`);
  const checkCrData = await checkCr.json();
  let existingCr = checkCrData.data?.[0];
  let crName = existingCr?.name;

  if (!crName) {
    const createCr = await fetch("/api/resource/Contract%20Request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant: applicantId,
        full_name: applicantData?.full_name || `${applicantData?.first_name || ""} ${applicantData?.last_name || ""}`.trim() || applicantId,
        cv_reference: cvName,
        contractor: contractorName,
        status: "Draft",
        created_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      }),
    });
    const createCrData = await handleApiResponse<any>(createCr);
    crName = createCrData?.name || `CR-${cleanId}`;
  } else if (existingCr.contractor !== contractorName) {
    // Update contractor on existing CR if user selected a different contractor
    const putRes = await fetch(`/api/resource/Contract%20Request/${encodeURIComponent(crName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractor: contractorName }),
    });
    await handleApiResponse<any>(putRes);
  }

  // 5. Call the real Frappe Backend RPC method: send_contract_request
  const rpcRes = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.contract_request.contract_request.send_contract_request",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_request_name: crName }),
    }
  );
  const rpcResult = await handleApiResponse<any>(rpcRes);

  const whatsappPhone = contractorRecord?.whatsapp || contractorRecord?.phone || "+251940107716";
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, "");
  const applicantName = applicantData?.full_name || `${applicantData?.first_name || ""} ${applicantData?.last_name || ""}`.trim() || applicantId;
  const defaultWhatsappText = `Hello ${contractorRecord?.contact_person || "Partner"},\n\nA new Contract Request *${crName}* has been sent to you for Applicant *${applicantName}*.\nPassport: ${applicantData?.passport_number || "Verified"}\n\nPlease review and confirm allocation.`;
  const defaultWhatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(defaultWhatsappText)}`;

  return {
    message: {
      status: "success",
      message: rpcResult?.message || `Contract Request ${crName} successfully sent to Contractor: ${contractorRecord?.company_name || contractorName} (${whatsappPhone}).`,
      whatsapp_url: rpcResult?.whatsapp_url || defaultWhatsappUrl,
      whatsapp_api_sent: rpcResult?.whatsapp_api_sent ?? false,
      whatsapp_api_message: rpcResult?.whatsapp_api_message || (rpcResult?.whatsapp_api_sent ? "Document dispatched via Meta WhatsApp Cloud API." : "Ready for direct WhatsApp Web conversation."),
      whatsapp_number: rpcResult?.whatsapp_number || cleanPhone,
      contractor_name: rpcResult?.contractor_name || contractorRecord?.company_name || contractorName,
      contract_request: crName,
    },
  };
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
// 3. APPLICANT DOSSIER & OCR PARSING (Stage 4 -> Stage 5)
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

// Approve Dossier and advance to "Selected" (Stage 5)
export async function approveDossierAndSelectApplicant(
  applicantId: string,
  dossierDetails?: { sponsor_name?: string; sponsor_id?: string; visa_number?: string; contractor_name?: string; salary?: number; job_title?: string }
): Promise<{ message: string }> {
  // 1. Resolve Contract Request & CV Record
  const crRes = await fetch(`/api/resource/Contract%20Request?filters=[["applicant","=","${encodeURIComponent(applicantId)}"]]&fields=["*"]`);
  const crData = await crRes.json();
  const cr = crData.data?.[0];
  const cleanId = String(applicantId || "").replace("APP-", "");
  const crName = cr?.name || `CR-${cleanId}`;
  const cvRef = cr?.cv_reference || `CV-${cleanId}`;

  // 2. Check if Dossier already exists for this applicant
  const dosCheck = await fetch(`/api/resource/Applicant%20Dossier?filters=[["applicant","=","${encodeURIComponent(applicantId)}"]]&fields=["*"]`);
  const dosCheckData = await dosCheck.json();
  let dosName = dosCheckData.data?.[0]?.name;

  const payload: Record<string, any> = {
    contract_request: crName,
    applicant: applicantId,
    cv_record: cvRef,
    is_parsed: 1,
    approval_status: "Approved",
  };

  if (dossierDetails?.sponsor_name) payload.sponsor_name = dossierDetails.sponsor_name;
  if (dossierDetails?.sponsor_id) payload.sponsor_id = dossierDetails.sponsor_id;
  if (dossierDetails?.visa_number) payload.visa_number = dossierDetails.visa_number;
  if (dossierDetails?.contractor_name) payload.contractor_name = dossierDetails.contractor_name;
  if (dossierDetails?.salary) payload.salary = dossierDetails.salary;
  if (dossierDetails?.job_title) payload.job_title = dossierDetails.job_title;

  if (dosName) {
    const putRes = await fetch(`/api/resource/Applicant%20Dossier/${encodeURIComponent(dosName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await handleApiResponse<any>(putRes);
  } else {
    const postRes = await fetch("/api/resource/Applicant Dossier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await handleApiResponse<any>(postRes);
  }

  // 3. Request backend recalculation of applicant state following dossier approval
  try {
    await recalculateApplicantStateApi(applicantId);
  } catch {}

  return { message: "Dossier confirmed! Submitted to backend for validation." };
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
  return await handleApiResponse<ParseDossierResponse>(res);
}

// ---------------------------------------------------------------------------
// 4. CLEARANCES (LMS, WAKALA, INJAZ) (Stage 5 -> Stage 6)
// ---------------------------------------------------------------------------

async function resolveClearanceDocName(
  doctype: "LMS Clearance" | "Injaz Clearance" | "Wakala Clearance",
  applicantIdOrName: string,
  providedName: string
): Promise<string> {
  if (providedName && !providedName.includes("APP-")) {
    return providedName;
  }
  try {
    let fullName = applicantIdOrName;
    if (applicantIdOrName.startsWith("APP-")) {
      const appRes = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantIdOrName)}`);
      if (appRes.ok) {
        const appJson = await appRes.json();
        fullName = appJson.data?.full_name || appJson.data?.first_name || applicantIdOrName;
      }
    }
    const res = await fetch(
      `/api/resource/${encodeURIComponent(doctype)}?filters=[["full_name","=","${encodeURIComponent(fullName)}"]]&fields=["name"]`
    );
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        return json.data[0].name;
      }
    }
  } catch {}
  return providedName;
}

// Update LMS Clearance
export async function updateLmsClearanceApi(
  name: string,
  data: Partial<LMSClearance> & { financials?: any[] }
): Promise<LMSClearance> {
  const docName = await resolveClearanceDocName("LMS Clearance", data.applicant || name, name);
  const res = await fetch(`/api/resource/LMS Clearance/${encodeURIComponent(docName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<LMSClearance>(res);
}

// Update Wakala Clearance
export async function updateWakalaClearanceApi(
  name: string,
  data: Partial<WakalaClearance> & { financials?: any[] }
): Promise<WakalaClearance> {
  const docName = await resolveClearanceDocName("Wakala Clearance", data.applicant || name, name);
  const res = await fetch(`/api/resource/Wakala Clearance/${encodeURIComponent(docName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<WakalaClearance>(res);
}

// Update Injaz Clearance
export async function updateInjazClearanceApi(
  name: string,
  data: Partial<InjazClearance> & { financials?: any[] }
): Promise<InjazClearance> {
  const docName = await resolveClearanceDocName("Injaz Clearance", data.applicant || name, name);
  const res = await fetch(`/api/resource/Injaz Clearance/${encodeURIComponent(docName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<InjazClearance>(res);
}

// Update Embassy Clearance
export async function updateEmbassyClearanceApi(
  name: string,
  data: Partial<EmbassyClearance> & { financials?: any[] }
): Promise<EmbassyClearance> {
  const res = await fetch(`/api/resource/Embassy Clearance/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<EmbassyClearance>(res);
}

// Update Telesign Clearance
export async function updateTelesignClearanceApi(
  name: string,
  data: Partial<TelesignClearance>
): Promise<TelesignClearance> {
  const res = await fetch(`/api/resource/Telesign Clearance/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleApiResponse<TelesignClearance>(res);
}

// Helper to get DSR name for an applicant
async function resolveDsrForApplicant(applicantId: string): Promise<string> {
  let fullName = "";
  let passportNo = "";
  try {
    const appRes = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantId)}`);
    if (appRes.ok) {
      const appData = await appRes.json();
      fullName = appData.data?.full_name || appData.data?.first_name || "";
      passportNo = appData.data?.passport_number || "";
    }
  } catch {}

  const dsrRes = await fetch(`/api/resource/DSR?fields=["*"]&limit_page_length=100`);
  const dsrData = await dsrRes.json();
  const allDsrs: any[] = dsrData.data || [];

  // Match 1: By applicant full name
  if (fullName) {
    const matchedByName = allDsrs.find(
      (d) =>
        d.full_name &&
        (d.full_name.toLowerCase().trim() === fullName.toLowerCase().trim() ||
          fullName.toLowerCase().includes(d.full_name.toLowerCase()) ||
          d.full_name.toLowerCase().includes(fullName.toLowerCase()))
    );
    if (matchedByName) return matchedByName.name;
  }

  // Match 2: By passport number
  if (passportNo) {
    const matchedByPassport = allDsrs.find(
      (d) => d.passport_number && d.passport_number.trim() === passportNo.trim()
    );
    if (matchedByPassport) return matchedByPassport.name;
  }

  // Match 3: By applicant ID or dossier reference
  const matchedById = allDsrs.find(
    (d) =>
      d.name === applicantId ||
      d.name?.includes(applicantId.replace("APP-", "")) ||
      d.applicant_dossier?.includes(applicantId.replace("APP-", ""))
  );
  if (matchedById) return matchedById.name;

  return allDsrs[allDsrs.length - 1]?.name || `DSR-00001`;
}

// Assign Employee to Clearances & Advance to Processing (Stage 6)
export async function assignEmployeeApi(
  applicantIds: string[],
  roleType: string,
  employeeId: string,
  streamAssignments?: { lms?: string; injaz?: string; wakala?: string }
): Promise<{ message: string }> {
  const lmsEmp = streamAssignments?.lms || employeeId;
  const injazEmp = streamAssignments?.injaz || employeeId;
  const wakalaEmp = streamAssignments?.wakala || employeeId;

  for (const id of applicantIds) {
    const cleanId = String(id || "").replace("APP-", "");
    const lmsClearance = { name: `LMS-${cleanId}`, applicant: id, employee: lmsEmp, status: "Pending" as const };
    const injazClearance = { name: `INJ-${cleanId}`, applicant: id, employee: injazEmp, status: "Pending" as const };
    const wakalaClearance = { name: `WAK-${cleanId}`, applicant: id, employee: wakalaEmp, status: "Pending" as const };

    try { await updateLmsClearanceApi(`LMS-${cleanId}`, lmsClearance); } catch {}
    try { await updateInjazClearanceApi(`INJ-${cleanId}`, injazClearance); } catch {}
    try { await updateWakalaClearanceApi(`WAK-${cleanId}`, wakalaClearance); } catch {}

    await updateApplicantDraft(id, {
      assigned_employee_id: employeeId,
      assigned_role_type: roleType,
      lms_processing: lmsClearance,
      injaz_processing: injazClearance,
      wakala_processing: wakalaClearance,
    });

    try {
      await recalculateApplicantStateApi(id);
    } catch {}
  }
  return { message: "Employees successfully assigned across clearances." };
}

// ---------------------------------------------------------------------------
// 5. PRE-DEPARTURE GUARDRAIL STAGES (STAMP, TICKET, DEPARTURE)
// ---------------------------------------------------------------------------

// Create/Update DSR Stamp (Stage 6 -> Stage 7)
export async function submitDsrStampApi(data: Partial<DSRStamp> & { financials?: any[] }): Promise<DSRStamp> {
  const applicantId = data.applicant || "";
  const dsrName = data.dsr || await resolveDsrForApplicant(applicantId);

  const payload: any = {
    dsr: dsrName,
    stamp_number: data.visa_number || "VISA-ETH-991823",
    stamp_date: data.stamped_date || new Date().toISOString().split("T")[0],
    status: "Completed",
  };
  if (data.financials && data.financials.length > 0) {
    payload.financials = data.financials;
  }

  const res = await fetch("/api/resource/DSR Stamp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await handleApiResponse<DSRStamp>(res);

  if (applicantId) {
    try {
      await recalculateApplicantStateApi(applicantId);
    } catch {}
  }

  return result;
}

// Create/Update DSR Ticket (Stage 7 -> Stage 8)
export async function submitDsrTicketApi(data: Partial<DSRTicket>): Promise<DSRTicket> {
  const applicantId = data.applicant || "";
  const dsrName = data.dsr || await resolveDsrForApplicant(applicantId);

  const res = await fetch("/api/resource/DSR Ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dsr: dsrName,
      ticket_number: data.ticket_pnr || "ET-TKT-8849102",
      ticket_details: `Flight ${data.flight_number || "ET604"} to ${data.destination || "Riyadh"} on ${data.departure_date || "2026-08-25"}`,
      status: "Booked",
    }),
  });

  const result = await handleApiResponse<DSRTicket>(res);

  if (applicantId) {
    try {
      await recalculateApplicantStateApi(applicantId);
    } catch {}
  }

  return result;
}

// Create/Update DSR Departure (Stage 8 -> Stage 9: 100%)
export async function submitDsrDepartureApi(data: Partial<DSRDeparture> & { financials?: any[] }): Promise<DSRDeparture> {
  const applicantId = data.applicant || "";
  const dsrName = data.dsr || await resolveDsrForApplicant(applicantId);

  const payload: any = {
    dsr: dsrName,
    departure_time: data.departure_time ? `${data.departure_date || new Date().toISOString().split("T")[0]} 22:30:00` : new Date().toISOString().slice(0, 19).replace("T", " "),
    medical_2_result: data.medical_2_result || "Pass",
    medical_2_date: new Date().toISOString().split("T")[0],
    status: "Departed",
  };
  if (data.financials && data.financials.length > 0) {
    payload.financials = data.financials;
  }

  const res = await fetch("/api/resource/DSR Departure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await handleApiResponse<DSRDeparture>(res);

  if (applicantId) {
    try {
      await recalculateApplicantStateApi(applicantId);
    } catch {}
  }

  return result;
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
  let rpcSummary: any = null;
  try {
    const res = await fetch(
      "/api/method/applicant_processing.applicant_processing.api.get_accounting_summary"
    );
    if (res.ok) {
      rpcSummary = await handleApiResponse<AccountingSummaryResponse>(res);
    }
  } catch {}

  // Also query live financial tables across Frappe clearances to guarantee all fees are aggregated
  try {
    const doctypes = [
      "LMS Clearance",
      "Injaz Clearance",
      "Wakala Clearance",
      "DSR Stamp",
      "DSR Ticket",
      "DSR Departure",
      "DSR",
    ];
    let aggregatedIncome = 0;
    let aggregatedExpense = 0;
    const allRecentTransactions: any[] = [];

    for (const dt of doctypes) {
      const res = await fetch(`/api/resource/${encodeURIComponent(dt)}?fields=["name","full_name","first_name","creation"]&limit_page_length=50`);
      if (res.ok) {
        const json = await res.json();
        for (const doc of json.data || []) {
          const detailRes = await fetch(`/api/resource/${encodeURIComponent(dt)}/${encodeURIComponent(doc.name)}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const financials = detail.data?.financials || [];
            for (const row of financials) {
              const amount = Number(row.amount) || 0;
              if (row.transaction_type === "Income") aggregatedIncome += amount;
              else if (row.transaction_type === "Expense") aggregatedExpense += amount;
              allRecentTransactions.push({
                name: row.name || row.description,
                stage: dt,
                stage_doc: doc.name,
                transaction_type: row.transaction_type,
                amount: amount,
                date: row.date || detail.data?.creation?.split(" ")[0] || new Date().toISOString().split("T")[0],
                description: row.description || `${dt} Fee`,
                source_doctype: dt,
                applicant_name: doc.full_name || doc.first_name || "",
              });
            }
          }
        }
      }
    }

    if (allRecentTransactions.length > 0 || (rpcSummary && (rpcSummary.total_income > 0 || rpcSummary.total_expense > 0))) {
      const totalInc = Math.max(aggregatedIncome, rpcSummary?.total_income || 0);
      const totalExp = Math.max(aggregatedExpense, rpcSummary?.total_expense || 0);
      return {
        total_income: totalInc,
        total_expense: totalExp,
        net_balance: totalInc - totalExp,
        transaction_count: allRecentTransactions.length || rpcSummary?.transaction_count || 0,
        by_stage: rpcSummary?.by_stage || [],
        by_fee_type: rpcSummary?.by_fee_type || {},
        per_applicant: rpcSummary?.per_applicant || [],
        recent_transactions: allRecentTransactions.length > 0 ? allRecentTransactions : (rpcSummary?.recent_transactions || []),
      };
    }
  } catch (aggErr) {
    console.warn("Accounting aggregation fallback:", aggErr);
  }

  if (rpcSummary) return rpcSummary;

  return {
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    transaction_count: 0,
    by_stage: [],
    by_fee_type: {},
    per_applicant: [],
    recent_transactions: [],
  };
}

// ---------------------------------------------------------------------------
// 8. EMPLOYEE / USER ADMINISTRATION SUITE (OFFICIAL BACKEND APIS)
// ---------------------------------------------------------------------------

export interface SystemRoleItem {
  role_name: string;
  label?: string;
  description?: string;
  is_custom?: number;
}

export interface SystemUserRecord {
  name: string;
  email: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  phone?: string;
  enabled: number | boolean;
  user_type: string;
  roles: string[];
  contractor?: string | null;
  last_login?: string;
  creation?: string;
}

export interface SystemUsersListResponse {
  message: {
    users: SystemUserRecord[];
    total: number;
  };
}

export interface CreateSystemUserPayload {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  password?: string;
  roles: string[];
  contractor?: string | null;
  user_type?: string;
  send_welcome_email?: boolean;
}

export interface UpdateSystemUserPayload {
  user: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  enabled?: number | boolean;
  roles?: string[];
  contractor?: string | null;
}

export interface SetUserPasswordPayload {
  user: string;
  new_password: string;
  logout_all_sessions?: boolean;
}

export interface AssignUserRolesPayload {
  user: string;
  roles: string[];
  replace?: boolean;
}

export interface ManageUserPermissionPayload {
  action: "list" | "add" | "remove";
  user: string;
  for_value?: string;
  allow?: string;
  applicable_for?: string;
}

// 8.1 Get Available Curated Roles
export async function getAvailableRolesApi(): Promise<SystemRoleItem[]> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.get_available_roles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );
  const json = await handleApiResponse<{ roles?: SystemRoleItem[] } | SystemRoleItem[]>(res);
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.roles)) return json.roles;
  return [];
}

// 8.2 Get System Users List
export async function getSystemUsersApi(params?: {
  search?: string;
  enabled?: number | boolean;
  role?: string;
  limit?: number;
  start?: number;
}): Promise<SystemUserRecord[]> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.get_system_users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    }
  );
  const json = await handleApiResponse<any>(res);
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.users)) return json.users;
  if (Array.isArray(json?.message?.users)) return json.message.users;
  return [];
}

// 8.3 Create System User with Password and Roles
export async function createSystemUserApi(payload: CreateSystemUserPayload): Promise<SystemUserRecord> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.create_system_user",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const json = await handleApiResponse<any>(res);
  return json?.user || json?.message?.user || json?.data || json;
}

// 8.4 Update System User Profile & Status
export async function updateSystemUserApi(payload: UpdateSystemUserPayload): Promise<SystemUserRecord> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.update_system_user",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const json = await handleApiResponse<any>(res);
  return json?.user || json?.message?.user || json;
}

// 8.5 Admin Reset User Password
export async function setUserPasswordApi(payload: SetUserPasswordPayload): Promise<{ status: string; message: string }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.set_user_password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleApiResponse<{ status: string; message: string }>(res);
}

// 8.6 Assign / Replace User Roles
export async function assignUserRolesApi(payload: AssignUserRolesPayload): Promise<{ status: string; roles: string[] }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.assign_user_roles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleApiResponse<{ status: string; roles: string[] }>(res);
}

// 8.7 Manage User Permissions
export async function manageUserPermissionApi(payload: ManageUserPermissionPayload): Promise<any> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.manage_user_permission",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleApiResponse<any>(res);
}

// 8.8 Get Single User Detail
export async function getUserDetailApi(user: string): Promise<any> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.get_user_detail",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    }
  );
  return handleApiResponse<any>(res);
}

// Backward-compatible employee models mapped to real backend users
export interface EmployeeRecord {
  name: string;
  employee_name: string;
  role: string;
  roles: string[];
  role_type: string;
  email: string;
  phone?: string;
  status: string;
  enabled: boolean;
  contractor?: string | null;
  creation?: string;
}

export async function getEmployeesList(): Promise<EmployeeRecord[]> {
  try {
    const users = await getSystemUsersApi();
    if (Array.isArray(users) && users.length > 0) {
      return users.map((u) => {
        const primaryRole = u.roles?.[0] || "Operations Specialist";
        return {
          name: u.email || u.name,
          employee_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
          role: primaryRole,
          roles: u.roles || [primaryRole],
          role_type: primaryRole.includes("LMS")
            ? "LMS"
            : primaryRole.includes("Injaz")
            ? "Injaz"
            : primaryRole.includes("Wakala")
            ? "Wakala"
            : primaryRole.includes("Embassy")
            ? "Embassy"
            : "Operations",
          email: u.email || u.name,
          phone: u.phone || "",
          status: u.enabled ? "Active" : "Inactive",
          enabled: Boolean(u.enabled),
          contractor: u.contractor,
          creation: u.creation,
        };
      });
    }
  } catch (err) {
    console.error("Failed to fetch system users:", err);
  }
  return [];
}

export async function createEmployee(data: Partial<EmployeeRecord> & { password?: string }): Promise<EmployeeRecord> {
  const email = data.email || `${(data.employee_name || "user").toLowerCase().replace(/\s+/g, ".")}@agency.et`;
  const nameParts = (data.employee_name || "Staff Member").trim().split(" ");
  const firstName = nameParts[0] || "Staff";
  const lastName = nameParts.slice(1).join(" ") || "Member";

  const rawRoles = data.roles && data.roles.length > 0 ? data.roles : data.role ? [data.role] : ["LMS Employee"];

  const created = await createSystemUserApi({
    email,
    first_name: firstName,
    last_name: lastName,
    phone: data.phone || "",
    password: data.password || "InitialPass123!",
    roles: rawRoles,
    contractor: data.contractor || null,
    user_type: "System User",
    send_welcome_email: false,
  });

  return {
    name: created.email || email,
    employee_name: created.full_name || data.employee_name || firstName,
    role: created.roles?.[0] || rawRoles[0],
    roles: created.roles || rawRoles,
    role_type: rawRoles[0] || "Operations",
    email: created.email || email,
    phone: created.phone || data.phone || "",
    status: created.enabled ? "Active" : "Inactive",
    enabled: Boolean(created.enabled),
    contractor: created.contractor,
    creation: created.creation || new Date().toISOString(),
  };
}

export async function recordAccountingTransactionApi(data: {
  transaction_type: "Income" | "Expense";
  amount: number;
  description: string;
  applicant?: string;
  date?: string;
  source_doctype?: string;
}): Promise<any> {
  const payload = {
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    source_doctype: data.source_doctype || data.applicant || "General Agency Operation",
    date: data.date || new Date().toISOString().split("T")[0],
  };

  const res = await fetch("/api/resource/Income%20Expense%20Log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleApiResponse<any>(res);
}

// ---------------------------------------------------------------------------
// 9. REAL LIVE BACKEND NOTIFICATIONS ENGINE
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  category: "compliance" | "workflow" | "dossier" | "finance" | "system";
  severity: "urgent" | "warning" | "info" | "success";
  timestamp: string;
  applicant_id?: string;
  applicant_name?: string;
  action_url: string;
  action_label: string;
  is_read?: boolean;
}

export async function getNotificationsList(): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const dismissedIds: string[] = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("dismissed_notifications") || "[]")
    : [];

  try {
    const [appRes, dosRes, dsrRes] = await Promise.all([
      fetch('/api/resource/Applicant?fields=["name","full_name","first_name","applicant_state","passport_expiry","medical_expiry","medical_status","coc_status","creation"]&limit_page_length=100'),
      fetch('/api/resource/Applicant%20Dossier?fields=["name","applicant","contractor_name","sponsor_name","job_title","creation"]&limit_page_length=50'),
      fetch('/api/resource/DSR?fields=["name","full_name","lms_status","wakala_status","injaz_status","stamp_status","ticket_status","departure_status"]&limit_page_length=50'),
    ]);

    const appJson = await appRes.json();
    const dosJson = await dosRes.json();
    const dsrJson = await dsrRes.json();

    const applicants: any[] = appJson.data || [];
    const dossiers: any[] = dosJson.data || [];
    const dsrs: any[] = dsrJson.data || [];

    const now = new Date();

    // 1. Applicant Compliance & Expiry Notifications
    for (const app of applicants) {
      const name = app.full_name || app.first_name || app.name;

      // Passport Expiry Check
      if (app.passport_expiry) {
        const passDate = new Date(app.passport_expiry);
        const diffDays = Math.round((passDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          notifications.push({
            id: `pass-urgent-${app.name}`,
            title: `Urgent: Passport Expiring Soon (${diffDays} days)`,
            description: `${name}'s passport expires on ${app.passport_expiry}. Immediate renewal required before embassy processing.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Action Required",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${app.name}`,
            action_label: "View Profile",
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `pass-expired-${app.name}`,
            title: `Critical: Passport Expired (${Math.abs(diffDays)} days ago)`,
            description: `${name}'s passport has expired (${app.passport_expiry}). All visa processes are on hold.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Immediate Action",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${app.name}`,
            action_label: "Update Passport",
          });
        } else if (diffDays <= 90) {
          notifications.push({
            id: `pass-warn-${app.name}`,
            title: `Passport Expiry Alert (${diffDays} days)`,
            description: `${name}'s passport will expire in under 3 months (${app.passport_expiry}).`,
            category: "compliance",
            severity: "warning",
            timestamp: "Upcoming",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${app.name}`,
            action_label: "View Profile",
          });
        }
      }

      // Medical Expiry Check
      if (app.medical_expiry) {
        const medDate = new Date(app.medical_expiry);
        const diffDays = Math.round((medDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15 && diffDays >= 0) {
          notifications.push({
            id: `med-urgent-${app.name}`,
            title: `Urgent: GAMCA Medical Lab Expiring (${diffDays} days)`,
            description: `${name}'s GAMCA medical certificate will expire on ${app.medical_expiry}. Complete biometrics or re-test.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Action Required",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${app.name}`,
            action_label: "Check Medical",
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `med-expired-${app.name}`,
            title: `Medical Certificate Expired`,
            description: `${name}'s lab fitness certificate expired on ${app.medical_expiry}. Re-examination required.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Compliance Alert",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${app.name}`,
            action_label: "Update Medical",
          });
        }
      }

      // Ready for Staff Assignment
      if (app.applicant_state === "Selected" || app.applicant_state === "Ready for Processing") {
        notifications.push({
          id: `assign-${app.name}`,
          title: `Assign Staff Officer: ${name}`,
          description: `Contractor demand confirmed for ${name}. Assign an operations lead to launch LMS, Injaz, and Wakala streams.`,
          category: "workflow",
          severity: "info",
          timestamp: "Ready for Processing",
          applicant_id: app.name,
          applicant_name: name,
          action_url: `/applicants/${app.name}`,
          action_label: "Assign Staff",
        });
      }
    }

    // 2. Clearances & Placement Notifications from DSR
    for (const dsr of dsrs) {
      const name = dsr.full_name || dsr.name;
      const isClearancesComplete =
        dsr.lms_status === "Issued" &&
        dsr.wakala_status === "Completed" &&
        dsr.injaz_status === "Completed";

      // Ready for Visa Stamping
      if (isClearancesComplete && (!dsr.stamp_status || dsr.stamp_status === "Pending")) {
        notifications.push({
          id: `stamp-ready-${dsr.name}`,
          title: `Clearances 100% Verified: ${name}`,
          description: `LMS permit issued, Wakala authorized, and Injaz biometrics passed. Ready for Embassy Visa Stamping.`,
          category: "workflow",
          severity: "success",
          timestamp: "Visa Stamping Ready",
          applicant_name: name,
          action_url: `/applicants`,
          action_label: "Manage Clearances",
        });
      }

      // Ready for Flight Ticket
      if (dsr.stamp_status === "Completed" && (!dsr.ticket_status || dsr.ticket_status === "Pending")) {
        notifications.push({
          id: `ticket-ready-${dsr.name}`,
          title: `Visa Stamped: Book Flight Ticket for ${name}`,
          description: `Embassy visa endorsement confirmed. Proceed to issue airline reservation and PNR code.`,
          category: "workflow",
          severity: "info",
          timestamp: "Ticketing Ready",
          applicant_name: name,
          action_url: `/applicants`,
          action_label: "Issue Ticket",
        });
      }

      // Ready for Departure & Medical 2
      if (dsr.ticket_status === "Booked" && (!dsr.departure_status || dsr.departure_status === "Pending")) {
        notifications.push({
          id: `depart-ready-${dsr.name}`,
          title: `Flight Booked: Pre-Departure Check for ${name}`,
          description: `Flight ticket confirmed. Conduct Pre-Departure Medical 2 examination to finalize deployment.`,
          category: "workflow",
          severity: "warning",
          timestamp: "Pre-Departure",
          applicant_name: name,
          action_url: `/applicants`,
          action_label: "Verify & Depart",
        });
      }
    }

    // 3. Contractor Demand Dossiers
    for (const dos of dossiers) {
      notifications.push({
        id: `dossier-${dos.name}`,
        title: `Contractor Demand: ${dos.contractor_name || "Partner"}`,
        description: `Candidate selected for ${dos.job_title || "Hospitality Specialist"} (Sponsor: ${dos.sponsor_name || "Authorized Sponsor"}).`,
        category: "dossier",
        severity: "info",
        timestamp: dos.creation ? dos.creation.split(" ")[0] : "Recent",
        applicant_id: dos.applicant,
        action_url: dos.applicant ? `/applicants/${dos.applicant}/contractor-doc` : "/contractors",
        action_label: "View Demand Dossier",
      });
    }
  } catch (err) {
    console.error("Notifications fetch warning:", err);
  }

  return notifications.filter((n) => !dismissedIds.includes(n.id));
}

// ---------------------------------------------------------------------------
// 10. CANDIDATE POOL & AGENT DISCOVERY APIS
// ---------------------------------------------------------------------------

export async function getPortalAvailableCandidates(filters?: {
  contractor?: string;
  destination_country?: string;
  job_applied?: string;
  religion?: string;
  limit?: number;
}): Promise<PortalAvailableCandidate[]> {
  const params = new URLSearchParams();
  if (filters?.contractor) params.append("contractor", filters.contractor);
  if (filters?.destination_country) params.append("destination_country", filters.destination_country);
  if (filters?.job_applied) params.append("job_applied", filters.job_applied);
  if (filters?.religion) params.append("religion", filters.religion);
  if (filters?.limit) params.append("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  let serverList: PortalAvailableCandidate[] = [];

  try {
    const res = await fetch(
      `/api/method/applicant_processing.applicant_processing.api.get_portal_available_candidates${query}`
    );
    if (res.ok) {
      serverList = await handleApiResponse<PortalAvailableCandidate[]>(res);
    }
  } catch (err) {
    console.warn("get_portal_available_candidates RPC warning:", err);
  }

  if (Array.isArray(serverList) && serverList.length > 0) {
    return serverList;
  }

  // Load registered applicants directly from official /api/resource/Applicant
  // Strictly adhering to authoritative rule: applicant_state == "CV Generated" AND locked_contractor IS NULL
  try {
    const filterConditions: any[] = [
      ["applicant_state", "=", "CV Generated"],
    ];

    const fields = encodeURIComponent(
      JSON.stringify([
        "name",
        "full_name",
        "first_name",
        "middle_name",
        "last_name",
        "gender",
        "age",
        "date_of_birth",
        "nationality",
        "destination_country",
        "job_applied",
        "monthly_salary",
        "photo_passport",
        "photo_full_body",
        "skill_cleaning",
        "skill_cooking",
        "skill_arabic_cooking",
        "skill_baby_sitting",
        "skill_washing",
        "skill_ironing",
        "skill_elderly_care",
        "experience_country",
        "experience_period",
        "religion",
        "cv_file_url",
        "applicant_state",
        "selected_by",
        "locked_contractor",
      ])
    );

    const filterQuery = encodeURIComponent(JSON.stringify(filterConditions));
    const res = await fetch(`/api/resource/Applicant?filters=${filterQuery}&fields=${fields}&limit_page_length=1000`);
    if (res.ok) {
      const data = await res.json();
      const rawList: any[] = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

      let mapped: PortalAvailableCandidate[] = rawList
        .filter((a) => !a.selected_by && !a.locked_contractor && a.applicant_state === "CV Generated")
        .map((a) => ({
          name: a.name,
          applicant_id: a.name,
          full_name: a.full_name || `${a.first_name || ""} ${a.middle_name || ""} ${a.last_name || ""}`.trim() || a.name,
          gender: a.gender || "Female",
          age: a.age || 25,
          date_of_birth: a.date_of_birth,
          nationality: a.nationality || "Ethiopia",
          destination_country: a.destination_country || "Saudi Arabia",
          job_applied: a.job_applied || "Housemaid",
          monthly_salary: a.monthly_salary || 1200,
          photo_passport: a.photo_passport || "",
          photo_full_body: a.photo_full_body || "",
          skill_cleaning: a.skill_cleaning === "YES" || a.skill_cleaning === 1 ? 1 : 0,
          skill_cooking: a.skill_cooking === "YES" || a.skill_cooking === 1 ? 1 : 0,
          skill_arabic_cooking: a.skill_arabic_cooking === "YES" || a.skill_arabic_cooking === 1 ? 1 : 0,
          skill_baby_sitting: a.skill_baby_sitting === "YES" || a.skill_baby_sitting === 1 ? 1 : 0,
          skill_washing: a.skill_washing === "YES" || a.skill_washing === 1 ? 1 : 0,
          skill_ironing: a.skill_ironing === "YES" || a.skill_ironing === 1 ? 1 : 0,
          skill_elderly_care: a.skill_elderly_care === "YES" || a.skill_elderly_care === 1 ? 1 : 0,
          experience_country: a.experience_country || "First Time",
          experience_period: a.experience_period || "None",
          religion: a.religion || "Muslim",
          cv_file_url: a.cv_file_url || "",
          selected_by: a.selected_by,
        }));

      if (filters?.destination_country && filters.destination_country !== "All Countries") {
        mapped = mapped.filter((c) => c.destination_country.toLowerCase() === filters.destination_country!.toLowerCase());
      }
      if (filters?.job_applied && filters.job_applied !== "All Jobs") {
        mapped = mapped.filter((c) => c.job_applied.toLowerCase().includes(filters.job_applied!.toLowerCase()));
      }
      if (filters?.religion && filters.religion !== "All Religions") {
        mapped = mapped.filter((c) => (c.religion || "").toLowerCase() === filters.religion!.toLowerCase());
      }

      if (filters?.limit) {
        mapped = mapped.slice(0, filters.limit);
      }

      return mapped;
    }
  } catch (err) {
    console.warn("getPortalAvailableCandidates resource fetch warning:", err);
  }

  return serverList;
}

export async function portalSelectCandidateApi(
  applicantId: string,
  contractor?: string
): Promise<PortalSelectCandidateResponse> {
  const payload: { applicant_id: string; contractor?: string } = { applicant_id: applicantId };
  if (contractor) payload.contractor = contractor;

  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.portal_select_candidate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (res.status === 409) {
    const error: ApiError = {
      message: "This applicant is no longer available.",
      statusCode: 409,
    };
    throw error;
  }

  return handleApiResponse<PortalSelectCandidateResponse>(res);
}

export async function getAgencyReservedCandidatesApi(contractor?: string): Promise<AgencyPipelineCandidate[]> {
  try {
    const pipeline = await getAgencyPipelineCandidatesApi({ stage: "Selected", limit: 100 });
    if (Array.isArray(pipeline) && pipeline.length > 0) {
      return pipeline;
    }
  } catch (err) {
    console.warn("getAgencyPipelineCandidates warning for reserved stage:", err);
  }

  // Fallback to query official Applicant resource for Selected candidates
  try {
    const filters: any[] = [["applicant_state", "=", "Selected"]];
    if (contractor) {
      filters.push(["locked_contractor", "=", contractor]);
    }
    const fields = encodeURIComponent(
      JSON.stringify([
        "name",
        "full_name",
        "first_name",
        "last_name",
        "passport_number",
        "job_applied",
        "destination_country",
        "photo_passport",
        "cv_file_url",
        "applicant_state",
        "locked_contractor",
        "creation",
        "modified",
      ])
    );
    const filterQuery = encodeURIComponent(JSON.stringify(filters));
    const res = await fetch(`/api/resource/Applicant?filters=${filterQuery}&fields=${fields}&limit_page_length=100`);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : [];
      return rawList.map((a: any) => ({
        name: a.name,
        applicant_id: a.name,
        full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.name,
        passport_number: a.passport_number || "",
        job_applied: a.job_applied || "Housemaid",
        destination_country: a.destination_country || "Saudi Arabia",
        photo_passport: a.photo_passport || "",
        cv_file_url: a.cv_file_url || "",
        applicant_state: a.applicant_state || "Selected",
        contract_date: a.modified || a.creation || "",
        sponsor_name: "",
        visa_number: "",
      }));
    }
  } catch (err) {
    console.warn("getAgencyReservedCandidates resource fetch error:", err);
  }

  return [];
}

export async function portalReleaseCandidateApi(
  applicantId: string,
  contractor?: string
): Promise<{ message: string }> {
  const payload: { applicant_id: string; contractor?: string } = { applicant_id: applicantId };
  if (contractor) payload.contractor = contractor;

  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.portal_release_candidate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleApiResponse<{ message: string }>(res);
}

// ---------------------------------------------------------------------------
// 11. PASSPORT MRZ OCR AUTO-SCAN API
// ---------------------------------------------------------------------------

export async function scanPassportMRZApi(options: {
  file_url?: string;
  raw_mrz_text?: string;
  applicant_name?: string;
}): Promise<PassportOCRResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.scan_and_populate_passport",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    }
  );
  return handleApiResponse<PassportOCRResponse>(res);
}

// ---------------------------------------------------------------------------
// 12. FOREIGN AGENCY COMPLAINTS DESK APIS
// ---------------------------------------------------------------------------

export async function getAgencyComplaintsApi(filters?: {
  tab?: "unresolved" | "new" | "resolved";
  contractor?: string;
}): Promise<AgencyComplaint[]> {
  const params = new URLSearchParams();
  if (filters?.tab) params.append("tab", filters.tab);
  if (filters?.contractor && filters.contractor !== "All Agencies") {
    params.append("contractor", filters.contractor);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/method/applicant_processing.applicant_processing.api.get_agency_complaints${query}`
  );

  let allComplaints: AgencyComplaint[] = [];
  if (res.ok) {
    allComplaints = await handleApiResponse<AgencyComplaint[]>(res);
  } else {
    // If backend RPC is unavailable or returns an error, query the resource endpoint directly
    try {
      const resourceRes = await fetch(
        `/api/resource/Agency%20Complaint?fields=["*"]&order_by=creation%20desc&limit_page_length=100`
      );
      if (resourceRes.ok) {
        const json = await resourceRes.json();
        allComplaints = json.data || [];
      }
    } catch {
      allComplaints = [];
    }
  }

  // Apply filters on genuine backend data
  if (filters?.contractor && filters.contractor !== "All Agencies") {
    allComplaints = allComplaints.filter((c) =>
      c.contractor?.toLowerCase().includes(filters.contractor!.toLowerCase())
    );
  }

  if (filters?.tab === "unresolved") {
    allComplaints = allComplaints.filter((c) => c.status !== "Resolved" && c.status !== "Closed");
  } else if (filters?.tab === "new") {
    allComplaints = allComplaints.filter((c) => c.status === "Open");
  } else if (filters?.tab === "resolved") {
    allComplaints = allComplaints.filter((c) => c.status === "Resolved" || c.status === "Closed");
  }

  return allComplaints;
}

export async function submitAgencyComplaintApi(data: {
  contractor: string;
  applicant_search: string;
  complaint_category: string;
  severity: string;
  complaint_details: string;
  attachment?: string;
  full_name?: string;
}): Promise<any> {
  const payload = {
    ...data,
    full_name: data.full_name || data.applicant_search,
  };

  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.submit_agency_complaint",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  return handleApiResponse<any>(res);
}

export async function resolveAgencyComplaintApi(data: {
  complaint_id: string;
  outcome: string;
  resolution_notes: string;
  return_date?: string;
  replacement_applicant?: string;
}): Promise<any> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.resolve_agency_complaint",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return handleApiResponse<any>(res);
}

// ---------------------------------------------------------------------------
// 13. OPERATIONS & EXECUTIVE REPORTING APIS
// ---------------------------------------------------------------------------

export async function getOperationsSummaryApi(filters?: {
  from_date?: string;
  to_date?: string;
}): Promise<OperationsSummaryResponse> {
  const params = new URLSearchParams();
  if (filters?.from_date) params.append("from_date", filters.from_date);
  if (filters?.to_date) params.append("to_date", filters.to_date);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/method/applicant_processing.applicant_processing.api.get_operations_summary${query}`
  );
  return handleApiResponse<OperationsSummaryResponse>(res);
}

// ---------------------------------------------------------------------------
// 14. PIPELINE STATE RECOMPUTATION & WAKALA REMINDERS
// ---------------------------------------------------------------------------

export async function recalculateApplicantStateApi(
  applicantName: string
): Promise<{ message: string }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.recalculate_applicant_state",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantName }),
    }
  );
  return handleApiResponse<{ message: string }>(res);
}

export async function dispatchWakalaReminderApi(
  dsrName: string,
  channel: "whatsapp" | "push" | "both" = "both"
): Promise<{ message: { status: string; message: string } }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.dispatch_wakala_reminder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dsr_name: dsrName, channel }),
    }
  );
  return handleApiResponse<{ message: { status: string; message: string } }>(res);
}

// ---------------------------------------------------------------------------
// 15. WEB PUSH NOTIFICATION SUBSCRIPTION APIS
// ---------------------------------------------------------------------------

export async function getVapidPublicKeyApi(): Promise<{
  public_key: string;
  enabled: number;
}> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.utils.push_api.get_vapid_public_key"
  );
  return handleApiResponse<{ public_key: string; enabled: number }>(res);
}

export async function saveWebPushSubscriptionApi(data: {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.utils.push_api.save_web_push_subscription",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return handleApiResponse<{ status: string; message: string }>(res);
}

export async function sendTestWebPushApi(): Promise<{
  status: string;
  message: string;
}> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.utils.push_api.send_test_web_push",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleApiResponse<{ status: string; message: string }>(res);
}

// ---------------------------------------------------------------------------
// 16. HEADLESS AGENCY PORTAL & COMMISSION INTEGRATION APIS
// ---------------------------------------------------------------------------

export async function getMyAgencyContextApi(): Promise<AgencyContextResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.api.get_my_agency_context"
  );
  return handleApiResponse<AgencyContextResponse>(res);
}

export async function getAgencyCandidateDetailApi(
  applicantId: string
): Promise<PortalAvailableCandidate & Record<string, any>> {
  const res = await fetch(
    `/api/method/applicant_processing.applicant_processing.api.get_agency_candidate_detail?applicant_id=${encodeURIComponent(applicantId)}`
  );
  return handleApiResponse<PortalAvailableCandidate & Record<string, any>>(res);
}

export async function getAgencyPipelineCandidatesApi(filters?: {
  stage?: "all" | "Selected" | "Processing" | "Stamped" | "Ticketed" | "Departed" | string;
  limit?: number;
}): Promise<AgencyPipelineCandidate[]> {
  const params = new URLSearchParams();
  if (filters?.stage) params.append("stage", filters.stage);
  if (filters?.limit) params.append("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates${query}`
  );
  return handleApiResponse<AgencyPipelineCandidate[]>(res);
}

export async function getUnpaidCommissionSummaryApi(): Promise<UnpaidCommissionSummary> {
  try {
    const res = await fetch(
      "/api/method/applicant_processing.applicant_processing.utils.commission_export.get_unpaid_commission_summary"
    );
    const data = await handleApiResponse<any>(res);
    return (
      data?.message ||
      data?.data ||
      data || { total_departed: 0, agreed_rate: 1500, total_outstanding: 0, currency: "SAR" }
    );
  } catch {
    return { total_departed: 0, agreed_rate: 1500, total_outstanding: 0, currency: "SAR" };
  }
}

export async function getUnpaidCommissionCandidatesListApi(
  limit: number = 30
): Promise<UnpaidCommissionCandidate[]> {
  try {
    const res = await fetch(
      `/api/method/applicant_processing.applicant_processing.utils.commission_export.get_unpaid_commission_candidates_list?limit=${limit}`
    );
    const data = await handleApiResponse<any>(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.message)) return data.message;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function searchApplicantsForComplaintApi(
  query: string
): Promise<{ name: string; full_name: string; passport_number?: string; job_applied?: string; applicant_state?: string }[]> {
  try {
    const fields = encodeURIComponent(
      JSON.stringify(["name", "full_name", "first_name", "middle_name", "last_name", "passport_number", "job_applied", "destination_country", "applicant_state"])
    );
    const res = await fetch(`/api/resource/Applicant?fields=${fields}&limit_page_length=1000`);
    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const q = (query || "").toLowerCase().trim();

      const mapped = rawList.map((c: any) => ({
        name: c.name,
        full_name: c.full_name || `${c.first_name || ""} ${c.middle_name || ""} ${c.last_name || ""}`.trim() || c.name,
        passport_number: c.passport_number || "",
        job_applied: c.job_applied || "Housemaid",
        destination_country: c.destination_country || "GCC",
        applicant_state: c.applicant_state || "Registered",
      }));

      if (!q) return mapped;

      return mapped.filter((c: any) => {
        const fn = (c.full_name || "").toLowerCase();
        const pn = (c.passport_number || "").toLowerCase();
        const id = (c.name || "").toLowerCase();
        const parts = fn.split(" ").filter(Boolean);
        const firstName = parts[0] || "";
        const lastName = parts[parts.length - 1] || "";
        return (
          id.includes(q) ||
          fn.includes(q) ||
          firstName.includes(q) ||
          lastName.includes(q) ||
          pn.includes(q)
        );
      });
    }
  } catch (err) {
    console.warn("searchApplicantsForComplaintApi resource fetch warning:", err);
  }

  const res = await fetch(
    `/api/method/applicant_processing.applicant_processing.api.search_applicants_for_complaint?query=${encodeURIComponent(query)}`
  );
  return handleApiResponse<{ name: string; full_name: string; passport_number?: string }[]>(res);
}

export async function subscribeWebPushApi(subscriptionData: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}): Promise<{ status: string; message: string }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.utils.push_api.subscribe_web_push",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_data: subscriptionData }),
    }
  );
  return handleApiResponse<{ status: string; message: string }>(res);
}
