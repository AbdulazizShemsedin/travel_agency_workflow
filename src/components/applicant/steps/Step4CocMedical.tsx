"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Award, HeartPulse, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  BaseApplicantFormValues,
  COC_STATUS_OPTIONS,
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
  form: UseFormReturn<BaseApplicantFormValues>;
}

export function Step4CocMedical({ form }: Step4CocMedicalProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const examDate = watch("exam_date");
  const medicalStatus = watch("medical_status");
  const medicalExpiryDate = watch("medical_expiry_date");

  const examDaysRemaining = React.useMemo(
    () => calculateRemainingDays(examDate),
    [examDate]
  );
  const medicalDaysRemaining = React.useMemo(
    () => calculateRemainingDays(medicalExpiryDate),
    [medicalExpiryDate]
  );

  const examBadge = getExpiryBadgeStatus(examDaysRemaining);
  const medicalBadge = getExpiryBadgeStatus(medicalDaysRemaining);

  return (
    <div className="space-y-6">
      {/* COC (Certificate of Competence) Card */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Certificate of Competence (COC)
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Professional competency exam scheduling and certification status.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
              Stage 2 • Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coc_status" className="text-xs font-semibold text-slate-800">
                COC Status <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Select
                id="coc_status"
                placeholder="Select COC Status"
                {...register("coc_status")}
                error={!!errors.coc_status}
              >
                {COC_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              {errors.coc_status && (
                <p className="text-xs text-rose-600">{errors.coc_status.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="exam_date" className="text-xs font-semibold text-slate-800">
                  COC Exam Date <span className="text-amber-600 font-bold">*</span>
                </Label>
                {examDate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${examBadge.bgClass} ${examBadge.textClass} ${examBadge.borderClass}`}
                  >
                    <Clock className="h-3 w-3" />
                    {examBadge.label}
                  </span>
                )}
              </div>
              <Input
                id="exam_date"
                type="date"
                {...register("exam_date")}
                className={errors.exam_date ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.exam_date && (
                <p className="text-xs text-rose-600">{errors.exam_date.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Assessment Card */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Medical Assessment & Expiration
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Health verification status and medical certificate validity.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
              Stage 2 • Required for Registration
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="medical_status" className="text-xs font-semibold text-slate-800">
                Medical Status <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Select
                id="medical_status"
                placeholder="Select Medical Status"
                {...register("medical_status")}
                error={!!errors.medical_status || medicalStatus === "UNFIT"}
              >
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
              <div className="flex items-center justify-between">
                <Label htmlFor="medical_expiry_date" className="text-xs font-semibold text-slate-800">
                  Medical Expiration Date <span className="text-amber-600 font-bold">*</span>
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
                {...register("medical_expiry_date")}
                className={errors.medical_expiry_date ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.medical_expiry_date && (
                <p className="text-xs text-rose-600">{errors.medical_expiry_date.message}</p>
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
