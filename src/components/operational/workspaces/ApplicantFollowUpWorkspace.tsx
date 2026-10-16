"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  ArrowLeft,
  FileCheck2,
  CreditCard,
  Building2,
  Plane,
  HeartPulse,
  Lock,
  Calendar,
  Clock,
  RotateCcw,
  RefreshCw,
  Globe,
  FileText,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Send,
  AlertCircle,
} from "lucide-react";
import { WorkspaceApplicantRow } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import {
  startClearanceStepV2,
  completeClearanceStepV2,
  rejectEmbassyStepV2,
  setLmisStatusV2,
  setTaeshirAppointmentV2,
  rescheduleTaeshirAppointmentV2,
  recordInjazPaymentV2,
  recordWakalaPaymentV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import {
  recordPredepartureMedicalResultV2,
  recordTicketDetailsV2,
  recordRescheduleV2,
  advancePlacementV2,
  uploadPlacementVisaV2,
} from "@/lib/api/v2/placements";
import { downloadInjazDocumentPDF, InjazCandidateData } from "@/lib/pdf/injazDocumentGenerator";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";

interface ApplicantFollowUpWorkspaceProps {
  isOpen?: boolean;
  onClose?: () => void;
  row: WorkspaceApplicantRow | null;
  onRefresh?: () => void;
  employees?: { name: string; full_name?: string; email?: string }[];
  isFullPage?: boolean;
}

const TAESHIR_STATUS_OPTIONS = ["INFORMED", "RECEIVED", "READY TO EMBASSY"] as const;
const INJAZ_PAYMENT_OPTIONS = ["Unpaid", "Printed", "Paid"] as const;
const COC_STATUS_OPTIONS = ["Not Started", "In Training", "Certified", "Exempt"] as const;
const DEPARTURE_OUTCOMES = ["Departed", "Local return", "International return"] as const;

export function ApplicantFollowUpWorkspace({
  isOpen = true,
  onClose,
  row,
  onRefresh,
  employees = [],
  isFullPage = false,
}: ApplicantFollowUpWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  // Local state copy of current applicant row for instant feedback
  const [currentRow, setCurrentRow] = React.useState<WorkspaceApplicantRow | null>(row);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    setCurrentRow(row);
  }, [row]);

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open (drawer mode only)
  React.useEffect(() => {
    if (isOpen && !isFullPage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isFullPage]);

  // Role permissions checking
  const authUserV2 = React.useMemo(() => {
    return authUser
      ? {
          user: authUser.email,
          full_name: authUser.full_name || authUser.email,
          roles: Array.isArray(authUser.roles) ? authUser.roles : [],
        }
      : null;
  }, [authUser]);

  const isAdmin = React.useMemo(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator") return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin" ||
        norm === "admin"
      );
    });
  }, [authUser, roles]);

  const hasRoleKeyword = React.useCallback(
    (keywords: string[]) => {
      const r = (roles || []).map((x) => String(x).toLowerCase().trim());
      return r.some((roleName) => keywords.some((k) => roleName.includes(k)));
    },
    [roles]
  );

  const canEditLmis = isAdmin || hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS", "Clearance Officer"]) || hasRoleKeyword(["lms", "lmis"]);
  const canEditTaeshir = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign", "Clearance Officer"]) || hasRoleKeyword(["taeshir", "teshir", "injaz", "telesign"]);
  const canEditEmbassy = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer"]) || hasRoleKeyword(["embassy"]);
  const canEditMedical = isAdmin || hasRoleKeyword(["medical"]) || hasAnyV2Role(authUserV2, ["Clearance Officer"]);
  const canEditDeparture = isAdmin || hasAnyV2Role(authUserV2, ["Ticketer"]) || hasRoleKeyword(["ticket"]);

  // --- DIALOG STATES ---
  // LMIS Rejection Dialog
  const [isLmisRejectOpen, setIsLmisRejectOpen] = React.useState(false);
  const [selectedLmisReasons, setSelectedLmisReasons] = React.useState<string[]>([]);
  const [lmisRejectRemark, setLmisRejectRemark] = React.useState("");

  // Taeshir Direct Appointment & Injaz ID Form
  const [isTaeshirApptOpen, setIsTaeshirApptOpen] = React.useState(false);
  const [directApptDate, setDirectApptDate] = React.useState("");
  const [directInjazId, setDirectInjazId] = React.useState("");

  // Taeshir Reschedule Dialog
  const [isTaeshirRescheduleOpen, setIsTaeshirRescheduleOpen] = React.useState(false);
  const [newTaeshirDate, setNewTaeshirDate] = React.useState("");
  const [taeshirRescheduleReason, setTaeshirRescheduleReason] = React.useState("");

  // Embassy Stamping Dialog
  const [isEmbassyStampOpen, setIsEmbassyStampOpen] = React.useState(false);
  const [embassyVisaNumber, setEmbassyVisaNumber] = React.useState("");
  const [embassyVisaIssueDate, setEmbassyVisaIssueDate] = React.useState("");
  const [embassyVisaExpiryDate, setEmbassyVisaExpiryDate] = React.useState("");

  // Embassy Rejection Dialog
  const [isEmbassyRejectOpen, setIsEmbassyRejectOpen] = React.useState(false);
  const [embassyRejectRemark, setEmbassyRejectRemark] = React.useState("");

  // Ticketing Form Dialog
  const [isTicketFormOpen, setIsTicketFormOpen] = React.useState(false);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [airline, setAirline] = React.useState("Ethiopian Airlines");
  const [flightDate, setFlightDate] = React.useState("");
  const [flightTime, setFlightTime] = React.useState("10:00");

  // Flight Reschedule Dialog
  const [isFlightRescheduleOpen, setIsFlightRescheduleOpen] = React.useState(false);
  const [newFlightDate, setNewFlightDate] = React.useState("");
  const [newFlightTime, setNewFlightTime] = React.useState("");
  const [flightRescheduleReason, setFlightRescheduleReason] = React.useState("");

  // Departure Confirm Dialog
  const [isConfirmDepartOpen, setIsConfirmDepartOpen] = React.useState(false);
  const [selectedFlightOutcome, setSelectedFlightOutcome] = React.useState<string>("Departed");
  const [departureRemark, setDepartureRemark] = React.useState("");

  // Editable Remarks States for inline save
  const [lmisRemarkVal, setLmisRemarkVal] = React.useState("");
  const [teshirRemarkVal, setTeshirRemarkVal] = React.useState("");
  const [embassyRemarkVal, setEmbassyRemarkVal] = React.useState("");
  const [ticketRemarkVal, setTicketRemarkVal] = React.useState("");

  // Editable LMIS Issue Date
  const [lmisIssueDate, setLmisIssueDate] = React.useState("");

  React.useEffect(() => {
    if (currentRow) {
      setLmisRemarkVal(currentRow.lmisRemark || currentRow.lms?.remarks || "");
      setTeshirRemarkVal(currentRow.teshirRemark || currentRow.injaz?.remarks || "");
      setEmbassyRemarkVal(currentRow.embassyRemarks || currentRow.embassy?.remarks || "");
      setTicketRemarkVal(currentRow.ticketRemark || (currentRow.plc as any)?.remarks || "");
      const d = currentRow.issueDate || currentRow.lms?.date_completed || "";
      setLmisIssueDate(d && d !== "—" ? d : "");
    }
  }, [currentRow]);

  // Invalidate queries & sync state
  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["v2_clearance_queue"] }),
        queryClient.invalidateQueries({ queryKey: ["applicants"] }),
      ]);
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  if ((!isOpen && !isFullPage) || !currentRow) return null;

  const placementName = currentRow.placementName || currentRow.placementId;
  const destinationCountry = currentRow.destinationCountry || "Saudi Arabia";
  const isKuwait = destinationCountry.toLowerCase().includes("kuwait");

  // Step identifiers
  const lmsStepName = currentRow.lms?.name || currentRow.clearanceStepName;
  const injazStepName = currentRow.injaz?.name;
  const embassyStepName = currentRow.embassy?.name;

  // Days remaining calculation helper
  const calculateDaysRemaining = (deadlineStr?: string | null) => {
    if (!deadlineStr || deadlineStr === "—") return null;
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const visaDeadline = currentRow.visaDeadline || currentRow.embassy?.visa_valid_until || (currentRow.plc as any)?.visa_deadline;
  const daysRemaining = calculateDaysRemaining(visaDeadline);

  // Deriving LMIS completion status
  const isLmisComplete =
    (currentRow.lmisStatus || "").toUpperCase() === "ISSUED" ||
    currentRow.lms?.status === "Issued" ||
    currentRow.lms?.status === "Completed" ||
    currentRow.lms?.status === "Complete";

  // Deriving Te'shir completion status strictly from authoritative backend step
  const isTeshirCompleted =
    currentRow.injaz?.status === "Completed" ||
    currentRow.teshirStatus === "Completed" ||
    currentRow.teshirStatus === "READY TO EMBASSY" ||
    currentRow.teshirStatus === "RECEIVED";
  const isInjazPaid = currentRow.injazPayment === "Paid" || currentRow.injaz?.payment_status === "Paid";

  // Check if pipeline has advanced past embassy / ticketing
  const isPlacementAdvanced = ["Stamped", "Ticketed", "Departed"].includes(
    String(currentRow.placementStatus || currentRow.stageStatus || "")
  );

  // Stage accessibility rules:
  // Embassy requires both LMIS and Te'shir to be finished
  const isEmbassyAccessible = isPlacementAdvanced || (isLmisComplete && isTeshirCompleted);
  const isEmbassyLocked = !isEmbassyAccessible;

  // Flight Ticket & Departure requires Embassy to be Stamped
  const isEmbassyStamped =
    currentRow.embassyStatus === "Stamped" ||
    currentRow.embassy?.status === "Stamped" ||
    currentRow.embassy?.status === "Completed" ||
    ["Ticketed", "Departed"].includes(
      String(currentRow.placementStatus || currentRow.stageStatus || "")
    );

  const isTicketAccessible = isEmbassyStamped || ["Ticketed", "Departed"].includes(
    String(currentRow.placementStatus || currentRow.stageStatus || "")
  );
  const isTicketLocked = !isTicketAccessible;

  return (
    <div
      className={cn(
        isFullPage
          ? "w-full flex flex-col h-full"
          : "fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200"
      )}
    >
      {!isFullPage && (
        <div
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main Container */}
      <div
        className={cn(
          !isFullPage && "fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-8"
        )}
      >
        <div
          className={cn(
            "bg-slate-50/60 dark:bg-[#0e0e12] flex flex-col h-full overflow-y-auto lg:overflow-visible",
            isFullPage
              ? "w-full rounded-2xl border border-slate-200/80 dark:border-[#222228] shadow-xs"
              : "w-screen max-w-5xl shadow-2xl border-l border-slate-200 dark:border-[#222228]"
          )}
        >
          {/* ============================================================= */}
          {/* SECTION 4: APPLICANT HEADER                                   */}
          {/* ============================================================= */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#121217] border-b border-slate-200 dark:border-[#202028] px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Left Identity Context */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300/40 uppercase shadow-2xs">
                  {currentRow.fullName?.substring(0, 2) || "AP"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase truncate">
                      {currentRow.fullName}
                    </h1>
                    <Badge variant="outline" className="text-[10px] font-mono h-4.5 py-0 border-slate-300 dark:border-zinc-700">
                      Passport: {currentRow.passportNumber || "NO PASSPORT"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                      <Globe className="h-3 w-3 text-slate-400" />
                      {destinationCountry}
                    </span>
                    <span>•</span>
                    <span>
                      Duration: <strong className="text-slate-800 dark:text-zinc-200">{currentRow.duration ? `${currentRow.duration} days` : currentRow.contractDays || "—"}</strong>
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">
                      Job: <strong className="text-slate-800 dark:text-zinc-200">{currentRow.jobApplied || "Housemaid"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Stage & Navigation Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Overall:</span>
                  <Badge className="bg-emerald-600 text-white font-bold text-[11px] uppercase px-2 py-0.5 shadow-2xs">
                    {currentRow.stageStatus || "Active"}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshAll}
                  disabled={isRefreshing}
                  className="h-7 w-7 p-0 border-slate-200 dark:border-[#272730]"
                  title="Refresh Candidate Data"
                >
                  <RefreshCw className={cn("h-3 w-3 text-slate-600 dark:text-zinc-300", isRefreshing && "animate-spin")} />
                </Button>

                {onClose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="h-7 px-2.5 text-xs font-semibold gap-1 border-slate-200 dark:border-[#272730] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1f1f26] cursor-pointer"
                    title="Return to Follow-Up Tracking Table"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Back to Follow-Up</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* FOUR-CARD 2x2 GRID WORKSPACE                                 */}
          {/* ============================================================= */}
          <div className="p-2 sm:p-2.5 lg:p-3 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5 flex-1 items-stretch">

              {/* ----------------------------------------------------------- */}
              {/* CARD 1: LMIS (Top-Left)                                     */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="px-3.5 py-1.5 sm:py-2 border-b border-slate-100 dark:border-[#202028] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        LMIS
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-50/50 py-0 h-4.5">
                      {currentRow.lmisStatus || "Pending"}
                    </Badge>
                  </div>

                  {/* Card Body - 2-Column Grid */}
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: COC Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          COC Status
                        </Label>
                        {canEditLmis && currentRow.applicantId ? (
                          <select
                            value={currentRow.cocStatus || "Not Started"}
                            onChange={async (e) => {
                              const val = e.target.value;
                              try {
                                await updateApplicantForLmisV2({
                                  applicant_name: currentRow.applicantId!,
                                  coc_status: val,
                                });
                                toast.success(`COC status updated to ${val}`);
                                setCurrentRow((prev) => (prev ? { ...prev, cocStatus: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md bg-white dark:bg-[#16161d] font-medium border-slate-200 dark:border-zinc-700"
                          >
                            {COC_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-semibold text-slate-800 dark:text-zinc-200">
                            <span>{currentRow.cocStatus || "Not Started"}</span>
                            {!canEditLmis && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 2: LMIS Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          LMIS Status
                        </Label>
                        {canEditLmis && lmsStepName ? (
                          <select
                            value={currentRow.lmisStatus || "IN PROGRESS"}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val === "REJECTED") {
                                setSelectedLmisReasons([]);
                                setIsLmisRejectOpen(true);
                                return;
                              }
                              try {
                                await setLmisStatusV2(lmsStepName, val);
                                toast.success(`LMIS status updated to ${val}`);
                                setCurrentRow((prev) => (prev ? { ...prev, lmisStatus: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md bg-white dark:bg-[#16161d] font-bold border-slate-200 dark:border-zinc-700"
                          >
                            {LMIS_WORKING_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-semibold text-slate-800 dark:text-zinc-200">
                            <span>{currentRow.lmisStatus || "Pending"}</span>
                            {!canEditLmis && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 3: LMIS Issue Date (Manually editable) */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          LMIS Issue Date
                        </Label>
                        {canEditLmis && lmsStepName ? (
                          <Input
                            type="date"
                            value={lmisIssueDate}
                            onChange={(e) => setLmisIssueDate(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.issueDate || currentRow.lms?.date_completed)) {
                                try {
                                  await completeClearanceStepV2(
                                    lmsStepName,
                                    currentRow.laborId || undefined,
                                    undefined,
                                    val
                                  );
                                  toast.success("LMIS issue date updated");
                                  setCurrentRow((prev) => (prev ? { ...prev, issueDate: val } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            {lmisIssueDate || currentRow.issueDate || currentRow.lms?.date_completed || "—"}
                          </div>
                        )}
                      </div>

                      {/* Labor ID / Office Reference */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Labor ID (Office Ref)
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-medium text-slate-800 dark:text-zinc-200">
                          {currentRow.laborId || "—"}
                        </div>
                      </div>

                      {/* Field 4: LMIS Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          LMIS Remark
                        </Label>
                        <Input
                          value={lmisRemarkVal}
                          onChange={(e) => setLmisRemarkVal(e.target.value)}
                          placeholder="Operational remarks for LMIS processing..."
                          disabled={!canEditLmis}
                          className="h-7 sm:h-7.5 text-xs px-2"
                        />
                      </div>

                      {/* Rejection Reasons Alert if rejected */}
                      {currentRow.lmisRejectionReasons && (
                        <div className="col-span-2 p-1.5 rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                          <span className="font-bold text-[10px] block">Rejection Reason(s):</span>
                          <span className="text-[11px]">{currentRow.lmisRejectionReasons}</span>
                        </div>
                      )}

                      {/* Kuwait LMIS Police Ashara sub-check */}
                      {isKuwait && (
                        <div className="col-span-2 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                          <span className="font-bold text-[11px] text-amber-900 dark:text-amber-300 block">
                            Kuwait Police Ashara Sub-check
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[9px]">Appt Date:</span>
                              <span className="font-mono font-semibold text-[11px]">{currentRow.lms?.police_ashara_appointment_date || "—"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">Status:</span>
                              <span className="font-semibold text-[11px]">{currentRow.lms?.police_ashara_status || "Pending"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Field 5: LMIS Actions */}
                <div className="px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400">
                    {canEditLmis ? "Authorized" : "Read-only"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEditLmis && lmsStepName && (
                      <>
                        {currentRow.lms?.status === "Pending" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await startClearanceStepV2(lmsStepName);
                                toast.success("LMIS clearance step started");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2.5 text-xs bg-blue-700 hover:bg-blue-800 text-white"
                          >
                            Start LMIS
                          </Button>
                        )}
                        {currentRow.lms?.status === "In Progress" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await completeClearanceStepV2(
                                  lmsStepName,
                                  currentRow.laborId || undefined,
                                  undefined,
                                  lmisIssueDate || new Date().toISOString().slice(0, 10)
                                );
                                toast.success("LMIS clearance completed");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                          >
                            Complete / Issue
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLmisReasons([]);
                            setIsLmisRejectOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          Reject
                        </Button>
                        <UndoLastStepButton
                          doctype="Clearance Step"
                          name={lmsStepName}
                          onSuccess={refreshAll}
                          size="sm"
                          className="h-6.5 sm:h-7 text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* CARD 2: TE'SHIR / INJAZ (Top-Right)                         */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="px-3.5 py-1.5 sm:py-2 border-b border-slate-100 dark:border-[#202028] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                        <CreditCard className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        TE&apos;SHIR / INJAZ
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-800 dark:text-indigo-300 bg-indigo-50/50 py-0 h-4.5">
                      {currentRow.teshirStatus || "Pending"}
                    </Badge>
                  </div>

                  {/* Card Body - 2-Column Grid */}
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: E-number (Injaz Application No.) */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          E-number (Injaz Application No.)
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-mono font-bold text-slate-900 dark:text-white">
                          <span className="truncate">{currentRow.injazApplicationId || currentRow.injaz?.injaz_application_id || "—"}</span>
                          {canEditTaeshir && (
                            <button
                              type="button"
                              onClick={() => {
                                setDirectApptDate(currentRow.appointmentDate || new Date().toISOString().split("T")[0]);
                                setDirectInjazId(currentRow.injazApplicationId || "");
                                setIsTaeshirApptOpen(true);
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0 ml-1"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field 2: Appointment Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Appointment Date
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-mono font-medium text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{currentRow.appointmentDate || currentRow.teshirAppointmentDate || currentRow.injaz?.appointment_date || "—"}</span>
                          {canEditTaeshir && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewTaeshirDate("");
                                setTaeshirRescheduleReason("");
                                setIsTaeshirRescheduleOpen(true);
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0 ml-1"
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field 3: Te'shir Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Status
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-semibold text-slate-800 dark:text-zinc-200">
                          {currentRow.teshirStatus || "INFORMED"}
                        </div>
                      </div>

                      {/* Field 4: Injaz Payment (Unpaid, Printed, Paid) */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Injaz Payment
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between">
                          <Badge
                            variant={isInjazPaid ? "success" : currentRow.injazPayment === "Printed" ? "outline" : "warning"}
                            className="text-[10px] font-bold py-0 h-4.5"
                          >
                            {currentRow.injazPayment || "Unpaid"}
                          </Badge>
                          {canEditTaeshir && !isInjazPaid && injazStepName && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await recordInjazPaymentV2(injazStepName, "Paid");
                                  toast.success("Injaz payment marked as Paid");
                                  setCurrentRow((prev) => (prev ? { ...prev, injazPayment: "Paid" } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field 5: Te'shir Completed? */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Completed?
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center">
                          <Badge
                            variant={isTeshirCompleted ? "success" : "outline"}
                            className="text-[10px] font-bold py-0 h-4.5"
                          >
                            {isTeshirCompleted ? "Completed" : "In Progress"}
                          </Badge>
                        </div>
                      </div>

                      {/* Sponsor & Foreign Agency context */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Agency / Sponsor
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center truncate text-slate-700 dark:text-zinc-300">
                          {currentRow.agencyName || currentRow.sponsorName || "—"}
                        </div>
                      </div>

                      {/* Field 6: Te'shir Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Remark
                        </Label>
                        <Input
                          value={teshirRemarkVal}
                          onChange={(e) => setTeshirRemarkVal(e.target.value)}
                          placeholder="Appointment or biometric remarks..."
                          disabled={!canEditTaeshir}
                          className="h-7 sm:h-7.5 text-xs px-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 7: Te'shir Actions */}
                <div className="px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const candidateData: InjazCandidateData = {
                          fullName: currentRow.fullName || "",
                          passportNumber: currentRow.passportNumber || "",
                          sponsorName: currentRow.sponsorName || "",
                          sponsorId: currentRow.sponsorId || "",
                          visaNumber: currentRow.visaNumber || "",
                          injazNumber: currentRow.injazApplicationId || "",
                          targetJob: currentRow.jobApplied || "House worker",
                          nationality: (currentRow.applicant as any)?.nationality || "Ethiopian",
                          photoUrl: (currentRow.applicant as any)?.photo_passport || "",
                          destinationCountry: destinationCountry,
                        };
                        await downloadInjazDocumentPDF(candidateData);
                      }}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700"
                    >
                      <FileDown className="h-3 w-3 text-indigo-600" />
                      Injaz PDF
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEditTaeshir && injazStepName && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setDirectApptDate(currentRow.appointmentDate || new Date().toISOString().split("T")[0]);
                            setDirectInjazId(currentRow.injazApplicationId || "");
                            setIsTaeshirApptOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs bg-indigo-700 hover:bg-indigo-800 text-white"
                        >
                          Set Appt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewTaeshirDate("");
                            setTaeshirRescheduleReason("");
                            setIsTaeshirRescheduleOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        >
                          Reschedule
                        </Button>
                        {!isTeshirCompleted && (
                          <Button
                            size="sm"
                            disabled={!isInjazPaid}
                            onClick={async () => {
                              try {
                                await completeClearanceStepV2(injazStepName);
                                toast.success("Te'shir clearance completed");
                                setCurrentRow((prev) => (prev ? { ...prev, teshirStatus: "Completed" } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                            title={!isInjazPaid ? "Injaz payment must be Paid before completion" : "Complete Te'shir"}
                          >
                            Complete
                          </Button>
                        )}
                        <UndoLastStepButton
                          doctype="Clearance Step"
                          name={injazStepName}
                          onSuccess={refreshAll}
                          size="sm"
                          className="h-6.5 sm:h-7 text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* CARD 3: EMBASSY / WAKALA (Bottom-Left)                      */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Card Header */}
                  <div className="px-3.5 py-1.5 sm:py-2 border-b border-slate-100 dark:border-[#202028] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        EMBASSY / WAKALA
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-teal-300 text-teal-800 dark:text-teal-300 bg-teal-50/50 py-0 h-4.5">
                      {currentRow.embassyStatus || "Pending"}
                    </Badge>
                  </div>

                  {/* Stage Lock Notice Banner */}
                  {isEmbassyLocked && (
                    <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                      <Lock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Stage Locked: Inaccessible until LMIS is Issued and Te&apos;shir is Completed.</span>
                    </div>
                  )}

                  {/* Card Body - 2-Column Grid */}
                  <div className={cn("p-2.5 sm:p-3 space-y-2", isEmbassyLocked && "opacity-60 pointer-events-none select-none")}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: Visa Number */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Visa Number
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-bold text-slate-900 dark:text-white">
                          <span className="truncate">{currentRow.visaNumber || currentRow.embassy?.visa_number || (currentRow.plc as any)?.visa_number || "—"}</span>
                        </div>
                      </div>

                      {/* Field 2: Wakala Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Wakala Status
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between">
                          <Badge
                            variant={currentRow.wakalaStatus?.toLowerCase() === "paid" || currentRow.wakalaStatus?.toLowerCase() === "authorized" ? "success" : "warning"}
                            className="text-[10px] font-bold py-0 h-4.5"
                          >
                            {currentRow.wakalaStatus || "Pending"}
                          </Badge>
                          {canEditEmbassy && !isEmbassyLocked && embassyStepName && currentRow.wakalaStatus?.toLowerCase() !== "paid" && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await recordWakalaPaymentV2(embassyStepName, "Paid");
                                  toast.success("Wakala status recorded as Paid");
                                  setCurrentRow((prev) => (prev ? { ...prev, wakalaStatus: "Paid" } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field 3: Submission Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Submission Date
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{currentRow.submissionDate || currentRow.embassy?.submission_date || "—"}</span>
                        </div>
                      </div>

                      {/* Field 4: Visa Issued On */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Visa Issued On
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{currentRow.visaIssueDate || currentRow.embassy?.visa_issue_date || (currentRow.plc as any)?.visa_issue_date || "—"}</span>
                        </div>
                      </div>

                      {/* Field 5: Visa Valid Until */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Visa Valid Until
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-mono text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{visaDeadline || "—"}</span>
                          {daysRemaining != null && (
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1 py-0.2 rounded shrink-0 ml-1",
                                daysRemaining > 15
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : daysRemaining > 0
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              )}
                            >
                              {daysRemaining > 0 ? `${daysRemaining}d` : "Expired"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Field 6: Embassy Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Embassy Status
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-semibold text-slate-800 dark:text-zinc-200">
                          {currentRow.embassyStatus || "Pending"}
                        </div>
                      </div>

                      {/* Field 7: Embassy Remarks (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Embassy Remarks
                        </Label>
                        <Input
                          value={embassyRemarkVal}
                          onChange={(e) => setEmbassyRemarkVal(e.target.value)}
                          placeholder="Submission, stamping, or feedback..."
                          disabled={!canEditEmbassy || isEmbassyLocked}
                          className="h-7 sm:h-7.5 text-xs px-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 8: Embassy Actions */}
                <div className={cn("px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5", isEmbassyLocked && "opacity-60 pointer-events-none select-none")}>
                  <span className="text-[10px] text-slate-400">
                    {canEditEmbassy ? "Authorized" : "Read-only"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEditEmbassy && embassyStepName && (
                      <>
                        {currentRow.embassyStatus !== "Submitted" && currentRow.embassyStatus !== "Stamped" && (
                          <Button
                            size="sm"
                            disabled={isEmbassyLocked}
                            onClick={async () => {
                              try {
                                await submitEmbassyStepV2(embassyStepName);
                                toast.success("Submitted to Embassy");
                                setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: "Submitted" } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                          >
                            Submit
                          </Button>
                        )}
                        {currentRow.embassyStatus !== "Stamped" && (
                          <Button
                            size="sm"
                            disabled={isEmbassyLocked}
                            onClick={() => {
                              setEmbassyVisaNumber(currentRow.visaNumber || "");
                              setEmbassyVisaIssueDate(new Date().toISOString().split("T")[0]);
                              const exp = new Date();
                              exp.setDate(exp.getDate() + 90);
                              setEmbassyVisaExpiryDate(exp.toISOString().split("T")[0]);
                              setIsEmbassyStampOpen(true);
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                          >
                            Stamp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isEmbassyLocked}
                          onClick={() => {
                            setEmbassyRejectRemark("");
                            setIsEmbassyRejectOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          Reject
                        </Button>
                        <UndoLastStepButton
                          doctype="Clearance Step"
                          name={embassyStepName}
                          onSuccess={refreshAll}
                          size="sm"
                          className="h-6.5 sm:h-7 text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* CARD 4: TICKET & DEPARTURE (Bottom-Right)                   */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Card Header */}
                  <div className="px-3.5 py-1.5 sm:py-2 border-b border-slate-100 dark:border-[#202028] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                        <Plane className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        TICKET & DEPARTURE
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-300 text-purple-800 dark:text-purple-300 bg-purple-50/50 py-0 h-4.5">
                      {currentRow.departureStatus || currentRow.stageStatus || "Pending"}
                    </Badge>
                  </div>

                  {/* Stage Lock Notice Banner */}
                  {isTicketLocked && (
                    <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                      <Lock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Stage Locked: Inaccessible until Embassy Visa is Stamped.</span>
                    </div>
                  )}

                  {/* Card Body - 2-Column Grid */}
                  <div className={cn("p-2.5 sm:p-3 space-y-2", isTicketLocked && "opacity-60 pointer-events-none select-none")}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: Ticket Number */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Ticket Number
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-mono font-bold text-slate-900 dark:text-white">
                          <span className="truncate">{currentRow.ticketNumber || (currentRow.plc as any)?.ticket_number || "—"}</span>
                          {canEditDeparture && !isTicketLocked && placementName && (
                            <button
                              type="button"
                              onClick={() => {
                                setTicketNumber(currentRow.ticketNumber || "");
                                setAirline((currentRow.plc as any)?.airline || "Ethiopian Airlines");
                                setFlightDate(currentRow.flightDate || new Date().toISOString().split("T")[0]);
                                setFlightTime(currentRow.flightTime || "10:00");
                                setIsTicketFormOpen(true);
                              }}
                              className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold hover:underline shrink-0 ml-1"
                            >
                              {currentRow.ticketNumber ? "Update" : "Record"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field 2: Flight Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Flight Date
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{currentRow.flightDate || (currentRow.plc as any)?.flight_date || "—"}</span>
                        </div>
                      </div>

                      {/* Field 3: Flight Time */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Flight Time
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                          <span className="truncate">{currentRow.flightTime || (currentRow.plc as any)?.flight_time || "10:00"}</span>
                        </div>
                      </div>

                      {/* Field 4: Medical 2 Result */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Medical 2 Result
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between">
                          <Badge
                            variant={currentRow.medical2Status === "FIT" ? "success" : currentRow.medical2Status === "UNFIT" ? "destructive" : "warning"}
                            className="text-[10px] font-bold py-0 h-4.5"
                          >
                            {currentRow.medical2Status || "Pending"}
                          </Badge>
                          {canEditMedical && !isTicketLocked && placementName && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await recordPredepartureMedicalResultV2(placementName, "FIT");
                                    toast.success("Medical 2 set to FIT");
                                    setCurrentRow((prev) => (prev ? { ...prev, medical2Status: "FIT" } : null));
                                    refreshAll();
                                  } catch (err) {
                                    toast.error(formatCleanErrorMessage(err));
                                  }
                                }}
                                className="text-[10px] text-emerald-700 font-bold hover:underline"
                              >
                                FIT
                              </button>
                              <span>/</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await recordPredepartureMedicalResultV2(placementName, "UNFIT");
                                    toast.success("Medical 2 set to UNFIT (Held)");
                                    setCurrentRow((prev) => (prev ? { ...prev, medical2Status: "UNFIT" } : null));
                                    refreshAll();
                                  } catch (err) {
                                    toast.error(formatCleanErrorMessage(err));
                                  }
                                }}
                                className="text-[10px] text-rose-700 font-bold hover:underline"
                              >
                                UNFIT
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Field 5: Departure Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Departure Status
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center">
                          <Badge
                            variant={currentRow.departureStatus === "Departed" ? "success" : "warning"}
                            className="text-[10px] font-bold py-0 h-4.5"
                          >
                            {currentRow.departureStatus || "Pending"}
                          </Badge>
                        </div>
                      </div>

                      {/* Carrier / Airline */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Airline Carrier
                        </Label>
                        <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center text-slate-800 dark:text-zinc-200 font-medium">
                          <span className="truncate">{(currentRow.plc as any)?.airline || "Ethiopian Airlines"}</span>
                        </div>
                      </div>

                      {/* Field 6: Ticket Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Ticket Remark
                        </Label>
                        <Input
                          value={ticketRemarkVal}
                          onChange={(e) => setTicketRemarkVal(e.target.value)}
                          placeholder="Ticketing details, flight notes, or outcome..."
                          disabled={!canEditDeparture || isTicketLocked}
                          className="h-7 sm:h-7.5 text-xs px-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 7: Ticket Actions */}
                <div className={cn("px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5", isTicketLocked && "opacity-60 pointer-events-none select-none")}>
                  <span className="text-[10px] text-slate-400">
                    {canEditDeparture ? "Authorized" : "Read-only"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEditDeparture && placementName && (
                      <>
                        <Button
                          size="sm"
                          disabled={isTicketLocked}
                          onClick={() => {
                            setTicketNumber(currentRow.ticketNumber || "");
                            setAirline((currentRow.plc as any)?.airline || "Ethiopian Airlines");
                            setFlightDate(currentRow.flightDate || new Date().toISOString().split("T")[0]);
                            setFlightTime(currentRow.flightTime || "10:00");
                            setIsTicketFormOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs bg-purple-700 hover:bg-purple-800 text-white"
                        >
                          Record Ticket
                        </Button>
                        {currentRow.ticketNumber && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isTicketLocked}
                            onClick={() => {
                              setNewFlightDate("");
                              setNewFlightTime("10:00");
                              setFlightRescheduleReason("");
                              setIsFlightRescheduleOpen(true);
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs border-slate-300 dark:border-zinc-700"
                          >
                            Reschedule
                          </Button>
                        )}
                        {currentRow.stageStatus === "Ticketed" && currentRow.medical2Status === "FIT" && (
                          <Button
                            size="sm"
                            disabled={isTicketLocked}
                            onClick={() => {
                              setSelectedFlightOutcome("Departed");
                              setDepartureRemark("");
                              setIsConfirmDepartOpen(true);
                            }}
                            className="h-6.5 sm:h-7 px-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                          >
                            Record Departure
                          </Button>
                        )}
                        <UndoLastStepButton
                          doctype="Placement"
                          name={placementName}
                          onSuccess={refreshAll}
                          size="sm"
                          className="h-6.5 sm:h-7 text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ============================================================= */}
          {/* FOOTER BAR                                                    */}
          {/* ============================================================= */}
          <div className="mt-auto px-3.5 py-1 sm:py-1.5 border-t border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] flex items-center justify-between text-[11px]">
            <span className="text-slate-400 truncate">
              Four-stage operational follow-up workspace • Direct backend synchronization.
            </span>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-6.5 sm:h-7 px-2.5 border-slate-300 dark:border-zinc-700 gap-1 shrink-0 ml-2"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Return to Follow-Up Tracking</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* OPERATIONAL DIALOGS                                           */}
      {/* ============================================================= */}

      {/* 1. LMIS Rejection Reasons Dialog */}
      <Dialog open={isLmisRejectOpen} onOpenChange={setIsLmisRejectOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 dark:text-rose-400">
              Select LMIS Rejection Reason(s)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Backend state machine requires at least one official reason when setting LMIS status to REJECTED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-2">
              {LMIS_REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-[#1a1a22] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLmisReasons.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLmisReasons((prev) => [...prev, reason]);
                      } else {
                        setSelectedLmisReasons((prev) => prev.filter((r) => r !== reason));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-zinc-200">{reason}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsLmisRejectOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedLmisReasons.length === 0}
              onClick={async () => {
                if (!lmsStepName) return;
                try {
                  await setLmisStatusV2(lmsStepName, "REJECTED", selectedLmisReasons);
                  toast.success("LMIS status set to REJECTED");
                  setIsLmisRejectOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          lmisStatus: "REJECTED",
                          lmisRejectionReasons: selectedLmisReasons.join(", "),
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Taeshir Direct Appointment & Injaz ID Dialog */}
      <Dialog open={isTaeshirApptOpen} onOpenChange={setIsTaeshirApptOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Set Taeshir Appointment & Injaz ID
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registers biometric appointment date and Injaz application E-number on the clearance step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Appointment Date *</Label>
              <Input
                type="date"
                value={directApptDate}
                onChange={(e) => setDirectApptDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Injaz Application ID (E-number) *</Label>
              <Input
                type="text"
                value={directInjazId}
                onChange={(e) => setDirectInjazId(e.target.value)}
                placeholder="e.g. E12345678"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTaeshirApptOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!directApptDate}
              onClick={async () => {
                if (!injazStepName) return;
                try {
                  await setTaeshirAppointmentV2(injazStepName, directApptDate, directInjazId);
                  const candidateId = currentRow?.applicantId || currentRow?.name;
                  if (directInjazId && candidateId) {
                    try {
                      await updateApplicantV2(candidateId, { application_number: directInjazId.trim() });
                    } catch (e) {
                      console.warn("Failed to sync application_number to applicant:", e);
                    }
                  }
                  toast.success("Taeshir appointment saved");
                  setIsTaeshirApptOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          appointmentDate: directApptDate,
                          injazApplicationId: directInjazId,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Taeshir Reschedule Dialog */}
      <Dialog open={isTaeshirRescheduleOpen} onOpenChange={setIsTaeshirRescheduleOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reschedule Taeshir Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reschedules the biometric appointment without forfeiting existing Injaz payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">New Appointment Date *</Label>
              <Input
                type="date"
                value={newTaeshirDate}
                onChange={(e) => setNewTaeshirDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reschedule Reason</Label>
              <Input
                type="text"
                value={taeshirRescheduleReason}
                onChange={(e) => setTaeshirRescheduleReason(e.target.value)}
                placeholder="e.g. Candidate medical delay"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTaeshirRescheduleOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newTaeshirDate}
              onClick={async () => {
                if (!injazStepName) return;
                try {
                  await rescheduleTaeshirAppointmentV2(injazStepName, newTaeshirDate, taeshirRescheduleReason);
                  toast.success("Appointment rescheduled");
                  setIsTaeshirRescheduleOpen(false);
                  setCurrentRow((prev) => (prev ? { ...prev, appointmentDate: newTaeshirDate } : null));
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Embassy Stamp Visa Dialog */}
      <Dialog open={isEmbassyStampOpen} onOpenChange={setIsEmbassyStampOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-teal-700 dark:text-teal-400">
              Stamp Embassy Visa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Marks visa as officially stamped and records issuance and expiry dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Visa Number *</Label>
              <Input
                type="text"
                value={embassyVisaNumber}
                onChange={(e) => setEmbassyVisaNumber(e.target.value)}
                placeholder="e.g. 1300892341"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Issue Date *</Label>
                <Input
                  type="date"
                  value={embassyVisaIssueDate}
                  onChange={(e) => setEmbassyVisaIssueDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expiry Date *</Label>
                <Input
                  type="date"
                  value={embassyVisaExpiryDate}
                  onChange={(e) => setEmbassyVisaExpiryDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEmbassyStampOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!embassyVisaNumber}
              onClick={async () => {
                if (!embassyStepName) return;
                try {
                  await stampEmbassyStepV2(embassyStepName, embassyVisaNumber);
                  if (placementName) {
                    await uploadPlacementVisaV2(
                      placementName,
                      "",
                      embassyVisaNumber,
                      embassyVisaIssueDate,
                      embassyVisaExpiryDate
                    );
                  }
                  toast.success("Embassy visa stamped successfully");
                  setIsEmbassyStampOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          embassyStatus: "Stamped",
                          visaNumber: embassyVisaNumber,
                          visaIssueDate: embassyVisaIssueDate,
                          visaDeadline: embassyVisaExpiryDate,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-teal-700 hover:bg-teal-800 text-white"
            >
              Confirm Stamped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Embassy Reject Dialog */}
      <Dialog open={isEmbassyRejectOpen} onOpenChange={setIsEmbassyRejectOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 dark:text-rose-400">
              Reject Embassy Clearance Step
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Records official embassy rejection with mandatory audit reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rejection Reason *</Label>
              <Textarea
                value={embassyRejectRemark}
                onChange={(e) => setEmbassyRejectRemark(e.target.value)}
                placeholder="State the official reason given by the Embassy..."
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEmbassyRejectOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!embassyRejectRemark.trim()}
              onClick={async () => {
                if (!embassyStepName) return;
                try {
                  await rejectEmbassyStepV2(embassyStepName, embassyRejectRemark.trim());
                  toast.success("Embassy step marked as Rejected");
                  setIsEmbassyRejectOpen(false);
                  setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: "Rejected" } : null));
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Ticketing Form Dialog */}
      <Dialog open={isTicketFormOpen} onOpenChange={setIsTicketFormOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-700 dark:text-purple-400">
              Record Flight Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Issues flight booking details, transitioning candidate to Ticketed stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ticket Number *</Label>
              <Input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="e.g. ET-998231"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Airline Carrier *</Label>
              <Input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="e.g. Ethiopian Airlines"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Flight Date *</Label>
                <Input
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Departure Time</Label>
                <Input
                  type="time"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTicketFormOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!ticketNumber || !flightDate}
              onClick={async () => {
                if (!placementName) return;
                try {
                  await recordTicketDetailsV2(placementName, ticketNumber, flightDate);
                  toast.success("Flight ticket recorded successfully");
                  setIsTicketFormOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          ticketNumber,
                          flightDate,
                          flightTime,
                          stageStatus: "Ticketed",
                          departureStatus: "Ticketed",
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-purple-700 hover:bg-purple-800 text-white"
            >
              Issue Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Flight Reschedule Dialog */}
      <Dialog open={isFlightRescheduleOpen} onOpenChange={setIsFlightRescheduleOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reschedule Flight
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Updates departure date and time for an already ticketed candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Flight Date *</Label>
                <Input
                  type="date"
                  value={newFlightDate}
                  onChange={(e) => setNewFlightDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Flight Time</Label>
                <Input
                  type="time"
                  value={newFlightTime}
                  onChange={(e) => setNewFlightTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reschedule Reason</Label>
              <Input
                type="text"
                value={flightRescheduleReason}
                onChange={(e) => setFlightRescheduleReason(e.target.value)}
                placeholder="e.g. Airline schedule adjustment"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsFlightRescheduleOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newFlightDate}
              onClick={async () => {
                if (!placementName) return;
                try {
                  await recordRescheduleV2(placementName, newFlightDate, "Airport");
                  toast.success("Flight rescheduled successfully");
                  setIsFlightRescheduleOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          flightDate: newFlightDate,
                          flightTime: newFlightTime,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-purple-700 hover:bg-purple-800 text-white"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Confirm Departure / Outcome Dialog */}
      <Dialog open={isConfirmDepartOpen} onOpenChange={setIsConfirmDepartOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-700 dark:text-purple-400">
              Record Candidate Flight Outcome
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Finalizes departure status or records return outcome for candidate lifecycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Departure Outcome *</Label>
              <select
                value={selectedFlightOutcome}
                onChange={(e) => setSelectedFlightOutcome(e.target.value)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#16161d] font-bold"
              >
                {DEPARTURE_OUTCOMES.map((out) => (
                  <option key={out} value={out}>
                    {out}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Audit Remark</Label>
              <Input
                type="text"
                value={departureRemark}
                onChange={(e) => setDepartureRemark(e.target.value)}
                placeholder="Flight departure notes..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmDepartOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!placementName) return;
                try {
                  await advancePlacementV2(placementName, selectedFlightOutcome as any);
                  toast.success(`Candidate marked as ${selectedFlightOutcome}!`);
                  setIsConfirmDepartOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          stageStatus: selectedFlightOutcome === "Departed" ? "Departed" : prev.stageStatus,
                          departureStatus: selectedFlightOutcome,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-purple-700 hover:bg-purple-800 text-white"
            >
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
