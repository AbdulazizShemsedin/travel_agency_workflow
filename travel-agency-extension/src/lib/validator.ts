import { SelectedApplicant } from "./types";

/**
 * Runtime Validator for SelectedApplicant data structures.
 * Ensures incoming postMessage and runtime payloads have valid schemas and cannot inject malicious data.
 */
export function validateSelectedApplicant(input: unknown): {
  valid: boolean;
  applicant?: SelectedApplicant;
  error?: string;
} {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid payload: applicant must be a non-null object." };
  }

  const obj = input as Record<string, unknown>;

  // Required Field 1: applicantId (string, non-empty)
  if (typeof obj.applicantId !== "string" || !obj.applicantId.trim()) {
    return { valid: false, error: "Missing or invalid required field 'applicantId'." };
  }

  // Required Field 2: fullName (string, non-empty)
  if (typeof obj.fullName !== "string" || !obj.fullName.trim()) {
    return { valid: false, error: "Missing or invalid required field 'fullName'." };
  }

  // Sanitize & build validated record
  const sanitized: SelectedApplicant = {
    applicantId: obj.applicantId.trim(),
    fullName: obj.fullName.trim(),
    firstName: typeof obj.firstName === "string" ? obj.firstName.trim() : undefined,
    middleName: typeof obj.middleName === "string" ? obj.middleName.trim() : undefined,
    lastName: typeof obj.lastName === "string" ? obj.lastName.trim() : undefined,
    passportNumber: typeof obj.passportNumber === "string" ? obj.passportNumber.trim() : undefined,
    passportExpiry: typeof obj.passportExpiry === "string" ? obj.passportExpiry.trim() : undefined,
    passportIssueDate: typeof obj.passportIssueDate === "string" ? obj.passportIssueDate.trim() : undefined,
    placeOfIssue: typeof obj.placeOfIssue === "string" ? obj.placeOfIssue.trim() : undefined,
    nationalId: typeof obj.nationalId === "string" ? obj.nationalId.trim() : undefined,
    labourId: typeof obj.labourId === "string" ? obj.labourId.trim() : undefined,
    destinationCountry: typeof obj.destinationCountry === "string" ? obj.destinationCountry.trim() : undefined,
    applicantState: typeof obj.applicantState === "string" ? obj.applicantState.trim() : undefined,
    applicantType: typeof obj.applicantType === "string" ? obj.applicantType.trim() : undefined,
    jobApplied: typeof obj.jobApplied === "string" ? obj.jobApplied.trim() : undefined,
    visaType: typeof obj.visaType === "string" ? obj.visaType.trim() : undefined,
    gender: typeof obj.gender === "string" ? (obj.gender.trim() as any) : undefined,
    dateOfBirth: typeof obj.dateOfBirth === "string" ? obj.dateOfBirth.trim() : undefined,
    age: typeof obj.age === "number" || typeof obj.age === "string" ? obj.age : undefined,
    religion: typeof obj.religion === "string" ? obj.religion.trim() : undefined,
    placeOfBirth: typeof obj.placeOfBirth === "string" ? obj.placeOfBirth.trim() : undefined,
    leavingTown: typeof obj.leavingTown === "string" ? obj.leavingTown.trim() : undefined,
    maritalStatus: typeof obj.maritalStatus === "string" ? obj.maritalStatus.trim() : undefined,
    nationality: typeof obj.nationality === "string" ? obj.nationality.trim() : undefined,
    email: typeof obj.email === "string" ? obj.email.trim() : undefined,
    phone: typeof obj.phone === "string" ? obj.phone.trim() : undefined,
    alternatePhone: typeof obj.alternatePhone === "string" ? obj.alternatePhone.trim() : undefined,
    city: typeof obj.city === "string" ? obj.city.trim() : undefined,
    country: typeof obj.country === "string" ? obj.country.trim() : undefined,
    addressLine1: typeof obj.addressLine1 === "string" ? obj.addressLine1.trim() : undefined,
    medicalStatus: typeof obj.medicalStatus === "string" ? obj.medicalStatus.trim() : undefined,
    photoUrl: typeof obj.photoUrl === "string" ? obj.photoUrl.trim() : undefined,
    monthlySalary: typeof obj.monthlySalary === "number" || typeof obj.monthlySalary === "string" ? obj.monthlySalary : undefined,
    salaryCurrency: typeof obj.salaryCurrency === "string" ? obj.salaryCurrency.trim() : undefined,
    contractPeriod: typeof obj.contractPeriod === "string" ? obj.contractPeriod.trim() : undefined,
    sponsorName: typeof obj.sponsorName === "string" ? obj.sponsorName.trim() : undefined,
    sponsorId: typeof obj.sponsorId === "string" ? obj.sponsorId.trim() : undefined,
    sponsorPhone: typeof obj.sponsorPhone === "string" ? obj.sponsorPhone.trim() : undefined,
    visaNumber: typeof obj.visaNumber === "string" ? obj.visaNumber.trim() : undefined,
    contractNumber: typeof obj.contractNumber === "string" ? obj.contractNumber.trim() : undefined,
    contractorName: typeof obj.contractorName === "string" ? obj.contractorName.trim() : undefined,
    selectedAt: typeof obj.selectedAt === "string" && obj.selectedAt.trim()
      ? obj.selectedAt.trim()
      : new Date().toISOString(),
  };

  return { valid: true, applicant: sanitized };
}
