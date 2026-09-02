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
import { isDemoMode } from "@/lib/config/env";

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
  if (isDemoMode()) {
    return {
      file_url: typeof window !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : "/demo/document_preview.pdf",
      file_name: file.name,
      name: `FILE-${Date.now().toString().slice(-6)}`,
    };
  }

  const formData = new FormData();
    formData.append("file", file);
    formData.append("is_private", isPrivate ? "1" : "0");
    if (doctype) formData.append("doctype", doctype);
    if (docname) formData.append("docname", docname);

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
  const result = await requestV2<V2ParsedPassportData>(
    "/api/method/agency_tracking.passport_parser.parse_passport_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
  return { status: "success", message: "Passport parsed successfully", ...result };
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


// ---------------------------------------------------------------------------
// Intelligent Mock Extractors for Demo & Graceful Fallback
// ---------------------------------------------------------------------------

function generateMockPassportData(fileUrl?: string): V2ParsedPassportData {
  const seed = Math.floor(1000000 + Math.random() * 9000000);
  const passportNum = `EP${seed.toString().slice(0, 7)}`;
  return {
    status: "success",
    message: "Passport MRZ lines scanned and extracted successfully",
    passport_number: passportNum,
    first_name: "Fatima",
    middle_name: "Kedir",
    last_name: "Mohammed",
    full_name: "Fatima Kedir Mohammed",
    gender: "Female",
    nationality: "Ethiopian",
    date_of_birth: "1998-06-15",
    passport_issue_date: "2023-05-10",
    passport_expiry: "2028-05-10",
    place_of_issue: "Addis Ababa",
    place_of_birth: "Dessie, Ethiopia",
    raw_mrz: `P<ETBMOHAMMED<<FATIMA<KEDIR<<<<<<<<<<<<<<<<<<<\n${passportNum}0ETH9806154F2805108<<<<<<<<<<<<<<02`,
  };
}

function generateMockContractData(destinationCountry?: string): V2ParsedContractData {
  const isKuwait = (destinationCountry || "").toLowerCase().includes("kuwait");
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);

  if (isKuwait) {
    return {
      status: "success",
      message: "Kuwait Bilateral Contract parsed successfully",
      contract_number: `KW-CTR-2026-${randomSuffix}`,
      visa_number: `KW-VISA-${randomSuffix}`,
      sponsor_name: "Khaled Fahad Al-Sabah / خالد فهد الصباح",
      sponsor_id: "288010199201",
      contractor_name: "Gulf Direct Recruitment Agency / وكالة الخليج للاستقدام",
      salary: 120,
      contract_period: 2,
      duration: 2,
      contract_signed_date: new Date().toISOString().split("T")[0],
      work_site: "Kuwait City, State of Kuwait",
    };
  }

  return {
    status: "success",
    message: "Saudi Musaned Contract parsed successfully",
    contract_number: `MSN-2026-${randomSuffix}`,
    visa_number: `130${randomSuffix}91`,
    sponsor_name: "Abdullah Mohammed Al-Otaibi / عبدالله محمد العتيبي",
    sponsor_id: "1098234190",
    contractor_name: "Al-Riyadh Manpower Services / وكالة الرياض للاستقدام",
    salary: 1200,
    contract_period: 2,
    duration: 2,
    contract_signed_date: new Date().toISOString().split("T")[0],
    work_site: "Riyadh, Kingdom of Saudi Arabia",
  };
}

function generateMockInjazData(): V2ParsedInjazData {
  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  return {
    status: "success",
    message: "Injaz / MOFA Barcode parsed successfully",
    injaz_application_number: `E${randomSuffix}`,
    mofa_barcode: `MOFA-${randomSuffix}`,
    passport_number: "EP9182301",
    full_name: "Fatima Kedir Mohammed",
    origin_agency: "Al-Nawras Overseas Employment Agency",
    payment_reference: `SADAD-${Math.floor(100000 + Math.random() * 900000)}`,
  };
}

function generateMockVisaData(): V2ParsedVisaData {
  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const now = new Date();
  const expiry = new Date();
  expiry.setFullYear(now.getFullYear() + 2);

  return {
    status: "success",
    message: "Electronic Work Visa parsed successfully",
    visa_number: `130${randomSuffix}`,
    visa_type: "Domestic Worker Visa / تأشيرة عمالة منزلية",
    dates: `${now.toISOString().split("T")[0]} to ${expiry.toISOString().split("T")[0]}`,
    issue_date: now.toISOString().split("T")[0],
    expiry_date: expiry.toISOString().split("T")[0],
    reference: `PAM-VISA-${randomSuffix.toString().slice(0, 6)}`,
    sponsor_name: "Mohammed Salem Al-Harbi / محمد سالم الحربي",
    civil_id: "1087291044",
    agency_name: "Al-Nawras Manpower Agency",
    license_number: "LIC-MOLSA-ETH-9182",
  };
}
