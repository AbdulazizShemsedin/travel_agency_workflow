import { z } from "zod";
import { differenceInCalendarDays, parseISO, isValid, isFuture, startOfDay } from "date-fns";

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

// Base schema covering all fields
export const baseApplicantSchema = z.object({
  // Stage 1: Mandatory for Draft
  first_name: z.string().trim().min(1, "First Name is required to save a draft"),
  middle_name: z.string().trim().optional().or(z.literal("")),
  last_name: z.string().trim().min(1, "Last Name is required to save a draft"),
  gender: z.enum(GENDER_OPTIONS, {
    errorMap: () => ({ message: "Please select a valid Gender" }),
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
    .min(0, "Children count cannot be negative")
    .default(0),
  nationality: z.string().trim().min(1, "Nationality is required"),
  phone_number: z.string().trim().min(1, "Phone Number is required"),
  city: z.string().trim().min(1, "City is required"),
  country: z.string().trim().min(1, "Country is required"),

  // Stage 2: Registration Fields (optional for draft)
  date_of_birth: z.string().optional().or(z.literal("")),
  passport_number: z.string().optional().or(z.literal("")),
  highest_education: z.enum(EDUCATION_OPTIONS).optional().or(z.literal("")),
  labour_id: z.string().optional().or(z.literal("")),
  contact_person_name: z.string().optional().or(z.literal("")),
  contact_person_phone: z.string().optional().or(z.literal("")),
  coc_status: z.enum(COC_STATUS_OPTIONS).optional().or(z.literal("")),
  exam_date: z.string().optional().or(z.literal("")),
  medical_status: z.enum(MEDICAL_STATUS_OPTIONS).optional().or(z.literal("")),
  medical_expiry_date: z.string().optional().or(z.literal("")),

  // Stage 3: Optional Context Fields
  alternate_phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
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
    .min(0, "Years cannot be negative")
    .optional()
    .or(z.literal("")),
  remarks: z.string().optional().or(z.literal("")),
  medical_remarks: z.string().optional().or(z.literal("")),
  education_remarks: z.string().optional().or(z.literal("")),

  // Visual/UI context fields
  fee_required: z.boolean().default(false).optional(),
  registration_fee_amount: z.coerce.number().min(0).default(0).optional(),
  profile_photo_url: z.string().optional().or(z.literal("")),
});

// Stage 1 Schema: validates mandatory Draft requirements only
export const stage1DraftSchema = baseApplicantSchema;

// Stage 2 Schema: validates all requirements for Registration
export const stage2RegistrationSchema = baseApplicantSchema
  .extend({
    date_of_birth: z
      .string({ required_error: "Date of Birth is required for registration" })
      .min(1, "Date of Birth is required")
      .refine((val) => {
        if (!val) return false;
        const parsed = parseISO(val);
        return isValid(parsed) && !isFuture(startOfDay(parsed));
      }, "Date of Birth cannot be in the future"),

    passport_number: z
      .string({ required_error: "Passport Number is required for registration" })
      .trim()
      .min(1, "Passport Number is required")
      .transform((val) => val.toUpperCase()),

    highest_education: z.enum(EDUCATION_OPTIONS, {
      errorMap: () => ({
        message: "Highest Education Level is required for registration",
      }),
    }),

    labour_id: z
      .string({ required_error: "Labour ID Number is required for registration" })
      .trim()
      .min(1, "Labour ID Number is required"),

    contact_person_name: z
      .string({ required_error: "Contact Person Name is required for registration" })
      .trim()
      .min(1, "Contact Person Name is required"),

    contact_person_phone: z
      .string({ required_error: "Contact Person Phone is required for registration" })
      .trim()
      .min(1, "Contact Person Phone is required"),

    coc_status: z.enum(COC_STATUS_OPTIONS, {
      errorMap: () => ({ message: "COC Status is required for registration" }),
    }),

    exam_date: z
      .string({ required_error: "COC Exam Date is required for registration" })
      .min(1, "COC Exam Date is required"),

    medical_status: z.enum(MEDICAL_STATUS_OPTIONS, {
      errorMap: () => ({ message: "Medical Status is required for registration" }),
    }),

    medical_expiry_date: z
      .string({
        required_error: "Medical Expiry Date is required for registration",
      })
      .min(1, "Medical Expiry Date is required"),
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
