"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { BaseApplicantFormValues } from "@/lib/validations/applicant.schema";
import { checkApplicantUniquenessV2 } from "@/lib/api/v2/applicants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Step3IdentificationContactProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
  editingApplicantName?: string;
}

export function Step3IdentificationContact({
  form,
  editingApplicantName,
}: Step3IdentificationContactProps) {
  const {
    register,
    watch,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = form;

  const nationalIdValue = watch("national_id");
  const labourIdValue = watch("labour_id");

  const [nationalIdConflict, setNationalIdConflict] = React.useState<string | null>(null);
  const [isCheckingNationalId, setIsCheckingNationalId] = React.useState(false);

  const [labourIdConflict, setLabourIdConflict] = React.useState<string | null>(null);
  const [isCheckingLabourId, setIsCheckingLabourId] = React.useState(false);

  const nationalTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const labourTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedNationalIdRef = React.useRef<string>("");
  const lastCheckedLabourIdRef = React.useRef<string>("");

  // Live Uniqueness Check: National ID / Fayda (FAN no)
  const verifyNationalIdUniqueness = React.useCallback(
    async (rawValue: string) => {
      const clean = (rawValue || "").trim();
      if (!clean || clean.length < 4) {
        setNationalIdConflict(null);
        setIsCheckingNationalId(false);
        clearErrors("national_id");
        lastCheckedNationalIdRef.current = clean;
        return;
      }
      if (clean === lastCheckedNationalIdRef.current) {
        return;
      }
      lastCheckedNationalIdRef.current = clean;

      setIsCheckingNationalId(true);
      try {
        const result = await checkApplicantUniquenessV2(
          "national_id",
          clean,
          editingApplicantName
        );

        if (result.isConflict && result.message) {
          setNationalIdConflict(result.message);
          setError("national_id", {
            type: "manual",
            message: result.message,
          });
        } else {
          setNationalIdConflict(null);
          clearErrors("national_id");
        }
      } catch {
        // Silently preserve offline resilience
      } finally {
        setIsCheckingNationalId(false);
      }
    },
    [editingApplicantName, setError, clearErrors]
  );

  // Live Uniqueness Check: Ministry Labour ID
  const verifyLabourIdUniqueness = React.useCallback(
    async (rawValue: string) => {
      const clean = (rawValue || "").trim();
      if (!clean || clean.length < 4) {
        setLabourIdConflict(null);
        setIsCheckingLabourId(false);
        clearErrors("labour_id");
        lastCheckedLabourIdRef.current = clean;
        return;
      }
      if (clean === lastCheckedLabourIdRef.current) {
        return;
      }
      lastCheckedLabourIdRef.current = clean;

      setIsCheckingLabourId(true);
      try {
        const result = await checkApplicantUniquenessV2(
          "labour_id",
          clean,
          editingApplicantName
        );

        if (result.isConflict && result.message) {
          setLabourIdConflict(result.message);
          setError("labour_id", {
            type: "manual",
            message: result.message,
          });
        } else {
          setLabourIdConflict(null);
          clearErrors("labour_id");
        }
      } catch {
        // Silently preserve offline resilience
      } finally {
        setIsCheckingLabourId(false);
      }
    },
    [editingApplicantName, setError, clearErrors]
  );

  // Debounced live watcher for National ID
  React.useEffect(() => {
    const trimmed = (nationalIdValue || "").trim();
    if (!trimmed || trimmed.length < 4) {
      if (nationalTimerRef.current) clearTimeout(nationalTimerRef.current);
      setNationalIdConflict(null);
      return;
    }
    if (nationalTimerRef.current) clearTimeout(nationalTimerRef.current);
    nationalTimerRef.current = setTimeout(() => {
      void verifyNationalIdUniqueness(trimmed);
    }, 700);

    return () => {
      if (nationalTimerRef.current) clearTimeout(nationalTimerRef.current);
    };
  }, [nationalIdValue, verifyNationalIdUniqueness]);

  // Debounced live watcher for Labour ID
  React.useEffect(() => {
    const trimmed = (labourIdValue || "").trim();
    if (!trimmed || trimmed.length < 4) {
      if (labourTimerRef.current) clearTimeout(labourTimerRef.current);
      setLabourIdConflict(null);
      return;
    }
    if (labourTimerRef.current) clearTimeout(labourTimerRef.current);
    labourTimerRef.current = setTimeout(() => {
      void verifyLabourIdUniqueness(trimmed);
    }, 700);

    return () => {
      if (labourTimerRef.current) clearTimeout(labourTimerRef.current);
    };
  }, [labourIdValue, verifyLabourIdUniqueness]);

  return (
    <div className="space-y-6">
      {/* 1. National & Ministry Identification Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                National ID & Ministry Reference
              </CardTitle>
            </div>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Identification & Contacts
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* National ID / Fayda / FAN No */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="national_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  National ID / Fayda ID (FAN no) <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                {isCheckingNationalId && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking ID...
                  </span>
                )}
              </div>
              <Input
                id="national_id"
                placeholder="e.g., FAN-123456789"
                aria-invalid={!!errors.national_id || !!nationalIdConflict}
                className={
                  errors.national_id || nationalIdConflict
                    ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20"
                    : ""
                }
                {...register("national_id")}
                onBlur={(e) => {
                  register("national_id").onBlur(e);
                  void verifyNationalIdUniqueness(e.target.value);
                }}
              />
              {(errors.national_id?.message || nationalIdConflict) && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                  {errors.national_id?.message || nationalIdConflict}
                </p>
              )}
            </div>

            {/* Ministry Labour ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="labour_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Ministry Labour ID <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                {isCheckingLabourId && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking ID...
                  </span>
                )}
              </div>
              <Input
                id="labour_id"
                placeholder="e.g., LBR-998844"
                aria-invalid={!!errors.labour_id || !!labourIdConflict}
                className={
                  errors.labour_id || labourIdConflict
                    ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20"
                    : ""
                }
                {...register("labour_id")}
                onBlur={(e) => {
                  register("labour_id").onBlur(e);
                  void verifyLabourIdUniqueness(e.target.value);
                }}
              />
              {(errors.labour_id?.message || labourIdConflict) && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                  {errors.labour_id?.message || labourIdConflict}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Emergency Reference & Family Member Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Emergency Reference & Family Member
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Contact Person Full Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="contact_person_name"
                placeholder="e.g., Almaz Bekele"
                {...register("contact_person_name")}
                onBlur={(e) => {
                  register("contact_person_name").onBlur(e);
                  void trigger("contact_person_name");
                }}
                className={errors.contact_person_name ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.contact_person_name && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.contact_person_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_person_phone" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Contact Person Phone <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="contact_person_phone"
                placeholder="+251911002233"
                {...register("contact_person_phone")}
                onBlur={(e) => {
                  register("contact_person_phone").onBlur(e);
                  void trigger("contact_person_phone");
                }}
                className={errors.contact_person_phone ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.contact_person_phone && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.contact_person_phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergency_relationship" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Relationship
              </Label>
              <Input
                id="emergency_relationship"
                placeholder="e.g., Parent, Spouse, Sibling"
                {...register("emergency_relationship")}
                onBlur={(e) => {
                  register("emergency_relationship").onBlur(e);
                  void trigger("emergency_relationship");
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
