/**
 * V2 Document Parsing & File Upload API
 * 
 * Endpoints:
 * - POST /api/method/upload_file
 * - POST /api/method/agency_tracking.passport_parser.parse_passport_file
 * - POST /api/method/agency_tracking.contract_parser.parse_contract_file
 * - POST /api/method/agency_tracking.contract_parser.parse_injaz_file
 * - POST /api/method/agency_tracking.contract_parser.parse_visa_file
 */

import { requestV2 } from "./client";

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

export interface V2ParsedInjazData {
  status?: string;
  message?: string;
  injaz_application_number?: string;
  mofa_barcode?: string;
  passport_number?: string;
  full_name?: string;
  origin_agency?: string;
  payment_reference?: string;
  [key: string]: any;
}

export interface V2ParsedVisaData {
  status?: string;
  message?: string;
  visa_number?: string;
  visa_type?: string;
  dates?: string;
  reference?: string;
  sponsor_name?: string;
  civil_id?: string;
  agency_name?: string;
  license_number?: string;
  issue_date?: string;
  expiry_date?: string;
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
 * Extracts ICAO 9303 MRZ fields from a passport scan file.
 */
export async function parsePassportFileV2(fileUrl: string): Promise<V2ParsedPassportData> {
  const raw = await requestV2<any>(
    "/api/method/agency_tracking.passport_parser.parse_passport_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );

  const data = raw?.message && typeof raw.message === "object" ? raw.message : raw || {};

  const expiry = data.passport_expiry || data.passport_expiry_date || data.expiry_date || "";
  const dob = data.date_of_birth || data.dob || data.birth_date || "";
  const issueDate = data.passport_issue_date || data.issue_date || "";
  const placeOfIssue = data.place_of_issue || data.passport_issue_place || "";

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
 * Extracts fields from a Saudi Injaz paper document.
 */
export async function parseInjazFileV2(fileUrl: string): Promise<V2ParsedInjazData> {
  const result = await requestV2<V2ParsedInjazData>(
    "/api/method/agency_tracking.contract_parser.parse_injaz_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
  return { status: "success", message: "Injaz parsed successfully", ...result };
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
