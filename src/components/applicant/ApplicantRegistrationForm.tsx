"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  BaseApplicantFormValues,
  baseApplicantSchema,
  stage1DraftSchema,
  stage2RegistrationSchema,
} from "@/lib/validations/applicant.schema";
import {
  createApplicantDraft,
  updateApplicantDraft,
  registerApplicant,
  generateCV,
  ApiError,
} from "@/lib/api/applicantApi";
import { ApplicantStepper, FORM_STEPS } from "./ApplicantStepper";
import { Step1PersonalInfo } from "./steps/Step1PersonalInfo";
import { Step2EducationExperience } from "./steps/Step2EducationExperience";
import { Step3IdentificationContact } from "./steps/Step3IdentificationContact";
import { Step4CocMedical } from "./steps/Step4CocMedical";
import { Step5Review } from "./steps/Step5Review";
import { Button } from "@/components/ui/button";
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

export function ApplicantRegistrationForm({
  initialData,
  existingApplicantId,
  onSuccessRedirect,
}: ApplicantRegistrationFormProps) {
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = React.useState<number>(1);
  const [draftApplicantId, setDraftApplicantId] = React.useState<string | null>(
    existingApplicantId || null
  );
  const [applicantState, setApplicantState] = React.useState<string>("Draft");
  const [generatedCvUrl, setGeneratedCvUrl] = React.useState<string | null>(null);

  // Dialog state
  const [isConfirmRegisterOpen, setIsConfirmRegisterOpen] = React.useState(false);
  const [isCvPreviewOpen, setIsCvPreviewOpen] = React.useState(false);

  // React Hook Form
  const form = useForm<BaseApplicantFormValues>({
    mode: "onBlur",
    defaultValues: {
      first_name: initialData?.first_name || "",
      middle_name: initialData?.middle_name || "",
      last_name: initialData?.last_name || "",
      gender: initialData?.gender || "",
      religion: initialData?.religion || "",
      marital_status: initialData?.marital_status || "",
      children: initialData?.children ?? 0,
      nationality: initialData?.nationality || "Ethiopia",
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
      passport_expiry: initialData?.passport_expiry || "",
      highest_education: initialData?.highest_education || "",
      institution: initialData?.institution || "",
      graduation_year: initialData?.graduation_year || ("" as unknown as number),
      current_employer: initialData?.current_employer || "",
      years_of_experience: initialData?.years_of_experience || ("" as unknown as number),
      labour_id: initialData?.labour_id || "",
      contact_person_name: initialData?.contact_person_name || "",
      contact_person_phone: initialData?.contact_person_phone || "",
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
    },
  });

  const { getValues, trigger, setError, formState: { isDirty } } = form;

  // Track max reached step for navigation
  const handleStepChange = (targetStep: number) => {
    setCurrentStep(targetStep);
    if (targetStep > maxReachedStep) {
      setMaxReachedStep(targetStep);
    }
  };

  // Step 1 Validation Trigger
  const validateCurrentStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      const step1Fields: (keyof BaseApplicantFormValues)[] = [
        "first_name",
        "last_name",
        "gender",
        "religion",
        "marital_status",
        "children",
        "nationality",
        "phone_number",
        "city",
        "country",
      ];
      return await trigger(step1Fields);
    }
    return true;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) {
      toast.error("Please complete all required fields on this step before proceeding.");
      return;
    }
    if (currentStep < FORM_STEPS.length) {
      handleStepChange(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 1. SAVE DRAFT MUTATION
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const formData = getValues();
      const validation = stage1DraftSchema.safeParse(formData);

      if (!validation.success) {
        // Set field errors in form
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof BaseApplicantFormValues, {
              message: err.message,
            });
          }
        });
        throw new Error(
          `Stage 1 mandatory fields missing: ${validation.error.errors
            .map((e) => e.message)
            .join(", ")}`
        );
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
      toast.success(`Draft saved successfully! (ID: ${data.name})`, {
        description: "You can continue editing now or return to this draft later.",
      });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error("Could not save Draft", {
        description: err.message || "Please check Stage 1 required fields.",
      });
    },
  });

  // 2. REGISTER APPLICANT MUTATION
  const registerMutation = useMutation({
    mutationFn: async () => {
      const formData = getValues();

      // Check Stage 2 validation strictly
      const validation = stage2RegistrationSchema.safeParse(formData);
      if (!validation.success) {
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            setError(err.path[0] as keyof BaseApplicantFormValues, {
              message: err.message,
            });
          }
        });
        const errMsgs = validation.error.errors.map((e) => e.message).join(", ");
        throw new Error(errMsgs);
      }

      let activeId = draftApplicantId;
      // If not yet saved as draft, save draft first
      if (!activeId) {
        const draft = await createApplicantDraft(formData);
        activeId = draft.name;
        setDraftApplicantId(draft.name);
      } else {
        await updateApplicantDraft(activeId, formData);
      }

      // Call authoritative registration endpoint
      return await registerApplicant(activeId);
    },
    onSuccess: (data) => {
      setApplicantState("Registered");
      setIsConfirmRegisterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Applicant successfully Registered!", {
        description: "Status changed to Registered. Ready for CV Generation.",
      });
      if (onSuccessRedirect && draftApplicantId) {
        // Optional redirect callback
      }
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      setIsConfirmRegisterOpen(false);
      toast.error("Registration Failed", {
        description: err.message || "Backend rejected the registration request.",
      });
    },
  });

  // 3. GENERATE CV MUTATION
  const generateCvMutation = useMutation({
    mutationFn: async () => {
      if (!draftApplicantId) throw new Error("No applicant ID available.");
      return await generateCV(draftApplicantId);
    },
    onSuccess: (data) => {
      setGeneratedCvUrl(data.file_url);
      setApplicantState("CV Generated");
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setIsCvPreviewOpen(true);
      toast.success(data.message || "CV PDF generated successfully!");
    },
    onError: (error: unknown) => {
      const err = error as Error;
      toast.error("CV Generation Failed", {
        description: err.message,
      });
    },
  });

  const handleRegisterClick = async () => {
    // Client-side pre-validation
    const formData = getValues();
    const validation = stage2RegistrationSchema.safeParse(formData);

    if (!validation.success) {
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          setError(err.path[0] as keyof BaseApplicantFormValues, {
            message: err.message,
          });
        }
      });

      // Find the first step with error and navigate there if needed
      toast.error("Registration Requirements Incomplete", {
        description: validation.error.errors[0]?.message || "Please check required fields.",
      });
      return;
    }

    if (formData.medical_status === "UNFIT") {
      toast.error("Applicant cannot be registered while medical status is UNFIT.");
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
      {/* Stepper Header */}
      <ApplicantStepper
        currentStep={currentStep}
        onStepClick={handleStepChange}
        maxCompletedStep={maxReachedStep}
      />

      {/* Main Step Form Body */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {currentStep === 1 && <Step1PersonalInfo form={form} />}
        {currentStep === 2 && <Step2EducationExperience form={form} />}
        {currentStep === 3 && <Step3IdentificationContact form={form} />}
        {currentStep === 4 && <Step4CocMedical form={form} />}
        {currentStep === 5 && (
          <Step5Review
            form={form}
            onNavigateToStep={handleStepChange}
            draftApplicantId={draftApplicantId}
            applicantState={applicantState}
            onGenerateCV={() => generateCvMutation.mutate()}
            isGeneratingCV={generateCvMutation.isPending}
            cvUrl={generatedCvUrl}
          />
        )}

        {/* Bottom Action Toolbar matching Figma */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-md backdrop-blur-xs">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="text-slate-700"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Previous Step
              </Button>
            )}
            {draftApplicantId && (
              <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex">
                Draft ID: <strong className="font-mono text-slate-800">{draftApplicantId}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Save Draft Action */}
            <Button
              type="button"
              variant="outline"
              onClick={() => saveDraftMutation.mutate()}
              disabled={isSavingDraft || isRegistering}
              className="border-slate-300 bg-white hover:bg-slate-50"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving Draft...
                </>
              ) : (
                <>
                  <Bookmark className="mr-1.5 h-4 w-4 text-emerald-800" />
                  Save Draft
                </>
              )}
            </Button>

            {/* Next or Register Action */}
            {currentStep < FORM_STEPS.length ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-emerald-900 hover:bg-emerald-950 text-white"
              >
                Next Step
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              !isRegistered && (
                <Button
                  type="button"
                  onClick={handleRegisterClick}
                  disabled={isRegistering || isSavingDraft || isMedicalUnfit}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="mr-1.5 h-4 w-4" />
                      Register Applicant
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        </div>
      </form>

      {/* Registration Confirmation Dialog Modal */}
      <Dialog open={isConfirmRegisterOpen} onOpenChange={setIsConfirmRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileCheck2 className="h-5 w-5 text-emerald-800" />
              Confirm Applicant Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              Are you sure you want to register this applicant? This will validate all Stage 1 & Stage 2 requirements and transition the record from <strong>Draft</strong> to <strong>Registered</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-900">
                {form.getValues("first_name")} {form.getValues("last_name")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Passport:</span>
              <span className="font-mono text-slate-900">{form.getValues("passport_number")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Medical Status:</span>
              <span className="font-semibold text-emerald-700">{form.getValues("medical_status")}</span>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmRegisterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => registerMutation.mutate()}
              disabled={isRegistering}
              className="bg-emerald-900 hover:bg-emerald-950 text-white"
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

      {/* Generated CV Preview Modal */}
      <Dialog open={isCvPreviewOpen} onOpenChange={setIsCvPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-emerald-800" />
              Standardized Candidate CV
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Generated candidate CV record for {form.getValues("first_name")} {form.getValues("last_name")}.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="border border-slate-200 bg-white p-6 rounded-lg shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {form.getValues("first_name")} {form.getValues("middle_name")} {form.getValues("last_name")}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {form.getValues("highest_education")} • {form.getValues("nationality")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                    {draftApplicantId}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Status: Registered</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h5 className="font-semibold text-slate-700">Contact</h5>
                  <p className="text-slate-600">{form.getValues("phone_number")}</p>
                  <p className="text-slate-600">{form.getValues("email") || "No email"}</p>
                  <p className="text-slate-600">{form.getValues("city")}, {form.getValues("country")}</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-700">Identification</h5>
                  <p className="text-slate-600">Passport: {form.getValues("passport_number")}</p>
                  <p className="text-slate-600">Labour ID: {form.getValues("labour_id")}</p>
                  <p className="text-slate-600">COC: {form.getValues("coc_status")}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs">
                <h5 className="font-semibold text-slate-700 mb-1">Education & Experience</h5>
                <p className="text-slate-600">
                  {form.getValues("highest_education")} from {form.getValues("institution") || "N/A"}{" "}
                  {form.getValues("graduation_year") ? `(${form.getValues("graduation_year")})` : ""}
                </p>
                {form.getValues("years_of_experience") ? (
                  <p className="text-slate-600 mt-1">
                    {form.getValues("years_of_experience")} years at {form.getValues("current_employer") || "Previous Employer"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCvPreviewOpen(false)}
            >
              Close
            </Button>
            {generatedCvUrl && (
              <a
                href={generatedCvUrl}
                download
                className="inline-flex items-center justify-center rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950"
              >
                Download PDF
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
