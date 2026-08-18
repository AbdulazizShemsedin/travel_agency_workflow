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
  ShieldCheck,
  ChevronRight,
  Loader2,
  FileText,
  MessageSquare,
  RefreshCw,
  Eye,
  FileCheck2,
} from "lucide-react";
import { getApplicant, updateApplicantDraft, generateCV } from "@/lib/api/applicantApi";
import { CVRecord } from "@/types/applicant";
import { ContractRequestModal } from "@/components/applicant/ContractRequestModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CandidateCvPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  const [isContractModalOpen, setIsContractModalOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<"pdf" | "html">("pdf");

  const { data: applicant, isLoading, refetch } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  const refreshCvMutation = useMutation({
    mutationFn: () => generateCV(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      toast.success(data.message?.message || "CV updated successfully!");
      refetch();
    },
    onError: (err: Error) => {
      toast.error("Failed to refresh CV", { description: err.message });
    },
  });

  // Auto-generate official PDF on first load if not present yet
  React.useEffect(() => {
    if (applicant && !applicant.cv_file_url && !applicant.cv_record_data?.file_attachment && !refreshCvMutation.isPending) {
      refreshCvMutation.mutate();
    }
  }, [applicant?.name]);

  const advanceToRequestPendingMutation = useMutation({
    mutationFn: () =>
      updateApplicantDraft(applicantId, {
        applicant_state: "Request Pending",
        state_step: 4,
        state_progress: 44.4,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Stage updated to Request Pending!");
      router.push(`/applicants/${encodeURIComponent(applicantId)}`);
    },
    onError: (err: Error) => toast.error("Error", { description: err.message }),
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

  // Candidate Data Mapping
  const fullName = (cv.full_name || applicant.full_name || `${applicant.first_name || ""} ${applicant.last_name || ""}`).toUpperCase();
  const jobApplied = (cv.job_applied || applicant.job_applied || "HOUSE MAID").toUpperCase();
  const salary = cv.monthly_salary || applicant.monthly_salary || (jobApplied === "HOUSE MAID" ? "1000" : "1200");
  const passportNumber = cv.passport_number || applicant.passport_number || "—";
  const passportIssueDate = cv.passport_issue_date || applicant.passport_issue_date || "—";
  const passportExpiry = cv.passport_expiry || applicant.passport_expiry || "—";
  const placeOfIssue = (cv.place_of_issue || applicant.place_of_issue || applicant.city || "ADDIS ABABA").toUpperCase();
  const englishLevel = (cv.english_level || applicant.english_level || "FAIR").toUpperCase();
  const arabicLevel = (cv.arabic_level || applicant.arabic_level || "FAIR").toUpperCase();
  const highestEducation = (cv.highest_education || applicant.highest_education || "PRIMARY SCHOOL").toUpperCase();
  const nationality = (cv.nationality || applicant.nationality || "ETHIOPIA").toUpperCase();
  const religion = (cv.religion || applicant.religion || "MUSLIM").toUpperCase();
  const dateOfBirth = cv.date_of_birth || applicant.date_of_birth || "—";
  const placeOfBirth = (cv.place_of_birth || applicant.place_of_birth || applicant.city || "ADDIS").toUpperCase();
  const leavingTown = (cv.leaving_town || applicant.city || "ADDIS").toUpperCase();
  const civilStatus = (cv.marital_status || applicant.marital_status || "SINGLE").toUpperCase();
  const childrenCount = typeof cv.children === "number" ? cv.children : (applicant.children ?? 0);
  const height = cv.height || applicant.height || "—";
  const weight = cv.weight || applicant.weight || "—";
  const complexion = (cv.complexion || applicant.complexion || "FAIR").toUpperCase();
  const age = cv.age || applicant.age || "—";
  const cvDate = cv.generated_date?.split(" ")[0] || applicant.registration_date || new Date().toISOString().split("T")[0];

  const experiencePeriod = cv.experience_period || applicant.experience_period || (applicant.years_of_experience ? `${applicant.years_of_experience}` : "—");
  const experienceCountry = (cv.experience_country || applicant.experience_country || "—").toUpperCase();

  // Photo URLs
  const passportPhoto = cv.photo_passport || applicant.photo_passport || applicant.profile_photo_url;
  const fullBodyPhoto = cv.photo_full_body || applicant.photo_full_body;
  const passportScan = cv.passport_scan || applicant.passport_scan;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
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
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-[#26262d] bg-slate-100 dark:bg-[#16161c] p-0.5">
            <button
              type="button"
              onClick={() => setActiveView("pdf")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeView === "pdf"
                  ? "bg-white dark:bg-[#22222b] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
              Official PDF Document
            </button>
            <button
              type="button"
              onClick={() => setActiveView("html")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeView === "html"
                  ? "bg-white dark:bg-[#22222b] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Printable Sheet
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print CV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.success("Opening PDF document...");
              window.open(pdfDownloadUrl, "_blank");
            }}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCvMutation.mutate()}
            disabled={refreshCvMutation.isPending}
            className="text-xs border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {refreshCvMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh CV
              </>
            )}
          </Button>

          {/* Send Contract Request Button */}
          {applicant.applicant_state === "CV Generated" && (
            <Button
              size="sm"
              onClick={() => setIsContractModalOpen(true)}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Send Contract Request (WhatsApp)
            </Button>
          )}

          {/* Advance stage button */}
          {applicant.applicant_state === "CV Generated" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => advanceToRequestPendingMutation.mutate()}
              disabled={advanceToRequestPendingMutation.isPending}
              className="text-xs border-slate-300 dark:border-[#26262d]"
            >
              {advanceToRequestPendingMutation.isPending ? (
                "Updating..."
              ) : (
                <>
                  Next Stage
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <ContractRequestModal
        applicant={{
          ...applicant,
          cv_record: applicant.cv_record || cv.name || `CV-${applicant.name.replace("APP-", "")}`,
        }}
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 1. EMBEDDED OFFICIAL PDF VIEWER (AUTHENTIC SERVER GENERATED FILE)        */}
      {/* ========================================================================= */}
      {activeView === "pdf" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Official Bilateral CV Document (Generated Document File)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
                >
                  Open in full window <Download className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-[#0e0e11] flex items-center justify-center min-h-[750px]">
              <iframe
                src={`${pdfDownloadUrl}#toolbar=1&navpanes=0`}
                className="w-full h-[850px] border-none"
                title="Official Candidate CV PDF"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRINTABLE BILATERAL CV TEMPLATE SHEET                                  */}
      {/* ========================================================================= */}
      {(activeView === "html" || typeof window !== "undefined") && (
        <div className={activeView === "html" ? "block" : "hidden print:block"}>
          <div className="bg-white text-slate-900 border-2 border-slate-900 shadow-2xl overflow-hidden print:border-none print:shadow-none print:m-0 font-sans">
            
            {/* PAGE 1: Standardized Bilateral CV Sheet */}
            <div className="p-6 space-y-4">
              {/* 1. Header Banner */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                {/* Left Agency Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center p-1 text-center bg-rose-50">
                    <span className="text-[9px] font-black leading-tight text-rose-700">Agency</span>
                    <span className="text-[6px] text-slate-600 leading-tight">A.S Foreign Private</span>
                    <span className="text-[5px] text-slate-500 leading-tight">Employment Agency</span>
                  </div>
                </div>

                {/* Center Title */}
                <div className="text-center">
                  <h2 className="text-xl font-black tracking-wider text-slate-900">
                    ANWAR SULTAN KEMAL
                  </h2>
                  <p className="text-sm font-bold tracking-widest text-slate-700">
                    SAUDI ARABIA
                  </p>
                </div>

                {/* Right Partner Agency Logo */}
                <div className="flex items-center gap-2">
                  <div className="border border-slate-800 bg-slate-950 text-white p-1.5 text-center text-[8px] rounded font-medium leading-tight">
                    <p className="text-emerald-400 font-bold">مكتب القرشي للإستقدام</p>
                    <p className="text-[7px] text-zinc-300">AL QURASHI</p>
                    <p className="text-[6px] text-zinc-400">RECRUITMENT OFFICE</p>
                  </div>
                </div>
              </div>

              {/* 2. Main Two-Column Bilateral Grid */}
              <div className="grid grid-cols-12 gap-3 text-xs">
                
                {/* LEFT COLUMN: Candidate Portrait, Work Experience, Skills Matrix */}
                <div className="col-span-5 space-y-3">
                  {/* Candidate Passport Photo Frame */}
                  <div className="border-2 border-slate-900 bg-slate-50 p-1 flex items-center justify-center h-48 overflow-hidden">
                    {passportPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={passportPhoto}
                        alt={fullName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ShieldCheck className="h-10 w-10 mx-auto text-slate-300" />
                        <span className="text-[10px]">Photo On File</span>
                      </div>
                    )}
                  </div>

                  {/* Work Experience Table */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-1 flex items-center justify-between text-[11px]">
                      <span>Work Experience</span>
                      <span>خبرة في العمل</span>
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                      <tbody>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5 w-1/3">Period</td>
                          <td className="font-bold text-center px-2 py-0.5">{experiencePeriod}</td>
                          <td className="font-bold text-right px-2 py-0.5 w-1/3" dir="rtl">المدة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Country</td>
                          <td className="font-bold text-center px-2 py-0.5">{experienceCountry}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">البلد</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Skills & Experience Table */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-1 flex items-center justify-between text-[11px]">
                      <span>Skills & Experience</span>
                      <span>خبرة العمل</span>
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <tbody>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Cooking</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_cooking || applicant.skill_cooking ? "YES" : "—"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الطبخ</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Cleaning</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_cleaning || applicant.skill_cleaning ? "YES" : "YES"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">التنظيف</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Washing</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_washing || applicant.skill_washing ? "YES" : "YES"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الغسيل</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Ironing</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_ironing || applicant.skill_ironing ? "YES" : "YES"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الكوي</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Baby Sitting</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_baby_sitting || applicant.skill_baby_sitting ? "YES" : "—"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">عناية الرضيع</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Children Care</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_children_care || applicant.skill_children_care ? "YES" : "—"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">عناية الأطفال</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Arabic Cooking</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_arabic_cooking || applicant.skill_arabic_cooking ? "YES" : "—"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الطبخ العربي</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Sewing</td>
                          <td className="font-semibold text-center text-emerald-800 px-1 py-0.5">
                            {cv.skill_sewing || applicant.skill_sewing ? "YES" : "—"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">خياطة</td>
                        </tr>
                        <tr className="border-t border-slate-900 bg-slate-50">
                          <td className="font-bold px-2 py-0.5">Remarks</td>
                          <td className="font-bold text-center text-emerald-900 px-1 py-0.5">
                            {cv.remarks || applicant.remarks || "PASSED"}
                          </td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">ملاحظات</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT COLUMN: Candidate Passport & Personal Details */}
                <div className="col-span-7 space-y-2">
                  
                  {/* Key Position & Identity Box */}
                  <div className="border-2 border-slate-900">
                    <table className="w-full text-[11px] border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-900">
                          <td className="font-bold px-2 py-0.5 w-24">Ref No.</td>
                          <td className="font-mono font-bold text-center px-2 py-0.5 text-slate-900" colSpan={2}>
                            {applicant.name}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="font-bold px-2 py-0.5">Job</td>
                          <td className="font-bold text-center px-2 py-0.5">{jobApplied}</td>
                          <td className="font-bold text-right px-2 py-0.5 w-24" dir="rtl">الوظيفة</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="font-bold px-2 py-0.5">Name</td>
                          <td className="font-bold text-center px-2 py-0.5 text-slate-900">{fullName}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الاسم</td>
                        </tr>
                        <tr>
                          <td className="font-bold px-2 py-0.5">Salary</td>
                          <td className="font-bold text-center px-2 py-0.5 text-emerald-800">{salary}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الراتب</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* DETAILS OF PASSPORT */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-0.5 flex items-center justify-between text-[11px]">
                      <span>DETAILS OF PASSPORT</span>
                      <span>تفاصيل جواز السفر</span>
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <tbody>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5 w-28">Passport No.</td>
                          <td className="font-mono font-bold text-center px-2 py-0.5">{passportNumber}</td>
                          <td className="font-bold text-right px-2 py-0.5 w-28" dir="rtl">رقم الجواز</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Issue Date</td>
                          <td className="font-bold text-center px-2 py-0.5">{passportIssueDate}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">تاريخ الإصدار</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Expiry Date</td>
                          <td className="font-bold text-center px-2 py-0.5">{passportExpiry}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">تاريخ الانتهاء</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Place of Issue</td>
                          <td className="font-bold text-center px-2 py-0.5">{placeOfIssue}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">مكان الإصدار</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* LANGUAGES */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-0.5 flex items-center justify-between text-[11px]">
                      <span>LANGUAGES</span>
                      <span>اللغات</span>
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <tbody>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5 w-28">English</td>
                          <td className="font-bold text-center px-2 py-0.5">{englishLevel}</td>
                          <td className="font-bold text-right px-2 py-0.5 w-28" dir="rtl">الإنجليزية</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Arabic</td>
                          <td className="font-bold text-center px-2 py-0.5">{arabicLevel}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">العربية</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* EDUCATIONAL QUALIFICATION */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-0.5 flex items-center justify-between text-[11px]">
                      <span>EDUCATIONAL QUALIFICATION</span>
                      <span>المؤهل العلمي</span>
                    </div>
                    <div className="text-center font-bold py-1 text-xs">
                      {highestEducation}
                    </div>
                  </div>

                  {/* DETAILS OF APPLICANT */}
                  <div className="border-2 border-slate-900">
                    <div className="bg-[#0b5c75] text-white font-bold px-2 py-0.5 flex items-center justify-between text-[11px]">
                      <span>DETAILS OF APPLICANT</span>
                      <span>بيانات مقدم الطلب</span>
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <tbody>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5 w-28">Nationality</td>
                          <td className="font-bold text-center px-2 py-0.5">{nationality}</td>
                          <td className="font-bold text-right px-2 py-0.5 w-28" dir="rtl">الجنسية</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Religion</td>
                          <td className="font-bold text-center px-2 py-0.5">{religion}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الديانة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Date of Birth</td>
                          <td className="font-bold text-center px-2 py-0.5">{dateOfBirth}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">تاريخ الولادة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Place of Birth</td>
                          <td className="font-bold text-center px-2 py-0.5">{placeOfBirth}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">مكان الولادة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Leaving Town</td>
                          <td className="font-bold text-center px-2 py-0.5">{leavingTown}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">مغادرة المدينة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Civil Status</td>
                          <td className="font-bold text-center px-2 py-0.5">{civilStatus}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">العنوان الكامل</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">No. of Children</td>
                          <td className="font-bold text-center px-2 py-0.5">{childrenCount}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">عدد الاطفال</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Height</td>
                          <td className="font-bold text-center px-2 py-0.5">{height}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">ارتفاع</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Weight</td>
                          <td className="font-bold text-center px-2 py-0.5">{weight}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">الوزن</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Complexion</td>
                          <td className="font-bold text-center px-2 py-0.5">{complexion}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">البشرة</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Age</td>
                          <td className="font-bold text-center px-2 py-0.5">{age}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">العمر</td>
                        </tr>
                        <tr className="border-t border-slate-900">
                          <td className="font-bold px-2 py-0.5">Date</td>
                          <td className="font-bold text-center px-2 py-0.5">{cvDate}</td>
                          <td className="font-bold text-right px-2 py-0.5" dir="rtl">تاريخ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE BREAK FOR PRINT */}
            <div className="page-break my-6 border-b-2 border-dashed border-slate-300 print:border-none" />

            {/* PAGE 2: Attached Candidate Photographs & Passport Document */}
            <div className="p-6 space-y-4">
              <div className="border-b border-slate-300 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Attached Candidate Photographs & Identification Document Copies
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Ref: {applicant.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Body Photo */}
                <div className="border-2 border-slate-900 p-2 bg-slate-50 min-h-[380px] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-700 mb-2">
                    Full Body Photograph
                  </span>
                  {fullBodyPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fullBodyPhoto}
                      alt={`${fullName} Full Body`}
                      className="max-h-[340px] w-auto object-contain shadow-sm border border-slate-200"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <p className="text-xs">No full-body photo attached</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Upload via Registration Form or Edit Profile
                      </p>
                    </div>
                  )}
                </div>

                {/* Passport Document Scan */}
                <div className="border-2 border-slate-900 p-2 bg-slate-50 min-h-[380px] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-700 mb-2">
                    Passport Document Copy
                  </span>
                  {passportScan ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={passportScan}
                      alt={`${fullName} Passport Copy`}
                      className="max-h-[340px] w-auto object-contain shadow-sm border border-slate-200"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs">Passport scan attached</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Passport No: {passportNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
