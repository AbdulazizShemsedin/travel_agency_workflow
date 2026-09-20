"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { HeartPulse, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  BaseApplicantFormValues,
  MEDICAL_STATUS_OPTIONS,
  calculateRemainingDays,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Step4CocMedicalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step4CocMedical({ form }: Step4CocMedicalProps) {
  const {
    register,
    watch,
    trigger,
    formState: { errors },
  } = form;

  const medicalStatus = watch("medical_status");
  const medicalExpiryDate = watch("medical_expiry_date");

  const medicalDaysRemaining = React.useMemo(
    () => calculateRemainingDays(medicalExpiryDate),
    [medicalExpiryDate]
  );

  const medicalBadge = getExpiryBadgeStatus(medicalDaysRemaining);

  return (
    <div className="space-y-6">

      {/* Medical Assessment Card */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Medical Assessment & Expiration
              </CardTitle>
            </div>
            <span className="rounded-md bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* UNFIT Warning Alert Banner */}
          {medicalStatus === "UNFIT" && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-xs animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-rose-800">
                    Registration Blocked: Medical Status is UNFIT
                  </p>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Applicant cannot be registered while medical status is UNFIT. You can still save this record as a Draft, and return to update the medical status when re-tested or cleared.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="medical_status" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Medical Status <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Select
                id="medical_status"
                placeholder="Select Medical Status (Optional)"
                {...register("medical_status")}
                error={!!errors.medical_status || medicalStatus === "UNFIT"}
              >
                <option value="">Select Medical Status (Optional)</option>
                {MEDICAL_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              {errors.medical_status && (
                <p className="text-xs text-rose-600">{errors.medical_status.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medical_issue_date" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Medical Exam Date <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="medical_issue_date"
                type="date"
                {...register("medical_issue_date")}
                className={errors.medical_issue_date ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.medical_issue_date && (
                <p className="text-xs text-rose-600">{errors.medical_issue_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="medical_expiry_date" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Medical Expiry Date <span className="text-rose-500 font-bold">*</span>
                </Label>
                {medicalExpiryDate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${medicalBadge.bgClass} ${medicalBadge.textClass} ${medicalBadge.borderClass}`}
                  >
                    <Clock className="h-3 w-3" />
                    {medicalBadge.label}
                  </span>
                )}
              </div>
              <Input
                id="medical_expiry_date"
                type="date"
                {...register("medical_expiry_date", {
                  onBlur: () => void trigger("medical_expiry_date"),
                })}
                className={errors.medical_expiry_date ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.medical_expiry_date && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors.medical_expiry_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="medical_remarks" className="text-xs font-semibold text-slate-700">
                Medical Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="medical_remarks"
                placeholder="Clinic name, lab notes, or re-test scheduling..."
                rows={3}
                {...register("medical_remarks")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700">
                General Candidate Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="remarks"
                placeholder="Availability notes, special requests, or interview details..."
                rows={3}
                {...register("remarks")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
