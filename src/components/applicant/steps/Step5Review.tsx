"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  User,
  MapPin,
  GraduationCap,
  ShieldCheck,
  HeartPulse,
  DollarSign,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  BaseApplicantFormValues,
  calculateRemainingDays,
  deriveFullName,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Step5ReviewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
  onNavigateToStep: (stepNumber: number) => void;
  draftApplicantId?: string | null;
  applicantState?: string;
  onGenerateCV?: () => void;
  isGeneratingCV?: boolean;
  cvUrl?: string | null;
}

export function Step5Review({
  form,
  onNavigateToStep,
  draftApplicantId,
  applicantState = "Draft",
  onGenerateCV,
  isGeneratingCV = false,
  cvUrl,
}: Step5ReviewProps) {
  const values = form.getValues();

  const fullName = deriveFullName(
    values.first_name,
    values.middle_name,
    values.last_name
  );

  const examRemaining = calculateRemainingDays(values.exam_date);
  const medicalRemaining = calculateRemainingDays(values.medical_expiry_date);

  const examBadge = getExpiryBadgeStatus(examRemaining);
  const medicalBadge = getExpiryBadgeStatus(medicalRemaining);

  const isMedicalUnfit = values.medical_status === "UNFIT";
  const isRegistered = applicantState === "Registered" || applicantState === "CV Generated";

  return (
    <div className="space-y-6">
      {/* Top Banner: Computed State & Identification */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {values.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.profile_photo_url}
                alt={fullName}
                className="h-16 w-16 rounded-full border border-slate-200 object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-lg font-bold">
                {values.first_name?.[0] || "A"}
                {values.last_name?.[0] || "A"}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {fullName || "Unnamed Applicant"}
                </h3>
                <Badge
                  variant={isRegistered ? "success" : "neutral"}
                  dotColor={isRegistered ? "bg-emerald-600" : "bg-slate-500"}
                >
                  {applicantState}
                </Badge>
                {draftApplicantId && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    {draftApplicantId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {values.phone_number || "No phone"} • {values.email || "No email"} • {values.city || "No city"},{" "}
                {values.country || "No country"}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">COC Exam:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${examBadge.bgClass} ${examBadge.textClass} ${examBadge.borderClass}`}
              >
                <Clock className="h-3 w-3" />
                {examBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Medical:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${medicalBadge.bgClass} ${medicalBadge.textClass} ${medicalBadge.borderClass}`}
              >
                <Clock className="h-3 w-3" />
                {medicalBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* UNFIT Blocking Alert */}
      {isMedicalUnfit && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-800 text-sm">
                Applicant cannot be registered while medical status is UNFIT.
              </p>
              <p className="text-xs text-rose-700 mt-1">
                You can save this record as a Draft. To register, please return to Step 4 (COC & Medical) and update the medical status once medical clearance is obtained.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateToStep(4)}
                className="mt-3 border-rose-300 bg-white text-rose-800 hover:bg-rose-50"
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit Medical Status
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Registration CV generation prompt */}
      {isRegistered && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-950">
                  Applicant Successfully Registered
                </h4>
                <p className="text-xs text-emerald-800">
                  Candidate profile is confirmed. You can now generate an official standardized CV PDF.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cvUrl ? (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 shadow-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Generated CV
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                </a>
              ) : (
                onGenerateCV && (
                  <Button
                    type="button"
                    onClick={onGenerateCV}
                    disabled={isGeneratingCV}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isGeneratingCV ? "Generating..." : "Generate CV PDF"}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Section Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Section 1: Personal Information */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Personal Information
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(1)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">First Name:</span>
              <span className="font-medium text-slate-900">{values.first_name || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Middle Name:</span>
              <span className="font-medium text-slate-900">{values.middle_name || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Last Name:</span>
              <span className="font-medium text-slate-900">{values.last_name || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Gender:</span>
              <span className="font-medium text-slate-900">{values.gender || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Religion:</span>
              <span className="font-medium text-slate-900">{values.religion || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Marital Status:</span>
              <span className="font-medium text-slate-900">{values.marital_status || "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Children:</span>
              <span className="font-medium text-slate-900">{values.children ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact & Location */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Contact & Address
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(1)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phone Number:</span>
              <span className="font-medium text-slate-900">{values.phone_number || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Alternate Phone:</span>
              <span className="font-medium text-slate-900">{values.alternate_phone || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-900">{values.email || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Country / Nationality:</span>
              <span className="font-medium text-slate-900">
                {values.country || "—"} / {values.nationality || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">City / Region:</span>
              <span className="font-medium text-slate-900">
                {values.city || "—"} {values.region ? `(${values.region})` : ""}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Address Line 1:</span>
              <span className="font-medium text-slate-900">{values.address_line_1 || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Education & Experience */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Education & Experience
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(2)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Highest Education:</span>
              <span className="font-medium text-slate-900">{values.highest_education || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Institution:</span>
              <span className="font-medium text-slate-900">{values.institution || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Graduation Year:</span>
              <span className="font-medium text-slate-900">{values.graduation_year || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Current Employer:</span>
              <span className="font-medium text-slate-900">{values.current_employer || "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Years of Experience:</span>
              <span className="font-medium text-slate-900">
                {values.years_of_experience ? `${values.years_of_experience} yrs` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Travel Documents & Emergency Contact */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Documents & Reference
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(3)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Date of Birth:</span>
              <span className="font-medium text-slate-900">{values.date_of_birth || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Passport Number:</span>
              <span className="font-mono font-semibold text-slate-900">
                {values.passport_number || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Passport Expiry:</span>
              <span className="font-medium text-slate-900">{values.passport_expiry || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">National / Fayda ID:</span>
              <span className="font-medium text-slate-900">{values.national_id || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Labour ID Number:</span>
              <span className="font-medium text-slate-900">{values.labour_id || "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Emergency Contact:</span>
              <span className="font-medium text-slate-900">
                {values.contact_person_name || "—"}{" "}
                {values.contact_person_phone ? `(${values.contact_person_phone})` : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: COC & Medical Assessment */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                COC & Medical Assessment
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(4)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">COC Status:</span>
              <span className="font-medium text-slate-900">{values.coc_status || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">COC Exam Date:</span>
              <span className="font-medium text-slate-900">{values.exam_date || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Medical Status:</span>
              <span
                className={`font-semibold ${
                  values.medical_status === "FIT"
                    ? "text-emerald-700"
                    : values.medical_status === "UNFIT"
                    ? "text-rose-700"
                    : "text-slate-900"
                }`}
              >
                {values.medical_status || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Medical Expiry Date:</span>
              <span className="font-medium text-slate-900">
                {values.medical_expiry_date || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Financial & Application Settings */}
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Financials & Settings
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(1)}
              className="h-7 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            >
              <Edit2 className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Fee Required:</span>
              <span className="font-medium text-slate-900">
                {values.fee_required ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Initial Registration Fee:</span>
              <span className="font-semibold text-slate-900">
                ${(values.registration_fee_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Estimated Balance:</span>
              <span className="font-semibold text-emerald-800">
                ${(values.registration_fee_amount || 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
