"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Camera, DollarSign, Image as ImageIcon, Loader2, ScanLine, Sparkles, CheckCircle2, FileText, UploadCloud, ShieldCheck, AlertTriangle, Globe2 } from "lucide-react";
import { BaseApplicantFormValues, GENDER_OPTIONS, RELIGION_OPTIONS, MARITAL_STATUS_OPTIONS, DESTINATION_COUNTRY_OPTIONS } from "@/lib/validations/applicant.schema";
import { uploadFileV2, parsePassportFileV2 } from "@/lib/api/v2";
import { performOpticalPassportOCR, parseMRZText } from "@/lib/utils/mrzScanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Step1PersonalInfoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step1PersonalInfo({ form }: Step1PersonalInfoProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const feeRequired = watch("fee_required");
  const profilePhotoValue = watch("profile_photo_url") || watch("photo_passport");
  const fullBodyPhotoValue = watch("photo_full_body");
  const passportScanValue = watch("passport_scan");

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(profilePhotoValue || null);
  const [fullBodyPreview, setFullBodyPreview] = React.useState<string | null>(fullBodyPhotoValue || null);
  const [passportScanPreview, setPassportScanPreview] = React.useState<string | null>(passportScanValue || null);
  const [isUploadingPassport, setIsUploadingPassport] = React.useState(false);
  const [isUploadingFullBody, setIsUploadingFullBody] = React.useState(false);
  const [isScanningOCR, setIsScanningOCR] = React.useState(false);
  const [ocrSuccessData, setOcrSuccessData] = React.useState<any | null>(null);

  // Cropper Modal State
  const [cropModalState, setCropModalState] = React.useState<{
    open: boolean;
    file: File | null;
    type: "passport" | "portrait" | "fullbody";
  }>({
    open: false,
    file: null,
    type: "passport",
  });

  // MRZ Review Dialog State
  const [isOcrReviewOpen, setIsOcrReviewOpen] = React.useState(false);
  const [pendingOcrData, setPendingOcrData] = React.useState<any | null>(null);

  // Manual MRZ Dialog State
  const [isMrzDialogOpen, setIsMrzDialogOpen] = React.useState(false);
  const [mrzInputText, setMrzInputText] = React.useState("");

  React.useEffect(() => {
    if (profilePhotoValue && !photoPreview) {
      setPhotoPreview(profilePhotoValue);
    }
  }, [profilePhotoValue, photoPreview]);

  React.useEffect(() => {
    if (fullBodyPhotoValue && !fullBodyPreview) {
      setFullBodyPreview(fullBodyPhotoValue);
    }
  }, [fullBodyPhotoValue, fullBodyPreview]);

  React.useEffect(() => {
    if (passportScanValue && !passportScanPreview) {
      setPassportScanPreview(passportScanValue);
    }
  }, [passportScanValue, passportScanPreview]);

  const handleApplyOcrData = (d: any) => {
    if (!d) return;
    if (d.first_name) {
      setValue("first_name", d.first_name, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.middle_name) {
      setValue("middle_name", d.middle_name, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.last_name) {
      setValue("last_name", d.last_name, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.passport_number) {
      setValue("passport_number", d.passport_number.toUpperCase(), { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.date_of_birth) {
      setValue("date_of_birth", d.date_of_birth, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.gender) {
      setValue("gender", d.gender, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (d.nationality) {
      setValue("nationality", d.nationality, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }

    // Auto-calculate exact 5-year relationship between issue date and expiry date
    let resolvedIssueDate = d.passport_issue_date || "";
    let resolvedExpiryDate = d.passport_expiry || "";

    if (resolvedIssueDate && !resolvedExpiryDate) {
      const parts = resolvedIssueDate.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) resolvedExpiryDate = `${y + 5}-${parts[1]}-${parts[2]}`;
      }
    } else if (resolvedExpiryDate && !resolvedIssueDate) {
      const parts = resolvedExpiryDate.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) resolvedIssueDate = `${y - 5}-${parts[1]}-${parts[2]}`;
      }
    }

    if (resolvedIssueDate) {
      setValue("passport_issue_date", resolvedIssueDate, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }
    if (resolvedExpiryDate) {
      setValue("passport_expiry", resolvedExpiryDate, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }

    if (d.place_of_issue) {
      setValue("place_of_issue", d.place_of_issue, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    } else {
      setValue("place_of_issue", "Addis Ababa", { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    }

    setOcrSuccessData({
      ...d,
      passport_issue_date: resolvedIssueDate,
      passport_expiry: resolvedExpiryDate,
    });
    setIsOcrReviewOpen(false);
    toast.success("Passport data extracted and form auto-filled successfully!");
  };

  // Main Standalone Client-Side Passport Fast-Extractor
  const handlePassportAutoScan = async (file: File) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPassportScanPreview(localUrl);
    setIsScanningOCR(true);

    try {
      // 1. Immediately run high-speed optical character extraction client-side in the browser
      let extractedData: any = null;
      try {
        const clientOcr = await performOpticalPassportOCR(file);
        if (clientOcr && (clientOcr.passport_number || clientOcr.first_name || clientOcr.date_of_birth)) {
          extractedData = clientOcr;
        }
      } catch (clientErr) {
        console.warn("Client OCR engine notice:", clientErr);
      }

      // 2. Upload file in the background for permanent document attachment
      uploadFileV2(file, true, "Applicant")
        .then((uploadRes) => {
          const fileUrl = uploadRes?.file_url || "";
          if (fileUrl) {
            setValue("passport_scan", fileUrl, { shouldDirty: true, shouldValidate: true });
            setValue("passport_copy" as any, fileUrl, { shouldDirty: true, shouldValidate: true });
            setValue("passport_image" as any, fileUrl, { shouldDirty: true, shouldValidate: true });
          }
        })
        .catch((e) => console.warn("Background file upload note:", e));

      // 3. If client OCR produced fields, directly auto-fill without blocking on any backend server
      if (extractedData) {
        handleApplyOcrData(extractedData);
        setPendingOcrData(extractedData);
      } else {
        toast.info("Passport scan attached. Please enter or review candidate details.");
      }
    } catch (err: any) {
      console.warn("Passport extraction notice:", err);
      toast.info("Passport scan attached. You can fill or edit registration fields.");
    } finally {
      setIsScanningOCR(false);
    }
  };

  const handleParseMrzText = async () => {
    if (!mrzInputText.trim()) return;
    setIsScanningOCR(true);
    try {
      const parsed = parseMRZText(mrzInputText.trim());
      if (parsed) {
        handleApplyOcrData(parsed);
        setIsMrzDialogOpen(false);
      }
    } catch (err) {
      console.warn("Manual MRZ decode warning:", err);
    } finally {
      setIsScanningOCR(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setPhotoPreview(localUrl);
      setIsUploadingPassport(true);

      try {
        const res = await uploadFileV2(file, true, "Applicant");
        const fileUrl = res?.file_url || "";
        if (fileUrl) {
          setValue("profile_photo_url", fileUrl, { shouldDirty: true, shouldValidate: true });
          setValue("photo_passport", fileUrl, { shouldDirty: true, shouldValidate: true });
          toast.success("Portrait photo uploaded successfully!");
        } else {
          toast.error("Failed to obtain server file URL for photo. Please retry.");
        }
      } catch (err: any) {
        console.warn("Photo upload error:", err);
        toast.error("Photo upload failed: " + (err?.message || "Please try again."));
      } finally {
        setIsUploadingPassport(false);
      }
    }
  };

  const handleFullBodyUpload = async (file: File) => {
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setFullBodyPreview(localUrl);
      setIsUploadingFullBody(true);

      try {
        const res = await uploadFileV2(file, true, "Applicant");
        const fileUrl = res?.file_url || "";
        if (fileUrl) {
          setValue("photo_full_body", fileUrl, { shouldDirty: true, shouldValidate: true });
          toast.success("Full body photo uploaded successfully!");
        } else {
          toast.error("Failed to obtain server file URL for full-body photo. Please retry.");
        }
      } catch (err: any) {
        console.warn("Full body photo upload error:", err);
        toast.error("Full-body photo upload failed: " + (err?.message || "Please try again."));
      } finally {
        setIsUploadingFullBody(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO SECTION: PASSPORT FAST SCAN & AUTO-POPULATION */}
      <Card className="border-2 border-dashed border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-500/30 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md">
                <ScanLine className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Passport Quick-Scan & Auto-Fill (OCR)
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3" /> Auto-Population Enabled
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-2xl">
                  Upload candidate passport image or paste the 2 MRZ code lines. The system will automatically decode MRZ and populate First Name, Last Name, Passport #, Date of Birth, Gender, and Expiry Date.
                </p>
                <div className="flex items-start sm:items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 rounded-lg px-2.5 py-1.5 mt-1 max-w-2xl">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" />
                  <span>
                    <strong>Important Note:</strong> Data extraction may not produce accurate results if the passport photo is blurry, dark, rotated, or low quality. Please review and verify all auto-filled fields before proceeding.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMrzDialogOpen(true)}
                className="text-xs font-semibold border-emerald-300 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/50"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Paste MRZ Text
              </Button>

              <label
                htmlFor="passport-auto-scan-input"
                className="flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 text-xs font-bold shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
              >
                {isScanningOCR ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Decoding MRZ...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Passport Scan</span>
                  </>
                )}
                <input
                  id="passport-auto-scan-input"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="sr-only"
                  disabled={isScanningOCR}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCropModalState({
                        open: true,
                        file: f,
                        type: "passport",
                      });
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Extracted Data Confirmation Banner */}
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
        </CardContent>
      </Card>

      {/* Interactive MRZ OCR Review Dialog */}
      <Dialog open={isOcrReviewOpen} onOpenChange={setIsOcrReviewOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Review Extracted Passport Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              The backend decoded the following passport information. Review the values below before applying them to the form.
            </DialogDescription>
          </DialogHeader>

          {pendingOcrData && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#16161b]">
                <div>
                  <span className="text-[11px] text-slate-500 block">First Name:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.first_name || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Last Name:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.last_name || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Passport Number:</span>
                  <strong className="font-mono text-emerald-800 dark:text-emerald-300">{pendingOcrData.passport_number || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Date of Birth:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.date_of_birth || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Gender:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.gender || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Nationality:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.nationality || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Passport Expiry:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.passport_expiry || "—"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Place of Issue:</span>
                  <strong className="text-slate-900 dark:text-white">{pendingOcrData.place_of_issue || "Addis Ababa"}</strong>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOcrReviewOpen(false)}
              className="text-xs"
            >
              Cancel / Edit Manually
            </Button>
            <Button
              type="button"
              onClick={() => handleApplyOcrData(pendingOcrData)}
              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Apply Extracted Data to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Photo Uploads & Fee Settings */}
        <div className="space-y-6 lg:col-span-4">
          {/* Passport / Portrait Photo Card */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Candidate Photo (Passport Size)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2">
              <label
                htmlFor="profile-photo-upload"
                className="group relative flex h-36 w-36 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-[#2a2a32] bg-slate-50 dark:bg-[#16161b] transition hover:border-emerald-700 hover:bg-emerald-50/50 overflow-hidden"
              >
                {isUploadingPassport ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-700 dark:text-emerald-400" />
                    <span className="text-[10px] text-slate-500 mt-1">Uploading...</span>
                  </div>
                ) : photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile headshot"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#202028] shadow-xs group-hover:scale-105">
                      <Camera className="h-5 w-5 text-slate-500 group-hover:text-emerald-800 dark:text-zinc-400" />
                    </div>
                    <span className="mt-2 text-xs font-medium text-slate-600 dark:text-zinc-300">
                      Upload Photo
                    </span>
                  </div>
                )}
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCropModalState({
                        open: true,
                        file: f,
                        type: "portrait",
                      });
                      e.target.value = "";
                    }
                  }}
                  disabled={isUploadingPassport}
                />
              </label>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-400">
                JPG, PNG format (passport photo)
              </p>
            </CardContent>
          </Card>

          {/* Full Body Photo Card */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Full Body Photo (CV Page 2)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2">
              <label
                htmlFor="fullbody-photo-upload"
                className="group relative flex h-40 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-[#2a2a32] bg-slate-50 dark:bg-[#16161b] transition hover:border-emerald-700 hover:bg-emerald-50/50 overflow-hidden"
              >
                {isUploadingFullBody ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-700 dark:text-emerald-400" />
                    <span className="text-[10px] text-slate-500 mt-1">Uploading...</span>
                  </div>
                ) : fullBodyPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fullBodyPreview}
                    alt="Full body photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#202028] shadow-xs group-hover:scale-105">
                      <ImageIcon className="h-4 w-4 text-slate-500 group-hover:text-emerald-800 dark:text-zinc-400" />
                    </div>
                    <span className="mt-2 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                      Full Body
                    </span>
                  </div>
                )}
                <input
                  id="fullbody-photo-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCropModalState({
                        open: true,
                        file: f,
                        type: "fullbody",
                      });
                      e.target.value = "";
                    }
                  }}
                  disabled={isUploadingFullBody}
                />
              </label>
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-zinc-400">
                Standing full-body portrait
              </p>
            </CardContent>
          </Card>

          {/* Application Settings Card */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Application Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="fee_required" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Fee Required
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Registration fee required for applicant
                  </p>
                </div>
                <Switch
                  id="fee_required"
                  checked={feeRequired}
                  onCheckedChange={(checked) =>
                    setValue("fee_required", checked, { shouldDirty: true })
                  }
                />
              </div>

            {feeRequired && (
              <div className="space-y-3 rounded-lg border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                <div className="space-y-1">
                  <Label htmlFor="fee_type" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Fee Type
                  </Label>
                  <select
                    id="fee_type"
                    {...register("fee_type")}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Registration Fee">Registration Fee</option>
                    <option value="Processing Fee">Processing Fee</option>
                    <option value="Visa Fee">Visa Fee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="registration_fee_amount" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Amount ($ USD) *
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <Input
                        id="registration_fee_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7 h-8 text-xs"
                        {...register("registration_fee_amount", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fee_direction" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Direction
                    </Label>
                    <select
                      id="fee_direction"
                      {...register("fee_direction")}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="Income">Income (Agency Received)</option>
                      <option value="Expense">Expense (Agency Paid)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fee_status" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Payment Status
                    </Label>
                    <select
                      id="fee_status"
                      {...register("fee_status")}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Expired">Expired</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fee_payment_date" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Payment Date
                    </Label>
                    <Input
                      id="fee_payment_date"
                      type="date"
                      className="h-8 text-xs px-2"
                      {...register("fee_payment_date")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fee_notes" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Notes / Receipt Reference
                  </Label>
                  <Input
                    id="fee_notes"
                    placeholder="e.g. Receipt #REC-88192"
                    className="h-8 text-xs"
                    {...register("fee_notes")}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Personal & Contact Information */}
      <div className="space-y-6 lg:col-span-8">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Personal Information
                </CardTitle>
              </div>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Personal & Passport Information
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Corridor & Deployment Type Configuration Card */}
            <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#16161b] p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 1. Target Destination Country */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="destination_country" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Target Destination Country <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Corridor Workflow
                    </span>
                  </div>
                  <Select
                    id="destination_country"
                    {...register("destination_country")}
                    error={!!errors.destination_country}
                    className="font-medium"
                  >
                    {DESTINATION_COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c === "Saudi Arabia"
                          ? "🇸🇦 Saudi Arabia (Musaned / Injaz)"
                          : c === "Kuwait"
                          ? "🇰🇼 Kuwait (Direct LMIS Permit & Visa)"
                          : c === "United Arab Emirates"
                          ? "🇦🇪 United Arab Emirates (UAE)"
                          : c === "Qatar"
                          ? "🇶🇦 Qatar"
                          : c === "Oman"
                          ? "🇴🇲 Oman"
                          : c === "Jordan"
                          ? "🇯🇴 Jordan"
                          : `🌐 ${c}`}
                      </option>
                    ))}
                  </Select>
                  {errors.destination_country && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.destination_country.message}</p>
                  )}
                  {/* Informational Corridor Tag */}
                  <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 pt-0.5">
                    {watch("destination_country")?.toLowerCase() === "kuwait"
                      ? "🇰🇼 Kuwait Corridor: Direct LMIS Work Permit & Visa flow (Exempt from Musaned/Wakala)."
                      : "🇸🇦 Saudi Corridor: 3-Stream Flow (Musaned verification, Wakala power of attorney & Injaz)."}
                  </p>
                </div>

                {/* 2. Applicant Deployment Type (Standard vs Muayena) */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-900 dark:text-white">
                      Applicant Deployment Type <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Standard agency pool or Muayena (direct client allocation).
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#26262d] p-1 bg-white dark:bg-[#121215] w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setValue("applicant_type", "Standard", { shouldDirty: true, shouldValidate: true });
                        if (watch("contact_person_name") === "Muayena") {
                          setValue("contact_person_name", "", { shouldDirty: true });
                          setValue("emergency_relationship", "", { shouldDirty: true });
                        }
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition text-center ${
                        watch("applicant_type") === "Standard" || !watch("applicant_type")
                          ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("applicant_type", "Muayena", { shouldDirty: true, shouldValidate: true });
                        const currentContact = watch("contact_person_name");
                        if (!currentContact || currentContact === "") {
                          setValue("contact_person_name", "Muayena", { shouldDirty: true });
                          setValue("emergency_relationship", "Muayena / Sponsor", { shouldDirty: true });
                        }
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition text-center ${
                        watch("applicant_type") === "Muayena"
                          ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                      }`}
                    >
                      Muayena
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g., Abebe"
                  {...register("first_name")}
                  className={errors.first_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="middle_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Father Name (Middle Name) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="middle_name"
                  placeholder="e.g., Bekele"
                  {...register("middle_name")}
                  className={errors.middle_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.middle_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.middle_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Last Name / Grandfather <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g., Kebede"
                  {...register("last_name")}
                  className={errors.last_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Official Passport & Identity Details (Direct Form Inputs) */}
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  Passport & Demographics (Auto-Extracted / Editable)
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="passport_number" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Passport Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="passport_number"
                    placeholder="e.g., EP1234567"
                    {...register("passport_number")}
                    className={errors.passport_number ? "border-rose-500 font-mono uppercase font-bold" : "font-mono uppercase font-bold text-slate-900 dark:text-white"}
                  />
                  {errors.passport_number && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.passport_number.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date_of_birth" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Date of Birth <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register("date_of_birth")}
                    className={errors.date_of_birth ? "border-rose-500" : ""}
                  />
                  {errors.date_of_birth && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.date_of_birth.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="place_of_issue" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Place of Issue <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="place_of_issue"
                    placeholder="e.g., Addis Ababa"
                    {...register("place_of_issue")}
                    className={errors.place_of_issue ? "border-rose-500" : ""}
                  />
                  {errors.place_of_issue && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.place_of_issue.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="passport_issue_date" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Passport Issue Date <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Auto-sets 5-yr Expiry
                    </span>
                  </div>
                  <Input
                    id="passport_issue_date"
                    type="date"
                    {...register("passport_issue_date", {
                      onChange: (e) => {
                        const issueVal = e.target.value;
                        if (issueVal) {
                          const parts = issueVal.split("-");
                          if (parts.length === 3) {
                            const year = parseInt(parts[0], 10);
                            if (!isNaN(year)) {
                              const expVal = `${year + 5}-${parts[1]}-${parts[2]}`;
                              setValue("passport_expiry", expVal, {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }
                          }
                        }
                      },
                    })}
                    className={errors.passport_issue_date ? "border-rose-500" : ""}
                  />
                  {errors.passport_issue_date && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.passport_issue_date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passport_expiry" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Passport Expiry Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="passport_expiry"
                    type="date"
                    {...register("passport_expiry", {
                      onChange: (e) => {
                        const expVal = e.target.value;
                        if (expVal && !watch("passport_issue_date")) {
                          const parts = expVal.split("-");
                          if (parts.length === 3) {
                            const year = parseInt(parts[0], 10);
                            if (!isNaN(year)) {
                              const issueVal = `${year - 5}-${parts[1]}-${parts[2]}`;
                              setValue("passport_issue_date", issueVal, {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                            }
                          }
                        }
                      },
                    })}
                    className={errors.passport_expiry ? "border-rose-500" : ""}
                  />
                  {errors.passport_expiry && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.passport_expiry.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Demographics: Gender, Religion, Marital Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Gender <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="gender"
                  placeholder="Select gender"
                  {...register("gender")}
                  error={!!errors.gender}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
                {errors.gender && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="religion" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Religion <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="religion"
                  placeholder="Select religion"
                  {...register("religion")}
                  error={!!errors.religion}
                >
                  {RELIGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                {errors.religion && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.religion.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marital_status" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Marital Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="marital_status"
                  placeholder="Select status"
                  {...register("marital_status")}
                  error={!!errors.marital_status}
                >
                  {MARITAL_STATUS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                {errors.marital_status && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.marital_status.message}</p>
                )}
              </div>
            </div>

            {/* Children & Nationality */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="children" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Number of Children <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("children", { valueAsNumber: true })}
                  className={errors.children ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.children && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.children.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationality" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Nationality <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="nationality"
                  placeholder="e.g., Ethiopia"
                  {...register("nationality")}
                  className={errors.nationality ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.nationality && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.nationality.message}</p>
                )}
              </div>
            </div>

            {/* Contact Details: Phone, Alternate Phone, Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="phone_number"
                  placeholder="+251911223344"
                  {...register("phone_number")}
                  className={errors.phone_number ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.phone_number && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alternate_phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Alternate Phone (Optional)
                </Label>
                <Input
                  id="alternate_phone"
                  placeholder="+251922334455"
                  {...register("alternate_phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Email Address (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="applicant@example.com"
                  {...register("email")}
                  className={errors.email ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Address Details */}
            <div className="border-t border-slate-100 dark:border-[#222227] pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
                Home Address & Location
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g., Ethiopia"
                    {...register("country")}
                    className={errors.country ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.country && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    City <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., Addis Ababa"
                    {...register("city")}
                    className={errors.city ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="place_of_birth" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Place of Birth <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="place_of_birth"
                    placeholder="e.g., Oromia, Amhara"
                    {...register("place_of_birth")}
                    className={errors.place_of_birth ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.place_of_birth && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.place_of_birth.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sub_region" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Sub-City / Zone / Woreda
                  </Label>
                  <Input
                    id="sub_region"
                    placeholder="e.g., Bole, Sub-city 03"
                    {...register("sub_region")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address_line_1" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Address Line
                  </Label>
                  <Input
                    id="address_line_1"
                    placeholder="Street address or house number"
                    {...register("address_line_1")}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Universal Document Preview & Cropper Modal */}
    <ImageCropModal
      open={cropModalState.open}
      onOpenChange={(open) => setCropModalState((prev) => ({ ...prev, open }))}
      imageFile={cropModalState.file}
      title={
        cropModalState.type === "passport"
          ? "Passport Scan Preview & Cropper"
          : cropModalState.type === "portrait"
          ? "Candidate Portrait Photo Preview & Cropper"
          : "Full Body Photo Preview & Cropper"
      }
      description={
        cropModalState.type === "passport"
          ? "Preview, rotate, or crop the passport / MRZ zone. Note: Ensure the image is sharp, clear, and well-aligned for accurate data extraction."
          : cropModalState.type === "portrait"
          ? "Preview, rotate, or crop candidate face portrait (passport photo size)."
          : "Preview, rotate, or crop candidate standing full-body portrait."
      }
      confirmLabel={
        cropModalState.type === "passport"
          ? "Apply & Extract Info"
          : "Confirm & Set Photo"
      }
      cropMode={cropModalState.type}
      defaultAspectRatio={
        cropModalState.type === "portrait" ? 1 : cropModalState.type === "passport" ? 1.4 : null
      }
      onConfirm={async (resultFile) => {
        if (cropModalState.type === "passport") {
          await handlePassportAutoScan(resultFile);
        } else if (cropModalState.type === "portrait") {
          await handlePhotoUpload(resultFile);
        } else if (cropModalState.type === "fullbody") {
          await handleFullBodyUpload(resultFile);
        }
      }}
    />
    </div>
  );
}
