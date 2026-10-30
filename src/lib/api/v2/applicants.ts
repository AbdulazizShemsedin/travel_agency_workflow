/**
 * V2 Applicant Lifecycle API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.applicant_api.create_applicant
 * - POST /api/method/agency_tracking.applicant_api.get_applicant
 * - POST /api/method/agency_tracking.applicant_api.list_applicants
 * - POST /api/method/agency_tracking.applicant_api.register_applicant
 * - POST /api/method/agency_tracking.applicant_api.update_applicant
 * - POST /api/method/agency_tracking.applicant_api.update_applicant_for_lmis
 * - POST /api/method/agency_tracking.applicant_api.cancel_applicant
 * - POST /api/method/agency_tracking.applicant_api.restart_applicant
 * - POST /api/method/agency_tracking.applicant_api.set_country_ban
 * - POST /api/method/agency_tracking.applicant_api.list_country_bans
 * - POST /api/method/agency_tracking.applicant_api.remove_country_ban
 * - POST /api/method/agency_tracking.applicant_api.log_applicant_fee
 */

import { requestV2 } from "./client";
import type { V2MedicalCurrent } from "./medical";
import {
  toClientCocStatus,
  toBackendCocStatus,
  CLIENT_COC_STATUS_OPTIONS,
} from "@/lib/validations/applicant.schema";

export { toClientCocStatus, toBackendCocStatus, CLIENT_COC_STATUS_OPTIONS };

export type V2ApplicantLifecycleStatus =
  | "Draft"
  | "Registered"
  | "CV Generated"
  | "Cancelled";

export interface V2CreateApplicantPayload {
  full_name: string;
  gender: "Male" | "Female" | "Other" | string;
  nationality: string;
  entry_track: "Standard" | "Muayena";
  destination_country?: string;
  muayena_agency?: string;
  video_key?: string;
  [key: string]: any;
}

export interface V2ApplicantDetails {
  medical_current?: V2MedicalCurrent;
  name: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender: string;
  nationality: string;
  entry_track?: "Standard" | "Muayena";
  muayena_agency?: string;
  status?: V2ApplicantLifecycleStatus | string;
  applicant_state?: string;
  destination_country?: string;
  passport_number?: string;
  passport_expiry?: string;
  phone_number?: string;
  phone?: string;
  target_job?: string;
  job_applied?: string;
  cycle_number?: number;
  national_id?: string;
  labor_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  coc_attachment?: string;
  has_active_ban?: number | boolean;
  registration_fee_status?: string;
  registration_fee_amount?: number;
  photograph?: string;
  photo_passport?: string;
  salary_amount?: number;
  salary?: number;
  salary_currency?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  sponsor_phone?: string;
  contract_number?: string;
  contract_period?: string | number;
  visa_number?: string;
  contractor_name?: string;
  is_uploaded_to_musaned?: number | boolean;
  musaned_status?: string;
  musaned_reference_no?: string;
  video_url?: string;
  intro_video?: string;
  video?: string;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

export interface V2LmisUpdatePayload {
  applicant_name: string;
  national_id?: string;
  labor_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  coc_attachment?: string;
  coc_status?: string;
  exam_date?: string;
  insurance_payment?: number | string;
  lmis_payment?: number | string;
  [key: string]: any;
}

export interface V2CountryBanRecord {
  name: string;
  applicant: string;
  full_name?: string;
  passport_number?: string;
  country: string;
  reason?: string;
  set_by?: string;
  set_by_name?: string;
  set_on?: string;
  active?: number;
  lifted_by?: string;
  lifted_by_name?: string;
  lifted_on?: string;
  lift_reason?: string;
  creation?: string;
  [key: string]: any;
}

/**
 * Authoritative check: Only an applicant whose experience_country is filled
 * with a real country (not empty, and not 'None' / 'First Time' / 'N/A')
 * is considered an experienced candidate.
 */
export function isExperiencedCountry(country?: string | null): boolean {
  if (!country) return false;
  const trimmed = country.trim().toLowerCase();
  if (!trimmed) return false;
  const nonCountries = [
    "none",
    "first time",
    "first time applicant",
    "none / first time",
    "none/first time",
    "first-time",
    "overseas",
    "n/a",
    "na",
    "no",
    "false",
    "nil",
    "not applicable",
    "none / first timer",
    "first timer",
  ];
  return !nonCountries.includes(trimmed);
}

export type BackendEducationLevel =
  | ""
  | "High School"
  | "Associate Degree"
  | "Bachelor's Degree"
  | "Master's Degree"
  | "Doctorate"
  | "Other";

/**
 * Maps arbitrary or legacy education/qualification strings into Frappe backend's
 * exact Select options for the `education` field:
 * "", "High School", "Associate Degree", "Bachelor's Degree", "Master's Degree", "Doctorate", "Other"
 */
export function mapEducationLevelToBackend(val?: string | null): BackendEducationLevel {
  if (!val) return "";
  const clean = String(val).trim();
  if (!clean) return "";

  const upper = clean.toUpperCase();

  // High School matches
  if (
    upper === "HIGH SCHOOL" ||
    upper === "SECONDARY LEVEL" ||
    upper === "PRIMARY LEVEL" ||
    upper === "ELEMENTARY" ||
    upper === "MIDDLE SCHOOL"
  ) {
    return "High School";
  }

  // Associate Degree matches
  if (
    upper === "ASSOCIATE DEGREE" ||
    upper === "ASSOCIATE" ||
    upper === "DIPLOMA" ||
    upper === "TVET" ||
    upper === "COLLEGE DIPLOMA"
  ) {
    return "Associate Degree";
  }

  // Bachelor's Degree matches
  if (
    upper === "BACHELOR'S DEGREE" ||
    upper === "BACHELORS DEGREE" ||
    upper === "BACHELOR" ||
    upper === "DEGREE" ||
    upper === "UNIVERSITY DEGREE"
  ) {
    return "Bachelor's Degree";
  }

  // Master's Degree matches
  if (
    upper === "MASTER'S DEGREE" ||
    upper === "MASTERS DEGREE" ||
    upper === "MASTER" ||
    upper === "POSTGRADUATE"
  ) {
    return "Master's Degree";
  }

  // Doctorate matches
  if (
    upper === "DOCTORATE" ||
    upper === "DOCTOR" ||
    upper === "PHD" ||
    upper === "PH.D"
  ) {
    return "Doctorate";
  }

  // Other matches
  if (upper === "OTHER" || upper === "NONE" || upper === "NOT SPECIFIED") {
    return "Other";
  }

  // Exact case match with allowed options
  const allowed: readonly BackendEducationLevel[] = [
    "High School",
    "Associate Degree",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctorate",
    "Other",
  ];
  const matched = allowed.find((opt) => opt.toLowerCase() === clean.toLowerCase());
  if (matched) return matched;

  return "Other";
}

/**
 * Normalizes applicant fields between frontend aliases and Frappe DocType fields.
 * Ensures target_job, education, salary_amount, salary_currency, photograph, etc.
 * are always populated for Frappe's field-floor checks.
 */
export function normalizeApplicantFields<T extends Record<string, any>>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const result: Record<string, any> = { ...payload };

  // 0. Full Name / First, Middle, Last Name derivation (always UPPERCASE)
  if (result.full_name) result.full_name = String(result.full_name).toUpperCase().trim();
  if (result.first_name) result.first_name = String(result.first_name).toUpperCase().trim();
  if (result.middle_name) result.middle_name = String(result.middle_name).toUpperCase().trim();
  if (result.last_name) result.last_name = String(result.last_name).toUpperCase().trim();

  if (result.full_name && (!result.first_name || !result.last_name)) {
    const parts = String(result.full_name).trim().split(/\s+/).filter(Boolean);
    if (parts.length > 0 && !result.first_name) {
      result.first_name = parts[0].toUpperCase();
    }
    if (parts.length > 1 && !result.middle_name) {
      result.middle_name = parts[1].toUpperCase();
    }
    if (parts.length > 2 && !result.last_name) {
      result.last_name = parts.slice(2).join(" ").toUpperCase();
    } else if (parts.length === 2 && !result.last_name) {
      result.last_name = parts[1].toUpperCase();
    }
  } else if (!result.full_name && (result.first_name || result.last_name)) {
    result.full_name = [result.first_name, result.middle_name, result.last_name].filter(Boolean).join(" ").trim().toUpperCase();
  }

  // 0.1 Entry Track Synchronization (canonical: entry_track: "Standard" | "Muayena")
  const rawTrack = result.entry_track || result.applicant_type;
  if (rawTrack) {
    const normalizedTrack = String(rawTrack).trim().toLowerCase() === "muayena" ? "Muayena" : "Standard";
    result.entry_track = normalizedTrack;
    result.applicant_type = normalizedTrack;
  }

  // 0.2 Muayena Agency Handling (only Muayena workers carry muayena_agency)
  if (result.entry_track === "Muayena" || result.applicant_type === "Muayena") {
    if (result.muayena_agency) {
      result.muayena_agency = String(result.muayena_agency).trim();
    }
  } else {
    delete result.muayena_agency;
  }

  // 1. Target Job / Position / Occupation
  const job = result.target_job || result.job_applied || result.occupation;
  if (job) {
    const jobNormalized =
      String(job).toUpperCase() === "HOUSE MAID" || job === "House maid" || job === "House Maid"
        ? "HOUSE WORKER"
        : job;
    result.target_job = jobNormalized;
    result.job_applied = jobNormalized;
    result.occupation = jobNormalized;
  } else if (result.entry_track !== "Muayena" && result.applicant_type !== "Muayena") {
    result.target_job = "HOUSE WORKER";
    result.job_applied = "HOUSE WORKER";
    result.occupation = "HOUSE WORKER";
  }

  // 2. Education / Qualification
  const edu = result.qualification || result.education || result.highest_education;
  if (edu) {
    const canonicalEdu = mapEducationLevelToBackend(edu);
    result.qualification = canonicalEdu;
    result.highest_education = canonicalEdu;
    result.education = canonicalEdu;
  } else if (result.entry_track !== "Muayena" && result.applicant_type !== "Muayena") {
    result.education = "High School";
    result.highest_education = "High School";
    result.qualification = "High School";
  }

  // 2.1 Religion (frontend default: Islam; Frappe Select compatibility: Muslim)
  if (result.video_key) {
    result.video_key = String(result.video_key).trim();
  }

  if (result.religion) {
    const rel = String(result.religion).trim();
    if (rel.toLowerCase() === "non-muslim") result.religion = "Non-Muslim";
    if (rel.toLowerCase() === "islam") {
      result.religion = "Muslim";
    }
  } else {
    result.religion = "Muslim";
  }

  if (!result.gender) result.gender = "Female";
  if (!result.marital_status) result.marital_status = "Single";
  if (!result.visa_type) result.visa_type = "Work";

  // 2.2 Language Levels (Frappe Select options: "", "None", "Basic", "Good", "Fluent")
  const normalizeLanguageLevel = (val: any): string => {
    if (val === undefined || val === null) return "";
    const str = String(val).trim();
    if (!str || str.toLowerCase() === "select..") return "";
    const lower = str.toLowerCase();
    if (lower === "none") return "None";
    if (lower === "basic") return "Basic";
    if (lower === "good") return "Good";
    if (lower === "fluent") return "Fluent";
    // Sanitize non-standard options like "Poor", "Fair", "Intermediate", "Medium", "Advanced"
    if (lower === "poor" || lower === "fair") return "Basic";
    if (lower === "intermediate" || lower === "medium") return "Good";
    if (lower === "advanced") return "Fluent";
    return "";
  };

  if (result.arabic_level !== undefined) {
    result.arabic_level = normalizeLanguageLevel(result.arabic_level);
  }
  if (result.english_level !== undefined) {
    result.english_level = normalizeLanguageLevel(result.english_level);
  }



  // 3. Salary Amount & Monthly Salary (Experienced = 1200 SAR, First Timer = 1000 SAR)
  // ONLY an applicant with experience_country filled with an actual country has default 1200 SAR.
  // If experience_country is not filled with a country, the default salary is 1000 SAR.
  const expCountry = String(result.experience_country || "").trim();
  const isExperiencedApplicant = isExperiencedCountry(expCountry);

  const rawSalary =
    result.salary_amount !== undefined && result.salary_amount !== null
      ? result.salary_amount
      : result.monthly_salary !== undefined && result.monthly_salary !== ""
      ? result.monthly_salary
      : result.salary;

  const standardSalary = isExperiencedApplicant ? 1200 : 1000;

  if (rawSalary !== undefined && rawSalary !== null && rawSalary !== "") {
    const num = Number(rawSalary);
    let validNum = !isNaN(num) && num > 0 ? num : standardSalary;
    // Auto-correct discrepancy: only experienced applicant defaults to 1200, first timers default to 1000
    if (isExperiencedApplicant && validNum === 1000) {
      validNum = 1200;
    } else if (!isExperiencedApplicant && validNum === 1200) {
      validNum = 1000;
    }
    result.salary_amount = validNum;
    result.salary = validNum;
    result.monthly_salary = String(validNum);
  } else if (result.entry_track !== "Muayena" && result.applicant_type !== "Muayena") {
    result.salary_amount = standardSalary;
    result.salary = standardSalary;
    result.monthly_salary = String(standardSalary);
  }

  // Clear fictitious experience years if applicant has no experience country
  if (!isExperiencedApplicant) {
    if (result.experience_country && !isExperiencedCountry(result.experience_country)) {
      result.experience_country = "";
    }
    result.experience_period = "";
    result.years_of_experience = undefined;
    result.has_experience = false;
    result.experience_type = "first_time";
  }

  // Clear or normalize optional graduation_year if invalid or 0
  if (result.graduation_year !== undefined) {
    const gyNum = Number(result.graduation_year);
    if (isNaN(gyNum) || gyNum < 1950) {
      delete result.graduation_year;
    } else {
      result.graduation_year = gyNum;
    }
  }

  // 4. Salary Currency
  if (!result.salary_currency || String(result.salary_currency).trim() === "") {
    const currencyMap: Record<string, string> = {
      "Saudi Arabia": "SAR",
      "Kuwait": "KWD",
      "United Arab Emirates": "AED",
      "Qatar": "QAR",
      "Oman": "USD",
      "Jordan": "USD",
    };
    const dest = result.destination_country || "";
    result.salary_currency = currencyMap[dest] || "SAR";
  }

  // 5. Photograph
  const photo =
    result.photograph ||
    result.photo_passport ||
    result.profile_photo_url ||
    result.photo_full_body ||
    result.photo;
  if (photo) {
    result.photograph = photo;
    result.photo_passport = photo;
  }

  // 5.1 Candidate Video / Interview Video (Synchronize all video aliases)
  const videoVal =
    result.video_url ||
    result.intro_video ||
    result.video ||
    result.video_interview ||
    result.candidate_video ||
    result.interview_video;
  if (videoVal) {
    result.video_url = videoVal;
    result.intro_video = videoVal;
    result.video = videoVal;
    result.video_interview = videoVal;
    result.candidate_video = videoVal;
    result.interview_video = videoVal;
  }

  // 6. Passport Expiry Date
  const expiry = result.passport_expiry_date || result.passport_expiry;
  if (expiry) {
    result.passport_expiry_date = expiry;
    result.passport_expiry = expiry;
  }

  // 7. Passport Issue Place
  const issuePlace = result.passport_issue_place || result.place_of_issue || "ADDIS ABABA";
  const upperIssue = String(issuePlace).toUpperCase();
  result.passport_issue_place = upperIssue;
  result.place_of_issue = upperIssue;

  // 7.1 Place of Birth (Prefers visual zone extraction, falls back to city)
  const pob = result.place_of_birth || result.birth_place;
  if (pob) {
    result.place_of_birth = String(pob).trim();
  }

  // 8. Phone
  const phoneVal = result.phone || result.phone_number;
  if (phoneVal) {
    result.phone = phoneVal;
    result.phone_number = phoneVal;
  }

  // 9. Labor ID & National ID
  const laborIdVal = result.labor_id || result.labour_id;
  if (laborIdVal) {
    const cleanLabor = String(laborIdVal).trim();
    result.labor_id = cleanLabor;
    result.labour_id = cleanLabor;
  }
  if (result.national_id !== undefined && result.national_id !== null) {
    result.national_id = String(result.national_id).trim();
  }

  // 9.1 COC Status & Exam Date
  const examDateVal = result.exam_date || result.certified_date;
  if (examDateVal) {
    const cleanDate = String(examDateVal).trim();
    result.exam_date = cleanDate;
    result.certified_date = cleanDate;
  }
  if (result.coc_status !== undefined && result.coc_status !== null) {
    result.coc_status = String(result.coc_status).trim();
  }

  // 10. Emergency Contact Person, Phone & Relationship Aliasing
  const contactName =
    result.contact_person_name ||
    result.emergency_contact_name ||
    result.contact_person ||
    result.next_of_kin_name;
  if (contactName) {
    result.contact_person_name = contactName;
    result.emergency_contact_name = contactName;
    result.contact_person = contactName;
  }

  const contactPhone =
    result.contact_person_phone ||
    result.emergency_contact_phone ||
    result.emergency_phone ||
    result.contact_phone ||
    result.next_of_kin_contact;
  if (contactPhone) {
    result.contact_person_phone = contactPhone;
    result.emergency_contact_phone = contactPhone;
  }

  const relationship =
    result.emergency_relationship ||
    result.contact_person_relation ||
    result.relationship ||
    result.emergency_contact_address ||
    result.next_of_kin_relationship;
  if (relationship) {
    result.emergency_relationship = relationship;
    result.contact_person_relation = relationship;
    result.relationship = relationship;
  }

  // 10.1 Second Contact Person (Broker / Delala)
  const secondContactName = result.second_contact_name || result.contact_person_2nd;
  if (secondContactName) {
    result.second_contact_name = String(secondContactName).trim();
    result.contact_person_2nd = String(secondContactName).trim();
  }
  const secondContactPhone = result.second_contact_phone || result.contact_phone_2nd;
  if (secondContactPhone) {
    result.second_contact_phone = String(secondContactPhone).trim();
    result.contact_phone_2nd = String(secondContactPhone).trim();
  }
  if (result.second_contact_address) {
    result.second_contact_address = String(result.second_contact_address).trim();
  }

  // 11. Complexion (Skin Color)
  if (result.complexion) {
    const compUpper = String(result.complexion).trim().toUpperCase();
    if (["FAIR", "MEDIUM", "DARK"].includes(compUpper)) {
      result.complexion = compUpper;
    }
  }

  // 11.1 Sanitize medical_status: backend only accepts "", "Pending", "FIT", "UNFIT"
  if (result.medical_status !== undefined && result.medical_status !== null) {
    const medUpper = String(result.medical_status).trim().toUpperCase();
    if (medUpper === "FIT") {
      result.medical_status = "FIT";
    } else if (medUpper === "UNFIT") {
      result.medical_status = "UNFIT";
    } else if (medUpper === "PENDING" || medUpper === "IN PROGRESS") {
      result.medical_status = "Pending";
    } else {
      // Map any unrecognized value like "NOT DONE", "NONE", or "" to ""
      result.medical_status = "";
    }
  }

  // 12. Optional date fields - strip empty string so backend date parser does not fail
  if (result.medical_expiry_date === "" || result.medical_expiry_date === null) {
    delete result.medical_expiry_date;
  }
  if (result.medical_issue_date === "" || result.medical_issue_date === null) {
    delete result.medical_issue_date;
  }
  if (result.exam_date === "" || result.exam_date === null) {
    delete result.exam_date;
  }
  if (result.certified_date === "" || result.certified_date === null) {
    delete result.certified_date;
  }

  return result as T;
}

/**
 * Permanently links an uploaded video file to an Applicant record in Frappe File registry.
 * Ensures persistence even when Applicant DocType lacks a dedicated video_url database column.
 */
export async function attachVideoToApplicantV2(
  applicantName: string,
  videoUrl: string
): Promise<void> {
  if (!applicantName || !videoUrl || !videoUrl.trim()) return;
  const cleanUrl = videoUrl.trim();
  const fileName = cleanUrl.split("/").pop()?.split("?")[0] || "candidate_video.mp4";

  try {
    // 1. Check if Frappe already has a File document for this URL
    let fileDocName: string | null = null;
    let isAlreadyLinked = false;

    try {
      const existingFiles = await requestV2<any[]>("/api/method/frappe.client.get_list", {
        method: "POST",
        body: {
          doctype: "File",
          filters: { file_url: cleanUrl },
          fields: ["name", "file_url", "attached_to_doctype", "attached_to_name"],
          limit_page_length: 5,
        },
      });

      if (Array.isArray(existingFiles) && existingFiles.length > 0) {
        fileDocName = existingFiles[0].name;
        isAlreadyLinked =
          existingFiles[0].attached_to_name === applicantName &&
          existingFiles[0].attached_to_doctype === "Applicant";
      }
    } catch {
      // get_list check fallback
    }

    if (fileDocName && !isAlreadyLinked) {
      await requestV2("/api/method/frappe.client.set_value", {
        method: "POST",
        body: {
          doctype: "File",
          name: fileDocName,
          fieldname: {
            attached_to_doctype: "Applicant",
            attached_to_name: applicantName,
            attached_to_field: "video_url",
          },
        },
      });
    } else if (!fileDocName) {
      // 2. Insert new File record attached to Applicant
      await requestV2("/api/method/frappe.client.insert", {
        method: "POST",
        body: {
          doc: {
            doctype: "File",
            file_name: fileName,
            file_url: cleanUrl,
            attached_to_doctype: "Applicant",
            attached_to_name: applicantName,
            attached_to_field: "video_url",
            is_private: 0,
          },
        },
      });
    }

    // 3. In addition, attempt setting video_url directly on Applicant doc via frappe.client.set_value (in case custom field exists)
    try {
      await requestV2("/api/method/frappe.client.set_value", {
        method: "POST",
        body: {
          doctype: "Applicant",
          name: applicantName,
          fieldname: "video_url",
          value: cleanUrl,
        },
      });
    } catch {
      // DocType might not have video_url column in MariaDB tabApplicant; ignored safely
    }
  } catch (err) {
    console.warn("[attachVideoToApplicantV2] Note linking file attachment:", err);
  }
}

/**
 * Opens a new Applicant file at Draft status.
 */
export async function createApplicantV2(
  payload: V2CreateApplicantPayload
): Promise<{ name?: string; message?: string; [key: string]: any }> {
  const cleanPayload = normalizeApplicantFields(payload);
  if (cleanPayload.coc_status !== undefined) {
    cleanPayload.coc_status = toBackendCocStatus(cleanPayload.coc_status);
  }
  const res = await requestV2<{ name?: string; message?: string; [key: string]: any }>(
    "/api/method/agency_tracking.applicant_api.create_applicant",
    {
      method: "POST",
      body: cleanPayload,
    }
  );

  const createdName = res?.name || (res as any)?.message?.name;
  const videoUrl = cleanPayload.video_url || cleanPayload.intro_video || cleanPayload.video;
  if (createdName && videoUrl) {
    await attachVideoToApplicantV2(createdName, videoUrl);
  }

  return res;
}

/**
 * Fetches a single Applicant's full document as a dictionary.
 */
export async function getApplicantV2(
  applicantName: string
): Promise<V2ApplicantDetails> {
  const result = await requestV2<V2ApplicantDetails>(
    "/api/method/agency_tracking.applicant_api.get_applicant",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );

  // Normalization aliases
  if (result) {
    const normalized = normalizeApplicantFields(result);
    Object.assign(result, normalized);
    if (result.coc_status !== undefined) {
      result.coc_status = toClientCocStatus(result.coc_status);
    }
    if (result.status && !result.applicant_state) {
      result.applicant_state = result.status;
    }

    // Video interview persistence:
    // If video_url is not returned on the Applicant document directly, query attachments for this Applicant from Frappe
    if (!result.video_url && !result.intro_video && !result.video) {
      try {
        let videoFound = "";

        // 1. Query frappe.client.get_list for File attached to Applicant
        try {
          const files = await requestV2<any[]>("/api/method/frappe.client.get_list", {
            method: "POST",
            body: {
              doctype: "File",
              filters: {
                attached_to_doctype: "Applicant",
                attached_to_name: applicantName,
              },
              fields: ["name", "file_name", "file_url", "attached_to_field"],
              order_by: "creation desc",
              limit_page_length: 20,
            },
          });

          if (Array.isArray(files) && files.length > 0) {
            const vFile = files.find((f) => {
              const u = String(f.file_url || "").toLowerCase();
              const n = String(f.file_name || "").toLowerCase();
              const fld = String(f.attached_to_field || "").toLowerCase();
              return (
                fld.includes("video") ||
                /\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i.test(u) ||
                /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(n) ||
                n.includes("video") ||
                n.includes("interview") ||
                u.includes("video") ||
                u.includes("interview")
              );
            });
            if (vFile?.file_url) {
              videoFound = vFile.file_url;
            }
          }
        } catch {
          // frappe.client.get_list fallback
        }


        if (videoFound) {
          result.video_url = videoFound;
          result.intro_video = videoFound;
          result.video = videoFound;
        }
      } catch (err) {
        console.warn("[getApplicantV2] could not resolve candidate video attachments:", err);
      }
    }
  }

  return result;
}

/**
 * Lists Applicants the caller's role can read.
 * Authoritative V2 replacement for raw /api/resource/Applicant fallback.
 */
export async function listApplicantsV2(
  filters?: Record<string, any> | any[] | string,
  limitPageLength?: number,
  orderBy?: string,
  limitStart?: number,
  withTotal?: 0
): Promise<V2ApplicantDetails[]>;
export async function listApplicantsV2(
  filters: Record<string, any> | any[] | string | undefined,
  limitPageLength: number | undefined,
  orderBy: string | undefined,
  limitStart: number | undefined,
  withTotal: 1
): Promise<{ data: V2ApplicantDetails[]; total_count: number }>;
export async function listApplicantsV2(
  filters?: Record<string, any> | any[] | string,
  limitPageLength: number = 100,
  orderBy: string = "creation desc",
  limitStart: number = 0,
  withTotal: number = 0
): Promise<V2ApplicantDetails[] | { data: V2ApplicantDetails[]; total_count: number }> {
  // Guard against TanStack Query passing QueryFunctionContext ({ queryKey, signal }) as filters
  let cleanFilters = filters;
  if (
    cleanFilters &&
    typeof cleanFilters === "object" &&
    ("queryKey" in cleanFilters || "signal" in cleanFilters)
  ) {
    cleanFilters = undefined;
  }

  const filtersParam = typeof cleanFilters === "object" ? JSON.stringify(cleanFilters) : cleanFilters;
  const result = await requestV2<any>(
    "/api/method/agency_tracking.applicant_api.list_applicants",
    {
      method: "POST",
      body: {
        ...(filtersParam ? { filters: filtersParam } : {}),
        limit_page_length: limitPageLength,
        limit_start: limitStart,
        ...(withTotal ? { with_total: withTotal } : {}),
        order_by: orderBy,
      },
    }
  );

  const rawList = Array.isArray(result)
    ? result
    : result && Array.isArray(result.applicants)
    ? result.applicants
    : result && Array.isArray(result.data)
    ? result.data
    : result && Array.isArray(result.items)
    ? result.items
    : result && Array.isArray(result.message)
    ? result.message
    : [];

  const mapped = rawList.map((item: V2ApplicantDetails) => {
    const normalized = normalizeApplicantFields(item);
    Object.assign(item, normalized);
    if (item.coc_status !== undefined) {
      item.coc_status = toClientCocStatus(item.coc_status);
    }
    if (item.status && !item.applicant_state) {
      item.applicant_state = item.status;
    }
    if (!item.full_name && (item.first_name || item.last_name)) {
      item.full_name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
    }
    return item;
  });

  if (withTotal) {
    return {
      data: mapped,
      total_count: Number(result?.total_count ?? mapped.length),
    };
  }

  return mapped;
}

/**
 * Promotes an Applicant from Draft -> Registered.
 * Field-floor and medical checks run inside Applicant.validate() on backend.
 * Accepts optional Manager override for country bans.
 */
export async function registerApplicantV2(
  applicantName: string,
  overrideBan?: number,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.register_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...(overrideBan ? { override_ban: overrideBan } : {}),
        ...(overrideReason ? { override_reason: overrideReason } : {}),
      },
    }
  );
}

/**
 * Edits an Applicant at Draft or Registered.
 * destination_country changes are validated against Applicant Country Ban.
 */
export async function updateApplicantV2(
  applicantName: string,
  extraFields?: Record<string, any>,
  overrideBan?: boolean,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  const cleanFields = extraFields ? normalizeApplicantFields(extraFields) : {};
  if (cleanFields.coc_status !== undefined) {
    cleanFields.coc_status = toBackendCocStatus(cleanFields.coc_status);
  }
  const res = await requestV2<{ message?: string; [key: string]: any }>(
    "/api/method/agency_tracking.applicant_api.update_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        ...cleanFields,
        ...(overrideBan ? { override_ban: true, override_reason: overrideReason } : {}),
      },
    }
  );

  const videoUrl = cleanFields.video_url || cleanFields.intro_video || cleanFields.video;
  if (applicantName && videoUrl) {
    await attachVideoToApplicantV2(applicantName, videoUrl);
  }

  return res;
}

/**
 * CV Preparation sheet allowlisted field updates.
 * Backend: applicant_api.update_applicant_for_cv(applicant_name, ...)
 * Roles: CV, Manager, Admin.
 * Allowlist: phone, labor_id, religion, region, marital_status, children, years_of_experience, english_level, remarks
 * Applicant must be Registered or CV Generated.
 */
export async function updateApplicantForCvV2(
  applicantName: string,
  fields: {
    phone?: string;
    labor_id?: string;
    religion?: string;
    region?: string;
    marital_status?: string;
    children?: number;
    years_of_experience?: number;
    english_level?: string;
    remarks?: string;
    [key: string]: any;
  }
): Promise<{ message?: string; [key: string]: any }> {
  const allowlist = [
    "phone",
    "labor_id",
    "religion",
    "region",
    "marital_status",
    "children",
    "years_of_experience",
    "english_level",
    "remarks",
  ];
  const body: Record<string, any> = {
    applicant_name: applicantName,
  };
  for (const key of allowlist) {
    if (fields[key] !== undefined) {
      body[key] = fields[key];
    }
  }
  return requestV2(
    "/api/method/agency_tracking.applicant_api.update_applicant_for_cv",
    {
      method: "POST",
      body,
    }
  );
}

/**
 * LMIS-stage allowlisted field updates (national_id, labor_id, emergency contact, COC).
 * Narrow allowlisted edit surface for candidate at LMIS clearance step.
 */
export async function updateApplicantForLmisV2(
  payload: V2LmisUpdatePayload
): Promise<{ message?: string; [key: string]: any }> {
  // Frappe DocType validation strictly allows: "", "Pending", "Issued", "Not Started"
  let sanitizedCocStatus: string | undefined = undefined;
  if (payload.coc_status !== undefined) {
    sanitizedCocStatus = toBackendCocStatus(payload.coc_status);
  }

  // Ensure applicant ID (APP-XXXXX) is never saved into labor_id
  let sanitizedLaborId = payload.labor_id;
  if (sanitizedLaborId && sanitizedLaborId.toUpperCase().startsWith("APP-")) {
    sanitizedLaborId = undefined;
  }

  const cleanPayload = {
    ...payload,
    ...(payload.coc_status !== undefined ? { coc_status: sanitizedCocStatus } : {}),
    ...(payload.labor_id !== undefined ? { labor_id: sanitizedLaborId } : {}),
  };

  // Enforce LMIS restriction: LMIS cannot edit national ID or emergency contact details
  delete (cleanPayload as any).national_id;
  delete (cleanPayload as any).emergency_contact;
  delete (cleanPayload as any).emergency_contact_name;
  delete (cleanPayload as any).emergency_contact_phone;
  delete (cleanPayload as any).emergency_phone;

  return requestV2(
    "/api/method/agency_tracking.applicant_api.update_applicant_for_lmis",
    {
      method: "POST",
      body: cleanPayload,
    }
  );
}

/**
 * Cancels an Applicant (global escape hatch from Registered/CV Generated).
 * Freezes active placement and linked clearance steps to Cancelled.
 */
export async function cancelApplicantV2(
  applicantName: string,
  reason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.cancel_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        reason,
      },
    }
  );
}

/**
 * Restarts a Cancelled Applicant back to Draft or Registered.
 * Automatically increments cycle_number.
 */
export async function restartApplicantV2(
  applicantName: string,
  targetStatus: "Draft" | "Registered",
  overrideBan?: number,
  overrideReason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.restart_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        target_status: targetStatus,
        ...(overrideBan ? { override_ban: overrideBan } : {}),
        ...(overrideReason ? { override_reason: overrideReason } : {}),
      },
    }
  );
}

/**
 * Sets a permanent per-(Applicant, Country) ban ("Ashara Teyezuwal").
 */
export async function setCountryBanV2(
  applicantName: string,
  country: string,
  reason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.set_country_ban",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        country,
        reason,
      },
    }
  );
}

/**
 * Lists country bans, optionally scoped to one Applicant.
 * Defaults to active_only=1; pass active_only=0 for full audit history.
 */
export async function listCountryBansV2(
  applicantName?: string,
  activeOnly: number = 1
): Promise<V2CountryBanRecord[]> {
  const result = await requestV2<V2CountryBanRecord[] | { bans?: V2CountryBanRecord[] }>(
    "/api/method/agency_tracking.applicant_api.list_country_bans",
    {
      method: "POST",
      body: {
        ...(applicantName ? { applicant_name: applicantName } : {}),
        active_only: activeOnly,
      },
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).bans)) return (result as any).bans;
  return [];
}

/**
 * Lifts a country ban (Manager / Admin only).
 * Backend returns {"lifted": ban_name, "status": "success" | "already_lifted" | "not_found"}.
 */
export async function removeCountryBanV2(
  banName: string,
  liftReason?: string
): Promise<{ lifted?: string; status?: string; message?: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.remove_country_ban",
    {
      method: "POST",
      body: {
        ban_name: banName,
        ...(liftReason ? { lift_reason: liftReason } : {}),
      },
    }
  );
}

export interface V2CountryBanRequestItem {
  name: string;
  applicant: string;
  applicant_name?: string;
  full_name?: string;
  request_type: "Override" | "Lift";
  reason: string;
  action?: "Register" | "Generate CV" | "Restart" | "Change Destination";
  country?: string;
  status: "Pending" | "Approved" | "Rejected" | "Used";
  requested_by?: string;
  decided_by?: string;
  decided_on?: string;
  note?: string;
  creation?: string;
  [key: string]: any;
}

/**
 * Submits an exception request for a country ban (Registrars or non-managers).
 */
export async function requestCountryBanExceptionV2(
  applicantName: string,
  requestType: "Override" | "Lift",
  reason: string,
  action?: "Register" | "Generate CV" | "Restart" | "Change Destination",
  country?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.request_country_ban_exception",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        request_type: requestType,
        reason,
        ...(action ? { action } : {}),
        ...(country ? { country } : {}),
      },
    }
  );
}

/**
 * Lists country ban exception requests (Managers see all, others see their own).
 */
export async function listCountryBanRequestsV2(
  status?: string,
  applicantName?: string
): Promise<V2CountryBanRequestItem[]> {
  const body: Record<string, any> = {};
  if (status) body.status = status;
  if (applicantName) body.applicant_name = applicantName;

  const result = await requestV2<any>(
    "/api/method/agency_tracking.applicant_api.list_country_ban_requests",
    {
      method: "POST",
      body,
    }
  );

  const payload = result?.message ?? result;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.requests)) return payload.requests;
  return [];
}

/**
 * Decides a country ban exception request (Approve / Reject) with optional note (Manager / Admin).
 */
export async function decideCountryBanRequestV2(
  requestName: string,
  decision: "Approve" | "Reject",
  note?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.decide_country_ban_request",
    {
      method: "POST",
      body: {
        request_name: requestName,
        decision,
        ...(note ? { note } : {}),
      },
    }
  );
}

/**
 * Undoes a lifted country ban, making the ban active again.
 * Authoritative Backend Endpoint: applicant_api.undo_country_ban_lift (New 2026-10-12)
 * Roles: Manager, Admin
 */
export async function undoCountryBanLiftV2(
  banName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.undo_country_ban_lift",
    {
      method: "POST",
      body: {
        ban_name: banName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Undoes a country ban request decision (Approved / Rejected).
 * Authoritative Backend Endpoint: applicant_api.undo_country_ban_decision (New 2026-10-12)
 * Roles: Manager, Admin
 */
export async function undoCountryBanDecisionV2(
  requestName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.undo_country_ban_decision",
    {
      method: "POST",
      body: {
        request_name: requestName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}


export interface UniquenessCheckResult {
  isConflict: boolean;
  conflictingApplicant?: {
    name: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    passport_number?: string;
    national_id?: string;
    labor_id?: string;
  };
  message?: string;
}

// In-memory cache for live uniqueness checks (prevents redundant API calls)
const uniquenessCheckCache = new Map<string, { result: UniquenessCheckResult; timestamp: number }>();
const UNIQUENESS_CACHE_TTL_MS = 60000; // 60 seconds

/**
 * Checks in real-time whether a unique identifier (National ID / Fayda, Passport, or Labour ID)
 * is already registered to another applicant on the backend.
 */
export async function checkApplicantUniquenessV2(
  field: "passport_number" | "national_id" | "labour_id" | "labor_id",
  value: string,
  excludeApplicantName?: string
): Promise<UniquenessCheckResult> {
  const cleanVal = (value || "").trim();
  // Don't query backend for empty or partial short inputs (less than 4 characters)
  if (!cleanVal || cleanVal.length < 4) {
    return { isConflict: false };
  }

  const filterKey = field === "labour_id" ? "labor_id" : field;
  const cacheKey = `${filterKey}:${cleanVal.toLowerCase()}:${(excludeApplicantName || "").toLowerCase()}`;

  const cached = uniquenessCheckCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < UNIQUENESS_CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const matches = await listApplicantsV2(
      { [filterKey]: cleanVal },
      10
    );
    const rows = Array.isArray(matches) ? matches : (matches as any)?.data || [];
    const clash = rows.find((a: V2ApplicantDetails) => {
      const fieldVal = String((a as any)[filterKey] || (a as any)[field] || "").trim();
      if (!fieldVal || fieldVal.toLowerCase() !== cleanVal.toLowerCase()) return false;
      if (
        excludeApplicantName &&
        a.name?.toLowerCase().trim() === excludeApplicantName.toLowerCase().trim()
      ) {
        return false;
      }
      return true;
    });

    if (clash) {
      const ownerName =
        clash.full_name ||
        [clash.first_name, clash.last_name].filter(Boolean).join(" ") ||
        clash.name;
      const label =
        field === "passport_number"
          ? "Passport number"
          : field === "national_id"
          ? "National ID (Fayda)"
          : "Ministry Labour ID";

      const conflictResult: UniquenessCheckResult = {
        isConflict: true,
        conflictingApplicant: clash,
        message: `This ${label} is already used by ${ownerName} (${clash.name}). Please check the number or view their record.`,
      };
      uniquenessCheckCache.set(cacheKey, { result: conflictResult, timestamp: Date.now() });
      return conflictResult;
    }
  } catch (err) {
    console.warn("[V2 Applicant API] checkApplicantUniquenessV2 error:", err);
  }

  const freeResult: UniquenessCheckResult = { isConflict: false };
  uniquenessCheckCache.set(cacheKey, { result: freeResult, timestamp: Date.now() });
  return freeResult;
}

/**
 * October 21 direct video upload protocol:
 * 1. startVideoUploadV2(applicantName, filename, sizeBytes) -> { upload_url, headers, key }
 * 2. PUT file binary directly to upload_url with headers
 * 3. finishVideoUploadV2(applicantName, key)
 * 4. getApplicantMediaUrlV2(applicantName, kind) -> temporary signed 2-hr expiring URL
 */
export async function startVideoUploadV2(
  applicantName?: string | null,
  filename?: string,
  sizeBytes?: number
): Promise<{ upload_url: string; headers?: Record<string, string>; key: string; [key: string]: any }> {
  const body: Record<string, any> = {
    filename,
    size: sizeBytes,
  };
  if (applicantName) {
    body.applicant_name = applicantName;
  }
  const res = await requestV2<any>(
    "/api/method/agency_tracking.applicant_api.start_video_upload",
    {
      method: "POST",
      body,
    }
  );
  return res?.message || res;
}

export async function finishVideoUploadV2(
  applicantName?: string | null,
  key?: string
): Promise<any> {
  const body: Record<string, any> = {};
  if (key) {
    body.key = key;
  }
  if (applicantName) {
    body.applicant_name = applicantName;
  }
  const res = await requestV2<any>(
    "/api/method/agency_tracking.applicant_api.finish_video_upload",
    {
      method: "POST",
      body,
    }
  );
  return res?.message || res;
}

export async function getApplicantMediaUrlV2(
  applicantName: string,
  kind: string = "experience_video"
): Promise<{ url: string; expires_in?: number; [key: string]: any }> {
  try {
    const res = await requestV2<any>(
      "/api/method/agency_tracking.applicant_api.get_applicant_media_url",
      {
        method: "POST",
        body: {
          applicant_name: applicantName,
          kind,
        },
      }
    );
    const payload = res?.message || res;
    if (payload?.url) {
      return payload;
    }
  } catch (err: any) {
    console.warn("[getApplicantMediaUrlV2] Backend media URL call failed, falling back to static property:", err?.message || err);
  }

  try {
    const applicant = await getApplicantV2(applicantName);
    const mediaUrl =
      applicant?.experience_video ||
      applicant?.video_url ||
      (applicant as any)?.intro_video ||
      (applicant as any)?.video ||
      "";
    return { url: mediaUrl };
  } catch {
    return { url: "" };
  }
}

export async function uploadVideoFileDirectly(
  uploadUrl: string,
  headers: Record<string, string> = {},
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);

    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Direct storage upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during direct video storage upload."));
    };

    xhr.send(file);
  });
}

