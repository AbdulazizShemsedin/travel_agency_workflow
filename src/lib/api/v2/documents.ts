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
  raw_mrz?: string;
  [key: string]: any;
}

export interface V2ParsedContractData {
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
  injaz_application_number?: string;
  passport_number?: string;
  full_name?: string;
  origin_agency?: string;
  [key: string]: any;
}

export interface V2ParsedVisaData {
  visa_number?: string;
  visa_type?: string;
  dates?: string;
  reference?: string;
  sponsor_name?: string;
  civil_id?: string;
  agency_name?: string;
  license_number?: string;
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

  return requestV2<V2FileUploadResponse>("/api/method/upload_file", {
    method: "POST",
    body: formData,
    isMultipart: true,
  });
}

/**
 * Extracts ICAO 9303 MRZ fields from a passport scan file.
 */
export async function parsePassportFileV2(fileUrl: string): Promise<V2ParsedPassportData> {
  if (isDemoMode()) {
    return {
      passport_number: "EP9182301",
      first_name: "Tigist",
      middle_name: "Haile",
      last_name: "Kassahun",
      full_name: "Tigist Haile Kassahun",
      gender: "Female",
      nationality: "Ethiopian",
      date_of_birth: "1997-04-12",
      passport_issue_date: "2023-01-10",
      passport_expiry: "2028-01-10",
      place_of_issue: "Addis Ababa",
      raw_mrz: "P<ETBKASSAHUN<<TIGIST<HAILE<<<<<<<<<<<<<<<<<<<\nEP91823010ETH9704128F2801104<<<<<<<<<<<<<<06",
    };
  }

  return requestV2<V2ParsedPassportData>(
    "/api/method/agency_tracking.passport_parser.parse_passport_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
}

/**
 * Extracts structured fields from an uploaded contract file.
 */
export async function parseContractFileV2(
  fileUrl: string,
  destinationCountry?: "Saudi Arabia" | "Kuwait" | string
): Promise<V2ParsedContractData> {
  if (isDemoMode()) {
    return {
      contract_number: "CTR-2026-99120",
      visa_number: "VISA-9941029",
      sponsor_name: "Abdullah Mohammed Al-Otaibi",
      sponsor_id: "1098234190",
      contractor_name: "CON-001",
      salary: 1200,
      contract_period: 2,
      duration: 2,
      contract_signed_date: "2026-02-15",
      work_site: "Riyadh, Saudi Arabia",
    };
  }

  return requestV2<V2ParsedContractData>(
    "/api/method/agency_tracking.contract_parser.parse_contract_file",
    {
      method: "POST",
      body: {
        file_url: fileUrl,
        ...(destinationCountry ? { destination_country: destinationCountry } : {}),
      },
    }
  );
}

/**
 * Extracts fields from a Saudi Injaz paper document.
 */
export async function parseInjazFileV2(fileUrl: string): Promise<V2ParsedInjazData> {
  if (isDemoMode()) {
    return {
      injaz_application_number: "INJ-9920194",
      passport_number: "EP9182301",
      full_name: "Tigist Haile Kassahun",
      origin_agency: "Ethio-Arab Manpower Agency",
    };
  }

  return requestV2<V2ParsedInjazData>(
    "/api/method/agency_tracking.contract_parser.parse_injaz_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
}

/**
 * Extracts fields from a Kuwait eVisa document.
 */
export async function parseVisaFileV2(fileUrl: string): Promise<V2ParsedVisaData> {
  if (isDemoMode()) {
    return {
      visa_number: "KW-VISA-881920",
      visa_type: "Work Permit",
      dates: "2026-03-01 to 2028-03-01",
      reference: "PAM-KW-9912",
      sponsor_name: "Khaled Fahad Al-Sabah",
      civil_id: "288010199201",
      agency_name: "Gulf Direct Recruitment",
      license_number: "KWD-LIC-8821",
    };
  }

  return requestV2<V2ParsedVisaData>(
    "/api/method/agency_tracking.contract_parser.parse_visa_file",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
}
