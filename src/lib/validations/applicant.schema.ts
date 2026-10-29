import { z } from "zod";
import { businessZodErrorMap } from "./zod-error-map";
import {
  differenceInCalendarDays,
  differenceInYears,
  parseISO,
  isValid,
  isFuture,
  isPast,
  startOfDay,
  addMonths,
} from "date-fns";

// Enforce non-technical, human-friendly error messages globally across all Zod validations
z.setErrorMap(businessZodErrorMap);

export const GENDER_OPTIONS = ["Male", "Female"] as const;

export const RELIGION_OPTIONS = [
  "Muslim",
  "Non-Muslim",
  "Orthodox",
  "Protestant",
  "Catholic",
  "Other",
] as const;

export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
] as const;

export const EDUCATION_OPTIONS = [
  "SECONDARY LEVEL",
  "PRIMARY LEVEL",
  "Primary Level",
  "Secondary Level",
  "High School",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Other",
] as const;

/**
 * Client-facing COC Status options required by business:
 * - Have COC
 * - No COC
 * - On process
 */
export const CLIENT_COC_STATUS_OPTIONS = [
  "Have COC",
  "No COC",
  "On process",
] as const;

export type ClientCocStatus = (typeof CLIENT_COC_STATUS_OPTIONS)[number];

/**
 * Backend-accepted COC Status options per Frappe API contract:
 * - Issued
 * - Not Started
 * - Pending
 */
export const BACKEND_COC_STATUS_OPTIONS = [
  "Issued",
  "Not Started",
  "Pending",
] as const;

export type BackendCocStatus = (typeof BACKEND_COC_STATUS_OPTIONS)[number];

export const COC_STATUS_OPTIONS = [
  "Have COC",
  "No COC",
  "On process",
  "Issued",
  "Not Started",
  "Pending",
] as const;

/**
 * Maps any backend or legacy COC status string to client-facing label:
 * - Issued / Passed / Certified -> Have COC
 * - Not Started -> No COC
 * - Pending / In Training -> On process
 * - Preserve unknown values (per Requirement 8: do not silently map unknown statuses)
 */
export function toClientCocStatus(status?: string | null): ClientCocStatus | "" {
  if (status === null || status === undefined) return "";
  const trimmed = String(status).trim();
  if (!trimmed) return "";

  switch (trimmed) {
    case "Issued":
    case "Passed":
    case "Certified":
    case "Have COC":
      return "Have COC";
    case "Not Started":
    case "No COC":
      return "No COC";
    case "Pending":
    case "In Training":
    case "On process":
      return "On process";
    default:
      return trimmed as any;
  }
}

/**
 * Maps client-facing COC status label to backend-accepted value:
 * - Have COC -> Issued
 * - No COC -> Not Started
 * - On process -> Pending
 * - Preserve unknown values or already-backend values
 */
export function toBackendCocStatus(status?: string | null): BackendCocStatus | "" {
  if (status === null || status === undefined) return "";
  const trimmed = String(status).trim();
  if (!trimmed) return "";

  switch (trimmed) {
    case "Have COC":
    case "Issued":
    case "Passed":
    case "Certified":
      return "Issued";
    case "No COC":
    case "Not Started":
      return "Not Started";
    case "On process":
    case "Pending":
    case "In Training":
      return "Pending";
    default:
      return trimmed as any;
  }
}

export const MEDICAL_STATUS_OPTIONS = ["FIT", "UNFIT", "Pending"] as const;

export const LANGUAGE_LEVEL_OPTIONS = ["None", "Basic", "Good", "Fluent"] as const;

export const COMPLEXION_OPTIONS = ["FAIR", "MEDIUM", "DARK"] as const;

export const JOB_APPLIED_OPTIONS = [
  "HOUSE WORKER",
  "House worker",
  "Domestic Worker",
  "Driver",
  "Heavy Equipment Driver",
  "General Caregiver",
  "Hospitality & Service Specialist",
  "Electrician / Technician",
  "Construction Assistant",
  "Other",
] as const;

// Phone number regex: supports standard international or local Ethiopian numbers
export const PHONE_REGEX = /^\+?[0-9\s\-()]{9,18}$/;

// Passport regex: 1-2 letters + 6-8 digits (or 7-9 alphanumeric characters)
export const PASSPORT_REGEX = /^[A-Z]{1,2}[0-9]{6,8}$|^[A-Z0-9]{7,9}$/;

// Name regex: letters, spaces, hyphens, and apostrophes
export const NAME_REGEX = /^[a-zA-Z\s\-'.]+$/;

export const APPLICANT_TYPE_OPTIONS = ["Standard", "Muayena"] as const;

export const DESTINATION_COUNTRY_OPTIONS = [
  "Saudi Arabia",
  "Kuwait",
  "United Arab Emirates",
  "Qatar",
  "Oman",
  "Jordan",
  "Other",
] as const;

// Safe helper for optional numeric fields with human-friendly error mapping
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) {
      return undefined;
    }
    const num = Number(val);
    return Number.isNaN(num) ? NaN : num;
  }, schema.optional());

// Safe helper for boolean fields (converts Frappe "1", "0", "", 1, 0, "true", "false" to boolean)
const optionalBoolean = z.preprocess((val) => {
  if (val === true || val === "true" || val === 1 || val === "1" || val === "yes" || val === "Yes") {
    return true;
  }
  return false;
}, z.boolean().default(false));

// Safe preprocessor for optional string fields: handles null, undefined, empty strings, numbers, spaces
export const optionalString = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return "";
    return typeof val === "string" ? val.trim() : String(val).trim();
  },
  z.string().default("")
);

// Base Applicant Schema
export const baseApplicantSchema = z.object({
  // Stage 1: Mandatory for Draft (Draft Floor)
  applicant_type: z.enum(APPLICANT_TYPE_OPTIONS).default("Standard"),
  entry_track: z.enum(APPLICANT_TYPE_OPTIONS).optional(),
  muayena_agency: optionalString,
  application_number: optionalString,
  first_name: z.string().trim().default(""),
  middle_name: optionalString,
  last_name: z.string().trim().default(""),
  gender: z.enum(GENDER_OPTIONS).or(z.literal("")).default("Female"),
  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default("Muslim"),
  marital_status: z.enum(MARITAL_STATUS_OPTIONS).or(z.literal("")).default("Single"),
  children: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = Number(val);
      return Number.isNaN(num) ? NaN : num;
    },
    z.number({
      invalid_type_error: "Please enter a valid number of children (e.g. 0, 1, 2)",
      required_error: "Number of children is required",
    })
      .int("Number of children must be a whole number")
      .min(0, "Number of children cannot be negative")
      .max(25, "Number of children cannot exceed 25")
      .default(0)
  ),
  nationality: z.string().trim().default("Ethiopia"),
  destination_country: z.string().trim().default("Saudi Arabia"),
  phone_number: z.string().trim().default(""),
  city: z.string().trim().default(""),
  country: z.string().trim().default("Ethiopia"),

  // Stage 2: Registration KYC & Medical Fields
  date_of_birth: optionalString,
  passport_number: optionalString,
  passport_issue_date: optionalString,
  passport_expiry: optionalString,
  place_of_issue: optionalString.default("ADDIS ABABA"),
  place_of_birth: optionalString,
  job_applied: optionalString.default("HOUSE WORKER"),
  highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default("SECONDARY LEVEL"),
  labour_id: optionalString,
  national_id: optionalString,
  contact_person_name: optionalString,
  contact_person_phone: optionalString,
  emergency_contact_name: optionalString,
  emergency_contact_phone: optionalString,
  emergency_relationship: optionalString,
  coc_status: z.enum(COC_STATUS_OPTIONS).or(z.literal("")).optional().default(""),
  exam_date: optionalString,
  medical_status: z.enum(MEDICAL_STATUS_OPTIONS).or(z.literal("")).default(""),
  medical_issue_date: optionalString,
  medical_expiry_date: optionalString,

  // Canonical Frappe DocType Field Aliases (Required for backend Registered status)
  target_job: optionalString.default("HOUSE WORKER"),
  education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default("SECONDARY LEVEL"),
  salary_amount: optionalNumber(
    z.number({ invalid_type_error: "Please enter a valid salary amount" }).min(0, "Salary amount cannot be negative")
  ),
  salary_currency: z.enum(["SAR", "KWD", "USD", "ETB", "AED", "QAR"]).default("SAR"),
  photograph: optionalString,
  passport_expiry_date: optionalString,
  passport_issue_place: optionalString.default("ADDIS ABABA"),
  labor_id: optionalString,

  // Photos & Attachments
  profile_photo_url: optionalString,
  photo_passport: optionalString,
  photo_full_body: optionalString,
  passport_scan: optionalString,
  college_certificate: optionalString,
  original_id_scan: optionalString,

  // Video & Intro Attachments
  video_url: optionalString,
  intro_video: optionalString,
  video: optionalString,
  video_key: optionalString,

  // Second Contact Person (Delala / Broker)
  second_contact_name: optionalString,
  second_contact_phone: optionalString,
  second_contact_address: optionalString,

  // Physical & CV Attributes
  monthly_salary: optionalString.default("1000"),
  height: optionalString,
  weight: optionalString,
  complexion: optionalString.default("FAIR"),
  leaving_town: optionalString,

  // Stage 3: Optional Context & Skills Matrix Fields
  alternate_phone: optionalString,
  email: optionalString,
  region: optionalString,
  sub_region: optionalString,
  address_line_1: optionalString,
  institution: optionalString,
  graduation_year: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined || val === 0 || val === "0") {
      return undefined;
    }
    const num = Number(val);
    if (Number.isNaN(num) || num < 1950 || num > new Date().getFullYear() + 1) {
      return undefined;
    }
    return num;
  }, z.number().int().optional().nullable()),
  current_employer: optionalString,
  years_of_experience: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    if (Number.isNaN(num) || num < 0) return 0;
    return num;
  }, z.number().min(0).max(50).optional().nullable()),
  english_level: optionalString.default("None"),
  arabic_level: optionalString.default("None"),
  experience_country: optionalString,
  experience_period: optionalString,
  skill_cleaning: z.union([z.boolean(), z.string(), z.number()]).default(1),
  skill_cooking: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_washing: z.union([z.boolean(), z.string(), z.number()]).default(1),
  skill_ironing: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_baby_sitting: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_baby_care: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_children_care: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_arabic_cooking: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_elder_care: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_elderly_care: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_driving: z.union([z.boolean(), z.string(), z.number()]).default(0),
  skill_sewing: z.union([z.boolean(), z.string(), z.number()]).default(0),
  remarks: optionalString,
  medical_remarks: optionalString,
  education_remarks: optionalString,

  // Client Preferred Form Structure Fields (Screen Recording 2026-09-17)
  full_name: optionalString,
  registration_date: optionalString,
  is_active: optionalBoolean.default(true),
  passport_type: optionalString.default("Normal"),
  qualification: optionalString.default("SECONDARY LEVEL"),
  visa_number: optionalString,
  sponsor_name: optionalString,
  sponsor_id: optionalString,
  sponsor_phone: optionalString,
  sponsor_address: optionalString,
  agent: optionalString,
  sponsor_arabic: optionalString,
  visa_type: optionalString.default("Work"),
  relative_name: optionalString,
  relative_phone: optionalString,
  relative_kinship: optionalString,
  address_region: optionalString,
  relative_woreda: optionalString,
  relative_house_no: optionalString,
  relative_gender: optionalString,
  r_birth_date: optionalString,
  woreda: optionalString,
  house_no: optionalString,
  file_no: optionalString,
  contract_number: optionalString,
  wakala_number: optionalString,
  sticker_visa_number: optionalString,
  signed_on: optionalString,
  biometric_id: optionalString,
  contact_person_2nd: optionalString,
  contact_phone_2nd: optionalString,
  coc_center: optionalString,
  certified_date: optionalString,
  certificate_no: optionalString,
  training_type: optionalString,
  photos_2: optionalBoolean,
  is_filed: optionalBoolean,
  relative_id_card: optionalBoolean,
  works_in: optionalString,
  reference_no: optionalString,
});

// Stage 1 Base Object Schema
export const stage1DraftBaseSchema = baseApplicantSchema.extend({
  applicant_type: z.enum(APPLICANT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select an Applicant Type" }),
  }).default("Standard"),

  destination_country: z
    .string()
    .trim()
    .default("Saudi Arabia"),

  first_name: z
    .string()
    .trim()
    .max(50, "First Name must not exceed 50 characters")
    .optional()
    .or(z.literal("")),

  middle_name: z.string().trim().max(50, "Father Name must not exceed 50 characters").optional().or(z.literal("")),

  last_name: z.string().trim().max(50, "Last Name must not exceed 50 characters").optional().or(z.literal("")),

  gender: z.enum(GENDER_OPTIONS).or(z.literal("")).default("Female"),

  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default("Muslim"),

  marital_status: z.enum(MARITAL_STATUS_OPTIONS).or(z.literal("")).default("Single"),

  children: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = Number(val);
      return Number.isNaN(num) ? 0 : num;
    },
    z.number({
      invalid_type_error: "Please enter a valid number of children (e.g. 0, 1, 2)",
    })
      .int("Number of children must be a whole number")
      .min(0, "Number of children cannot be negative")
      .max(25, "Number of children cannot exceed 25")
      .default(0)
  ),

  nationality: z
    .string()
    .trim()
    .default("Ethiopia"),

  phone_number: z.string().trim().optional().or(z.literal("")),

  city: z.string().trim().optional().or(z.literal("")),

  place_of_birth: z.string().trim().optional().or(z.literal("")),

  country: z.string().trim().default("Ethiopia"),
});

// Stage 1 Schema: Minimal Requirements to Save an In-Progress Draft
export const stage1DraftSchema = stage1DraftBaseSchema.superRefine((data: any, ctx: z.RefinementCtx) => {
  const hasName =
    (data.full_name && data.full_name.trim().length >= 2) ||
    (data.first_name && data.first_name.trim().length >= 2);
  if (!hasName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Full Name or First Name is required to save a draft (at least 2 characters)",
      path: ["full_name"],
    });
  }
});

// Stage 2 Schema: Strictly Validates All Requirements for Registration
export const stage2RegistrationSchema = stage1DraftBaseSchema
  .extend({
    full_name: z.string().trim().optional().or(z.literal("")),

    middle_name: z
      .string()
      .trim()
      .max(50, "Father Name must not exceed 50 characters")
      .optional()
      .or(z.literal("")),

    last_name: z
      .string()
      .trim()
      .max(50, "Last Name must not exceed 50 characters")
      .optional()
      .or(z.literal("")),

    gender: z.enum(GENDER_OPTIONS, {
      errorMap: () => ({ message: "Please select a Gender (Male or Female)" }),
    }),

    religion: z.enum(RELIGION_OPTIONS, {
      errorMap: () => ({ message: "Please select a Religion" }),
    }),

    marital_status: z.enum(MARITAL_STATUS_OPTIONS, {
      errorMap: () => ({ message: "Please select a Marital Status" }),
    }),

    phone_number: optionalString
      .refine(
        (val) => !val || (val.length >= 9 && val.length <= 18 && PHONE_REGEX.test(val)),
        "Please enter a valid Phone Number (e.g. +251911223344)"
      ),

    city: optionalString,

    country: z
      .string({ required_error: "Country is required for registration" })
      .trim()
      .min(2, "Country is required (e.g. Ethiopia)")
      .max(60),

    date_of_birth: z
      .string({ required_error: "Date of Birth is required for registration" })
      .min(1, "Date of Birth is required")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && isPast(startOfDay(parsed));
      }, "Date of Birth cannot be today or in the future")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        const age = differenceInYears(new Date(), parsed);
        return isValid(parsed) && age >= 18;
      }, "Applicant must be at least 18 years old for work abroad")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        const age = differenceInYears(new Date(), parsed);
        return isValid(parsed) && age >= 18;
      }, "Applicant must be at least 18 years old for work abroad")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        const age = differenceInYears(new Date(), parsed);
        return isValid(parsed) && age <= 65;
      }, "Applicant age must be 65 years or younger"),

    passport_number: z
      .string({ required_error: "Passport Number is required for registration" })
      .trim()
      .min(7, "Passport Number must be between 7 and 9 characters")
      .max(9, "Passport Number must not exceed 9 characters")
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => PASSPORT_REGEX.test(val),
        "Passport Number must be 7-9 alphanumeric characters (e.g. EP1234567)"
      ),

    passport_expiry: z
      .string({ required_error: "Passport Expiry Date is required for registration" })
      .min(1, "Passport Expiry Date is required")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && isFuture(startOfDay(parsed));
      }, "Passport Expiry Date must be a future date")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        if (!isValid(parsed)) return false;
        return startOfDay(parsed) >= addMonths(startOfDay(new Date()), 6);
      }, "Passport must be valid for at least 6 months from today for work abroad"),

    passport_issue_date: z
      .string()
      .optional()
      .or(z.literal("")),

    place_of_issue: optionalString.default("ADDIS ABABA"),

    job_applied: z
      .string({ required_error: "Job / Position Applied is required for registration" })
      .trim()
      .min(1, "Please select or enter the Job / Position Applied"),

    highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).optional(),

    english_level: optionalString,

    arabic_level: optionalString,

    height: optionalString,

    weight: optionalString,

    complexion: optionalString,

    place_of_birth: optionalString,

    monthly_salary: optionalString,

    passport_scan: optionalString,

    medical_status: z.enum(MEDICAL_STATUS_OPTIONS).or(z.literal("")).optional(),

    medical_expiry_date: optionalString
      .refine((val) => {
        if (!val || !val.trim()) return true;
        return isValid(parseISO(val));
      }, "Please enter a valid Medical Expiration Date"),
  })
  .superRefine((data: any, ctx: z.RefinementCtx) => {
    const isMuayena = data.applicant_type === "Muayena" || data.entry_track === "Muayena";

    if (isMuayena) {
      if (!data.muayena_agency || !String(data.muayena_agency).trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A Muayena worker is registered with their agency: pick the agency.",
          path: ["muayena_agency"],
        });
      }
    }

    // For Standard applicants: CV generation fields and salary are mandatory
    if (!isMuayena) {
      if (!data.highest_education && !(data as any).education) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Highest Education Level is required for registration",
          path: ["highest_education"],
        });
      }

      if (!data.english_level || !data.english_level.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "English Level is required",
          path: ["english_level"],
        });
      }

      if (!data.arabic_level || !data.arabic_level.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Arabic Level is required",
          path: ["arabic_level"],
        });
      }

      const salaryVal = data.monthly_salary || (data as any).salary_amount;
      if (!salaryVal || !String(salaryVal).trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Monthly Salary is required for registration",
          path: ["monthly_salary"],
        });
      }

      if (!data.passport_scan || !data.passport_scan.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport document scan is mandatory for CV generation",
          path: ["passport_scan"],
        });
      }

      // Mandatory photo for registration / CV generation (no AI placeholder allowed)
      const hasPhoto = Boolean(
        (data.photo_passport && data.photo_passport.trim()) ||
        (data.profile_photo_url && data.profile_photo_url.trim()) ||
        ((data as any).photograph && (data as any).photograph.trim()) ||
        ((data as any).photo_full_body && (data as any).photo_full_body.trim())
      );
      if (!hasPhoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport size or full-body photograph is mandatory for CV generation",
          path: ["photo_passport"],
        });
      }

      if (!data.place_of_birth || !data.place_of_birth.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Place of Birth is required for registration",
          path: ["place_of_birth"],
        });
      }
    }

    const nameStr = (
      data.full_name ||
      `${data.first_name || ""} ${data.middle_name || ""} ${data.last_name || ""}`
    ).trim();
    if (nameStr.split(/\s+/).filter(Boolean).length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Full Name must contain at least First Name and Father's Name",
        path: ["full_name"],
      });
    }

    if (data.medical_status === "UNFIT") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Applicant cannot be registered while medical status is UNFIT.",
        path: ["medical_status"],
      });
    }

    const secPhone = (data as any).second_contact_phone || (data as any).contact_phone_2nd;
    if (secPhone && String(secPhone).trim()) {
      if (!PHONE_REGEX.test(String(secPhone).trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid Phone Number for second contact (e.g. +251911223344)",
          path: ["second_contact_phone"],
        });
      }
    }
  });

export type BaseApplicantFormValues = z.infer<typeof baseApplicantSchema>;

// Helper calculation functions
export function calculateRemainingDays(dateStr?: string | null): number | undefined {
  if (!dateStr) return undefined;
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return undefined;
  const today = startOfDay(new Date());
  return differenceInCalendarDays(startOfDay(parsed), today);
}

// Reactive expiry badge status aligned with Frappe 16-day watchdog threshold
export function getExpiryBadgeStatus(days?: number): {
  label: string;
  variant: "success" | "warning" | "destructive" | "neutral";
  textClass: string;
  bgClass: string;
  borderClass: string;
  isPulsing?: boolean;
} {
  if (days === undefined) {
    return {
      label: "Not Set",
      variant: "neutral",
      textClass: "text-slate-600 dark:text-zinc-400",
      bgClass: "bg-slate-100 dark:bg-[#18181f]",
      borderClass: "border-slate-200 dark:border-[#26262d]",
    };
  }

  if (days > 30) {
    return {
      label: `${days} days remaining`,
      variant: "success",
      textClass: "text-emerald-700 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/50",
      borderClass: "border-emerald-200 dark:border-emerald-800",
    };
  }

  if (days > 16) {
    return {
      label: `${days} days remaining (Warning)`,
      variant: "warning",
      textClass: "text-amber-700 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/50",
      borderClass: "border-amber-200 dark:border-amber-800",
    };
  }

  if (days > 0) {
    return {
      label: `${days} days remaining (Expiring Soon)`,
      variant: "destructive",
      textClass: "text-rose-700 dark:text-rose-400",
      bgClass: "bg-rose-50 dark:bg-rose-950/50",
      borderClass: "border-rose-200 dark:border-rose-800",
      isPulsing: true,
    };
  }

  return {
    label: `Expired (${Math.abs(days)} days ago)`,
    variant: "destructive",
    textClass: "text-rose-700 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/50",
    borderClass: "border-rose-200 dark:border-rose-800",
    isPulsing: true,
  };
}

export function deriveFullName(
  first: string = "",
  middle: string = "",
  last: string = ""
): string {
  return [first.trim(), middle.trim(), last.trim()]
    .filter(Boolean)
    .join(" ");
}

export function splitFullName(fullName: string = ""): {
  first_name: string;
  middle_name: string;
  last_name: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first_name = parts[0] || "";
  const middle_name = parts[1] || "";
  const last_name = parts.slice(2).join(" ") || "";
  return { first_name, middle_name, last_name };
}
