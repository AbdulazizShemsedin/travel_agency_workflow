"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileCheck2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { getApplicant, generateCV } from "@/lib/api/applicantApi";
import { CVRecord } from "@/types/applicant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CandidateCvPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const { data: applicant, isLoading, refetch } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  const refreshCvMutation = useMutation({
    mutationFn: () => generateCV(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      toast.success(data.message?.message || "CV generated successfully!");
      refetch();
    },
    onError: (err: Error) => {
      toast.error("Failed to generate CV", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">
          Loading Candidate CV...
        </span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  const cv: Partial<CVRecord> = applicant.cv_record_data || {};
  const pdfDownloadUrl = applicant.cv_file_url || cv.file_attachment || `/private/files/CV-${applicant.name}.pdf`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <Link
            href={`/applicants/${encodeURIComponent(applicant.name)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicant Details
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Official Candidate CV
            </h1>
            <Badge variant="default" className="text-xs">
              {applicant.applicant_state}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Candidate ID: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.name}</strong> • Name:{" "}
            <strong>{applicant.full_name || `${applicant.first_name} ${applicant.last_name}`}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCvMutation.mutate()}
            disabled={refreshCvMutation.isPending}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshCvMutation.isPending ? "animate-spin" : ""}`} />
            {refreshCvMutation.isPending ? "Regenerating..." : "Regenerate CV PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(pdfDownloadUrl, "_blank");
            }}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EMBEDDED OFFICIAL PDF VIEWER FRAME                                        */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              Official Candidate CV Document (PDF)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
            >
              Open in full window <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="w-full bg-slate-100 dark:bg-[#0e0e11] flex items-center justify-center min-h-[750px]">
          <iframe
            src={`${pdfDownloadUrl}#toolbar=1&navpanes=0`}
            className="w-full h-[900px] border-none"
            title="Official Candidate CV PDF"
          />
        </div>
      </div>
    </div>
  );
}
