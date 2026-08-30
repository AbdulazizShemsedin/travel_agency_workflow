/**
 * Travel Agency Assistant - Strongly Typed Data Contracts
 * Phase 1: Core Foundation & Storage Contracts
 */

export interface SelectedApplicant {
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
  gender?: "Female" | "Male" | string;
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
  selectedAt: string; // ISO 8601 timestamp
}

export type ExtensionMessageType =
  | "SELECT_APPLICANT"
  | "GET_SELECTED_APPLICANT"
  | "CLEAR_SELECTED_APPLICANT"
  | "APPLICANT_UPDATED"
  | "PING";

export interface SelectApplicantMessage {
  type: "SELECT_APPLICANT";
  applicant: SelectedApplicant;
}

export interface GetSelectedApplicantMessage {
  type: "GET_SELECTED_APPLICANT";
}

export interface ClearSelectedApplicantMessage {
  type: "CLEAR_SELECTED_APPLICANT";
}

export interface PingMessage {
  type: "PING";
}

export type ExtensionMessage =
  | SelectApplicantMessage
  | GetSelectedApplicantMessage
  | ClearSelectedApplicantMessage
  | PingMessage;

export interface ExtensionSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ExtensionErrorResponse {
  success: false;
  error: string;
}

export type ExtensionResponse<T = unknown> =
  | ExtensionSuccessResponse<T>
  | ExtensionErrorResponse;

// Web page -> Extension Content Script window.postMessage protocol
export const BRIDGE_EVENT_SELECT_APPLICANT = "TRAVEL_AGENCY_SELECT_APPLICANT" as const;
export const BRIDGE_EVENT_APPLICANT_SAVED = "TRAVEL_AGENCY_APPLICANT_SAVED" as const;
export const BRIDGE_EVENT_CLEAR_APPLICANT = "TRAVEL_AGENCY_CLEAR_APPLICANT" as const;
export const BRIDGE_EVENT_CHECK_INSTALLED = "TRAVEL_AGENCY_CHECK_EXTENSION_INSTALLED" as const;
export const BRIDGE_EVENT_EXTENSION_READY = "TRAVEL_AGENCY_EXTENSION_READY" as const;

export interface BridgeSelectApplicantEventData {
  type: typeof BRIDGE_EVENT_SELECT_APPLICANT;
  applicant: SelectedApplicant;
}

export interface BridgeApplicantSavedEventData {
  type: typeof BRIDGE_EVENT_APPLICANT_SAVED;
  success: boolean;
  applicantId: string;
  error?: string;
}

export interface BridgeClearApplicantEventData {
  type: typeof BRIDGE_EVENT_CLEAR_APPLICANT;
}

export interface BridgeCheckInstalledEventData {
  type: typeof BRIDGE_EVENT_CHECK_INSTALLED;
}

export interface BridgeExtensionReadyEventData {
  type: typeof BRIDGE_EVENT_EXTENSION_READY;
  version: string;
}

export type BridgeEventData =
  | BridgeSelectApplicantEventData
  | BridgeApplicantSavedEventData
  | BridgeClearApplicantEventData
  | BridgeCheckInstalledEventData
  | BridgeExtensionReadyEventData;
