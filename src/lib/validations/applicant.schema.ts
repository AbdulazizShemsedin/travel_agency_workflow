import { z } from "zod";
import {
  differenceInCalendarDays,
  differenceInYears,
  parseISO,
  isValid,
  isFuture,
  isPast,
  startOfDay,
} from "date-fns";

export const GENDER_OPTIONS = ["Male", "Female"] as const;

export const RELIGION_OPTIONS = [
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
  "House worker",
  "Housemaid",
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

// Safe helper for optional numeric fields
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined || Number.isNaN(val)) {
      return undefined;
    }
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
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
  first_name: z.string().trim().default(""),
  middle_name: z.string().trim().optional().or(z.literal("")),
  last_name: z.string().trim().default(""),
  gender: z.enum(GENDER_OPTIONS).or(z.literal("")).default(""),
  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default(""),
  marital_status: z.enum(MARITAL_STATUS_OPTIONS).or(z.literal("")).default(""),
  children: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z.number().int("Children must be a whole number").min(0).max(25).default(0)
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
  place_of_issue: z.string().trim().optional().or(z.literal("")),
  job_applied: z.string().trim().default("House worker"),
  highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default(""),
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
  registration_fee_amount: optionalNumber(z.number().min(0)),
  fee_type: z.enum(["Registration Fee", "Processing Fee", "Visa Fee", "Other"]).default("Registration Fee"),
  fee_amount: optionalNumber(z.number().min(0)),
  fee_direction: z.enum(["Income", "Expense"]).default("Income"),
  fee_payment_date: z.string().optional().or(z.literal("")),
  fee_expiry_date: z.string().optional().or(z.literal("")),
  fee_status: z.enum(["Pending", "Paid", "Expired", "Refunded"]).default("Pending"),
  fee_notes: z.string().optional().or(z.literal("")),

  // Physical & CV Attributes
  monthly_salary: z.string().trim().default("1000"),
  height: z.string().trim().optional().or(z.literal("")),
  weight: z.string().trim().optional().or(z.literal("")),
  complexion: z.string().trim().default("FAIR"),
  place_of_birth: z.string().trim().optional().or(z.literal("")),
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
});

// Stage 1 Schema: Mandatory for Draft Floor
export const stage1DraftSchema = baseApplicantSchema.extend({
  applicant_type: z.enum(APPLICANT_TYPE_OPTIONS, {
    errorMap: () => ({ message: "Please select an Applicant Type" }),
  }).default("Standard"),

  destination_country: z
    .string()
    .trim()
    .default("Saudi Arabia"),

  first_name: z
    .string({ required_error: "First Name is required" })
    .trim()
    .min(2, "First Name must be at least 2 characters")
    .max(50, "First Name must not exceed 50 characters")
    .regex(NAME_REGEX, "First Name can only contain letters, hyphens, and spaces"),

  middle_name: z
    .string({ required_error: "Father Name (Middle Name) is required" })
    .trim()
    .min(2, "Father Name must be at least 2 characters")
    .max(50, "Father Name must not exceed 50 characters")
    .regex(NAME_REGEX, "Father Name can only contain letters, hyphens, and spaces"),

  last_name: z
    .string({ required_error: "Last Name is required" })
    .trim()
    .min(2, "Last Name must be at least 2 characters")
    .max(50, "Last Name must not exceed 50 characters")
    .regex(NAME_REGEX, "Last Name can only contain letters, hyphens, and spaces"),

  gender: z.enum(GENDER_OPTIONS, {
    errorMap: () => ({ message: "Please select a Gender (Male or Female)" }),
  }),

  religion: z.enum(RELIGION_OPTIONS, {
    errorMap: () => ({ message: "Please select a Religion" }),
  }),

  marital_status: z.enum(MARITAL_STATUS_OPTIONS, {
    errorMap: () => ({ message: "Please select a Marital Status" }),
  }),

  children: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z.number().int("Children count must be a number").min(0).max(25)
  ),

  nationality: z
    .string({ required_error: "Nationality is required" })
    .trim()
    .min(2, "Nationality is required (e.g. Ethiopia)")
    .max(60),

  phone_number: z
    .string({ required_error: "Primary Phone Number is required" })
    .trim()
    .min(9, "Phone Number must be at least 9 digits")
    .max(18, "Phone Number cannot exceed 18 digits")
    .regex(PHONE_REGEX, "Please enter a valid Phone Number (e.g. +251911223344)"),

  city: z
    .string({ required_error: "City is required" })
    .trim()
    .min(2, "City is required (e.g. Addis Ababa)")
    .max(60),

  country: z
    .string({ required_error: "Country is required" })
    .trim()
    .min(2, "Country is required (e.g. Ethiopia)")
    .max(60),
});

// Stage 2 Schema: Strictly Validates All Requirements for Registration
export const stage2RegistrationSchema = stage1DraftSchema
  .extend({
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
      }, "Applicant must be at least 18 years old for overseas deployment")
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
      }, "Passport Expiry Date must be a future date"),

    passport_issue_date: z
      .string({ required_error: "Passport Issue Date is required for registration" })
      .min(1, "Passport Issue Date is required")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && isPast(startOfDay(parsed));
      }, "Passport Issue Date must be in the past"),

    place_of_issue: z
      .string({ required_error: "Place of Issue is required for registration" })
      .trim()
      .min(2, "Place of Issue is required (e.g. Addis Ababa)"),

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
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => {
        if (!val) return true;
        return isValid(parseISO(val));
      }, "Please enter a valid Medical Expiration Date"),
  })
  .superRefine((data, ctx) => {
    const isMuayena = data.applicant_type === "Muayena";

    // For Standard applicants: CV generation fields and salary are mandatory
    if (!isMuayena) {
      if (!data.highest_education) {
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

      if (!data.monthly_salary || !data.monthly_salary.trim()) {
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
        (data.profile_photo_url && data.profile_photo_url.trim())
      );
      if (!hasPhoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport size photograph is mandatory for CV generation",
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
