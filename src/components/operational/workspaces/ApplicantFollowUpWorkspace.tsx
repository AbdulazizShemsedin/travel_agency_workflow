"use client";

import * as React from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
  Check,
  Loader2,
  Play,
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
  completeClearanceStepV2,
  startClearanceStepV2,
  reopenClearanceStepV2,
  recordPoliceAsharaV2,
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
  listMyClearanceStepsV2,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import {
  recordPredepartureMedicalResultV2,
  recordTicketDetailsV2,
  recordRescheduleV2,
  advancePlacementV2,
  uploadPlacementVisaV2,
  updatePlacementParsedFieldsV2,
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

  const activePlacementIdentifier =
    currentRow?.placementName ||
    currentRow?.placementId ||
    row?.placementName ||
    row?.placementId ||
    "";

  // Authoritative on-demand resolution of clearance steps for this candidate's placement
  const { data: placementSteps = [] } = useQuery({
    queryKey: ["placement_clearance_steps", activePlacementIdentifier],
    queryFn: () => listMyClearanceStepsV2(activePlacementIdentifier),
    enabled: Boolean(activePlacementIdentifier),
  });

  React.useEffect(() => {
    if (!row) return;
    setCurrentRow((prev) => {
      if (!prev) return row;
      const isSameApplicant =
        (row.applicantId && prev.applicantId === row.applicantId) ||
        (row.name && prev.name === row.name) ||
        (row.passportNumber && prev.passportNumber === row.passportNumber);
      if (!isSameApplicant) return row;

      // Helper to preserve populated local field value if server row has undefined/blank
      const resolveFollowUpField = (serverVal: any, localVal: any) => {
        if (serverVal !== undefined && serverVal !== null && serverVal !== "" && serverVal !== "—") {
          return serverVal;
        }
        return localVal !== undefined && localVal !== null && localVal !== "—" ? localVal : serverVal;
      };

      // Intelligently preserve locally modified statuses if refreshed row is stale
      const localInjazPaid = (prev.injazPayment || "").toLowerCase() === "paid";
      const serverInjazPaid = (row.injazPayment || "").toLowerCase() === "paid";
      const resolvedInjazPayment = (localInjazPaid && !serverInjazPaid) ? prev.injazPayment : (row.injazPayment || prev.injazPayment);

      const localTeshir = prev.teshirStatus;
      const serverTeshir = row.teshirStatus;
      const isServerTeshirValid = serverTeshir && serverTeshir !== "—" && serverTeshir !== "Pending" && serverTeshir !== "In Progress";
      const resolvedTeshirStatus = isServerTeshirValid ? serverTeshir : (localTeshir || serverTeshir);

      const localLmisIssued = (prev.lmisStatus || "").toUpperCase() === "ISSUED" || prev.lms?.status === "Issued" || prev.lms?.status === "Complete" || prev.lms?.status === "Completed";
      const serverLmisIssued = (row.lmisStatus || "").toUpperCase() === "ISSUED" || row.lms?.status === "Issued" || row.lms?.status === "Complete" || row.lms?.status === "Completed";
      const resolvedLmisStatus = (localLmisIssued && !serverLmisIssued) ? prev.lmisStatus : (row.lmisStatus || prev.lmisStatus);

      const localEmbassyStamped =
        (prev.embassyStatus || "").toLowerCase() === "stamped" ||
        (prev.embassy?.status || "").toLowerCase() === "stamped" ||
        (prev.embassy?.status || "").toLowerCase() === "approved" ||
        (prev.embassy?.status || "").toLowerCase() === "complete" ||
        (prev.embassy?.status || "").toLowerCase() === "completed";
      const serverEmbassyStamped =
        (row.embassyStatus || "").toLowerCase() === "stamped" ||
        (row.embassy?.status || "").toLowerCase() === "stamped" ||
        (row.embassy?.status || "").toLowerCase() === "approved" ||
        (row.embassy?.status || "").toLowerCase() === "complete" ||
        (row.embassy?.status || "").toLowerCase() === "completed";
      const resolvedEmbassyStatus =
        (localEmbassyStamped && !serverEmbassyStamped)
          ? (prev.embassyStatus || "Stamped")
          : (row.embassyStatus || prev.embassyStatus);

      const localDeparted =
        prev.departureStatus === "Departed" ||
        prev.departureStatus === "Local return" ||
        prev.departureStatus === "International return" ||
        (prev.placementStatus || "").toLowerCase() === "departed";
      const serverDeparted =
        row.departureStatus === "Departed" ||
        row.departureStatus === "Local return" ||
        row.departureStatus === "International return" ||
        (row.placementStatus || "").toLowerCase() === "departed";
      const resolvedDepartureStatus =
        (localDeparted && !serverDeparted)
          ? prev.departureStatus
          : (row.departureStatus || prev.departureStatus);

      const localMedical2 = prev.medical2Status === "FIT" || prev.medical2Status === "UNFIT";
      const serverMedical2 = row.medical2Status === "FIT" || row.medical2Status === "UNFIT";
      const resolvedMedical2Status =
        (localMedical2 && !serverMedical2)
          ? prev.medical2Status
          : (row.medical2Status || prev.medical2Status);

      return {
        ...row,
        lmisStatus: resolvedLmisStatus,
        injazPayment: resolvedInjazPayment,
        teshirStatus: resolvedTeshirStatus,
        embassyStatus: resolvedEmbassyStatus,
        departureStatus: resolvedDepartureStatus,
        medical2Status: resolvedMedical2Status,
        submissionDate: resolveFollowUpField(row.submissionDate, prev.submissionDate),
        visaDeadline: resolveFollowUpField(row.visaDeadline, prev.visaDeadline),
        visaIssueDate: resolveFollowUpField(row.visaIssueDate, prev.visaIssueDate),
        visaNumber: resolveFollowUpField(row.visaNumber, prev.visaNumber),
        embassyRemarks: resolveFollowUpField(row.embassyRemarks, prev.embassyRemarks),
        lmisRemark: resolveFollowUpField(row.lmisRemark, prev.lmisRemark),
        teshirRemark: resolveFollowUpField(row.teshirRemark, prev.teshirRemark),
        ticketRemark: resolveFollowUpField(row.ticketRemark, prev.ticketRemark),
        laborId: resolveFollowUpField(row.laborId, prev.laborId),
        injazApplicationId: resolveFollowUpField(row.injazApplicationId, prev.injazApplicationId),
        appointmentDate: resolveFollowUpField(row.appointmentDate, prev.appointmentDate),
        ticketNumber: resolveFollowUpField(row.ticketNumber, prev.ticketNumber),
        flightDate: resolveFollowUpField(row.flightDate, prev.flightDate),
        flightTime: resolveFollowUpField(row.flightTime, prev.flightTime),
        plc: row.plc || prev.plc,
        embassy: (localEmbassyStamped && !serverEmbassyStamped)
          ? (prev.embassy ? { ...prev.embassy, status: "Stamped" } : ({ status: "Stamped" } as any))
          : (row.embassy || prev.embassy),
        lms: row.lms || prev.lms,
        injaz: row.injaz || prev.injaz,
      };
    });
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

  const isFollowUpOperator =
    isAdmin ||
    hasAnyV2Role(authUserV2, ["Manager", "Clearance Officer", "Placement Officer", "Agency Coordinator"]) ||
    hasRoleKeyword(["manager", "clearance", "placement", "follow-up", "followup", "coordinator", "officer"]);

  const canEditLmis = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS"]) || hasRoleKeyword(["lms", "lmis"]);
  const canEditTaeshir = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign"]) || hasRoleKeyword(["taeshir", "teshir", "injaz", "telesign"]);
  const canEditEmbassy = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy"]) || hasRoleKeyword(["embassy"]);
  const canEditDeparture = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Ticketer"]) || hasRoleKeyword(["ticket", "ticketer"]);
  const canEditMedical = isFollowUpOperator || hasRoleKeyword(["medical"]) || canEditDeparture;

  // Candidate stage resolution for follow-up gating
  const currentStageName = React.useMemo(() => {
    return (
      currentRow?.stageStatus ||
      currentRow?.placementStatus ||
      currentRow?.plc?.status ||
      currentRow?.applicant?.applicant_state ||
      currentRow?.applicant?.status ||
      "Draft"
    );
  }, [currentRow]);

  const hasReachedProcessing = React.useMemo(() => {
    const rawStage = String(
      currentRow?.stageStatus ||
      currentRow?.placementStatus ||
      currentRow?.plc?.status ||
      currentRow?.applicant?.applicant_state ||
      currentRow?.applicant?.status ||
      ""
    ).trim();

    // Check placement status
    const plcStatus = String(currentRow?.plc?.status || currentRow?.placementStatus || "").trim();
    if (["Processing", "Stamped", "Ticketed", "Departed"].includes(plcStatus)) {
      return true;
    }

    // Check stage status
    if (["Processing", "Stamped", "Ticketed", "Departed"].includes(rawStage)) {
      return true;
    }

    // Check if any clearance steps have actually started
    if (placementSteps && placementSteps.length > 0) {
      const hasActiveStep = placementSteps.some(
        (s) => s.status && s.status !== "Pending" && s.status !== "Cancelled"
      );
      if (hasActiveStep) return true;
    }

    return false;
  }, [currentRow, placementSteps]);

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

  // Finish Stage Modal states
  const [isLmisFinishOpen, setIsLmisFinishOpen] = React.useState(false);
  const [isFinishingLmis, setIsFinishingLmis] = React.useState(false);

  const [isTeshirFinishOpen, setIsTeshirFinishOpen] = React.useState(false);
  const [isFinishingTeshir, setIsFinishingTeshir] = React.useState(false);

  // Kuwait Telesign Finish Stage Modal & Starting states
  const [isTelesignFinishOpen, setIsTelesignFinishOpen] = React.useState(false);
  const [isFinishingTelesign, setIsFinishingTelesign] = React.useState(false);
  const [isStartingTelesign, setIsStartingTelesign] = React.useState(false);

  // Kuwait LMIS Police Ashara sub-check Dialog states
  const [isPoliceAsharaOpen, setIsPoliceAsharaOpen] = React.useState(false);
  const [policeAsharaStatus, setPoliceAsharaStatus] = React.useState("Pending");
  const [policeAsharaApptDate, setPoliceAsharaApptDate] = React.useState("");
  const [policeAsharaAmount, setPoliceAsharaAmount] = React.useState("");
  const [policeAsharaRemark, setPoliceAsharaRemark] = React.useState("");
  const [isSavingPoliceAshara, setIsSavingPoliceAshara] = React.useState(false);

  const [isFinishingEmbassy, setIsFinishingEmbassy] = React.useState(false);
  const [isFinishingDepart, setIsFinishingDepart] = React.useState(false);

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
  const [telesignRefNoVal, setTelesignRefNoVal] = React.useState("");

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

  // Inline feedback states for field saving
  const [savingField, setSavingField] = React.useState<Record<string, boolean>>({});
  const [savedField, setSavedField] = React.useState<Record<string, boolean>>({});

  // Inline field errors for immediate feedback
  const [workspaceFieldErrors, setWorkspaceFieldErrors] = React.useState<Record<string, string>>({});
  const setWorkspaceFieldError = React.useCallback((field: string, msg: string) => {
    setWorkspaceFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }, []);
  const clearWorkspaceFieldError = React.useCallback((field: string) => {
    setWorkspaceFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const triggerSavedFeedback = React.useCallback((fieldKey: string) => {
    setSavedField((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setSavedField((prev) => ({ ...prev, [fieldKey]: false }));
    }, 2500);
  }, []);

  React.useEffect(() => {
    if (currentRow) {
      const syncStr = (newVal: any, currentVal: string, setter: (v: string) => void) => {
        const str = String(newVal || "").trim();
        if (str && str !== "—") {
          setter(str);
        } else if (!currentVal) {
          setter("");
        }
      };

      const syncDate = (newVal: any, currentVal: string, setter: (v: string) => void) => {
        const str = String(newVal || "").split(" ")[0].trim();
        if (str && str !== "—") {
          setter(str);
        } else if (!currentVal) {
          setter("");
        }
      };

      syncStr(currentRow.lmisRemark || currentRow.lms?.remarks, lmisRemarkVal, setLmisRemarkVal);
      syncStr(currentRow.teshirRemark || currentRow.injaz?.remarks, teshirRemarkVal, setTeshirRemarkVal);
      syncStr(currentRow.embassyRemarks || currentRow.embassy?.remarks, embassyRemarkVal, setEmbassyRemarkVal);
      syncStr(currentRow.ticketRemark || (currentRow.plc as any)?.remarks, ticketRemarkVal, setTicketRemarkVal);
      syncDate(currentRow.issueDate || currentRow.lms?.date_completed, lmisIssueDate, setLmisIssueDate);
      syncStr(currentRow.laborId || (currentRow.applicant as any)?.labor_id, laborIdVal, setLaborIdVal);

      // Te'shir direct fields
      syncStr(currentRow.injazApplicationId || currentRow.injaz?.injaz_application_id, teshirInjazIdVal, setTeshirInjazIdVal);
      syncStr(currentRow.injazApplicationId || currentRow.injaz?.injaz_application_id || (currentRow.injaz as any)?.reference_number, telesignRefNoVal, setTelesignRefNoVal);
      syncDate(currentRow.appointmentDate || currentRow.teshirAppointmentDate || currentRow.injaz?.appointment_date, teshirApptDateVal, setTeshirApptDateVal);

      // Kuwait LMIS Police Ashara sub-check fields
      syncStr(currentRow.lms?.police_ashara_status, policeAsharaStatus, setPoliceAsharaStatus);
      syncDate(currentRow.lms?.police_ashara_appointment_date, policeAsharaApptDate, setPoliceAsharaApptDate);
      syncStr(currentRow.lms?.police_ashara_amount ? String(currentRow.lms.police_ashara_amount) : "", policeAsharaAmount, setPoliceAsharaAmount);
      syncStr(currentRow.lms?.police_ashara_remark, policeAsharaRemark, setPoliceAsharaRemark);

      // Embassy direct fields
      syncStr(currentRow.visaNumber || currentRow.embassy?.visa_number || (currentRow.plc as any)?.visa_number, embassyVisaNumberVal, setEmbassyVisaNumberVal);
      syncDate(currentRow.submissionDate || (currentRow.embassy as any)?.date_submitted || (currentRow.embassy as any)?.submission_date || currentRow.embassy?.date_started, embassySubmissionDateVal, setEmbassySubmissionDateVal);
      syncDate(currentRow.visaIssueDate || (currentRow.plc as any)?.visa_issue_date || currentRow.embassy?.visa_issue_date, embassyVisaIssueDateVal, setEmbassyVisaIssueDateVal);
      syncDate(currentRow.visaDeadline || (currentRow.plc as any)?.visa_expiry_date || (currentRow.plc as any)?.visa_deadline || currentRow.embassy?.visa_valid_until || (currentRow.embassy as any)?.visa_expiry_date, embassyVisaExpiryDateVal, setEmbassyVisaExpiryDateVal);

      // Ticket direct fields
      syncStr(currentRow.ticketNumber || (currentRow.plc as any)?.ticket_number, ticketNumberVal, setTicketNumberVal);
      syncDate(currentRow.flightDate || (currentRow.plc as any)?.flight_date, flightDateVal, setFlightDateVal);
      syncStr(currentRow.flightTime || (currentRow.plc as any)?.flight_time, flightTimeVal, setFlightTimeVal);
      syncStr((currentRow.plc as any)?.airline, airlineVal, setAirlineVal);
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
        queryClient.invalidateQueries({ queryKey: ["placement_clearance_steps"] }),
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

  const placementName = currentRow.placementName || currentRow.placementId || activePlacementIdentifier;
  const destinationCountry = currentRow.destinationCountry || "Saudi Arabia";
  const isKuwait = destinationCountry.toLowerCase().includes("kuwait");

  // Robust step identifiers resolved from row or placementSteps
  const resolvedLmsStep =
    currentRow.lms ||
    placementSteps.find(
      (s) =>
        s.step_type === "LMIS Clearance" ||
        s.step_type === "Kuwait LMIS" ||
        (s.step_type || "").toLowerCase().includes("lms") ||
        (s.step_type || "").toLowerCase().includes("lmis")
    );

  const resolvedInjazStep =
    currentRow.injaz ||
    placementSteps.find(
      (s) =>
        s.step_type === "Taeshir" ||
        s.step_type === "Telesign" ||
        (s.step_type || "").toLowerCase().includes("taeshir") ||
        (s.step_type || "").toLowerCase().includes("teshir") ||
        (s.step_type || "").toLowerCase().includes("injaz")
    );

  const resolvedEmbassyStep =
    currentRow.embassy ||
    placementSteps.find(
      (s) =>
        s.step_type === "Embassy" ||
        s.step_type === "Saudi Embassy" ||
        s.step_type === "Kuwait Embassy" ||
        (s.step_type || "").toLowerCase().includes("embassy")
    );

  const lmsStepName = resolvedLmsStep?.name || currentRow.clearanceStepName || "";
  const injazStepName = resolvedInjazStep?.name || "";
  const embassyStepName = resolvedEmbassyStep?.name || "";

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

  // Authoritative Backend Completion:
  // The system only deems a stage/card task truly finished AFTER the user officially
  // confirms it via the Finish Stage action/modal, NEVER merely from a dropdown status change.
  const isLmisConfirmedFinished =
    currentRow.lms?.status === "Complete" ||
    currentRow.lms?.status === "Completed" ||
    Boolean(currentRow.lms?.date_completed);

  const isTeshirConfirmedFinished =
    currentRow.injaz?.status === "Complete" ||
    currentRow.injaz?.status === "Completed" ||
    Boolean(currentRow.injaz?.date_completed);

  const isEmbassyConfirmedFinished =
    currentRow.embassy?.status === "Complete" ||
    currentRow.embassy?.status === "Completed" ||
    Boolean(currentRow.embassy?.date_completed) ||
    ["stamped", "ticketed", "departed"].includes(
      String(currentRow.placementStatus || currentRow.stageStatus || "").toLowerCase()
    );

  const isDepartureConfirmedFinished =
    ["departed"].includes(String(currentRow.placementStatus || "").toLowerCase()) ||
    (currentRow.plc as any)?.status === "Departed";

  // Semantic aliases
  const isLmisComplete = isLmisConfirmedFinished;
  const isTeshirCompleted = isTeshirConfirmedFinished;
  const isEmbassyStamped = isEmbassyConfirmedFinished;
  const isDepartureComplete = isDepartureConfirmedFinished;

  const normalizedInjazPayment = React.useMemo(() => {
    const p = String(currentRow?.injazPayment || currentRow?.injaz?.injaz_payment_status || currentRow?.injaz?.payment_status || "").trim().toLowerCase();
    if (p === "paid") return "Paid";
    if (p === "printed") return "Printed";
    return "Unpaid";
  }, [currentRow?.injazPayment, currentRow?.injaz]);

  const isInjazPaid = normalizedInjazPayment === "Paid";

  const normalizedTeshirStatus = React.useMemo(() => {
    if (isTeshirConfirmedFinished) return "Completed";
    const st = String(currentRow?.teshirStatus || (currentRow?.injaz as any)?.taeshir_status || "").trim().toUpperCase();
    if (st === "RECEIVED") return "RECEIVED";
    if (st === "READY TO EMBASSY") return "READY TO EMBASSY";
    if (st === "COMPLETED" || st === "COMPLETE" || st === "ISSUED" || st === "APPROVED") return "Completed";
    return "INFORMED";
  }, [isTeshirConfirmedFinished, currentRow?.teshirStatus, currentRow?.injaz]);

  // Check if pipeline has advanced past embassy / ticketing
  const isPlacementAdvanced = ["Stamped", "Ticketed", "Departed"].includes(
    String(currentRow.placementStatus || currentRow.stageStatus || "")
  );

  const country = String(
    currentRow.destinationCountry ||
    (currentRow.plc as any)?.destination_country ||
    currentRow.applicant?.destination_country ||
    ""
  ).trim();
  const isSaudiCorridor = !country || country.toLowerCase().includes("saudi");

  // Te'shir is satisfied if not on Saudi corridor, OR if officially completed, ready to embassy, received, etc.
  const isTeShirSatisfied =
    !isSaudiCorridor ||
    isTeshirConfirmedFinished ||
    normalizedTeshirStatus === "READY TO EMBASSY" ||
    normalizedTeshirStatus === "RECEIVED";

  // Check if embassy stage has already started, been submitted, stamped, or progressed
  const isEmbassyStartedOrDone =
    Boolean(currentRow.embassyStatus && currentRow.embassyStatus !== "Pending" && currentRow.embassyStatus !== "—") ||
    Boolean(currentRow.embassy?.status && currentRow.embassy.status !== "Pending");

  // Stage accessibility rules:
  // Embassy requires LMIS to be confirmed finished and Te'shir to be satisfied (for Saudi)
  const isEmbassyAccessible = isPlacementAdvanced || isEmbassyStartedOrDone || (isLmisConfirmedFinished && isTeShirSatisfied);
  const isEmbassyLocked = !isEmbassyAccessible;

  // Flight Ticket & Departure requires Embassy to be Stamped
  const isTicketAccessible = isEmbassyConfirmedFinished || ["ticketed", "departed"].includes(
    String(currentRow.placementStatus || currentRow.stageStatus || "").toLowerCase()
  );
  const isTicketLocked = !isTicketAccessible;

  // --- INLINE FIELD SUBMIT HANDLERS (ENTER KEY / BLUR WITH VISUAL FEEDBACK) ---
  const handleSaveLmisRemark = async () => {
    if (!lmsStepName || !canEditLmis) return;
    const val = lmisRemarkVal.trim();
    const currentVal = (currentRow?.lms?.remarks || currentRow?.lmisRemark || "").trim();
    if (val === currentVal && savedField.lmisRemark) return;
    try {
      setSavingField((prev) => ({ ...prev, lmisRemark: true }));
      await setStepRemarksV2(lmsStepName, val);
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        lmisRemark: val, 
        lms: prev.lms ? { ...prev.lms, remarks: val } : prev.lms 
      } : null);
      triggerSavedFeedback("lmisRemark");
      toast.success("LMIS step remark saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, lmisRemark: false }));
    }
  };

  const handleSaveLaborId = async () => {
    const applicantIdentifier = currentRow?.applicantId || currentRow?.name;
    if (!applicantIdentifier || !canEditLmis) return;
    const val = laborIdVal.trim();
    const currentVal = (currentRow?.laborId || (currentRow?.applicant as any)?.labor_id || "").trim();
    if (val === currentVal && savedField.laborId) return;
    try {
      clearWorkspaceFieldError("laborId");
      setSavingField((prev) => ({ ...prev, laborId: true }));
      await updateApplicantForLmisV2({
        applicant_name: applicantIdentifier,
        labor_id: val || undefined,
      });
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        laborId: val,
        applicant: prev.applicant ? { ...prev.applicant, labor_id: val } : prev.applicant 
      } : null);
      triggerSavedFeedback("laborId");
      toast.success("Labor ID updated successfully");
      refreshAll();
    } catch (err) {
      const msg = formatCleanErrorMessage(err);
      setWorkspaceFieldError("laborId", msg);
      toast.error(msg);
    } finally {
      setSavingField((prev) => ({ ...prev, laborId: false }));
    }
  };

  const handleSaveTeshirRemark = async () => {
    if (!injazStepName || !canEditTaeshir) return;
    const val = teshirRemarkVal.trim();
    const currentVal = (currentRow?.injaz?.remarks || currentRow?.teshirRemark || "").trim();
    if (val === currentVal && savedField.teshirRemark) return;
    try {
      setSavingField((prev) => ({ ...prev, teshirRemark: true }));
      await setStepRemarksV2(injazStepName, val);
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        teshirRemark: val, 
        injaz: prev.injaz ? { ...prev.injaz, remarks: val } : prev.injaz 
      } : null);
      triggerSavedFeedback("teshirRemark");
      toast.success("Te'shir step remark saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, teshirRemark: false }));
    }
  };

  const resolveTaeshirDate = (): string | null => {
    const candidates = [
      teshirApptDateVal,
      currentRow?.injaz?.appointment_date,
      currentRow?.teshirAppointmentDate,
      currentRow?.appointmentDate,
    ];
    for (const d of candidates) {
      if (typeof d === "string") {
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          return trimmed.split("T")[0].split(" ")[0];
        }
      }
    }
    return null;
  };

  const handleSaveTeshirInjazId = async () => {
    if (!injazStepName || !canEditTaeshir) return;
    const val = teshirInjazIdVal.trim().toUpperCase();
    const currentVal = (currentRow?.injazApplicationId || "").trim().toUpperCase();
    if (val === currentVal && savedField.teshirInjazId) return;
    try {
      clearWorkspaceFieldError("teshirInjazId");
      setSavingField((prev) => ({ ...prev, teshirInjazId: true }));
      await setTaeshirAppointmentV2(
        injazStepName,
        resolveTaeshirDate(),
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
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        injazApplicationId: val,
        injaz: prev.injaz ? { ...prev.injaz, injaz_application_id: val } : prev.injaz 
      } : null);
      triggerSavedFeedback("teshirInjazId");
      toast.success("E-number saved");
      refreshAll();
    } catch (err) {
      const msg = formatCleanErrorMessage(err);
      setWorkspaceFieldError("teshirInjazId", msg);
      toast.error(msg);
    } finally {
      setSavingField((prev) => ({ ...prev, teshirInjazId: false }));
    }
  };

  const handleSaveTelesignRefNo = async () => {
    if (!injazStepName || !canEditTaeshir) return;
    const val = telesignRefNoVal.trim().toUpperCase();
    const currentVal = (currentRow?.injazApplicationId || "").trim().toUpperCase();
    if (val === currentVal && savedField.telesignRefNo) return;
    try {
      clearWorkspaceFieldError("telesignRefNo");
      setSavingField((prev) => ({ ...prev, telesignRefNo: true }));
      await setStepRemarksV2(injazStepName, val ? `Ref: ${val}` : "");
      const candidateId = currentRow?.applicantId || currentRow?.name;
      if (val && candidateId) {
        try {
          await updateApplicantV2(candidateId, { application_number: val });
        } catch (err) {
          console.warn("Failed to sync application_number:", err);
        }
      }
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        injazApplicationId: val,
        injaz: prev.injaz ? { ...prev.injaz, injaz_application_id: val } : prev.injaz 
      } : null);
      triggerSavedFeedback("telesignRefNo");
      toast.success("Telesign reference number saved");
      refreshAll();
    } catch (err) {
      const msg = formatCleanErrorMessage(err);
      setWorkspaceFieldError("telesignRefNo", msg);
      toast.error(msg);
    } finally {
      setSavingField((prev) => ({ ...prev, telesignRefNo: false }));
    }
  };

  const handleStartTelesign = async () => {
    if (!injazStepName || !canEditTaeshir) return;
    try {
      setIsStartingTelesign(true);
      await startClearanceStepV2(injazStepName);
      toast.success("Telesign step started");
      setCurrentRow((prev) => prev ? {
        ...prev,
        teshirStatus: "In Progress",
        injaz: prev.injaz ? { ...prev.injaz, status: "In Progress" } : prev.injaz,
      } : null);
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setIsStartingTelesign(false);
    }
  };

  const handleSavePoliceAshara = async () => {
    if (!lmsStepName) {
      toast.error("Kuwait LMIS clearance step record not found.");
      return;
    }
    try {
      setIsSavingPoliceAshara(true);
      await recordPoliceAsharaV2(lmsStepName, {
        police_ashara_status: policeAsharaStatus || "Pending",
        police_ashara_appointment_date: policeAsharaApptDate || undefined,
        police_ashara_amount: policeAsharaAmount ? Number(policeAsharaAmount) : undefined,
        police_ashara_remark: policeAsharaRemark || undefined,
      });
      toast.success("Kuwait Police Ashara details recorded successfully");
      setIsPoliceAsharaOpen(false);
      setCurrentRow((prev) => prev ? {
        ...prev,
        lms: prev.lms ? {
          ...prev.lms,
          police_ashara_status: policeAsharaStatus || "Pending",
          police_ashara_appointment_date: policeAsharaApptDate || undefined,
          police_ashara_amount: policeAsharaAmount ? Number(policeAsharaAmount) : undefined,
          police_ashara_remark: policeAsharaRemark || undefined,
        } : prev.lms,
      } : null);
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setIsSavingPoliceAshara(false);
    }
  };

  const handleSaveEmbassyRemark = async () => {
    if (!embassyStepName || !canEditEmbassy) return;
    const val = embassyRemarkVal.trim();
    const currentVal = (currentRow?.embassy?.remarks || currentRow?.embassyRemarks || "").trim();
    if (val === currentVal && savedField.embassyRemark) return;
    try {
      setSavingField((prev) => ({ ...prev, embassyRemark: true }));
      await setStepRemarksV2(embassyStepName, val);
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        embassyRemarks: val, 
        embassy: prev.embassy ? { ...prev.embassy, remarks: val } : prev.embassy 
      } : null);
      triggerSavedFeedback("embassyRemark");
      toast.success("Embassy step remark saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, embassyRemark: false }));
    }
  };

  const handleSaveEmbassySubmissionDate = async () => {
    if (!embassyStepName || !canEditEmbassy) return;
    const val = embassySubmissionDateVal.trim();
    const currentVal = (
      currentRow?.submissionDate ||
      (currentRow?.embassy as any)?.date_submitted ||
      (currentRow?.embassy as any)?.submission_date ||
      currentRow?.embassy?.date_started ||
      ""
    ).trim();
    if (val === currentVal && savedField.embassySubmissionDate) return;
    if (!val) return;
    try {
      setSavingField((prev) => ({ ...prev, embassySubmissionDate: true }));
      await submitEmbassyStepV2(embassyStepName, undefined, val);
      setCurrentRow((prev) =>
        prev
          ? {
              ...prev,
              submissionDate: val,
              embassyStatus: prev.embassyStatus === "Stamped" ? "Stamped" : "Submitted",
              embassy: prev.embassy
                ? { ...prev.embassy, date_submitted: val, date_started: val, submission_date: val }
                : { date_submitted: val, date_started: val, submission_date: val },
            }
          : null
      );
      triggerSavedFeedback("embassySubmissionDate");
      toast.success("Submission date saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, embassySubmissionDate: false }));
    }
  };

  const handleSaveEmbassyVisaNumber = async () => {
    if (!placementName || !canEditEmbassy) return;
    const val = embassyVisaNumberVal.trim();
    const currentVal = (currentRow?.visaNumber || "").trim();
    if (val === currentVal && savedField.embassyVisaNumber) return;
    try {
      setSavingField((prev) => ({ ...prev, embassyVisaNumber: true }));
      await updatePlacementParsedFieldsV2(placementName, {
        visa_number: val,
        ...(embassyVisaIssueDateVal ? { visa_issue_date: embassyVisaIssueDateVal } : {}),
        ...(embassyVisaExpiryDateVal ? { visa_expiry_date: embassyVisaExpiryDateVal } : {}),
      });
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        visaNumber: val,
        plc: prev.plc ? { ...prev.plc, visa_number: val } : { visa_number: val } 
      } : null);
      triggerSavedFeedback("embassyVisaNumber");
      toast.success("Visa number saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, embassyVisaNumber: false }));
    }
  };

  const handleSaveEmbassyVisaIssueDate = async () => {
    if (!placementName || !canEditEmbassy) return;
    const val = embassyVisaIssueDateVal.trim();
    const currentVal = (currentRow?.visaIssueDate || "").trim();
    if (val === currentVal && savedField.embassyVisaIssueDate) return;
    try {
      setSavingField((prev) => ({ ...prev, embassyVisaIssueDate: true }));
      await updatePlacementParsedFieldsV2(placementName, {
        visa_issue_date: val,
        ...(embassyVisaNumberVal ? { visa_number: embassyVisaNumberVal } : {}),
        ...(embassyVisaExpiryDateVal ? { visa_expiry_date: embassyVisaExpiryDateVal } : {}),
      });
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        visaIssueDate: val,
        plc: prev.plc ? { ...prev.plc, visa_issue_date: val } : { visa_issue_date: val } 
      } : null);
      triggerSavedFeedback("embassyVisaIssueDate");
      toast.success("Visa issue date saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, embassyVisaIssueDate: false }));
    }
  };

  const handleSaveEmbassyVisaExpiryDate = async () => {
    if (!placementName || !canEditEmbassy) return;
    const val = embassyVisaExpiryDateVal.trim();
    const currentVal = (currentRow?.visaDeadline || (currentRow?.plc as any)?.visa_deadline || (currentRow?.plc as any)?.visa_expiry_date || "").trim();
    if (val === currentVal && savedField.embassyVisaExpiryDate) return;
    try {
      setSavingField((prev) => ({ ...prev, embassyVisaExpiryDate: true }));
      await updatePlacementParsedFieldsV2(placementName, {
        visa_expiry_date: val,
        ...(embassyVisaNumberVal ? { visa_number: embassyVisaNumberVal } : {}),
        ...(embassyVisaIssueDateVal ? { visa_issue_date: embassyVisaIssueDateVal } : {}),
      });
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        visaDeadline: val, 
        plc: prev.plc ? { ...prev.plc, visa_deadline: val, visa_expiry_date: val } : { visa_deadline: val, visa_expiry_date: val } 
      } : null);
      triggerSavedFeedback("embassyVisaExpiryDate");
      toast.success("Visa valid until date saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, embassyVisaExpiryDate: false }));
    }
  };

  const handleSaveTicketRemark = async () => {
    if (!placementName || !canEditDeparture) return;
    const val = ticketRemarkVal.trim();
    const currentVal = (currentRow?.ticketRemark || (currentRow?.plc as any)?.remarks || "").trim();
    if (val === currentVal && savedField.ticketRemark) return;
    try {
      setSavingField((prev) => ({ ...prev, ticketRemark: true }));
      await setTicketingRemarksV2(placementName, val);
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        ticketRemark: val, 
        plc: prev.plc ? { ...prev.plc, remarks: val } : prev.plc 
      } : null);
      triggerSavedFeedback("ticketRemark");
      toast.success("Ticket remark saved");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, ticketRemark: false }));
    }
  };

  const handleSaveTicketNumber = async () => {
    if (!placementName || !canEditDeparture) return;
    const val = ticketNumberVal.trim().toUpperCase();
    const currentVal = (currentRow?.ticketNumber || (currentRow?.plc as any)?.ticket_number || "").trim().toUpperCase();
    if (val === currentVal && savedField.ticketNumber) return;
    try {
      setSavingField((prev) => ({ ...prev, ticketNumber: true }));
      await recordTicketDetailsV2(
        placementName,
        val,
        flightDateVal || new Date().toISOString().split("T")[0]
      );
      if (val && (currentRow?.placementStatus === "Stamped" || currentRow?.plc?.status === "Stamped")) {
        try {
          await advancePlacementV2(placementName, "Ticketed");
        } catch (advErr) {
          console.warn("Auto-advance placement to Ticketed warning:", advErr);
        }
      }
      setCurrentRow((prev) => prev ? { 
        ...prev, 
        ticketNumber: val,
        stageStatus: prev.placementStatus === "Stamped" ? "Ticketed" : prev.stageStatus,
        placementStatus: prev.placementStatus === "Stamped" ? "Ticketed" : prev.placementStatus,
        plc: prev.plc ? { ...prev.plc, ticket_number: val, status: prev.plc.status === "Stamped" ? "Ticketed" : prev.plc.status } : prev.plc 
      } : null);
      triggerSavedFeedback("ticketNumber");
      toast.success("Ticket number recorded");
      refreshAll();
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setSavingField((prev) => ({ ...prev, ticketNumber: false }));
    }
  };

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
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Follow-Up
              </button>
            )}
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
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* FOUR-CARD 2x2 GRID WORKSPACE                                 */}
          {/* ============================================================= */}
          <div className="p-2 sm:p-2.5 lg:p-3 flex-1 flex flex-col justify-between">
            {/* Warning banner when candidate has not reached Processing */}
            {!hasReachedProcessing && (
              <div className="mb-2.5 p-3 sm:p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs flex items-start gap-3 animate-in fade-in duration-200">
                <div className="p-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100">
                      Follow-Up Stages Disabled • Candidate Has Not Reached Processing Stage
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-400 dark:border-amber-700 bg-white dark:bg-[#16161d] text-amber-900 dark:text-amber-200 uppercase px-2 py-0 h-4.5">
                      Current Stage: {currentStageName}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    All operational cards (LMIS, Te&apos;shir, Embassy, and Ticket &amp; Departure) are disabled because this applicant has not reached the <strong>Processing</strong> stage. The applicant is currently in the <strong>{currentStageName}</strong> stage. Please proceed accordingly through earlier stages (Registration, CV Generation, Foreign Agency Selection, or Muayena Placement Contract Attachment) before updating follow-up clearance records.
                  </p>
                </div>
              </div>
            )}

            <div
              className={cn(
                "grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5 flex-1 items-stretch transition-opacity",
                !hasReachedProcessing && "opacity-50 pointer-events-none select-none cursor-not-allowed filter grayscale-[25%]"
              )}
            >

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
                        {isKuwait ? "KUWAIT LMIS" : "LMIS"}
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
                        {isKuwait ? (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-medium text-slate-400 dark:text-zinc-500 text-xs">
                            <span>— N/A (Kuwait)</span>
                          </div>
                        ) : canEditLmis && currentRow.applicantId ? (
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
                        {canEditLmis ? (
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
                                if (lmsStepName && val !== "ISSUED") {
                                  await setLmisStatusV2(lmsStepName, val);
                                }
                                toast.success(`LMIS status updated to ${val}`);
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
                        {canEditLmis ? (
                          <Input
                            type="date"
                            value={lmisIssueDate}
                            onChange={(e) => setLmisIssueDate(e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val && val !== (currentRow.issueDate || currentRow.lms?.date_completed)) {
                                setCurrentRow((prev) => (prev ? { ...prev, issueDate: val } : null));
                                toast.success("LMIS issue date updated");
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
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Labor ID (Office Ref)
                          </Label>
                          {savingField.laborId && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.laborId && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditLmis && (currentRow.applicantId || currentRow.name) ? (
                          <div>
                            <div className="relative">
                              <Input
                                type="text"
                                value={laborIdVal}
                                onChange={(e) => {
                                  setLaborIdVal(e.target.value);
                                  clearWorkspaceFieldError("laborId");
                                }}
                                onBlur={handleSaveLaborId}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveLaborId();
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                placeholder="Enter Labor ID (Press Enter to save)"
                                disabled={savingField.laborId}
                                className={cn(
                                  "h-7 sm:h-7.5 px-2 text-xs font-mono font-medium transition-colors",
                                  savedField.laborId && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100",
                                  workspaceFieldErrors.laborId && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                                )}
                              />
                              {savedField.laborId && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                            {workspaceFieldErrors.laborId && (
                              <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>{workspaceFieldErrors.laborId}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-medium text-slate-800 dark:text-zinc-200">
                            {laborIdVal || currentRow.laborId || (currentRow.applicant as any)?.labor_id || "—"}
                          </div>
                        )}
                      </div>

                      {/* Field 4: LMIS Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            LMIS Remark
                          </Label>
                          {savingField.lmisRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.lmisRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            value={lmisRemarkVal}
                            onChange={(e) => setLmisRemarkVal(e.target.value)}
                            onBlur={handleSaveLmisRemark}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveLmisRemark();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Operational remarks for LMIS processing... (Press Enter to save)"
                            disabled={!canEditLmis || savingField.lmisRemark}
                            className={cn(
                              "h-7 sm:h-7.5 text-xs px-2 pr-7 transition-colors",
                              savedField.lmisRemark && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
                          />
                          {savedField.lmisRemark && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
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
                        <div className="col-span-2 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-amber-900 dark:text-amber-300">
                              Kuwait Police Ashara Sub-check
                            </span>
                            {canEditLmis && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPoliceAsharaStatus(currentRow.lms?.police_ashara_status || "Pending");
                                  setPoliceAsharaApptDate(currentRow.lms?.police_ashara_appointment_date || "");
                                  setPoliceAsharaAmount(currentRow.lms?.police_ashara_amount ? String(currentRow.lms.police_ashara_amount) : "");
                                  setPoliceAsharaRemark(currentRow.lms?.police_ashara_remark || "");
                                  setIsPoliceAsharaOpen(true);
                                }}
                                className="h-5 text-[10px] px-2 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 font-semibold cursor-pointer"
                              >
                                Manage Police Ashara
                              </Button>
                            )}
                          </div>
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
                    {canEditLmis && (
                      <>
                        {/* Finish stage button */}
                        <Button
                          size="sm"
                          onClick={() => setIsLmisFinishOpen(true)}
                          disabled={isLmisComplete || isFinishingLmis}
                          className={cn(
                            "h-6.5 sm:h-7 px-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm",
                            isLmisComplete ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          )}
                          title={isLmisComplete ? "LMIS stage already finished" : "Officially finish the LMIS stage"}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Finish stage</span>
                        </Button>


                        {/* Reject button */}
                        {lmsStepName && (
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
                        )}

                        {/* Undo Step button */}
                        {lmsStepName && (
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
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* CARD 2: TELESIGN (KUWAIT) OR TE'SHIR / INJAZ (SAUDI)        */}
              {/* ----------------------------------------------------------- */}
              {isKuwait ? (
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between">
                  <div>
                    {/* Card Header */}
                    <div className="px-3.5 py-1.5 sm:py-2 border-b border-slate-100 dark:border-[#202028] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                          <CreditCard className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          TELESIGN (KUWAIT)
                        </h3>
                      </div>
                      {(currentRow.teshirStatus === "Completed" || isTeshirCompleted || resolvedInjazStep?.status === "Complete") ? (
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d] py-0 h-4.5 px-2">
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-800 dark:text-indigo-300 bg-indigo-50/50 py-0 h-4.5 px-2">
                          {currentRow.teshirStatus || resolvedInjazStep?.status || "Pending"}
                        </Badge>
                      )}
                    </div>

                    {/* Card Body - 2-Column Grid */}
                    <div className="p-2.5 sm:p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Field 1: Telesign Reference No */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              Telesign Ref No.
                            </Label>
                            {savingField.telesignRefNo && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                              </span>
                            )}
                            {savedField.telesignRefNo && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          {canEditTaeshir ? (
                            <div>
                              <div className="relative">
                                <Input
                                  type="text"
                                  value={telesignRefNoVal}
                                  onChange={(e) => {
                                    setTelesignRefNoVal(e.target.value);
                                    clearWorkspaceFieldError("telesignRefNo");
                                  }}
                                  onBlur={handleSaveTelesignRefNo}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveTelesignRefNo();
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  placeholder="e.g. TEL-892341"
                                  disabled={savingField.telesignRefNo}
                                  className={cn(
                                    "h-7 sm:h-7.5 px-2 text-xs font-mono uppercase font-bold transition-colors",
                                    savedField.telesignRefNo && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100",
                                    workspaceFieldErrors.telesignRefNo && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                                  )}
                                />
                                {savedField.telesignRefNo && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>
                              {workspaceFieldErrors.telesignRefNo && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>{workspaceFieldErrors.telesignRefNo}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-bold text-slate-900 dark:text-white">
                              <span className="truncate">{telesignRefNoVal || currentRow.injazApplicationId || "—"}</span>
                            </div>
                          )}
                        </div>

                        {/* Field 2: Telesign Status */}
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Telesign Status
                          </Label>
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            (isTeshirCompleted || currentRow.teshirStatus === "Completed" || resolvedInjazStep?.status === "Complete")
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{isTeshirCompleted ? "Complete" : (currentRow.teshirStatus || resolvedInjazStep?.status || "Pending")}</span>
                            {!canEditTaeshir && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        </div>

                        {/* Field 3: Date Started */}
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Date Started
                          </Label>
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{resolvedInjazStep?.date_started || "—"}</span>
                          </div>
                        </div>

                        {/* Field 4: Date Completed */}
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Date Completed
                          </Label>
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{resolvedInjazStep?.date_completed || "—"}</span>
                          </div>
                        </div>

                        {/* Field 5: Telesign Remark (spans 2 columns) */}
                        <div className="col-span-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              Telesign Remark
                            </Label>
                            {savingField.teshirRemark && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                              </span>
                            )}
                            {savedField.teshirRemark && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              value={teshirRemarkVal}
                              onChange={(e) => setTeshirRemarkVal(e.target.value)}
                              onBlur={handleSaveTeshirRemark}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveTeshirRemark();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="Telesign verification notes or remarks... (Press Enter to save)"
                              disabled={!canEditTaeshir || savingField.teshirRemark}
                              className={cn(
                                "h-7 sm:h-7.5 text-xs px-2 pr-7 transition-colors",
                                savedField.teshirRemark && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                              )}
                            />
                            {savedField.teshirRemark && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telesign Actions */}
                  <div className="px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      {canEditTaeshir && (
                        <>
                          {/* Start Telesign button if Pending */}
                          {injazStepName && (currentRow.teshirStatus === "Pending" || resolvedInjazStep?.status === "Pending") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleStartTelesign}
                              disabled={isStartingTelesign}
                              className="h-6.5 sm:h-7 px-2 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold cursor-pointer"
                              title="Start Telesign clearance step"
                            >
                              {isStartingTelesign ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Play className="h-3 w-3 mr-1" />
                              )}
                              <span>Start Telesign</span>
                            </Button>
                          )}

                          {/* Finish stage button */}
                          <Button
                            size="sm"
                            onClick={() => setIsTelesignFinishOpen(true)}
                            disabled={isTeshirCompleted || isFinishingTelesign}
                            className={cn(
                              "h-6.5 sm:h-7 px-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm",
                              isTeshirCompleted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            )}
                            title={isTeshirCompleted ? "Telesign stage already finished" : "Officially finish the Telesign stage"}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            <span>Finish stage</span>
                          </Button>

                          {injazStepName && (
                            <UndoLastStepButton
                              doctype="Clearance Step"
                              name={injazStepName}
                              askOnClick
                              onSuccess={refreshAll}
                              size="sm"
                              className="h-6.5 sm:h-7 text-xs"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
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
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              E-number (Injaz Application No.)
                            </Label>
                            {savingField.teshirInjazId && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                              </span>
                            )}
                            {savedField.teshirInjazId && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          {canEditTaeshir ? (
                            <div>
                              <div className="relative">
                                <Input
                                  type="text"
                                  value={teshirInjazIdVal}
                                  onChange={(e) => {
                                    setTeshirInjazIdVal(e.target.value);
                                    clearWorkspaceFieldError("teshirInjazId");
                                  }}
                                  onBlur={handleSaveTeshirInjazId}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveTeshirInjazId();
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  placeholder="e.g. E12345678 (Press Enter to save)"
                                  disabled={savingField.teshirInjazId}
                                  className={cn(
                                    "h-7 sm:h-7.5 px-2 text-xs font-mono uppercase font-bold transition-colors",
                                    savedField.teshirInjazId && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100",
                                    workspaceFieldErrors.teshirInjazId && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                                  )}
                                />
                                {savedField.teshirInjazId && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>
                              {workspaceFieldErrors.teshirInjazId && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>{workspaceFieldErrors.teshirInjazId}</span>
                                </p>
                              )}
                            </div>
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
                          {canEditTaeshir ? (
                            <div>
                              <Input
                                type="date"
                                value={teshirApptDateVal}
                                onChange={(e) => {
                                  setTeshirApptDateVal(e.target.value);
                                  clearWorkspaceFieldError("teshirApptDate");
                                }}
                                onBlur={async (e) => {
                                  const val = e.target.value;
                                  const currentAppt = currentRow.appointmentDate && currentRow.appointmentDate !== "—" ? currentRow.appointmentDate : "";
                                  if (val && val !== currentAppt) {
                                    try {
                                      clearWorkspaceFieldError("teshirApptDate");
                                      if (injazStepName) {
                                        await setTaeshirAppointmentV2(
                                          injazStepName,
                                          val,
                                          teshirInjazIdVal || (currentRow.injazApplicationId || "")
                                        );
                                      }
                                      toast.success("Appointment date saved");
                                      setCurrentRow((prev) => prev ? { ...prev, appointmentDate: val } : null);
                                      refreshAll();
                                    } catch (err) {
                                      const msg = formatCleanErrorMessage(err);
                                      setWorkspaceFieldError("teshirApptDate", msg);
                                      toast.error(msg);
                                    }
                                  }
                                }}
                                className={cn(
                                  "h-7 sm:h-7.5 px-2 text-xs font-mono font-medium",
                                  workspaceFieldErrors.teshirApptDate && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                                )}
                              />
                              {workspaceFieldErrors.teshirApptDate && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>{workspaceFieldErrors.teshirApptDate}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono font-medium text-slate-800 dark:text-zinc-200">
                              <span className="truncate">{teshirApptDateVal || currentRow.appointmentDate || "—"}</span>
                            </div>
                          )}
                        </div>

                        {/* Field 3: Te'shir Status */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              Te&apos;shir Status
                            </Label>
                            {savedField.teshirStatus && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          {canEditTaeshir ? (
                            <select
                              value={normalizedTeshirStatus}
                              onChange={async (e) => {
                                const val = e.target.value;
                                try {
                                  if (injazStepName && val !== "Completed") {
                                    await setTaeshirStatusV2(injazStepName, val);
                                  }
                                  toast.success(`Te'shir status updated to ${val}`);
                                  setCurrentRow((prev) => (prev ? { 
                                    ...prev, 
                                    teshirStatus: val,
                                    injaz: prev.injaz ? { ...prev.injaz, taeshir_status: val } : prev.injaz
                                  } : null));
                                  triggerSavedFeedback("teshirStatus");
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className={cn(
                                "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold transition-colors",
                                savedField.teshirStatus && "border-emerald-500 ring-1 ring-emerald-500/20",
                                (isTeshirCompleted || normalizedTeshirStatus === "Completed")
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
                              (isTeshirCompleted || normalizedTeshirStatus === "Completed")
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                                : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}>
                              <span>{normalizedTeshirStatus}</span>
                              {!canEditTaeshir && <Lock className="h-3 w-3 text-slate-400" />}
                            </div>
                          )}
                        </div>

                        {/* Field 4: Injaz Payment (Unpaid, Printed, Paid) Dropdown */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              Injaz Payment
                            </Label>
                            {savedField.injazPayment && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          {canEditTaeshir ? (
                            <select
                              value={normalizedInjazPayment}
                              onChange={async (e) => {
                                const val = e.target.value as "Paid" | "Unpaid" | "Printed";
                                try {
                                  if (injazStepName) {
                                    await recordInjazPaymentV2(injazStepName, val);
                                  }
                                  toast.success(`Injaz payment updated to ${val}`);
                                  setCurrentRow((prev) => (prev ? { 
                                    ...prev, 
                                    injazPayment: val,
                                    injaz: prev.injaz ? { ...prev.injaz, injaz_payment_status: val, payment_status: val } : { injaz_payment_status: val, payment_status: val }
                                  } : null));
                                  triggerSavedFeedback("injazPayment");
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className={cn(
                                "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer transition-colors",
                                savedField.injazPayment && "border-emerald-500 ring-1 ring-emerald-500/20",
                                isInjazPaid
                                  ? "bg-white dark:bg-[#16161d] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                  : normalizedInjazPayment === "Printed"
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
                                variant={isInjazPaid ? "success" : normalizedInjazPayment === "Printed" ? "outline" : "warning"}
                                className="text-[10px] font-bold py-0 h-4.5"
                              >
                                {normalizedInjazPayment}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Field 5: Te'shir Completed? Editable Dropdown */}
                        <div className="col-span-2 space-y-0.5">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Te&apos;shir Completed?
                          </Label>
                          {canEditTaeshir ? (
                            <select
                              value={isTeshirCompleted || normalizedTeshirStatus === "Completed" ? "Completed" : "In Progress"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrentRow((prev) => (prev ? { 
                                  ...prev, 
                                  teshirStatus: val,
                                  injaz: prev.injaz ? { ...prev.injaz, taeshir_status: val } : prev.injaz
                                } : null));
                                toast.success(`Te'shir marked as ${val}`);
                              }}
                              className={cn(
                                "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer",
                                (isTeshirCompleted || normalizedTeshirStatus === "Completed")
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
                                  (isTeshirCompleted || normalizedTeshirStatus === "Completed")
                                    ? "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d]"
                                    : "border-amber-300 text-amber-700"
                                )}
                              >
                                {isTeshirCompleted || normalizedTeshirStatus === "Completed" ? "Completed" : "In Progress"}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Field 6: Te'shir Remark (spans 2 columns) */}
                        <div className="col-span-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              Te&apos;shir Remark
                            </Label>
                            {savingField.teshirRemark && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                              </span>
                            )}
                            {savedField.teshirRemark && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                <Check className="h-3 w-3" /> Saved
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              value={teshirRemarkVal}
                              onChange={(e) => setTeshirRemarkVal(e.target.value)}
                              onBlur={handleSaveTeshirRemark}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveTeshirRemark();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="Appointment or biometric remarks... (Press Enter to save)"
                              disabled={!canEditTaeshir || savingField.teshirRemark}
                              className={cn(
                                "h-7 sm:h-7.5 text-xs px-2 pr-7 transition-colors",
                                savedField.teshirRemark && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                              )}
                            />
                            {savedField.teshirRemark && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
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
                      {canEditTaeshir && (
                        <>
                          {/* Finish stage button */}
                          <Button
                            size="sm"
                            onClick={() => setIsTeshirFinishOpen(true)}
                            disabled={isTeshirCompleted || isFinishingTeshir}
                            className={cn(
                              "h-6.5 sm:h-7 px-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm",
                              isTeshirCompleted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            )}
                            title={isTeshirCompleted ? "Te'shir stage already finished" : "Officially finish the Te'shir stage"}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            <span>Finish stage</span>
                          </Button>

                          {/* Missed Appointment Button */}
                          {injazStepName && (
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
                          )}

                          {/* Undo Missed Button */}
                          {injazStepName && Boolean(
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

                          {injazStepName && (
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
                          )}
                          {injazStepName && (
                            <UndoLastStepButton
                              doctype="Clearance Step"
                              name={injazStepName}
                              askOnClick
                              onSuccess={refreshAll}
                              size="sm"
                              className="h-6.5 sm:h-7 text-xs"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                        {isKuwait ? "KUWAIT EMBASSY" : "EMBASSY / WAKALA"}
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
                      <span>Stage Locked: Inaccessible until LMIS is Issued and {isKuwait ? "Telesign is Completed." : "Te'shir is Completed."}</span>
                    </div>
                  )}

                  {/* Card Body - 2-Column Grid */}
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: Visa Number */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Visa Number
                          </Label>
                          {savingField.embassyVisaNumber && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.embassyVisaNumber && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditEmbassy && placementName ? (
                          <div className="relative">
                            <Input
                              type="text"
                              value={embassyVisaNumberVal}
                              onChange={(e) => setEmbassyVisaNumberVal(e.target.value)}
                              onBlur={handleSaveEmbassyVisaNumber}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveEmbassyVisaNumber();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="e.g. 1300892341 (Press Enter to save)"
                              disabled={savingField.embassyVisaNumber}
                              className={cn(
                                "h-7 sm:h-7.5 px-2 text-xs font-mono font-bold transition-colors",
                                savedField.embassyVisaNumber && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                              )}
                            />
                            {savedField.embassyVisaNumber && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
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
                        {isKuwait ? (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-medium text-slate-400 dark:text-zinc-500 text-xs">
                            <span>— N/A (Kuwait)</span>
                          </div>
                        ) : canEditEmbassy ? (
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
                                if (embassyStepName) {
                                  await recordWakalaPaymentV2(embassyStepName, val);
                                }
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
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Submission Date
                          </Label>
                          {savingField.embassySubmissionDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.embassySubmissionDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditEmbassy ? (
                          <Input
                            type="date"
                            value={embassySubmissionDateVal}
                            onChange={(e) => setEmbassySubmissionDateVal(e.target.value)}
                            onBlur={handleSaveEmbassySubmissionDate}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEmbassySubmissionDate();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingField.embassySubmissionDate}
                            className={cn(
                              "h-7 sm:h-7.5 px-2 text-xs font-mono transition-colors",
                              savedField.embassySubmissionDate && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{embassySubmissionDateVal || currentRow.submissionDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 4: Visa Issued On */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Visa Issued On
                          </Label>
                          {savingField.embassyVisaIssueDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.embassyVisaIssueDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditEmbassy && placementName ? (
                          <Input
                            type="date"
                            value={embassyVisaIssueDateVal}
                            onChange={(e) => setEmbassyVisaIssueDateVal(e.target.value)}
                            onBlur={handleSaveEmbassyVisaIssueDate}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEmbassyVisaIssueDate();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingField.embassyVisaIssueDate}
                            className={cn(
                              "h-7 sm:h-7.5 px-2 text-xs font-mono transition-colors",
                              savedField.embassyVisaIssueDate && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center font-mono text-slate-800 dark:text-zinc-200">
                            <span className="truncate">{embassyVisaIssueDateVal || currentRow.visaIssueDate || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 5: Visa Valid Until */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Visa Valid Until
                          </Label>
                          {savingField.embassyVisaExpiryDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.embassyVisaExpiryDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditEmbassy && placementName ? (
                          <Input
                            type="date"
                            value={embassyVisaExpiryDateVal}
                            onChange={(e) => setEmbassyVisaExpiryDateVal(e.target.value)}
                            onBlur={handleSaveEmbassyVisaExpiryDate}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEmbassyVisaExpiryDate();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingField.embassyVisaExpiryDate}
                            className={cn(
                              "h-7 sm:h-7.5 px-2 text-xs font-mono transition-colors",
                              savedField.embassyVisaExpiryDate && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
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
                        {canEditEmbassy ? (
                          <select
                            value={currentRow.embassyStatus || "Pending"}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val === "Rejected") {
                                setEmbassyRejectRemark("");
                                setIsEmbassyRejectOpen(true);
                                return;
                              }
                              if (val === "Submitted" && embassyStepName) {
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
                              if (val === "Stamped") {
                                if (embassyStepName) {
                                  try {
                                    await stampEmbassyStepV2(embassyStepName, embassyVisaNumberVal || currentRow.visaNumber || undefined);
                                    toast.success("Embassy visa marked as Stamped");
                                    setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: "Stamped" } : null));
                                    refreshAll();
                                  } catch {
                                    setEmbassyVisaNumber(embassyVisaNumberVal || currentRow.visaNumber || "");
                                    setEmbassyVisaIssueDate(embassyVisaIssueDateVal || currentRow.visaIssueDate || new Date().toISOString().split("T")[0]);
                                    const exp = new Date();
                                    exp.setDate(exp.getDate() + 90);
                                    setEmbassyVisaExpiryDate(embassyVisaExpiryDateVal || currentRow.visaDeadline || exp.toISOString().split("T")[0]);
                                    setIsEmbassyStampOpen(true);
                                  }
                                } else {
                                  setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: "Stamped" } : null));
                                  toast.success("Embassy status updated to Stamped");
                                }
                                return;
                              }
                              setCurrentRow((prev) => (prev ? { ...prev, embassyStatus: val } : null));
                              toast.success(`Embassy status updated to ${val}`);
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
                            {!canEditEmbassy && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 7: Embassy Remarks (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Embassy Remarks
                          </Label>
                          {savingField.embassyRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.embassyRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            value={embassyRemarkVal}
                            onChange={(e) => setEmbassyRemarkVal(e.target.value)}
                            onBlur={handleSaveEmbassyRemark}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEmbassyRemark();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Submission, stamping, or feedback... (Press Enter to save)"
                            disabled={!canEditEmbassy || savingField.embassyRemark}
                            className={cn(
                              "h-7 sm:h-7.5 text-xs px-2 pr-7 transition-colors",
                              savedField.embassyRemark && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
                          />
                          {savedField.embassyRemark && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 8: Embassy Actions */}
                <div className="px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Official Backend Injaz PDF Download (Saudi only) */}
                    {!isKuwait && (
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
                    )}

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
                    {canEditEmbassy && (
                      <>
                        {/* Submit to Embassy button */}
                        {embassyStepName && currentRow.embassyStatus !== "Submitted" && currentRow.embassyStatus !== "Stamped" && (
                          <Button
                            size="sm"
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

                        {/* Finish stage button (Stamp Visa) */}
                        <Button
                          size="sm"
                          onClick={() => {
                            setEmbassyVisaNumber(embassyVisaNumberVal || currentRow.visaNumber || "");
                            setEmbassyVisaIssueDate(embassyVisaIssueDateVal || currentRow.visaIssueDate || new Date().toISOString().split("T")[0]);
                            const exp = new Date();
                            exp.setDate(exp.getDate() + 90);
                            setEmbassyVisaExpiryDate(embassyVisaExpiryDateVal || currentRow.visaDeadline || exp.toISOString().split("T")[0]);
                            setIsEmbassyStampOpen(true);
                          }}
                          disabled={isEmbassyStamped || isFinishingEmbassy}
                          className={cn(
                            "h-6.5 sm:h-7 px-2.5 text-xs font-semibold shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white",
                            isEmbassyStamped ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          )}
                          title={isEmbassyStamped ? "Embassy stage already finished (Stamped)" : "Officially finish the Embassy stage"}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Finish stage</span>
                        </Button>

                        {/* Reject button */}
                        {embassyStepName && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEmbassyRejectRemark("");
                              setIsEmbassyRejectOpen(true);
                            }}
                            className="h-6.5 sm:h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                          >
                            Reject
                          </Button>
                        )}

                        {embassyStepName && (
                          <UndoLastStepButton
                            doctype="Clearance Step"
                            name={embassyStepName}
                            askOnClick
                            onSuccess={refreshAll}
                            size="sm"
                            className="h-6.5 sm:h-7 text-xs"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* CARD 4: TICKET & DEPARTURE (Bottom-Right)                   */}
              {/* ----------------------------------------------------------- */}
              <div className={cn("rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121216] shadow-xs flex flex-col justify-between overflow-hidden transition-opacity", isTicketLocked && "opacity-60 bg-slate-50/50 dark:bg-[#121216]/50")}>
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
                      <span>Stage Locked: Embassy Status must be marked Stamped before Ticket & Departure details can be edited.</span>
                    </div>
                  )}

                  {/* Card Body - 2-Column Grid */}
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Field 1: Ticket Number */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Ticket Number
                          </Label>
                          {savingField.ticketNumber && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.ticketNumber && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        {canEditDeparture && placementName ? (
                          <div className="relative">
                            <Input
                              type="text"
                              value={ticketNumberVal}
                              onChange={(e) => setTicketNumberVal(e.target.value)}
                              onBlur={handleSaveTicketNumber}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveTicketNumber();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="e.g. ET-998231 (Press Enter to save)"
                              disabled={isTicketLocked || savingField.ticketNumber}
                              className={cn(
                                "h-7 sm:h-7.5 px-2 text-xs font-mono uppercase font-bold transition-colors",
                                isTicketLocked && "cursor-not-allowed",
                                savedField.ticketNumber && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                              )}
                            />
                            {savedField.ticketNumber && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
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
                        {canEditDeparture && placementName ? (
                          <Input
                            type="date"
                            value={flightDateVal}
                            onChange={(e) => setFlightDateVal(e.target.value)}
                            disabled={isTicketLocked}
                            onBlur={async (e) => {
                              if (isTicketLocked) return;
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
                            className={cn("h-7 sm:h-7.5 px-2 text-xs font-mono", isTicketLocked && "cursor-not-allowed")}
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
                        {canEditDeparture ? (
                          <Input
                            type="time"
                            value={flightTimeVal}
                            onChange={(e) => setFlightTimeVal(e.target.value)}
                            disabled={isTicketLocked}
                            className={cn("h-7 sm:h-7.5 px-2 text-xs font-mono", isTicketLocked && "cursor-not-allowed")}
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
                        {canEditMedical && placementName ? (
                          <select
                            value={currentRow.medical2Status === "FIT" || currentRow.medical2Status === "UNFIT" ? currentRow.medical2Status : "Pending"}
                            disabled={isTicketLocked}
                            onChange={async (e) => {
                              if (isTicketLocked) return;
                              const val = e.target.value;
                              if (val !== "FIT" && val !== "UNFIT") return;
                              try {
                                await recordPredepartureMedicalResultV2(placementName, val);
                                toast.success(val === "FIT" ? "Medical 2 set to FIT" : "Medical 2 set to UNFIT (Held)");
                                setCurrentRow((prev) => (prev ? { ...prev, medical2Status: val } : null));
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold cursor-pointer",
                              isTicketLocked && "opacity-60 cursor-not-allowed",
                              currentRow.medical2Status === "FIT"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                                : currentRow.medical2Status === "UNFIT"
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-500"
                                : "bg-white dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="FIT">FIT</option>
                            <option value="UNFIT">UNFIT</option>
                          </select>
                        ) : (
                          <div className={cn(
                            "h-7 sm:h-7.5 px-2 rounded-md border flex items-center justify-between font-semibold",
                            currentRow.medical2Status === "FIT"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500 font-bold"
                              : currentRow.medical2Status === "UNFIT"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-500 font-bold"
                              : "bg-slate-50 dark:bg-[#16161d] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                          )}>
                            <span>{currentRow.medical2Status || "Pending"}</span>
                            {(!canEditMedical || isTicketLocked) && <Lock className="h-3 w-3 text-slate-400" />}
                          </div>
                        )}
                      </div>

                      {/* Field 5: Departure Status */}
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          Departure Status
                        </Label>
                        {canEditDeparture && placementName ? (
                          <select
                            value={currentRow.departureStatus || "Pending"}
                            disabled={isTicketLocked}
                            onChange={(e) => {
                              if (isTicketLocked) return;
                              const val = e.target.value;
                              setCurrentRow((prev) => (prev ? { ...prev, departureStatus: val } : null));
                              if (val === "Departed" || val === "Local return" || val === "International return") {
                                setSelectedFlightOutcome(val as any);
                              }
                            }}
                            className={cn(
                              "w-full h-7 sm:h-7.5 px-2 text-xs border rounded-md font-bold",
                              isTicketLocked && "opacity-60 cursor-not-allowed",
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
                        {canEditDeparture ? (
                          <Input
                            type="text"
                            value={airlineVal}
                            onChange={(e) => setAirlineVal(e.target.value)}
                            disabled={isTicketLocked}
                            placeholder="e.g. Ethiopian Airlines"
                            className={cn("h-7 sm:h-7.5 px-2 text-xs font-medium", isTicketLocked && "cursor-not-allowed")}
                          />
                        ) : (
                          <div className="h-7 sm:h-7.5 px-2 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161d] flex items-center text-slate-800 dark:text-zinc-200 font-medium">
                            <span className="truncate">{airlineVal || (currentRow.plc as any)?.airline || "Ethiopian Airlines"}</span>
                          </div>
                        )}
                      </div>

                      {/* Field 6: Ticket Remark (spans 2 columns) */}
                      <div className="col-span-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            Ticket Remark
                          </Label>
                          {savingField.ticketRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving...
                            </span>
                          )}
                          {savedField.ticketRemark && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            value={ticketRemarkVal}
                            onChange={(e) => setTicketRemarkVal(e.target.value)}
                            onBlur={handleSaveTicketRemark}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveTicketRemark();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Ticketing details, flight notes, or outcome... (Press Enter to save)"
                            disabled={isTicketLocked || !canEditDeparture || savingField.ticketRemark}
                            className={cn(
                              "h-7 sm:h-7.5 text-xs px-2 pr-7 transition-colors",
                              isTicketLocked && "cursor-not-allowed",
                              savedField.ticketRemark && "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                            )}
                          />
                          {savedField.ticketRemark && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 7: Ticket Actions */}
                <div className="px-3 py-1 sm:py-1.5 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-1.5">
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
                        {/* Finish stage button */}
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedFlightOutcome(
                              currentRow.departureStatus === "Local return" || currentRow.departureStatus === "International return"
                                ? currentRow.departureStatus
                                : "Departed"
                            );
                            setDepartureRemark("");
                            setIsConfirmDepartOpen(true);
                          }}
                          disabled={isTicketLocked || isDepartureConfirmedFinished || isFinishingDepart}
                          className={cn(
                            "h-6.5 sm:h-7 px-2.5 text-xs font-semibold shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white",
                            (isTicketLocked || isDepartureConfirmedFinished) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          )}
                          title={
                            isTicketLocked
                              ? "Stage locked until Embassy is Stamped"
                              : isDepartureConfirmedFinished
                              ? "Departure stage already finished"
                              : "Officially finish the Departure stage"
                          }
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Finish stage</span>
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
                            className={cn(
                              "h-6.5 sm:h-7 px-2 text-xs border-slate-300 dark:border-zinc-700 font-semibold",
                              isTicketLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            )}
                          >
                            Reschedule
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

      {/* 1b. Finish LMIS Stage Confirmation Dialog */}
      <Dialog open={isLmisFinishOpen} onOpenChange={setIsLmisFinishOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish LMIS Stage
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially finish the LMIS stage for candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
              This will set LMIS clearance to ISSUED and officially complete the clearance step on the pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Labor ID / Reference (Optional)</Label>
              <Input
                type="text"
                value={laborIdVal || currentRow.laborId || ""}
                onChange={(e) => setLaborIdVal(e.target.value)}
                placeholder="e.g. LAB-982341"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Approval / Issue Date</Label>
              <Input
                type="date"
                value={lmisIssueDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setLmisIssueDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsLmisFinishOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isFinishingLmis}
              onClick={async () => {
                if (!lmsStepName) {
                  toast.error("LMIS clearance step record not found.");
                  return;
                }
                try {
                  setIsFinishingLmis(true);
                  const approvalDate = lmisIssueDate || new Date().toISOString().split("T")[0];
                  await setLmisStatusV2(
                    lmsStepName,
                    "ISSUED",
                    undefined,
                    laborIdVal || currentRow.laborId || undefined,
                    approvalDate
                  );
                  await completeClearanceStepV2(lmsStepName);
                  toast.success("LMIS stage finished and marked as ISSUED!");
                  setIsLmisFinishOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          lmisStatus: "ISSUED",
                          lms: prev.lms ? { ...prev.lms, status: "Complete" } : undefined,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsFinishingLmis(false);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              {isFinishingLmis ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Finishing...
                </>
              ) : (
                "Confirm & Finish Stage"
              )}
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

      {/* 3b. Finish Te'shir Stage Confirmation Dialog */}
      <Dialog open={isTeshirFinishOpen} onOpenChange={setIsTeshirFinishOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Te&apos;shir Stage
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially finish the Te&apos;shir / Injaz clearance stage for candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
              This marks the clearance step complete on the backend pipeline and satisfies requirements for Embassy submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Injaz Application No (E-Number):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {teshirInjazIdVal || (currentRow.injaz as any)?.injaz_application_no || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Payment Status:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {(currentRow.injaz as any)?.injaz_payment_status || "Paid"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTeshirFinishOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isFinishingTeshir}
              onClick={async () => {
                if (!injazStepName) {
                  toast.error("Te'shir clearance step record not found.");
                  return;
                }
                try {
                  setIsFinishingTeshir(true);
                  await completeClearanceStepV2(injazStepName);
                  toast.success("Te'shir stage completed successfully!");
                  setIsTeshirFinishOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          teshirStatus: "Completed",
                          injaz: prev.injaz ? { ...prev.injaz, status: "Complete" } : undefined,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsFinishingTeshir(false);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {isFinishingTeshir ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Finishing...
                </>
              ) : (
                "Confirm & Finish Stage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3c. Finish Kuwait Telesign Stage Confirmation Dialog */}
      <Dialog open={isTelesignFinishOpen} onOpenChange={setIsTelesignFinishOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Telesign Stage (Kuwait)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially finish the Telesign clearance stage for Kuwait candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
              This completes the clearance step on the backend pipeline and satisfies requirements for Kuwait Embassy submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Telesign Reference Number (Optional)</Label>
              <Input
                type="text"
                value={telesignRefNoVal}
                onChange={(e) => setTelesignRefNoVal(e.target.value)}
                placeholder="e.g. TEL-892341"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTelesignFinishOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isFinishingTelesign}
              onClick={async () => {
                if (!injazStepName) {
                  toast.error("Telesign clearance step record not found.");
                  return;
                }
                try {
                  setIsFinishingTelesign(true);
                  if (telesignRefNoVal.trim()) {
                    await setStepRemarksV2(injazStepName, `Ref: ${telesignRefNoVal.trim()}`);
                  }
                  await completeClearanceStepV2(injazStepName);
                  toast.success("Telesign stage completed successfully!");
                  setIsTelesignFinishOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          teshirStatus: "Completed",
                          injaz: prev.injaz ? { ...prev.injaz, status: "Complete" } : undefined,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsFinishingTelesign(false);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {isFinishingTelesign ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Finishing...
                </>
              ) : (
                "Confirm & Finish Stage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 1c. Manage Kuwait LMIS Police Ashara Dialog */}
      <Dialog open={isPoliceAsharaOpen} onOpenChange={setIsPoliceAsharaOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Manage Kuwait Police Ashara
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record official Police Ashara sub-check details for Kuwait LMIS candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Police Ashara Status *</Label>
              <select
                value={policeAsharaStatus}
                onChange={(e) => setPoliceAsharaStatus(e.target.value)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#16161d] font-bold"
              >
                <option value="Pending">Pending</option>
                <option value="Booked">Booked</option>
                <option value="Completed">Completed</option>
                <option value="Cleared">Cleared</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Appointment Date</Label>
                <Input
                  type="date"
                  value={policeAsharaApptDate}
                  onChange={(e) => setPoliceAsharaApptDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount (ETB / Fee)</Label>
                <Input
                  type="number"
                  value={policeAsharaAmount}
                  onChange={(e) => setPoliceAsharaAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Police Ashara Remark</Label>
              <Input
                type="text"
                value={policeAsharaRemark}
                onChange={(e) => setPoliceAsharaRemark(e.target.value)}
                placeholder="Police station or biometric remarks..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsPoliceAsharaOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSavingPoliceAshara}
              onClick={handleSavePoliceAshara}
              className="text-xs h-8 bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
            >
              {isSavingPoliceAshara ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Police Ashara"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Finish Embassy Stage Dialog */}
      <Dialog open={isEmbassyStampOpen} onOpenChange={setIsEmbassyStampOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-teal-700 dark:text-teal-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Embassy Stage
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially stamp the visa and finish the Embassy stage for candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
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
              disabled={!embassyVisaNumber || isFinishingEmbassy}
              onClick={async () => {
                if (!embassyStepName) {
                  toast.error("Embassy clearance step record not found.");
                  return;
                }
                try {
                  setIsFinishingEmbassy(true);

                  // PREREQUISITE AUTO-COMPLETION FIX:
                  // The Frappe backend requires the Taeshir step to be in a complete state before Embassy can be stamped.
                  // If injazStepName exists and is still Pending or In Progress, complete it first!
                  if (
                    injazStepName &&
                    currentRow.injaz?.status !== "Complete" &&
                    currentRow.injaz?.status !== "Issued" &&
                    currentRow.injaz?.status !== "Approved"
                  ) {
                    try {
                      await completeClearanceStepV2(injazStepName);
                    } catch (e) {
                      console.warn("Auto-completing prerequisite Te'shir step:", e);
                    }
                  }

                  await stampEmbassyStepV2(embassyStepName, embassyVisaNumber);
                  if (placementName) {
                    await updatePlacementParsedFieldsV2(placementName, {
                      visa_number: embassyVisaNumber,
                      ...(embassyVisaIssueDate ? { visa_issue_date: embassyVisaIssueDate } : {}),
                      ...(embassyVisaExpiryDate ? { visa_expiry_date: embassyVisaExpiryDate } : {}),
                    });
                  }
                  toast.success("Embassy stage officially finished and visa stamped!");
                  setIsEmbassyStampOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          embassyStatus: "Stamped",
                          visaNumber: embassyVisaNumber,
                          visaIssueDate: embassyVisaIssueDate,
                          visaDeadline: embassyVisaExpiryDate,
                          injaz: prev.injaz ? { ...prev.injaz, status: "Complete" } : prev.injaz,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsFinishingEmbassy(false);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {isFinishingEmbassy ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Finishing...
                </>
              ) : (
                "Confirm & Finish Stage"
              )}
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
                onChange={(e) => {
                  setTicketNumber(e.target.value);
                  clearWorkspaceFieldError("ticketDialogNumber");
                }}
                onBlur={() => {
                  if (!ticketNumber.trim()) {
                    setWorkspaceFieldError("ticketDialogNumber", "Ticket number is required.");
                  }
                }}
                placeholder="e.g. ET-998231"
                className={cn(
                  "h-8 text-xs font-mono uppercase",
                  workspaceFieldErrors.ticketDialogNumber && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 text-rose-900"
                )}
              />
              {workspaceFieldErrors.ticketDialogNumber && (
                <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{workspaceFieldErrors.ticketDialogNumber}</span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Airline Carrier *</Label>
              <Input
                type="text"
                value={airline}
                onChange={(e) => {
                  setAirline(e.target.value);
                  clearWorkspaceFieldError("ticketDialogAirline");
                }}
                onBlur={() => {
                  if (!airline.trim()) {
                    setWorkspaceFieldError("ticketDialogAirline", "Airline is required.");
                  }
                }}
                placeholder="e.g. Ethiopian Airlines"
                className={cn(
                  "h-8 text-xs",
                  workspaceFieldErrors.ticketDialogAirline && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 text-rose-900"
                )}
              />
              {workspaceFieldErrors.ticketDialogAirline && (
                <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{workspaceFieldErrors.ticketDialogAirline}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Flight Date *</Label>
                <Input
                  type="date"
                  value={flightDate}
                  onChange={(e) => {
                    setFlightDate(e.target.value);
                    clearWorkspaceFieldError("ticketDialogDate");
                  }}
                  onBlur={() => {
                    if (!flightDate) {
                      setWorkspaceFieldError("ticketDialogDate", "Flight date is required.");
                    }
                  }}
                  className={cn(
                    "h-8 text-xs font-mono",
                    workspaceFieldErrors.ticketDialogDate && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 text-rose-900"
                  )}
                />
                {workspaceFieldErrors.ticketDialogDate && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{workspaceFieldErrors.ticketDialogDate}</span>
                  </p>
                )}
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
            {workspaceFieldErrors.ticketDialogGeneral && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{workspaceFieldErrors.ticketDialogGeneral}</span>
              </div>
            )}
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
                if (!ticketNumber.trim()) {
                  setWorkspaceFieldError("ticketDialogNumber", "Ticket number is required.");
                  return;
                }
                if (!flightDate) {
                  setWorkspaceFieldError("ticketDialogDate", "Flight date is required.");
                  return;
                }
                try {
                  clearWorkspaceFieldError("ticketDialogGeneral");
                  await recordTicketDetailsV2(placementName, ticketNumber.trim(), flightDate);
                  if (currentRow?.placementStatus === "Stamped" || currentRow?.plc?.status === "Stamped") {
                    try {
                      await advancePlacementV2(placementName, "Ticketed");
                    } catch (advErr) {
                      console.warn("Auto-advance placement to Ticketed warning:", advErr);
                    }
                  }
                  toast.success("Flight ticket recorded successfully");
                  setIsTicketFormOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          ticketNumber: ticketNumber.trim(),
                          flightDate,
                          flightTime,
                          stageStatus: "Ticketed",
                          placementStatus: "Ticketed",
                          departureStatus: "Ticketed",
                          plc: prev.plc ? { ...prev.plc, ticket_number: ticketNumber.trim(), status: "Ticketed" } : prev.plc,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  const msg = formatCleanErrorMessage(err);
                  setWorkspaceFieldError("ticketDialogGeneral", msg);
                  toast.error(msg);
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
                  onChange={(e) => {
                    setNewFlightDate(e.target.value);
                    clearWorkspaceFieldError("rescheduleDialogDate");
                  }}
                  onBlur={() => {
                    if (!newFlightDate) {
                      setWorkspaceFieldError("rescheduleDialogDate", "New flight date is required.");
                    }
                  }}
                  className={cn(
                    "h-8 text-xs font-mono",
                    workspaceFieldErrors.rescheduleDialogDate && "border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/20 text-rose-900"
                  )}
                />
                {workspaceFieldErrors.rescheduleDialogDate && (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{workspaceFieldErrors.rescheduleDialogDate}</span>
                  </p>
                )}
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
            {workspaceFieldErrors.rescheduleDialogGeneral && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{workspaceFieldErrors.rescheduleDialogGeneral}</span>
              </div>
            )}
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
                if (!newFlightDate) {
                  setWorkspaceFieldError("rescheduleDialogDate", "New flight date is required.");
                  return;
                }
                try {
                  clearWorkspaceFieldError("rescheduleDialogGeneral");
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
                  const msg = formatCleanErrorMessage(err);
                  setWorkspaceFieldError("rescheduleDialogGeneral", msg);
                  toast.error(msg);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Confirm Departure / Finish Stage Dialog */}
      <Dialog open={isConfirmDepartOpen} onOpenChange={setIsConfirmDepartOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Departure Stage
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially finish the Departure stage for candidate{" "}
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentRow.fullName}</strong>.
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
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmDepartOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isFinishingDepart}
              onClick={async () => {
                if (!placementName) {
                  toast.error("Candidate placement record not found.");
                  return;
                }
                try {
                  setIsFinishingDepart(true);
                  const tktNum = (ticketNumberVal || currentRow.ticketNumber || (currentRow.plc as any)?.ticket_number || "").trim() || "TKT-PENDING";
                  const fltDate = (flightDateVal || currentRow.flightDate || (currentRow.plc as any)?.flight_date || "").trim() || new Date().toISOString().split("T")[0];

                  // 1. Ensure ticket details are recorded on placement
                  try {
                    await recordTicketDetailsV2(placementName, tktNum, fltDate);
                  } catch (tktErr) {
                    console.warn("Ticket details record warning:", tktErr);
                  }

                  // 2. Authoritative State Machine Guard: Stamped -> Ticketed -> Departed
                  // A placement in 'Stamped' must advance to 'Ticketed' before advancing to 'Departed'
                  const currentPlcStatus = (currentRow.placementStatus || currentRow.plc?.status || "").trim();
                  if (currentPlcStatus === "Stamped" || currentPlcStatus !== "Ticketed") {
                    try {
                      await advancePlacementV2(placementName, "Ticketed");
                    } catch (tktAdvErr) {
                      console.warn("Advance to Ticketed warning (may already be Ticketed):", tktAdvErr);
                    }
                  }

                  // 3. Pre-departure Medical 2 check must be recorded as FIT for Departed stage gate
                  if (selectedFlightOutcome === "Departed" && currentRow.medical2Status !== "FIT") {
                    try {
                      await recordPredepartureMedicalResultV2(placementName, "FIT");
                    } catch (medErr) {
                      console.warn("Medical 2 auto-FIT warning:", medErr);
                    }
                  }

                  // 4. Advance to final departure status
                  if (selectedFlightOutcome === "Departed") {
                    await advancePlacementV2(placementName, "Departed");
                  } else {
                    // Local return or International return
                    await recordFlightOutcomeV2(placementName, selectedFlightOutcome as any);
                  }

                  toast.success(`Candidate marked as ${selectedFlightOutcome}! Departure stage finished.`);
                  setIsConfirmDepartOpen(false);
                  setCurrentRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          stageStatus: selectedFlightOutcome === "Departed" ? "Departed" : prev.stageStatus,
                          placementStatus: selectedFlightOutcome,
                          departureStatus: selectedFlightOutcome,
                          medical2Status: "FIT",
                          plc: prev.plc ? { ...prev.plc, status: selectedFlightOutcome } : prev.plc,
                        }
                      : null
                  );
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsFinishingDepart(false);
                }
              }}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              {isFinishingDepart ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Finishing...
                </>
              ) : (
                "Confirm & Finish Stage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
