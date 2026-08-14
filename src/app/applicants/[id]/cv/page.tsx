"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  Download,
  FileCheck2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  HeartPulse,
  Award,
  ChevronRight,
  Loader2,
  FileText,
} from "lucide-react";
import { getApplicant, transitionToRequestPendingApi } from "@/lib/api/applicantApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CandidateCvPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const { data: applicant, isLoading } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  const advanceToRequestPendingMutation = useMutation({
    mutationFn: () => transitionToRequestPendingApi(applicantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Advanced to Request Pending stage!");
      router.push(`/applicants/${encodeURIComponent(applicantId)}`);
    },
    onError: (err: Error) => toast.error("Error", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
        <span className="ml-2 text-sm text-slate-600">Loading CV preview...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800">Applicant Not Found</h3>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <Link
            href={`/applicants/${encodeURIComponent(applicant.name)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-emerald-800 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicant Details
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Official Candidate CV Record
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standardized Ministry & Foreign Employer Verification Format • {applicant.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print CV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.success("Downloading official PDF copy...");
              const link = document.createElement("a");
              link.href = applicant.cv_file_url || "#";
              link.download = `CV-${applicant.name}.pdf`;
              link.click();
            }}
            className="text-xs"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>

          {/* If applicant is on CV Generated, show button to advance to Request Pending */}
          {applicant.applicant_state === "CV Generated" && (
            <Button
              size="sm"
              onClick={() => advanceToRequestPendingMutation.mutate()}
              disabled={advanceToRequestPendingMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-medium"
            >
              {advanceToRequestPendingMutation.isPending ? (
                "Advancing..."
              ) : (
                <>
                  Proceed to Request Pending
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* CV Sheet matching Figma Page Design */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {applicant.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={applicant.profile_photo_url}
                alt={applicant.full_name}
                className="h-28 w-28 rounded-full border-4 border-white/20 object-cover shadow-md"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-3xl font-bold text-emerald-100 border-4 border-white/20 shadow-md">
                {applicant.first_name?.[0]}
                {applicant.last_name?.[0]}
              </div>
            )}

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-3xl font-black tracking-tight">{applicant.full_name}</h2>
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {applicant.highest_education || "Candidate"}
                </span>
              </div>
              <p className="text-sm text-emerald-200 font-medium">
                {applicant.nationality} • {applicant.city}, {applicant.country}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-emerald-100/90 pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {applicant.phone_number}
                </span>
                {applicant.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {applicant.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Passport: {applicant.passport_number || "N/A"}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">CV ID Record</p>
                <p className="font-mono text-sm font-bold text-white">{applicant.cv_record || "CV-GEN-2026"}</p>
                <p className="text-[10px] text-emerald-200 mt-1">App ID: {applicant.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CV Body Content */}
        <div className="p-8 space-y-8 text-xs text-slate-700 dark:text-slate-300">
          {/* Personal & Identification Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Personal & Identification Data
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block font-medium">Date of Birth</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.date_of_birth || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Gender / Religion</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {applicant.gender || "—"} / {applicant.religion || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Marital Status</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.marital_status || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Children Count</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.children ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Passport Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{applicant.passport_number || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Passport Expiry</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.passport_expiry || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Ministry Labour ID</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.labour_id || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">National ID / Kebele</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{applicant.national_id || "—"}</span>
              </div>
            </div>
          </div>

          {/* Education & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Education & Credentials
              </h3>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {applicant.highest_education || "High School"}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {applicant.institution || "Institution record verified"}{" "}
                  {applicant.graduation_year ? `• Class of ${applicant.graduation_year}` : ""}
                </p>
                {applicant.education_remarks && (
                  <p className="text-[11px] text-slate-500 italic mt-1">{applicant.education_remarks}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Work History & Experience
              </h3>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {applicant.years_of_experience ? `${applicant.years_of_experience} Years Professional Experience` : "Entry Level / Ready"}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Previous Employer: {applicant.current_employer || "Domestic / Private Practice"}
                </p>
                {applicant.remarks && (
                  <p className="text-[11px] text-slate-500 italic mt-1">{applicant.remarks}</p>
                )}
              </div>
            </div>
          </div>

          {/* Compliance, COC & Medical Certifications */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Compliance & Legal Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">Certificate of Competence (COC)</span>
                  <span className="text-slate-500 text-[11px]">Exam Date: {applicant.exam_date || "—"}</span>
                </div>
                <Badge variant={applicant.coc_status === "Issued" ? "success" : "neutral"}>
                  {applicant.coc_status || "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">Biological Medical Screening</span>
                  <span className="text-slate-500 text-[11px]">Expires: {applicant.medical_expiry_date || "—"}</span>
                </div>
                <Badge variant={applicant.medical_status === "FIT" ? "success" : "destructive"}>
                  {applicant.medical_status || "Pending"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Emergency & Guarantor Contact */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Designated Emergency Contact & Guarantor
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {applicant.contact_person_name || "Guarantor on file"}
                </p>
                <p className="text-slate-500">{applicant.city}, {applicant.country}</p>
              </div>
              <p className="font-mono font-semibold text-emerald-900 dark:text-emerald-300">
                {applicant.contact_person_phone || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-8 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
          <span>Official Document generated via Travel Agency Management Portal.</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Validated by Operational Division • {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
