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
} from "lucide-react";
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
} from "@/lib/validations/applicant.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createApplicantV2,
  updateApplicantV2,
  registerApplicantV2,
  uploadFileV2,
  parsePassportFileV2,
  normalizeApplicantFields,
} from "@/lib/api/v2";
import { checkApplicantUniquenessV2 } from "@/lib/api/v2/applicants";
import { listContractorsV2 } from "@/lib/api/v2/contractors";
import { parseMRZText, performOpticalPassportOCR, ParsedPassportMRZ } from "@/lib/utils/mrzScanner";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
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

interface ApplicantRegistrationFormProps {
  initialData?: Partial<BaseApplicantFormValues>;
  existingApplicantId?: string;
  lockedIdentityFields?: boolean;
  onSuccessRedirect?: (applicantId: string) => void;
}

type MediaTabType = "photo" | "full_size" | "passport" | "video";

const PASSPORT_TYPE_OPTIONS = ["Normal", "Diplomatic", "Special", "Service"] as const;
const VISA_TYPE_OPTIONS = ["Work", "Visit", "Tourist", "Business", "Other"] as const;
const LANGUAGE_PROFICIENCY_OPTIONS = ["Select..", "None", "Poor", "Fair", "Basic", "Good", "Fluent"] as const;
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

// Fields locked when an active placement is running
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

  // Collapsible Accordions state (as in video)
  const [isRelativeOpen, setIsRelativeOpen] = React.useState<boolean>(false);
  const [isOtherInfoOpen, setIsOtherInfoOpen] = React.useState<boolean>(false);
  const [isSkillsOpen, setIsSkillsOpen] = React.useState<boolean>(true);

  // Dialog state
  const [isConfirmRegisterOpen, setIsConfirmRegisterOpen] = React.useState(false);

  // Live duplicate passport feedback
  const [passportConflict, setPassportConflict] = React.useState<string | null>(null);

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
    // @ts-expect-error zodResolver type widening across optional schema fields
    resolver: zodResolver(stage1DraftSchema),
    defaultValues: {
      applicant_type: (initialData?.applicant_type as any) || "Standard",
      destination_country: initialData?.destination_country || "Saudi Arabia",
      application_number: (initialData as any)?.application_number || draftApplicantId || "",
      full_name: initFullName,
      first_name: initialData?.first_name || "",
      middle_name: initialData?.middle_name || "",
      last_name: initialData?.last_name || "",
      gender: initialData?.gender || "Female",
      religion: initialData?.religion === "Muslim" ? "Islam" : initialData?.religion || "Islam",
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
      qualification: (initialData as any)?.qualification || initialData?.education || "SECONDARY LEVEL",
      monthly_salary: initialData?.monthly_salary || (initialData?.salary_amount ? String(initialData.salary_amount) : "1000"),
      salary_amount: initialData?.salary_amount || (initialData?.monthly_salary ? Number(initialData.monthly_salary) : 1000),
      salary_currency: initialData?.salary_currency || "SAR",
      photograph: initialData?.photograph || initialData?.photo_passport || initialData?.profile_photo_url || "",
      photo_passport: initialData?.photo_passport || initialData?.photograph || initialData?.profile_photo_url || "",
      profile_photo_url: initialData?.profile_photo_url || initialData?.photograph || "",
      photo_full_body: initialData?.photo_full_body || "",
      passport_scan: initialData?.passport_scan || "",
      video_url: initialData?.video_url || (initialData as any)?.intro_video || "",
      is_active: (initialData as any)?.is_active ?? true,
      registration_date: (initialData as any)?.registration_date || new Date().toISOString().slice(0, 10),

      // Sponsor & Visa
      visa_number: (initialData as any)?.visa_number || "",
      sponsor_name: (initialData as any)?.sponsor_name || "",
      sponsor_id: (initialData as any)?.sponsor_id || "",
      sponsor_phone: (initialData as any)?.sponsor_phone || "",
      sponsor_address: (initialData as any)?.sponsor_address || "",
      agent: (initialData as any)?.agent || (initialData as any)?.contractor_name || "",
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
      contact_person_2nd: (initialData as any)?.contact_person_2nd || "",
      contact_phone_2nd: (initialData as any)?.contact_phone_2nd || "",
      coc_center: (initialData as any)?.coc_center || "",
      certified_date: (initialData as any)?.certified_date || initialData?.exam_date || "",
      exam_date: initialData?.exam_date || (initialData as any)?.certified_date || "",
      certificate_no: (initialData as any)?.certificate_no || "",
      training_type: (initialData as any)?.training_type || "",
      photos_2: (initialData as any)?.photos_2 ?? false,
      is_filed: (initialData as any)?.is_filed ?? false,
      relative_id_card: (initialData as any)?.relative_id_card ?? false,

      // Skills & Experience
      english_level: initialData?.english_level || "Poor",
      arabic_level: initialData?.arabic_level || "Fair",
      experience_country: initialData?.experience_country || "None / First Time",
      works_in: (initialData as any)?.works_in || "",
      height: initialData?.height || "",
      weight: initialData?.weight || "",
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
      reset({
        ...getValues(),
        ...normalized,
        full_name: name,
      });
      if (existingApplicantId) {
        setDraftApplicantId(existingApplicantId);
      }
    }
  }, [initialData, existingApplicantId, reset]);

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
      setValue("place_of_birth", parsed.place_of_birth.toUpperCase().trim());
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
    setIsScanningOCR(true);
    const toastId = toast.loading("Uploading and analyzing passport scan...");

    try {
      // 1. Upload scan file
      const uploadRes = await uploadFileV2(file, false, "Applicant", draftApplicantId || undefined);
      const fileUrl = (uploadRes as any)?.message?.file_url || (uploadRes as any)?.file_url;
      if (fileUrl) {
        setValue("passport_scan", fileUrl);
      }

      // 2. Run Optical OCR / Passport Parser
      let parsedData: ParsedPassportMRZ | null = null;

      // Try client-side optical OCR first
      try {
        parsedData = await performOpticalPassportOCR(file);
      } catch (ocrErr) {
        console.warn("Client OCR fallback:", ocrErr);
      }

      // If client OCR didn't catch MRZ, try backend parser endpoint
      if (!parsedData || !parsedData.passport_number) {
        try {
          if (fileUrl) {
            const serverParsed = await parsePassportFileV2(fileUrl);
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
          }
        } catch (serverErr) {
          console.warn("Backend parse endpoint fallback:", serverErr);
        }
      }

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
      toast.error("Passport scanning error", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsScanningOCR(false);
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

    const rawPayload: Record<string, any> = {
      ...data,
      full_name: data.full_name || `${finalFirst} ${finalMiddle} ${finalLast}`.trim(),
      first_name: finalFirst,
      middle_name: finalMiddle,
      last_name: finalLast,
      entry_track: data.applicant_type || "Standard",
      target_job: data.target_job || data.job_applied || "HOUSE WORKER",
      job_applied: data.job_applied || data.target_job || "HOUSE WORKER",
      education: data.qualification || data.education || data.highest_education || "SECONDARY LEVEL",
      highest_education: data.qualification || data.highest_education || data.education || "SECONDARY LEVEL",
      qualification: data.qualification || "SECONDARY LEVEL",
      religion: data.religion || "Islam",
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
      phone: data.phone_number || "",
      passport_issue_place: data.place_of_issue || "ADDIS ABABA",
      passport_expiry_date: data.passport_expiry || "",
      contract_number: data.contract_number || "",
      exam_date: data.certified_date || data.exam_date || "",
    };

    return normalizeApplicantFields(stripLockedIdentityFields(rawPayload, lockedIdentityFields));
  };

  // Upload handler for active media tab
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const res = await uploadFileV2(file, false, "Applicant", draftApplicantId || undefined);
      const url = (res as any)?.message?.file_url || (res as any)?.file_url;
      if (!url) throw new Error("Upload succeeded but no file URL returned.");

      if (activeMediaTab === "photo") {
        setValue("photograph", url);
        setValue("photo_passport", url);
        setValue("profile_photo_url", url);
        toast.success("Photo uploaded successfully!");
      } else if (activeMediaTab === "full_size") {
        setValue("photo_full_body", url);
        toast.success("Full-size photo uploaded successfully!");
      } else if (activeMediaTab === "passport") {
        setValue("passport_scan", url);
        toast.success("Passport scan uploaded!");
        // Run OCR on passport
        handlePassportAutoScan(file);
      } else if (activeMediaTab === "video") {
        setValue("video_url", url);
        toast.success("Video interview uploaded successfully!");
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
      if (draftApplicantId) {
        res = await updateApplicantV2(draftApplicantId, payload);
      } else {
        res = await createApplicantV2(payload as any);
      }
      return res;
    },
    onSuccess: (data) => {
      const savedId = data?.name || draftApplicantId;
      if (savedId) setDraftApplicantId(savedId);
      setApplicantState(data?.status || data?.applicant_state || "Draft");
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(`Applicant Saved Successfully (ID: ${savedId || ""})`, {
        description: "Draft saved. Redirecting to details...",
      });
      if (onSuccessRedirect && savedId) {
        onSuccessRedirect(savedId);
      } else if (savedId) {
        router.push(`/applicants/${encodeURIComponent(savedId)}`);
      }
    },
    onError: (error: unknown) => {
      toast.error("Could not save applicant", {
        description: formatCleanErrorMessage(error),
      });
    },
  });

  // 2. SAVE CHANGES MUTATION (FOR EDIT MODE)
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      if (!draftApplicantId) throw new Error("No applicant ID to update.");
      const payload = buildPayload();
      return await updateApplicantV2(draftApplicantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", draftApplicantId] });
      toast.success("Applicant changes saved successfully!");
      if (onSuccessRedirect && draftApplicantId) {
        onSuccessRedirect(draftApplicantId);
      }
    },
    onError: (err: unknown) => {
      toast.error("Failed to save changes", {
        description: formatCleanErrorMessage(err),
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
        throw new Error(firstErr);
      }

      let activeId = draftApplicantId;
      const payload = buildPayload();

      if (!activeId) {
        const draft = await createApplicantV2(payload as any);
        activeId = draft.name || "";
        setDraftApplicantId(activeId);
      } else {
        await updateApplicantV2(activeId, payload);
      }

      const regRes = await registerApplicantV2(activeId);
      return { ...regRes, applicantId: activeId };
    },
    onSuccess: (data: any) => {
      const targetId = data?.applicantId || draftApplicantId;
      setApplicantState("Registered");
      setIsConfirmRegisterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (targetId) queryClient.invalidateQueries({ queryKey: ["applicant", targetId] });
      toast.success("Applicant Registered Successfully!", {
        description: `Record ${targetId} is now Registered.`,
      });
      if (onSuccessRedirect && targetId) {
        onSuccessRedirect(targetId);
      } else if (targetId) {
        router.push(`/applicants/${encodeURIComponent(targetId)}`);
      }
    },
    onError: (err: unknown) => {
      toast.error("Registration Requirements Not Met", {
        description: formatCleanErrorMessage(err),
        duration: 7000,
      });
    },
  });

  const photoValue = watch("photograph") || watch("photo_passport") || watch("profile_photo_url");
  const fullSizeValue = watch("photo_full_body");
  const passportValue = watch("passport_scan");
  const videoValue = watch("video_url");
  const currentApplicantType = watch("applicant_type") || "Standard";
  const currentDestCountry = watch("destination_country") || "Saudi Arabia";

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
    <div className="space-y-6 max-w-5xl mx-auto">
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

      {/* 1. STANDARD VS MUAYENA DEPLOYMENT TRACK SELECTION (Previous UI Feature restored) */}
      <Card className="border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151a] shadow-xs overflow-hidden">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-emerald-700" />
                Destination Country Corridor <span className="text-rose-500">*</span>
              </Label>
              <select
                {...register("destination_country")}
                disabled={lockedIdentityFields}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {DESTINATION_COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 pt-0.5">
                {currentDestCountry.toLowerCase() === "kuwait"
                  ? "🇰🇼 Kuwait Corridor: Direct LMIS Work Permit & Visa flow (Exempt from Musaned/Wakala)."
                  : currentDestCountry.toLowerCase() === "saudi arabia"
                  ? "🇸🇦 Saudi Corridor: 3-Stream Flow (Musaned verification, Wakala power of attorney & Injaz)."
                  : " International Corridor: Standard visa and contract processing pipeline."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. PASSPORT QUICK-SCAN & AUTO-FILL HERO EXTRACTOR (Previous UI Feature restored) */}
      <Card
        id="field-passport_scan"
        className={`border-2 border-dashed ${
          errors.passport_scan
            ? "border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20"
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
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Passport Quick-Scan & Auto-Fill
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
        <div className="p-3 border-b border-slate-200 dark:border-[#26262d] bg-slate-50/90 dark:bg-[#16161e]">
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
              <span>Photo</span>
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
              <span>Full Size</span>
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
              <span>Passport</span>
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
              <span>Video Interview</span>
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
              {activeMediaTab === "photo" && <><Camera className="h-3.5 w-3.5 text-emerald-200" /> Photo (Passport Size)</>}
              {activeMediaTab === "full_size" && <><User className="h-3.5 w-3.5 text-emerald-200" /> Full Size Photo</>}
              {activeMediaTab === "passport" && <><FileText className="h-3.5 w-3.5 text-emerald-200" /> Passport Scan</>}
              {activeMediaTab === "video" && <><Video className="h-3.5 w-3.5 text-emerald-200" /> Video Interview</>}
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
              } else {
                try {
                  setIsUploadingMedia(true);
                  const res = await uploadFileV2(file, false, "Applicant");
                  const url = res.file_url || (res as any).message?.file_url;
                  if (url) {
                    if (activeMediaTab === "photo") {
                      setValue("photograph", url);
                      setValue("photo_passport", url);
                      setValue("profile_photo_url", url);
                    } else if (activeMediaTab === "full_size") {
                      setValue("photo_full_body", url);
                    } else if (activeMediaTab === "video") {
                      setValue("video_url", url);
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
                setValue("video_url", "");
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
                Application No.
              </Label>
              <Input
                placeholder="e.g. APP-00102"
                {...register("application_number")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date
              </Label>
              <Input
                type="date"
                {...register("registration_date")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Row 2: Full Name | Active ? */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  Full Name <Info className="h-3 w-3 text-slate-400" />
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
                disabled={lockedIdentityFields}
                className={`text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215] ${
                  errors.full_name ? "border-rose-500 focus-visible:ring-rose-500" : ""
                }`}
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-center">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                Status
              </Label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span>Active ?</span>
              </label>
            </div>

            {/* Row 3: Passport No. | Passport Type */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  Passport No. <Info className="h-3 w-3 text-slate-400" />
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
                disabled={lockedIdentityFields}
                className={`text-xs uppercase font-mono border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215] ${
                  passportConflict || errors.passport_number ? "border-rose-500 focus-visible:ring-rose-500" : ""
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Passport Type
              </Label>
              <select
                {...register("passport_type")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {PASSPORT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4: Date of Birth | Place of Birth */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Birth
              </Label>
              <Input
                type="date"
                {...register("date_of_birth")}
                disabled={lockedIdentityFields}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Place of Birth
              </Label>
              <Input
                placeholder="e.g. ARSI"
                {...register("place_of_birth")}
                className="text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Row 5: Date of Issue | Date of Expiry */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Issue
              </Label>
              <Input
                type="date"
                {...register("passport_issue_date")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Date of Expiry
              </Label>
              <Input
                type="date"
                {...register("passport_expiry")}
                disabled={lockedIdentityFields}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Row 6: Place of Issue | Place of Birth */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Place of Issue
              </Label>
              <Input
                placeholder="e.g. ADDIS ABABA"
                {...register("place_of_issue")}
                className="text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Place of Birth
                </Label>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </div>
              <Input
                placeholder="e.g. ADDIS ABABA, OROMIA"
                {...register("place_of_birth")}
                className="text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Phone No.
              </Label>
              <Input
                placeholder="e.g. +251911223344"
                {...register("phone_number")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Row 7: Religion | Marital Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Religion
              </Label>
              <select
                {...register("religion")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {RELIGION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Marital Status
              </Label>
              <select
                {...register("marital_status")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 8: Gender | Occupation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Gender
              </Label>
              <select
                {...register("gender")}
                disabled={lockedIdentityFields}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Occupation
              </Label>
              <select
                {...register("job_applied")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200 uppercase"
              >
                {OCCUPATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 9: Qualification | City */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Qualification
              </Label>
              <select
                {...register("qualification")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200 uppercase"
              >
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                City
              </Label>
              <Input
                placeholder="e.g. Addis Ababa"
                {...register("city")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
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
                Visa Number
              </Label>
              <Input
                placeholder="Enter visa number"
                {...register("visa_number")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Name
              </Label>
              <Input
                placeholder="Enter sponsor name"
                {...register("sponsor_name")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Sponsor ID | Sponsor Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor ID
              </Label>
              <Input
                placeholder="e.g. 1029384756"
                {...register("sponsor_id")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Phone
              </Label>
              <Input
                placeholder="e.g. +966..."
                {...register("sponsor_phone")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Sponsor Address | Agent */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Address
              </Label>
              <Input
                placeholder="e.g. JEDDAH"
                {...register("sponsor_address")}
                className="text-xs uppercase border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Agent
              </Label>
              <select
                {...register("agent")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
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

            {/* National ID | Sponsor Arabic */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                National ID
              </Label>
              <Input
                placeholder="Fayda / FAN National ID"
                {...register("national_id")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Sponsor Arabic
              </Label>
              <Input
                placeholder="اسم الكفيل"
                {...register("sponsor_arabic")}
                dir="rtl"
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            {/* Email | Visa Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Email
              </Label>
              <Input
                type="email"
                placeholder="applicant@example.com"
                {...register("email")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Visa Type
              </Label>
              <select
                {...register("visa_type")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
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
                Relative Name
              </Label>
              <Input
                placeholder="Relative / Next of kin name"
                {...register("relative_name")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Address Region
              </Label>
              <Input
                placeholder="e.g. Oromia / Addis Ababa"
                {...register("address_region")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Phone
              </Label>
              <Input
                placeholder="e.g. +251..."
                {...register("relative_phone")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Kinship
              </Label>
              <select
                {...register("relative_kinship")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                {RELATIVE_KINSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                City
              </Label>
              <Input
                placeholder="e.g. Adama"
                {...register("city")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Subcity/Zone
              </Label>
              <Input
                placeholder="e.g. Arsi Zone"
                {...register("sub_region")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Woreda
              </Label>
              <Input
                placeholder="Woreda number/name"
                {...register("relative_woreda")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative House #
              </Label>
              <Input
                placeholder="House number"
                {...register("relative_house_no")}
                className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Relative Gender
              </Label>
              <select
                {...register("relative_gender")}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                R-Birth Date
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
                  Region
                </Label>
                <Input
                  placeholder="e.g. Oromia"
                  {...register("region")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Subcity
                </Label>
                <Input
                  placeholder="Subcity"
                  {...register("sub_region")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Woreda
                </Label>
                <Input
                  placeholder="Woreda"
                  {...register("woreda")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  House No.
                </Label>
                <Input
                  placeholder="House No"
                  {...register("house_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  File No.
                </Label>
                <Input
                  placeholder="File #"
                  {...register("file_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Contract #
                </Label>
                <Input
                  placeholder="Contract #"
                  {...register("contract_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Wakala #
                </Label>
                <Input
                  placeholder="Wakala #"
                  {...register("wakala_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Sticker Visa #
                </Label>
                <Input
                  placeholder="Sticker Visa #"
                  {...register("sticker_visa_number")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Signed On
                </Label>
                <Input
                  type="date"
                  {...register("signed_on")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nationality
                </Label>
                <select
                  {...register("nationality")}
                  disabled={lockedIdentityFields}
                  className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
                >
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Biometric Id
                </Label>
                <Input
                  placeholder="Biometric ID"
                  {...register("biometric_id")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Labor ID
                </Label>
                <Input
                  placeholder="Ministry Labor ID"
                  {...register("labor_id")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Contact Person(2nd)
                </Label>
                <Input
                  placeholder="Secondary contact name"
                  {...register("contact_person_2nd")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Contact Phone(2nd)
                </Label>
                <Input
                  placeholder="Secondary contact phone"
                  {...register("contact_phone_2nd")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>
            </div>

            {/* Checkbox Group: Photos (2) | Is(f)Filed | Relative ID Card */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#26262d] flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  {...register("photos_2")}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span>Photos (2)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  {...register("is_filed")}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span>IsIDFiled</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  {...register("relative_id_card")}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span>Relative ID Card</span>
              </label>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  English
                </Label>
                <select
                  {...register("english_level")}
                  className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
                >
                  {LANGUAGE_PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt === "Select.." ? "" : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Arabic
                </Label>
                <select
                  {...register("arabic_level")}
                  className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
                >
                  {LANGUAGE_PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt === "Select.." ? "" : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Experience Abroad
                </Label>
                <select
                  {...register("experience_country")}
                  className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
                >
                  {EXPERIENCE_ABROAD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Salary (SAR / Monthly)
                </Label>
                <Input
                  type="number"
                  placeholder="1000"
                  {...register("salary_amount")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Works In
                </Label>
                <Input
                  placeholder="Specific sector or position"
                  {...register("works_in")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Children
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
                  Height
                </Label>
                <Input
                  placeholder="e.g. 165 cm"
                  {...register("height")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Weight
                </Label>
                <Input
                  placeholder="e.g. 60 kg"
                  {...register("weight")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Reference No
                </Label>
                <Input
                  placeholder="Reference number"
                  {...register("reference_no")}
                  className="text-xs border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Remark
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
                Skills Checklist
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
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Medical Fitness Result
            </Label>
            <select
              {...register("medical_status")}
              className="w-full h-8 rounded border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-2 py-0.5 text-xs text-slate-900 dark:text-zinc-200 font-medium"
            >
              <option value="FIT">FIT</option>
              <option value="Pending">Pending / In Progress</option>
              <option value="Not Done">Not Done / None</option>
              <option value="UNFIT">UNFIT</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Medical Expiry Date
            </Label>
            <Input
              type="date"
              {...register("medical_expiry_date")}
              className="text-xs h-8 border-slate-300 dark:border-[#2b2b35] dark:bg-[#121215]"
            />
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
              Paste the 2 lines of code printed at the very bottom of the candidate's passport photo page.
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
