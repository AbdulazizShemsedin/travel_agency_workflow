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
  FileUp,
  Plane,
  Fingerprint,
  Send,
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
  registerApplicant,
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
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelRemarks, setCancelRemarks] = React.useState("");
  const [processingInitialTab, setProcessingInitialTab] = React.useState<"lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure">("lms");

  const {
    data: applicant,
    isLoading,
    isError,
    refetch,
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
      toast.success(data.message?.message || "CV generated successfully! Opening preview...");
      router.push(`/applicants/${encodeURIComponent(applicantId)}/cv`);
    },
    onError: (err: Error) => {
      toast.error("CV generation failed", { description: err.message });
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => registerApplicant(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Applicant successfully registered!");
    },
    onError: (err: Error) => {
      toast.error("Registration validation failed", { description: err.message });
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
          The requested record ({applicantId}) was not found in the records.
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

  const isContractDocApproved = Boolean(
    applicant.contractor_doc &&
    (applicant.contractor_doc.approval_status === "Approved" ||
     applicant.contractor_doc.selection_status === "Selected" ||
     applicant.contractor_doc.parsed_at)
  );

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
              {applicant.full_name || [applicant.first_name, applicant.middle_name, applicant.last_name].filter(Boolean).join(" ") || applicant.name}
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
            {applicant.registration_date || applicant.creation?.split(" ")[0] || "Draft"}
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

          <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
            <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              Contract Dossier (PyMuPDF)
            </Button>
          </Link>

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
                Complete Stage 2 KYC/Medical requirements, or click Register Applicant if requirements are already met.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Register Applicant
                  </>
                )}
              </Button>
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/edit`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Registration Form
                </Button>
              </Link>
            </div>
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
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating CV...
                </>
              ) : (
                <>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Generate CV & Dossier
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
                Stage: CV Generated (Available in Agent Portal)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Candidate CV record is created and published. Overseas partner agencies can discover, select, and reserve this candidate via the Agent Portal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold">
                  <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload & Parse Musaned Contract
                </Button>
              </Link>
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View Official CV
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stage 4: Selected */}
        {currentStage === "Selected" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Stage: Selected {isContractDocApproved ? "(Contract Approved — Ready for Staff Assignment)" : "(Prerequisite: Contract Document Approval Required)"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                {isContractDocApproved
                  ? "Contract document verified & approved. Assign internal processing staff to initiate LMS, Injaz, and Wakala clearances (Stage 6)."
                  : "A verified contractor demand or employment contract must be uploaded and approved before assigning internal processing staff."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isContractDocApproved ? (
                <>
                  <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                    <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> View / Update Contract
                    </Button>
                  </Link>
                  <Button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Assign Processing Staff
                  </Button>
                </>
              ) : (
                <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                  <Button className="bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-semibold shadow-xs">
                    <FileUp className="mr-1.5 h-3.5 w-3.5" /> Upload & Approve Contract Document
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stage 6: Processing (Parallel LMS, Injaz, Wakala) */}
        {currentStage === "Processing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  Stage: Processing (Multi-Stream Clearances)
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Execute parallel clearance streams: LMS Clearance, Injaz/Teashir, and Wakala Authorization.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* LMS Clearance */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> LMS Clearance
                  </span>
                  <Badge variant={applicant.lms_processing?.status === "Issued" ? "success" : "warning"}>
                    {applicant.lms_processing?.status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.lms_processing?.employee || "Unassigned"}</p>
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
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.injaz_processing?.employee || "Unassigned"}</p>
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
                <p className="text-slate-500 dark:text-zinc-400">Employee: {applicant.wakala_processing?.employee || "Unassigned"}</p>
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
                <span className="text-slate-500 dark:text-zinc-400">First Name</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.first_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Middle / Father</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.middle_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Last Name / Grandfather</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.last_name || "N/A"}</p>
              </div>
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
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.phone_number || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">City / Country</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.city ? `${applicant.city}, ${applicant.country || "Ethiopia"}` : (applicant.country || "Ethiopia")}</p>
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
                <span className="text-slate-500 dark:text-zinc-400">Place of Issue</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.place_of_issue || "Addis Ababa"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Issue Date</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.passport_issue_date || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Expiry</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.passport_expiry || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Date of Birth</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">National / Fayda ID</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.national_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Labour ID</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.labour_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Job Applied</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.job_applied || "House Maid / General"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Destination</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.destination_country || "Saudi Arabia"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Skills, Education & Experience */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Skills, Education & Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Highest Education</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.highest_education || applicant.education || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">English Level</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.english_level || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Arabic Level</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.arabic_level || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Overseas Experience</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.experience_country ? `${applicant.experience_country} (${applicant.experience_period || "1"} yrs)` : "None / First Timer"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Emergency Contacts & Next of Kin */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Emergency Reference & Next of Kin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Contact Person</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_name || applicant.emergency_contact_name || applicant.next_of_kin_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Phone Number</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_phone || applicant.emergency_contact_phone || applicant.next_of_kin_contact || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Relationship</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_relation || applicant.emergency_relationship || applicant.next_of_kin_relationship || "Relative"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Embedded Financial Sub-Table (IncomeExpenseLog) */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Embedded Financial Ledger (Income & Expense)
              </CardTitle>
              <div className="text-right text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Net: </span>
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  ${((Number(applicant.total_income) || 0) - (Number(applicant.total_expense) || 0)).toLocaleString()}
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
                          {log.transaction_type === "Income" ? "+" : "-"}${Number(log.amount).toLocaleString()}
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
                Medical & Compliance Expiry Monitor
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

          {/* Candidate Fees & Financials Ledger */}
          {(() => {
            const allFees = [
              ...(applicant.lms_processing?.financials || []),
              ...(applicant.injaz_processing?.financials || []),
              ...(applicant.wakala_processing?.financials || []),
              ...(applicant.dsr_stamp?.financials || []),
              ...(applicant.departure_info?.financials || []),
              ...(applicant.income_expense_logs || []),
            ];
            const candidateIncome = allFees
              .filter((f: any) => f.transaction_type === "Income")
              .reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
            const candidateExpense = allFees
              .filter((f: any) => f.transaction_type === "Expense")
              .reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);

            return (
              <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                      Candidate Fees & Expenses
                    </CardTitle>
                    <Badge variant={candidateExpense > 0 || candidateIncome > 0 ? "success" : "neutral"}>
                      {allFees.length} Record{allFees.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#16161b] border border-slate-200/60 dark:border-[#26262d]">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Total Income</span>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        +${candidateIncome.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Total Expense</span>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                        -${candidateExpense.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {allFees.length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic py-1 text-center">
                      No fees or clearance expenses recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {allFees.map((fee: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md border border-slate-100 dark:border-[#222227] bg-white dark:bg-[#121215]"
                        >
                          <div className="space-y-0.5 max-w-[70%]">
                            <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {fee.description || fee.source_doctype || "Clearance Fee"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {fee.date || "Today"} • {fee.source_doctype || "Clearance"}
                            </p>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              fee.transaction_type === "Income"
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {fee.transaction_type === "Income" ? "+" : "-"}${Number(fee.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>



      {/* Assign Employee Modal */}
      {applicant && (
        <AssignEmployeeModal
          applicantIds={[applicant.name || applicantId]}
          applicantNames={[applicant.full_name || "Applicant"]}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

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
