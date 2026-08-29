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
  destinationCountry?: string;
  applicantState?: string;
  applicantType?: string;
  jobApplied?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number | string;
  religion?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  phone?: string;
  city?: string;
  country?: string;
  medicalStatus?: string;
  photoUrl?: string;
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
export function isExtensionInstalled(timeoutMs: number = 300): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    let resolved = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === EVENT_EXTENSION_READY) {
        resolved = true;
        window.removeEventListener("message", handleMessage);
        resolve(true);
      }
    };

    window.addEventListener("message", handleMessage);
    window.postMessage({ type: EVENT_CHECK_INSTALLED }, "*");

    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener("message", handleMessage);
        resolve(false);
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
  if (typeof window === "undefined") {
    return Promise.resolve({ success: false, error: "Window is not available (SSR context)." });
  }

  const payload: ExtensionApplicantPayload = {
    applicantId: (applicant as any).name || (applicant as any).applicantId,
    fullName:
      (applicant as any).full_name ||
      (applicant as any).fullName ||
      `${(applicant as any).first_name || ""} ${(applicant as any).middle_name || ""} ${(applicant as any).last_name || ""}`.trim() ||
      (applicant as any).name ||
      "Unknown Candidate",
    firstName: (applicant as any).first_name,
    middleName: (applicant as any).middle_name,
    lastName: (applicant as any).last_name,
    passportNumber: (applicant as any).passport_number || (applicant as any).passportNumber,
    passportExpiry: (applicant as any).passport_expiry || (applicant as any).passportExpiry,
    passportIssueDate: (applicant as any).passport_issue_date || (applicant as any).passportIssueDate,
    destinationCountry: (applicant as any).destination_country || (applicant as any).destinationCountry,
    applicantState: (applicant as any).applicant_state || (applicant as any).applicantState,
    applicantType: (applicant as any).applicant_type || (applicant as any).applicantType,
    jobApplied: (applicant as any).job_applied || (applicant as any).jobApplied,
    gender: (applicant as any).gender,
    dateOfBirth: (applicant as any).date_of_birth || (applicant as any).dateOfBirth,
    age: (applicant as any).age,
    religion: (applicant as any).religion,
    placeOfBirth: (applicant as any).place_of_birth || (applicant as any).leaving_town || (applicant as any).placeOfBirth,
    maritalStatus: (applicant as any).marital_status || (applicant as any).maritalStatus,
    phone: (applicant as any).phone_number || (applicant as any).phone,
    city: (applicant as any).city,
    country: (applicant as any).country,
    medicalStatus: (applicant as any).medical_status || (applicant as any).medicalStatus,
    photoUrl: (applicant as any).photo_passport || (applicant as any).profile_photo_url || (applicant as any).photoUrl,
    selectedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    let resolved = false;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === EVENT_APPLICANT_SAVED &&
        event.data?.applicantId === payload.applicantId
      ) {
        resolved = true;
        window.removeEventListener("message", handleMessage);
        resolve({
          success: Boolean(event.data.success),
          error: event.data.error,
        });
      }
    };

    window.addEventListener("message", handleMessage);

    // Send payload to content script bridge
    window.postMessage(
      {
        type: EVENT_SELECT_APPLICANT,
        applicant: payload,
      },
      "*"
    );

    // Fallback timeout in case extension is not installed
    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener("message", handleMessage);
        resolve({
          success: false,
          error: "Extension not detected. Please make sure Travel Agency Assistant is installed and active.",
        });
      }
    }, 1500);
  });
}

/**
 * Clears the active applicant from the extension.
 */
export function clearExtensionApplicant(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    window.postMessage({ type: EVENT_CLEAR_APPLICANT }, "*");
    setTimeout(() => resolve(true), 150);
  });
}
