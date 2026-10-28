"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  FileCheck2,
  FileText,
  Loader2,
  Save,
  Camera,
  UploadCloud,
  Trash2,
  Video,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Globe2,
  User,
  Check,
  X,
  Lock,
  Building2,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  BaseApplicantFormValues,
  stage1DraftSchema,
  stage2RegistrationSchema,
  splitFullName,
  deriveFullName,
  GENDER_OPTIONS,
  RELIGION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  DESTINATION_COUNTRY_OPTIONS,
  PHONE_REGEX,
  PASSPORT_REGEX,
} from "@/lib/validations/applicant.schema";
import {
  parseISO,
  isValid,
  isPast,
  isFuture,
  startOfDay,
  differenceInYears,
  addMonths,
} from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createApplicantV2,
  updateApplicantV2,
  registerApplicantV2,
  uploadFileV2,
  parsePassportFileV2,
  normalizeApplicantFields,
  isExperiencedCountry,
  attachVideoToApplicantV2,
  startVideoUploadV2,
  finishVideoUploadV2,
  getApplicantMediaUrlV2,
  uploadVideoFileDirectly,
} from "@/lib/api/v2";
import { checkApplicantUniquenessV2 } from "@/lib/api/v2/applicants";
import { listContractorsV2 } from "@/lib/api/v2/contractors";
import { parseMRZText, ParsedPassportMRZ } from "@/lib/utils/mrzScanner";
import { PLACE_OF_BIRTH_OPTIONS } from "@/components/agent/CandidateFilters";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumDropzone } from "@/components/ui/PremiumDropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ApplicantRegistrationFormProps {
  initialData?: Partial<BaseApplicantFormValues>;
  existingApplicantId?: string;
  lockedIdentityFields?: boolean;
  onSuccessRedirect?: (applicantId: string) => void;
  readOnly?: boolean;
}

type MediaTabType = "photo" | "full_size" | "passport" | "video";

const PASSPORT_TYPE_OPTIONS = ["Normal", "Diplomatic", "Special", "Service"] as const;
const VISA_TYPE_OPTIONS = ["Work", "Visit", "Tourist", "Business", "Other"] as const;
const LANGUAGE_PROFICIENCY_OPTIONS = ["Select..", "None", "Basic", "Good", "Fluent"] as const;
const QUALIFICATION_OPTIONS = [
  "PRIMARY LEVEL",
  "SECONDARY LEVEL",
  "HIGH SCHOOL",
  "DIPLOMA",
  "BACHELOR'S DEGREE",
  "MASTER'S DEGREE",
  "OTHER",
] as const;
const OCCUPATION_OPTIONS = [
  "HOUSE WORKER",
  "DOMESTIC WORKER",
  "DRIVER",
  "COOK",
  "GENERAL CAREGIVER",
  "CLEANER",
  "BABYSITTER",
  "OTHER",
] as const;
const RELATIVE_KINSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Spouse",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Child",
  "Other",
] as const;
const EXPERIENCE_ABROAD_OPTIONS = [
  "None / First Time",
  "Saudi Arabia",
  "Kuwait",
  "United Arab Emirates",
  "Qatar",
  "Oman",
  "Jordan",
  "Lebanon",
  "Bahrain",
  "Other",
] as const;

// Fields locked when an active placement is running (per T18: only destination, track, and applicant_type stay locked; name, passport, DOB, expiry, gender, and nationality can be corrected)
const IDENTITY_FIELDS = [
  "destination_country",
  "applicant_type",
  "entry_track",
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
  readOnly: readOnlyProp,
}: ApplicantRegistrationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authUser, can, roles } = useAuth();

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase().trim()) : [];
  const isManagerOrAdmin = userRoles.some((r) =>
    ["administrator", "system manager", "admin", "manager", "operations manager", "operation manager"].includes(r)
  );
  const canRegisterOrEdit = Boolean(can("registerApplicant") || isManagerOrAdmin);
  const isFormReadOnly = Boolean(readOnlyProp || (existingApplicantId && !canRegisterOrEdit));

  const [draftApplicantId, setDraftApplicantId] = React.useState<string | null>(
    existingApplicantId || (initialData as any)?.name || (initialData as any)?.applicant_id || null
  );
  const [applicantState, setApplicantState] = React.useState<string>(
    (initialData as any)?.status || (initialData as any)?.applicant_state || "Draft"
  );

  // Active top media tab
  const [activeMediaTab, setActiveMediaTab] = React.useState<MediaTabType>("photo");
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);

  // Passport Scanner & MRZ dialog states
  const [isScanningOCR, setIsScanningOCR] = React.useState(false);
  const [isMrzDialogOpen, setIsMrzDialogOpen] = React.useState(false);
  const [mrzInputText, setMrzInputText] = React.useState("");
  const [ocrSuccessData, setOcrSuccessData] = React.useState<ParsedPassportMRZ | null>(null);
  const [pobMissingFromScan, setPobMissingFromScan] = React.useState(false);
  const isOcrCancelledRef = React.useRef(false);
  const activeOcrToastIdRef = React.useRef<string | number | null>(null);
  const [isSponsorAddrReadOnly, setIsSponsorAddrReadOnly] = React.useState(true);

  const handleCancelPassportScan = () => {
    isOcrCancelledRef.current = true;
    setIsScanningOCR(false);
    if (activeOcrToastIdRef.current) {
      toast.dismiss(activeOcrToastIdRef.current);
      activeOcrToastIdRef.current = null;
    }
    toast.info("Passport extraction cancelled.");
  };

  // Collapsible Accordions state (as in video)
  const [isRelativeOpen, setIsRelativeOpen] = React.useState<boolean>(false);
  const [isOtherInfoOpen, setIsOtherInfoOpen] = React.useState<boolean>(false);
  const [isSkillsOpen, setIsSkillsOpen] = React.useState<boolean>(true);

  // Dialog state
  const [isConfirmRegisterOpen, setIsConfirmRegisterOpen] = React.useState(false);

  // Live duplicate passport & national ID feedback
  const [passportConflict, setPassportConflict] = React.useState<string | null>(null);
  const [nationalIdConflict, setNationalIdConflict] = React.useState<string | null>(null);

  // Registered Foreign Contractor Agents query
  const { data: contractors = [] } = useQuery({
    queryKey: ["foreign-contractors-registered"],
    queryFn: () => listContractorsV2(),
    staleTime: 60_000,
  });

  // Initial full_name derivation
  const initFullName =
    initialData?.full_name ||
    deriveFullName(
      initialData?.first_name || "",
      initialData?.middle_name || "",
      initialData?.last_name || ""
    );

  const form = useForm<BaseApplicantFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    // @ts-expect-error zodResolver type widening across optional schema fields
    resolver: zodResolver(stage2RegistrationSchema),
    defaultValues: {
      applicant_type:
        (initialData as any)?.entry_track === "Muayena" ||
        (initialData?.applicant_type as any) === "Muayena" ||
        Boolean((initialData as any)?.is_muayena)
          ? "Muayena"
          : "Standard",
      entry_track:
        (initialData as any)?.entry_track === "Muayena" ||
        (initialData?.applicant_type as any) === "Muayena" ||
        Boolean((initialData as any)?.is_muayena)
          ? "Muayena"
          : "Standard",
      muayena_agency: (initialData as any)?.muayena_agency || (initialData as any)?.active_placement?.contractor || "",
      destination_country: initialData?.destination_country || "Saudi Arabia",
      application_number:
        (initialData as any)?.application_number ||
        (initialData as any)?.injaz_application_id ||
        (initialData as any)?.e_number ||
        (initialData as any)?.active_placement?.injaz_application_id ||
        draftApplicantId ||
        "",
      full_name: initFullName,
      first_name: initialData?.first_name || "",
      middle_name: initialData?.middle_name || "",
      last_name: initialData?.last_name || "",
      gender: initialData?.gender || "Female",
      religion: (initialData?.religion as string) === "Islam" ? "Muslim" : initialData?.religion || "Muslim",
      marital_status: initialData?.marital_status || "Single",
      children: initialData?.children ?? 0,
      nationality: initialData?.nationality || "Ethiopia",
      phone_number: initialData?.phone_number || (initialData as any)?.phone || "",
      city: initialData?.city || "",
      country: initialData?.country || "Ethiopia",
      region: initialData?.region || "",
      sub_region: initialData?.sub_region || "",
      address_line_1: initialData?.address_line_1 || (initialData as any)?.address || "",
      date_of_birth: initialData?.date_of_birth || "",
      place_of_birth: initialData?.place_of_birth || "",
      passport_number: initialData?.passport_number || "",
      passport_issue_date: initialData?.passport_issue_date || "",
      passport_expiry: initialData?.passport_expiry || initialData?.passport_expiry_date || "",
      place_of_issue: initialData?.place_of_issue || initialData?.passport_issue_place || "ADDIS ABABA",
      passport_type: (initialData as any)?.passport_type || "Normal",
      job_applied: initialData?.job_applied || initialData?.target_job || "HOUSE WORKER",
      target_job: initialData?.target_job || initialData?.job_applied || "HOUSE WORKER",
      highest_education: (initialData as any)?.qualification || initialData?.highest_education || initialData?.education || "SECONDARY LEVEL",
      education: (initialData as any)?.qualification || initialData?.education || initialData?.highest_education || "SECONDARY LEVEL",
      monthly_salary: initialData?.monthly_salary || (initialData?.salary_amount ? String(initialData.salary_amount) : (initialData?.experience_country && isExperiencedCountry(initialData.experience_country) ? "1200" : "1000")),
      salary_amount: initialData?.salary_amount || (initialData?.monthly_salary ? Number(initialData.monthly_salary) : (initialData?.experience_country && isExperiencedCountry(initialData.experience_country) ? 1200 : 1000)),
      salary_currency: initialData?.salary_currency || "SAR",
      photograph: initialData?.photograph || initialData?.photo_passport || initialData?.profile_photo_url || "",
      photo_passport: initialData?.photo_passport || initialData?.photograph || initialData?.profile_photo_url || "",
      profile_photo_url: initialData?.profile_photo_url || initialData?.photograph || "",
      photo_full_body: initialData?.photo_full_body || "",
      passport_scan: initialData?.passport_scan || "",
      video_url: initialData?.video_url || (initialData as any)?.intro_video || (initialData as any)?.video || "",
      intro_video: initialData?.video_url || (initialData as any)?.intro_video || (initialData as any)?.video || "",
      video: initialData?.video_url || (initialData as any)?.intro_video || (initialData as any)?.video || "",
      is_active: (initialData as any)?.is_active ?? true,
      registration_date: (initialData as any)?.registration_date || new Date().toISOString().slice(0, 10),

      // Sponsor & Visa
      visa_number: (initialData as any)?.visa_number || (initialData as any)?.placement?.visa_number || (initialData as any)?.active_placement?.visa_number || (initialData as any)?.visa_reference_number || "",
      sponsor_name: (initialData as any)?.sponsor_name || (initialData as any)?.employer_name || (initialData as any)?.placement?.employer_name || (initialData as any)?.active_placement?.employer_name || "",
      sponsor_id: (initialData as any)?.sponsor_id || (initialData as any)?.employer_national_id || (initialData as any)?.sponsor_civil_id || (initialData as any)?.placement?.employer_national_id || (initialData as any)?.active_placement?.employer_national_id || "",
      sponsor_phone: (initialData as any)?.sponsor_phone || (initialData as any)?.employer_phone || (initialData as any)?.placement?.employer_phone || (initialData as any)?.active_placement?.employer_phone || "",
      sponsor_address: (initialData as any)?.sponsor_address || (initialData as any)?.employer_address || (initialData as any)?.placement?.employer_address || (initialData as any)?.active_placement?.employer_address || "",
      agent: (initialData as any)?.agent || (initialData as any)?.saudi_agency_name || (initialData as any)?.kuwait_agency_name || (initialData as any)?.contractor_name || (initialData as any)?.placement?.saudi_agency_name || "",
      national_id: initialData?.national_id || "",
      sponsor_arabic: (initialData as any)?.sponsor_arabic || "",
      email: initialData?.email || "",
      visa_type: (initialData as any)?.visa_type || "Work",

      // Relative Info
      relative_name: (initialData as any)?.relative_name || initialData?.emergency_contact_name || initialData?.contact_person_name || "",
      relative_phone: (initialData as any)?.relative_phone || initialData?.emergency_contact_phone || initialData?.contact_person_phone || "",
      relative_kinship: (initialData as any)?.relative_kinship || initialData?.emergency_relationship || "Mother",
      emergency_contact_name: initialData?.emergency_contact_name || (initialData as any)?.relative_name || "",
      emergency_contact_phone: initialData?.emergency_contact_phone || (initialData as any)?.relative_phone || "",
      emergency_relationship: initialData?.emergency_relationship || (initialData as any)?.relative_kinship || "Mother",
      address_region: (initialData as any)?.address_region || "",
      relative_woreda: (initialData as any)?.relative_woreda || "",
      relative_house_no: (initialData as any)?.relative_house_no || "",
      relative_gender: (initialData as any)?.relative_gender || "Female",
      r_birth_date: (initialData as any)?.r_birth_date || "",

      // Other Info
      woreda: (initialData as any)?.woreda || "",
      house_no: (initialData as any)?.house_no || initialData?.address_line_1 || "",
      file_no: (initialData as any)?.file_no || "",
      contract_number: (initialData as any)?.contract_number || "",
      wakala_number: (initialData as any)?.wakala_number || (initialData as any)?.wakala_no || "",
      sticker_visa_number: (initialData as any)?.sticker_visa_number || "",
      signed_on: (initialData as any)?.signed_on || "",
      biometric_id: (initialData as any)?.biometric_id || "",
      labour_id: initialData?.labour_id || initialData?.labor_id || "",
      labor_id: initialData?.labor_id || initialData?.labour_id || "",
      contact_person_2nd: (initialData as any)?.contact_person_2nd || (initialData as any)?.second_contact_name || "",
      contact_phone_2nd: (initialData as any)?.contact_phone_2nd || (initialData as any)?.second_contact_phone || "",
      second_contact_name: (initialData as any)?.second_contact_name || (initialData as any)?.contact_person_2nd || "",
      second_contact_phone: (initialData as any)?.second_contact_phone || (initialData as any)?.contact_phone_2nd || "",
      second_contact_address: (initialData as any)?.second_contact_address || "",
      coc_center: (initialData as any)?.coc_center || "",
      certified_date: (initialData as any)?.certified_date || initialData?.exam_date || "",
      exam_date: initialData?.exam_date || (initialData as any)?.certified_date || "",
      certificate_no: (initialData as any)?.certificate_no || "",
      training_type: (initialData as any)?.training_type || "",
      photos_2: (initialData as any)?.photos_2 ?? false,
      is_filed: (initialData as any)?.is_filed ?? false,
      relative_id_card: (initialData as any)?.relative_id_card ?? false,

      // Skills & Experience
      english_level:
        initialData?.english_level && ["None", "Basic", "Good", "Fluent"].includes(initialData.english_level)
          ? initialData.english_level
          : initialData?.english_level === "Poor" || initialData?.english_level === "Fair"
          ? "Basic"
          : "None",
      arabic_level:
        initialData?.arabic_level && ["None", "Basic", "Good", "Fluent"].includes(initialData.arabic_level)
          ? initialData.arabic_level
          : initialData?.arabic_level === "Poor" || initialData?.arabic_level === "Fair"
          ? "Basic"
          : "None",
      experience_country: initialData?.experience_country && isExperiencedCountry(initialData.experience_country) ? initialData.experience_country : "",
      works_in: (initialData as any)?.works_in || "",
      height: initialData?.height || "",
      weight: initialData?.weight || "",
      complexion: (initialData as any)?.complexion || "FAIR",
      leaving_town: initialData?.leaving_town || "",
      reference_no: (initialData as any)?.reference_no || "",
      remarks: initialData?.remarks || "",
      skill_cleaning: initialData?.skill_cleaning !== undefined ? (Number(initialData.skill_cleaning) ? 1 : 0) : 1,
      skill_cooking: Number(initialData?.skill_cooking) ? 1 : 0,
      skill_washing: initialData?.skill_washing !== undefined ? (Number(initialData.skill_washing) ? 1 : 0) : 1,
      skill_ironing: Number(initialData?.skill_ironing) ? 1 : 0,
      skill_baby_sitting: Number(initialData?.skill_baby_sitting) ? 1 : 0,
      skill_children_care: Number(initialData?.skill_children_care) ? 1 : 0,
      skill_arabic_cooking: Number(initialData?.skill_arabic_cooking) ? 1 : 0,
      skill_sewing: Number(initialData?.skill_sewing) ? 1 : 0,

      // Medical gate
      medical_status: initialData?.medical_status || "Pending",
      medical_issue_date: initialData?.medical_issue_date || "",
      medical_expiry_date: initialData?.medical_expiry_date || "",
    },
  });

  const { register, watch, setValue, getValues, setError, clearErrors, reset, formState: { errors } } = form;

  // Track highlighted field for auto-scrolling & visual emphasis
  const [highlightedField, setHighlightedField] = React.useState<string | null>(null);

  // Helper to scroll to and highlight missing or invalid fields
  const scrollToAndHighlightField = React.useCallback((fieldName: string) => {
    if (!fieldName) return;

    // Expand accordions if target field is inside them
    const skillsFields = [
      "english_level",
      "arabic_level",
      "experience_country",
      "salary_amount",
      "monthly_salary",
      "works_in",
      "complexion",
      "height",
      "weight",
      "reference_no",
      "remarks",
    ];
    const relativeFields = [
      "relative_name",
      "relative_phone",
      "relative_kinship",
      "r_birth_date",
      "relative_gender",
      "address_region",
      "relative_woreda",
      "relative_house_no",
    ];
    const otherFields = [
      "region",
      "sub_region",
      "woreda",
      "house_no",
      "file_no",
      "contract_number",
      "wakala_number",
      "sticker_visa_number",
      "signed_on",
      "nationality",
      "biometric_id",
      "labor_id",
      "labour_id",
      "leaving_town",
      "contact_person_2nd",
      "contact_phone_2nd",
    ];

    if (skillsFields.includes(fieldName)) {
      setIsSkillsOpen(true);
    } else if (relativeFields.includes(fieldName)) {
      setIsRelativeOpen(true);
    } else if (otherFields.includes(fieldName)) {
      setIsOtherInfoOpen(true);
    } else if (fieldName === "passport_scan") {
      setActiveMediaTab("passport");
    } else if (fieldName === "photograph" || fieldName === "photo_passport" || fieldName === "profile_photo_url") {
      setActiveMediaTab("photo");
    } else if (fieldName === "photo_full_body") {
      setActiveMediaTab("full_size");
    } else if (fieldName === "video_url") {
      setActiveMediaTab("video");
    }

    setHighlightedField(fieldName);

    setTimeout(() => {
      const selector = `[name="${fieldName}"], #field-${fieldName}, #${fieldName}, [data-field="${fieldName}"]`;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof el.focus === "function") {
          el.focus();
        }
      }
    }, 120);

    setTimeout(() => {
      setHighlightedField((prev) => (prev === fieldName ? null : prev));
    }, 5000);
  }, []);

  // Helper to dynamically style inputs and dropdowns on error / highlight
  const getFieldClass = React.useCallback(
    (fieldName: string, baseExtra = "") => {
      const isError = Boolean(errors[fieldName as keyof BaseApplicantFormValues]);
      const isHighlighted = highlightedField === fieldName;
      if (isHighlighted) {
        return cn(
          baseExtra,
          "!border-rose-500 !ring-2 !ring-rose-500 shadow-md animate-pulse bg-rose-50/20 dark:bg-rose-950/20"
        );
      }
      if (isError) {
        return cn(baseExtra, "!border-rose-500 focus-visible:!ring-rose-500 !ring-1 !ring-rose-500/50");
      }
      return baseExtra;
    },
    [errors, highlightedField]
  );

  // Helper to render quick clear/unselect button on dropdowns
  const renderClearBtn = React.useCallback(
    (fieldName: keyof BaseApplicantFormValues) => {
      const val = watch(fieldName);
      if (!val) return null;
      return (
        <button
          type="button"
          onClick={() => {
            setValue(fieldName, "" as any, { shouldDirty: true, shouldValidate: true });
          }}
          className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition ml-auto flex items-center gap-0.5"
          title="Unselect"
        >
          <X className="h-2.5 w-2.5" />
          <span>Clear</span>
        </button>
      );
    },
    [watch, setValue]
  );

  // Immediate Real-Time Validation: validates fields as the user interacts rather than waiting for Register click
  const isMuayenaLive = watch("applicant_type") === "Muayena";

  const validateFieldLive = React.useCallback(
    (fieldName: string, value: any) => {
      if (fieldName === "phone_number") {
        const val = String(value ?? "").trim();
        if (!val) {
          // If untouched or empty, don't show error while user hasn't finished typing
        } else if (/[^\d+\s\-()]/.test(val)) {
          setError("phone_number", { type: "manual", message: "Phone number contains invalid characters (digits, +, - only)" });
        } else if (val.length > 18) {
          setError("phone_number", { type: "manual", message: "Phone Number cannot exceed 18 digits" });
        } else if (val.length >= 9 && PHONE_REGEX.test(val)) {
          clearErrors("phone_number");
        }
      } else if (fieldName === "passport_number") {
        const val = String(value ?? "").trim().toUpperCase();
        if (!val) {
          // Empty
        } else if (/[^A-Za-z0-9]/.test(val)) {
          setError("passport_number", { type: "manual", message: "Passport Number must only contain letters and numbers" });
        } else if (val.length > 9) {
          setError("passport_number", { type: "manual", message: "Passport Number must not exceed 9 characters" });
        } else if (val.length >= 7 && val.length <= 9 && PASSPORT_REGEX.test(val)) {
          if (!passportConflict) {
            clearErrors("passport_number");
          }
        }
      } else if (fieldName === "city") {
        const val = String(value ?? "").trim();
        if (val.length >= 2) {
          clearErrors("city");
        }
      } else if (fieldName === "date_of_birth") {
        const val = String(value ?? "").trim();
        if (val) {
          const parsed = parseISO(val);
          if (!isValid(parsed) || !isPast(startOfDay(parsed))) {
            setError("date_of_birth", { type: "manual", message: "Date of Birth cannot be today or in the future" });
          } else {
            const age = differenceInYears(new Date(), parsed);
            if (age < 18) {
              setError("date_of_birth", { type: "manual", message: "Applicant must be at least 18 years old for work abroad" });
            } else if (age > 65) {
              setError("date_of_birth", { type: "manual", message: "Applicant age must be 65 years or younger" });
            } else {
              clearErrors("date_of_birth");
            }
          }
        }
      } else if (fieldName === "passport_expiry" || fieldName === "passport_issue_date") {
        const expiryVal = String(getValues("passport_expiry") ?? "").trim();
        const issueVal = String(getValues("passport_issue_date") ?? "").trim();
        if (expiryVal) {
          const parsedExp = parseISO(expiryVal);
          if (!isValid(parsedExp) || !isFuture(startOfDay(parsedExp))) {
            setError("passport_expiry", { type: "manual", message: "Passport Expiry Date must be a future date" });
          } else if (startOfDay(parsedExp) < addMonths(startOfDay(new Date()), 6)) {
            setError("passport_expiry", { type: "manual", message: "Passport must be valid for at least 6 months from today" });
          } else if (issueVal && isValid(parseISO(issueVal)) && parseISO(expiryVal) <= parseISO(issueVal)) {
            setError("passport_expiry", { type: "manual", message: "Passport expiry date must be after the issue date" });
          } else {
            clearErrors("passport_expiry");
          }
        }
      } else if (fieldName === "medical_expiry_date" || fieldName === "medical_issue_date") {
        const medExp = String(getValues("medical_expiry_date") ?? "").trim();
        const medIssue = String(getValues("medical_issue_date") ?? "").trim();
        if (medExp) {
          const parsed = parseISO(medExp);
          if (!isValid(parsed)) {
            setError("medical_expiry_date", { type: "manual", message: "Please enter a valid Medical Expiration Date" });
          } else if (medIssue && isValid(parseISO(medIssue)) && parseISO(medExp) <= parseISO(medIssue)) {
            setError("medical_expiry_date", { type: "manual", message: "Medical expiry date must be after the issue date" });
          } else {
            clearErrors("medical_expiry_date");
          }
        } else {
          clearErrors("medical_expiry_date");
        }
      } else if (fieldName === "full_name") {
        const val = String(value ?? "").trim();
        if (val.length >= 2 && val.split(/\s+/).filter(Boolean).length >= 2) {
          clearErrors("full_name");
        }
      } else if (fieldName === "job_applied") {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("job_applied");
        }
      } else if (fieldName === "religion") {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("religion");
        }
      } else if (fieldName === "gender") {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("gender");
        }
      } else if (fieldName === "marital_status") {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("marital_status");
        }
      } else if (fieldName === "english_level" && !isMuayenaLive) {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("english_level");
        }
      } else if (fieldName === "arabic_level" && !isMuayenaLive) {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("arabic_level");
        }
      } else if (fieldName === "place_of_birth" && !isMuayenaLive) {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("place_of_birth");
        }
      } else if (fieldName === "qualification" && !isMuayenaLive) {
        const val = String(value ?? "").trim();
        if (val) {
          clearErrors("qualification");
        }
      } else if (fieldName === "salary_amount" && !isMuayenaLive) {
        const val = Number(value || 0);
        if (val > 0) {
          clearErrors("salary_amount");
          clearErrors("monthly_salary" as any);
        }
      } else if (fieldName === "national_id" || fieldName === "labor_id" || fieldName === "labour_id" || fieldName === "leaving_town") {
        const val = String(value ?? "").trim();
        if (!val) {
          clearErrors(fieldName as any);
        }
      }
    },
    [isMuayenaLive, passportConflict, setError, clearErrors, getValues]
  );

  React.useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && (type === "change" || type === undefined)) {
        validateFieldLive(name, value[name as keyof BaseApplicantFormValues]);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, validateFieldLive]);

  // Experience Abroad -> Salary Auto-Update (1200 if experience abroad, 1000 if none)
  const watchedExperienceCountry = watch("experience_country");
  const prevExpCountryRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (prevExpCountryRef.current === undefined) {
      prevExpCountryRef.current = watchedExperienceCountry;
      return;
    }
    if (prevExpCountryRef.current === watchedExperienceCountry) return;
    prevExpCountryRef.current = watchedExperienceCountry;

    const hasAbroadExperience = Boolean(
      watchedExperienceCountry &&
      watchedExperienceCountry.trim() !== "" &&
      watchedExperienceCountry !== "None / First Time" &&
      watchedExperienceCountry !== "None"
    );

    const currentSalary = Number(getValues("salary_amount") || getValues("monthly_salary") || 0);

    if (hasAbroadExperience) {
      if (currentSalary === 1000 || !currentSalary) {
        setValue("salary_amount", 1200, { shouldDirty: true, shouldValidate: true });
        setValue("monthly_salary", "1200", { shouldDirty: true, shouldValidate: true });
        toast.info("Experience abroad selected: Salary automatically updated to 1200 SAR.", { duration: 3000 });
      }
    } else {
      if (currentSalary === 1200) {
        setValue("salary_amount", 1000, { shouldDirty: true, shouldValidate: true });
        setValue("monthly_salary", "1000", { shouldDirty: true, shouldValidate: true });
        toast.info("No abroad experience: Salary reset to default 1000 SAR.", { duration: 3000 });
      }
    }
  }, [watchedExperienceCountry, setValue, getValues]);

  // React to initialData updates
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const normalized = normalizeApplicantFields(initialData);
      const name =
        normalized.full_name ||
        deriveFullName(
          normalized.first_name || "",
          normalized.middle_name || "",
          normalized.last_name || ""
        );
      const currentFormVideo = getValues("video_url") || (getValues() as any)?.intro_video || (getValues() as any)?.video || "";
      const resolvedVideo =
        normalized.video_url ||
        (normalized as any)?.intro_video ||
        (normalized as any)?.video ||
        (initialData as any)?.video_url ||
        (initialData as any)?.intro_video ||
        (initialData as any)?.video ||
        currentFormVideo ||
        "";
      reset({
        ...getValues(),
        ...normalized,
        full_name: name,
        video_url: resolvedVideo,
        intro_video: resolvedVideo,
        video: resolvedVideo,
      });
      const targetId = existingApplicantId || (initialData as any)?.name || (initialData as any)?.applicant_id;
      if (targetId) {
        setDraftApplicantId(targetId);
      }
    }
  }, [initialData, existingApplicantId, reset, getValues]);

  // Synchronize full_name to first_name, middle_name, last_name (always UPPERCASE)
  const handleFullNameChange = (val: string) => {
    const upper = val.toUpperCase();
    setValue("full_name", upper, { shouldValidate: true });
    const { first_name, middle_name, last_name } = splitFullName(upper);
    setValue("first_name", (first_name || "").toUpperCase());
    setValue("middle_name", (middle_name || "").toUpperCase());
    setValue("last_name", (last_name || "").toUpperCase());
  };

  // Live duplicate passport check
  const handlePassportBlur = async () => {
    const pNum = (getValues("passport_number") || "").toUpperCase().trim();
    if (!pNum || pNum.length < 4) {
      setPassportConflict(null);
      clearErrors("passport_number");
      return;
    }
    const res = await checkApplicantUniquenessV2("passport_number", pNum, existingApplicantId);
    if (res.isConflict && res.message) {
      setPassportConflict(res.message);
      setError("passport_number", { type: "manual", message: res.message });
    } else {
      setPassportConflict(null);
      clearErrors("passport_number");
    }
  };

  // Live duplicate national ID check
  const handleNationalIdBlur = async () => {
    const nId = (getValues("national_id") || "").trim();
    if (!nId || nId.length < 4) {
      setNationalIdConflict(null);
      clearErrors("national_id");
      return;
    }
    const res = await checkApplicantUniquenessV2("national_id", nId, existingApplicantId);
    if (res.isConflict && res.message) {
      setNationalIdConflict(res.message);
      setError("national_id", { type: "manual", message: res.message });
    } else {
      setNationalIdConflict(null);
      clearErrors("national_id");
    }
  };

  // Helper to apply parsed passport/MRZ fields to form
  const applyExtractedPassportData = async (parsed: ParsedPassportMRZ, sourceLabel = "passport scan") => {
    if (!parsed) return;
    setOcrSuccessData(parsed);

    // Name (Strictly UPPERCASE per system requirement)
    const firstName = (parsed.first_name || "").toUpperCase();
    const middleName = (parsed.middle_name || "").toUpperCase();
    const lastName = (parsed.last_name || "").toUpperCase();
    const fullNameCombined = [firstName, middleName, lastName].filter(Boolean).join(" ").toUpperCase();

    if (fullNameCombined) {
      handleFullNameChange(fullNameCombined);
    }
    const pNum = (parsed.passport_number || "").toUpperCase().trim();
    if (pNum) {
      setValue("passport_number", pNum, { shouldValidate: true });
    }
    if (parsed.date_of_birth) {
      setValue("date_of_birth", parsed.date_of_birth);
    }
    if (parsed.passport_expiry) {
      setValue("passport_expiry", parsed.passport_expiry);
    }
    if (parsed.passport_issue_date) {
      setValue("passport_issue_date", parsed.passport_issue_date);
    }
    if (parsed.place_of_issue) {
      setValue("place_of_issue", parsed.place_of_issue.toUpperCase());
    }
    if (parsed.place_of_birth) {
      const currentPob = getValues("place_of_birth");
      if (!currentPob || !currentPob.trim()) {
        setValue("place_of_birth", parsed.place_of_birth.toUpperCase().trim());
      }
      setPobMissingFromScan(false);
    } else {
      const currentPob = getValues("place_of_birth");
      if (!currentPob || !currentPob.trim()) {
        setPobMissingFromScan(true);
      }
    }
    if (parsed.gender) {
      const g = parsed.gender.toLowerCase();
      if (g.startsWith("f")) {
        setValue("gender", "Female");
      } else if (g.startsWith("m")) {
        setValue("gender", "Male");
      }
    }
    if (parsed.nationality) {
      setValue("nationality", parsed.nationality);
    }

    // Check duplicate passport uniqueness immediately upon extraction
    if (pNum && pNum.length >= 4) {
      const check = await checkApplicantUniquenessV2("passport_number", pNum, existingApplicantId);
      if (check.isConflict && check.message) {
        setPassportConflict(check.message);
        setError("passport_number", { type: "manual", message: check.message });
        toast.error("Duplicate Passport Detected!", {
          description: check.message,
          duration: 9000,
        });
        return;
      } else {
        setPassportConflict(null);
        clearErrors("passport_number");
      }
    }

    if (parsed.needs_passport_review) {
      toast.warning("Please verify: extracted name or passport details should be double-checked against original document.", { duration: 6000 });
    }

    toast.success(`Applicant details auto-filled from ${sourceLabel}!`, {
      description: `Extracted: ${pNum || ""} (${fullNameCombined || "Candidate"})`,
    });
  };

  // Main Passport Auto-Scan Handler
  const handlePassportAutoScan = async (file: File) => {
    if (!file) return;
    isOcrCancelledRef.current = false;
    setIsScanningOCR(true);
    const toastId = toast.loading("Uploading and analyzing passport scan...");
    activeOcrToastIdRef.current = toastId;

    try {
      // 1. Upload scan file (private per T12 security requirements)
      const uploadRes = await uploadFileV2(file, true, "Applicant", draftApplicantId || undefined);
      if (isOcrCancelledRef.current) return;
      const fileUrl = (uploadRes as any)?.message?.file_url || (uploadRes as any)?.file_url;
      if (fileUrl) {
        setValue("passport_scan", fileUrl);
      }

      // 2. Run Backend Passport Parser (T16: Browser OCR removed to prevent misread names/dates)
      let parsedData: ParsedPassportMRZ | null = null;

      if (fileUrl) {
        try {
          const serverParsed = await parsePassportFileV2(fileUrl);
          if (isOcrCancelledRef.current) return;
          if (serverParsed && (serverParsed.passport_number || serverParsed.first_name)) {
            parsedData = {
              passport_number: serverParsed.passport_number || "",
              first_name: serverParsed.first_name || "",
              middle_name: serverParsed.middle_name || "",
              last_name: serverParsed.last_name || "",
              nationality: serverParsed.nationality || "Ethiopia",
              date_of_birth: serverParsed.date_of_birth || serverParsed.dob || "",
              gender: serverParsed.gender || "Female",
              passport_expiry: serverParsed.passport_expiry || serverParsed.passport_expiry_date || "",
              passport_issue_date: serverParsed.passport_issue_date || "",
              place_of_issue: serverParsed.place_of_issue || "Addis Ababa",
              place_of_birth: serverParsed.place_of_birth || serverParsed.birth_place || "",
              needs_passport_review: Boolean(serverParsed.needs_passport_review),
            };
          }
        } catch (serverErr) {
          console.warn("Backend parse endpoint fallback:", serverErr);
        }
      }

      if (isOcrCancelledRef.current) return;
      toast.dismiss(toastId);

      if (parsedData && (parsedData.passport_number || parsedData.first_name || parsedData.date_of_birth)) {
        await applyExtractedPassportData(parsedData, "uploaded passport scan");
      } else {
        toast.info("Passport file uploaded. OCR could not read the MRZ automatically; please verify details or paste code.", {
          duration: 6000,
        });
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      if (!isOcrCancelledRef.current) {
        toast.error("Passport scanning error", {
          description: formatCleanErrorMessage(err),
        });
      }
    } finally {
      setIsScanningOCR(false);
      activeOcrToastIdRef.current = null;
    }
  };

  // Decode manually pasted MRZ code
  const handleDecodePastedMrz = async () => {
    if (!mrzInputText || !mrzInputText.trim()) {
      toast.error("Please paste the passport code lines first.");
      return;
    }
    const parsed = parseMRZText(mrzInputText);
    if (!parsed || (!parsed.passport_number && !parsed.first_name)) {
      toast.error("Could not parse passport code. Please check that both lines with '<' are pasted.", {
        duration: 5000,
      });
      return;
    }

    await applyExtractedPassportData(parsed, "pasted passport code");
    setIsMrzDialogOpen(false);
    setMrzInputText("");
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMrzInputText(text);
        toast.info("Pasted from clipboard!");
      } else {
        toast.error("Clipboard is empty.");
      }
    } catch {
      toast.error("Please paste manually using Ctrl+V.");
    }
  };

  // Build clean backend payload
  const buildPayload = () => {
    const data = getValues();
    const { first_name, middle_name, last_name } = splitFullName(data.full_name || "");
    const finalFirst = data.first_name || first_name || data.full_name || "Applicant";
    const finalLast = data.last_name || last_name || "Unknown";
    const finalMiddle = data.middle_name || middle_name || "";

    const salaryNum =
      Number(data.salary_amount) > 0
        ? Number(data.salary_amount)
        : Number(data.monthly_salary) > 0
        ? Number(data.monthly_salary)
        : 1000;

    const finalTrack =
      watch("entry_track") ||
      (data as any)?.entry_track ||
      data.applicant_type ||
      (initialData as any)?.entry_track ||
      (initialData as any)?.applicant_type ||
      ((initialData as any)?.is_muayena ? "Muayena" : "Standard");

    const effectiveVideo =
      data.video_url ||
      (data as any)?.intro_video ||
      (data as any)?.video ||
      videoValue ||
      initialData?.video_url ||
      (initialData as any)?.intro_video ||
      (initialData as any)?.video ||
      "";

    const rawPayload: Record<string, any> = {
      ...data,
      full_name: data.full_name || `${finalFirst} ${finalMiddle} ${finalLast}`.trim(),
      first_name: finalFirst,
      middle_name: finalMiddle,
      last_name: finalLast,
      entry_track: finalTrack,
      applicant_type: finalTrack,
      target_job: data.target_job || data.job_applied || "HOUSE WORKER",
      job_applied: data.job_applied || data.target_job || "HOUSE WORKER",
      education: data.qualification || data.education || data.highest_education || "SECONDARY LEVEL",
      highest_education: data.qualification || data.highest_education || data.education || "SECONDARY LEVEL",
      qualification: data.qualification || "SECONDARY LEVEL",
      religion: (data.religion as string) === "Islam" ? "Muslim" : data.religion || "Muslim",
      gender: data.gender || "Female",
      marital_status: data.marital_status || "Single",
      visa_type: data.visa_type || "Work",
      application_number: data.application_number || "",
      salary_amount: salaryNum,
      monthly_salary: String(salaryNum),
      salary_currency: data.salary_currency || "SAR",
      photograph: data.photograph || data.photo_passport || data.profile_photo_url || "",
      photo_passport: data.photo_passport || data.photograph || "",
      passport_scan: data.passport_scan || "",
      photo_full_body: data.photo_full_body || "",
      emergency_contact_name: data.relative_name || data.emergency_contact_name || "",
      emergency_contact_phone: data.relative_phone || data.emergency_contact_phone || "",
      emergency_relationship: data.relative_kinship || data.emergency_relationship || "Mother",
      contact_person_name: data.relative_name || data.contact_person_name || "",
      contact_person_phone: data.relative_phone || data.contact_person_phone || "",
      contact_person_2nd: data.second_contact_name || data.contact_person_2nd || "",
      contact_phone_2nd: data.second_contact_phone || data.contact_phone_2nd || "",
      second_contact_name: data.second_contact_name || data.contact_person_2nd || "",
      second_contact_phone: data.second_contact_phone || data.contact_phone_2nd || "",
      second_contact_address: data.second_contact_address || "",
      phone: data.phone_number || "",
      passport_issue_place: data.place_of_issue || "ADDIS ABABA",
      passport_expiry_date: data.passport_expiry || "",
      contract_number: data.contract_number || "",
      exam_date: data.exam_date || data.certified_date || "",
      certified_date: data.exam_date || data.certified_date || "",
      coc_status: data.coc_status || "",
      college_certificate: data.college_certificate || "",
      original_id_scan: data.original_id_scan || "",
      labor_id: (data.labor_id || data.labour_id || "").trim() || (existingApplicantId ? "" : undefined),
      national_id: (data.national_id || "").trim() || (existingApplicantId ? "" : undefined),
    };

    if ((data as any).video_key || getValues("video_key" as any)) {
      rawPayload.video_key = (data as any).video_key || getValues("video_key" as any);
    }

    // Do not include experience_video in save payloads per Oct 21 backend requirement
    delete (rawPayload as any).experience_video;

    return normalizeApplicantFields(stripLockedIdentityFields(rawPayload, lockedIdentityFields));
  };

  const handleVideoUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "webm", "mov"].includes(ext || "")) {
      toast.error("Invalid Video Format", {
        description: "Please upload an MP4, WebM, or MOV video file.",
      });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video File Too Large", {
        description: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 500 MB limit for applicant videos.`,
      });
      return;
    }
    const activeTargetId =
      draftApplicantId ||
      existingApplicantId ||
      (initialData as any)?.name ||
      (initialData as any)?.applicant_id;

    setIsUploadingMedia(true);
    try {
      if (activeTargetId) {
        try {
          const uploadMeta = await startVideoUploadV2(activeTargetId, file.name, file.size);
          await uploadVideoFileDirectly(uploadMeta.upload_url, uploadMeta.headers || {}, file);
          await finishVideoUploadV2(activeTargetId, uploadMeta.key);
          const playUrl = uploadMeta.upload_url.split("?")[0];
          setValue("video_url", playUrl, { shouldDirty: true });
          setValue("intro_video" as any, playUrl, { shouldDirty: true });
          setValue("video" as any, playUrl, { shouldDirty: true });
          toast.success("Candidate video uploaded successfully!");
          return;
        } catch (videoUploadErr) {
          console.warn("Direct video upload protocol failed, falling back to uploadFileV2:", videoUploadErr);
        }
      } else {
        // Section 0.-17: Stage video upload for new applicant before save
        try {
          const uploadMeta = await startVideoUploadV2(undefined, file.name, file.size);
          await uploadVideoFileDirectly(uploadMeta.upload_url, uploadMeta.headers || {}, file);
          await finishVideoUploadV2(undefined, uploadMeta.key);
          setValue("video_key" as any, uploadMeta.key, { shouldDirty: true });
          const playUrl = uploadMeta.upload_url.split("?")[0];
          setValue("video_url", playUrl, { shouldDirty: true });
          setValue("intro_video" as any, playUrl, { shouldDirty: true });
          setValue("video" as any, playUrl, { shouldDirty: true });
          toast.success("Candidate video staged successfully! Will be attached upon saving.");
          return;
        } catch (stagedErr) {
          console.warn("Staged video upload failed, falling back to uploadFileV2:", stagedErr);
        }
      }

      // If direct/staged protocol failed, upload directly via uploadFileV2
      const res = await uploadFileV2(file, false, "Applicant", activeTargetId || undefined);
      const url = (res as any)?.message?.file_url || (res as any)?.file_url;
      if (!url) throw new Error("Upload succeeded but no file URL returned.");
      setValue("video_url", url, { shouldDirty: true });
      setValue("intro_video" as any, url, { shouldDirty: true });
      setValue("video" as any, url, { shouldDirty: true });
      toast.success("Candidate video uploaded successfully!");
    } catch (err: any) {
      toast.error("Video upload failed", {
        description: err?.message || "Could not upload the video. Please check your connection and try again.",
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Upload handler for active media tab
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeMediaTab === "video") {
      await handleVideoUpload(file);
      return;
    }

    setIsUploadingMedia(true);
    try {
      const isPrivate = activeMediaTab === "passport";
      const activeTargetId =
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;

      const res = await uploadFileV2(file, isPrivate, "Applicant", activeTargetId || undefined);
      const url = (res as any)?.message?.file_url || (res as any)?.file_url;
      if (!url) throw new Error("Upload succeeded but no file URL returned.");

      if (activeMediaTab === "photo") {
        setValue("photograph", url, { shouldDirty: true });
        setValue("photo_passport", url, { shouldDirty: true });
        setValue("profile_photo_url", url, { shouldDirty: true });
        toast.success("Photo uploaded successfully!");
      } else if (activeMediaTab === "full_size") {
        setValue("photo_full_body", url, { shouldDirty: true });
        toast.success("Full-size photo uploaded successfully!");
      } else if (activeMediaTab === "passport") {
        setValue("passport_scan", url, { shouldDirty: true });
        toast.success("Passport scan uploaded!");
        // Run OCR on passport
        handlePassportAutoScan(file);
      }
    } catch (err: any) {
      toast.error("Upload failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  };

  // 1. SAVE DRAFT MUTATION
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      clearErrors();
      const payload = buildPayload();
      let res;
      const targetExistingId =
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;

      if (targetExistingId) {
        res = await updateApplicantV2(targetExistingId, payload);
      } else {
        res = await createApplicantV2(payload as any);
      }

      const savedId = res?.name || targetExistingId;
      const videoToAttach = payload.video_url || getValues("video_url") || "";
      if (videoToAttach && savedId) {
        await attachVideoToApplicantV2(savedId, videoToAttach);
      }
      return res;
    },
    onSuccess: (data) => {
      const savedId =
        data?.name ||
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;
      if (savedId) setDraftApplicantId(savedId);
      setApplicantState(data?.status || data?.applicant_state || "Draft");
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (savedId) queryClient.invalidateQueries({ queryKey: ["applicant", savedId] });
      toast.success(`Applicant Saved Successfully (ID: ${savedId || ""})`, {
        description: "Draft saved. Redirecting to applicant list...",
      });
      if (onSuccessRedirect && savedId) {
        if (typeof onSuccessRedirect === "function") {
          onSuccessRedirect(savedId);
        } else if (typeof onSuccessRedirect === "string") {
          router.push(onSuccessRedirect);
        }
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/applicants";
        } else {
          router.push("/applicants");
        }
      }
    },
    onError: (error: unknown) => {
      const errorMsg = formatCleanErrorMessage(error);
      const errLower = errorMsg.toLowerCase();
      if (errLower.includes("national id") || errLower.includes("national_id")) {
        setError("national_id", { message: errorMsg });
        scrollToAndHighlightField("national_id");
      } else if (errLower.includes("labor id") || errLower.includes("labour id") || errLower.includes("labor_id") || errLower.includes("labour_id")) {
        setError("labor_id" as any, { message: errorMsg });
        setError("labour_id" as any, { message: errorMsg });
        scrollToAndHighlightField("labor_id");
      } else if (errLower.includes("passport number") || errLower.includes("passport_number") || errLower.includes("passport already")) {
        setError("passport_number", { message: errorMsg });
        scrollToAndHighlightField("passport_number");
      }
      toast.error("Could not save applicant", {
        description: errorMsg,
      });
    },
  });

  // 2. SAVE CHANGES MUTATION (FOR EDIT MODE)
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const targetId =
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;
      if (!targetId) throw new Error("No applicant ID to update.");
      const payload = buildPayload();
      const res = await updateApplicantV2(targetId, payload);
      const videoToAttach = payload.video_url || getValues("video_url") || "";
      if (videoToAttach && targetId) {
        await attachVideoToApplicantV2(targetId, videoToAttach);
      }
      return res;
    },
    onSuccess: () => {
      const targetId =
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (targetId) queryClient.invalidateQueries({ queryKey: ["applicant", targetId] });
      toast.success("Applicant changes saved successfully!", {
        description: "Profile updated. Redirecting to applicant list...",
      });
      if (onSuccessRedirect && targetId) {
        if (typeof onSuccessRedirect === "function") {
          onSuccessRedirect(targetId);
        } else if (typeof onSuccessRedirect === "string") {
          router.push(onSuccessRedirect);
        }
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/applicants";
        } else {
          router.push("/applicants");
        }
      }
    },
    onError: (err: unknown) => {
      const errorMsg = formatCleanErrorMessage(err);
      const errLower = errorMsg.toLowerCase();
      if (errLower.includes("national id") || errLower.includes("national_id")) {
        setError("national_id", { message: errorMsg });
        scrollToAndHighlightField("national_id");
      } else if (errLower.includes("labor id") || errLower.includes("labour id") || errLower.includes("labor_id") || errLower.includes("labour_id")) {
        setError("labor_id" as any, { message: errorMsg });
        setError("labour_id" as any, { message: errorMsg });
        scrollToAndHighlightField("labor_id");
      } else if (errLower.includes("passport number") || errLower.includes("passport_number") || errLower.includes("passport already")) {
        setError("passport_number", { message: errorMsg });
        scrollToAndHighlightField("passport_number");
      }
      toast.error("Failed to save changes", {
        description: errorMsg,
      });
    },
  });

  // 3. REGISTER APPLICANT MUTATION
  const registerMutation = useMutation({
    mutationFn: async () => {
      clearErrors();
      const formData = getValues();
      const validation = stage2RegistrationSchema.safeParse(formData);

      if (!validation.success) {
        validation.error.errors.forEach((err: any) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof BaseApplicantFormValues, {
              type: "manual",
              message: err.message,
            });
          }
        });
        const firstErr = validation.error.errors[0]?.message || "Please complete all registration requirements.";
        const firstErrField = validation.error.errors[0]?.path[0] ? String(validation.error.errors[0].path[0]) : "";
        if (firstErrField) {
          scrollToAndHighlightField(firstErrField);
        }
        throw new Error(firstErr);
      }

      let activeId =
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;
      const payload = buildPayload();

      if (!activeId) {
        const draft = await createApplicantV2(payload as any);
        activeId = draft.name || "";
        setDraftApplicantId(activeId);
      } else {
        await updateApplicantV2(activeId, payload);
      }

      if (!activeId) {
        throw new Error("Could not initialize applicant record before transitioning to Registered.");
      }

      const videoToAttach = payload.video_url || getValues("video_url") || "";
      if (videoToAttach && activeId) {
        await attachVideoToApplicantV2(activeId, videoToAttach);
      }

      const regRes = await registerApplicantV2(activeId);
      return { ...regRes, applicantId: activeId };
    },
    onSuccess: (data: any) => {
      const targetId =
        data?.applicantId ||
        draftApplicantId ||
        existingApplicantId ||
        (initialData as any)?.name ||
        (initialData as any)?.applicant_id;
      setApplicantState("Registered");
      setIsConfirmRegisterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (targetId) queryClient.invalidateQueries({ queryKey: ["applicant", targetId] });
      toast.success("Applicant Registered Successfully!", {
        description: `Record ${targetId} is now Registered. Redirecting to applicant list...`,
      });
      if (onSuccessRedirect && targetId) {
        if (typeof onSuccessRedirect === "function") {
          onSuccessRedirect(targetId);
        } else if (typeof onSuccessRedirect === "string") {
          router.push(onSuccessRedirect);
        }
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/applicants";
        } else {
          router.push("/applicants");
        }
      }
    },
    onError: (err: unknown) => {
      const errorMsg = formatCleanErrorMessage(err);
      const errLower = errorMsg.toLowerCase();
      if (errLower.includes("national id") || errLower.includes("national_id")) {
        setError("national_id", { message: errorMsg });
        scrollToAndHighlightField("national_id");
      } else if (errLower.includes("labor id") || errLower.includes("labour id") || errLower.includes("labor_id") || errLower.includes("labour_id")) {
        setError("labor_id" as any, { message: errorMsg });
        setError("labour_id" as any, { message: errorMsg });
        scrollToAndHighlightField("labor_id");
      } else if (errLower.includes("passport number") || errLower.includes("passport_number") || errLower.includes("passport already")) {
        setError("passport_number", { message: errorMsg });
        scrollToAndHighlightField("passport_number");
      } else if (errLower.includes("passport scan")) scrollToAndHighlightField("passport_scan");
      else if (errLower.includes("photograph") || errLower.includes("photo")) scrollToAndHighlightField("photograph");
      else if (errLower.includes("phone")) scrollToAndHighlightField("phone_number");
      else if (errLower.includes("place of birth")) scrollToAndHighlightField("place_of_birth");
      else if (errLower.includes("birth")) scrollToAndHighlightField("date_of_birth");
      else if (errLower.includes("city")) scrollToAndHighlightField("city");
      else if (errLower.includes("english")) scrollToAndHighlightField("english_level");
      else if (errLower.includes("arabic")) scrollToAndHighlightField("arabic_level");
      else if (errLower.includes("salary")) scrollToAndHighlightField("salary_amount");
      else if (errLower.includes("medical expiry") || errLower.includes("medical expiration")) scrollToAndHighlightField("medical_expiry_date");
      else if (errLower.includes("medical")) scrollToAndHighlightField("medical_status");
      else if (errLower.includes("leaving town")) scrollToAndHighlightField("leaving_town");
      else if (errLower.includes("job") || errLower.includes("occupation")) scrollToAndHighlightField("job_applied");
      else if (errLower.includes("education") || errLower.includes("qualification")) scrollToAndHighlightField("qualification");

      toast.error("Registration Requirements Not Met", {
        description: errorMsg,
        duration: 7000,
      });
    },
  });

  const photoValue = watch("photograph") || watch("photo_passport") || watch("profile_photo_url");
  const fullSizeValue = watch("photo_full_body");
  const passportValue = watch("passport_scan");
  const videoValue =
    watch("video_url") ||
    (watch() as any)?.intro_video ||
    (watch() as any)?.video ||
    (initialData as any)?.video_url ||
    (initialData as any)?.intro_video ||
    (initialData as any)?.video ||
    "";
  const currentApplicantType =
    watch("entry_track") ||
    watch("applicant_type") ||
    (initialData as any)?.entry_track ||
    (initialData as any)?.applicant_type ||
    ((initialData as any)?.is_muayena ? "Muayena" : "Standard");
  const isMuayena = currentApplicantType === "Muayena";
  const currentDestCountry = watch("destination_country") || "Saudi Arabia";

  const hasActiveCase = Boolean(
    (initialData as any)?.active_placement ||
    (initialData as any)?.placement ||
    ((initialData as any)?.status && !["Draft", "Registered", "CV Generated", "Cancelled"].includes((initialData as any).status))
  );

  const prevDestCountryRef = React.useRef(currentDestCountry);
  React.useEffect(() => {
    if (prevDestCountryRef.current && prevDestCountryRef.current !== currentDestCountry) {
      if (isMuayena && !hasActiveCase) {
        setValue("muayena_agency", "", { shouldDirty: true, shouldValidate: true });
      }
    }
    prevDestCountryRef.current = currentDestCountry;
  }, [currentDestCountry, isMuayena, hasActiveCase, setValue]);

  const destinationContractors = React.useMemo(() => {
    return contractors.filter((c) => {
      if (!currentDestCountry) return true;
      return !c.country || c.country.trim().toLowerCase() === currentDestCountry.trim().toLowerCase();
    });
  }, [contractors, currentDestCountry]);

  // Determine current preview file based on selected media tab
  const getMediaPreview = () => {
    switch (activeMediaTab) {
      case "photo":
        return photoValue;
      case "full_size":
        return fullSizeValue;
      case "passport":
        return passportValue;
      case "video":
        return videoValue;
      default:
        return null;
    }
  };

  const activeMediaUrl = getMediaPreview();
  const isSaving = saveDraftMutation.isPending || saveChangesMutation.isPending;

  return (
    <div data-tour="registration-form-container" className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#15151a] p-4 rounded-xl border border-slate-200 dark:border-[#26262d] shadow-xs">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 dark:text-white">
            {existingApplicantId ? "EDIT APPLICANT" : "CREATE APPLICANT"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {existingApplicantId ? `Editing details for candidate ${existingApplicantId}` : "Register a new applicant."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {draftApplicantId && (
            <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-slate-100 dark:bg-[#1f1f26] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2b2b35]">
              ID: {draftApplicantId}
            </span>
          )}
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${
              applicantState === "Registered" || applicantState === "CV Generated"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            }`}
          >
            {applicantState}
          </span>
        </div>
      </div>

      {/* Read-Only Notice for staff with view-only permissions */}
      {isFormReadOnly && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <span className="font-bold">Read-Only View</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                Your role has view permissions for this applicant profile. Editing and registration actions are restricted to Registrars and Administrators.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-400 text-amber-800 dark:border-amber-700 dark:text-amber-300 bg-amber-100/50 text-[10px] font-mono shrink-0">
            VIEW ONLY
          </Badge>
        </div>
      )}

      {/* 1. STANDARD VS MUAYENA DEPLOYMENT TRACK SELECTION (Previous UI Feature restored) */}
      <Card className="border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] shadow-xs overflow-hidden">
        <CardContent className="p-5">
          <div className={cn("grid grid-cols-1 gap-6 items-start", isMuayena ? "md:grid-cols-3" : "md:grid-cols-2")}>
            {/* Deployment Type Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  Applicant Deployment Type <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {currentApplicantType === "Muayena" ? "Direct Client Placement" : "Agency Pool"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Choose Standard agency pool or Muayena (direct client allocation).
              </p>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#26262d] p-1 bg-slate-100 dark:bg-[#121215] w-full">
                <button
                  type="button"
                  disabled={lockedIdentityFields}
                  onClick={() => {
                    setValue("applicant_type", "Standard", { shouldDirty: true, shouldValidate: true });
                    setValue("entry_track" as any, "Standard", { shouldDirty: true, shouldValidate: true });
                    setValue("muayena_agency", "", { shouldDirty: true });
                    if (watch("relative_name") === "Muayena") {
                      setValue("relative_name", "");
                      setValue("relative_kinship", "Mother");
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition text-center ${
                    lockedIdentityFields ? "cursor-not-allowed opacity-60" : ""
                  } ${
                    currentApplicantType === "Standard"
                      ? "bg-emerald-900 text-white shadow-md font-bold"
                      : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Standard Track
                </button>
                <button
                  type="button"
                  disabled={lockedIdentityFields}
                  onClick={() => {
                    setValue("applicant_type", "Muayena", { shouldDirty: true, shouldValidate: true });
                    setValue("entry_track" as any, "Muayena", { shouldDirty: true, shouldValidate: true });
                    const currentContact = watch("relative_name");
                    if (!currentContact || currentContact === "") {
                      setValue("relative_name", "Muayena");
                      setValue("relative_kinship", "Other");
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition text-center ${
                    lockedIdentityFields ? "cursor-not-allowed opacity-60" : ""
                  } ${
                    currentApplicantType === "Muayena"
                      ? "bg-emerald-900 text-white shadow-md font-bold"
                      : "text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Muayena Track
                </button>
              </div>
            </div>

            {/* Destination Corridor & Context */}
            <div className="space-y-1.5" id="field-destination_country">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4 text-emerald-700" />
                  Destination Country Corridor <span className="text-rose-500">*</span>
                </Label>
                {renderClearBtn("destination_country")}
              </div>
              <select
                {...register("destination_country")}
                disabled={lockedIdentityFields}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("destination_country")
                )}
              >
                <option value="">Select Destination Country...</option>
                {DESTINATION_COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.destination_country && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.destination_country.message}</p>
              )}
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 pt-0.5">
                {currentDestCountry.toLowerCase() === "kuwait"
                  ? "🇰🇼 Kuwait Corridor: Direct LMIS Work Permit & Visa flow (Exempt from Musaned/Wakala)."
                  : currentDestCountry.toLowerCase() === "saudi arabia"
                  ? "🇸🇦 Saudi Corridor: Stream Flow (Musaned verification, Wakala power of attorney & Injaz)."
                  : " International Corridor: Standard visa and contract processing pipeline."}
              </p>
            </div>

            {/* Muayena Foreign Agency Picker (Shown only for Muayena Track) */}
            {isMuayena && (
              <div className="space-y-1.5" id="field-muayena_agency">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    Muayena Foreign Agency <span className="text-rose-500">*</span>
                  </Label>
                  {!hasActiveCase && renderClearBtn("muayena_agency")}
                </div>
                <select
                  {...register("muayena_agency")}
                  disabled={hasActiveCase || isFormReadOnly}
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                    hasActiveCase ? "cursor-not-allowed opacity-75 bg-slate-100 dark:bg-[#1f1f26]" : "",
                    getFieldClass("muayena_agency")
                  )}
                >
                  <option value="">Select Agency ({currentDestCountry})...</option>
                  {destinationContractors.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.company_name || c.name} {c.country ? `(${c.country})` : ""}
                    </option>
                  ))}
                </select>
                {errors.muayena_agency && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.muayena_agency.message}</p>
                )}
                <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 pt-0.5">
                  {hasActiveCase
                    ? "Case already active for this candidate. The allocated agency is locked."
                    : `Allocated partner agency in ${currentDestCountry} who will manage this direct placement.`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. PASSPORT QUICK-SCAN & AUTO-FILL HERO EXTRACTOR (Previous UI Feature restored) */}
      <Card
        id="field-passport_scan"
        data-tour="passport-dropzone"
        className={`border-2 border-dashed ${
          errors.passport_scan || highlightedField === "passport_scan"
            ? "border-rose-500 ring-4 ring-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 animate-pulse"
            : "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-500/30"
        } overflow-hidden shadow-xs`}
      >
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-md">
                <ScanLine className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    Passport Quick-Scan & Auto-Fill <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <ScanLine className="h-3 w-3" /> Auto-Fill Enabled
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Upload passport scan or paste code to auto-fill details.
                </p>

                {/* Important Warning */}
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 rounded-lg px-2.5 py-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Ensure passport photo is clear and well-lit.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              {/* Paste code button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMrzDialogOpen(true)}
                className="text-xs font-semibold border-emerald-300 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/50"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Paste Passport Code
              </Button>
            </div>
          </div>

          {/* Premium Passport Dropzone for Quick Scan */}
          <div className="mt-4">
            <PremiumDropzone
              id="registration-passport-scan-dropzone"
              variant="passport"
              value={watch("passport_scan")}
              isLoading={isScanningOCR}
              loadingText="Scanning passport & running OCR extraction..."
              onCancel={handleCancelPassportScan}
              onFileSelect={handlePassportAutoScan}
              onRemove={() => {
                setValue("passport_scan", "");
                setOcrSuccessData(null);
                setPassportConflict(null);
                toast.info("Passport scan cleared");
              }}
            />
          </div>

          {/* Extracted Data Pill Banner */}
          {ocrSuccessData && (
            <div className="mt-4 pt-3.5 border-t border-emerald-200/60 dark:border-emerald-900/40 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 mr-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Extracted & Auto-Filled:
              </span>
              {ocrSuccessData.first_name && (
                <span className="rounded-lg bg-white dark:bg-[#1c1c24] border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200">
                  Name: <strong>{ocrSuccessData.first_name} {ocrSuccessData.last_name || ""}</strong>
                </span>
              )}
              {ocrSuccessData.passport_number && (
                <span className="rounded-lg bg-white dark:bg-[#1c1c24] border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200 font-mono">
                  Passport: <strong>{ocrSuccessData.passport_number}</strong>
                </span>
              )}
              {ocrSuccessData.date_of_birth && (
                <span className="rounded-lg bg-white dark:bg-[#1c1c24] border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200">
                  DOB: <strong>{ocrSuccessData.date_of_birth}</strong>
                </span>
              )}
              {ocrSuccessData.gender && (
                <span className="rounded-lg bg-white dark:bg-[#1c1c24] border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200">
                  Gender: <strong>{ocrSuccessData.gender}</strong>
                </span>
              )}
              {ocrSuccessData.passport_expiry && (
                <span className="rounded-lg bg-white dark:bg-[#1c1c24] border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200">
                  Expiry: <strong>{ocrSuccessData.passport_expiry}</strong>
                </span>
              )}
            </div>
          )}

          {/* Extracted Duplicate Passport Conflict Warning */}
          {passportConflict && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-200">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Duplicate Passport Detected:</span>{" "}
                <span>{passportConflict}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. MEDIA TABS & UPLOAD SECTION (With crystal-clear selected background) */}
      <Card className="border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] overflow-hidden shadow-xs">
        {/* Unmistakable High-Contrast Media Tabs (User Feedback Addressed) */}
        <div data-tour="registration-step-nav" className="p-3 border-b border-slate-200 dark:border-[#26262d] bg-slate-50/90 dark:bg-[#16161e]">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tab: Photo */}
            <button
              type="button"
              onClick={() => setActiveMediaTab("photo")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeMediaTab === "photo"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md font-extrabold scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-[#1a1a24] dark:hover:bg-[#242432] dark:text-zinc-300 dark:border-[#333346] font-medium"
              }`}
            >
              <Camera className={`h-3.5 w-3.5 ${activeMediaTab === "photo" ? "text-emerald-200" : "text-slate-500"}`} />
              <span>Photo <span className="text-rose-500 font-bold ml-0.5">*</span></span>
              {activeMediaTab === "photo" ? (
                <span className="ml-1 text-[10px] uppercase font-bold bg-emerald-800 dark:bg-emerald-600 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Selected
                </span>
              ) : photoValue ? (
                <span className="h-2 w-2 rounded-full bg-emerald-600" title="File uploaded" />
              ) : null}
            </button>

            {/* Tab: Full Size */}
            <button
              type="button"
              onClick={() => setActiveMediaTab("full_size")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeMediaTab === "full_size"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md font-extrabold scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-[#1a1a24] dark:hover:bg-[#242432] dark:text-zinc-300 dark:border-[#333346] font-medium"
              }`}
            >
              <User className={`h-3.5 w-3.5 ${activeMediaTab === "full_size" ? "text-emerald-200" : "text-slate-500"}`} />
              <span>Full Size <span className="text-slate-400 font-normal text-[10px] ml-1">(Optional)</span></span>
              {activeMediaTab === "full_size" ? (
                <span className="ml-1 text-[10px] uppercase font-bold bg-emerald-800 dark:bg-emerald-600 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Selected
                </span>
              ) : fullSizeValue ? (
                <span className="h-2 w-2 rounded-full bg-emerald-600" title="File uploaded" />
              ) : null}
            </button>

            {/* Tab: Passport */}
            <button
              type="button"
              onClick={() => setActiveMediaTab("passport")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeMediaTab === "passport"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md font-extrabold scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-[#1a1a24] dark:hover:bg-[#242432] dark:text-zinc-300 dark:border-[#333346] font-medium"
              }`}
            >
              <FileText className={`h-3.5 w-3.5 ${activeMediaTab === "passport" ? "text-emerald-200" : "text-slate-500"}`} />
              <span>Passport <span className="text-rose-500 font-bold ml-0.5">*</span></span>
              {activeMediaTab === "passport" ? (
                <span className="ml-1 text-[10px] uppercase font-bold bg-emerald-800 dark:bg-emerald-600 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Selected
                </span>
              ) : passportValue ? (
                <span className="h-2 w-2 rounded-full bg-emerald-600" title="File uploaded" />
              ) : null}
            </button>

            {/* Tab: Video */}
            <button
              type="button"
              onClick={() => setActiveMediaTab("video")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeMediaTab === "video"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md font-extrabold scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-[#1a1a24] dark:hover:bg-[#242432] dark:text-zinc-300 dark:border-[#333346] font-medium"
              }`}
            >
              <Video className={`h-3.5 w-3.5 ${activeMediaTab === "video" ? "text-emerald-200" : "text-slate-500"}`} />
              <span>Video Interview <span className="text-slate-400 font-normal text-[10px] ml-1">(Optional)</span></span>
              {activeMediaTab === "video" ? (
                <span className="ml-1 text-[10px] uppercase font-bold bg-emerald-800 dark:bg-emerald-600 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Selected
                </span>
              ) : videoValue ? (
                <span className="h-2 w-2 rounded-full bg-emerald-600" title="File uploaded" />
              ) : null}
            </button>
          </div>
        </div>

        {/* Unmistakable Selection Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-zinc-400">Active Option:</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-900 dark:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-xs">
              {activeMediaTab === "photo" && <><Camera className="h-3.5 w-3.5 text-emerald-200" /> Photo (Passport Size) *</>}
              {activeMediaTab === "full_size" && <><User className="h-3.5 w-3.5 text-emerald-200" /> Full Size Photo (Optional)</>}
              {activeMediaTab === "passport" && <><FileText className="h-3.5 w-3.5 text-emerald-200" /> Passport Scan *</>}
              {activeMediaTab === "video" && <><Video className="h-3.5 w-3.5 text-emerald-200" /> Video Interview (Optional)</>}
            </span>
          </div>
          <div className="text-[11px] font-medium">
            {activeMediaUrl ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> File attached and ready
              </span>
            ) : (
              <span className="text-slate-500 dark:text-zinc-400">
                No file attached yet. Choose or drop a file below.
              </span>
            )}
          </div>
        </div>

        {/* Media Dropzone & Preview */}
        <CardContent className="p-6">
          <PremiumDropzone
            id={`registration-media-${activeMediaTab}`}
            variant={
              activeMediaTab === "photo"
                ? "portrait"
                : activeMediaTab === "full_size"
                ? "full_body"
                : activeMediaTab === "video"
                ? "video"
                : "passport"
            }
            error={
              activeMediaTab === "photo"
                ? errors.photograph?.message || errors.photo_passport?.message
                : activeMediaTab === "full_size"
                ? errors.photo_full_body?.message
                : activeMediaTab === "passport"
                ? errors.passport_scan?.message
                : errors.video_url?.message
            }
            value={activeMediaUrl}
            isLoading={isUploadingMedia}
            loadingText={`Uploading ${
              activeMediaTab === "photo"
                ? "passport photo"
                : activeMediaTab === "full_size"
                ? "full size photo"
                : activeMediaTab === "video"
                ? "candidate video"
                : "passport scan"
            }...`}
            onFileSelect={async (file) => {
              if (activeMediaTab === "passport") {
                handlePassportAutoScan(file);
              } else if (activeMediaTab === "video") {
                await handleVideoUpload(file);
              } else {
                try {
                  setIsUploadingMedia(true);
                  const isPrivate = false;
                  const activeTargetId =
                    draftApplicantId ||
                    existingApplicantId ||
                    (initialData as any)?.name ||
                    (initialData as any)?.applicant_id;
                  const res = await uploadFileV2(file, isPrivate, "Applicant", activeTargetId || undefined);
                  const url = res.file_url || (res as any).message?.file_url;
                  if (url) {
                    if (activeMediaTab === "photo") {
                      setValue("photograph", url, { shouldDirty: true });
                      setValue("photo_passport", url, { shouldDirty: true });
                      setValue("profile_photo_url", url, { shouldDirty: true });
                    } else if (activeMediaTab === "full_size") {
                      setValue("photo_full_body", url, { shouldDirty: true });
                    }
                    toast.success("File uploaded successfully");
                  }
                } catch (err: any) {
                  toast.error("Upload failed", { description: err.message });
                } finally {
                  setIsUploadingMedia(false);
                }
              }
            }}
            onRemove={() => {
              if (activeMediaTab === "photo") {
                setValue("photograph", "");
                setValue("photo_passport", "");
                setValue("profile_photo_url", "");
              } else if (activeMediaTab === "full_size") {
                setValue("photo_full_body", "");
              } else if (activeMediaTab === "passport") {
                setValue("passport_scan", "");
              } else if (activeMediaTab === "video") {
                setValue("video_url", "", { shouldDirty: true });
                setValue("intro_video" as any, "", { shouldDirty: true });
                setValue("video" as any, "", { shouldDirty: true });
              }
              toast.info("Media cleared");
            }}
          />
        </CardContent>
      </Card>

      {/* 4. CORE DETAILS 2-COLUMN GRID (Matching Video Layout) */}
      <Card className="border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] shadow-xs">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Row 1: Application No. | Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Application No. <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. APP-00102"
                {...register("application_number")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                type="date"
                {...register("registration_date")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Row 2: Full Name | National ID & Status Checkbox */}
            <div className="space-y-1.5" id="field-full_name">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  Full Name <span className="text-rose-500 font-bold ml-0.5">*</span> <Info className="h-3 w-3 text-slate-400" />
                </Label>
                {errors.full_name && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    {errors.full_name.message}
                  </span>
                )}
              </div>
              <Input
                placeholder="e.g. ALFIYA KEDIR UMER"
                value={watch("full_name") || ""}
                onChange={(e) => handleFullNameChange(e.target.value)}
                className={cn(
                  "text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("full_name")
                )}
              />
            </div>

            <div className="space-y-1.5" id="field-national_id">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  National ID (Fayda / FAN) <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {(nationalIdConflict || errors.national_id) && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    {nationalIdConflict || errors.national_id?.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="e.g. FAN-123456789 or 12-digit National ID"
                    {...register("national_id")}
                    onBlur={handleNationalIdBlur}
                    className={cn(
                      "text-xs font-mono border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                      getFieldClass("national_id")
                    )}
                  />
                </div>
                <div className="shrink-0 flex items-center pt-0.5" id="checkbox-is_active">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Active ?</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 3: Passport No. | Passport Type */}
            <div className="space-y-1.5" id="field-passport_number">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  Passport No. <span className="text-rose-500 font-bold ml-0.5">*</span> <Info className="h-3 w-3 text-slate-400" />
                </Label>
                {(passportConflict || errors.passport_number) && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    {passportConflict || errors.passport_number?.message}
                  </span>
                )}
              </div>
              <Input
                placeholder="e.g. EP00646924"
                {...register("passport_number")}
                onBlur={handlePassportBlur}
                className={cn(
                  "text-xs uppercase font-mono border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("passport_number")
                )}
              />
            </div>

            <div className="space-y-1.5" id="field-passport_type">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Passport Type <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {renderClearBtn("passport_type")}
              </div>
              <select
                {...register("passport_type")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("passport_type")
                )}
              >
                <option value="">Select Passport Type...</option>
                {PASSPORT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4: Date of Birth | Place of Birth */}
            <div className="space-y-1.5" id="field-date_of_birth">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Birth <span className="text-rose-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                type="date"
                {...register("date_of_birth")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("date_of_birth")
                )}
              />
              {errors.date_of_birth && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-place_of_birth">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Place of Birth {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                {renderClearBtn("place_of_birth")}
              </div>
              <Input
                placeholder="e.g. ADDIS ABABA, LOMA, ANGECHA"
                list="pob_options_reg"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("place_of_birth", {
                  onChange: (e) => {
                    if (e.target.value) setPobMissingFromScan(false);
                  },
                })}
                className={cn(
                  "text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("place_of_birth")
                )}
              />
              <datalist id="pob_options_reg">
                {PLACE_OF_BIRTH_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              {pobMissingFromScan && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Not read from the passport. Please type it.
                </p>
              )}
              {errors.place_of_birth && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.place_of_birth.message}</p>
              )}
            </div>

            {/* Row 5: Date of Issue | Date of Expiry */}
            <div className="space-y-1.5" id="field-passport_issue_date">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Issue <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                type="date"
                {...register("passport_issue_date")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("passport_issue_date")
                )}
              />
            </div>

            <div className="space-y-1.5" id="field-passport_expiry">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Expiry <span className="text-rose-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                type="date"
                {...register("passport_expiry")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("passport_expiry")
                )}
              />
              {errors.passport_expiry && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.passport_expiry.message}</p>
              )}
            </div>

            {/* Row 6: Place of Issue | Phone No. */}
            <div className="space-y-1.5" id="field-place_of_issue">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Place of Issue <span className="text-rose-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                placeholder="e.g. ADDIS ABABA"
                {...register("place_of_issue")}
                className={cn(
                  "text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("place_of_issue")
                )}
              />
              {errors.place_of_issue && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.place_of_issue.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-phone_number">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Phone No. <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. +251911223344"
                {...register("phone_number")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("phone_number")
                )}
              />
              {errors.phone_number && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Row 7: Religion | Marital Status */}
            <div className="space-y-1.5" id="field-religion">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Religion {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                {renderClearBtn("religion")}
              </div>
              <select
                {...register("religion")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("religion")
                )}
              >
                <option value="">Select Religion...</option>
                {RELIGION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.religion && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.religion.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-marital_status">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Marital Status {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                {renderClearBtn("marital_status")}
              </div>
              <select
                {...register("marital_status")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("marital_status")
                )}
              >
                <option value="">Select Marital Status...</option>
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.marital_status && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.marital_status.message}</p>
              )}
            </div>

            {/* Row 8: Gender | Occupation */}
            <div className="space-y-1.5" id="field-gender">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Gender <span className="text-rose-500 font-bold ml-0.5">*</span>
                </Label>
                {renderClearBtn("gender")}
              </div>
              <select
                {...register("gender")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("gender")
                )}
              >
                <option value="">Select Gender...</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.gender.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-job_applied">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Occupation {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                {renderClearBtn("job_applied")}
              </div>
              <select
                {...register("job_applied")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200 uppercase",
                  getFieldClass("job_applied")
                )}
              >
                <option value="">Select Occupation...</option>
                {OCCUPATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.job_applied && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.job_applied.message}</p>
              )}
            </div>

            {/* Row 9: Qualification | Region */}
            <div className="space-y-1.5" id="field-qualification">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Qualification {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                {renderClearBtn("qualification")}
              </div>
              <select
                {...register("qualification")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200 uppercase",
                  getFieldClass("qualification")
                )}
              >
                <option value="">Select Qualification...</option>
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.qualification && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.qualification.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-region">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Region <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Oromia"
                {...register("region")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("region")
                )}
              />
              {errors.region && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.region.message}</p>
              )}
            </div>

            {/* Row 10: City */}
            <div className="space-y-1.5" id="field-city">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                City <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Addis Ababa"
                {...register("city")}
                onFocus={() => setIsSponsorAddrReadOnly(true)}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("city")
                )}
              />
              {errors.city && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.city.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. SECTION: SPONSOR & VISA INFORMATION (Matching Video Layout) */}
      <Card className="border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] shadow-xs">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#1b1b24]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
            SPONSOR & VISA INFORMATION
          </h2>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Visa Number | Sponsor Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Visa Number <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="Enter visa number"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("visa_number")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Name <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="Enter sponsor name"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_name")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Sponsor ID | Sponsor Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor ID <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. 1029384756"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_id")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Phone <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. +966..."
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_phone")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Sponsor Address | Agent */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Address <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                id="sponsor_address_field"
                placeholder="e.g. JEDDAH"
                readOnly={isSponsorAddrReadOnly}
                onFocus={() => setIsSponsorAddrReadOnly(false)}
                onMouseDown={() => setIsSponsorAddrReadOnly(false)}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_address")}
                className="text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5" id="field-agent">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Agent <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {renderClearBtn("agent")}
              </div>
              <select
                {...register("agent")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("agent")
                )}
              >
                <option value="">Select Foreign Contractor Agent...</option>
                {contractors.map((c) => {
                  const val = c.contractor_name || c.company_name || c.name;
                  const label = c.company_name || c.contractor_name || c.name;
                  return (
                    <option key={c.name} value={val}>
                      {label} ({c.country || "Saudi Arabia"})
                    </option>
                  );
                })}
                {watch("agent") &&
                  !contractors.some(
                    (c) => (c.contractor_name || c.company_name || c.name) === watch("agent")
                  ) && (
                    <option value={watch("agent")}>{watch("agent")}</option>
                  )}
              </select>
            </div>

            {/* Sponsor National ID | Sponsor Arabic */}
            <div className="space-y-1.5" id="field-sponsor_id">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor National ID <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_id")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("sponsor_id")
                )}
              />
              {errors.sponsor_id && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.sponsor_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5" id="field-sponsor_arabic">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Arabic <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="اسم الكفيل"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                {...register("sponsor_arabic")}
                dir="rtl"
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("sponsor_arabic")
                )}
              />
            </div>

            {/* Email | Visa Type */}
            <div className="space-y-1.5" id="field-email">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Email <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                type="email"
                placeholder="applicant@example.com"
                {...register("email")}
                className={cn(
                  "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("email")
                )}
              />
            </div>

            <div className="space-y-1.5" id="field-visa_type">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Visa Type <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {renderClearBtn("visa_type")}
              </div>
              <select
                {...register("visa_type")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("visa_type")
                )}
              >
                <option value="">Select Visa Type...</option>
                {VISA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. COLLAPSIBLE ACCORDION: Relative Information */}
      <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setIsRelativeOpen(!isRelativeOpen)}
          className="w-full flex items-center justify-between px-6 py-3.5 bg-slate-50/80 dark:bg-[#1b1b24] hover:bg-slate-100 dark:hover:bg-[#20202b] transition text-left"
        >
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tracking-wide">
            Relative Information
          </span>
          {isRelativeOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {isRelativeOpen && (
          <div className="p-6 border-t border-slate-200 dark:border-[#26262d] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Name <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="Relative / Next of kin name"
                {...register("relative_name")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Address Region <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Oromia / Addis Ababa"
                {...register("address_region")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Phone <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. +251..."
                {...register("relative_phone")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5" id="field-relative_kinship">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Relative Kinship <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {renderClearBtn("relative_kinship")}
              </div>
              <select
                {...register("relative_kinship")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("relative_kinship")
                )}
              >
                <option value="">Select Kinship...</option>
                {RELATIVE_KINSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5" id="field-relative_city">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                City <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                id="applicant_city_field"
                autoComplete="address-level2"
                placeholder="e.g. Adama"
                {...register("city")}
                onFocus={() => setIsSponsorAddrReadOnly(true)}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Subcity/Zone <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Arsi Zone"
                {...register("sub_region")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Woreda <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="Woreda number/name"
                {...register("relative_woreda")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative House # <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                placeholder="House number"
                {...register("relative_house_no")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5" id="field-relative_gender">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Relative Gender <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {renderClearBtn("relative_gender")}
              </div>
              <select
                {...register("relative_gender")}
                className={cn(
                  "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("relative_gender")
                )}
              >
                <option value="">Select Gender...</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                R-Birth Date <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <Input
                type="date"
                {...register("r_birth_date")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 7. COLLAPSIBLE ACCORDION: Other Information */}
      <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setIsOtherInfoOpen(!isOtherInfoOpen)}
          className="w-full flex items-center justify-between px-6 py-3.5 bg-slate-50/80 dark:bg-[#1b1b24] hover:bg-slate-100 dark:hover:bg-[#20202b] transition text-left"
        >
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tracking-wide">
            Other Information
          </span>
          {isOtherInfoOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {isOtherInfoOpen && (
          <div className="p-6 border-t border-slate-200 dark:border-[#26262d] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Subcity <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Subcity"
                  {...register("sub_region")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Woreda <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Woreda"
                  {...register("woreda")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  House No. <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="House No"
                  {...register("house_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  File No. <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="File #"
                  {...register("file_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Contract # <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Contract #"
                  {...register("contract_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Wakala # <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Wakala #"
                  {...register("wakala_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Sticker Visa # <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Sticker Visa #"
                  {...register("sticker_visa_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Signed On <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  type="date"
                  {...register("signed_on")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5" id="field-nationality">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Nationality <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </Label>
                  {renderClearBtn("nationality")}
                </div>
                <select
                  {...register("nationality")}
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                    getFieldClass("nationality")
                  )}
                >
                  <option value="">Select Nationality...</option>
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Other">Other</option>
                </select>
                {errors.nationality && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.nationality.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Biometric Id <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Biometric ID"
                  disabled={isFormReadOnly}
                  {...register("biometric_id")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5" id="field-leaving_town">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Leaving Town <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. Addis Ababa"
                  {...register("leaving_town")}
                  className={cn(
                    "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                    getFieldClass("leaving_town")
                  )}
                />
                {errors.leaving_town && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.leaving_town.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Second Contact Name <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Secondary contact name"
                  {...register("second_contact_name")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Second Contact Phone <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. +251..."
                  {...register("second_contact_phone")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
                {errors.second_contact_phone && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.second_contact_phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Second Contact Address <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Second contact address"
                  {...register("second_contact_address")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8. COLLAPSIBLE ACCORDION: Skills & Experience */}
      <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setIsSkillsOpen(!isSkillsOpen)}
          className="w-full flex items-center justify-between px-6 py-3.5 bg-slate-50/80 dark:bg-[#1b1b24] hover:bg-slate-100 dark:hover:bg-[#20202b] transition text-left"
        >
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tracking-wide">
            Skills & Experience
          </span>
          {isSkillsOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {isSkillsOpen && (
          <div className="p-6 border-t border-slate-200 dark:border-[#26262d] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5" id="field-english_level">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    English {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                  </Label>
                  {renderClearBtn("english_level")}
                </div>
                <select
                  {...register("english_level")}
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                    getFieldClass("english_level")
                  )}
                >
                  <option value="">Select English Level...</option>
                  {LANGUAGE_PROFICIENCY_OPTIONS.filter((opt) => opt !== "Select..").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.english_level && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.english_level.message}</p>
                )}
              </div>

              <div className="space-y-1.5" id="field-arabic_level">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Arabic {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                  </Label>
                  {renderClearBtn("arabic_level")}
                </div>
                <select
                  {...register("arabic_level")}
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                    getFieldClass("arabic_level")
                  )}
                >
                  <option value="">Select Arabic Level...</option>
                  {LANGUAGE_PROFICIENCY_OPTIONS.filter((opt) => opt !== "Select..").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.arabic_level && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.arabic_level.message}</p>
                )}
              </div>

              <div className="space-y-1.5" id="field-experience_country">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Experience Abroad <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                  </Label>
                  {renderClearBtn("experience_country")}
                </div>
                <select
                  {...register("experience_country")}
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200",
                    getFieldClass("experience_country")
                  )}
                >
                  <option value="">None / First Time</option>
                  {EXPERIENCE_ABROAD_OPTIONS.filter((opt) => opt !== "None / First Time").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5" id="field-salary_amount">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Salary (SAR / Monthly) {!isMuayena ? <span className="text-rose-500 font-bold ml-0.5">*</span> : <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>}
                </Label>
                <Input
                  type="number"
                  placeholder="1000"
                  {...register("salary_amount")}
                  className={cn(
                    "text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                    getFieldClass("salary_amount"),
                    getFieldClass("monthly_salary")
                  )}
                />
                {(errors.salary_amount || errors.monthly_salary) && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-0.5">
                    {errors.salary_amount?.message || errors.monthly_salary?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Works In <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Specific sector or position"
                  {...register("works_in")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Children <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...register("children")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Height <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. 165 cm"
                  {...register("height")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Weight <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. 60 kg"
                  {...register("weight")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5" id="field-complexion">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Skin Color <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                  </Label>
                  {renderClearBtn("complexion")}
                </div>
                <select
                  {...register("complexion")}
                  defaultValue="FAIR"
                  className={cn(
                    "select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200 uppercase",
                    getFieldClass("complexion")
                  )}
                >
                  <option value="">Select Skin Color...</option>
                  <option value="FAIR">Fair</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="DARK">Dark</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Reference No <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Reference number"
                  {...register("reference_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Remark <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                <Input
                  placeholder="Candidate remarks"
                  {...register("remarks")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>
            </div>

            {/* Skills Checkboxes: 4 columns x 2 rows (Matching Video Grid) */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#26262d] space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Skills Checklist <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_ironing")) === 1}
                    onChange={(e) => setValue("skill_ironing", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Ironing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_sewing")) === 1}
                    onChange={(e) => setValue("skill_sewing", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Sewing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_baby_sitting")) === 1}
                    onChange={(e) => setValue("skill_baby_sitting", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>B.Sitting</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_children_care")) === 1}
                    onChange={(e) => setValue("skill_children_care", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Ch.Care</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_arabic_cooking")) === 1}
                    onChange={(e) => setValue("skill_arabic_cooking", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Ar.Cooking</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_cleaning")) === 1}
                    onChange={(e) => setValue("skill_cleaning", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Cleaning</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_washing")) === 1}
                    onChange={(e) => setValue("skill_washing", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Washing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1a1a24]">
                  <input
                    type="checkbox"
                    checked={Number(watch("skill_cooking")) === 1}
                    onChange={(e) => setValue("skill_cooking", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>Cooking</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 9. MEDICAL FITNESS STATUS GATE */}
      <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#15151a] p-4 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>Medical Fitness & Regulatory Status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1" id="field-medical_status">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Medical Fitness Result <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
              </Label>
              {!isFormReadOnly && renderClearBtn("medical_status")}
            </div>
            <select
              {...register("medical_status")}
              disabled={isFormReadOnly}
              className={cn(
                "w-full h-8 rounded border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-2 py-0.5 text-xs text-slate-900 dark:text-zinc-200 font-medium",
                getFieldClass("medical_status")
              )}
            >
              <option value="">Select Medical Status...</option>
              <option value="FIT">FIT</option>
              <option value="Pending">Pending / In Progress</option>
              <option value="Not Done">Not Done / None</option>
              <option value="UNFIT">UNFIT</option>
            </select>
          </div>

          <div className="space-y-1" id="field-medical_expiry_date">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Medical Expiry Date <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
            </Label>
            <Input
              type="date"
              disabled={isFormReadOnly}
              {...register("medical_expiry_date")}
              className={cn(
                "text-xs h-8 border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                getFieldClass("medical_expiry_date")
              )}
            />
            {errors.medical_expiry_date && (
              <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.medical_expiry_date.message}</p>
            )}
          </div>
        </div>

        {/* Optional Labour ID, COC Status, and COC Exam Date immediately following Medical Status and Medical Date */}
        <div className="pt-2.5 border-t border-slate-200/60 dark:border-[#26262d]/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1" id="field-labor_id">
              <div className="flex items-center justify-between">
                <Label htmlFor="field_input_labor_id" className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Labour ID <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {!isFormReadOnly && renderClearBtn("labor_id")}
              </div>
              <Input
                id="field_input_labor_id"
                placeholder="e.g., LBR-998844"
                disabled={isFormReadOnly}
                {...register("labor_id")}
                className={cn(
                  "text-xs h-8 border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]",
                  getFieldClass("labor_id")
                )}
              />
              {errors.labor_id && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.labor_id.message}</p>
              )}
            </div>

            <div className="space-y-1" id="field-coc_status">
              <div className="flex items-center justify-between">
                <Label htmlFor="field_select_coc_status" className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  COC Status <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>
                </Label>
                {!isFormReadOnly && renderClearBtn("coc_status")}
              </div>
              <select
                id="field_select_coc_status"
                disabled={isFormReadOnly}
                {...register("coc_status")}
                className={cn(
                  "select-styled w-full h-8 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-2.5 py-1 text-xs text-slate-900 dark:text-zinc-200",
                  getFieldClass("coc_status")
                )}
              >
                <option value="">Select COC Status (Optional)...</option>
                <option value="No COC">No COC</option>
                <option value="On process">On process</option>
                <option value="Have COC">Have COC</option>
              </select>
              {errors.coc_status && (
                <p className="text-[11px] font-semibold text-rose-500 mt-0.5">{errors.coc_status.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 10. BOTTOM ACTION TOOLBAR (With Video-Matching Primary Save Button) */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#26262d] bg-white/95 dark:bg-[#121215]/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          {draftApplicantId ? (
            <span className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
              ID: <strong className="text-slate-900 dark:text-white">{draftApplicantId}</strong>
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              New Applicant Registration Form
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {isFormReadOnly ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#16161b]">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                Read-Only (Registrar / Admin required to edit)
              </span>
            </div>
          ) : (
            <>
              {/* Save as Draft Button (for new or draft records) */}
              {!existingApplicantId && (
                <Button
                  type="button"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={isSaving || registerMutation.isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold px-6 text-xs shadow-md"
                >
                  {saveDraftMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving Draft...
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-1.5 h-3.5 w-3.5 text-emerald-200" /> Save as Draft
                    </>
                  )}
                </Button>
              )}

              {/* Save Changes Button (when editing an existing applicant) */}
              {existingApplicantId && (
                <Button
                  type="button"
                  onClick={() => saveChangesMutation.mutate()}
                  disabled={isSaving}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold px-6 text-xs shadow-md"
                >
                  {saveChangesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-3.5 w-3.5 text-emerald-200" /> Update Profile
                    </>
                  )}
                </Button>
              )}

              {/* Register Applicant Button (promotes to Registered via backend gate) */}
              {applicantState !== "Registered" && applicantState !== "CV Generated" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmRegisterOpen(true)}
                  disabled={registerMutation.isPending || isSaving || watch("medical_status") === "UNFIT"}
                  className="border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold"
                >
                  <FileCheck2 className="mr-1.5 h-3.5 w-3.5" /> Register Applicant
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual Passport Code Paste Dialog Modal */}
      <Dialog open={isMrzDialogOpen} onOpenChange={setIsMrzDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-emerald-600" />
              Paste Passport Code
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Paste the 2 lines of code printed at the very bottom of the candidate&apos;s passport photo page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <Label htmlFor="mrz-raw-input" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Passport Code Lines (Bottom of Photo Page)
              </Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePasteClipboard}
                  className="h-7 px-2 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                  Paste from Clipboard
                </Button>
                {mrzInputText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMrzInputText("")}
                    className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Textarea
              id="mrz-raw-input"
              rows={4}
              value={mrzInputText}
              onChange={(e) => setMrzInputText(e.target.value)}
              placeholder={`P<ETHMOHAMMED<<FATUMA<<<<<<<<<<<<<<<<<<<<<<<\nEP12345674ETH9501018F2812316<<<<<<<<<<<<<<04`}
              className="font-mono text-xs uppercase tracking-wider bg-slate-50 dark:bg-[#16161b] border-slate-300 dark:border-zinc-800 focus-visible:ring-emerald-600 leading-relaxed"
            />

            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 p-2.5 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Format Guidelines:</span>
              </div>
              <p className="text-amber-800/90 dark:text-amber-300/80 pl-5 leading-relaxed">
                • Standard passports have <strong>2 lines of 44 characters</strong> with chevrons (<code className="font-mono font-bold">&lt;</code>).
                <br />
                • Line 1 starts with <code className="font-mono font-bold">P&lt;</code> followed by Country and Name.
                <br />
                • Line 2 contains Passport Number, DOB, Gender, and Expiry Date.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsMrzDialogOpen(false);
                setMrzInputText("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDecodePastedMrz}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Apply Extracted Data to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Registering Applicant */}
      <Dialog open={isConfirmRegisterOpen} onOpenChange={setIsConfirmRegisterOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
              <FileCheck2 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Confirm Applicant Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
              Are you sure you want to promote this applicant to <strong>Registered</strong>? This will validate all KYC, medical requirements, and field floors in accordance with <code>state_machine.py</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-100 dark:border-[#222227] bg-slate-50 dark:bg-[#16161b] p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Full Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {watch("full_name") || `${watch("first_name")} ${watch("last_name")}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Passport Number:</span>
              <span className="font-mono text-slate-900 dark:text-zinc-200">
                {watch("passport_number") || "Not entered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Medical Status:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {watch("medical_status")}
              </span>
            </div>
            {watch("labor_id") && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Labour ID:</span>
                <span className="font-mono text-slate-900 dark:text-zinc-200">
                  {watch("labor_id")}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmRegisterOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Registering...
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
