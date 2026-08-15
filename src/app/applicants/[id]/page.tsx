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
  MessageSquare,
  Ban,
  RotateCcw,
  Plus,
  Ticket,
} from "lucide-react";
import {
  getApplicant,
  generateCV,
  cancelApplicant,
  restoreApplicant,
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
import { ContractRequestModal } from "@/components/applicant/ContractRequestModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CANONICAL_STAGES = [
  "Draft",
  "Registered",
  "CV Generated",
  "Request Pending",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
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
  const [isContractModalOpen, setIsContractModalOpen] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelRemarks, setCancelRemarks] = React.useState("");
  const [processingInitialTab, setProcessingInitialTab] = React.useState<"lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure">("lms");

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
      toast.success(data.message?.message || "CV generated successfully!");
    },
    onError: (err: Error) => {
      toast.error("CV generation failed", { description: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelApplicant(applicantId, cancelRemarks),
    onSuccess: (data) => {
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.warning(data.message || "Applicant process cancelled.");
    },
    onError: (err: Error) => toast.error("Cancellation failed", { description: err.message }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreApplicant(applicantId, "auto"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message?.message || "Applicant process restored.");
    },
    onError: (err: Error) => toast.error("Restore failed", { description: err.message }),
  });

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
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The requested record ({applicantId}) does not exist in the database.
        </p>
        <Link href="/applicants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Applicants Directory
          </Button>
        </Link>
      </div>
    );
  }

  const examDays = calculateRemainingDays(applicant.exam_date);
  const examStatus = getExpiryBadgeStatus(examDays);

  const medDays = calculateRemainingDays(applicant.medical_expiry_date);
  const medStatus = getExpiryBadgeStatus(medDays);

  const passDays = calculateRemainingDays(applicant.passport_expiry);
  const passStatus = getExpiryBadgeStatus(passDays);

  const currentStage = applicant.applicant_state || "Draft";
  const currentStageIndex = CANONICAL_STAGES.indexOf(currentStage);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <Link
            href="/applicants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicants Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {applicant.full_name || `${applicant.first_name} ${applicant.last_name}`}
            </h1>
            <Badge variant="default" className="text-xs">
              {currentStage}
            </Badge>
            {applicant.applicant_state === "Cancelled" && (
              <Badge variant="destructive">Cancelled</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Applicant ID: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.name}</strong> • Registered on{" "}
            {applicant.registration_date || "Draft"}
          </p>
        </div>

        {/* Top Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {applicant.applicant_state === "Cancelled" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => restoreMutation.mutate()}
              disabled={restoreMutation.isPending}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore Applicant
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel Process
            </Button>
          )}

          <Link href={`/applicants/${encodeURIComponent(applicant.name)}/edit`}>
            <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Canonical 9-Stage Stepper Ribbon */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] gap-2">
          {CANONICAL_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-emerald-900 dark:bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-[#1c1c22] text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-[#26262d]"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      isCurrent
                        ? "text-emerald-900 dark:text-emerald-400 font-bold"
                        : isCompleted
                        ? "text-slate-700 dark:text-zinc-300"
                        : "text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    {stage}
                  </span>
                </div>
                {idx !== CANONICAL_STAGES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      idx < currentStageIndex ? "bg-emerald-800 dark:bg-emerald-600" : "bg-slate-200 dark:bg-[#26262d]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stage Action Controls Banner */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        {/* Stage 1: Draft */}
        {currentStage === "Draft" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: Draft (Incomplete Registration)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Complete Stage 2 KYC/Medical requirements to register this applicant.
              </p>
            </div>
            <Link href={`/applicants/${encodeURIComponent(applicant.name)}/edit`}>
              <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold">
                Complete Registration Form
              </Button>
            </Link>
          </div>
        )}

        {/* Stage 2: Registered */}
        {currentStage === "Registered" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: Registered (Ready for CV Generation)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                All Stage 2 KYC and Medical requirements are verified. Generate the standardized bilateral recruitment CV.
              </p>
            </div>
            <Button
              onClick={() => generateCvMutation.mutate()}
              disabled={generateCvMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              {generateCvMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-1.5 h-4 w-4" /> Generate Bilateral CV
                </>
              )}
            </Button>
          </div>
        )}

        {/* Stage 3: CV Generated */}
        {currentStage === "CV Generated" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: CV Generated (Ready for Contractor Broadcast)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Official CV PDF is generated. Send contract request via WhatsApp Cloud API to overseas partner agencies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View CV Preview
                </Button>
              </Link>
              <Button
                onClick={() => setIsContractModalOpen(true)}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Send Contract Request (WhatsApp)
              </Button>
            </div>
          </div>
        )}

        {/* Stage 4: Request Pending */}
        {currentStage === "Request Pending" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: Request Pending (Contractor Document Upload)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Contract request sent. Upload and parse the signed contractor demand dossier to verify allocation.
              </p>
            </div>
            <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs">
                <UploadCloud className="mr-1.5 h-4 w-4" /> Upload Contractor Dossier
              </Button>
            </Link>
          </div>
        )}

        {/* Stage 5: Selected */}
        {currentStage === "Selected" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: Selected (Ready for Processing & Staffing)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Candidate approved by sponsor. Assign clearance officers or initiate parallel LMS, Wakala, and Injaz processing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAssignModalOpen(true)}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm"
              >
                <UserCheck className="mr-1.5 h-4 w-4" /> Assign Clearance Officers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProcessingInitialTab("lms");
                  setIsProcessingModalOpen(true);
                }}
                className="text-xs border-slate-300 dark:border-[#26262d]"
              >
                Manage Streams
              </Button>
            </div>
          </div>
        )}

        {/* Stage 6: Processing (Parallel LMS, Injaz, Wakala) */}
        {currentStage === "Processing" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stage: Processing (Parallel LMS, Injaz, and Wakala Streams)
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Update clearance statuses. Once LMS is Issued and Wakala/Injaz are Completed, proceed to Visa Stamping.
                </p>
              </div>
              <Button
                onClick={() => {
                  setProcessingInitialTab("lms");
                  setIsProcessingModalOpen(true);
                }}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Open Clearance Portal
              </Button>
            </div>

            {/* 3 Parallel Clearances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LMS Clearance */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> LMS Clearance
                  </span>
                  <Badge variant={applicant.lms_processing?.status === "Issued" ? "success" : "warning"}>
                    {applicant.lms_processing?.status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.lms_processing?.employee || "sara@agency.et"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessingInitialTab("lms");
                    setIsProcessingModalOpen(true);
                  }}
                  className="w-full text-xs h-7 border-slate-300 dark:border-[#26262d]"
                >
                  Manage LMS
                </Button>
              </div>

              {/* Injaz Clearance */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Injaz Clearance
                  </span>
                  <Badge variant={applicant.injaz_processing?.status === "Completed" ? "success" : "warning"}>
                    {applicant.injaz_processing?.status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.injaz_processing?.employee || "dawit@agency.et"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessingInitialTab("injaz");
                    setIsProcessingModalOpen(true);
                  }}
                  className="w-full text-xs h-7 border-slate-300 dark:border-[#26262d]"
                >
                  Manage Injaz
                </Button>
              </div>

              {/* Wakala Clearance */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Wakala Clearance
                  </span>
                  <Badge variant={applicant.wakala_processing?.status === "Completed" ? "success" : "warning"}>
                    {applicant.wakala_processing?.status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.wakala_processing?.employee || "tigist@agency.et"}</p>
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

        {/* Stage 7: Stamped */}
        {currentStage === "Stamped" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                Stage: Stamped (Visa Endorsed)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Visa stamp confirmed on passport. Proceed to book flight ticket reservation (Stage 8: Ticketed).
              </p>
            </div>
            <Button
              onClick={() => {
                setProcessingInitialTab("ticket");
                setIsProcessingModalOpen(true);
              }}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              <Ticket className="mr-1.5 h-3.5 w-3.5" /> Book Flight Ticket
            </Button>
          </div>
        )}

        {/* Stage 8: Ticketed */}
        {currentStage === "Ticketed" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                Stage: Ticketed (Flight Ticket Issued)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Ticket confirmed. Perform Pre-Departure Medical 2 check and finalize flight departure clearance.
              </p>
            </div>
            <Button
              onClick={() => {
                setProcessingInitialTab("departure");
                setIsProcessingModalOpen(true);
              }}
              className="bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-semibold"
            >
              <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> Verify Medical 2 & Depart
            </Button>
          </div>
        )}

        {/* Stage 9: Departed */}
        {currentStage === "Departed" && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <Plane className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                Stage: Departed (Overseas Placement Complete 100%)
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-300">
                Candidate flight departure finalized. Pre-Departure Medical 2 passed.
              </p>
            </div>
            <Badge variant="purple">Completed</Badge>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Personal, Education & Identification Details */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Personal & Contact */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Personal & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Gender</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.gender || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Religion</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.religion || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Marital Status</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.marital_status || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Children Count</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.children ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Primary Phone</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.phone_number}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">City / Country</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.city}, {applicant.country}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Travel & Identification */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Travel & Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Number</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{applicant.passport_number || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Expiry</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.passport_expiry || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Labour ID</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.labour_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Date of Birth</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Job Applied</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.job_applied || "General"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Highest Education</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.highest_education || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Embedded Financial Sub-Table (IncomeExpenseLog) */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Embedded Financial Ledger (Income & Expense)
              </CardTitle>
              <div className="text-right text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Net: </span>
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  ${(applicant.total_income - applicant.total_expense).toLocaleString()}
                </strong>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-[#222227] text-xs">
                {(applicant.income_expense_logs || []).length > 0 ? (
                  applicant.income_expense_logs?.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <div>
                        <span className={`font-bold mr-2 ${log.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          [{log.transaction_type}]
                        </span>
                        <span className="text-slate-800 dark:text-zinc-200">{log.description || "Fee deposit"}</span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className={log.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {log.transaction_type === "Income" ? "+" : "-"}${log.amount.toLocaleString()}
                        </strong>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">{log.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">No transaction logs recorded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Medical Watchdog Badges & Compliance Summary */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Medical & Compliance Watchdog
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Medical Status</span>
                <Badge variant={applicant.medical_status === "FIT" ? "success" : "destructive"}>
                  {applicant.medical_status || "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Medical Expiry</span>
                <Badge variant={medStatus.variant} className={medStatus.isPulsing ? "animate-pulse" : ""}>
                  {medStatus.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">COC Status</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">{applicant.coc_status || "Pending"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Passport Expiry</span>
                <Badge variant={passStatus.variant}>{passStatus.label}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contract Request WhatsApp Modal */}
      <ContractRequestModal
        applicant={applicant}
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
      />

      {/* Assign Employee Modal */}
      <AssignEmployeeModal
        applicantIds={[applicant.name]}
        applicantNames={[applicant.full_name]}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      {/* Processing Streams Modal */}
      <ProcessingStreamsModal
        applicant={applicant}
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        initialTab={processingInitialTab}
      />

      {/* Cancel Process Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Ban className="h-5 w-5" /> Cancel Applicant Process
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Are you sure you want to cancel the process for {applicant.full_name}? Please provide mandatory cancellation remarks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <Label className="font-semibold">Cancellation Remarks *</Label>
            <Input
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="e.g., Candidate withdrew application / Medical unfitness"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || !cancelRemarks.trim()}
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
