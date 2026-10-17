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
  setTaeshirStatusV2,
  setTaeshirAppointmentV2,
  rescheduleTaeshirAppointmentV2,
  recordInjazPaymentV2,
  recordWakalaPaymentV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  renderInjazPdfV2,
  setStepRemarksV2,
  undoForfeitInjazV2,
  forfeitInjazAndRestartV2,
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
  setTicketingRemarksV2,
  recordFlightOutcomeV2,
} from "@/lib/api/v2/placements";
import { renderCvPdfV2 } from "@/lib/api/v2/cv";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
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

  const canEditLmis = isAdmin || hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS"]) || hasRoleKeyword(["lms", "lmis"]);
  const canEditTaeshir = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign"]) || hasRoleKeyword(["taeshir", "teshir", "injaz", "telesign"]);
  const canEditEmbassy = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy"]) || hasRoleKeyword(["embassy"]);
  const canEditDeparture = isAdmin || hasAnyV2Role(authUserV2, ["Ticketer"]) || hasRoleKeyword(["ticket", "ticketer"]);
  const canEditMedical = isAdmin || hasRoleKeyword(["medical"]) || canEditDeparture;

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

  // Editable Labor ID
  const [laborIdVal, setLaborIdVal] = React.useState("");

  // Te'shir direct editable fields
  const [teshirInjazIdVal, setTeshirInjazIdVal] = React.useState("");
  const [teshirApptDateVal, setTeshirApptDateVal] = React.useState("");

  // Embassy direct editable fields
  const [embassyVisaNumberVal, setEmbassyVisaNumberVal] = React.useState("");
  const [embassySubmissionDateVal, setEmbassySubmissionDateVal] = React.useState("");
  const [embassyVisaIssueDateVal, setEmbassyVisaIssueDateVal] = React.useState("");
  const [embassyVisaExpiryDateVal, setEmbassyVisaExpiryDateVal] = React.useState("");

  // Ticket & Departure direct editable fields
  const [ticketNumberVal, setTicketNumberVal] = React.useState("");
  const [flightDateVal, setFlightDateVal] = React.useState("");
  const [flightTimeVal, setFlightTimeVal] = React.useState("10:00");
  const [airlineVal, setAirlineVal] = React.useState("Ethiopian Airlines");

  React.useEffect(() => {
    if (currentRow) {
      setLmisRemarkVal(currentRow.lmisRemark || currentRow.lms?.remarks || "");
      setTeshirRemarkVal(currentRow.teshirRemark || currentRow.injaz?.remarks || "");
      setEmbassyRemarkVal(currentRow.embassyRemarks || currentRow.embassy?.remarks || "");
      setTicketRemarkVal(currentRow.ticketRemark || (currentRow.plc as any)?.remarks || "");
      const d = currentRow.issueDate || currentRow.lms?.date_completed || "";
      setLmisIssueDate(d && d !== "—" ? d : "");
      setLaborIdVal(currentRow.laborId || (currentRow.applicant as any)?.labor_id || "");

      // Te'shir direct fields
      setTeshirInjazIdVal(currentRow.injazApplicationId || currentRow.injaz?.injaz_application_id || "");
      setTeshirApptDateVal(currentRow.appointmentDate || currentRow.teshirAppointmentDate || currentRow.injaz?.appointment_date || "");

      // Embassy direct fields
      setEmbassyVisaNumberVal(currentRow.visaNumber || currentRow.embassy?.visa_number || (currentRow.plc as any)?.visa_number || "");
      setEmbassySubmissionDateVal(currentRow.submissionDate || currentRow.embassy?.submission_date || "");
      setEmbassyVisaIssueDateVal(currentRow.visaIssueDate || currentRow.embassy?.visa_issue_date || (currentRow.plc as any)?.visa_issue_date || "");
      const expDate = currentRow.visaDeadline || currentRow.embassy?.visa_valid_until || (currentRow.plc as any)?.visa_deadline || "";
      setEmbassyVisaExpiryDateVal(expDate && expDate !== "—" ? expDate : "");

      // Ticket direct fields
      setTicketNumberVal(currentRow.ticketNumber || (currentRow.plc as any)?.ticket_number || "");
      setFlightDateVal(currentRow.flightDate || (currentRow.plc as any)?.flight_date || "");
      setFlightTimeVal(currentRow.flightTime || (currentRow.plc as any)?.flight_time || "10:00");
      setAirlineVal((currentRow.plc as any)?.airline || "Ethiopian Airlines");
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

  const handleDownloadOfficialInjazPdf = async (stepOrPlacementName: string) => {
    try {
      toast.info("Downloading official Injaz PDF...");
      const blob = await renderInjazPdfV2(stepOrPlacementName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (currentRow?.fullName || "Candidate").replace(/[^a-zA-Z0-9]/g, "_");
      const safePass = currentRow?.passportNumber || "Passport";
      const fallbackFilename = `Injaz_${safeName}_${safePass}.pdf`;
      a.download = (blob as any).filename || fallbackFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Official Injaz PDF downloaded successfully!");
    } catch (err: any) {
      toast.error(formatCleanErrorMessage(err));
    }
  };

  const handleDownloadCvPdf = async () => {
    if (!currentRow?.applicantId) return;
    try {
      toast.info("Downloading candidate CV PDF...");
      const blob = await renderCvPdfV2(currentRow.applicantId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_${currentRow.passportNumber || currentRow.applicantId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Candidate CV downloaded successfully!");
    } catch {
      window.open(`/applicants/${currentRow.applicantId}/cv`, "_blank");
    }
  };

  const handleSendToExtension = async () => {
    if (!currentRow) return;
    try {
      const res = await sendApplicantToExtension(currentRow.applicant || (currentRow as any));
      if (res?.success) {
        toast.success(`${currentRow.fullName} loaded into Extension!`);
      } else {
        toast.info(`Candidate dispatched to Extension (${currentRow.applicantId})`);
      }
    } catch (err: any) {
      toast.error("Failed to send candidate to extension", {
        description: formatCleanErrorMessage(err),
      });
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
                    {currentRow.lmisStatus === "ISSUED" ? (
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d] py-0 h-4.5 px-2">
                        ISSUED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-50/50 py-0 h-4.5 px-2">
                        {currentRow.lmisStatus || "Pending"}
                      </Badge>
                    )}
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
                                if (val === "ISSUED") {
                                  await setLmisStatusV2(
                                    lmsStepName,
                                    "ISSUED",
                                    undefined,
                                    laborIdVal || currentRow.laborId || undefined,
                                    lmisIssueDate || new Date().toISOString().slice(0, 10)
                                  );
                                  toast.success("LMIS clearance issued successfully");
                                } else {
                                  await setLmisStatusV2(lmsStepName, val);
                                  toast.success(`LMIS status updated to ${val}`);
                                }
                                setCurrentRow((prev) => (prev ? { ...prev, lmisStatus: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold",
                              currentRow.lmisStatus === "ISSUED"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                                : "bg-white dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}
                          >
                            {LMIS_WORKING_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st === "ISSUED" ? "✓ ISSUED" : st}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            currentRow.lmisStatus === "ISSUED"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{currentRow.lmisStatus === "ISSUED" ? "✓ ISSUED" : (currentRow.lmisStatus || "Pending")}</span>
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
                                    laborIdVal || currentRow.laborId || undefined,
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
                        {canEditLmis && (currentRow.applicantId || currentRow.name) ? (
                          <Input
                            type="text"
                            value={laborIdVal}
                            onChange={(e) => setLaborIdVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              const currentVal = (currentRow.laborId || (currentRow.applicant as any)?.labor_id || "").trim();
                              if (val !== currentVal) {
                                try {
                                  const applicantIdentifier = currentRow.applicantId || currentRow.name;
                                  await updateApplicantForLmisV2({
                                    applicant_name: applicantIdentifier,
                                    labor_id: val || undefined,
                                  });
                                  toast.success("Labor ID updated successfully");
                                  setCurrentRow((prev) => (prev ? { ...prev, laborId: val } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Enter Labor ID"
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono font-medium"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-medium text-slate-800 dark:text-zinc-200">
                            {laborIdVal || currentRow.laborId || (currentRow.applicant as any)?.labor_id || "—"}
                          </div>
                        )}
                      </div>

                      {/* Field 4: LMIS Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          LMIS Remark
                        </Label>
                        <Input
                          value={lmisRemarkVal}
                          onChange={(e) => setLmisRemarkVal(e.target.value)}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== (currentRow.lms?.remarks || currentRow.lmisRemark || "") && lmsStepName) {
                              try {
                                await setStepRemarksV2(lmsStepName, val);
                                toast.success("LMIS step remark saved");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }
                          }}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* CV / Dossier PDF Download */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCvPdf}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Download Candidate CV PDF"
                    >
                      <FileDown className="h-3 w-3 text-emerald-600" />
                      <span>CV</span>
                    </Button>

                    {/* Dispatch to Extension */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendToExtension}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Send Candidate details to Browser Extension"
                    >
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Extension</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canEditLmis && lmsStepName && (
                      <>
                        {/* Direct Issue Button */}
                        {currentRow.lmisStatus !== "ISSUED" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await setLmisStatusV2(
                                  lmsStepName,
                                  "ISSUED",
                                  undefined,
                                  laborIdVal || currentRow.laborId,
                                  new Date().toISOString().split("T")[0]
                                );
                                toast.success("LMIS issued successfully");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            title="Mark LMIS as ISSUED"
                          >
                            Issue
                          </Button>
                        )}

                        {/* Start LMIS button */}
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
                            className="h-6.5 sm:h-7 px-2.5 text-xs bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                          >
                            Start LMIS
                          </Button>
                        )}

                        {/* Reject button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLmisReasons([]);
                            setIsLmisRejectOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          Reject
                        </Button>

                        {/* Undo Step button */}
                        <UndoLastStepButton
                          doctype={
                            (!currentRow.lmisStatus || currentRow.lmisStatus === "Pending") &&
                            (!currentRow.lms?.status || currentRow.lms?.status === "Pending")
                              ? "Placement"
                              : "Clearance Step"
                          }
                          name={
                            (!currentRow.lmisStatus || currentRow.lmisStatus === "Pending") &&
                            (!currentRow.lms?.status || currentRow.lms?.status === "Pending")
                              ? (placementName || lmsStepName)
                              : lmsStepName
                          }
                          askOnClick
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
                    {(currentRow.teshirStatus === "Completed" || isTeshirCompleted) ? (
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d] py-0 h-4.5 px-2">
                        COMPLETED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-800 dark:text-indigo-300 bg-indigo-50/50 py-0 h-4.5 px-2">
                        {currentRow.teshirStatus || "Pending"}
                      </Badge>
                    )}
                  </div>

                  {/* Card Body - 2-Column Grid */}
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: E-number (Injaz Application No.) */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          E-number (Injaz Application No.)
                        </Label>
                        {canEditTaeshir && injazStepName ? (
                          <Input
                            type="text"
                            value={teshirInjazIdVal}
                            onChange={(e) => setTeshirInjazIdVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value.trim().toUpperCase();
                              if (val !== (currentRow.injazApplicationId || "")) {
                                try {
                                  await setTaeshirAppointmentV2(
                                    injazStepName,
                                    teshirApptDateVal || (currentRow.appointmentDate || ""),
                                    val
                                  );
                                  const candidateId = currentRow?.applicantId || currentRow?.name;
                                  if (val && candidateId) {
                                    try {
                                      await updateApplicantV2(candidateId, { application_number: val });
                                    } catch (err) {
                                      console.warn("Failed to sync application_number:", err);
                                    }
                                  }
                                  toast.success("E-number saved");
                                  setCurrentRow((prev) => prev ? { ...prev, injazApplicationId: val } : null);
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            placeholder="e.g. E12345678"
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono uppercase font-bold"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-bold text-slate-900 dark:text-white">
                            <span className="truncate">{teshirInjazIdVal || currentRow.injazApplicationId || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 2: Appointment Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Appointment Date
                        </Label>
                        {canEditTaeshir && injazStepName ? (
                          <Input
                            type="date"
                            value={teshirApptDateVal}
                            onChange={(e) => setTeshirApptDateVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.appointmentDate || "")) {
                                try {
                                  await setTaeshirAppointmentV2(
                                    injazStepName,
                                    val,
                                    teshirInjazIdVal || (currentRow.injazApplicationId || "")
                                  );
                                  toast.success("Appointment date saved");
                                  setCurrentRow((prev) => prev ? { ...prev, appointmentDate: val } : null);
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono font-medium"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-medium text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{teshirApptDateVal || currentRow.appointmentDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 3: Te'shir Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Status
                        </Label>
                        {canEditTaeshir && injazStepName ? (
                          <select
                            value={isTeshirCompleted ? "Completed" : (currentRow.teshirStatus || "INFORMED")}
                            onChange={async (e) => {
                              const val = e.target.value;
                              try {
                                if (val === "Completed") {
                                  if (!isInjazPaid) {
                                    toast.error("Injaz payment must be marked Paid before completing Te'shir.");
                                    return;
                                  }
                                  await completeClearanceStepV2(injazStepName);
                                  toast.success("Te'shir clearance completed");
                                  setCurrentRow((prev) => (prev ? { ...prev, teshirStatus: "Completed" } : null));
                                } else {
                                  await setTaeshirStatusV2(injazStepName, val);
                                  toast.success(`Te'shir status updated to ${val}`);
                                  setCurrentRow((prev) => (prev ? { ...prev, teshirStatus: val } : null));
                                }
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold",
                              (isTeshirCompleted || currentRow.teshirStatus === "Completed")
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                                : "bg-white dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}
                          >
                            <option value="INFORMED">INFORMED</option>
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="READY TO EMBASSY">READY TO EMBASSY</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            (isTeshirCompleted || currentRow.teshirStatus === "Completed")
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{(isTeshirCompleted || currentRow.teshirStatus === "Completed") ? "Completed" : (currentRow.teshirStatus || "INFORMED")}</span>
                            {!canEditTaeshir && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 4: Injaz Payment (Unpaid, Printed, Paid) Dropdown */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Injaz Payment
                        </Label>
                        {canEditTaeshir && injazStepName ? (
                          <select
                            value={currentRow.injazPayment || "Unpaid"}
                            onChange={async (e) => {
                              const val = e.target.value as "Paid" | "Unpaid" | "Printed";
                              try {
                                await recordInjazPaymentV2(injazStepName, val);
                                toast.success(`Injaz payment updated to ${val}`);
                                setCurrentRow((prev) => (prev ? { ...prev, injazPayment: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer",
                              isInjazPaid
                                ? "bg-white dark:bg-[#16161d] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                : currentRow.injazPayment === "Printed"
                                ? "bg-white dark:bg-[#16161d] text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                                : "bg-white dark:bg-[#16161d] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                            )}
                          >
                            <option value="Unpaid">Unpaid</option>
                            <option value="Printed">Printed</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between">
                            <Badge
                              variant={isInjazPaid ? "success" : currentRow.injazPayment === "Printed" ? "outline" : "warning"}
                              className="text-[10px] font-bold py-0 h-4.5"
                            >
                              {currentRow.injazPayment || "Unpaid"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Field 5: Te'shir Completed? Editable Dropdown */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Completed?
                        </Label>
                        {canEditTaeshir && injazStepName ? (
                          <select
                            value={isTeshirCompleted ? "Completed" : "In Progress"}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val === "Completed") {
                                if (!isInjazPaid) {
                                  toast.error("Injaz payment must be marked Paid before completing Te'shir.");
                                  return;
                                }
                                try {
                                  await completeClearanceStepV2(injazStepName);
                                  toast.success("Te'shir step completed successfully");
                                  setCurrentRow((prev) => (prev ? { ...prev, teshirStatus: "Completed" } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              } else {
                                toast.info("To revert a completed step, use the Undo button in the actions bar.");
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer",
                              isTeshirCompleted
                                ? "bg-white dark:bg-[#16161d] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                : "bg-white dark:bg-[#16161d] text-amber-700 dark:text-amber-400 border-slate-200 dark:border-zinc-700"
                            )}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold py-0 h-4.5",
                                isTeshirCompleted
                                  ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d]"
                                  : "border-amber-300 text-amber-700"
                              )}
                            >
                              {isTeshirCompleted ? "Completed" : "In Progress"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Field 6: Te'shir Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Te&apos;shir Remark
                        </Label>
                        <Input
                          value={teshirRemarkVal}
                          onChange={(e) => setTeshirRemarkVal(e.target.value)}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== (currentRow.injaz?.remarks || currentRow.teshirRemark || "") && injazStepName) {
                              try {
                                await setStepRemarksV2(injazStepName, val);
                                toast.success("Te'shir step remark saved");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }
                          }}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Official Backend Injaz PDF Download */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadOfficialInjazPdf(injazStepName || placementName || "")}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Download Official Injaz PDF"
                    >
                      <FileDown className="h-3 w-3 text-indigo-600" />
                      <span>Injaz PDF</span>
                    </Button>

                    {/* Dispatch to Extension */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendToExtension}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Send Candidate details to Browser Extension"
                    >
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Extension</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canEditTaeshir && injazStepName && (
                      <>
                        {/* Missed Appointment Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await forfeitInjazAndRestartV2(injazStepName);
                              toast.success("Appointment marked as Missed / Forfeited");
                              refreshAll();
                            } catch (err) {
                              toast.error(formatCleanErrorMessage(err));
                            }
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                          title="Mark appointment as Missed / Forfeited"
                        >
                          Missed
                        </Button>

                        {/* Undo Missed Button */}
                        {Boolean(
                          ((currentRow.injaz as any)?.injaz_previous_outcome === "Forfeited" ||
                            (currentRow.injaz as any)?.injaz_previous_outcome === "Missed") &&
                          ((currentRow.injaz as any)?.injaz_outcome === "Active" || !(currentRow.injaz as any)?.injaz_outcome) &&
                          ((currentRow.injaz as any)?.injaz_payment_status === "Unpaid" || !(currentRow.injaz as any)?.injaz_payment_status)
                        ) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await undoForfeitInjazV2(injazStepName);
                                toast.success("Missed appointment status undone successfully");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold cursor-pointer"
                            title="Undo missed appointment status"
                          >
                            Undo Missed
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewTaeshirDate("");
                            setTaeshirRescheduleReason("");
                            setIsTaeshirRescheduleOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold cursor-pointer"
                        >
                          Reschedule
                        </Button>
                        <UndoLastStepButton
                          doctype="Clearance Step"
                          name={injazStepName}
                          askOnClick
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
                    {currentRow.embassyStatus === "Stamped" ? (
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d] py-0 h-4.5 px-2">
                        STAMPED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold border-teal-300 text-teal-800 dark:text-teal-300 bg-teal-50/50 py-0 h-4.5 px-2">
                        {currentRow.embassyStatus || "Pending"}
                      </Badge>
                    )}
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
                        {canEditEmbassy && !isEmbassyLocked && placementName ? (
                          <Input
                            type="text"
                            value={embassyVisaNumberVal}
                            onChange={(e) => setEmbassyVisaNumberVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val && val !== (currentRow.visaNumber || "")) {
                                try {
                                  await uploadPlacementVisaV2(
                                    placementName,
                                    "",
                                    val,
                                    embassyVisaIssueDateVal || undefined,
                                    embassyVisaExpiryDateVal || undefined
                                  );
                                  toast.success("Visa number saved");
                                  setCurrentRow((prev) => prev ? { ...prev, visaNumber: val } : null);
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            placeholder="e.g. 1300892341"
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono font-bold"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-bold text-slate-900 dark:text-white">
                            <span className="truncate">{embassyVisaNumberVal || currentRow.visaNumber || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 2: Wakala Status Dropdown */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Wakala Status
                        </Label>
                        {canEditEmbassy && !isEmbassyLocked && embassyStepName ? (
                          <select
                            value={
                              currentRow.wakalaStatus?.toLowerCase() === "paid" ||
                              currentRow.wakalaStatus?.toLowerCase() === "authorized"
                                ? "Paid"
                                : "Pending"
                            }
                            onChange={async (e) => {
                              const val = e.target.value as "Paid" | "Pending";
                              try {
                                await recordWakalaPaymentV2(embassyStepName, val);
                                toast.success(`Wakala status recorded as ${val}`);
                                setCurrentRow((prev) => (prev ? { ...prev, wakalaStatus: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer",
                              (currentRow.wakalaStatus?.toLowerCase() === "paid" ||
                                currentRow.wakalaStatus?.toLowerCase() === "authorized")
                                ? "bg-white dark:bg-[#16161d] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                : "bg-white dark:bg-[#16161d] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between">
                            <Badge
                              variant={
                                currentRow.wakalaStatus?.toLowerCase() === "paid" ||
                                currentRow.wakalaStatus?.toLowerCase() === "authorized"
                                  ? "success"
                                  : "warning"
                              }
                              className="text-[10px] font-bold py-0 h-4.5"
                            >
                              {currentRow.wakalaStatus || "Pending"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Field 3: Submission Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Submission Date
                        </Label>
                        {canEditEmbassy && !isEmbassyLocked && embassyStepName ? (
                          <Input
                            type="date"
                            value={embassySubmissionDateVal}
                            onChange={(e) => setEmbassySubmissionDateVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.submissionDate || "")) {
                                try {
                                  await submitEmbassyStepV2(embassyStepName, undefined, val);
                                  toast.success("Submission date updated");
                                  setCurrentRow((prev) => prev ? { ...prev, submissionDate: val, embassyStatus: "Submitted" } : null);
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
                            <span className="truncate">{embassySubmissionDateVal || currentRow.submissionDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 4: Visa Issued On */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Visa Issued On
                        </Label>
                        {canEditEmbassy && !isEmbassyLocked && placementName ? (
                          <Input
                            type="date"
                            value={embassyVisaIssueDateVal}
                            onChange={(e) => setEmbassyVisaIssueDateVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.visaIssueDate || "")) {
                                try {
                                  await uploadPlacementVisaV2(
                                    placementName,
                                    "",
                                    embassyVisaNumberVal || currentRow.visaNumber || "",
                                    val,
                                    embassyVisaExpiryDateVal || undefined
                                  );
                                  toast.success("Visa issue date saved");
                                  setCurrentRow((prev) => prev ? { ...prev, visaIssueDate: val } : null);
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
                            <span className="truncate">{embassyVisaIssueDateVal || currentRow.visaIssueDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 5: Visa Valid Until */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Visa Valid Until
                        </Label>
                        {canEditEmbassy && !isEmbassyLocked && placementName ? (
                          <Input
                            type="date"
                            value={embassyVisaExpiryDateVal}
                            onChange={(e) => setEmbassyVisaExpiryDateVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (visaDeadline || "")) {
                                try {
                                  await uploadPlacementVisaV2(
                                    placementName,
                                    "",
                                    embassyVisaNumberVal || currentRow.visaNumber || "",
                                    embassyVisaIssueDateVal || currentRow.visaIssueDate || undefined,
                                    val
                                  );
                                  toast.success("Visa expiry date saved");
                                  setCurrentRow((prev) => prev ? { ...prev, visaDeadline: val } : null);
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center justify-between font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{embassyVisaExpiryDateVal || visaDeadline || "—"}</span>
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
                        )}
                      </div>

                      {/* Field 6: Embassy Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Embassy Status
                        </Label>
                        {canEditEmbassy && embassyStepName && !isEmbassyLocked ? (
                          <select
                            value={currentRow.embassyStatus || "Pending"}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val === "Stamped") {
                                setEmbassyVisaNumber(currentRow.visaNumber || "");
                                setEmbassyVisaIssueDate(new Date().toISOString().split("T")[0]);
                                const exp = new Date();
                                exp.setDate(exp.getDate() + 90);
                                setEmbassyVisaExpiryDate(exp.toISOString().split("T")[0]);
                                setIsEmbassyStampOpen(true);
                                return;
                              }
                              if (val === "Rejected") {
                                setEmbassyRejectRemark("");
                                setIsEmbassyRejectOpen(true);
                                return;
                              }
                              if (val === "Submitted") {
                                try {
                                  await submitEmbassyStepV2(embassyStepName);
                                  toast.success("Submitted to Embassy");
                                  setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: "Submitted" } : null));
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                                return;
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold",
                              currentRow.embassyStatus === "Stamped"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                                : "bg-white dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Stamped">Stamped</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            currentRow.embassyStatus === "Stamped"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{currentRow.embassyStatus === "Stamped" ? "Stamped" : (currentRow.embassyStatus || "Pending")}</span>
                            {(!canEditEmbassy || isEmbassyLocked) && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 7: Embassy Remarks (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Embassy Remarks
                        </Label>
                        <Input
                          value={embassyRemarkVal}
                          onChange={(e) => setEmbassyRemarkVal(e.target.value)}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== (currentRow.embassy?.remarks || currentRow.embassyRemarks || "") && embassyStepName) {
                              try {
                                await setStepRemarksV2(embassyStepName, val);
                                toast.success("Embassy step remark saved");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }
                          }}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Official Backend Injaz PDF Download */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadOfficialInjazPdf(embassyStepName || placementName || "")}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Download Official Injaz PDF"
                    >
                      <FileDown className="h-3 w-3 text-teal-600" />
                      <span>Injaz PDF</span>
                    </Button>

                    {/* Dispatch to Extension */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendToExtension}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      title="Send Candidate details to Browser Extension"
                    >
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Extension</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canEditEmbassy && embassyStepName && (
                      <>
                        {/* Submit to Embassy button */}
                        {currentRow.embassyStatus !== "Submitted" && currentRow.embassyStatus !== "Stamped" && (
                          <Button
                            size="sm"
                            disabled={isEmbassyLocked}
                            onClick={async () => {
                              try {
                                await submitEmbassyStepV2(embassyStepName);
                                toast.success("Submitted to Embassy successfully");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                          >
                            Submit to Embassy
                          </Button>
                        )}

                        {/* Stamp Visa button */}
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
                            className="h-6.5 sm:h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                          >
                            Stamp Visa
                          </Button>
                        )}

                        {/* Reject button */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isEmbassyLocked}
                          onClick={() => {
                            setEmbassyRejectRemark("");
                            setIsEmbassyRejectOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          Reject
                        </Button>

                        <UndoLastStepButton
                          doctype="Clearance Step"
                          name={embassyStepName}
                          askOnClick
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
                      <div className="p-1 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                        <Plane className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        TICKET & DEPARTURE
                      </h3>
                    </div>
                    {currentRow.departureStatus === "Departed" ? (
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d] py-0 h-4.5 px-2">
                        DEPARTED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold border-sky-300 text-sky-800 dark:text-sky-300 bg-sky-50/50 py-0 h-4.5 px-2">
                        {currentRow.departureStatus || currentRow.stageStatus || "Pending"}
                      </Badge>
                    )}
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
                        {canEditDeparture && !isTicketLocked && placementName ? (
                          <Input
                            type="text"
                            value={ticketNumberVal}
                            onChange={(e) => setTicketNumberVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value.trim().toUpperCase();
                              if (val && val !== (currentRow.ticketNumber || "")) {
                                try {
                                  await recordTicketDetailsV2(
                                    placementName,
                                    val,
                                    flightDateVal || new Date().toISOString().split("T")[0]
                                  );
                                  toast.success("Ticket number recorded");
                                  setCurrentRow((prev) => prev ? { ...prev, ticketNumber: val } : null);
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }
                            }}
                            placeholder="e.g. ET-998231"
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono uppercase font-bold"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-bold text-slate-900 dark:text-white">
                            <span className="truncate">{ticketNumberVal || currentRow.ticketNumber || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 2: Flight Date */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Flight Date
                        </Label>
                        {canEditDeparture && !isTicketLocked && placementName ? (
                          <Input
                            type="date"
                            value={flightDateVal}
                            onChange={(e) => setFlightDateVal(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.flightDate || "")) {
                                try {
                                  await recordTicketDetailsV2(
                                    placementName,
                                    ticketNumberVal || (currentRow.ticketNumber || "ET-RECORDED"),
                                    val
                                  );
                                  toast.success("Flight date recorded");
                                  setCurrentRow((prev) => prev ? { ...prev, flightDate: val } : null);
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
                            <span className="truncate">{flightDateVal || currentRow.flightDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 3: Flight Time */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Flight Time
                        </Label>
                        {canEditDeparture && !isTicketLocked ? (
                          <Input
                            type="time"
                            value={flightTimeVal}
                            onChange={(e) => setFlightTimeVal(e.target.value)}
                            className="h-7 sm:h-7.5 px-2 text-xs font-mono"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{flightTimeVal || "10:00"}</span>
                          </div>
                        )}
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
                        {canEditDeparture && !isTicketLocked && placementName ? (
                          <select
                            value={currentRow.departureStatus || "Pending"}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "Departed" || val === "Local return" || val === "International return") {
                                setSelectedFlightOutcome(val as any);
                                setDepartureRemark("");
                                setIsConfirmDepartOpen(true);
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold",
                              currentRow.departureStatus === "Departed"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                                : "bg-white dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Departed">Departed</option>
                            <option value="Local return">Local return</option>
                            <option value="International return">International return</option>
                          </select>
                        ) : (
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            currentRow.departureStatus === "Departed"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{currentRow.departureStatus || "Pending"}</span>
                            {(!canEditDeparture || isTicketLocked) && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Carrier / Airline */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Airline Carrier
                        </Label>
                        {canEditDeparture && !isTicketLocked ? (
                          <Input
                            type="text"
                            value={airlineVal}
                            onChange={(e) => setAirlineVal(e.target.value)}
                            placeholder="e.g. Ethiopian Airlines"
                            className="h-7 sm:h-7.5 px-2 text-xs font-medium"
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center text-slate-800 dark:text-zinc-200 font-medium">
                            <span className="truncate">{airlineVal || (currentRow.plc as any)?.airline || "Ethiopian Airlines"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 6: Ticket Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Ticket Remark
                        </Label>
                        <Input
                          value={ticketRemarkVal}
                          onChange={(e) => setTicketRemarkVal(e.target.value)}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== (currentRow.ticketRemark || (currentRow.plc as any)?.remarks || "") && placementName) {
                              try {
                                await setTicketingRemarksV2(placementName, val);
                                toast.success("Ticket remark saved");
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }
                          }}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* CV / Dossier PDF Download */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCvPdf}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                      title="Download Candidate CV PDF"
                    >
                      <FileDown className="h-3 w-3 text-emerald-600" />
                      <span>CV</span>
                    </Button>

                    {/* Dispatch to Extension */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendToExtension}
                      className="h-6.5 sm:h-7 text-xs px-2 gap-1 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                      title="Send Candidate details to Browser Extension"
                    >
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Extension</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {canEditDeparture && placementName && (
                      <>
                        <Button
                          size="sm"
                          disabled={isTicketLocked}
                          onClick={() => {
                            setTicketNumber(ticketNumberVal || currentRow.ticketNumber || "");
                            setAirline(airlineVal || (currentRow.plc as any)?.airline || "Ethiopian Airlines");
                            setFlightDate(flightDateVal || currentRow.flightDate || new Date().toISOString().split("T")[0]);
                            setFlightTime(flightTimeVal || currentRow.flightTime || "10:00");
                            setIsTicketFormOpen(true);
                          }}
                          className="h-6.5 sm:h-7 px-2 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold cursor-pointer"
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
                            className="h-6.5 sm:h-7 px-2 text-xs border-slate-300 dark:border-zinc-700 font-semibold cursor-pointer"
                          >
                            Reschedule
                          </Button>
                        )}
                        {currentRow.departureStatus !== "Departed" && (
                          <Button
                            size="sm"
                            disabled={isTicketLocked}
                            onClick={() => {
                              setSelectedFlightOutcome("Departed");
                              setDepartureRemark("");
                              setIsConfirmDepartOpen(true);
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            title="Confirm Departure"
                          >
                            Depart
                          </Button>
                        )}

                        <UndoLastStepButton
                          doctype="Placement"
                          name={placementName}
                          askOnClick
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
              Please select the official reason for rejecting this clearance step.
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
            <DialogTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400">
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
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
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
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
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
            <DialogTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400">
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
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
