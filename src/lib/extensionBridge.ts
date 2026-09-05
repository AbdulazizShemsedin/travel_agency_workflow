/**
 * Travel Agency Assistant - Browser Extension Bridge Client
 * Allows the Next.js web application to safely communicate with the extension.
 */

import { Applicant } from "@/types/applicant";

export interface ExtensionApplicantPayload {
  applicantId: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportIssueDate?: string;
  placeOfIssue?: string;
  nationalId?: string;
  labourId?: string;
  destinationCountry?: string;
  applicantState?: string;
  applicantType?: string;
  jobApplied?: string;
  visaType?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number | string;
  religion?: string;
  placeOfBirth?: string;
  leavingTown?: string;
  maritalStatus?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  city?: string;
  country?: string;
  addressLine1?: string;
  medicalStatus?: string;
  photoUrl?: string;
  monthlySalary?: number | string;
  salaryCurrency?: string;
  contractPeriod?: string;
  sponsorName?: string;
  sponsorId?: string;
  sponsorPhone?: string;
  visaNumber?: string;
  contractNumber?: string;
  contractorName?: string;
  motherName?: string;
  injazNumber?: string;
  mission?: string;
  educationLevel?: string;
  selectedAt?: string;
}

const EVENT_SELECT_APPLICANT = "TRAVEL_AGENCY_SELECT_APPLICANT";
const EVENT_APPLICANT_SAVED = "TRAVEL_AGENCY_APPLICANT_SAVED";
const EVENT_CLEAR_APPLICANT = "TRAVEL_AGENCY_CLEAR_APPLICANT";
const EVENT_CHECK_INSTALLED = "TRAVEL_AGENCY_CHECK_EXTENSION_INSTALLED";
const EVENT_EXTENSION_READY = "TRAVEL_AGENCY_EXTENSION_READY";

/**
 * Checks if the Travel Agency browser extension is installed and active in the user's browser.
 */
export function isExtensionInstalled(timeoutMs: number = 400): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  // Fast synchronous check via DOM marker attribute set by content script
  if (document.documentElement.getAttribute("data-travel-agency-extension-ready") === "true") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener(EVENT_EXTENSION_READY, handleCustomEvent);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === EVENT_EXTENSION_READY) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    };

    const handleCustomEvent = () => {
      resolved = true;
      cleanup();
      resolve(true);
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener(EVENT_EXTENSION_READY, handleCustomEvent);

    // Ping extension
    window.postMessage({ type: EVENT_CHECK_INSTALLED }, "*");
    document.dispatchEvent(new CustomEvent(EVENT_CHECK_INSTALLED));

    setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(document.documentElement.getAttribute("data-travel-agency-extension-ready") === "true");
      }
    }, timeoutMs);
  });
}

/**
 * Converts a Next.js Applicant record to the extension's contract format and sends it to the extension.
 */
export function sendApplicantToExtension(
  applicant: Applicant | ExtensionApplicantPayload
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve({ success: false, error: "Window is not available (SSR context)." });
  }

  const rawApp = applicant as any;
  const appId = rawApp.name || rawApp.applicantId || "APP-UNKNOWN";
  const firstName = rawApp.first_name || rawApp.firstName || "";
  const middleName = rawApp.middle_name || rawApp.middleName || "";
  const lastName = rawApp.last_name || rawApp.lastName || "";
  const fullName =
    rawApp.full_name ||
    rawApp.fullName ||
    `${firstName} ${middleName} ${lastName}`.trim() ||
    appId;

  const defaultEmail = `${(firstName || "candidate").toLowerCase().replace(/[^a-z0-9]/g, "")}.${appId.toLowerCase().replace(/[^a-z0-9]/g, "")}@agencyportal.com`;

  const payload: ExtensionApplicantPayload = {
    applicantId: appId,
    fullName,
    firstName,
    middleName,
    lastName,
    passportNumber: rawApp.passport_number || rawApp.passportNumber || "",
    passportExpiry: rawApp.passport_expiry || rawApp.passportExpiry || "",
    passportIssueDate: rawApp.passport_issue_date || rawApp.passportIssueDate || "",
    placeOfIssue: rawApp.place_of_issue || rawApp.placeOfIssue || rawApp.city || "Addis Ababa",
    nationalId: rawApp.national_id || rawApp.nationalId || rawApp.labour_id || rawApp.passport_number || "",
    labourId: rawApp.labour_id || rawApp.labourId || "",
    destinationCountry: rawApp.destination_country || rawApp.destinationCountry || "Saudi Arabia",
    applicantState: rawApp.applicant_state || rawApp.applicantState || "Active",
    applicantType: rawApp.applicant_type || rawApp.applicantType || "Standard",
    jobApplied: rawApp.job_applied || rawApp.jobApplied || "Housemaid",
    visaType: rawApp.visa_type || rawApp.visaType || "Work",
    gender: rawApp.gender || "Female",
    dateOfBirth: rawApp.date_of_birth || rawApp.dateOfBirth || "",
    age: (() => {
      const directAge = Number(rawApp.age);
      if (directAge > 0) return directAge;
      const dob = rawApp.date_of_birth || rawApp.dateOfBirth;
      if (dob) {
        const birth = new Date(dob);
        if (!isNaN(birth.getTime())) {
          const today = new Date();
          let diff = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) diff--;
          if (diff > 0) return diff;
        }
      }
      return 25;
    })(),
    religion: rawApp.religion || "",
    placeOfBirth: rawApp.place_of_birth || rawApp.leaving_town || rawApp.placeOfBirth || rawApp.city || "Addis Ababa",
    leavingTown: rawApp.leaving_town || rawApp.leavingTown || rawApp.city || "",
    maritalStatus: rawApp.marital_status || rawApp.maritalStatus || "Single",
    nationality: rawApp.nationality || rawApp.country || "Ethiopia",
    email: rawApp.email || rawApp.emailAddress || defaultEmail,
    phone: rawApp.phone_number || rawApp.phone || "+251911223344",
    alternatePhone: rawApp.alternate_phone || rawApp.alternatePhone || "",
    city: rawApp.city || "Addis Ababa",
    country: rawApp.country || "Ethiopia",
    addressLine1: rawApp.address_line_1 || rawApp.addressLine1 || rawApp.applicant_address || "",
    medicalStatus: rawApp.medical_status || rawApp.medicalStatus || "FIT",
    photoUrl: rawApp.photo_passport || rawApp.profile_photo_url || rawApp.photoUrl || "",
    monthlySalary: rawApp.monthly_salary || rawApp.monthlySalary || (rawApp.contractor_doc?.salary) || 1200,
    salaryCurrency: rawApp.salary_currency || rawApp.salaryCurrency || (rawApp.contractor_doc?.currency) || "SAR",
    contractPeriod: rawApp.contract_period || rawApp.contractPeriod || (rawApp.contractor_doc?.contract_period) || "2 Years",
    sponsorName: rawApp.contractor_doc?.sponsor_name || rawApp.sponsor_name || rawApp.sponsorName || (rawApp.injaz as any)?.sponsor_name || "",
    sponsorId: rawApp.contractor_doc?.sponsor_id || rawApp.sponsor_id || rawApp.sponsorId || (rawApp.injaz as any)?.sponsor_id || "",
    sponsorPhone: rawApp.contractor_doc?.sponsor_phone || rawApp.sponsor_phone || rawApp.sponsorPhone || (rawApp.injaz as any)?.sponsor_phone || "",
    visaNumber: rawApp.contractor_doc?.visa_number || rawApp.visa_number || rawApp.visaNumber || (rawApp.injaz as any)?.visa_number || "",
    contractNumber: rawApp.contractor_doc?.contract_number || rawApp.contract_number || rawApp.contractNumber || (rawApp.injaz as any)?.contract_number || "",
    contractorName: rawApp.contractor_doc?.contractor_name || rawApp.locked_contractor || rawApp.contractor || rawApp.contractorName || "",
    motherName: rawApp.mother_name || rawApp.motherName || "AYESHA MOHAMMED",
    injazNumber: (rawApp.injaz as any)?.reference_no || (rawApp.injaz as any)?.injaz_number || rawApp.injaz_number || rawApp.mofa_barcode || "",
    mission: rawApp.destination_city || rawApp.mission || "Addis Ababa",
    educationLevel: rawApp.education_level || rawApp.qualification || "Primary School",
    selectedAt: new Date().toISOString(),
  };

  // Always back up into localStorage for instant cross-tab access
  try {
    localStorage.setItem("travel_agency_selected_applicant", JSON.stringify(payload));
  } catch {}

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener(EVENT_APPLICANT_SAVED, handleCustomEvent);
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === EVENT_APPLICANT_SAVED &&
        (event.data?.applicantId === payload.applicantId || !event.data?.applicantId)
      ) {
        resolved = true;
        cleanup();
        resolve({
          success: Boolean(event.data.success),
          error: event.data.error,
        });
      }
    };

    const handleCustomEvent = (e: any) => {
      if (e.detail?.applicantId === payload.applicantId || !e.detail?.applicantId) {
        resolved = true;
        cleanup();
        resolve({
          success: Boolean(e.detail?.success ?? true),
          error: e.detail?.error,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener(EVENT_APPLICANT_SAVED, handleCustomEvent);

    // 1. PostMessage
    window.postMessage(
      {
        type: EVENT_SELECT_APPLICANT,
        applicant: payload,
      },
      "*"
    );

    // 2. CustomEvent
    document.dispatchEvent(
      new CustomEvent(EVENT_SELECT_APPLICANT, {
        detail: { applicant: payload },
      })
    );

    // Fallback timeout in case extension is not loaded in this browser session
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve({
          success: false,
          error: "Extension not detected. Please make sure Travel Agency Assistant is loaded in your browser via chrome://extensions (or edge://extensions) and this page is refreshed.",
        });
      }
    }, 1800);
  });
}

/**
 * Clears the active applicant from the extension.
 */
export function clearExtensionApplicant(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve(false);

  try {
    localStorage.removeItem("travel_agency_selected_applicant");
  } catch {}

  return new Promise((resolve) => {
    window.postMessage({ type: EVENT_CLEAR_APPLICANT }, "*");
    document.dispatchEvent(new CustomEvent(EVENT_CLEAR_APPLICANT));
    setTimeout(() => resolve(true), 150);
  });
}

