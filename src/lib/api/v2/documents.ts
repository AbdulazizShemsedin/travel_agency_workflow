/**
 * V2 Document Parsing & File Upload API
 * 
 * Endpoints:
 * - POST /api/method/upload_file
 * - POST /api/method/agency_tracking.api.document.write?op=parse_passport_file
 * - POST /api/method/agency_tracking.api.document.write?op=parse_contract_file
 * - POST /api/method/agency_tracking.api.document.write?op=parse_visa_file
 */

import { requestV2, ApiV2Error } from "./client";

export interface V2FileUploadResponse {
  id?: string;
  file_id?: string;
  file_url: string;
  file_name?: string;
  name?: string;
  size?: number;
  content_type?: string;
  is_private?: boolean;
}

export interface V2FileInfo {
  id: string;
  name: string;
  size?: number | null;
  content_type?: string;
  is_private?: boolean;
  uploaded_by?: string;
  created?: string;
}

export interface V2ContractExtractionMetadata {
  status: "ok" | "no_fields" | "no_text" | "file_unreadable" | "reader_missing" | string;
  method?: "text" | "ocr" | string;
  format?: "Saudi" | "Kuwait" | string | null;
  fields_found?: string[];
  message?: string | null;
}

export interface V2ParsedPassportData {
  status?: string;
  message?: string;
  passport_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: string;
  nationality?: string;
  date_of_birth?: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  place_of_issue?: string;
  place_of_birth?: string;
  needs_passport_review?: number | boolean;
  raw_mrz?: string;
  [key: string]: any;
}

export interface V2ParsedContractData {
  status?: string;
  message?: string;
  extraction?: V2ContractExtractionMetadata;
  contract_number?: string;
  contract_signed_date?: string;
  contract_date?: string;
  visa_number?: string;
  employer_name?: string;
  sponsor_name?: string;
  employer_national_id?: string;
  sponsor_id?: string;
  employer_address?: string;
  contractor_name?: string;
  saudi_agency_name?: string;
  saudi_agency_license?: string;
  kuwait_agency_name?: string;
  kuwait_agency_license?: string;
  salary?: number | string;
  salary_amount?: number | string;
  contract_salary_amount?: number | string;
  salary_currency?: string;
  contract_salary_currency?: string;
  contract_period?: string | number;
  duration?: string | number;
  contract_duration?: string | number;
  work_site?: string;
  employment_site?: string;
  [key: string]: any;
}

export interface V2ParsedVisaData {
  status?: string;
  message?: string;
  visa_number?: string;
  visa_type?: string;
  visa_issue_date?: string;
  issue_date?: string;
  visa_expiry_date?: string;
  expiry_date?: string;
  sponsor_name?: string;
  employer_name?: string;
  sponsor_id?: string;
  civil_id?: string;
  employer_national_id?: string;
  dates?: string;
  reference?: string;
  reference_number?: string;
  [key: string]: any;
}

/**
 * Resolves a technical file ID, relative path, or remote URL to an authoritative download URL.
 * Go backend file-ID contract:
 * - Technical file IDs (e.g. "file_9f3c2a71d04be85a6c1d") resolve to:
 *   /api/method/agency_tracking.api.file.read?op=download_file&file_id=<ID>
 *   (the proxy forwards it to /v1/files/<ID> when the backend serves /v1)
 * - Existing absolute or relative HTTP/API addresses (including agency portal photo URLs)
 *   are preserved without modification.
 */
export function getFileDownloadUrl(fileIdOrUrl?: string | null): string {
  if (!fileIdOrUrl || typeof fileIdOrUrl !== "string") return "";
  const s = fileIdOrUrl.trim();
  if (!s || s === "null" || s === "undefined") return "";

  // Direct internal S3/R2 staging key: never treat as relative URL in browser
  if (s.startsWith("uploads/")) {
    return "";
  }

  // Already a full or relative API endpoint, blob, data URL, or external URL
  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("blob:") ||
    s.startsWith("data:") ||
    s.startsWith("/v1/") ||
    s.startsWith("/api/") ||
    s.startsWith("/files/") ||
    s.startsWith("/private/files/")
  ) {
    return s;
  }

  // Go backend file ID pattern: starts with "file_" or is a technical hash without path slashes
  if (s.startsWith("file_") || (!s.startsWith("/") && !s.includes("/"))) {
    // The old address on purpose: the /api/method proxy sends it on to /v1/files/<id> when the
    // backend serves /v1, and to the old route when it doesn't.
    return `/api/method/agency_tracking.api.file.read?op=download_file&file_id=${encodeURIComponent(s)}`;
  }

  // Relative file paths without leading slash
  if (s.startsWith("files/") || s.startsWith("private/files/")) {
    return `/${s}`;
  }

  // Legacy path (e.g. /private/files/... or /files/...)
  return s;
}

/**
 * Strips any wrapping download URL or query string to extract the raw technical file ID.
 * Examples:
 * - "file_9f3c2a71d04be85a6c1d" -> "file_9f3c2a71d04be85a6c1d"
 * - "/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_9f3c2a71d04be85a6c1d" -> "file_9f3c2a71d04be85a6c1d"
 * - "/v1/files/file_9f3c2a71d04be85a6c1d" -> "file_9f3c2a71d04be85a6c1d"
 * - "/private/files/contract.pdf" -> "/private/files/contract.pdf"
 */
export function cleanFileId(idOrUrl?: string | null): string {
  if (!idOrUrl || typeof idOrUrl !== "string") return "";
  const s = idOrUrl.trim();
  if (!s || s === "null" || s === "undefined") return "";

  const v1 = s.match(/\/v1\/files\/([^/?#]+)/);
  if (v1 && v1[1]) {
    return decodeURIComponent(v1[1]).trim();
  }

  if (s.includes("file_id=")) {
    const match = s.match(/file_id=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return s;
}

/**
 * Looks up metadata (name, size, content_type) for files by their technical IDs.
 * Accepts at most 200 IDs per request.
 * Backend Endpoint: GET agency_tracking.api.file.read?op=get_file_info&file_ids=...
 */
export async function getFileInfoV2(fileIds: string[]): Promise<Record<string, V2FileInfo>> {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return {};
  const cleanIds = Array.from(new Set(fileIds.map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 200);
  if (cleanIds.length === 0) return {};

  try {
    const res = await requestV2<any>(
      `/api/method/agency_tracking.api.file.read?op=get_file_info&file_ids=${encodeURIComponent(cleanIds.join(","))}`,
      { method: "GET" }
    );
    const data = res?.message || res || {};
    return typeof data === "object" && data !== null ? data : {};
  } catch (err) {
    console.warn("[getFileInfoV2] Error fetching file info:", err);
    return {};
  }
}

/**
 * Uploads a file using direct storage flow (start_upload -> PUT -> finish_upload)
 * with graceful fallback to multipart /api/method/upload_file.
 * Retains file_id as technical reference while preserving original human-readable filename.
 */
export async function uploadFileV2(
  file: File,
  isPrivate: boolean = true,
  doctype?: string,
  docname?: string
): Promise<V2FileUploadResponse> {
  // Step 1: Direct storage upload flow (bypasses proxy 4.5MB limit for files up to 20MB)
  try {
    const startRes = await requestV2<any>(
      "/api/method/agency_tracking.api.file.write?op=start_upload",
      {
        method: "POST",
        body: {
          op: "start_upload",
          filename: file.name,
          size: file.size,
          is_private: isPrivate ? 1 : 0,
          ...(doctype && docname ? { doctype: doctype.trim(), docname: docname.trim() } : {}),
        },
      }
    );
    const startPayload = (startRes && "message" in startRes && startRes.message) ? startRes.message : startRes;
    const fileId = startPayload?.file_id || startPayload?.key || startPayload?.id;

    if (startPayload?.upload_url && fileId) {
      // Step 2: PUT directly to Cloudflare R2 / storage
      const putHeaders: Record<string, string> = {
        ...(startPayload.headers || {}),
      };
      const putRes = await fetch(startPayload.upload_url, {
        method: startPayload.method || "PUT",
        headers: putHeaders,
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`Direct storage upload failed with status ${putRes.status}`);
      }

      // Step 3: Finish upload using file_id (Go backend file-ID contract)
      const finishRes = await requestV2<any>(
        "/api/method/agency_tracking.api.file.write?op=finish_upload",
        {
          method: "POST",
          body: {
            op: "finish_upload",
            file_id: fileId,
          },
        }
      );
      const finishPayload = (finishRes && "message" in finishRes && finishRes.message) ? finishRes.message : finishRes;
      const backendId = String(finishPayload?.id || finishPayload?.file_id || fileId || "").trim();
      const effectiveId = backendId || (finishPayload?.file_url ? String(finishPayload.file_url).trim() : "");
      const fileName = finishPayload?.name || finishPayload?.file_name || file.name;

      return {
        id: effectiveId,
        file_id: effectiveId,
        file_url: effectiveId,
        file_name: fileName,
        name: fileName,
        size: finishPayload?.size ?? file.size,
        content_type: finishPayload?.content_type || file.type,
        is_private: finishPayload?.is_private ?? isPrivate,
      };
    }
  } catch (err: any) {
    const msg = String(err?.message || "");
    const isR2NotConfigured = err?.status === 417 || msg.includes("Cloudflare R2 is not configured");
    const isMethodMissing = err?.status === 404 || msg.includes("upload_guard");

    if (isR2NotConfigured || isMethodMissing) {
      if (file.size > 4.5 * 1024 * 1024) {
        throw new ApiV2Error(
          `Direct storage is not configured on this environment (HTTP 417). The file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 4.5 MB server proxy limit and cannot be uploaded via the legacy fallback. Please configure storage or upload a file under 4.5 MB.`,
          417
        );
      }
      console.warn("[Upload] Direct upload unavailable, using legacy upload_file fallback for small file:", msg);
    } else {
      // Honest error propagation for file size, MIME kind, or backend permission rejections
      throw err;
    }
  }

  // Fallback path: standard multipart upload_file
  const formData = new FormData();
  formData.append("file", file);
  formData.append("is_private", isPrivate ? "1" : "0");
  if (doctype && docname && typeof docname === "string" && docname.trim()) {
    formData.append("doctype", doctype.trim());
    formData.append("docname", docname.trim());
  }

  const rawRes = await requestV2<any>("/api/method/upload_file", {
    method: "POST",
    body: formData,
    isMultipart: true,
  });

  const payload = (rawRes && "message" in rawRes && rawRes.message) ? rawRes.message : rawRes;
  const backendId = String(payload?.id || payload?.file_id || "").trim();
  const effectiveId = backendId || (payload?.file_url ? String(payload.file_url).trim() : "");
  const fileName = payload?.name || payload?.file_name || file.name;

  return {
    id: effectiveId,
    file_id: effectiveId,
    file_url: effectiveId,
    file_name: fileName,
    name: fileName,
    size: payload?.size ?? file.size,
    content_type: payload?.content_type || file.type,
    is_private: payload?.is_private ?? isPrivate,
  };
}

/**
 * Extracts ICAO 9303 MRZ fields and visual zone details (including place_of_birth)
 * from a passport scan file using async enqueue + poll with synchronous fallback.
 * Sends both file_id and file_url for cross-version compatibility.
 */
export async function parsePassportFileV2(fileIdOrUrl: string): Promise<V2ParsedPassportData> {
  const fileId = cleanFileId(fileIdOrUrl);
  let rawData: any = null;

  try {
    // 1. Primary path: Enqueue async background job (OCR.space / backend pipeline)
    const enqueueRes = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=enqueue_parse_passport_file",
      {
        method: "POST",
        body: {
          op: "enqueue_parse_passport_file",
          file_id: fileId,
        },
      }
    );

    const jobName = enqueueRes?.message?.job_name || enqueueRes?.message?.job || enqueueRes?.job_name || enqueueRes?.job || enqueueRes?.message?.name;
    if (jobName) {
      // Poll background_jobs.get_job_status
      const maxAttempts = 30; // 30 x 1500ms = 45s max
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobStatusRes = await requestV2<any>(
          "/api/method/agency_tracking.api.system.read?op=get_job_status",
          {
            method: "POST",
            body: { job_name: jobName },
          }
        );

        const job = jobStatusRes?.message || jobStatusRes || {};
        const status = (job.status || "").toLowerCase();

        if (status === "completed" || status === "finished" || status === "success") {
          rawData = job.result || job.data || {};
          break;
        } else if (status === "failed") {
          throw new ApiV2Error(
            job.error || "Passport parsing failed on server. Please verify the uploaded image is clear.",
            417
          );
        }
      }
    }
  } catch (err: any) {
    // If it was a real parsing failure from the worker, propagate it
    if (err instanceof ApiV2Error && err.statusCode === 417) {
      throw err;
    }
    // Otherwise fallback to synchronous parse_passport_file
    console.warn("[parsePassportFileV2] Async enqueue failed or timed out, falling back to sync parser:", err);
  }

  // 2. Synchronous fallback if async did not produce rawData
  if (!rawData) {
    const raw = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=parse_passport_file",
      {
        method: "POST",
        body: {
          op: "parse_passport_file",
          file_id: fileId,
        },
      }
    );
    rawData = raw?.message && typeof raw.message === "object" ? raw.message : raw || {};
  }

  const data = rawData || {};
  const expiry = data.passport_expiry || data.passport_expiry_date || data.expiry_date || "";
  const dob = data.date_of_birth || data.dob || data.birth_date || "";
  const issueDate = data.passport_issue_date || data.issue_date || "";
  const placeOfIssue = data.place_of_issue || data.passport_issue_place || "";
  const placeOfBirth = data.place_of_birth || data.birth_place || "";
  const needsReview = Boolean(data.needs_passport_review);

  return {
    status: "success",
    message: "Passport parsed successfully",
    ...data,
    passport_expiry: expiry,
    passport_expiry_date: expiry,
    date_of_birth: dob,
    dob: dob,
    passport_issue_date: issueDate,
    place_of_issue: placeOfIssue,
    passport_issue_place: placeOfIssue,
    place_of_birth: placeOfBirth,
    needs_passport_review: needsReview,
  };
}

/**
 * Extracts structured fields from an uploaded contract file.
 * Supports async job enqueue with status polling and graceful synchronous fallback.
 * Sends both file_id and file_url for cross-version compatibility.
 * Preserves the authoritative Go backend extraction metadata block without discarding it.
 */
export async function parseContractFileV2(
  fileIdOrUrl: string,
  destinationCountry?: "Saudi Arabia" | "Kuwait" | string
): Promise<V2ParsedContractData> {
  const fileId = cleanFileId(fileIdOrUrl);
  let rawResult: any = null;

  try {
    // 1. Primary path: Enqueue async background job if backend supports background parsing
    const enqueueRes = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=enqueue_parse_contract_file",
      {
        method: "POST",
        body: {
          op: "enqueue_parse_contract_file",
          file_id: fileId,
          ...(destinationCountry ? { destination_country: destinationCountry } : {}),
        },
      }
    );

    const jobName = enqueueRes?.message?.job_name || enqueueRes?.message?.job || enqueueRes?.job_name || enqueueRes?.job || enqueueRes?.message?.name;
    if (jobName) {
      const maxAttempts = 30; // 30 x 1500ms = 45s max
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobStatusRes = await requestV2<any>(
          "/api/method/agency_tracking.api.system.read?op=get_job_status",
          {
            method: "POST",
            body: { op: "get_job_status", job_name: jobName },
          }
        );

        const job = jobStatusRes?.message || jobStatusRes || {};
        const status = (job.status || "").toLowerCase();

        if (status === "completed" || status === "finished" || status === "success") {
          rawResult = job.result || job.data || {};
          break;
        } else if (status === "failed") {
          throw new ApiV2Error(
            job.error || "Contract parsing failed on server. Please verify the document.",
            417
          );
        }
      }
    } else if (enqueueRes && typeof enqueueRes === "object" && (enqueueRes.message || enqueueRes.data)) {
      rawResult = enqueueRes;
    }
  } catch (err: any) {
    if (err instanceof ApiV2Error && err.statusCode === 417) {
      throw err;
    }
    // Fallback to synchronous parse_contract_file
  }

  // 2. Synchronous fallback if async did not produce result
  if (!rawResult) {
    const syncRes = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=parse_contract_file",
      {
        method: "POST",
        body: {
          op: "parse_contract_file",
          file_id: fileId,
          ...(destinationCountry ? { destination_country: destinationCountry } : {}),
        },
      }
    );
    rawResult = syncRes;
  }

  let data: Record<string, any> = {};
  if (rawResult && typeof rawResult === "object") {
    if (rawResult.data && typeof rawResult.data === "object") {
      data = rawResult.data;
    } else if (rawResult.parsed_data && typeof rawResult.parsed_data === "object") {
      data = rawResult.parsed_data;
    } else if (rawResult.parsed_contract && typeof rawResult.parsed_contract === "object") {
      data = rawResult.parsed_contract;
    } else if (rawResult.message && typeof rawResult.message === "object") {
      const msg = rawResult.message;
      if (msg.data && typeof msg.data === "object") {
        data = msg.data;
      } else if (msg.parsed_data && typeof msg.parsed_data === "object") {
        data = msg.parsed_data;
      } else if (msg.parsed_contract && typeof msg.parsed_contract === "object") {
        data = msg.parsed_contract;
      } else {
        data = msg;
      }
    } else {
      data = rawResult;
    }
  }

  const extraction: V2ContractExtractionMetadata | undefined =
    data.extraction ||
    rawResult?.extraction ||
    rawResult?.message?.extraction ||
    rawResult?.result?.extraction;

  const contractSignedDate = data.contract_signed_date || data.contract_date || data.signed_date || data.date || "";
  const contractNumber = data.contract_number || data.contract_no || "";
  const visaNumber = data.visa_number || data.visa_no || "";
  const employerName = data.employer_name || data.sponsor_name || data.employer || "";
  const employerId = data.employer_national_id || data.sponsor_id || data.employer_id || data.national_id || "";
  const employerAddress = data.employer_address || data.sponsor_address || data.address || "";
  const saudiAgencyName = data.saudi_agency_name || data.agency_name || data.contractor_name || data.saudi_agency || "";
  const saudiAgencyLicense = data.saudi_agency_license || data.agency_license || "";
  const kuwaitAgencyName = data.kuwait_agency_name || data.agency_name || data.contractor_name || data.kuwait_agency || "";
  const kuwaitAgencyLicense = data.kuwait_agency_license || data.agency_license || "";
  const salary = data.salary_amount ?? data.contract_salary_amount ?? data.salary ?? "";
  let salaryCurrency = data.salary_currency || data.contract_salary_currency || data.currency || "";
  if (String(salaryCurrency).toUpperCase() === "KD") {
    salaryCurrency = "KWD";
  }
  const workSite = data.employment_site || data.work_site || data.site || "";
  const duration = data.contract_duration || data.duration || data.contract_period || "";

  return {
    status: extraction?.status || (typeof rawResult?.message === "string" ? rawResult.message : "success"),
    message: extraction?.message || (typeof rawResult?.message === "string" ? rawResult.message : "Contract document parsed successfully"),
    extraction,
    ...data,
    contract_signed_date: contractSignedDate,
    contract_date: contractSignedDate,
    contract_number: contractNumber,
    visa_number: visaNumber,
    employer_name: employerName,
    sponsor_name: employerName,
    employer_national_id: employerId,
    sponsor_id: employerId,
    employer_address: employerAddress,
    saudi_agency_name: saudiAgencyName,
    saudi_agency_license: saudiAgencyLicense,
    kuwait_agency_name: kuwaitAgencyName,
    kuwait_agency_license: kuwaitAgencyLicense,
    salary_amount: salary,
    contract_salary_amount: salary,
    salary: salary,
    salary_currency: salaryCurrency,
    contract_salary_currency: salaryCurrency,
    employment_site: workSite,
    work_site: workSite,
    contract_duration: duration,
    duration: duration,
    contract_period: duration,
  };
}

/**
 * Extracts fields from a Kuwait eVisa document.
 * Supports async job enqueue with status polling and graceful synchronous fallback.
 * Sends both file_id and file_url for cross-version compatibility.
 */
export async function parseVisaFileV2(fileIdOrUrl: string): Promise<V2ParsedVisaData> {
  const fileId = cleanFileId(fileIdOrUrl);
  let rawResult: any = null;

  try {
    // 1. Primary path: Enqueue async background job if backend supports background parsing
    const enqueueRes = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=enqueue_parse_visa_file",
      {
        method: "POST",
        body: {
          op: "enqueue_parse_visa_file",
          file_id: fileId,
        },
      }
    );

    const jobName = enqueueRes?.message?.job || enqueueRes?.job || enqueueRes?.message?.name;
    if (jobName) {
      const maxAttempts = 30; // 30 x 1500ms = 45s max
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobStatusRes = await requestV2<any>(
          "/api/method/agency_tracking.api.system.read?op=get_job_status",
          {
            method: "POST",
            body: { job_name: jobName },
          }
        );

        const job = jobStatusRes?.message || jobStatusRes || {};
        const status = (job.status || "").toLowerCase();

        if (status === "completed") {
          rawResult = job.result || {};
          break;
        } else if (status === "failed") {
          throw new ApiV2Error(
            job.error || "Visa parsing failed on server. Please verify the document.",
            417
          );
        }
      }
    } else if (enqueueRes && typeof enqueueRes === "object" && (enqueueRes.message || enqueueRes.data)) {
      rawResult = enqueueRes;
    }
  } catch (err: any) {
    if (err instanceof ApiV2Error && err.statusCode === 417) {
      throw err;
    }
    // Fallback to synchronous parse_visa_file
  }

  // 2. Synchronous fallback if async did not produce rawResult
  if (!rawResult) {
    const syncRes = await requestV2<any>(
      "/api/method/agency_tracking.api.document.write?op=parse_visa_file",
      {
        method: "POST",
        body: {
          op: "parse_visa_file",
          file_id: fileId,
        },
      }
    );
    rawResult = syncRes;
  }

  let data: Record<string, any> = {};
  if (rawResult && typeof rawResult === "object") {
    if (rawResult.data && typeof rawResult.data === "object") {
      data = rawResult.data;
    } else if (rawResult.parsed_data && typeof rawResult.parsed_data === "object") {
      data = rawResult.parsed_data;
    } else if (rawResult.parsed_visa && typeof rawResult.parsed_visa === "object") {
      data = rawResult.parsed_visa;
    } else if (rawResult.message && typeof rawResult.message === "object") {
      const msg = rawResult.message;
      if (msg.data && typeof msg.data === "object") {
        data = msg.data;
      } else if (msg.parsed_data && typeof msg.parsed_data === "object") {
        data = msg.parsed_data;
      } else if (msg.parsed_visa && typeof msg.parsed_visa === "object") {
        data = msg.parsed_visa;
      } else {
        data = msg;
      }
    } else {
      data = rawResult;
    }
  }

  const visaNumber = data.visa_number || data.visa_no || "";
  const visaType = data.visa_type || data.type || "";
  const issueDate = data.visa_issue_date || data.issue_date || data.dates?.issue || "";
  const expiryDate = data.visa_expiry_date || data.expiry_date || data.dates?.expiry || "";
  const sponsorName = data.sponsor_name || data.employer_name || data.sponsor || "";
  const sponsorId = data.sponsor_id || data.civil_id || data.employer_national_id || data.national_id || "";
  const reference = data.reference || data.reference_number || data.ref || "";

  return {
    status: "success",
    message: typeof rawResult?.message === "string" ? rawResult.message : "Visa parsed successfully",
    ...data,
    visa_number: visaNumber,
    visa_type: visaType,
    visa_issue_date: issueDate,
    issue_date: issueDate,
    visa_expiry_date: expiryDate,
    expiry_date: expiryDate,
    sponsor_name: sponsorName,
    employer_name: sponsorName,
    sponsor_id: sponsorId,
    civil_id: sponsorId,
    employer_national_id: sponsorId,
    reference: reference,
    reference_number: reference,
  };
}
