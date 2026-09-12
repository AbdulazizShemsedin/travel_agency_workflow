import { z } from "zod";

/**
 * Human-friendly field titles for validation messages
 */
const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name",
  middle_name: "Father Name (Middle Name)",
  last_name: "Grandfather Name (Last Name)",
  gender: "Gender",
  religion: "Religion",
  marital_status: "Marital Status",
  children: "Number of Children",
  nationality: "Nationality",
  destination_country: "Destination Country",
  phone_number: "Primary Phone Number",
  alternate_phone: "Alternate Phone Number",
  city: "City",
  country: "Country",
  date_of_birth: "Date of Birth",
  passport_number: "Passport Number",
  passport_issue_date: "Passport Issue Date",
  passport_expiry: "Passport Expiration Date",
  place_of_issue: "Passport Issue Place",
  job_applied: "Applied Job Position",
  target_job: "Applied Job Position",
  highest_education: "Education Level",
  education: "Education Level",
  monthly_salary: "Monthly Salary",
  salary_amount: "Monthly Salary Amount",
  salary_currency: "Salary Currency",
  registration_fee_amount: "Registration Fee Amount",
  fee_amount: "Fee Amount",
  years_of_experience: "Years of Experience",
  graduation_year: "Graduation Year",
  contact_person_name: "Emergency Contact Name",
  contact_person_phone: "Emergency Contact Phone",
  emergency_contact_name: "Emergency Contact Name",
  emergency_contact_phone: "Emergency Contact Phone",
  emergency_relationship: "Emergency Relationship",
  medical_status: "Medical Examination Result",
  medical_issue_date: "Medical Issue Date",
  medical_expiry_date: "Medical Expiration Date",
  coc_status: "COC Certificate Status",
  exam_date: "Examination Date",
  english_level: "English Proficiency",
  arabic_level: "Arabic Proficiency",
  passport_scan: "Passport Document Scan",
  photo_passport: "Formal Passport Photograph",
  photo_full_body: "Full-Body Photograph",
  advance_amount: "Advance Amount",
  ticket_number: "Flight Ticket Number",
  ticket_cost: "Flight Ticket Cost",
  flight_date: "Flight Departure Date",
  rejection_remark: "Rejection Reason",
  override_reason: "Override Reason",
};

/**
 * Global Zod Error Map for Business Users
 * 
 * Replaces technical Zod error messages (e.g. "Expected number, received nan",
 * "Expected string, received undefined", "Invalid enum value") with plain, helpful English.
 */
export const businessZodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const pathKey = issue.path[issue.path.length - 1];
  const fieldName = typeof pathKey === "string" ? pathKey : "";
  const label = FIELD_LABELS[fieldName] || (fieldName ? fieldName.replace(/_/g, " ") : "This field");

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type: {
      if (issue.expected === "number") {
        if (fieldName === "children") {
          return { message: "Please enter a valid number of children (e.g. 0, 1, 2)." };
        }
        if (fieldName.includes("salary")) {
          return { message: "Please enter a valid monthly salary amount." };
        }
        if (fieldName.includes("fee") || fieldName.includes("amount") || fieldName.includes("rate") || fieldName.includes("cost")) {
          return { message: `Please enter a valid payment amount for ${label.toLowerCase()}.` };
        }
        if (fieldName === "graduation_year") {
          return { message: "Please enter a valid 4-digit graduation year (e.g. 2020)." };
        }
        if (fieldName === "years_of_experience") {
          return { message: "Please enter a valid number of years of experience." };
        }
        return { message: `Please enter a valid number or amount for ${label.toLowerCase()}.` };
      }

      if (issue.expected === "string" && (issue.received === "undefined" || issue.received === "null")) {
        return { message: `${label} is required. Please fill in this information.` };
      }

      if (issue.expected === "date") {
        return { message: `Please select or enter a valid date for ${label.toLowerCase()}.` };
      }

      if (issue.expected === "boolean") {
        return { message: `Please select Yes or No for ${label.toLowerCase()}.` };
      }

      return { message: `Please provide a valid entry for ${label.toLowerCase()}.` };
    }

    case z.ZodIssueCode.invalid_enum_value: {
      return { message: `Please select a valid option for ${label.toLowerCase()}.` };
    }

    case z.ZodIssueCode.too_small: {
      if (issue.type === "string") {
        if (issue.minimum === 1) {
          return { message: `${label} cannot be left blank.` };
        }
        return { message: `${label} must contain at least ${issue.minimum} characters.` };
      }
      if (issue.type === "number") {
        return { message: `${label} must be at least ${issue.minimum}.` };
      }
      return { message: `${label} is too small.` };
    }

    case z.ZodIssueCode.too_big: {
      if (issue.type === "string") {
        return { message: `${label} cannot exceed ${issue.maximum} characters.` };
      }
      if (issue.type === "number") {
        return { message: `${label} cannot be greater than ${issue.maximum}.` };
      }
      return { message: `${label} exceeds the maximum allowed value.` };
    }

    case z.ZodIssueCode.invalid_string: {
      if (issue.validation === "email") {
        return { message: "Please enter a valid email address (e.g. user@example.com)." };
      }
      if (issue.validation === "url") {
        return { message: "Please enter a valid website or file link." };
      }
      if (issue.validation === "regex") {
        return { message: `Please check ${label.toLowerCase()} for invalid characters.` };
      }
      return { message: `Please enter a valid format for ${label.toLowerCase()}.` };
    }

    case z.ZodIssueCode.custom: {
      const msg = issue.message || ctx.defaultError;
      // If the message contains technical leakage, sanitize it
      if (/nan|undefined|expected|invalid type|zod/i.test(msg)) {
        return { message: `Please review and enter a valid value for ${label.toLowerCase()}.` };
      }
      return { message: msg };
    }

    default: {
      const def = ctx.defaultError;
      if (/nan|expected number|expected string|invalid type/i.test(def)) {
        return { message: `Please enter a valid value for ${label.toLowerCase()}.` };
      }
      return { message: def };
    }
  }
};
