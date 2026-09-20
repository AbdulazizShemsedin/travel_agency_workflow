/**
 * V2 Document Parsing & File Upload API
 * 
 * Endpoints:
 * - POST /api/method/upload_file
 * - POST /api/method/agency_tracking.passport_parser.parse_passport_file
 * - POST /api/method/agency_tracking.contract_parser.parse_contract_file
 * - POST /api/method/agency_tracking.contract_parser.parse_visa_file
 */

import { requestV2, ApiV2Error } from "./client";

export interface V2FileUploadResponse {
  file_url: string;
  file_name?: string;
  name?: string;
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
  contract_number?: string;
  visa_number?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  contractor_name?: string;
  salary?: number | string;
  contract_period?: string | number;
  duration?: string | number;
  contract_signed_date?: string;
  work_site?: string;
  [key: string]: any;
}

export interface V2ParsedVisaData {
  status?: string;
  message?: string;
  visa_number?: string;
  visa_type?: string;
  dates?: string;
  reference?: string;
  [key: string]: any;
}

/**
 * Uploads a file via standard Frappe multipart endpoint to generate a file_url.
 */
export async function uploadFileV2(
  file: File,
  isPrivate: boolean = true,
  doctype?: string,
  docname?: string
): Promise<V2FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("is_private", isPrivate ? "1" : "0");
  if (doctype && docname && typeof docname === "string" && docname.trim()) {
    formData.append("doctype", doctype.trim());
    formData.append("docname", docname.trim());
  }

  return await requestV2<V2FileUploadResponse>("/api/method/upload_file", {
    method: "POST",
    body: formData,
    isMultipart: true,
  });
}

/**
 * Extracts ICAO 9303 MRZ fields and visual zone details (including place_of_birth)
 * from a passport scan file using async enqueue + poll with synchronous fallback.
 */
export async function parsePassportFileV2(fileUrl: string): Promise<V2ParsedPassportData> {
  let rawData: any = null;

  try {
    // 1. Primary path: Enqueue async background job (OCR.space / backend pipeline)
    const enqueueRes = await requestV2<any>(
      "/api/method/agency_tracking.passport_parser.enqueue_parse_passport_file",
      {
        method: "POST",
        body: { file_url: fileUrl },
      }
    );

    const jobName = enqueueRes?.message?.job || enqueueRes?.job || enqueueRes?.message?.name;
    if (jobName) {
      // Poll background_jobs.get_job_status
      const maxAttempts = 30; // 30 x 1500ms = 45s max
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const jobStatusRes = await requestV2<any>(
          "/api/method/agency_tracking.background_jobs.get_job_status",
          {
            method: "POST",
            body: { job_name: jobName },
          }
        );

        const job = jobStatusRes?.message || jobStatusRes || {};
        const status = (job.status || "").toLowerCase();

        if (status === "completed") {
          rawData = job.result || {};
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
      "/api/method/agency_tracking.passport_parser.parse_passport_file",
      {
        method: "POST",
        body: { file_url: fileUrl },
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
 */
export async function parseContractFileV2(
  fileUrl: string,
  destinationCountry?: "Saudi Arabia" | "Kuwait" | string
): Promise<V2ParsedContractData> {
  const result = await requestV2<V2ParsedContractData>(
    "/api/method/agency_tracking.contract_parser.parse_contract_file",
    {
      method: "POST",
      body: {
        file_url: fileUrl,
        ...(destinationCountry ? { destination_country: destinationCountry } : {}),
      },
    }
  );
  return { status: "success", message: "Contract document parsed successfully", ...result };
}

/**
 * Extracts fields from a Kuwait eVisa document.
 */
export async function parseVisaFileV2(fileUrl: string): Promise<V2ParsedVisaData> {
  const result = await requestV2<V2ParsedVisaData>(
    "/api/method/agency_tracking.contract_parser.parse_visa_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
  return { status: "success", message: "Visa parsed successfully", ...result };
}
