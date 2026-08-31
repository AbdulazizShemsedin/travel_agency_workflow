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
  createApplicantDraft,
  updateApplicantDraft,
  registerApplicant,
  generateCV,
  getApplicant,
  ApiError,
} from "@/lib/api/applicantApi";
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
  onSuccessRedirect?: (applicantId: string) => void;
}

const SECTIONS = [
  { id: "section-personal", label: "1. Personal & Passport", icon: User },
  { id: "section-education", label: "2. Education & Skills", icon: GraduationCap },
  { id: "section-identification", label: "3. ID & Contacts", icon: ShieldCheck },
  { id: "section-medical", label: "4. Medical & COC", icon: HeartPulse },
];

export function ApplicantRegistrationForm({
  initialData,
  existingApplicantId,
  onSuccessRedirect,
}: ApplicantRegistrationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draftApplicantId, setDraftApplicantId] = React.useState<string | null>(
    existingApplicantId || null
  );
  const [applicantState, setApplicantState] = React.useState<string>("Draft");
  const [generatedCvUrl, setGeneratedCvUrl] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<string>("section-personal");

  // Dialog state
  const [isConfirmRegisterOpen, setIsConfirmRegisterOpen] = React.useState(false);
  const [isCvPreviewOpen, setIsCvPreviewOpen] = React.useState(false);

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
      passport_expiry: initialData?.passport_expiry || "",
      place_of_issue: initialData?.place_of_issue || "",
      job_applied: initialData?.job_applied || "House worker",
      highest_education: initialData?.highest_education || "",
      institution: initialData?.institution || "",
      graduation_year: initialData?.graduation_year ?? undefined,
      current_employer: initialData?.current_employer || "",
      years_of_experience: initialData?.years_of_experience ?? undefined,
      english_level: initialData?.english_level || "",
      arabic_level: initialData?.arabic_level || "",
      experience_country: initialData?.experience_country || "",
      experience_period: initialData?.experience_period || "",
      monthly_salary: initialData?.monthly_salary || "1000",
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
      medical_expiry_date: initialData?.medical_expiry_date || "",
      remarks: initialData?.remarks || "",
      medical_remarks: initialData?.medical_remarks || "",
      education_remarks: initialData?.education_remarks || "",
      fee_required: initialData?.fee_required || false,
      registration_fee_amount: initialData?.registration_fee_amount || 0,
      profile_photo_url: initialData?.profile_photo_url || "",
      photo_passport: initialData?.photo_passport || "",
      photo_full_body: initialData?.photo_full_body || "",
      passport_scan: initialData?.passport_scan || "",
    },
  });

  const { getValues, setError, clearErrors, reset } = form;

  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset({
        ...getValues(),
        ...initialData,
      });
      if (existingApplicantId) {
        setDraftApplicantId(existingApplicantId);
      }
    }
  }, [initialData, existingApplicantId]);

  // Smooth scroll directly to input element on error
  const scrollToFieldWithError = (fieldName?: string) => {
    if (!fieldName) return;
    setTimeout(() => {
      const el =
        document.getElementById(fieldName) ||
        document.querySelector(`[name="${fieldName}"]`) ||
        document.getElementById(`field-${fieldName}`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus?.();
        el.classList.add("ring-4", "ring-rose-500", "ring-offset-2", "transition-all", "duration-500");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-rose-500", "ring-offset-2");
        }, 3500);
      }
    }, 150);
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

        throw new Error(firstError?.message || "Please complete required Stage 1 draft fields.");
      }

      if (draftApplicantId) {
        return await updateApplicantDraft(draftApplicantId, formData);
      } else {
        return await createApplicantDraft(formData);
      }
    },
    onSuccess: (data) => {
      setDraftApplicantId(data.name);
      setApplicantState(data.applicant_state || "Draft");
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(`Draft Saved Successfully (ID: ${data.name})`, {
        description: "Applicant record saved. You can continue editing or return later.",
      });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
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
      return await updateApplicantDraft(draftApplicantId, formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant", data.name] });
      toast.success("Applicant changes saved successfully!", {
        description: "All profile details and official CV have been updated.",
      });
      if (onSuccessRedirect && draftApplicantId) {
        onSuccessRedirect(draftApplicantId);
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
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
      if (!activeId) {
        const draft = await createApplicantDraft(formData);
        activeId = draft.name;
        setDraftApplicantId(draft.name);
      } else {
        await updateApplicantDraft(activeId, formData);
      }

      return await registerApplicant(activeId);
    },
    onSuccess: (data) => {
      setApplicantState("Registered");
      setIsConfirmRegisterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Applicant Successfully Registered!", {
        description: "Status transitioned to Registered. You can now generate an official CV.",
      });
      if (onSuccessRedirect && draftApplicantId) {
        onSuccessRedirect(draftApplicantId);
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      setIsConfirmRegisterOpen(false);
      toast.error("Registration Requirement Not Met", {
        description: err.message || "Please check the highlighted required fields.",
        duration: 6000,
      });
    },
  });

  // 3. GENERATE CV MUTATION
  const generateCvMutation = useMutation({
    mutationFn: async () => {
      if (!draftApplicantId) throw new Error("No applicant ID available.");
      const formData = getValues();
      if (formData && Object.keys(formData).length > 0) {
        await updateApplicantDraft(draftApplicantId, formData);
      }
      return await generateCV(draftApplicantId);
    },
    onSuccess: async (data) => {
      const fileUrl = data.message?.file_url;
      if (fileUrl) {
        setGeneratedCvUrl(fileUrl);
        setIsCvPreviewOpen(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["applicants"] });
      await queryClient.invalidateQueries({ queryKey: ["applicant", draftApplicantId] });
      try {
        if (draftApplicantId) {
          const refreshed = await getApplicant(draftApplicantId);
          if (refreshed?.applicant_state) {
            setApplicantState(refreshed.applicant_state);
          }
        }
      } catch {}
      toast.success(data.message?.message || "CV PDF generated successfully!");
    },
    onError: (error: unknown) => {
      const err = error as Error;
      toast.error("CV Generation Failed", {
        description: err.message,
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

      const fieldTitle = errorField
        ? errorField
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Field";

      toast.error("Registration Requirements Incomplete", {
        description: `Please check "${fieldTitle}": ${
          firstError?.message || "Please complete this field"
        }.`,
        duration: 6000,
      });
      return;
    }

    if (formData.medical_status === "UNFIT") {
      scrollToFieldWithError("medical_status");
      toast.error("Medical Status is UNFIT", {
        description:
          "Applicant cannot be registered while medical status is UNFIT. Please update once cleared.",
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
          <Step1PersonalInfo form={form} />
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

        {/* Section 5: CV & Document Actions (When ID exists or registered) */}
        {draftApplicantId && (
          <section id="section-cv" className="scroll-mt-20 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-[#222227]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                5
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Official CV & Bilateral Documents
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Compile and generate standardized bilingual CV for international recruitment partner discovery.
                </p>
              </div>
            </div>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <FileCheck2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    Bilingual International Recruitment CV
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Compiled directly by the backend engine with photo, passport details, skill ratings, and medical clearance.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    onClick={() => generateCvMutation.mutate()}
                    disabled={generateCvMutation.isPending}
                    className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
                  >
                    {generateCvMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Generating CV...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Generate Official CV
                      </>
                    )}
                  </Button>

                  {generatedCvUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCvPreviewOpen(true)}
                      className="text-xs font-semibold text-slate-700 dark:text-zinc-300"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Preview PDF
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </section>
        )}

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

      {/* Official Backend Generated CV Preview Modal */}
      <Dialog open={isCvPreviewOpen} onOpenChange={setIsCvPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] flex flex-col p-6">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-[#202026]">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileCheck2 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                  Official Backend Generated Candidate CV
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  Official bilateral recruitment CV compiled and formatted by the backend processing engine.
                </DialogDescription>
              </div>
              {generatedCvUrl && (
                <a
                  href={generatedCvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[60vh] py-4">
            {generatedCvUrl ? (
              <iframe
                src={generatedCvUrl}
                className="w-full h-full min-h-[60vh] rounded-lg border border-slate-200 dark:border-[#202026]"
                title="Candidate CV Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No CV file URL available.
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-[#202026]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCvPreviewOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
