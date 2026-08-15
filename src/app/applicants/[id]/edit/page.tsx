"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { getApplicant } from "@/lib/api/applicantApi";
import { ApplicantRegistrationForm } from "@/components/applicant/ApplicantRegistrationForm";
import { Button } from "@/components/ui/button";

export default function EditApplicantPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";

  const { data: applicant, isLoading, isError } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">Loading applicant data...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The requested record ({applicantId}) does not exist.
        </p>
        <Link href="/applicants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Applicants Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          <Link href="/applicants" className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
            Applicants
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <Link href={`/applicants/${encodeURIComponent(applicantId)}`} className="hover:text-emerald-800 dark:hover:text-emerald-400 transition">
            {applicant.full_name || applicantId}
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-emerald-900 dark:text-emerald-400 font-bold">Edit & Register</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Applicant: {applicant.full_name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Applicant ID: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.name}</strong> • Status: {applicant.applicant_state}
            </p>
          </div>
          <Link
            href={`/applicants/${encodeURIComponent(applicantId)}`}
            className="text-xs text-slate-600 dark:text-zinc-300 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215] hover:bg-slate-50 w-fit"
          >
            Cancel & Return to Details
          </Link>
        </div>
      </div>

      {/* Multi-step Registration Workflow Form pre-filled with existing data */}
      <ApplicantRegistrationForm
        existingApplicantId={applicant.name}
        initialData={applicant as any}
        onSuccessRedirect={(id) => router.push(`/applicants/${encodeURIComponent(id)}`)}
      />
    </div>
  );
}
