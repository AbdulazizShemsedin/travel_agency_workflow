"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { AlertTriangle, Clock, Award, FileText, Upload, CheckCircle2, Trash2, Loader2, ShieldCheck } from "lucide-react";
import {
  BaseApplicantFormValues,
  COC_STATUS_OPTIONS,
  MEDICAL_STATUS_OPTIONS,
  calculateRemainingDays,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { uploadFileV2 } from "@/lib/api/v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

interface Step4CocMedicalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step4CocMedical({ form }: Step4CocMedicalProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const medicalStatus = watch("medical_status");
  const medicalExpiryDate = watch("medical_expiry_date");
  const cocStatus = watch("coc_status");
  const collegeCertificate = watch("college_certificate");
  const originalIdScan = watch("original_id_scan");

  const [isUploadingCollegeCert, setIsUploadingCollegeCert] = React.useState(false);
  const [isUploadingOriginalId, setIsUploadingOriginalId] = React.useState(false);

  const collegeCertInputRef = React.useRef<HTMLInputElement | null>(null);
  const originalIdInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleUploadCollegeCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCollegeCert(true);
      // Identity / educational documents must upload with is_private = true (T12)
      const res = await uploadFileV2(file, true, "Applicant");
      const url = res.file_url || (res as any)?.message?.file_url;
      if (!url) throw new Error("Upload succeeded but no file URL returned.");
      setValue("college_certificate", url, { shouldDirty: true });
      toast.success("College Certificate uploaded securely!");
    } catch (err: any) {
      toast.error("Upload failed", { description: formatCleanErrorMessage(err) });
    } finally {
      setIsUploadingCollegeCert(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleUploadOriginalId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingOriginalId(true);
      // Identity documents must upload with is_private = true (T12)
      const res = await uploadFileV2(file, true, "Applicant");
      const url = res.file_url || (res as any)?.message?.file_url;
      if (!url) throw new Error("Upload succeeded but no file URL returned.");
      setValue("original_id_scan", url, { shouldDirty: true });
      toast.success("Original ID scan uploaded securely!");
    } catch (err: any) {
      toast.error("Upload failed", { description: formatCleanErrorMessage(err) });
    } finally {
      setIsUploadingOriginalId(false);
      if (e.target) e.target.value = "";
    }
  };

  const medicalDaysRemaining = React.useMemo(
    () => calculateRemainingDays(medicalExpiryDate),
    [medicalExpiryDate]
  );

  const medicalBadge = getExpiryBadgeStatus(medicalDaysRemaining);

  return (
    <div className="space-y-6">
      {/* 1. COC Assessment Card (T12) */}
      <Card className="border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Certificate of Competence (COC) Assessment
              </CardTitle>
            </div>
            <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              Optional for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coc_status" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                COC Status <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Select
                id="coc_status"
                placeholder="Select COC Status (Optional)"
                {...register("coc_status")}
                error={!!errors.coc_status}
              >
                <option value="">Select COC Status (Optional)</option>
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
              <Label htmlFor="certified_date" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                COC Exam Date <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="certified_date"
                type="date"
                {...register("certified_date")}
                className={errors.certified_date ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.certified_date && (
                <p className="text-xs text-rose-600">{errors.certified_date.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Educational & Identity Document Uploads (T12) */}
      <Card className="border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Educational & Identity Document Attachments
              </CardTitle>
            </div>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Private Storage
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* College Certificate Upload */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    College Certificate
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">PDF, JPG, PNG</span>
              </div>

              <input
                ref={collegeCertInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleUploadCollegeCert}
              />

              {collegeCertificate ? (
                <div className="flex items-center justify-between bg-white dark:bg-zinc-800/80 rounded-lg p-2.5 border border-emerald-300 dark:border-emerald-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                      Certificate attached
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => setValue("college_certificate", "", { shouldDirty: true })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingCollegeCert}
                  onClick={() => collegeCertInputRef.current?.click()}
                  className="w-full h-9 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400"
                >
                  {isUploadingCollegeCert ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading Securely...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload College Certificate (Optional)</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Original ID Scan Upload */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Original ID Scan
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">PDF, JPG, PNG</span>
              </div>

              <input
                ref={originalIdInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleUploadOriginalId}
              />

              {originalIdScan ? (
                <div className="flex items-center justify-between bg-white dark:bg-zinc-800/80 rounded-lg p-2.5 border border-emerald-300 dark:border-emerald-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                      Original ID attached
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => setValue("original_id_scan", "", { shouldDirty: true })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingOriginalId}
                  onClick={() => originalIdInputRef.current?.click()}
                  className="w-full h-9 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400"
                >
                  {isUploadingOriginalId ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading Securely...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Original ID Scan (Optional)</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Medical Assessment Card */}
      <Card className="border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Medical Assessment & Expiration
              </CardTitle>
            </div>
            <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              Optional for Registration
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
                  Medical Expiry Date <span className="text-slate-400 font-normal">(Optional)</span>
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
                className={errors.medical_expiry_date ? "border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.medical_expiry_date && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors.medical_expiry_date.message}</p>
              )}
            </div>
          </div>

          {/* 4. Labour ID (Optional) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="labour_id" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Labour ID <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="labour_id"
                placeholder="e.g. LBR-998844"
                {...register("labour_id")}
                className={errors.labour_id ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.labour_id && (
                <p className="text-xs text-rose-600">{errors.labour_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="medical_remarks" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
              <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
