"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { getApplicantV2, listPlacementsV2, V2ApplicantDetails } from "@/lib/api/v2";
import { ApplicantRegistrationForm } from "@/components/applicant/ApplicantRegistrationForm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CANONICAL_STAGES = [
  "Draft",
  "Registered",
  "CV Generated",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
];

const STAGE_DISPLAY_LABELS: Record<string, string> = {
  Draft: "Draft",
  Registered: "Registered",
  "CV Generated": "CV Generated",
  Selected: "Selected",
  Processing: "Processing",
  Stamped: "Stamped / Embassy",
  Ticketed: "Ticketed",
  Departed: "Departed",
};

const IDENTITY_LOCK_STATUSES = new Set([
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
]);

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";
  const queryClient = useQueryClient();

  const { data: applicant, isLoading, isError } = useQuery<V2ApplicantDetails>({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicantV2(applicantId),
    enabled: !!applicantId,
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["placements", applicantId],
    queryFn: () => listPlacementsV2([{ applicant: applicantId }]),
    enabled: !!applicantId,
  });

  const activePlacement = React.useMemo(() => {
    if (!placements || placements.length === 0) return null;
    return placements.find((p: any) => p.status !== "Cancelled") || null;
  }, [placements]);

  const enrichedApplicant = React.useMemo(() => {
    if (!applicant) return applicant;
    return {
      ...applicant,
      visa_number: applicant.visa_number || activePlacement?.visa_number || (activePlacement as any)?.visa_reference_number || "",
      sponsor_name: (applicant as any).sponsor_name || activePlacement?.employer_name || (activePlacement as any)?.sponsor_name || "",
      sponsor_id: (applicant as any).sponsor_id || activePlacement?.employer_national_id || (activePlacement as any)?.sponsor_civil_id || "",
      sponsor_phone: (applicant as any).sponsor_phone || (activePlacement as any)?.employer_phone || (activePlacement as any)?.sponsor_phone || "",
      sponsor_address: (applicant as any).sponsor_address || (activePlacement as any)?.employer_address || (activePlacement as any)?.sponsor_address || "",
      sponsor_arabic: (applicant as any).sponsor_arabic || (activePlacement as any)?.sponsor_arabic || (activePlacement as any)?.employer_arabic_name || "",
      sponsor_email: (applicant as any).sponsor_email || (activePlacement as any)?.employer_email || (activePlacement as any)?.sponsor_email || "",
      agent: (applicant as any).agent || activePlacement?.saudi_agency_name || (activePlacement as any)?.kuwait_agency_name || "",
      contract_number: (applicant as any).contract_number || activePlacement?.contract_number || "",
      active_placement: activePlacement,
    };
  }, [applicant, activePlacement]);

  const isIdentityLocked = React.useMemo(() => {
    return activePlacement ? IDENTITY_LOCK_STATUSES.has(activePlacement.status) : false;
  }, [activePlacement]);

  // Authoritative stage machine resolution
  const currentStage = React.useMemo(() => {
    if (!applicant) return "Draft";
    const ownStatus = String(applicant.status || applicant.applicant_state || "Draft");
    if (ownStatus === "Cancelled") return "Cancelled";
    if (activePlacement && activePlacement.status) {
      if (String(activePlacement.status) === "Cancelled") return "Cancelled";
      if (["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(String(activePlacement.status))) {
        return String(activePlacement.status);
      }
    }
    return ownStatus;
  }, [applicant, activePlacement]);

  const currentStageIndex = CANONICAL_STAGES.indexOf(currentStage);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">Loading applicant details...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Applicant Record Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The requested applicant record could not be found.
        </p>
        <Link href="/applicants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Applicants Directory
          </Button>
        </Link>
      </div>
    );
  }

  const fullName =
    applicant.full_name ||
    [applicant.first_name, applicant.middle_name, applicant.last_name].filter(Boolean).join(" ") ||
    applicant.name;

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/applicants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicants List
        </Link>

        {/* Big Name */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              {fullName}
            </h1>

            {/* Destination, Phone, Passport Details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-zinc-300 mt-2">
              <div>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Destination:</span>{" "}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {applicant.destination_country || "—"}
                </strong>
              </div>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <div>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Phone:</span>{" "}
                <strong className="text-slate-900 dark:text-white font-mono font-semibold">
                  {applicant.phone_number || applicant.phone || "—"}
                </strong>
              </div>
              {applicant.passport_number && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 font-medium">Passport:</span>{" "}
                    <strong className="font-mono text-slate-900 dark:text-white font-semibold">
                      {applicant.passport_number}
                    </strong>
                  </div>
                </>
              )}
              {currentStage === "Cancelled" && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <Badge variant="destructive" className="text-xs uppercase font-bold">
                    Cancelled
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Status Bar */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-3 sm:p-4 shadow-xs overflow-x-auto md:overflow-x-clip">
        <div className="flex items-center justify-between min-w-[700px] md:min-w-0 gap-2">
          {CANONICAL_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                      isCurrent
                        ? "bg-emerald-900 dark:bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold"
                        : "bg-slate-100 dark:bg-[#1c1c22] text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-[#26262d]"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold whitespace-nowrap",
                      isCurrent
                        ? "text-emerald-900 dark:text-emerald-400 font-bold"
                        : isCompleted
                        ? "text-slate-700 dark:text-zinc-300"
                        : "text-slate-400 dark:text-zinc-500"
                    )}
                  >
                    {STAGE_DISPLAY_LABELS[stage] || stage}
                  </span>
                </div>
                {idx !== CANONICAL_STAGES.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2",
                      idx < currentStageIndex ? "bg-emerald-800 dark:bg-emerald-600" : "bg-slate-200 dark:bg-[#26262d]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Identity Fields Lock Notice if placed */}
      {isIdentityLocked && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 shadow-xs">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
              Identity Fields Locked
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-400">
              This applicant has an active placement at <strong>{activePlacement?.status}</strong> status.
              Identity fields (name, passport, date of birth, gender, nationality, destination) are locked and cannot be changed.
            </div>
          </div>
        </div>
      )}

      {/* All Form Fields filled with Applicant Data */}
      <ApplicantRegistrationForm
        existingApplicantId={applicant.name}
        initialData={enrichedApplicant as any}
        lockedIdentityFields={isIdentityLocked}
        onSuccessRedirect={(id) => {
          queryClient.invalidateQueries({ queryKey: ["applicant", id] });
          queryClient.invalidateQueries({ queryKey: ["applicants"] });
        }}
      />
    </div>
  );
}
