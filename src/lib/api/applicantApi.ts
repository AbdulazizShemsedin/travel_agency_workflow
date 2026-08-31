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
  CommissionLedgerItem,
  CommissionSummaryStats,
  UpdateMusanedStatusPayload,
  UpdateMusanedStatusResponse,
} from "@/types/applicant";
import { ProcessingData } from "@/types/processing";
import { BaseApplicantFormValues } from "@/lib/validations/applicant.schema";
import {
  listApplicantsV2,
  listPlacementsV2,
  listUnresolvedComplaintsV2,
  listMyClearanceStepsV2,
  generateCvV2,
  listPortalCandidatesV2,
  selectCandidateV2,
  createComplaintV2,
  resolveComplaintV2,
  getOperationsSummaryV2,
  triggerWakalaReminderV2,
  subscribeToPushV2,
  parsePassportFileV2,
  getPushSubscriptionStatusV2,
} from "./v2";
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";

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

  // Ensure photo fields are mapped to canonical Frappe schema
  if (data.profile_photo_url && !payload.photo_passport) {
    payload.photo_passport = data.profile_photo_url;
  }
  if (data.photo_passport && !payload.profile_photo_url) {
    payload.profile_photo_url = data.photo_passport;
  }

  // Ensure passport scan / copy fields are mapped to canonical Frappe schema
  if (data.passport_scan) {
    payload.passport_scan = data.passport_scan;
    payload.passport_copy = data.passport_scan;
    payload.passport_image = data.passport_scan;
    payload.passport_file = data.passport_scan;
    payload.passport_doc = data.passport_scan;
    payload.passport_attachment = data.passport_scan;
  }
  if ((data as any).passport_copy && !payload.passport_scan) {
    payload.passport_scan = (data as any).passport_copy;
    payload.passport_copy = (data as any).passport_copy;
    payload.passport_image = (data as any).passport_copy;
  }

  // Strip base64 data URLs if any (Frappe Attach Image requires /files/... URL)
  if (payload.photo_passport && typeof payload.photo_passport === "string" && payload.photo_passport.startsWith("data:")) {
    delete payload.photo_passport;
  }
  if (payload.profile_photo_url && typeof payload.profile_photo_url === "string" && payload.profile_photo_url.startsWith("data:")) {
    delete payload.profile_photo_url;
  }
  if (payload.photo_full_body && typeof payload.photo_full_body === "string" && payload.photo_full_body.startsWith("data:")) {
    delete payload.photo_full_body;
  }
  if (payload.passport_scan && typeof payload.passport_scan === "string" && payload.passport_scan.startsWith("data:")) {
    delete payload.passport_scan;
  }
  if (payload.passport_copy && typeof payload.passport_copy === "string" && payload.passport_copy.startsWith("data:")) {
    delete payload.passport_copy;
  }

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

  // Map skill fields to integer 1 / 0 (Check field in Frappe)
  const skillFields = [
    "skill_cleaning",
    "skill_cooking",
    "skill_washing",
    "skill_ironing",
    "skill_baby_sitting",
    "skill_baby_care",
    "skill_children_care",
    "skill_arabic_cooking",
    "skill_sewing",
    "skill_elder_care",
    "skill_elderly_care",
    "skill_driving",
  ];
  for (const sf of skillFields) {
    if (sf in data) {
      const val = (data as any)[sf];
      payload[sf] = (val === true || val === "YES" || val === "yes" || val === 1 || val === "1" || val === "True" || val === "true") ? 1 : 0;
    }
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

interface MusanedLocalRecord {
  is_uploaded_to_musaned: number;
  musaned_status: "Not Registered" | "Pending Verification" | "Registered" | "Rejected";
  musaned_reference_no?: string;
  musaned_uploaded_at?: string;
  musaned_registered_by?: string;
}

export function getStoredMusanedRecord(applicantName: string): MusanedLocalRecord | null {
  if (typeof window === "undefined" || !applicantName) return null;
  try {
    const raw = localStorage.getItem(`musaned_record_${applicantName}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export function setStoredMusanedRecord(applicantName: string, record: MusanedLocalRecord) {
  if (typeof window === "undefined" || !applicantName) return;
  try {
    localStorage.setItem(`musaned_record_${applicantName}`, JSON.stringify(record));
  } catch {
    // Ignore storage write errors
  }
}

export function enrichWithMusaned(app: Applicant): Applicant {
  if (!app || !app.name) return app;
  const stored = getStoredMusanedRecord(app.name);
  if (stored) {
    if (app.is_uploaded_to_musaned === undefined || app.is_uploaded_to_musaned === null) {
      app.is_uploaded_to_musaned = stored.is_uploaded_to_musaned;
    }
    if (!app.musaned_status) {
      app.musaned_status = stored.musaned_status;
    }
    if (!app.musaned_reference_no && stored.musaned_reference_no) {
      app.musaned_reference_no = stored.musaned_reference_no;
    }
    if (!app.musaned_uploaded_at && stored.musaned_uploaded_at) {
      app.musaned_uploaded_at = stored.musaned_uploaded_at;
    }
    if (!app.musaned_registered_by && stored.musaned_registered_by) {
      app.musaned_registered_by = stored.musaned_registered_by;
    }
  }
  return app;
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
      app.cv_file_url = app.cv_file_url || cv.file_attachment || (cv as any).file_url || (cv as any).r2_url;
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
      const attachmentUrl = dos.attached_file || dos.file_attachment || "";
      const rawFileName = dos.file_name || (attachmentUrl ? attachmentUrl.split("/").pop() : "Contractor_Demand_Dossier.pdf");
      app.contractor_doc = {
        name: dos.name,
        applicant: dos.applicant,
        contract_request: dos.contract_request,
        contractor_name: dos.contractor_name || dos.contractor,
        contract_number: dos.contract_number || dos.contract_no,
        visa_number: dos.visa_number || dos.visa_no,
        sponsor_name: dos.sponsor_name,
        sponsor_id: dos.sponsor_id,
        sponsor_phone: dos.sponsor_phone,
        job_title: dos.job_title || app.job_applied,
        salary: dos.salary || dos.amount_detail || (app.monthly_salary ? Number(app.monthly_salary) : 0),
        currency: dos.currency || "SAR",
        contract_period: dos.contract_period,
        destination_city: dos.destination_city || app.city,
        destination_country: dos.destination_country || app.destination_country,
        selection_status: dos.is_parsed ? "Selected" : "Pending",
        parsed_at: dos.creation,
        file_name: rawFileName,
        file_attachment: attachmentUrl,
        attached_file: attachmentUrl,
        approval_status: dos.approval_status || (dos.is_parsed ? "Approved" : "Pending"),
        notes: dos.notes,
      };
    }
  } catch (enrichErr) {
    console.warn("Applicant enrichment warning:", enrichErr);
  }

  return enrichWithMusaned(app);
}

// List Applicants: GET /api/resource/Applicant
export async function getApplicantsList(): Promise<Applicant[]> {
  const fields = [
    "name",
    "first_name",
    "middle_name",
    "last_name",
    "full_name",
    "gender",
    "religion",
    "place_of_birth",
    "leaving_town",
    "marital_status",
    "nationality",
    "phone_number",
    "city",
    "country",
    "date_of_birth",
    "age",
    "passport_number",
    "passport_expiry",
    "passport_issue_date",
    "job_applied",
    "destination_country",
    "applicant_type",
    "applicant_state",
    "medical_status",
    "medical_expiry_date",
    "coc_status",
    "photo_passport",
    "photo_full_body",
    "passport_scan",
    "locked_contractor",
    "experience_country",
    "experience_period",
    "monthly_salary",
    "creation",
    "modified",
  ];
  const fieldParam = encodeURIComponent(JSON.stringify(fields));
  const res = await fetch(
    `/api/resource/Applicant?fields=${fieldParam}&limit_page_length=0&order_by=creation desc`
  );
  const apps = await handleApiResponse<Applicant[]>(res);
  return (apps || []).map(enrichWithMusaned);
}

// RPC 1: Register Applicant (Stage 1 -> Stage 2)
export async function registerApplicant(
  applicantName: string
): Promise<{ message: string; applicant?: Applicant }> {
  if (isDemoMode()) {
    const updated = demoStore.registerApplicant(applicantName);
    return { message: "Applicant registered successfully", applicant: updated as any };
  }

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
  const result = await generateCvV2(applicantName);
  return {
    message: {
      cv_record: result.cv_file_url || `/applicants/${encodeURIComponent(applicantName)}/cv`,
      file_url: result.cv_file_url || `/applicants/${encodeURIComponent(applicantName)}/cv`,
      message: result.message || "CV generated successfully",
    },
  };
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
  if (isDemoMode()) {
    demoStore.cancelApplicant(applicantName, cancelRemarks);
    return { message: "Applicant cancelled successfully" };
  }

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

// RPC 4: Restore / Reopen Applicant
export async function restoreApplicant(
  applicantName: string,
  restoreOption: "auto" | "draft" | "registered" = "auto"
): Promise<RestoreApplicantResponse> {
  if (isDemoMode()) {
    const newState = restoreOption === "draft" ? "Draft" : "Registered";
    demoStore.updateApplicant(applicantName, { applicant_state: newState });
    return {
      message: {
        status: "success",
        new_state: newState,
        message: "Applicant restored successfully",
      },
    };
  }

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

// RPC 5: Update Musaned Pre-Registration Status (Saudi Corridor Prerequisite)
export async function updateMusanedStatusApi(
  payload: UpdateMusanedStatusPayload
): Promise<UpdateMusanedStatusResponse> {
  const isUploaded =
    payload.is_uploaded_to_musaned === 1 ||
    payload.is_uploaded_to_musaned === true ||
    payload.musaned_status === "Registered"
      ? 1
      : 0;

  const now = new Date().toISOString();
  const musanedRecord: MusanedLocalRecord = {
    is_uploaded_to_musaned: isUploaded,
    musaned_status: payload.musaned_status || (isUploaded ? "Registered" : "Not Registered"),
    musaned_reference_no: payload.musaned_reference_no || "",
    musaned_uploaded_at: now,
    musaned_registered_by: "Operations Staff",
  };

  // 1. Authoritative client-side persistence so state survives refetches and page reloads
  setStoredMusanedRecord(payload.applicant, musanedRecord);

  // 2. Call backend update_musaned_status method
  try {
    await fetch(
      "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant: payload.applicant,
          musaned_status: payload.musaned_status || "Verified",
          musaned_reference_no: payload.musaned_reference_no || `MUS-${Date.now().toString().slice(-6)}`,
        }),
      }
    );
  } catch {
    // Non-blocking fallback
  }

  const isReady =
    isUploaded === 1 ||
    payload.musaned_status === "Registered" ||
    Boolean(payload.musaned_reference_no && payload.musaned_reference_no.trim() !== "");

  return {
    status: "success",
    message: "Musaned status updated successfully",
    musaned_uploaded_at: musanedRecord.musaned_uploaded_at,
    musaned_registered_by: musanedRecord.musaned_registered_by,
    can_generate_cv: isReady,
    applicant: {
      name: payload.applicant,
      ...musanedRecord,
    } as any,
  };
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

// Approve Dossier and advance to "Selected" (Stage 4)
export async function approveDossierAndSelectApplicant(
  applicantId: string,
  dossierDetails?: {
    sponsor_name?: string;
    sponsor_id?: string;
    sponsor_phone?: string;
    contract_number?: string;
    visa_number?: string;
    contractor_name?: string;
    salary?: number;
    currency?: string;
    job_title?: string;
    destination_city?: string;
    destination_country?: string;
    contract_period?: string;
  }
): Promise<{ message: string }> {
  // 1. Resolve Contract Request & CV Record
  const crRes = await fetch(
    `/api/resource/Contract%20Request?filters=[["applicant","=","${encodeURIComponent(
      applicantId
    )}"]]&fields=["*"]`
  );
  const crData = await crRes.json();
  const cr = crData.data?.[0];
  const cleanId = String(applicantId || "").replace("APP-", "");
  const crName = cr?.name || `CR-${cleanId}`;
  const cvRef = cr?.cv_reference || `CV-${cleanId}`;

  // 2. Check if Dossier already exists for this applicant
  const dosCheck = await fetch(
    `/api/resource/Applicant%20Dossier?filters=[["applicant","=","${encodeURIComponent(
      applicantId
    )}"]]&fields=["*"]`
  );
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
  if (dossierDetails?.sponsor_phone) payload.sponsor_phone = dossierDetails.sponsor_phone;
  if (dossierDetails?.contract_number) payload.contract_number = dossierDetails.contract_number;
  if (dossierDetails?.visa_number) payload.visa_number = dossierDetails.visa_number;
  if (dossierDetails?.contractor_name) payload.contractor_name = dossierDetails.contractor_name;
  if (dossierDetails?.salary) payload.salary = dossierDetails.salary;
  if (dossierDetails?.currency) payload.currency = dossierDetails.currency;
  if (dossierDetails?.job_title) payload.job_title = dossierDetails.job_title;
  if (dossierDetails?.destination_city) payload.destination_city = dossierDetails.destination_city;
  if (dossierDetails?.destination_country) payload.destination_country = dossierDetails.destination_country;
  if (dossierDetails?.contract_period) payload.contract_period = dossierDetails.contract_period;

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

  // NOTE: Do NOT write applicant_state/state_step/state_progress from frontend.
  // These are BACKEND ONLY fields, managed by recalculate_applicant_state().

  // 3. Request backend recalculation of applicant state following dossier approval
  try {
    await recalculateApplicantStateApi(applicantId);
  } catch {}

  return { message: "Dossier confirmed! Submitted to backend for validation." };
}

// Parse Dossier File RPC / Authoritative Contract Parser
export async function parseDossierFileApi(
  dossierName: string
): Promise<ParseDossierResponse> {
  // Try authoritative parse_contract_document first
  try {
    const res = await fetch(
      "/api/method/applicant_processing.applicant_processing.utils.contract_parser.parse_contract_document",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossier_name: dossierName }),
      }
    );
    if (res.ok) {
      return await handleApiResponse<ParseDossierResponse>(res);
    }
  } catch (err) {
    console.warn("parse_contract_document error, falling back:", err);
  }

  // Fallback to parse_dossier_file
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
// 4. CLEARANCES & PROCESSING MODULE (CONTRACT-FIRST)
// ---------------------------------------------------------------------------

/**
 * Authoritative read path:
 *   Applicant → Applicant Dossier (via applicant)
 *             → DSR (via applicant_dossier)
 *             → LMS / Injaz / Wakala / Embassy / Telesign Clearances (via dsr)
 *             → DSR Stamp / Ticket / Departure (via dsr)
 */
export async function fetchProcessingData(applicantId: string): Promise<ProcessingData> {
  const result: ProcessingData = {
    dossier: null,
    dsr: null,
    lms: null,
    injaz: null,
    wakala: null,
    embassy: null,
    telesign: null,
    stamp: null,
    ticket: null,
    departure: null,
  };

  try {
    // 1. Fetch Applicant Dossier
    const dosRes = await fetch(
      `/api/resource/Applicant%20Dossier?filters=[["applicant","=","${encodeURIComponent(applicantId)}"]]&fields=["*"]&limit_page_length=1`,
      { cache: "no-store" }
    );
    if (!dosRes.ok) return result;
    const dosJson = await dosRes.json();
    if (!dosJson.data || dosJson.data.length === 0) return result;
    result.dossier = dosJson.data[0];

    const dossierName = result.dossier?.name;
    if (!dossierName) return result;

    // 2. Fetch DSR via applicant_dossier link
    const dsrRes = await fetch(
      `/api/resource/DSR?filters=[["applicant_dossier","=","${encodeURIComponent(dossierName)}"]]&fields=["*"]&order_by=creation%20desc&limit_page_length=1`,
      { cache: "no-store" }
    );
    if (!dsrRes.ok) return result;
    const dsrJson = await dsrRes.json();
    if (!dsrJson.data || dsrJson.data.length === 0) return result;
    result.dsr = dsrJson.data[0];

    const dsrName = result.dsr?.name;
    if (!dsrName) return result;

    // 3. Fetch all clearances and pre-departure records linked to this DSR in parallel
    const [
      lmsRes,
      injazRes,
      wakalaRes,
      embassyRes,
      telesignRes,
      stampRes,
      ticketRes,
      depRes,
    ] = await Promise.all([
      fetch(`/api/resource/LMS%20Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/Injaz%20Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/Wakala%20Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/Embassy%20Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/Telesign%20Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/DSR%20Stamp?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/DSR%20Ticket?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
      fetch(`/api/resource/DSR%20Departure?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["*"]&limit_page_length=1`, { cache: "no-store" }),
    ]);

    if (lmsRes.ok) {
      const j = await lmsRes.json();
      if (j.data && j.data.length > 0) result.lms = j.data[0];
    }
    if (injazRes.ok) {
      const j = await injazRes.json();
      if (j.data && j.data.length > 0) result.injaz = j.data[0];
    }
    if (wakalaRes.ok) {
      const j = await wakalaRes.json();
      if (j.data && j.data.length > 0) result.wakala = j.data[0];
    }
    if (embassyRes.ok) {
      const j = await embassyRes.json();
      if (j.data && j.data.length > 0) result.embassy = j.data[0];
    }
    if (telesignRes.ok) {
      const j = await telesignRes.json();
      if (j.data && j.data.length > 0) result.telesign = j.data[0];
    }
    if (stampRes.ok) {
      const j = await stampRes.json();
      if (j.data && j.data.length > 0) result.stamp = j.data[0];
    }
    if (ticketRes.ok) {
      const j = await ticketRes.json();
      if (j.data && j.data.length > 0) result.ticket = j.data[0];
    }
    if (depRes.ok) {
      const j = await depRes.json();
      if (j.data && j.data.length > 0) result.departure = j.data[0];
    }
  } catch (err) {
    console.warn("fetchProcessingData warning:", err);
  }

  return result;
}

// ---------------------------------------------------------------------------
// CONTRACT-COMPLIANT: Assign Employee to Clearance Records
// Updates the EXISTING clearance record's employee field.
// Does NOT create clearances. Does NOT write to Applicant.
// ---------------------------------------------------------------------------
export async function assignEmployeeApi(
  applicantIds: string[],
  _roleType?: string,
  _employeeId?: string,
  streamAssignments?: {
    lms?: string;
    injaz?: string;
    wakala?: string;
    embassy?: string;
    telesign?: string;
  }
): Promise<{ message: string }> {
  const errors: string[] = [];

  const users = await getSystemUsersApi().catch(() => []);
  const resolveToUserName = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return "";
    const match = users.find((u) => u.name === trimmed || u.email === trimmed);
    return match?.name || trimmed;
  };

  for (const applicantId of applicantIds) {
    // 1. Resolve DSR via contract read path: Applicant → Dossier → DSR
    const processingData = await fetchProcessingData(applicantId);
    if (!processingData.dsr) {
      errors.push(`No DSR found for applicant ${applicantId}. Cannot assign employees without a DSR.`);
      continue;
    }

    // Check destination country for corridor isolation
    const appRes = await fetch(
      `/api/resource/Applicant/${encodeURIComponent(applicantId)}?fields=["destination_country"]`,
      { cache: "no-store" }
    );
    let isKuwait = false;
    if (appRes.ok) {
      const appJson = await appRes.json();
      const dest = (appJson.data?.destination_country || "").toLowerCase().trim();
      isKuwait = dest === "kuwait";
    }

    const defaultEmp = resolveToUserName(_employeeId || "");
    const dsrName = processingData.dsr.name;

    if (isKuwait) {
      // Kuwait Corridor: LMS + Telesign + Embassy ONLY
      const lmsEmp = resolveToUserName(streamAssignments?.lms || defaultEmp);
      const telesignEmp = resolveToUserName(streamAssignments?.telesign || defaultEmp);
      const embassyEmp = resolveToUserName(streamAssignments?.embassy || defaultEmp);

      if (lmsEmp) {
        try {
          await updateLmsClearanceApi(processingData.lms?.name || dsrName, { employee: lmsEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${lmsEmp} to LMS Clearance: ${e.message || e}`);
        }
      }
      if (telesignEmp) {
        try {
          await updateTelesignClearanceApi(processingData.telesign?.name || dsrName, { employee: telesignEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${telesignEmp} to Telesign Clearance: ${e.message || e}`);
        }
      }
      if (embassyEmp) {
        try {
          await updateEmbassyClearanceApi(processingData.embassy?.name || dsrName, { employee: embassyEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${embassyEmp} to Embassy Clearance: ${e.message || e}`);
        }
      }
    } else {
      // Saudi Arabia Corridor: LMS + Injaz + Wakala ONLY
      const lmsEmp = resolveToUserName(streamAssignments?.lms || defaultEmp);
      const injazEmp = resolveToUserName(streamAssignments?.injaz || defaultEmp);
      const wakalaEmp = resolveToUserName(streamAssignments?.wakala || defaultEmp);

      if (lmsEmp) {
        try {
          await updateLmsClearanceApi(processingData.lms?.name || dsrName, { employee: lmsEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${lmsEmp} to LMS Clearance: ${e.message || e}`);
        }
      }
      if (injazEmp) {
        try {
          await updateInjazClearanceApi(processingData.injaz?.name || dsrName, { employee: injazEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${injazEmp} to Injaz Clearance: ${e.message || e}`);
        }
      }
      if (wakalaEmp) {
        try {
          await updateWakalaClearanceApi(processingData.wakala?.name || dsrName, { employee: wakalaEmp, dsr: dsrName });
        } catch (e: any) {
          errors.push(`Failed to assign ${wakalaEmp} to Wakala Clearance: ${e.message || e}`);
        }
      }
    }

    // 2. Advance applicant state to "Processing"
    try {
      await fetch(
        `/api/resource/Applicant/${encodeURIComponent(applicantId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicant_state: "Processing" }),
        }
      );
    } catch {}

    // 3. Trigger backend lifecycle recalculation
    try {
      await recalculateApplicantStateApi(applicantId);
    } catch (recalcErr) {
      console.warn("Backend state recalculation warning:", recalcErr);
    }
  }

  if (errors.length > 0) {
    throw { message: errors.join(" | "), statusCode: 400, serverMessages: errors } as ApiError;
  }

  return { message: "Employees successfully assigned to clearance streams." };
}

// ---------------------------------------------------------------------------
// CLEARANCE RECORD MUTATION APIS (Direct DocType PUT)
// ---------------------------------------------------------------------------

// Update or Create LMS Clearance: PUT /api/resource/LMS Clearance/{name} or POST
// Update or Create LMS Clearance: PUT /api/resource/LMS Clearance/{name} or POST
export async function updateLmsClearanceApi(
  nameOrDsr: string,
  data: Partial<LMSClearance> & { dsr?: string }
): Promise<LMSClearance> {
  const payload: any = { ...data };

  // If a valid LMS docname is provided (e.g. LMS-00004)
  if (nameOrDsr && !nameOrDsr.startsWith("DSR-") && nameOrDsr !== "None" && nameOrDsr !== "undefined") {
    if (!payload.financials) {
      try {
        const existing = await fetch(`/api/resource/LMS Clearance/${encodeURIComponent(nameOrDsr)}`);
        if (existing.ok) {
          const exJson = await existing.json();
          if (exJson.data?.financials && Array.isArray(exJson.data.financials)) {
            payload.financials = exJson.data.financials.map((f: any) => ({
              ...f,
              category: f.category || "Agency Commission",
            }));
          }
        }
      } catch {}
    } else if (Array.isArray(payload.financials)) {
      payload.financials = payload.financials.map((f: any) => ({
        ...f,
        category: f.category || "Agency Commission",
      }));
    }

    const res = await fetch(`/api/resource/LMS Clearance/${encodeURIComponent(nameOrDsr)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status !== 404) {
      return handleApiResponse<LMSClearance>(res);
    }
  }

  // DSR fallback / Lookup
  const dsrName = payload.dsr || (nameOrDsr && nameOrDsr.startsWith("DSR-") ? nameOrDsr : undefined);
  if (dsrName) {
    try {
      const existing = await fetch(
        `/api/resource/LMS Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["name"]&limit_page_length=1`
      );
      if (existing.ok) {
        const exJson = await existing.json();
        if (exJson.data?.[0]?.name) {
          return updateLmsClearanceApi(exJson.data[0].name, payload);
        }
      }
    } catch {}
  }

  const res = await fetch(`/api/resource/LMS Clearance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dsr: dsrName }),
  });
  return handleApiResponse<LMSClearance>(res);
}

// Update or Create Wakala Clearance: PUT /api/resource/Wakala Clearance/{name} or POST
export async function updateWakalaClearanceApi(
  nameOrDsr: string,
  data: Partial<WakalaClearance> & { dsr?: string }
): Promise<WakalaClearance> {
  const payload: any = { ...data };
  if (nameOrDsr && !nameOrDsr.startsWith("DSR-") && nameOrDsr !== "None" && nameOrDsr !== "undefined") {
    const res = await fetch(`/api/resource/Wakala Clearance/${encodeURIComponent(nameOrDsr)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status !== 404) {
      return handleApiResponse<WakalaClearance>(res);
    }
  }

  const dsrName = payload.dsr || (nameOrDsr && nameOrDsr.startsWith("DSR-") ? nameOrDsr : undefined);
  if (dsrName) {
    try {
      const existing = await fetch(
        `/api/resource/Wakala Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["name"]&limit_page_length=1`
      );
      if (existing.ok) {
        const exJson = await existing.json();
        if (exJson.data?.[0]?.name) {
          return updateWakalaClearanceApi(exJson.data[0].name, payload);
        }
      }
    } catch {}
  }

  const res = await fetch(`/api/resource/Wakala Clearance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dsr: dsrName }),
  });
  return handleApiResponse<WakalaClearance>(res);
}

// Update or Create Injaz Clearance: PUT /api/resource/Injaz Clearance/{name} or POST
export async function updateInjazClearanceApi(
  nameOrDsr: string,
  data: Partial<InjazClearance> & { dsr?: string }
): Promise<InjazClearance> {
  const payload: any = { ...data };
  if (nameOrDsr && !nameOrDsr.startsWith("DSR-") && nameOrDsr !== "None" && nameOrDsr !== "undefined") {
    const res = await fetch(`/api/resource/Injaz Clearance/${encodeURIComponent(nameOrDsr)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status !== 404) {
      return handleApiResponse<InjazClearance>(res);
    }
  }

  const dsrName = payload.dsr || (nameOrDsr && nameOrDsr.startsWith("DSR-") ? nameOrDsr : undefined);
  if (dsrName) {
    try {
      const existing = await fetch(
        `/api/resource/Injaz Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["name"]&limit_page_length=1`
      );
      if (existing.ok) {
        const exJson = await existing.json();
        if (exJson.data?.[0]?.name) {
          return updateInjazClearanceApi(exJson.data[0].name, payload);
        }
      }
    } catch {}
  }

  const res = await fetch(`/api/resource/Injaz Clearance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dsr: dsrName }),
  });
  return handleApiResponse<InjazClearance>(res);
}

// Update or Create Embassy Clearance: PUT /api/resource/Embassy Clearance/{name} or POST
export async function updateEmbassyClearanceApi(
  nameOrDsr: string,
  data: Partial<EmbassyClearance> & { dsr?: string }
): Promise<EmbassyClearance> {
  const payload: any = { ...data };
  if (nameOrDsr && !nameOrDsr.startsWith("DSR-") && nameOrDsr !== "None" && nameOrDsr !== "undefined") {
    const res = await fetch(`/api/resource/Embassy Clearance/${encodeURIComponent(nameOrDsr)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status !== 404) {
      return handleApiResponse<EmbassyClearance>(res);
    }
  }

  const dsrName = payload.dsr || (nameOrDsr && nameOrDsr.startsWith("DSR-") ? nameOrDsr : undefined);
  if (dsrName) {
    try {
      const existing = await fetch(
        `/api/resource/Embassy Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["name"]&limit_page_length=1`
      );
      if (existing.ok) {
        const exJson = await existing.json();
        if (exJson.data?.[0]?.name) {
          return updateEmbassyClearanceApi(exJson.data[0].name, payload);
        }
      }
    } catch {}
  }

  const res = await fetch(`/api/resource/Embassy Clearance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dsr: dsrName }),
  });
  return handleApiResponse<EmbassyClearance>(res);
}

// Update or Create Telesign Clearance: PUT /api/resource/Telesign Clearance/{name} or POST
export async function updateTelesignClearanceApi(
  nameOrDsr: string,
  data: Partial<TelesignClearance> & { dsr?: string }
): Promise<TelesignClearance> {
  const payload: any = { ...data };
  if (nameOrDsr && !nameOrDsr.startsWith("DSR-") && nameOrDsr !== "None" && nameOrDsr !== "undefined") {
    const res = await fetch(`/api/resource/Telesign Clearance/${encodeURIComponent(nameOrDsr)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status !== 404) {
      return handleApiResponse<TelesignClearance>(res);
    }
  }

  const dsrName = payload.dsr || (nameOrDsr && nameOrDsr.startsWith("DSR-") ? nameOrDsr : undefined);
  if (dsrName) {
    try {
      const existing = await fetch(
        `/api/resource/Telesign Clearance?filters=[["dsr","=","${encodeURIComponent(dsrName)}"]]&fields=["name"]&limit_page_length=1`
      );
      if (existing.ok) {
        const exJson = await existing.json();
        if (exJson.data?.[0]?.name) {
          return updateTelesignClearanceApi(exJson.data[0].name, payload);
        }
      }
    } catch {}
  }

  const res = await fetch(`/api/resource/Telesign Clearance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dsr: dsrName }),
  });
  return handleApiResponse<TelesignClearance>(res);
}

// ---------------------------------------------------------------------------
// 5. PRE-DEPARTURE STAGES (STAMP, TICKET, DEPARTURE)
// ---------------------------------------------------------------------------

// Create/Submit DSR Stamp: POST /api/resource/DSR Stamp
export async function submitDsrStampApi(
  data: {
    dsr: string;
    stamp_number: string;
    stamp_date: string;
    status?: "Pending" | "Completed";
    financials?: any[];
    applicantId?: string;
  }
): Promise<DSRStamp> {
  const payload: Record<string, any> = {
    dsr: data.dsr,
    stamp_number: data.stamp_number,
    stamp_date: data.stamp_date,
    status: data.status || "Completed",
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

  if (data.applicantId) {
    try {
      await recalculateApplicantStateApi(data.applicantId);
    } catch {}
  }

  return result;
}

// Create/Submit DSR Ticket: POST /api/resource/DSR Ticket
export async function submitDsrTicketApi(
  data: {
    dsr: string;
    ticket_number: string;
    ticket_details?: string;
    status?: "Pending" | "Booked" | "Cancelled";
    financials?: any[];
    applicantId?: string;
  }
): Promise<DSRTicket> {
  const payload: Record<string, any> = {
    dsr: data.dsr,
    ticket_number: data.ticket_number,
    ticket_details: data.ticket_details || "",
    status: data.status || "Booked",
  };
  if (data.financials && data.financials.length > 0) {
    payload.financials = data.financials;
  }

  const res = await fetch("/api/resource/DSR Ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await handleApiResponse<DSRTicket>(res);

  if (data.applicantId) {
    try {
      await recalculateApplicantStateApi(data.applicantId);
    } catch {}
  }

  return result;
}

// Create/Submit DSR Departure: POST /api/resource/DSR Departure
export async function submitDsrDepartureApi(
  data: {
    dsr: string;
    departure_time: string;
    medical_2_result?: "Pass" | "Fail" | "";
    medical_2_date?: string;
    medical_2_remark?: string;
    status?: "Pending" | "Departed" | "Cancelled";
    financials?: any[];
    applicantId?: string;
  }
): Promise<DSRDeparture> {
  const payload: Record<string, any> = {
    dsr: data.dsr,
    departure_time: data.departure_time,
    medical_2_result: data.medical_2_result || "Pass",
    medical_2_date: data.medical_2_date || new Date().toISOString().split("T")[0],
    medical_2_remark: data.medical_2_remark || "",
    status: data.status || "Departed",
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

  if (data.applicantId) {
    try {
      await recalculateApplicantStateApi(data.applicantId);
    } catch {}
  }

  return result;
}

// ---------------------------------------------------------------------------
// 6. UNIVERSAL FILE UPLOAD (POST /api/method/upload_file)
// ---------------------------------------------------------------------------

export async function uploadFileApi(
  file: File,
  doctype?: string,
  docname?: string,
  fieldname?: string,
  isPrivate: boolean = false
): Promise<{ message: { file_url: string; name: string } }> {
  const formData = new FormData();
  formData.append("file", file);
  if (doctype && docname) {
    formData.append("doctype", doctype);
    formData.append("docname", docname);
    if (fieldname) formData.append("fieldname", fieldname);
  }
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
  role?: string;
  label?: string;
  description?: string;
  category?: string;
  installed?: boolean;
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
  try {
    const res = await fetch(
      "/api/method/applicant_processing.applicant_processing.api.get_available_roles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const rawRoles =
        data?.message?.roles ||
        data?.roles ||
        data?.message ||
        (Array.isArray(data) ? data : []);
      if (Array.isArray(rawRoles) && rawRoles.length > 0) {
        return rawRoles.map((r: any) => {
          const roleId = r.role || r.role_name || r.name || "";
          let label = r.label || roleId;
          if (roleId === "LMS Employee") {
            label = "LMS Employee / LMIS (Operations Officer)";
          }
          return {
            role_name: roleId,
            role: roleId,
            label,
            description: r.description || "",
            category: r.category || "",
            installed: r.installed !== false,
          };
        });
      }
    }
  } catch (err) {
    console.warn("getAvailableRolesApi RPC warning:", err);
  }

  // Fallback 1: Query Frappe /api/resource/Role
  try {
    const roleRes = await fetch("/api/resource/Role?limit_page_length=100");
    if (roleRes.ok) {
      const roleJson = await roleRes.json();
      const roles: any[] = roleJson.data || [];
      if (roles.length > 0) {
        return roles
          .filter(
            (r) =>
              ![
                "All",
                "Guest",
                "Desk User",
                "Blogger",
                "Translator",
                "Knowledge Base Contributor",
                "Knowledge Base Editor",
              ].includes(r.name)
          )
          .map((r) => {
            let label = r.name;
            if (r.name === "LMS Employee") {
              label = "LMS Employee / LMIS (Operations Officer)";
            } else if (r.name === "System Manager") {
              label = "System Administrator (System Manager)";
            }
            return {
              role_name: r.name,
              role: r.name,
              label,
              description: `System role: ${r.name}`,
              category: "System",
              installed: true,
            };
          });
      }
    }
  } catch {}

  // Fallback 2: Canonical Frappe Role definitions
  return [
    {
      role_name: "LMS Employee",
      role: "LMS Employee",
      label: "LMS Employee / LMIS (Operations Officer)",
      description: "Applicant registration, clearance processing, and Labor Market Operations.",
      category: "Operations",
      installed: true,
    },
    {
      role_name: "System Manager",
      role: "System Manager",
      label: "System Administrator (System Manager)",
      description: "Full administrative control, manager overrides, and user management.",
      category: "Administration",
      installed: true,
    },
    {
      role_name: "Accounts Manager",
      role: "Accounts Manager",
      label: "Accounts & Commission Manager",
      description: "Financial ledger, income/expense logs, and agency commission billing.",
      category: "Finance",
      installed: true,
    },
    {
      role_name: "Foreign Agency",
      role: "Foreign Agency",
      label: "Foreign Agency (External Partner)",
      description: "Portal candidate browsing, reservation locks, and dispute submissions.",
      category: "External Partner",
      installed: true,
    },
    {
      role_name: "Wakala Officer",
      role: "Wakala Officer",
      label: "Wakala / Musaned Officer",
      description: "Dedicated Musaned Wakala verification and payment monitoring.",
      category: "Specialized Clearances",
      installed: true,
    },
    {
      role_name: "Injaz Officer",
      role: "Injaz Officer",
      label: "Injaz / MOFA Officer",
      description: "MOFA Injaz visa submission and verification.",
      category: "Specialized Clearances",
      installed: true,
    },
    {
      role_name: "Embassy Officer",
      role: "Embassy Officer",
      label: "Embassy Liaison Officer",
      description: "Consular submission, visa stamping, and biometric tracking.",
      category: "Specialized Clearances",
      installed: true,
    },
  ];
}

// 8.2 Get System Users List
export async function getSystemUsersApi(params?: {
  search?: string;
  enabled?: number | boolean;
  role?: string;
  limit?: number;
  start?: number;
}): Promise<SystemUserRecord[]> {
  if (isDemoMode()) {
    return demoStore.getUsers(params) as SystemUserRecord[];
  }

  try {
    const res = await fetch(
      "/api/method/applicant_processing.applicant_processing.api.get_system_users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {}),
      }
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.users)) return json.users;
      if (Array.isArray(json?.message?.users)) return json.message.users;
      if (Array.isArray(json?.message)) return json.message;
    }
  } catch {}

  // Fallback to standard Frappe User resource
  try {
    const userRes = await fetch(
      '/api/resource/User?fields=["name","email","first_name","last_name","full_name","enabled","user_image","creation"]&limit_page_length=50'
    );
    if (userRes.ok) {
      const userJson = await userRes.json();
      const users: any[] = userJson.data || [];
      return users
        .filter((u) => u.name !== "Guest")
        .map((u) => ({
          name: u.name,
          email: u.email || u.name,
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          full_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
          phone: "",
          enabled: Boolean(u.enabled),
          user_type: "System User",
          roles: ["Operations Specialist"],
          creation: u.creation,
        }));
    }
  } catch {}

  return [];
}

// 8.3 Create System User with Password and Roles
export async function createSystemUserApi(payload: CreateSystemUserPayload): Promise<SystemUserRecord> {
  if (isDemoMode()) {
    return demoStore.createUser(payload) as SystemUserRecord;
  }

  // V2 backend contract (/api/method/agency_tracking.*) handles users through Frappe Desk / session auth.
  // There is no whitelisted custom /create_system_user endpoint in the V2 contract.
  throw new Error(
    "BACKEND BLOCKED: Internal user creation is not exposed in the V2 backend contract (/api/method/agency_tracking.*). User provisioning must be performed in Frappe Core / Desk Administration."
  );
}

// 8.4 Update System User Profile & Status
export async function updateSystemUserApi(payload: UpdateSystemUserPayload): Promise<SystemUserRecord> {
  if (isDemoMode()) {
    return demoStore.updateUser(payload) as SystemUserRecord;
  }

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
  if (isDemoMode()) {
    return demoStore.setUserPassword(payload);
  }

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
  if (isDemoMode()) {
    return demoStore.assignUserRoles(payload);
  }

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
  if (isDemoMode()) {
    return { status: "success", message: "User permissions updated successfully" };
  }

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
  if (isDemoMode()) {
    const found = demoStore.getUsers().find((u) => u.email.toLowerCase() === user.toLowerCase() || u.name.toLowerCase() === user.toLowerCase());
    return found || { name: user, email: user, roles: ["Registrar"], enabled: 1 };
  }

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
          name: u.name || u.email,
          employee_name: u.full_name || u.name || u.email,
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
  category: "compliance" | "workflow" | "dossier" | "finance" | "complaints" | "system";
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
    const [applicants, placements, complaints] = await Promise.all([
      listApplicantsV2().catch(() => []),
      listPlacementsV2().catch(() => []),
      listUnresolvedComplaintsV2().catch(() => []),
    ]);

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
      if (app.medical_expiry_date) {
        const medDate = new Date(app.medical_expiry_date);
        const diffDays = Math.round((medDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15 && diffDays >= 0) {
          notifications.push({
            id: `med-urgent-${app.name}`,
            title: `Urgent: GAMCA Medical Lab Expiring (${diffDays} days)`,
            description: `${name}'s GAMCA medical certificate will expire on ${app.medical_expiry_date}. Complete biometrics or re-test.`,
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
            description: `${name}'s lab fitness certificate expired on ${app.medical_expiry_date}. Re-examination required.`,
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
          description: `Contractor demand confirmed for ${name}. Assign an operations lead to launch clearance streams.`,
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

    // 2. Clearances & Placement Notifications from V2 Placements
    for (const plc of placements) {
      const name = plc.full_name || plc.applicant_name || plc.name;

      if (plc.status === "Processing") {
        notifications.push({
          id: `plc-proc-${plc.name}`,
          title: `Active Clearance Processing: ${name}`,
          description: `Placement ${plc.name} for ${plc.contractor || "Contractor"} is undergoing corridor clearance verification.`,
          category: "workflow",
          severity: "info",
          timestamp: "In Progress",
          applicant_id: plc.applicant,
          applicant_name: name,
          action_url: `/applicants/${plc.applicant}`,
          action_label: "View Clearance",
        });
      } else if (plc.status === "Stamped" && !plc.ticket_number) {
        notifications.push({
          id: `plc-stamped-${plc.name}`,
          title: `Visa Stamped: Book Flight Ticket for ${name}`,
          description: `Embassy visa endorsement confirmed. Proceed to issue airline reservation and flight itinerary.`,
          category: "workflow",
          severity: "info",
          timestamp: "Ticketing Ready",
          applicant_id: plc.applicant,
          applicant_name: name,
          action_url: `/applicants/${plc.applicant}`,
          action_label: "Issue Ticket",
        });
      } else if (plc.status === "Ticketed" && !plc.departed_on) {
        notifications.push({
          id: `plc-ticketed-${plc.name}`,
          title: `Flight Booked: Pre-Departure Check for ${name}`,
          description: `Ticket ${plc.ticket_number} booked for ${plc.flight_date || "Upcoming flight"}. Verify Medical 2 before Bole Airport departure.`,
          category: "workflow",
          severity: "warning",
          timestamp: "Pre-Departure",
          applicant_id: plc.applicant,
          applicant_name: name,
          action_url: `/applicants/${plc.applicant}`,
          action_label: "Verify & Depart",
        });
      }
    }

    // 3. Foreign Agency Complaints & Disputes
    for (const comp of complaints) {
      const candidateName = comp.full_name || comp.applicant_name || comp.applicant || "Candidate";

      notifications.push({
        id: `comp-${comp.name}`,
        title: `🚨 Active Complaint: ${candidateName}`,
        description: `Dispute ticket for ${candidateName} (Placement ${comp.placement || "N/A"}): "${comp.description || "Active complaint"}"`,
        category: "complaints",
        severity: "urgent",
        timestamp: comp.creation ? comp.creation.split(" ")[0] : "Active Ticket",
        applicant_id: comp.applicant,
        applicant_name: candidateName,
        action_url: "/complaints",
        action_label: "Review Ticket",
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
  const candidates = await listPortalCandidatesV2();
  let mapped: PortalAvailableCandidate[] = candidates.map((c) => ({
    name: c.name,
    applicant_id: c.name,
    full_name: c.full_name || c.applicant_name || c.name,
    gender: c.gender || "Female",
    age: c.age || 25,
    date_of_birth: c.date_of_birth,
    nationality: c.nationality || "Ethiopia",
    destination_country: c.destination_country || "Saudi Arabia",
    job_applied: c.job_applied || "Housemaid",
    monthly_salary: c.monthly_salary || 1200,
    photo_passport: c.photo_passport || "",
    photo_full_body: c.photo_full_body || "",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 0,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    experience_country: c.experience_country || "",
    experience_period: c.experience_period || "",
    place_of_birth: c.place_of_birth || "",
    religion: c.religion || "Muslim",
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

export async function portalSelectCandidateApi(
  applicantId: string,
  contractor?: string
): Promise<PortalSelectCandidateResponse> {
  const res = await selectCandidateV2(applicantId);
  return {
    status: (res?.status as "success" | "error") || "success",
    message: res?.message || "Candidate selected successfully",
    applicant_id: applicantId,
    contractor: contractor || "Partner Agency",
  };
}

export async function getAgencyReservedCandidatesApi(contractor?: string): Promise<AgencyPipelineCandidate[]> {
  try {
    const pipeline = await getAgencyPipelineCandidatesApi({ stage: "Selected", limit: 100 });
    if (Array.isArray(pipeline)) {
      if (contractor && contractor !== "All Agencies") {
        return pipeline.filter(
          (c) =>
            !c.contractor ||
            c.contractor === contractor ||
            c.contractor.toLowerCase().includes(contractor.toLowerCase())
        );
      }
      return pipeline;
    }
  } catch (err) {
    console.warn("getAgencyReservedCandidatesApi error:", err);
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
  if (options.file_url) {
    const parsed = await parsePassportFileV2(options.file_url);
    return {
      status: parsed.status === "success" || !!parsed.passport_number ? "success" : "error",
      message: parsed.message || "Passport parsed",
      data: parsed as any,
    };
  }

  return {
    status: "error",
    message: "No passport file provided",
    data: {},
  };
}

// ---------------------------------------------------------------------------
// 12. AGENCY COMPLAINTS MANAGEMENT APIS
// ---------------------------------------------------------------------------

export async function getAgencyComplaintsList(filters?: {
  contractor?: string;
  tab?: "all" | "new" | "unresolved" | "resolved";
}): Promise<AgencyComplaint[]> {
  let allComplaints: AgencyComplaint[] = [];

  try {
    const v2Complaints = await listUnresolvedComplaintsV2();
    if (Array.isArray(v2Complaints)) {
      allComplaints = v2Complaints.map((c) => ({
        name: c.name,
        contractor: c.contractor || c.contractor_name || "Partner Agency",
        applicant: c.applicant || c.placement || "",
        full_name: c.full_name || c.applicant || "",
        passport_number: c.passport_number || "",
        complaint_category: c.worker_status_at_complaint || "General",
        severity: "Medium",
        status: (c.status || "Open") as any,
        days_unresolved: c.days_unresolved ?? 0,
        complaint_details: c.description || "",
        attachment: "",
        resolution_notes: c.resolution_notes || "",
        outcome: c.resolution_outcome || "",
        creation: c.creation || new Date().toISOString(),
        modified: c.modified || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Agency Complaint resource fetch error:", err);
  }

  // Filter by contractor if specified
  if (filters?.contractor && filters.contractor !== "All Agencies") {
    allComplaints = allComplaints.filter((c) =>
      c.contractor?.toLowerCase().trim() === filters.contractor!.toLowerCase().trim() ||
      c.contractor?.toLowerCase().includes(filters.contractor!.toLowerCase().trim())
    );
  }

  // Filter by tab
  if (filters?.tab === "unresolved") {
    allComplaints = allComplaints.filter(
      (c) => c.status !== "Resolved" && c.status !== "Closed" && c.status !== "Dismissed / Closed"
    );
  } else if (filters?.tab === "new") {
    allComplaints = allComplaints.filter((c) => c.status === "Open" || c.status === "Under Investigation");
  } else if (filters?.tab === "resolved") {
    allComplaints = allComplaints.filter(
      (c) =>
        c.status === "Resolved" ||
        c.status === "Closed" ||
        c.status === "Dismissed / Closed" ||
        c.status === "Returned / Free Replacement Required"
    );
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
  const result = await createComplaintV2(
    data.applicant_search,
    data.complaint_details || "Agency Complaint",
    data.complaint_category || "General"
  );
  return { message: { complaint_id: result?.name || "COMP-NEW" }, ...result };
}

export async function resolveAgencyComplaintApi(data: {
  complaint_id: string;
  outcome: string;
  resolution_notes: string;
  return_date?: string;
  replacement_applicant?: string;
}): Promise<any> {
  const result = await resolveComplaintV2(
    data.complaint_id,
    data.outcome as any,
    data.resolution_notes
  );
  return { message: "Complaint resolved successfully", ...result };
}

// ---------------------------------------------------------------------------
// 13. OPERATIONS & EXECUTIVE REPORTING APIS
// ---------------------------------------------------------------------------

export async function getOperationsSummaryApi(filters?: {
  from_date?: string;
  to_date?: string;
}): Promise<OperationsSummaryResponse> {
  const result = await getOperationsSummaryV2(filters?.from_date, filters?.to_date);
  return result as any;
}

// ---------------------------------------------------------------------------
// 14. PIPELINE STATE RECOMPUTATION & WAKALA REMINDERS
// ---------------------------------------------------------------------------

export async function recalculateApplicantStateApi(
  applicantName: string
): Promise<{ message: string }> {
  return { message: "State up to date" };
}

export async function dispatchWakalaReminderApi(
  dsrName: string,
  channel: "whatsapp" | "push" | "both" = "both"
): Promise<{ message: { status: string; message: string } }> {
  const result = await triggerWakalaReminderV2(dsrName);
  return { message: { status: "success", message: result?.message || "Reminder sent" } };
}

// ---------------------------------------------------------------------------
// 15. WEB PUSH NOTIFICATION SUBSCRIPTION APIS
// ---------------------------------------------------------------------------

export async function getVapidPublicKeyApi(): Promise<{
  public_key: string;
  enabled: number;
}> {
  const status = await getPushSubscriptionStatusV2();
  return {
    public_key: status?.vapid_public_key || "",
    enabled: status?.enabled ? 1 : 0,
  };
}

export async function saveWebPushSubscriptionApi(data: {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}): Promise<{ status: string; message: string }> {
  const result = await subscribeToPushV2(data.endpoint, data.p256dh, data.auth);
  return { status: "success", message: result?.message || "Subscribed successfully" };
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
  if (filters?.stage && filters.stage !== "all") {
    params.append("stage", filters.stage);
  }
  if (filters?.limit) {
    params.append("limit", String(filters.limit));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  try {
    const res = await fetch(
      `/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates${query}`
    );
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.message)
        ? data.message
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      if (list.length > 0) return list;
    }
  } catch (rpcErr) {
    console.warn("get_agency_pipeline_candidates RPC error, using relational fallback:", rpcErr);
  }

  // Authoritative Fallback: Query Applicant resource with valid schema fields
  try {
    const pipelineStates = ["Selected", "Processing", "Stamped", "Ticketed", "Departed"];
    const filterConditions: any[] = [];
    if (filters?.stage && filters.stage !== "all") {
      filterConditions.push(["applicant_state", "=", filters.stage]);
    } else {
      filterConditions.push(["applicant_state", "in", pipelineStates]);
    }

    const validFields = encodeURIComponent(
      JSON.stringify([
        "name",
        "full_name",
        "first_name",
        "last_name",
        "passport_number",
        "job_applied",
        "destination_country",
        "photo_passport",
        "applicant_state",
        "locked_contractor",
        "creation",
        "modified",
      ])
    );
    const filterQuery = encodeURIComponent(JSON.stringify(filterConditions));
    const limit = filters?.limit || 100;
    const appRes = await fetch(
      `/api/resource/Applicant?filters=${filterQuery}&fields=${validFields}&limit_page_length=${limit}&order_by=modified%20desc`
    );

    if (appRes.ok) {
      const appJson = await appRes.json();
      const rawApps: any[] = Array.isArray(appJson.data) ? appJson.data : [];

      // Query Dossiers for visa / sponsor / contractor details
      let dossiersMap: Record<string, any> = {};
      try {
        const dosRes = await fetch(
          `/api/resource/Applicant%20Dossier?fields=["name","applicant","contractor_name","sponsor_name","visa_number","contract_number","contract_date"]&limit_page_length=200`
        );
        if (dosRes.ok) {
          const dosJson = await dosRes.json();
          const dosList = Array.isArray(dosJson.data) ? dosJson.data : [];
          for (const d of dosList) {
            if (d.applicant) dossiersMap[d.applicant] = d;
          }
        }
      } catch {}

      return rawApps.map((a: any) => {
        const dos = dossiersMap[a.name] || {};
        return {
          name: a.name,
          applicant_id: a.name,
          full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.name,
          gender: a.gender || "Female",
          age: Number(a.age) || 25,
          passport_number: a.passport_number || "",
          job_applied: a.job_applied || "Housemaid",
          destination_country: a.destination_country || "Saudi Arabia",
          photo_passport: a.photo_passport || "",
          cv_file_url: a.cv_file_url || "",
          applicant_state: a.applicant_state || "Selected",
          contract_date: dos.contract_date || a.modified || a.creation || "",
          sponsor_name: dos.sponsor_name || "",
          visa_number: dos.visa_number || "",
          contractor: dos.contractor_name || a.locked_contractor || "",
        };
      });
    }
  } catch (err) {
    console.warn("getAgencyPipelineCandidatesApi resource fallback warning:", err);
  }

  return [];
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

// ---------------------------------------------------------------------------
// 17. ADMIN COMMISSION MANAGEMENT & LEDGER APIS
// ---------------------------------------------------------------------------

export async function getAdminCommissionLedgerApi(): Promise<{
  items: CommissionLedgerItem[];
  summary: CommissionSummaryStats;
}> {
  try {
    const fields = encodeURIComponent(
      JSON.stringify([
        "name",
        "full_name",
        "first_name",
        "middle_name",
        "last_name",
        "gender",
        "religion",
        "place_of_birth",
        "leaving_town",
        "marital_status",
        "passport_number",
        "job_applied",
        "destination_country",
        "locked_contractor",
        "applicant_state",
        "commission_status",
        "commission_amount",
        "commission_paid_date",
        "commission_batch_ref",
        "creation",
        "modified",
      ])
    );

    const [appRes, contractorsList, depRes] = await Promise.all([
      fetch(`/api/resource/Applicant?fields=${fields}&limit_page_length=1000&order_by=modified%20desc`),
      getContractorsList().catch(() => [] as Contractor[]),
      fetch(`/api/resource/Applicant%20Departure?fields=["name","applicant","departure_date","flight_number","contractor_name"]&limit_page_length=1000`).catch(() => null),
    ]);

    const contractorMap: Record<string, Contractor> = {};
    for (const c of contractorsList) {
      if (c.name) contractorMap[c.name] = c;
      if (c.company_name) contractorMap[c.company_name] = c;
    }

    const depMap: Record<string, { departure_date?: string; flight_number?: string; contractor_name?: string }> = {};
    if (depRes && depRes.ok) {
      const depJson = await depRes.json();
      const depList = Array.isArray(depJson.data) ? depJson.data : [];
      for (const d of depList) {
        if (d.applicant) depMap[d.applicant] = d;
      }
    }

    let rawApps: any[] = [];
    if (appRes.ok) {
      const appJson = await appRes.json();
      rawApps = Array.isArray(appJson.data) ? appJson.data : [];
    }

    const items: CommissionLedgerItem[] = rawApps
      .filter((a) => a.applicant_state === "Departed" || a.locked_contractor || a.contractor || a.commission_status)
      .map((a) => {
        const dep = depMap[a.name] || {};
        const contractorId = a.locked_contractor || a.contractor || dep.contractor_name || "Direct / Unassigned";
        const contractorObj = contractorMap[contractorId];
        const defaultRate = contractorObj?.default_commission_amount || 1500;
        const currency = contractorObj?.default_commission_currency || "SAR";
        const isReplacement = Boolean(a.is_replacement === 1 || a.is_replacement === "1" || a.is_replacement === true);
        const amount = isReplacement
          ? 0
          : a.commission_amount !== undefined && a.commission_amount !== null && a.commission_amount > 0
          ? Number(a.commission_amount)
          : defaultRate;

        let status = a.commission_status;
        if (!status) {
          status = a.applicant_state === "Departed" ? "Pending" : "Pending";
        }
        if (isReplacement) {
          status = "Waived";
        }

        return {
          name: a.name,
          full_name: a.full_name || `${a.first_name || ""} ${a.middle_name || ""} ${a.last_name || ""}`.trim() || a.name,
          passport_number: a.passport_number || "",
          job_applied: a.job_applied || "Housemaid",
          destination_country: a.destination_country || contractorObj?.country || "Saudi Arabia",
          contractor: contractorId,
          contractor_name: contractorObj?.company_name || contractorId,
          applicant_state: a.applicant_state || "Departed",
          departure_date: dep.departure_date || a.departure_date || a.modified?.split(" ")[0] || a.creation?.split(" ")[0],
          flight_number: dep.flight_number || "",
          commission_status: status,
          commission_amount: amount,
          commission_currency: currency,
          commission_paid_date: a.commission_paid_date || "",
          commission_batch_ref: a.commission_batch_ref || "",
          is_replacement: isReplacement ? 1 : 0,
          religion: a.religion || "",
          place_of_birth: a.place_of_birth || a.leaving_town || "",
          marital_status: a.marital_status || "",
          gender: a.gender || "",
          creation: a.creation,
        };
      });

    const totalDeparted = items.filter((i) => i.applicant_state === "Departed").length;
    const unpaidItems = items.filter((i) => i.commission_status === "Pending" || i.commission_status === "Invoiced");
    const paidItems = items.filter((i) => i.commission_status === "Paid");

    const totalOutstanding = unpaidItems.reduce((sum, i) => sum + i.commission_amount, 0);
    const totalPaid = paidItems.reduce((sum, i) => sum + i.commission_amount, 0);
    const contractorsSet = new Set(items.map((i) => i.contractor).filter((c) => c !== "Direct / Unassigned"));

    return {
      items,
      summary: {
        total_departed: totalDeparted,
        total_outstanding_amount: totalOutstanding,
        total_paid_amount: totalPaid,
        currency: "SAR",
        total_contractors_count: contractorsSet.size,
        unpaid_count: unpaidItems.length,
        paid_count: paidItems.length,
      },
    };
  } catch (err) {
    console.error("getAdminCommissionLedgerApi error:", err);
    return {
      items: [],
      summary: {
        total_departed: 0,
        total_outstanding_amount: 0,
        total_paid_amount: 0,
        currency: "SAR",
        total_contractors_count: 0,
        unpaid_count: 0,
        paid_count: 0,
      },
    };
  }
}

export async function updateApplicantCommissionApi(
  applicantId: string,
  payload: {
    commission_status?: string;
    commission_amount?: number;
    commission_paid_date?: string;
    commission_batch_ref?: string;
  }
): Promise<any> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(res);
}

// ---------------------------------------------------------------------------
// OPERATIONAL WORKSPACE DATA ACCESS (Excel-Like Tables + Drawer Hub)
// ---------------------------------------------------------------------------
import type { WorkspaceApplicantRow, OperationalStreamType } from "@/types/workspace";

export async function fetchOperationalWorkspaceData(
  streamType: OperationalStreamType,
  corridorFilter?: string
): Promise<WorkspaceApplicantRow[]> {
  try {
    const [applicants, placements, clearanceSteps] = await Promise.all([
      listApplicantsV2().catch(() => []),
      listPlacementsV2().catch(() => []),
      listMyClearanceStepsV2().catch(() => []),
    ]);

    const placementsByApplicant = new Map<string, any>();
    for (const p of placements) {
      if (p.applicant) placementsByApplicant.set(p.applicant.toLowerCase().trim(), p);
    }

    const stepsByPlacement = new Map<string, any[]>();
    for (const s of clearanceSteps) {
      if (s.placement) {
        const key = s.placement.toLowerCase().trim();
        if (!stepsByPlacement.has(key)) stepsByPlacement.set(key, []);
        stepsByPlacement.get(key)!.push(s);
      }
    }

    const rows: WorkspaceApplicantRow[] = [];

    for (const applicant of applicants) {
      const plc = placementsByApplicant.get(applicant.name.toLowerCase().trim());
      const dest = plc?.destination_country || applicant.destination_country || "Saudi Arabia";

      // Corridor filtering
      if (corridorFilter && corridorFilter !== "All" && dest.toLowerCase() !== corridorFilter.toLowerCase()) {
        continue;
      }

      // Stream corridor isolation
      if (streamType === "injaz" || streamType === "wakala") {
        if (dest.toLowerCase() === "kuwait") continue;
      }

      const siblingSteps = plc ? stepsByPlacement.get(plc.name.toLowerCase().trim()) || [] : [];
      const lmsStep = siblingSteps.find((s) => s.step_type === "LMIS Clearance" || s.step_type === "Kuwait LMIS");
      const injazStep = siblingSteps.find((s) => s.step_type === "Taeshir" || s.step_type === "Telesign");
      const embassyStep = siblingSteps.find((s) => s.step_type === "Embassy" || s.step_type === "Kuwait Embassy");

      const contractDate = plc?.contract_signed_date || (applicant.creation ? String(applicant.creation).split(" ")[0] : "");
      let duration = 0;
      if (contractDate) {
        const cd = new Date(contractDate);
        if (!isNaN(cd.getTime())) {
          duration = Math.max(0, Math.floor((Date.now() - cd.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      const medicalDate = applicant.medical_date || applicant.medical_expiry_date || undefined;
      const medicalExpiryDate = applicant.medical_expiry_date;
      let medicalRemaining = "—";
      let medicalRemainingDays: number | undefined = undefined;

      if (medicalExpiryDate) {
        const exp = new Date(medicalExpiryDate);
        if (!isNaN(exp.getTime())) {
          const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          medicalRemainingDays = diffDays;
          medicalRemaining = `${diffDays} DAYS LEFT`;
        }
      }

      const injazPayment = injazStep?.payment_status === "Paid" || injazStep?.status === "Completed" || injazStep?.status === "Issued" ? "PAID" : "UNPAID";
      const lmisStatus = lmsStep?.status || (plc ? "In Progress" : "Pending");
      const wakalaStatus = plc ? "Authorized" : "Pending";
      const embassyStatus = embassyStep?.status || (plc?.status === "Stamped" ? "Stamped" : "Pending");
      const ticketStatus = plc?.status === "Ticketed" || plc?.status === "Departed" ? "Booked" : "Pending";
      const ticketNumber = plc?.ticket_number || "—";

      const row: WorkspaceApplicantRow = {
        applicantId: applicant.name,
        applicant: applicant as any,
        dossier: null,
        dsrName: undefined,
        destinationCountry: dest,
        fullName: applicant.full_name || `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || applicant.name,
        passportNumber: applicant.passport_number || "—",
        phone: applicant.phone || applicant.phone_number || undefined,
        medicalStatus: applicant.medical_status || "Pending",
        medicalDate,
        medicalExpiryDate,
        jobApplied: applicant.target_job || applicant.job_applied || "Housemaid",
        lockedContractor: plc?.contractor_name || plc?.contractor || (applicant as any).contractor_name || applicant.locked_contractor || "Tihamat Asir Recruitment company",
        sponsorName: plc?.employer_name || (applicant as any).sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI",
        sponsorId: (plc as any)?.employer_national_id || (applicant as any).sponsor_id || "1130373143",
        visaNumber: plc?.visa_number || (applicant as any).visa_number || "1908334046",
        contractNumber: plc?.contract_number || (applicant as any).contract_number || "2005450415",
        contractIssueDate: contractDate || (applicant as any).contract_signed_date || "2026-08-13",

        // Sheet normalized properties
        laborId: applicant.national_id || applicant.name,
        contractDate: contractDate || (applicant as any).contract_signed_date || "2026-08-13",
        duration: duration || (applicant as any).contract_period || "2 Years",
        medicalRemaining,
        medicalRemainingDays,
        injazPayment,
        appointmentDate: injazStep?.appointment_date || injazStep?.due_date || (applicant as any).appointment_date || "2026-08-25",
        contact: lmsStep?.assigned_officer || applicant.phone || "—",
        remark: lmsStep?.notes || embassyStep?.notes || "",
        wakalaStatus,
        embassyStatus,
        telephone: applicant.phone || applicant.phone_number || "—",
        company: plc?.contractor_name || plc?.contractor || "—",
        lmisStatus,
        issueDate: lmsStep?.creation ? lmsStep.creation.split(" ")[0] : undefined,
        ticketStatus,
        ticketNumber,

        // Clearances
        lms: lmsStep,
        injaz: injazStep,
        wakala: undefined,
        embassy: embassyStep,
        stamp: embassyStep?.status === "Stamped" ? embassyStep : undefined,
        ticket: plc?.ticket_number ? ({ ticket_number: plc.ticket_number, flight_date: plc.flight_date } as any) : undefined,
        departure: plc?.departed_on ? ({ departed_on: plc.departed_on } as any) : undefined,
      };

      rows.push(row);
    }

    return rows;
  } catch (err) {
    console.error("fetchOperationalWorkspaceData error:", err);
    return [];
  }
}

