"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Award,
  HeartPulse,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Loader2,
  Building,
} from "lucide-react";
import { getApplicant, generateCV } from "@/lib/api/applicantApi";
import {
  calculateRemainingDays,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { Badge } from "@/components/ui/badge";
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

const LIFECYCLE_STAGES = [
  "Draft",
  "Registered",
  "CV Generated",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
];

export default function ApplicantDetailPage() {
  const params = useParams();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  const queryClient = useQueryClient();

  const [isCvModalOpen, setIsCvModalOpen] = React.useState(false);

  const {
    data: applicant,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  const generateCvMutation = useMutation({
    mutationFn: () => generateCV(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "CV generated successfully!");
      setIsCvModalOpen(true);
    },
    onError: (err: Error) => {
      toast.error("CV generation failed", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
        <span className="ml-2 text-sm text-slate-600">Loading applicant details...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800">Applicant Not Found</h3>
        <p className="text-xs text-rose-600 mt-1">
          The requested applicant ID &quot;{applicantId}&quot; does not exist or could not be loaded.
        </p>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  const examRemaining = calculateRemainingDays(applicant.exam_date);
  const medicalRemaining = calculateRemainingDays(applicant.medical_expiry_date);
  const examBadge = getExpiryBadgeStatus(examRemaining);
  const medicalBadge = getExpiryBadgeStatus(medicalRemaining);

  const currentStageIndex = LIFECYCLE_STAGES.indexOf(
    applicant.applicant_state || "Draft"
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button matching Figma */}
      <Link
        href="/applicants"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-emerald-800 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Applicants
      </Link>

      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {applicant.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={applicant.profile_photo_url}
                alt={applicant.full_name}
                className="h-16 w-16 rounded-full border border-slate-200 object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-900 border border-emerald-200">
                {applicant.first_name?.[0]}
                {applicant.last_name?.[0]}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {applicant.full_name || `${applicant.first_name} ${applicant.last_name}`}
                </h2>
                <Badge variant="default">{applicant.applicant_state}</Badge>
                <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {applicant.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {applicant.phone_number} • {applicant.email || "No email"} • {applicant.city},{" "}
                {applicant.country}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {applicant.applicant_state === "Draft" ? (
              <Link href={`/applicants/new?resume=${encodeURIComponent(applicant.name)}`}>
                <Button className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs">
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Continue Registration
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => generateCvMutation.mutate()}
                disabled={generateCvMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {generateCvMutation.isPending ? "Generating..." : "Generate CV"}
              </Button>
            )}
          </div>
        </div>

        {/* Current Stage Stepper matching Figma Page 7/8 */}
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Workflow Stage Progress
          </h4>
          <div className="flex items-center justify-between overflow-x-auto gap-2 py-2">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isCurrent
                        ? "bg-emerald-900 text-white ring-2 ring-emerald-600/30"
                        : isPast
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "font-bold text-emerald-950"
                        : isPast
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {stage}
                  </span>
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 w-6 ${
                        idx < currentStageIndex ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Grid: Left (Profile & Quick Info) / Right (LMS, Injaz, Wakala, Financials) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Core Identification */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Identification Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applicant ID:</span>
                <span className="font-mono font-semibold text-slate-900">{applicant.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Passport Number:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {applicant.passport_number || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Labour ID:</span>
                <span className="font-medium text-slate-900">{applicant.labour_id || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">National ID:</span>
                <span className="font-medium text-slate-900">{applicant.national_id || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registered Date:</span>
                <span className="font-medium text-slate-900">
                  {applicant.registration_date || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Marital Status</span>
                <span className="font-semibold text-slate-800">{applicant.marital_status || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Children</span>
                <span className="font-semibold text-slate-800">{applicant.children ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Religion</span>
                <span className="font-semibold text-slate-800">{applicant.religion || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Education</span>
                <span className="font-semibold text-slate-800">{applicant.highest_education || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Processing Pipelines, Medical & Financials */}
        <div className="space-y-6 lg:col-span-8">
          {/* Medical & COC Badges Card */}
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                COC & Medical Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">COC Status</span>
                  <Badge variant={applicant.coc_status === "Issued" ? "success" : "neutral"}>
                    {applicant.coc_status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500">Exam Date: {applicant.exam_date || "—"}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${examBadge.bgClass} ${examBadge.textClass} ${examBadge.borderClass}`}
                  >
                    <Clock className="h-3 w-3" />
                    {examBadge.label}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Medical Status</span>
                  <Badge
                    variant={
                      applicant.medical_status === "FIT"
                        ? "success"
                        : applicant.medical_status === "UNFIT"
                        ? "destructive"
                        : "neutral"
                    }
                  >
                    {applicant.medical_status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500">
                  Expiration: {applicant.medical_expiry_date || "—"}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${medicalBadge.bgClass} ${medicalBadge.textClass} ${medicalBadge.borderClass}`}
                  >
                    <Clock className="h-3 w-3" />
                    {medicalBadge.label}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card matching Figma */}
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Financial Ledger Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-slate-100 bg-emerald-50/40 p-3">
                <span className="text-slate-500 block">Total Income</span>
                <span className="text-lg font-bold text-emerald-900">
                  ${(applicant.total_income || 0).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-rose-50/40 p-3">
                <span className="text-slate-500 block">Total Expense</span>
                <span className="text-lg font-bold text-rose-900">
                  ${(applicant.total_expense || 0).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500 block">Net Balance</span>
                <span className="text-lg font-bold text-slate-900">
                  ${(applicant.net_balance || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CV Preview Modal */}
      <Dialog open={isCvModalOpen} onOpenChange={setIsCvModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Standardized Candidate CV</DialogTitle>
            <DialogDescription>
              CV generated for {applicant.full_name} ({applicant.name})
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-lg font-bold text-slate-900">{applicant.full_name}</h3>
            <p className="text-slate-600">
              {applicant.highest_education} • {applicant.nationality}
            </p>
            <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2">
              <p><strong>Passport:</strong> {applicant.passport_number}</p>
              <p><strong>Phone:</strong> {applicant.phone_number}</p>
              <p><strong>Labour ID:</strong> {applicant.labour_id}</p>
              <p><strong>COC:</strong> {applicant.coc_status}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCvModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
