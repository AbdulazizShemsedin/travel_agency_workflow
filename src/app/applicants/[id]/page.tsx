"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Building2,
  UserCheck,
  UploadCloud,
  FileCheck2,
  Plane,
  Fingerprint,
  Send,
  Sparkles,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import {
  getApplicant,
  generateCV,
  transitionToRequestPendingApi,
} from "@/lib/api/applicantApi";
import {
  calculateRemainingDays,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignEmployeeModal } from "@/components/applicant/AssignEmployeeModal";
import { ProcessingStreamsModal } from "@/components/applicant/ProcessingStreamsModal";

const LIFECYCLE_STAGES = [
  "Draft",
  "Registered",
  "CV Generated",
  "Request Pending",
  "Selected",
  "Processing",
  "Embassy/Stamped",
  "Departed",
];

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";
  const queryClient = useQueryClient();

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = React.useState(false);
  const [processingInitialTab, setProcessingInitialTab] = React.useState<"lms" | "injaz" | "wakala" | "departure">("lms");

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
    },
    onError: (err: Error) => {
      toast.error("CV generation failed", { description: err.message });
    },
  });

  const advanceToRequestPendingMutation = useMutation({
    mutationFn: () => transitionToRequestPendingApi(applicantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Stage updated to Request Pending!");
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">Loading applicant details...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The requested applicant ID &quot;{applicantId}&quot; could not be loaded or was not found in the system.
        </p>
        <Link href="/applicants" className="inline-block">
          <Button className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Applicant List
          </Button>
        </Link>
      </div>
    );
  }

  const examRemaining = calculateRemainingDays(applicant.exam_date);
  const medicalRemaining = calculateRemainingDays(applicant.medical_expiry_date);
  const examBadge = getExpiryBadgeStatus(examRemaining);
  const medicalBadge = getExpiryBadgeStatus(medicalRemaining);

  const currentStage = applicant.applicant_state || "Draft";
  const currentStageIndex = LIFECYCLE_STAGES.indexOf(currentStage);

  return (
    <div className="space-y-6 pb-16">
      {/* Prominent Back Button to Applicant List as requested */}
      <div className="flex items-center justify-between">
        <Link
          href="/applicants"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-900 dark:hover:text-emerald-400 transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applicant List
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-xl font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {applicant.first_name?.[0] || "A"}
                {applicant.last_name?.[0] || "P"}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {applicant.full_name || `${applicant.first_name || ""} ${applicant.last_name || ""}`}
                </h2>
                <Badge variant="default">{currentStage}</Badge>
                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {applicant.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {applicant.phone_number || "No phone"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {applicant.email || "No email"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {applicant.city || "N/A"}, {applicant.country || "Ethiopia"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentStage === "Draft" && (
              <Link href={`/applicants/new?resume=${encodeURIComponent(applicant.name)}`}>
                <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium">
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Continue Registration
                </Button>
              </Link>
            )}

            {currentStage === "Registered" && (
              <Button
                onClick={() => generateCvMutation.mutate()}
                disabled={generateCvMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {generateCvMutation.isPending ? "Generating..." : "Generate Official CV"}
              </Button>
            )}

            {currentStage !== "Draft" && (
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-200 dark:border-slate-700">
                  <Eye className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                  Preview CV
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Workflow Progress Stepper */}
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
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
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "font-bold text-emerald-950 dark:text-emerald-300"
                        : isPast
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400"
                    }`}
                  >
                    {stage}
                  </span>
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 w-5 sm:w-8 ${
                        idx < currentStageIndex
                          ? "bg-emerald-600"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DYNAMIC CURRENT STAGE SECTION */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 shadow-xs animate-in fade-in duration-300">
        {/* 1. Stage: CV Generated */}
        {currentStage === "CV Generated" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
                  ✓
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Official CV Generated
                </h3>
                <Badge variant="purple">{applicant.cv_record || "CV-Ready"}</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Official candidate CV record is compiled with education, credentials, and COC/Medical verification.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}>
                <Button className="bg-purple-900 hover:bg-purple-950 text-white text-xs font-medium">
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview CV
                </Button>
              </Link>
              <Button
                onClick={() => advanceToRequestPendingMutation.mutate()}
                disabled={advanceToRequestPendingMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-medium"
              >
                Proceed to Request Pending
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* 2. Stage: Request Pending */}
        {currentStage === "Request Pending" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stage: Request Pending (Contractor Document Verification)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Upload and extract the contractor demand letter to verify foreign employer allocation and candidate selection.
              </p>
            </div>
            <div>
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs">
                  <UploadCloud className="mr-1.5 h-4 w-4" />
                  Upload Document from Contractor
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 3. Stage: Selected */}
        {currentStage === "Selected" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Candidate Selected for Overseas Deployment
                </h3>
                <Badge variant="info">Ready for Staff Assignment</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sponsor: <strong>{applicant.contractor_doc?.sponsor_name || "Sheikh Fahad Al-Ghamdi"}</strong> • Salary:{" "}
                <strong>${applicant.contractor_doc?.salary || 2400} SAR</strong>. Assign processing employees to initiate LMS, Wakala, and Injaz streams.
              </p>
            </div>
            <div>
              <Button
                onClick={() => setIsAssignModalOpen(true)}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold shadow-sm"
              >
                <UserCheck className="mr-1.5 h-4 w-4" />
                Assign Processing Employee
              </Button>
            </div>
          </div>
        )}

        {/* 4. Stage: Processing (Parallel LMS / Wakala / Injaz) */}
        {currentStage === "Processing" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Parallel Operational Processing Streams
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Designated Staff: <strong>{applicant.assigned_employee_name || "Operations Team"}</strong> ({applicant.assigned_role_type || "All Roles"})
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setProcessingInitialTab("lms");
                  setIsProcessingModalOpen(true);
                }}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Update Processing Streams
              </Button>
            </div>

            {/* 3 Parallel Stream Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LMS Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-emerald-700" /> LMS & Ticket
                  </span>
                  <Badge variant={applicant.lms_processing?.status === "Completed" ? "success" : "warning"}>
                    {applicant.lms_processing?.status || "In Progress"}
                  </Badge>
                </div>
                <p className="text-slate-500">Staff: {applicant.lms_processing?.assigned_employee || "Sara Mohammed"}</p>
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 text-[11px]">
                  <p><strong>PNR:</strong> {applicant.lms_processing?.ticket_pnr || "Pending Input"}</p>
                  <p><strong>Flight:</strong> {applicant.lms_processing?.flight_number || "ET-402"}</p>
                  <p><strong>Clearance Ref 1:</strong> {applicant.lms_processing?.additional_field_1 || "MOL-CLEARANCE-9941"}</p>
                  <p><strong>Insurance Ref 2:</strong> {applicant.lms_processing?.additional_field_2 || "INS-MED-2026-441"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessingInitialTab("lms");
                    setIsProcessingModalOpen(true);
                  }}
                  className="w-full text-xs h-7"
                >
                  Manage LMS
                </Button>
              </div>

              {/* Injaz Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-blue-600" /> Injaz & Teashir
                  </span>
                  <Badge variant={applicant.injaz_processing?.status === "Completed" ? "success" : "warning"}>
                    {applicant.injaz_processing?.status || "In Progress"}
                  </Badge>
                </div>
                <p className="text-slate-500">Staff: {applicant.injaz_processing?.assigned_employee || "Dawit Haile"}</p>
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 text-[11px]">
                  <p><strong>Injaz No:</strong> {applicant.injaz_processing?.injaz_app_no || "INJ-7788412"}</p>
                  <p className="text-emerald-800 dark:text-emerald-300 font-bold">
                    <strong>Teashir Fee:</strong> ${applicant.injaz_processing?.teashir_fee ?? 140} USD
                  </p>
                  <p><strong>Biometrics:</strong> {applicant.injaz_processing?.biometrics_date || "Scheduled"}</p>
                  <p><strong>Center:</strong> {applicant.injaz_processing?.biometrics_center || "VFS Global Addis"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessingInitialTab("injaz");
                    setIsProcessingModalOpen(true);
                  }}
                  className="w-full text-xs h-7"
                >
                  Manage Injaz
                </Button>
              </div>

              {/* Wakala Card Matching Figma Design */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Wakala
                  </span>
                  <Badge variant={applicant.wakala_processing?.status === "Completed" ? "success" : applicant.wakala_processing?.status === "In Progress" ? "warning" : "neutral"}>
                    {applicant.wakala_processing?.status === "In Progress" ? "WAITING" : applicant.wakala_processing?.status || "WAITING"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">Assigned To: <strong>{applicant.wakala_processing?.assigned_employee || "Tigist Alemu"}</strong></p>
                <div className="space-y-1.5 bg-slate-50 dark:bg-[#16161b] p-2.5 rounded-lg border border-slate-100 dark:border-[#26262d] text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Started On:</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{applicant.wakala_processing?.started_on || "14 May 2024"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">Request Payment ?</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {applicant.wakala_processing?.request_payment !== false ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">Request Via:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[10px]">
                      {applicant.wakala_processing?.request_via || "WhatsApp"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Wakala No:</span>
                    <span className="font-mono text-slate-800 dark:text-zinc-200">{applicant.wakala_processing?.wakala_number || "WAK-9921448"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Foreign Agency:</span>
                    <span className="text-slate-800 dark:text-zinc-200 truncate max-w-[140px]">{applicant.wakala_processing?.foreign_agency_name || "Al-Khaleej Manpower"}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessingInitialTab("wakala");
                    setIsProcessingModalOpen(true);
                  }}
                  className="w-full text-xs h-7 border-slate-300 dark:border-[#26262d]"
                >
                  Manage Wakala
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Stage: Embassy/Stamped */}
        {currentStage === "Embassy/Stamped" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Visa Stamped at Foreign Embassy
                </h3>
                <Badge variant="purple">Visa Issued</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Visa Number: <strong>{applicant.embassy_processing?.visa_number || "VISA-9948201"}</strong> • Stamped at: Royal Embassy of Saudi Arabia. Ready for LMS travel coordinator to confirm final departure.
              </p>
            </div>
            <div>
              <Button
                onClick={() => {
                  setProcessingInitialTab("departure");
                  setIsProcessingModalOpen(true);
                }}
                className="bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold shadow-sm"
              >
                <Send className="mr-1.5 h-4 w-4" />
                Confirm & Mark Departed
              </Button>
            </div>
          </div>
        )}

        {/* 6. Stage: Departed */}
        {currentStage === "Departed" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Candidate Successfully Departed & Deployed
                </h3>
                <Badge variant="success">Completed</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Flight: <strong>{applicant.departure_info?.flight_number || "ET-402"}</strong> • Destination:{" "}
                <strong>{applicant.departure_info?.destination_city || "Riyadh"}</strong> • Date:{" "}
                <strong>{applicant.departure_info?.departure_date || "Confirmed"}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Marked by: {applicant.departure_info?.marked_by || "LMS Officer"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Detail Grid: Left (Profile & Identification) / Right (COC/Medical, Financials, Education) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Core Identification */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Identification Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Applicant ID:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Passport Number:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {applicant.passport_number || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Passport Expiry:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {applicant.passport_expiry || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Labour ID:</span>
                <span className="font-medium text-slate-900 dark:text-white">{applicant.labour_id || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">National / Fayda ID:</span>
                <span className="font-medium text-slate-900 dark:text-white">{applicant.national_id || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Registered Date:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {applicant.registration_date || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Personal Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Date of Birth</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.date_of_birth || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Gender</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.gender || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Marital Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.marital_status || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Children Count</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.children ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Religion</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.religion || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nationality</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{applicant.nationality || "Ethiopia"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Emergency Reference Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Contact Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {applicant.contact_person_name || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Contact Phone:</span>
                <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                  {applicant.contact_person_phone || "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: COC/Medical, Education/Experience, Financials */}
        <div className="space-y-6 lg:col-span-8">
          {/* Medical & COC Badges Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                COC & Medical Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">COC Competency Status</span>
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

              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Biological Medical Status</span>
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

          {/* Education & Experience Details */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Education & Experience Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block font-medium">Highest Education Level</span>
                <span className="font-bold text-slate-900 dark:text-white">{applicant.highest_education || "—"}</span>
                <p className="text-slate-500 text-[11px]">
                  Institution: {applicant.institution || "Verified"} {applicant.graduation_year ? `(${applicant.graduation_year})` : ""}
                </p>
              </div>

              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block font-medium">Work History</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {applicant.years_of_experience ? `${applicant.years_of_experience} Years Experience` : "Entry Level"}
                </span>
                <p className="text-slate-500 text-[11px]">
                  Employer: {applicant.current_employer || "Private Practice"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Financial Ledger Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5">
                <span className="text-slate-500 block">Total Income</span>
                <span className="text-lg font-bold text-emerald-900 dark:text-emerald-300">
                  ${(applicant.total_income || 0).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/30 p-3.5">
                <span className="text-slate-500 block">Total Expense</span>
                <span className="text-lg font-bold text-rose-900 dark:text-rose-400">
                  ${(applicant.total_expense || 0).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5">
                <span className="text-slate-500 block">Net Balance</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ${(applicant.net_balance || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Employee Modal */}
      <AssignEmployeeModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        applicantIds={[applicant.name]}
        applicantNames={[applicant.full_name]}
      />

      {/* Processing Streams Modal */}
      <ProcessingStreamsModal
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        applicant={applicant}
        initialTab={processingInitialTab}
      />
    </div>
  );
}
