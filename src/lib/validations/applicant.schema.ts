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

// Phone number regex: supports +251..., 09..., or standard international format with 9 to 18 digits/spaces/hyphens
export const PHONE_REGEX = /^\+?[0-9\s\-()]{9,18}$/;

// Passport regex: 1-2 letters + 6-8 digits (or 6-9 alphanumeric characters)
export const PASSPORT_REGEX = /^[A-Z]{1,2}[0-9]{6,8}$|^[A-Z0-9]{7,9}$/;

// Name regex: letters, spaces, hyphens, and apostrophes
export const NAME_REGEX = /^[a-zA-Z\s\-'.]+$/;

// Base schema for form state
export const baseApplicantSchema = z.object({
  // Stage 1: Mandatory for Draft
  first_name: z.string().trim().default(""),
  middle_name: z.string().trim().optional().or(z.literal("")),
  last_name: z.string().trim().default(""),
  gender: z.enum(GENDER_OPTIONS).or(z.literal("")).default(""),
  religion: z.enum(RELIGION_OPTIONS).or(z.literal("")).default(""),
  marital_status: z.enum(MARITAL_STATUS_OPTIONS).or(z.literal("")).default(""),
  children: z.coerce
    .number({ invalid_type_error: "Children count must be a number" })
    .int("Children must be a whole number")
    .min(0, "Children count cannot be negative")
    .default(0),
  nationality: z.string().trim().default("Ethiopia"),
  phone_number: z.string().trim().default(""),
  city: z.string().trim().default(""),
  country: z.string().trim().default("Ethiopia"),

  // Stage 2: Registration Fields (optional for initial draft)
  date_of_birth: z.string().optional().or(z.literal("")),
  passport_number: z.string().optional().or(z.literal("")),
  highest_education: z.enum(EDUCATION_OPTIONS).or(z.literal("")).default(""),
  labour_id: z.string().optional().or(z.literal("")),
  contact_person_name: z.string().optional().or(z.literal("")),
  contact_person_phone: z.string().optional().or(z.literal("")),
  coc_status: z.enum(COC_STATUS_OPTIONS).or(z.literal("")).default(""),
  exam_date: z.string().optional().or(z.literal("")),
  medical_status: z.enum(MEDICAL_STATUS_OPTIONS).or(z.literal("")).default(""),
  medical_expiry_date: z.string().optional().or(z.literal("")),

  // Stage 3: Optional Context Fields
  alternate_phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  sub_region: z.string().trim().optional().or(z.literal("")),
  address_line_1: z.string().trim().optional().or(z.literal("")),
  national_id: z.string().trim().optional().or(z.literal("")),
  passport_expiry: z.string().optional().or(z.literal("")),
  institution: z.string().trim().optional().or(z.literal("")),
  graduation_year: z.coerce
    .number()
    .int()
    .min(1950, "Invalid year")
    .max(new Date().getFullYear() + 5, "Invalid year")
    .optional()
    .or(z.literal("")),
  current_employer: z.string().trim().optional().or(z.literal("")),
  years_of_experience: z.coerce
    .number()
    .min(0, "Years of experience cannot be negative")
    .optional()
    .or(z.literal("")),
  remarks: z.string().optional().or(z.literal("")),
  medical_remarks: z.string().optional().or(z.literal("")),
  education_remarks: z.string().optional().or(z.literal("")),

  // Visual/UI context fields
  fee_required: z.boolean().default(false).optional(),
  registration_fee_amount: z.coerce.number().min(0, "Fee amount cannot be negative").default(0).optional(),
  profile_photo_url: z.string().optional().or(z.literal("")),
});

// Stage 1 Schema: Strictly validates mandatory Draft requirements
export const stage1DraftSchema = baseApplicantSchema.extend({
  first_name: z
    .string({ required_error: "First Name is required" })
    .trim()
    .min(2, "First Name must be at least 2 characters")
    .regex(NAME_REGEX, "First Name can only contain letters, hyphens, and spaces"),

  middle_name: z
    .string()
    .trim()
    .refine((val) => !val || NAME_REGEX.test(val), {
      message: "Middle Name can only contain letters, hyphens, and spaces",
    })
    .optional()
    .or(z.literal("")),

  last_name: z
    .string({ required_error: "Last Name is required" })
    .trim()
    .min(2, "Last Name must be at least 2 characters")
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

  children: z.coerce
    .number({ invalid_type_error: "Children count must be a number" })
    .int("Children must be a whole number")
    .min(0, "Children count cannot be negative"),

  nationality: z
    .string({ required_error: "Nationality is required" })
    .trim()
    .min(2, "Nationality is required (e.g., Ethiopia)"),

  phone_number: z
    .string({ required_error: "Primary Phone Number is required" })
    .trim()
    .min(9, "Phone Number must be at least 9 digits")
    .regex(
      PHONE_REGEX,
      "Please enter a valid Phone Number (e.g., +251911223344 or 0911223344)"
    ),

  alternate_phone: z
    .string()
    .trim()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: "Please enter a valid Alternate Phone Number (e.g. +251922334455)",
    })
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .trim()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Please enter a valid Email Address (e.g., applicant@example.com)",
    })
    .optional()
    .or(z.literal("")),

  city: z
    .string({ required_error: "City is required" })
    .trim()
    .min(2, "City is required (e.g., Addis Ababa)"),

  country: z
    .string({ required_error: "Country is required" })
    .trim()
    .min(2, "Country is required (e.g., Ethiopia)"),
});

// Stage 2 Schema: Strictly validates all requirements for Registration
export const stage2RegistrationSchema = stage1DraftSchema
  .extend({
    date_of_birth: z
      .string({ required_error: "Date of Birth is required for registration" })
      .min(1, "Date of Birth is required")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && !isFuture(startOfDay(parsed));
      }, "Date of Birth cannot be in the future")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && differenceInYears(new Date(), parsed) >= 18;
      }, "Applicant must be at least 18 years old for overseas registration"),

    passport_number: z
      .string({ required_error: "Passport Number is required for registration" })
      .trim()
      .min(6, "Passport Number must be at least 6 characters")
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => PASSPORT_REGEX.test(val),
        "Passport Number must be a valid 7-9 character passport code (e.g. EP1234567 or A12345678)"
      ),

    passport_expiry: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => {
        if (!val) return true;
        const parsed = parseISO(val);
        return isValid(parsed) && isFuture(startOfDay(parsed));
      }, "Passport Expiry Date must be in the future"),

    highest_education: z.enum(EDUCATION_OPTIONS, {
      errorMap: () => ({
        message: "Highest Education Level is required for registration",
      }),
    }),

    labour_id: z
      .string({ required_error: "Labour ID Number is required for registration" })
      .trim()
      .min(3, "Labour ID Number must be at least 3 characters (e.g. LBR-998844)"),

    contact_person_name: z
      .string({ required_error: "Emergency Contact Name is required for registration" })
      .trim()
      .min(2, "Emergency Contact Name must be at least 2 characters"),

    contact_person_phone: z
      .string({ required_error: "Emergency Contact Phone is required for registration" })
      .trim()
      .min(9, "Emergency Contact Phone must be at least 9 digits")
      .regex(
        PHONE_REGEX,
        "Please enter a valid Emergency Contact Phone Number (e.g., +251911889900)"
      ),

    coc_status: z.enum(COC_STATUS_OPTIONS, {
      errorMap: () => ({ message: "COC Status is required for registration" }),
    }),

    exam_date: z
      .string({ required_error: "COC Exam Date is required for registration" })
      .min(1, "COC Exam Date is required")
      .refine((val) => {
        if (!val) return false;
        return isValid(parseISO(val));
      }, "Please enter a valid COC Exam Date"),

    medical_status: z.enum(MEDICAL_STATUS_OPTIONS, {
      errorMap: () => ({ message: "Medical Status is required for registration" }),
    }),

    medical_expiry_date: z
      .string({
        required_error: "Medical Expiry Date is required for registration",
      })
      .min(1, "Medical Expiry Date is required")
      .refine((val) => {
        if (!val) return false;
        return isValid(parseISO(val));
      }, "Please enter a valid Medical Expiry Date"),
  })
  .refine((data) => data.medical_status !== "UNFIT", {
    message: "Applicant cannot be registered while medical status is UNFIT.",
    path: ["medical_status"],
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

export function getExpiryBadgeStatus(days?: number): {
  label: string;
  variant: "success" | "warning" | "destructive" | "neutral";
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  if (days === undefined) {
    return {
      label: "Not Set",
      variant: "neutral",
      textClass: "text-slate-600",
      bgClass: "bg-slate-100",
      borderClass: "border-slate-200",
    };
  }

  if (days > 30) {
    return {
      label: `${days} days remaining`,
      variant: "success",
      textClass: "text-emerald-700",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
    };
  }

  if (days >= 10) {
    return {
      label: `${days} days remaining (Warning)`,
      variant: "warning",
      textClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
    };
  }

  if (days > 0) {
    return {
      label: `${days} days remaining (Urgent)`,
      variant: "destructive",
      textClass: "text-rose-700",
      bgClass: "bg-rose-50",
      borderClass: "border-rose-200",
    };
  }

  return {
    label: `Expired (${Math.abs(days)} days ago)`,
    variant: "destructive",
    textClass: "text-rose-700",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
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
