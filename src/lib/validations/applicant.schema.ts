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
  "Islam",
  "Muslim",
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

export const COC_STATUS_OPTIONS = ["Pending", "Issued", "Not Started"] as const;

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

// Base Applicant Schema
export const baseApplicantSchema = z.object({
  // Stage 1: Mandatory for Draft (Draft Floor)
  applicant_type: z.enum(APPLICANT_TYPE_OPTIONS).default("Standard"),
  application_number: z.string().trim().optional().or(z.literal("")),
  first_name: z.string().trim().default(""),
  middle_name: z.string().trim().optional().or(z.literal("")),
  last_name: z.string().trim().default(""),
  gender: z.enum(GENDER_OPTIONS).or(z.literal("")).default("Female"),
  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default("Islam"),
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
  date_of_birth: z.string().optional().or(z.literal("")),
  passport_number: z.string().optional().or(z.literal("")),
  passport_issue_date: z.string().optional().or(z.literal("")),
  passport_expiry: z.string().optional().or(z.literal("")),
  place_of_issue: z.string().trim().optional().or(z.literal("")).default("ADDIS ABABA"),
  place_of_birth: z.string().trim().optional().or(z.literal("")),
  job_applied: z.string().trim().default("HOUSE WORKER"),
  highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default("SECONDARY LEVEL"),
  labour_id: z.string().optional().or(z.literal("")),
  national_id: z.string().optional().or(z.literal("")),
  contact_person_name: z.string().optional().or(z.literal("")),
  contact_person_phone: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),
  emergency_relationship: z.string().optional().or(z.literal("")),
  coc_status: z.enum(COC_STATUS_OPTIONS).or(z.literal("")).default(""),
  exam_date: z.string().optional().or(z.literal("")),
  medical_status: z.enum(MEDICAL_STATUS_OPTIONS).or(z.literal("")).default(""),
  medical_issue_date: z.string().optional().or(z.literal("")),
  medical_expiry_date: z.string().optional().or(z.literal("")),

  // Canonical Frappe DocType Field Aliases (Required for backend Registered status)
  target_job: z.string().trim().optional().or(z.literal("")).default("HOUSE WORKER"),
  education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default("SECONDARY LEVEL"),
  salary_amount: optionalNumber(
    z.number({ invalid_type_error: "Please enter a valid salary amount" }).min(0, "Salary amount cannot be negative")
  ),
  salary_currency: z.enum(["SAR", "KWD", "USD", "ETB", "AED", "QAR"]).default("SAR"),
  photograph: z.string().optional().or(z.literal("")),
  passport_expiry_date: z.string().optional().or(z.literal("")),
  passport_issue_place: z.string().trim().optional().or(z.literal("")).default("ADDIS ABABA"),
  labor_id: z.string().optional().or(z.literal("")),

  // Photos & Attachments
  profile_photo_url: z.string().optional().or(z.literal("")),
  photo_passport: z.string().optional().or(z.literal("")),
  photo_full_body: z.string().optional().or(z.literal("")),
  passport_scan: z.string().optional().or(z.literal("")),

  // Video & Intro Attachments
  video_url: z.string().optional().or(z.literal("")),
  intro_video: z.string().optional().or(z.literal("")),

  // Fees & Registration (Applicant Fee)
  fee_required: optionalBoolean,
  registration_fee_amount: optionalNumber(
    z.number({ invalid_type_error: "Please enter a valid registration fee amount" }).min(0, "Registration fee cannot be negative")
  ),
  fee_type: z.enum(["Registration Fee", "Processing Fee", "Visa Fee", "Other"]).default("Registration Fee"),
  fee_amount: optionalNumber(
    z.number({ invalid_type_error: "Please enter a valid fee amount" }).min(0, "Fee amount cannot be negative")
  ),
  fee_direction: z.enum(["Income", "Expense"]).default("Income"),
  fee_payment_date: z.string().optional().or(z.literal("")),
  fee_expiry_date: z.string().optional().or(z.literal("")),
  fee_status: z.enum(["Pending", "Paid", "Expired", "Refunded"]).default("Pending"),
  fee_transaction: z.string().optional().or(z.literal("")),
  fee_notes: z.string().optional().or(z.literal("")),

  // Physical & CV Attributes
  monthly_salary: z.string().trim().default("1000"),
  height: z.string().trim().optional().or(z.literal("")),
  weight: z.string().trim().optional().or(z.literal("")),
  complexion: z.string().trim().default("FAIR"),
  leaving_town: z.string().trim().optional().or(z.literal("")),

  // Stage 3: Optional Context & Skills Matrix Fields
  alternate_phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  sub_region: z.string().trim().optional().or(z.literal("")),
  address_line_1: z.string().trim().optional().or(z.literal("")),
  institution: z.string().trim().optional().or(z.literal("")),
  graduation_year: optionalNumber(
    z.number().int().min(1950).max(new Date().getFullYear() + 1)
  ),
  current_employer: z.string().trim().optional().or(z.literal("")),
  years_of_experience: optionalNumber(z.number().min(0).max(50)),
  english_level: z.string().optional().or(z.literal("")),
  arabic_level: z.string().optional().or(z.literal("")),
  experience_country: z.string().trim().optional().or(z.literal("")),
  experience_period: z.string().trim().optional().or(z.literal("")),
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
  remarks: z.string().optional().or(z.literal("")),
  medical_remarks: z.string().optional().or(z.literal("")),
  education_remarks: z.string().optional().or(z.literal("")),

  // Client Preferred Form Structure Fields (Screen Recording 2026-09-17)
  full_name: z.string().trim().optional().or(z.literal("")),
  registration_date: z.string().optional().or(z.literal("")),
  is_active: optionalBoolean.default(true),
  passport_type: z.string().trim().default("Normal"),
  qualification: z.string().trim().optional().or(z.literal("")).default("SECONDARY LEVEL"),
  visa_number: z.string().trim().optional().or(z.literal("")),
  sponsor_name: z.string().trim().optional().or(z.literal("")),
  sponsor_id: z.string().trim().optional().or(z.literal("")),
  sponsor_phone: z.string().trim().optional().or(z.literal("")),
  sponsor_address: z.string().trim().optional().or(z.literal("")),
  agent: z.string().trim().optional().or(z.literal("")),
  sponsor_arabic: z.string().trim().optional().or(z.literal("")),
  visa_type: z.string().trim().default("Work"),
  relative_name: z.string().trim().optional().or(z.literal("")),
  relative_phone: z.string().trim().optional().or(z.literal("")),
  relative_kinship: z.string().trim().optional().or(z.literal("")),
  address_region: z.string().trim().optional().or(z.literal("")),
  relative_woreda: z.string().trim().optional().or(z.literal("")),
  relative_house_no: z.string().trim().optional().or(z.literal("")),
  relative_gender: z.string().trim().optional().or(z.literal("")),
  r_birth_date: z.string().trim().optional().or(z.literal("")),
  woreda: z.string().trim().optional().or(z.literal("")),
  house_no: z.string().trim().optional().or(z.literal("")),
  file_no: z.string().trim().optional().or(z.literal("")),
  contract_number: z.string().trim().optional().or(z.literal("")),
  wakala_number: z.string().trim().optional().or(z.literal("")),
  sticker_visa_number: z.string().trim().optional().or(z.literal("")),
  signed_on: z.string().trim().optional().or(z.literal("")),
  biometric_id: z.string().trim().optional().or(z.literal("")),
  contact_person_2nd: z.string().trim().optional().or(z.literal("")),
  contact_phone_2nd: z.string().trim().optional().or(z.literal("")),
  coc_center: z.string().trim().optional().or(z.literal("")),
  certified_date: z.string().trim().optional().or(z.literal("")),
  certificate_no: z.string().trim().optional().or(z.literal("")),
  training_type: z.string().trim().optional().or(z.literal("")),
  photos_2: optionalBoolean,
  is_filed: optionalBoolean,
  relative_id_card: optionalBoolean,
  works_in: z.string().trim().optional().or(z.literal("")),
  reference_no: z.string().trim().optional().or(z.literal("")),
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

  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default("Islam"),

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

    phone_number: z
      .string({ required_error: "Primary Phone Number is required for registration" })
      .trim()
      .min(9, "Phone Number must be at least 9 digits")
      .max(18, "Phone Number cannot exceed 18 digits")
      .regex(PHONE_REGEX, "Please enter a valid Phone Number (e.g. +251911223344)"),

    city: z
      .string({ required_error: "City is required for registration" })
      .trim()
      .min(2, "City is required (e.g. Addis Ababa)")
      .max(60),

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

    place_of_issue: z.string().trim().optional().or(z.literal("")),

    job_applied: z
      .string({ required_error: "Job / Position Applied is required for registration" })
      .trim()
      .min(1, "Please select or enter the Job / Position Applied"),

    highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).optional(),

    english_level: z.string().optional().or(z.literal("")),

    arabic_level: z.string().optional().or(z.literal("")),

    height: z.string().trim().optional().or(z.literal("")),

    weight: z.string().trim().optional().or(z.literal("")),

    complexion: z.string().trim().optional().or(z.literal("")),

    place_of_birth: z.string().trim().optional().or(z.literal("")),

    monthly_salary: z.string().trim().optional().or(z.literal("")),

    passport_scan: z.string().optional().or(z.literal("")),

    medical_status: z.enum(MEDICAL_STATUS_OPTIONS).or(z.literal("")).optional(),

    medical_expiry_date: z
      .string({ required_error: "Medical Expiry Date is required for registration" })
      .min(1, "Medical Expiry Date is required for registration")
      .refine((val) => {
        if (!val) return false;
        return isValid(parseISO(val));
      }, "Please enter a valid Medical Expiration Date"),
  })
  .superRefine((data: any, ctx: z.RefinementCtx) => {
    const isMuayena = data.applicant_type === "Muayena";

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
