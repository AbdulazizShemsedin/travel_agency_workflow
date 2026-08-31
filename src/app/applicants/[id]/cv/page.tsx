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
  Building2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getApplicantV2, generateCvV2, V2ApplicantDetails } from "@/lib/api/v2";
import { CVRecord } from "@/types/applicant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MusanedVerificationModal } from "@/components/applicant/MusanedVerificationModal";

export default function CandidateCvPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  const [isMusanedModalOpen, setIsMusanedModalOpen] = React.useState(false);

  const { data: applicant, isLoading, refetch } = useQuery<V2ApplicantDetails>({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicantV2(applicantId),
    enabled: !!applicantId,
  });

  const refreshCvMutation = useMutation({
    mutationFn: () => generateCvV2(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "CV generated successfully!");
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
  const pdfDownloadUrl =
    applicant.cv_file_url ||
    cv.file_attachment ||
    (cv as any).file_url ||
    (cv as any).r2_url ||
    "";
  const hasCvPdf = Boolean(pdfDownloadUrl && pdfDownloadUrl.trim() !== "");

  const destination = (applicant.destination_country || "").trim().toLowerCase();
  const isKuwaitApplicant = destination === "kuwait";
  const isSaudiApplicant =
    destination === "saudi arabia" ||
    destination === "saudi" ||
    destination === "ksa" ||
    (!destination && !isKuwaitApplicant);

  const isPostCvStage = [
    "CV Generated",
    "Request Pending",
    "Selected",
    "Processing",
    "Stamped",
    "Ticketed",
    "Departed",
  ].includes(applicant.applicant_state || "");

  const isMusanedReady =
    !isSaudiApplicant ||
    isPostCvStage ||
    hasCvPdf ||
    applicant.is_uploaded_to_musaned === 1 ||
    applicant.is_uploaded_to_musaned === true ||
    applicant.musaned_status === "Registered" ||
    Boolean(applicant.musaned_reference_no && applicant.musaned_reference_no.trim() !== "");

  return (
    <div className="w-full space-y-6 pb-20">
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
            Candidate ID: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.name}</strong> • Destination:{" "}
            <strong>{applicant.destination_country || "Saudi Arabia"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCvMutation.mutate()}
            disabled={refreshCvMutation.isPending}
            className="text-xs border-slate-300 dark:border-[#26262d]"
            title="Compile / Refresh CV"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshCvMutation.isPending ? "animate-spin" : ""}`} />
            {refreshCvMutation.isPending ? "Generating CV..." : hasCvPdf ? "Regenerate CV PDF" : "Generate CV PDF"}
          </Button>

          {hasCvPdf && (
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
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EMBEDDED OFFICIAL PDF VIEWER FRAME OR EMPTY STATE                         */}
      {/* ========================================================================= */}
      {hasCvPdf ? (
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
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 mb-4">
            <FileCheck2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            CV PDF Not Generated Yet
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            {isSaudiApplicant && !isMusanedReady
              ? "This applicant requires Musaned pre-registration before the CV can be generated."
              : "The official standardized candidate CV has not been generated for this applicant yet. Click the button below to compile their profile data, uploaded photos, and skills into the official PDF document."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isSaudiApplicant && !isMusanedReady ? (
              <Button
                onClick={() => setIsMusanedModalOpen(true)}
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs"
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Confirm Musaned Registration
              </Button>
            ) : (
              <Button
                onClick={() => refreshCvMutation.mutate()}
                disabled={refreshCvMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold shadow-xs"
              >
                {refreshCvMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating CV PDF...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Official CV PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Musaned Modal */}
      {isSaudiApplicant && (
        <MusanedVerificationModal
          applicant={applicant}
          isOpen={isMusanedModalOpen}
          onClose={() => setIsMusanedModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
