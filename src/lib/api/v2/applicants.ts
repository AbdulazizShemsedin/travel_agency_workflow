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
  [key: string]: any;
}

export interface V2ApplicantDetails {
  name: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender: string;
  nationality: string;
  entry_track?: "Standard" | "Muayena";
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
  country: string;
  reason?: string;
  set_by?: string;
  set_on?: string;
  creation?: string;
  [key: string]: any;
}

/**
 * Normalizes applicant fields between frontend aliases and Frappe DocType fields.
 * Ensures target_job, education, salary_amount, salary_currency, photograph, etc.
 * are always populated for Frappe's field-floor checks.
 */
export function normalizeApplicantFields<T extends Record<string, any>>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const result: Record<string, any> = { ...payload };

  // 1. Target Job / Position
  const job = result.target_job || result.job_applied;
  if (job) {
    result.target_job = job;
    result.job_applied = job;
  } else if (result.entry_track !== "Muayena" && result.applicant_type !== "Muayena") {
    result.target_job = "House worker";
    result.job_applied = "House worker";
  }

  // 2. Education
  const edu = result.education || result.highest_education;
  if (edu) {
    result.education = edu;
    result.highest_education = edu;
  } else if (result.entry_track !== "Muayena" && result.applicant_type !== "Muayena") {
    result.education = "High School";
    result.highest_education = "High School";
  }

  // 3. Salary Amount & Monthly Salary (Experienced = 1200 SAR, First Timer = 1000 SAR)
  const expCountry = String(result.experience_country || "").trim().toLowerCase();
  const isExperiencedApplicant = Boolean(
    (expCountry &&
      expCountry !== "none" &&
      expCountry !== "first time" &&
      expCountry !== "first time applicant" &&
      expCountry !== "overseas") ||
    result.has_experience === true ||
    result.experience_type === "experienced" ||
    Number(result.years_of_experience) > 0
  );

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
    // Auto-correct discrepancy where experienced candidate defaulted to 1000
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

  // 6. Passport Expiry Date
  const expiry = result.passport_expiry_date || result.passport_expiry;
  if (expiry) {
    result.passport_expiry_date = expiry;
    result.passport_expiry = expiry;
  }

  // 7. Passport Issue Place
  const issuePlace = result.passport_issue_place || result.place_of_issue;
  if (issuePlace) {
    result.passport_issue_place = issuePlace;
    result.place_of_issue = issuePlace;
  }

  // 8. Phone
  const phoneVal = result.phone || result.phone_number;
  if (phoneVal) {
    result.phone = phoneVal;
    result.phone_number = phoneVal;
  }

  // 9. Labor ID
  const laborIdVal = result.labor_id || result.labour_id;
  if (laborIdVal) {
    result.labor_id = laborIdVal;
    result.labour_id = laborIdVal;
  }

  return result as T;
}

/**
 * Opens a new Applicant file at Draft status.
 */
export async function createApplicantV2(
  payload: V2CreateApplicantPayload
): Promise<{ name?: string; message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.create_applicant",
    {
      method: "POST",
      body: normalizeApplicantFields(payload),
    }
  );
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
    if (result.status && !result.applicant_state) {
      result.applicant_state = result.status;
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
  limitPageLength: number = 100,
  orderBy: string = "modified desc"
): Promise<V2ApplicantDetails[]> {
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
  const result = await requestV2<V2ApplicantDetails[] | { applicants?: V2ApplicantDetails[] }>(
    "/api/method/agency_tracking.applicant_api.list_applicants",
    {
      method: "POST",
      body: {
        ...(filtersParam ? { filters: filtersParam } : {}),
        limit_page_length: limitPageLength,
        order_by: orderBy,
      },
    }
  );

  const rawList = Array.isArray(result)
    ? result
    : result && Array.isArray((result as any).applicants)
    ? (result as any).applicants
    : result && Array.isArray((result as any).data)
    ? (result as any).data
    : result && Array.isArray((result as any).items)
    ? (result as any).items
    : result && Array.isArray((result as any).message)
    ? (result as any).message
    : [];

  return rawList.map((item: V2ApplicantDetails) => {
    const normalized = normalizeApplicantFields(item);
    Object.assign(item, normalized);
    if (item.status && !item.applicant_state) {
      item.applicant_state = item.status;
    }
    if (!item.full_name && (item.first_name || item.last_name)) {
      item.full_name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
    }
    return item;
  });
}

/**
 * Promotes an Applicant from Draft -> Registered.
 * Field-floor and medical checks run inside Applicant.validate() on backend.
 */
export async function registerApplicantV2(
  applicantName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.register_applicant",
    {
      method: "POST",
      body: { applicant_name: applicantName },
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
  return requestV2(
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
}

/**
 * LMIS-stage allowlisted field updates (national_id, labor_id, emergency contact, COC).
 * Narrow allowlisted edit surface for candidate at LMIS clearance step.
 */
export async function updateApplicantForLmisV2(
  payload: V2LmisUpdatePayload
): Promise<{ message?: string; [key: string]: any }> {
  // Frappe DocType validation strictly allows: "", "Pending", "Issued", "Not Started"
  let sanitizedCocStatus = payload.coc_status;
  if (sanitizedCocStatus === "Passed") {
    sanitizedCocStatus = "Issued";
  } else if (sanitizedCocStatus && !["Pending", "Issued", "Not Started"].includes(sanitizedCocStatus)) {
    sanitizedCocStatus = "Not Started";
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
  targetStatus: "Draft" | "Registered"
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.restart_applicant",
    {
      method: "POST",
      body: {
        applicant_name: applicantName,
        target_status: targetStatus,
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
 */
export async function listCountryBansV2(
  applicantName?: string
): Promise<V2CountryBanRecord[]> {
  const result = await requestV2<V2CountryBanRecord[] | { bans?: V2CountryBanRecord[] }>(
    "/api/method/agency_tracking.applicant_api.list_country_bans",
    {
      method: "POST",
      body: applicantName ? { applicant_name: applicantName } : {},
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).bans)) return (result as any).bans;
  return [];
}

/**
 * Lifts a country ban (Manager / Admin only).
 */
export async function removeCountryBanV2(
  banName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.applicant_api.remove_country_ban",
    {
      method: "POST",
      body: { ban_name: banName },
    }
  );
}

/**
 * Manually logs the candidate Registration Fee to the Finance ledger.
 */
export async function logApplicantFeeV2(
  applicantName: string
): Promise<{ message?: string; [key: string]: any }> {
  try {
    return await requestV2(
      "/api/method/agency_tracking.applicant_api.log_applicant_fee",
      {
        method: "POST",
        body: { applicant_name: applicantName },
      }
    );
  } catch (err: any) {
    if (String(err?.message || "").includes("already logged")) {
      return { message: err.message, status: "Already Logged" };
    }
    throw err;
  }
}
