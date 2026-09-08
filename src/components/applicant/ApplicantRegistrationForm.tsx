"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  FileCheck2,
  FileText,
  Loader2,
  AlertTriangle,
  Save,
  CheckCircle2,
  Download,
  ExternalLink,
  User,
  GraduationCap,
  ShieldCheck,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import {
  BaseApplicantFormValues,
  stage1DraftSchema,
  stage2RegistrationSchema,
} from "@/lib/validations/applicant.schema";
import {
  createApplicantV2,
  updateApplicantV2,
  registerApplicantV2,
  generateCvV2,
  getApplicantV2,
  logApplicantFeeV2,
  normalizeApplicantFields,
  ApiV2Error,
} from "@/lib/api/v2";
import { Step1PersonalInfo } from "./steps/Step1PersonalInfo";
import { Step2EducationExperience } from "./steps/Step2EducationExperience";
import { Step3IdentificationContact } from "./steps/Step3IdentificationContact";
import { Step4CocMedical } from "./steps/Step4CocMedical";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApplicantRegistrationFormProps {
  initialData?: Partial<BaseApplicantFormValues>;
  existingApplicantId?: string;
  lockedIdentityFields?: boolean;
  onSuccessRedirect?: (applicantId: string) => void;
}

const SECTIONS = [
  { id: "section-personal", label: "1. Personal & Passport", icon: User },
  { id: "section-education", label: "2. Education & Skills", icon: GraduationCap },
  { id: "section-identification", label: "3. ID & Contacts", icon: ShieldCheck },
  { id: "section-medical", label: "4. Medical & COC", icon: HeartPulse },
];

// Map every form field to its respective wizard section
const FIELD_TO_SECTION_MAP: Record<string, string> = {
  applicant_type: "section-personal",
  destination_country: "section-personal",
  first_name: "section-personal",
  middle_name: "section-personal",
  last_name: "section-personal",
  gender: "section-personal",
  date_of_birth: "section-personal",
  religion: "section-personal",
  marital_status: "section-personal",
  children: "section-personal",
  nationality: "section-personal",
  passport_number: "section-personal",
  passport_issue_date: "section-personal",
  passport_expiry: "section-personal",
  passport_issue_place: "section-personal",
  place_of_issue: "section-personal",
  place_of_birth: "section-personal",
  photo_passport: "section-personal",
  profile_photo_url: "section-personal",
  photograph: "section-personal",
  photo_full_body: "section-personal",
  passport_scan: "section-personal",
  leaving_town: "section-personal",
  city: "section-personal",
  country: "section-personal",
  phone_number: "section-personal",
  alternate_phone: "section-personal",
  email: "section-personal",
  sub_region: "section-personal",
  address_line_1: "section-personal",
  fee_required: "section-personal",
  registration_fee_amount: "section-personal",
  fee_type: "section-personal",
  fee_direction: "section-personal",
  fee_status: "section-personal",

  job_applied: "section-education",
  target_job: "section-education",
  highest_education: "section-education",
  education: "section-education",
  english_level: "section-education",
  arabic_level: "section-education",
  experience_country: "section-education",
  experience_period: "section-education",
  years_of_experience: "section-education",
  height: "section-education",
  weight: "section-education",
  complexion: "section-education",
  monthly_salary: "section-education",
  salary_amount: "section-education",
  salary_currency: "section-education",
  skill_cleaning: "section-education",
  skill_cooking: "section-education",
  skill_washing: "section-education",
  skill_ironing: "section-education",
  skill_baby_sitting: "section-education",
  skill_children_care: "section-education",
  skill_arabic_cooking: "section-education",
  skill_elderly_care: "section-education",
  skill_driving: "section-education",
  skill_sewing: "section-education",
  video_url: "section-education",
  intro_video: "section-education",

  national_id: "section-identification",
  labor_id: "section-identification",
  labour_id: "section-identification",
  contact_person_name: "section-identification",
  contact_person_phone: "section-identification",
  emergency_relationship: "section-identification",
  emergency_contact_name: "section-identification",
  emergency_contact_phone: "section-identification",
  applicant_address: "section-identification",

  medical_status: "section-medical",
  medical_issue_date: "section-medical",
  medical_expiry_date: "section-medical",
  coc_status: "section-medical",
  exam_date: "section-medical",
  medical_remarks: "section-medical",
  remarks: "section-medical",
};

// Friendly user-facing field titles in simple English
const FIELD_FRIENDLY_NAMES: Record<string, string> = {
  first_name: "First Name",
  middle_name: "Father's Name (Middle Name)",
  last_name: "Grandfather's Name (Last Name)",
  gender: "Gender",
  date_of_birth: "Date of Birth",
  religion: "Religion",
  marital_status: "Marital Status",
  children: "Number of Children",
  nationality: "Nationality",
  destination_country: "Destination Country",
  applicant_type: "Applicant Type",
  photo_passport: "Passport Photo",
  profile_photo_url: "Passport Photo",
  photograph: "Passport Photo",
  photo_full_body: "Full-Body Photo",
  passport_scan: "Passport Scan Copy",
  passport_number: "Passport Number",
  passport_issue_date: "Passport Issue Date",
  passport_expiry: "Passport Expiry Date",
  place_of_birth: "Place of Birth",
  city: "City",
  country: "Country",
  phone_number: "Primary Phone Number",
  job_applied: "Job Position",
  highest_education: "Education Level",
  english_level: "English Level",
  arabic_level: "Arabic Level",
  monthly_salary: "Monthly Salary",
  national_id: "National ID (Fayda)",
  contact_person_name: "Emergency Contact Name",
  contact_person_phone: "Emergency Contact Phone",
  emergency_relationship: "Emergency Relationship",
  medical_status: "Medical Status",
};

function formatSimpleErrorMessage(fieldName: string, rawMessage?: string): string {  const title = FIELD_FRIENDLY_NAMES[fieldName] || fieldName.replace(/_/g, " ");
  if (!rawMessage || rawMessage.toLowerCase().includes("required") || rawMessage.toLowerCase().includes("at least 1")) {
    return `${title} is required. Please enter or select ${title}.`;
  }
  if (rawMessage.toLowerCase().includes("invalid enum") || rawMessage.toLowerCase().includes("expected")) {
    return `Please select a valid option for ${title}.`;
  }
  return rawMessage;
}

// Core identity fields locked server-side once an active Placement is in flight (#13)
const IDENTITY_FIELDS = [
  "full_name",
  "first_name",
  "middle_name",
  "last_name",
  "passport_number",
  "passport_expiry_date",
  "passport_expiry",
  "date_of_birth",
  "gender",
  "destination_country",
  "applicant_type",
  "entry_track",
  "nationality",
];

function stripLockedIdentityFields<T extends Record<string, any>>(
  payload: T,
  locked: boolean
): T {
  if (!locked || !payload || typeof payload !== "object") return payload;
  const result: Record<string, any> = { ...payload };
  for (const field of IDENTITY_FIELDS) {
    delete result[field];
  }
  return result as T;
}

export function ApplicantRegistrationForm({
  initialData,
  existingApplicantId,
  lockedIdentityFields = false,
  onSuccessRedirect,
}: ApplicantRegistrationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draftApplicantId, setDraftApplicantId] = React.useState<string | null>(
    existingApplicantId || null
  );
  const [applicantState, setApplicantState] = React.useState<string>("Draft");
  const [activeSection, setActiveSection] = React.useState<string>("section-personal");

  // Session-level guard: once the fee is successfully logged (in this form session),
  // never attempt to log it again regardless of stale initialData.
  const feeAlreadyLoggedRef = React.useRef<boolean>(
    Boolean(
      initialData?.fee_transaction ||
      (initialData?.fee_status && initialData.fee_status !== "Pending") ||
      (initialData as any)?.registration_fee_status === "Paid"
    )
  );

  // Dialog state
  const [isConfirmRegisterOpen, setIsConfirmRegisterOpen] = React.useState(false);

  // React Hook Form
  const form = useForm<BaseApplicantFormValues>({
    mode: "onBlur",
    defaultValues: {
      applicant_type: (initialData?.applicant_type as any) || "Standard",
      first_name: initialData?.first_name || "",
      middle_name: initialData?.middle_name || "",
      last_name: initialData?.last_name || "",
      gender: initialData?.gender || "",
      religion: initialData?.religion || "",
      marital_status: initialData?.marital_status || "",
      children: initialData?.children ?? 0,
      nationality: initialData?.nationality || "Ethiopia",
      destination_country: initialData?.destination_country || "Saudi Arabia",
      phone_number: initialData?.phone_number || "",
      alternate_phone: initialData?.alternate_phone || "",
      email: initialData?.email || "",
      city: initialData?.city || "",
      country: initialData?.country || "Ethiopia",
      region: initialData?.region || "",
      sub_region: initialData?.sub_region || "",
      address_line_1: initialData?.address_line_1 || "",
      date_of_birth: initialData?.date_of_birth || "",
      passport_number: initialData?.passport_number || "",
      passport_issue_date: initialData?.passport_issue_date || "",
      passport_expiry: initialData?.passport_expiry || initialData?.passport_expiry_date || "",
      place_of_issue: initialData?.place_of_issue || initialData?.passport_issue_place || "",
      job_applied: initialData?.job_applied || initialData?.target_job || "House worker",
      target_job: initialData?.target_job || initialData?.job_applied || "House worker",
      highest_education: initialData?.highest_education || initialData?.education || "",
      education: initialData?.education || initialData?.highest_education || "",
      institution: initialData?.institution || "",
      graduation_year: initialData?.graduation_year ?? undefined,
      current_employer: initialData?.current_employer || "",
      years_of_experience: initialData?.years_of_experience ?? undefined,
      english_level: initialData?.english_level || "",
      arabic_level: initialData?.arabic_level || "",
      experience_country: initialData?.experience_country || "",
      experience_period: initialData?.experience_period || "",
      monthly_salary: initialData?.monthly_salary || (initialData?.salary_amount ? String(initialData.salary_amount) : "1000"),
      salary_amount: initialData?.salary_amount || (initialData?.monthly_salary ? Number(initialData.monthly_salary) : 1000),
      salary_currency: initialData?.salary_currency || "SAR",
      complexion: initialData?.complexion || "FAIR",
      skill_cleaning:
        initialData?.skill_cleaning !== undefined
          ? initialData.skill_cleaning === 1 ||
            initialData.skill_cleaning === "1" ||
            initialData.skill_cleaning === "YES" ||
            initialData.skill_cleaning === true
            ? 1
            : 0
          : initialData?.job_applied?.toLowerCase().includes("driver")
          ? 0
          : 1,
      skill_cooking:
        initialData?.skill_cooking === 1 ||
        initialData?.skill_cooking === "1" ||
        initialData?.skill_cooking === "YES" ||
        initialData?.skill_cooking === true
          ? 1
          : 0,
      skill_washing:
        initialData?.skill_washing !== undefined
          ? initialData.skill_washing === 1 ||
            initialData.skill_washing === "1" ||
            initialData.skill_washing === "YES" ||
            initialData.skill_washing === true
            ? 1
            : 0
          : initialData?.job_applied?.toLowerCase().includes("driver")
          ? 0
          : 1,
      skill_ironing:
        initialData?.skill_ironing === 1 ||
        initialData?.skill_ironing === "1" ||
        initialData?.skill_ironing === "YES" ||
        initialData?.skill_ironing === true
          ? 1
          : 0,
      skill_baby_sitting:
        initialData?.skill_baby_sitting === 1 ||
        initialData?.skill_baby_sitting === "1" ||
        initialData?.skill_baby_sitting === "YES" ||
        initialData?.skill_baby_sitting === true
          ? 1
          : 0,
      skill_children_care:
        initialData?.skill_children_care === 1 ||
        initialData?.skill_children_care === "1" ||
        initialData?.skill_children_care === "YES" ||
        initialData?.skill_children_care === true
          ? 1
          : 0,
      skill_arabic_cooking:
        initialData?.skill_arabic_cooking === 1 ||
        initialData?.skill_arabic_cooking === "1" ||
        initialData?.skill_arabic_cooking === "YES" ||
        initialData?.skill_arabic_cooking === true
          ? 1
          : 0,
      skill_sewing:
        initialData?.skill_sewing === 1 ||
        initialData?.skill_sewing === "1" ||
        initialData?.skill_sewing === "YES" ||
        initialData?.skill_sewing === true
          ? 1
          : 0,
      skill_elderly_care:
        initialData?.skill_elderly_care === 1 ||
        initialData?.skill_elderly_care === "1" ||
        initialData?.skill_elderly_care === "YES" ||
        initialData?.skill_elderly_care === true
          ? 1
          : 0,
      skill_driving:
        initialData?.skill_driving !== undefined
          ? initialData.skill_driving === 1 ||
            initialData.skill_driving === "1" ||
            initialData.skill_driving === "YES" ||
            initialData.skill_driving === true
            ? 1
            : 0
          : initialData?.job_applied?.toLowerCase().includes("driver")
          ? 1
          : 0,
      labour_id: initialData?.labour_id || "",
      national_id: initialData?.national_id || "",
      contact_person_name:
        initialData?.contact_person_name ||
        (initialData?.applicant_type === "Muayena" ? "Muayena" : ""),
      contact_person_phone: initialData?.contact_person_phone || "",
      emergency_contact_name: initialData?.emergency_contact_name || "",
      emergency_contact_phone: initialData?.emergency_contact_phone || "",
      emergency_relationship:
        initialData?.emergency_relationship ||
        (initialData?.applicant_type === "Muayena" ? "Muayena / Sponsor" : ""),
      coc_status: initialData?.coc_status || "",
      exam_date: initialData?.exam_date || "",
      medical_status: initialData?.medical_status || "",
      medical_issue_date: initialData?.medical_issue_date || "",
      medical_expiry_date: initialData?.medical_expiry_date || "",
      remarks: initialData?.remarks || "",
      medical_remarks: initialData?.medical_remarks || "",
      education_remarks: initialData?.education_remarks || "",
      fee_required: initialData?.fee_required || false,
      registration_fee_amount: initialData?.registration_fee_amount || 0,
      fee_transaction: initialData?.fee_transaction || "",
      fee_status: initialData?.fee_status || "Pending",
      profile_photo_url: initialData?.profile_photo_url || initialData?.photograph || "",
      photo_passport: initialData?.photo_passport || initialData?.photograph || "",
      photograph: initialData?.photograph || initialData?.photo_passport || initialData?.profile_photo_url || "",
      photo_full_body: initialData?.photo_full_body || "",
      passport_scan: initialData?.passport_scan || "",
    },
  });

  const { getValues, setError, clearErrors, reset } = form;

  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const normalizedInit = normalizeApplicantFields(initialData);
      reset({
        ...getValues(),
        ...normalizedInit,
        job_applied: normalizedInit.job_applied || normalizedInit.target_job || getValues("job_applied") || "House worker",
        target_job: normalizedInit.target_job || normalizedInit.job_applied || getValues("target_job") || "House worker",
        highest_education: normalizedInit.highest_education || normalizedInit.education || getValues("highest_education") || "High School",
        education: normalizedInit.education || normalizedInit.highest_education || getValues("education") || "High School",
        monthly_salary: normalizedInit.monthly_salary || (normalizedInit.salary_amount ? String(normalizedInit.salary_amount) : getValues("monthly_salary") || "1000"),
        salary_amount: normalizedInit.salary_amount || (normalizedInit.monthly_salary ? Number(normalizedInit.monthly_salary) : getValues("salary_amount") || 1000),
        salary_currency: normalizedInit.salary_currency || getValues("salary_currency") || "SAR",
        complexion: normalizedInit.complexion || getValues("complexion") || "FAIR",
        fee_transaction: normalizedInit.fee_transaction || initialData?.fee_transaction || getValues("fee_transaction") || "",
        fee_status: normalizedInit.fee_status || initialData?.fee_status || getValues("fee_status") || "Pending",
        photograph: normalizedInit.photograph || normalizedInit.photo_passport || normalizedInit.profile_photo_url || normalizedInit.photo_full_body || getValues("photograph") || "",
        photo_passport: normalizedInit.photo_passport || normalizedInit.photograph || normalizedInit.profile_photo_url || normalizedInit.photo_full_body || getValues("photo_passport") || "",
      });
      if (existingApplicantId) {
        setDraftApplicantId(existingApplicantId);
      }
    }
  }, [initialData, existingApplicantId]);

  // Smooth scroll directly to input element on error & switch active section
  const scrollToFieldWithError = (fieldName?: string) => {
    if (!fieldName) return;
    const targetSection = FIELD_TO_SECTION_MAP[fieldName] || "section-personal";
    setActiveSection(targetSection);

    const findFieldElement = (name: string): HTMLElement | null => {
      // Direct ID or trigger or wrapper
      const candidates = [
        `trigger-${name}`,
        `select-wrapper-${name}`,
        name,
        `field-${name}`,
        `input-${name}`,
      ];
      for (const id of candidates) {
        const found = document.getElementById(id);
        if (found) return found;
      }
      const byName = document.querySelector<HTMLElement>(`[name="${name}"]`);
      if (byName) return byName;
      const byData = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
      if (byData) return byData;

      // Specialized aliases for photos and document scans
      if (name === "photo_passport" || name === "profile_photo_url" || name === "photograph") {
        return (
          document.getElementById("field-photo_passport") ||
          document.getElementById("profile-photo-upload")?.closest("label") ||
          document.getElementById("profile-photo-upload") ||
          null
        );
      }
      if (name === "photo_full_body") {
        return (
          document.getElementById("field-photo_full_body") ||
          document.getElementById("fullbody-photo-upload")?.closest("label") ||
          document.getElementById("fullbody-photo-upload") ||
          null
        );
      }
      if (name === "passport_scan") {
        return (
          document.getElementById("field-passport_scan") ||
          document.getElementById("passport-auto-scan-input")?.closest("label") ||
          document.getElementById("passport-auto-scan-input") ||
          null
        );
      }
      return null;
    };

    const targetEl = findFieldElement(fieldName);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

      // Focus the input if focusable
      setTimeout(() => {
        if (typeof targetEl.focus === "function" && targetEl.tagName !== "DIV") {
          targetEl.focus({ preventScroll: true });
        } else {
          const child = targetEl.querySelector<HTMLElement>("input, select, textarea, button");
          child?.focus({ preventScroll: true });
        }
      }, 50);

      // Add prominent red ring animation
      targetEl.classList.add(
        "ring-4",
        "ring-rose-500",
        "ring-offset-2",
        "bg-rose-50/70",
        "dark:bg-rose-950/40",
        "transition-all",
        "duration-500"
      );
      setTimeout(() => {
        targetEl.classList.remove(
          "ring-4",
          "ring-rose-500",
          "ring-offset-2",
          "bg-rose-50/70",
          "dark:bg-rose-950/40"
        );
      }, 5000);
    } else {
      const secEl = document.getElementById(targetSection);
      if (secEl) {
        secEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  // 1. SAVE DRAFT MUTATION
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      clearErrors();
      const formData = getValues();
      const validation = stage1DraftSchema.safeParse(formData);

      if (!validation.success) {
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof BaseApplicantFormValues, {
              type: "manual",
              message: err.message,
            });
          }
        });

        const firstError = validation.error.errors[0];
        const errorField = firstError?.path[0] as string;
        scrollToFieldWithError(errorField);

        const friendlyMsg = formatSimpleErrorMessage(errorField, firstError?.message);
        throw new Error(friendlyMsg || "Please fill in all required fields marked in red.");
      }

      const payload = normalizeApplicantFields(
        stripLockedIdentityFields(
          {
            ...formData,
            full_name: `${formData.first_name || ""} ${formData.middle_name || ""} ${formData.last_name || ""}`.trim() || formData.first_name || "Applicant",
            gender: (formData.gender as "Male" | "Female" | "Other") || "Female",
            nationality: formData.nationality || "Ethiopia",
            entry_track: (formData.applicant_type as "Standard" | "Muayena") || "Standard",
            destination_country: formData.destination_country || "Saudi Arabia",
            target_job: formData.target_job || formData.job_applied || "House worker",
            job_applied: formData.job_applied || formData.target_job || "House worker",
            education: formData.education || formData.highest_education || "High School",
            highest_education: formData.highest_education || formData.education || "High School",
            salary_amount: Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000,
            monthly_salary: String(Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000),
            salary_currency: formData.salary_currency || "SAR",
            photograph: formData.photograph || formData.photo_passport || formData.profile_photo_url || formData.photo_full_body || "",
          },
          lockedIdentityFields
        )
      );

      let res;
      if (draftApplicantId) {
        res = await updateApplicantV2(draftApplicantId, payload);
      } else {
        res = await createApplicantV2(payload);
      }

      const activeId = res?.name || draftApplicantId;
      const isFeeAlreadyLoggedOnDraft =
        feeAlreadyLoggedRef.current ||
        Boolean(
          formData.fee_transaction ||
          (formData.fee_status && formData.fee_status !== "Pending") ||
          initialData?.fee_transaction ||
          (initialData?.fee_status && initialData.fee_status !== "Pending") ||
          (initialData as any)?.registration_fee_status === "Paid"
        );
      if (activeId && !isFeeAlreadyLoggedOnDraft && (formData.fee_required || (formData.registration_fee_amount && Number(formData.registration_fee_amount) > 0))) {
        try {
          await logApplicantFeeV2(activeId);
          feeAlreadyLoggedRef.current = true;
        } catch (feeErr: any) {
          if (String(feeErr?.message || "").includes("already logged")) {
            feeAlreadyLoggedRef.current = true;
          } else {
            console.warn("Auto-log applicant fee on draft save:", feeErr);
          }
        }
      }
      return res;
    },
    onSuccess: (data) => {
      const savedName = data.name || draftApplicantId;
      if (savedName) setDraftApplicantId(savedName);
      setApplicantState(data.status || data.applicant_state || "Draft");
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(`Draft Saved Successfully (ID: ${savedName || ""})`, {
        description: "Applicant record saved. Redirecting to details...",
      });
      if (onSuccessRedirect && savedName) {
        onSuccessRedirect(savedName);
      } else if (savedName) {
        router.push(`/applicants/${encodeURIComponent(savedName)}`);
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiV2Error;
      toast.error("Cannot Save Draft", {
        description: err.message || "Please fill in all Stage 1 required fields.",
        duration: 5000,
      });
    },
  });

  // DIRECT SAVE / UPDATE CHANGES (FOR EDIT MODE)
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      if (!draftApplicantId) throw new Error("No applicant ID available to update.");
      const formData = getValues();
      const payload = normalizeApplicantFields(
        stripLockedIdentityFields(
          {
            ...formData,
            full_name: `${formData.first_name || ""} ${formData.middle_name || ""} ${formData.last_name || ""}`.trim() || formData.first_name || "Applicant",
            target_job: formData.target_job || formData.job_applied || "House worker",
            job_applied: formData.job_applied || formData.target_job || "House worker",
            education: formData.education || formData.highest_education || "High School",
            highest_education: formData.highest_education || formData.education || "High School",
            salary_amount: Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000,
            monthly_salary: String(Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000),
            salary_currency: formData.salary_currency || "SAR",
            photograph: formData.photograph || formData.photo_passport || formData.profile_photo_url || formData.photo_full_body || "",
          },
          lockedIdentityFields
        )
      );
      const res = await updateApplicantV2(draftApplicantId, payload);
      const isFeeAlreadyLoggedOnSave =
        feeAlreadyLoggedRef.current ||
        Boolean(
          formData.fee_transaction ||
          (formData.fee_status && formData.fee_status !== "Pending") ||
          initialData?.fee_transaction ||
          (initialData?.fee_status && initialData.fee_status !== "Pending") ||
          (initialData as any)?.registration_fee_status === "Paid"
        );
      if (!isFeeAlreadyLoggedOnSave && (formData.fee_required || (formData.registration_fee_amount && Number(formData.registration_fee_amount) > 0))) {
        try {
          await logApplicantFeeV2(draftApplicantId);
          feeAlreadyLoggedRef.current = true;
        } catch (feeErr: any) {
          if (String(feeErr?.message || "").includes("already logged")) {
            feeAlreadyLoggedRef.current = true;
          } else {
            console.warn("Auto-log applicant fee on save changes:", feeErr);
          }
        }
      }
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", draftApplicantId] });
      toast.success("Applicant changes saved successfully!", {
        description: "All profile details and official CV have been updated.",
      });
      if (onSuccessRedirect && draftApplicantId) {
        onSuccessRedirect(draftApplicantId);
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiV2Error;
      toast.error("Failed to save changes", {
        description: err.message || "Please check the entered values.",
      });
    },
  });

  // 2. REGISTER APPLICANT MUTATION
  const registerMutation = useMutation({
    mutationFn: async () => {
      clearErrors();
      const formData = getValues();

      const validation = stage2RegistrationSchema.safeParse(formData);
      if (!validation.success) {
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof BaseApplicantFormValues, {
              type: "manual",
              message: err.message,
            });
          }
        });

        const firstError = validation.error.errors[0];
        const firstField = firstError?.path[0] as string;
        scrollToFieldWithError(firstField);

        throw new Error(firstError?.message || "Please complete all registration requirements.");
      }

      let activeId = draftApplicantId;
      const payload = normalizeApplicantFields(
        stripLockedIdentityFields(
          {
            ...formData,
            full_name: `${formData.first_name || ""} ${formData.middle_name || ""} ${formData.last_name || ""}`.trim() || formData.first_name || "Applicant",
            gender: (formData.gender as "Male" | "Female" | "Other") || "Female",
            nationality: formData.nationality || "Ethiopia",
            entry_track: (formData.applicant_type as "Standard" | "Muayena") || "Standard",
            destination_country: formData.destination_country || "Saudi Arabia",
            target_job: formData.target_job || formData.job_applied || "House worker",
            job_applied: formData.job_applied || formData.target_job || "House worker",
            education: formData.education || formData.highest_education || "High School",
            highest_education: formData.highest_education || formData.education || "High School",
            salary_amount: Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000,
            monthly_salary: String(Number(formData.salary_amount) > 0 ? Number(formData.salary_amount) : Number(formData.monthly_salary) > 0 ? Number(formData.monthly_salary) : 1000),
            salary_currency: formData.salary_currency || "SAR",
            photograph: formData.photograph || formData.photo_passport || formData.profile_photo_url || formData.photo_full_body || "",
          },
          lockedIdentityFields
        )
      );

      if (!activeId) {
        const draft = await createApplicantV2(payload);
        activeId = draft.name || "";
        setDraftApplicantId(activeId);
      } else {
        await updateApplicantV2(activeId, payload);
      }

      const regRes = await registerApplicantV2(activeId);
      const isFeeAlreadyLoggedOnRegister =
        feeAlreadyLoggedRef.current ||
        Boolean(
          formData.fee_transaction ||
          (formData.fee_status && formData.fee_status !== "Pending") ||
          initialData?.fee_transaction ||
          (initialData?.fee_status && initialData.fee_status !== "Pending") ||
          (initialData as any)?.registration_fee_status === "Paid"
        );
      if (activeId && !isFeeAlreadyLoggedOnRegister && (formData.fee_required || (formData.registration_fee_amount && Number(formData.registration_fee_amount) > 0))) {
        try {
          await logApplicantFeeV2(activeId);
          feeAlreadyLoggedRef.current = true;
        } catch (feeErr: any) {
          if (String(feeErr?.message || "").includes("already logged")) {
            feeAlreadyLoggedRef.current = true;
          } else {
            console.warn("Auto-log applicant fee on registration:", feeErr);
          }
        }
      }
      return { ...regRes, applicantId: activeId };
    },
    onSuccess: (data: any) => {
      const targetId = data?.applicantId || draftApplicantId || data?.name;
      setApplicantState("Registered");
      setIsConfirmRegisterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: ["applicant", targetId] });
      }
      toast.success(data?.message || "Applicant Successfully Registered!", {
        description: "Status transitioned to Registered. Redirecting to details...",
      });
      if (onSuccessRedirect && targetId) {
        onSuccessRedirect(targetId);
      } else if (targetId) {
        router.push(`/applicants/${encodeURIComponent(targetId)}`);
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiV2Error;
      setIsConfirmRegisterOpen(false);
      toast.error("Registration Requirement Not Met", {
        description: err.message || "Please check the highlighted required fields.",
        duration: 6000,
      });
    },
  });

  const handleRegisterClick = async () => {
    clearErrors();
    const formData = getValues();
    const validation = stage2RegistrationSchema.safeParse(formData);

    if (!validation.success) {
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          setError(err.path[0] as keyof BaseApplicantFormValues, {
            type: "manual",
            message: err.message,
          });
        }
      });

      const firstError = validation.error.errors[0];
      const errorField = firstError?.path[0] as string;

      scrollToFieldWithError(errorField);

      const simpleMsg = formatSimpleErrorMessage(errorField, firstError?.message);

      toast.error("Please complete the required information", {
        description: simpleMsg,
        duration: 6000,
      });
      return;
    }

    if (formData.medical_status === "UNFIT") {
      scrollToFieldWithError("medical_status");
      toast.error("Medical Status is Unfit", {
        description:
          "The applicant cannot be registered while medical status is Unfit. You can save as Draft until cleared.",
      });
      return;
    }

    setIsConfirmRegisterOpen(true);
  };

  const isSavingDraft = saveDraftMutation.isPending;
  const isRegistering = registerMutation.isPending;
  const isMedicalUnfit = form.watch("medical_status") === "UNFIT";
  const isRegistered = applicantState === "Registered" || applicantState === "CV Generated";

  return (
    <div className="space-y-6">
      {/* Edit Mode Top Banner */}
      {existingApplicantId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
              <Save className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Editing Applicant ({existingApplicantId})
              </div>
              <div className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                All sections are available on this page. Update any field and save your changes.
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => saveChangesMutation.mutate()}
            disabled={saveChangesMutation.isPending}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
          >
            {saveChangesMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sticky Section Quick-Jump Bar */}
      <div className="sticky top-2 z-20 w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#121215]/95 p-2 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-max">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? "bg-emerald-900 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}

          {draftApplicantId && (
            <div className="ml-auto pl-3 flex items-center gap-2 border-l border-slate-200 dark:border-[#222227]">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                ID: <strong className="text-slate-800 dark:text-zinc-200">{draftApplicantId}</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  isRegistered
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {applicantState}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Single Vertical Form Body */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
        {/* Section 1: Personal & Passport */}
        <section id="section-personal" className="scroll-mt-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-[#222227]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personal & Passport Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Passport OCR extraction, bio data, and official residential address.
              </p>
            </div>
          </div>
          <Step1PersonalInfo form={form} locked={lockedIdentityFields} />
        </section>

        {/* Section 2: Education & Skills */}
        <section id="section-education" className="scroll-mt-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-[#222227]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Education, Experience & Skills Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Academic qualifications, overseas experience, language proficiencies, and domestic skills.
              </p>
            </div>
          </div>
          <Step2EducationExperience form={form} />
        </section>

        {/* Section 3: National ID & Contacts */}
        <section id="section-identification" className="scroll-mt-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-[#222227]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              3
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                National Identification & Emergency Contacts
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Fayda / National ID, Ministry Labour ID, target profession, and emergency next of kin.
              </p>
            </div>
          </div>
          <Step3IdentificationContact form={form} />
        </section>

        {/* Section 4: Medical & COC */}
        <section id="section-medical" className="scroll-mt-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-[#222227]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              4
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Medical Fitness & COC Certification
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                GAMCA laboratory medical fitness result and Ministry COC examination certificate.
              </p>
            </div>
          </div>
          <Step4CocMedical form={form} />
        </section>

        {/* Sticky Bottom Action Toolbar */}
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#121215]/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            {draftApplicantId ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Record ID: <strong className="font-mono text-slate-800 dark:text-zinc-200">{draftApplicantId}</strong>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isRegistered
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {applicantState}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                New Applicant Registration Form
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* If in edit mode, provide Save Changes button */}
            {existingApplicantId ? (
              <Button
                type="button"
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
              >
                {saveChangesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </Button>
            ) : (
              /* Save Draft Action */
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={isSavingDraft || isRegistering}
                className="border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] hover:bg-slate-50 dark:hover:bg-[#1e1e26] text-slate-800 dark:text-zinc-200 font-medium text-xs shadow-xs"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving Draft...
                  </>
                ) : (
                  <>
                    <Bookmark className="mr-1.5 h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                    Save as Draft
                  </>
                )}
              </Button>
            )}

            {/* Register Applicant Action */}
            {!isRegistered && (
              <Button
                type="button"
                onClick={handleRegisterClick}
                disabled={isRegistering || isSavingDraft || isMedicalUnfit}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                    Register Applicant
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Registration Confirmation Dialog Modal */}
      <Dialog open={isConfirmRegisterOpen} onOpenChange={setIsConfirmRegisterOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <FileCheck2 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Confirm Applicant Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
              Are you sure you want to register this applicant? This will validate all Stage 1 & Stage 2 requirements and transition the record from <strong>Draft</strong> to <strong>Registered</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-100 dark:border-[#222227] bg-slate-50 dark:bg-[#16161b] p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Applicant:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {form.getValues("first_name")} {form.getValues("last_name")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Passport:</span>
              <span className="font-mono text-slate-900 dark:text-zinc-200">{form.getValues("passport_number")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Medical Status:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{form.getValues("medical_status")}</span>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmRegisterOpen(false)}
              className="dark:border-[#26262d] text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => registerMutation.mutate()}
              disabled={isRegistering}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Confirm & Register"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
