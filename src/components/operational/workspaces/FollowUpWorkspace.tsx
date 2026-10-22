"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  Loader2,
  AlertTriangle,
  Download,
  Puzzle,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Check,
  Edit3,
  X,
  Lock,
  FileCheck2,
  CreditCard,
  Building2,
  Plane,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
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
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import {
  setLmisStatusV2,
  completeClearanceStepV2,
  recordPoliceAsharaV2,
  setTaeshirStatusV2,
  setTaeshirAppointmentV2,
  recordInjazPaymentV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
  setVisaIssueDateV2,
  recordWakalaPaymentV2,
  setStepRemarksV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2 } from "@/lib/api/v2/applicants";
import {
  recordTicketDetailsV2,
  advancePlacementV2,
  updatePlacementParsedFieldsV2,
  recordPredepartureMedicalResultV2,
  setTicketingRemarksV2,
} from "@/lib/api/v2/placements";
import { exportGroupScheduleBioXlsV2 } from "@/lib/api/v2/reports";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";

export interface StageValidationResult {
  isComplete: boolean;
  isPartial: boolean;
  missingFields: string[];
  fieldValues: {
    laborId?: string;
    issueDate?: string;
    cocStatus?: string;
    policeAsharaStatus?: string;
    policeAsharaDate?: string;
    policeAsharaRemark?: string;
    telesignRef?: string;
    injazApplicationId?: string;
    appointmentDate?: string;
    injazPaymentStatus?: string;
    visaNumber?: string;
    visaIssueDate?: string;
    wakalaStatus?: string;
    ticketNumber?: string;
    airline?: string;
    flightNumber?: string;
    departureDate?: string;
    departureTime?: string;
    [key: string]: any;
  };
}

export function checkLmisStageRequirements(row: WorkspaceApplicantRow): StageValidationResult {
  const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");

  // Labor / Reference ID: cannot be empty, cannot start with "APP-"
  const rawLaborId = (
    row.laborId ||
    row.lms?.referenceNo ||
    (row.lms as any)?.reference_no ||
    (row.applicant as any)?.labor_id ||
    ""
  ).trim();
  const cleanLaborId = rawLaborId.toUpperCase().startsWith("APP-") ? "" : rawLaborId;

  // Issue date: valid non-empty date (formatted YYYY-MM-DD)
  const rawIssueDate = (
    row.issueDate ||
    row.lms?.date_completed ||
    (row.lms as any)?.issued_on ||
    (row.lms as any)?.date_completed ||
    ""
  ).trim();
  const cleanIssueDate = rawIssueDate && rawIssueDate !== "—" ? (rawIssueDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawIssueDate) : "";
  const lmisRemark = (row.lms as any)?.remarks || "";

  const missingFields: string[] = [];

  if (!cleanLaborId) {
    missingFields.push(isKuwait ? "Labor / Reference ID" : "Labor ID / Reference No");
  }
  if (!cleanIssueDate) {
    missingFields.push(isKuwait ? "Completion / Issue Date" : "Approval / Issue Date");
  }

  if (isKuwait) {
    const rawPoliceStatus = (
      (row.lms as any)?.police_ashara_status ||
      row.policeAsharaStatus ||
      (row as any).police_ashara_status ||
      ""
    ).trim();
    const cleanPoliceStatus =
      rawPoliceStatus && rawPoliceStatus !== "—" ? rawPoliceStatus : "";

    const rawPoliceDate = (
      (row.lms as any)?.police_ashara_appointment_date ||
      row.policeAsharaDate ||
      (row as any).police_ashara_appointment_date ||
      ""
    ).trim();
    const cleanPoliceDate =
      rawPoliceDate && rawPoliceDate !== "—" ? (rawPoliceDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawPoliceDate) : "";

    const rawPoliceRemark = (
      (row.lms as any)?.police_ashara_remark ||
      row.policeAsharaRemark ||
      (row as any).police_ashara_remark ||
      ""
    ).trim();

    if (!cleanPoliceStatus || cleanPoliceStatus === "Pending") {
      missingFields.push("Police Ashara Status (Scheduled or Completed)");
    } else if (cleanPoliceStatus === "Failed" && !rawPoliceRemark) {
      missingFields.push("Police Ashara Remark (Required for Failed status)");
    }

    if (!cleanPoliceDate) {
      missingFields.push("Police Ashara Appointment Date");
    }

    const hasAnyField = Boolean(cleanLaborId || cleanIssueDate || cleanPoliceStatus || cleanPoliceDate);

    return {
      isComplete: missingFields.length === 0,
      isPartial: missingFields.length > 0 && hasAnyField,
      missingFields,
      fieldValues: {
        laborId: cleanLaborId,
        issueDate: cleanIssueDate,
        policeAsharaStatus: cleanPoliceStatus || "Pending",
        policeAsharaDate: cleanPoliceDate,
        policeAsharaRemark: rawPoliceRemark,
        lmisRemark,
      },
    };
  } else {
    // Saudi Arabia
    const rawCoc = (
      row.cocStatus ||
      (row.applicant as any)?.coc_status ||
      ""
    ).trim();
    const cleanCoc = rawCoc && rawCoc !== "—" && rawCoc !== "Not Started" ? rawCoc : "";

    if (!cleanCoc) {
      missingFields.push("COC Status");
    }

    const hasAnyField = Boolean(cleanLaborId || cleanIssueDate || cleanCoc);

    return {
      isComplete: missingFields.length === 0,
      isPartial: missingFields.length > 0 && hasAnyField,
      missingFields,
      fieldValues: {
        laborId: cleanLaborId,
        issueDate: cleanIssueDate,
        cocStatus: cleanCoc || (row.cocStatus === "Not Started" ? "Not Started" : "Pending"),
        lmisRemark,
      },
    };
  }
}

export function checkTaeshirStageRequirements(row: WorkspaceApplicantRow): StageValidationResult {
  const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
  const missingFields: string[] = [];

  if (isKuwait) {
    const rawRef = (row.teshirReferenceNo || row.injaz?.reference_no || "").trim();
    const cleanRef = rawRef && rawRef !== "—" ? rawRef : "";
    if (!cleanRef) missingFields.push("Telesign Reference Number");

    const telesignStatus = row.teshirStatus || (row.injaz as any)?.status || "Pending";
    const telesignRemark = (row.injaz as any)?.remarks || "";

    return {
      isComplete: missingFields.length === 0,
      isPartial: Boolean(cleanRef) && missingFields.length > 0,
      missingFields,
      fieldValues: {
        telesignRef: cleanRef,
        telesignStatus,
        telesignRemark,
      },
    };
  } else {
    const rawInjazId = (
      row.injazApplicantNumber ||
      row.injaz?.injaz_application_id ||
      (row.injaz as any)?.injaz_application_no ||
      ""
    ).trim();
    const cleanInjazId = rawInjazId && rawInjazId !== "—" ? rawInjazId : "";

    const rawApptDate = (row.appointmentDate || row.injaz?.appointment_date || "").trim();
    const cleanApptDate = rawApptDate && rawApptDate !== "—" ? (rawApptDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawApptDate) : "";

    const paymentVal = (
      row.injazPayment ||
      (row.injaz as any)?.injaz_payment_status ||
      (row.injaz as any)?.payment_status ||
      "Unpaid"
    ).trim();
    const normalizedPayment =
      paymentVal.toLowerCase() === "paid"
        ? "Paid"
        : paymentVal.toLowerCase() === "printed"
        ? "Printed"
        : "Unpaid";

    const teshirStatusVal = row.teshirStatus || (row.injaz as any)?.taeshir_status || "INFORMED";
    const teshirRemarkVal = (row.injaz as any)?.remarks || "";
    const isCompleted = row.teshirStatus === "Completed" || (row.injaz as any)?.status === "Complete";

    if (!cleanInjazId) missingFields.push("Injaz Application ID (E-Number)");
    if (!cleanApptDate) missingFields.push("Appointment Date");
    if (normalizedPayment !== "Paid") missingFields.push("Injaz Payment Status (Must be Paid)");

    const hasAny = Boolean(cleanInjazId || cleanApptDate || normalizedPayment === "Paid");

    return {
      isComplete: missingFields.length === 0,
      isPartial: missingFields.length > 0 && hasAny,
      missingFields,
      fieldValues: {
        injazApplicationId: cleanInjazId,
        appointmentDate: cleanApptDate,
        injazPaymentStatus: normalizedPayment,
        teshirStatus: teshirStatusVal,
        teshirCompleted: isCompleted ? "Completed" : "In Progress",
        teshirRemark: teshirRemarkVal,
      },
    };
  }
}

export function checkEmbassyStageRequirements(row: WorkspaceApplicantRow): StageValidationResult {
  const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
  const missingFields: string[] = [];

  const rawVisaNumber = (row.visaNumber || row.embassy?.reference_no || (row.plc as any)?.visa_number || "").trim();
  const cleanVisaNumber = rawVisaNumber && rawVisaNumber !== "—" ? rawVisaNumber : "";

  const rawIssueDate = (row.embassy?.date_completed || row.visaIssueDate || row.issueDate || "").trim();
  const cleanIssueDate = rawIssueDate && rawIssueDate !== "—" ? (rawIssueDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawIssueDate) : "";

  const rawSubmissionDate = (row.submissionDate || (row.embassy as any)?.date_started || (row.embassy as any)?.submission_date || "").trim();
  const cleanSubmissionDate = rawSubmissionDate && rawSubmissionDate !== "—" ? (rawSubmissionDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawSubmissionDate) : "";

  const rawDeadline = (row.visaDeadline || (row.plc as any)?.visa_expiry_date || (row.embassy as any)?.visa_deadline || "").trim();
  const cleanDeadline = rawDeadline && rawDeadline !== "—" ? (rawDeadline.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawDeadline) : "";

  const embassyRemarkVal = (row.embassy as any)?.remarks || "";

  if (!cleanVisaNumber) missingFields.push("Visa Number");
  if (!cleanIssueDate) missingFields.push("Visa Issue Date");

  let cleanWakala = "Pending";
  if (!isKuwait) {
    const rawWakala = (row.wakalaStatus || (row.embassy as any)?.wakala_status || "Pending").trim();
    cleanWakala = rawWakala.toLowerCase() === "paid" || rawWakala.toLowerCase() === "authorized" ? "Paid" : "Pending";
    if (cleanWakala !== "Paid") {
      missingFields.push("Wakala Payment Status (Must be Paid)");
    }
  }

  const hasAny = Boolean(cleanVisaNumber || cleanIssueDate || (cleanWakala === "Paid") || cleanSubmissionDate);

  return {
    isComplete: missingFields.length === 0,
    isPartial: missingFields.length > 0 && hasAny,
    missingFields,
    fieldValues: {
      visaNumber: cleanVisaNumber,
      visaIssueDate: cleanIssueDate,
      submissionDate: cleanSubmissionDate,
      visaDeadline: cleanDeadline,
      wakalaStatus: cleanWakala,
      embassyRemark: embassyRemarkVal,
    },
  };
}

export function checkDepartureStageRequirements(row: WorkspaceApplicantRow): StageValidationResult {
  const missingFields: string[] = [];

  const rawTicketNo = (row.ticketNumber || (row.ticket as any)?.ticket_number || (row.plc as any)?.ticket_number || "").trim();
  const cleanTicketNo = rawTicketNo && rawTicketNo !== "—" ? rawTicketNo : "";

  const rawAirline = (row.airline || (row.ticket as any)?.airline || (row.plc as any)?.airline || "").trim();
  const cleanAirline = rawAirline && rawAirline !== "—" ? rawAirline : "Ethiopian Airlines";

  const rawFlightNo = (row.flightNumber || (row.ticket as any)?.flight_number || (row.plc as any)?.flight_number || "").trim();
  const cleanFlightNo = rawFlightNo && rawFlightNo !== "—" ? rawFlightNo : "";

  const rawFlightDate = (row.flightDate || (row.ticket as any)?.departure_date || (row.plc as any)?.flight_date || "").trim();
  const cleanFlightDate = rawFlightDate && rawFlightDate !== "—" ? (rawFlightDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || rawFlightDate) : "";

  const rawFlightTime = (row.flightTime || (row.ticket as any)?.departure_time || (row.plc as any)?.flight_time || "").trim();
  const cleanFlightTime = rawFlightTime && rawFlightTime !== "—" ? rawFlightTime : "10:00";

  const med2 = (row.medical2Status || (row.plc as any)?.medical_2_status || "Pending").trim();
  const depStatus = (row.departureStatus || row.stageStatus || "Pending").trim();
  const ticketRemark = (row.plc as any)?.ticketing_remarks || (row.ticket as any)?.remarks || "";

  if (!cleanTicketNo) missingFields.push("Ticket Number");
  if (!cleanFlightDate) missingFields.push("Departure Date");
  if (med2 !== "FIT") missingFields.push("Medical 2 Result (Must be FIT)");

  const hasAny = Boolean(cleanTicketNo || cleanFlightDate || cleanAirline || cleanFlightNo);

  return {
    isComplete: missingFields.length === 0,
    isPartial: missingFields.length > 0 && hasAny,
    missingFields,
    fieldValues: {
      ticketNumber: cleanTicketNo,
      airline: cleanAirline,
      flightNumber: cleanFlightNo,
      departureDate: cleanFlightDate,
      departureTime: cleanFlightTime,
      medical2Status: med2,
      departureStatus: depStatus,
      ticketRemark,
    },
  };
}

interface FollowUpWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
  employees?: { name: string; full_name?: string; email?: string }[];
  availableCorridors?: string[];
}

function getStageBadgeVariant(stage: string): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" | "purple";
  className?: string;
} {
  switch (stage) {
    case "Registered":
      return { variant: "success" };
    case "CV Generated":
    case "Waiting to be Selected":
      return {
        variant: "neutral",
        className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
      };
    case "Selected":
      return { variant: "info" };
    case "Processing":
      return { variant: "warning" };
    case "Stamped":
      return {
        variant: "neutral",
        className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
      };
    case "Ticketed":
      return {
        variant: "neutral",
        className: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      };
    case "Departed":
      return {
        variant: "neutral",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold",
      };
    case "Draft":
      return { variant: "neutral" };
    case "Cancelled":
      return { variant: "destructive" };
    default:
      return { variant: "neutral" };
  }
}

function getStatusBadge(status?: string | null) {
  if (!status || status === "—") {
    return <span className="text-slate-400 font-mono text-[11px]">—</span>;
  }

  const s = status.trim();
  const lower = s.toLowerCase();

  if (["issued", "completed", "complete", "approved", "stamped", "paid", "fit", "departed"].includes(lower)) {
    return (
      <Badge variant="success" className="text-[10px] py-0 px-1.5 uppercase font-semibold">
        {s}
      </Badge>
    );
  }

  if (["in progress", "pending", "authorized", "scheduled", "ticketed"].includes(lower)) {
    return (
      <Badge variant="warning" className="text-[10px] py-0 px-1.5 uppercase font-semibold">
        {s}
      </Badge>
    );
  }

  if (["rejected", "cancelled", "unfit", "failed"].includes(lower)) {
    return (
      <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-semibold">
        {s}
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" className="text-[10px] py-0 px-1.5 font-medium">
      {s}
    </Badge>
  );
}

/**
 * Determines whether a candidate is eligible for Te'shir (.xls) export.
 * Rule: Candidate must strictly have reached the Processing stage (LMIS and Te'shir) or later
 * (Stamped, Ticketed, Departed) on the Saudi Arabia corridor.
 * Candidates in Selected stage, Registered, Draft, or Cancelled are strictly ineligible.
 */
export function isCandidateEligibleForTaeshir(row: WorkspaceApplicantRow): { eligible: boolean; reason?: string } {
  const stage = (row.stageStatus || "").toLowerCase().trim();

  // 1. Strict Stage Exclusion: Selected stage candidates can NEVER be exported for Te'shir
  if (stage === "selected") {
    return {
      eligible: false,
      reason: "Candidate is in the Selected stage and has not reached the Processing stage (LMIS and Te'shir). Therefore, cannot generate export Excel for Te'shir.",
    };
  }

  // 2. Intake / Pre-placement stages
  if (stage === "registered" || stage === "draft" || stage === "waiting to be selected" || stage === "cv generated") {
    return {
      eligible: false,
      reason: `Candidate is in the "${row.stageStatus || "Intake"}" stage and has not reached the Processing stage (LMIS and Te'shir). Therefore, cannot generate export Excel for Te'shir.`,
    };
  }

  // 3. Cancelled placements
  if (stage === "cancelled") {
    return {
      eligible: false,
      reason: "Candidate placement is Cancelled. Therefore, cannot generate export Excel for Te'shir.",
    };
  }

  // 4. Strict Corridor Exclusion: Saudi Arabia corridor only
  const country = (row.destinationCountry || "").toLowerCase().trim();
  if (country === "kuwait" || (country !== "" && !country.includes("saudi"))) {
    return {
      eligible: false,
      reason: "Candidate is on the Kuwait corridor. Te'shir export is exclusively for the Saudi Arabia corridor.",
    };
  }

  // 5. Post-Processing stages (Stamped, Ticketed, Departed) are already past Te'shir and qualified
  const isPostProcessing =
    ["stamped", "ticketed", "departed"].includes(stage) ||
    ["stamped", "ticketed", "departed"].includes((row.departureStatus || "").toLowerCase().trim()) ||
    (row.embassyStatus || "").toLowerCase().trim() === "stamped";
  if (isPostProcessing) {
    return { eligible: true };
  }

  // 6. Processing stage: candidate has reached clearance processing (LMIS and Te'shir)
  if (stage === "processing") {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Candidate is in the "${row.stageStatus || "Unknown"}" stage and has not reached the Processing stage (LMIS and Te'shir). Therefore, cannot generate export Excel for Te'shir.`,
  };
}

function FollowUpExtensionsDropdown({ row }: { row: WorkspaceApplicantRow }) {
  const [open, setOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");

  const handleSend = async (target: "LMIS" | "Taeshir" | "Musaned", label: string) => {
    setOpen(false);
    setIsSending(true);
    try {
      const candidatePayload = {
        ...(row.applicant || (row as any)),
        applicantId: row.applicantId,
        fullName: row.fullName,
        passportNumber: row.passportNumber,
        target_portal: target,
        extension_target: target,
      };
      const res = await sendApplicantToExtension(candidatePayload);
      if (res?.success) {
        toast.success(`${row.fullName} loaded into Extension (${label})!`);
      } else {
        toast.info(`Candidate dispatched to Extension (${label})`);
      }
    } catch (err: any) {
      toast.error(`Failed to send candidate to ${label}`, {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSending}
          onClick={(e) => e.stopPropagation()}
          className="h-5 px-1.5 text-[9.5px] font-bold text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 gap-0.5 shadow-2xs cursor-pointer"
          title="Send candidate data to browser extensions"
        >
          <Puzzle className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
          <span>Ext</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
        className="w-44 p-1 rounded-lg border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215] shadow-lg z-50"
      >
        <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-2 py-1 uppercase tracking-wider">
          Browser Extensions
        </div>
        <button
          type="button"
          onClick={() => handleSend("LMIS", "For LMIS")}
          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-zinc-200 hover:text-emerald-800 dark:hover:text-emerald-400 transition flex items-center justify-between cursor-pointer"
        >
          <span>For LMIS</span>
          <ExternalLink className="h-3 w-3 opacity-50" />
        </button>
        {!isKuwait && (
          <button
            type="button"
            onClick={() => handleSend("Taeshir", "For Taeshir")}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-zinc-200 hover:text-emerald-800 dark:hover:text-emerald-400 transition flex items-center justify-between cursor-pointer"
          >
            <span>For Taeshir</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function FollowUpWorkspace({
  data,
  isLoading,
  onRefresh,
  corridorFilter,
  onCorridorChange,
  employees = [],
  availableCorridors,
}: FollowUpWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authUser } = useAuth();

  // Stage Status Filter state (replaces generic All Statuses filter)
  const [stageFilter, setStageFilter] = React.useState<string>("ALL");

  const stageOptions = React.useMemo(() => [
    { value: "ALL", label: `All Stages (${data.length})` },
    { value: "Registered", label: "Stage: Registered" },
    { value: "Selected", label: "Stage: Selected" },
    { value: "Processing", label: "Stage: Processing (LMIS and Teashir)" },
    { value: "Stamped", label: "Stage: Stamped" },
    { value: "Ticketed", label: "Stage: Ticketed" },
    { value: "Departed", label: "Stage: Departed" },
    { value: "Cancelled", label: "Stage: Cancelled" },
  ], [data.length]);

  const filteredData = React.useMemo(() => {
    if (stageFilter === "ALL") return data;
    return data.filter(
      (r) => (r.stageStatus || "").toLowerCase() === stageFilter.toLowerCase()
    );
  }, [data, stageFilter]);

  // Candidate selection for Te'shir export
  const [selectedApplicantIds, setSelectedApplicantIds] = React.useState<Set<string>>(new Set());
  const [isExportingTaeshir, setIsExportingTaeshir] = React.useState(false);

  // Strictly filter candidates who have reached Te'shir stage or later
  const eligibleFilteredCandidates = React.useMemo(
    () => filteredData.filter((r) => isCandidateEligibleForTaeshir(r).eligible),
    [filteredData]
  );

  const eligibleFilteredIds = React.useMemo(
    () => eligibleFilteredCandidates.map((r) => r.applicantId).filter(Boolean),
    [eligibleFilteredCandidates]
  );

  const isAllSelected =
    eligibleFilteredIds.length > 0 &&
    eligibleFilteredIds.every((id) => selectedApplicantIds.has(id));
  const isSomeSelected =
    eligibleFilteredIds.some((id) => selectedApplicantIds.has(id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedApplicantIds(new Set());
    } else {
      if (eligibleFilteredIds.length === 0) {
        toast.error(
          "None of the candidates in the current view have reached the Processing stage (LMIS and Te'shir). Only candidates who have reached Processing stage or later on the Saudi corridor qualify for Te'shir export."
        );
        return;
      }
      setSelectedApplicantIds(new Set(eligibleFilteredIds));
      if (eligibleFilteredIds.length < filteredData.length) {
        const skippedCount = filteredData.length - eligibleFilteredIds.length;
        toast.info(
          `Selected ${eligibleFilteredIds.length} candidate${eligibleFilteredIds.length > 1 ? "s" : ""} qualified for Te'shir export. Skipped ${skippedCount} unqualified candidate${skippedCount > 1 ? "s" : ""} (must reach Processing stage).`
        );
      }
    }
  };

  const handleToggleRow = (row: WorkspaceApplicantRow) => {
    const { eligible, reason } = isCandidateEligibleForTaeshir(row);
    if (!eligible) {
      toast.error(
        `Not Qualified: "${row.fullName}" is not qualified and therefore cannot generate export Excel for Te'shir. ${reason}`,
        { duration: 5000 }
      );
      return;
    }
    setSelectedApplicantIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.applicantId)) {
        next.delete(row.applicantId);
      } else {
        next.add(row.applicantId);
      }
      return next;
    });
  };

  const handleExportTaeshir = async () => {
    try {
      setIsExportingTaeshir(true);
      const isSelective = selectedApplicantIds.size > 0;
      let applicantIds: string[] = [];

      if (isSelective) {
        // Double check all selected candidates are strictly eligible
        const selectedRows = filteredData.filter((r) =>
          selectedApplicantIds.has(r.applicantId)
        );
        const ineligibleRows = selectedRows.filter(
          (r) => !isCandidateEligibleForTaeshir(r).eligible
        );
        if (ineligibleRows.length > 0) {
          const names = ineligibleRows.map((r) => `"${r.fullName}" (${r.stageStatus || "Selected"})`).join(", ");
          toast.error(
            `Export rejected: The following candidate(s) are not qualified: ${names}. Only candidates who have reached the Processing stage (LMIS and Te'shir) can generate export Excel for Te'shir.`
          );
          return;
        }
        applicantIds = Array.from(selectedApplicantIds);
      } else {
        // Automatically export all candidates who reached Processing stage or later
        applicantIds = eligibleFilteredIds;
      }

      if (applicantIds.length === 0) {
        toast.error(
          "No candidates in the workspace have reached the Processing stage (LMIS and Te'shir) yet. Te'shir export requires candidates to be in Processing, Stamped, Ticketed, or Departed stage on the Saudi corridor."
        );
        return;
      }

      toast.info(
        isSelective
          ? `Exporting Te'shir schedule for ${applicantIds.length} selected candidate${applicantIds.length > 1 ? "s" : ""}...`
          : `Exporting Te'shir schedule for ${applicantIds.length} candidate${applicantIds.length > 1 ? "s" : ""} at Te'shir stage or later...`
      );

      const blob = await exportGroupScheduleBioXlsV2(applicantIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fallbackFilename = `Group_Schedule_Bio_Applicants_${new Date().toISOString().split("T")[0]}.xls`;
      a.download = (blob as any).filename || fallbackFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(
        isSelective
          ? `Export for Te'shir (.xls) downloaded successfully for ${applicantIds.length} selected candidate${applicantIds.length > 1 ? "s" : ""}!`
          : `Export for Te'shir (.xls) downloaded successfully for ${applicantIds.length} candidate${applicantIds.length > 1 ? "s" : ""} at Te'shir stage or later!`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Te'shir (.xls) file.");
    } finally {
      setIsExportingTaeshir(false);
    }
  };

  // --- PERMISSIONS & ROLES ---
  const authUserV2 = authUser
    ? {
        user: authUser.email,
        full_name: authUser.full_name || authUser.email,
        roles: Array.isArray(authUser.roles) ? authUser.roles : [],
      }
    : null;

  const isStrictAdmin = Boolean(
    (authUser?.email || "").toLowerCase() === "administrator" ||
      (authUser?.roles || []).some((r: any) =>
        ["admin", "administrator", "system manager"].includes(String(r).trim().toLowerCase())
      )
  );

  const isAdmin =
    isStrictAdmin ||
    (authUserV2?.roles || []).some((r: any) =>
      ["manager", "agency admin"].includes(String(r).trim().toLowerCase())
    );

  const isFollowUpOperator =
    isAdmin ||
    hasAnyV2Role(authUserV2, ["Manager", "Clearance Officer", "Placement Officer", "Agency Coordinator"]) ||
    (authUser?.roles || []).some((r: any) =>
      ["manager", "clearance", "placement", "follow-up", "followup", "coordinator", "officer"].some((k) =>
        String(r).toLowerCase().includes(k)
      )
    );

  const canEditLmis = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS"]);
  const canEditTaeshir = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign"]);
  const canEditEmbassy = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy"]);
  const canEditDeparture = isFollowUpOperator || hasAnyV2Role(authUserV2, ["Ticketer"]);

  // Quick rejection modal state for table inline edit
  const [tableRejectRow, setTableRejectRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [tableRejectReasons, setTableRejectReasons] = React.useState<string[]>([]);
  const [isSubmittingTableReject, setIsSubmittingTableReject] = React.useState(false);

  // Quick custom status (OTHER) modal state
  const [tableOtherRow, setTableOtherRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [tableOtherStatusText, setTableOtherStatusText] = React.useState<string>("");
  const [isSubmittingTableOther, setIsSubmittingTableOther] = React.useState(false);

  // --- STAGE COMPLETION & VALIDATION MODAL STATE (Cases A, B, C, D) ---
  interface StageModalState {
    open: boolean;
    mode: "confirm" | "edit";
    stage: "LMIS" | "KUWAIT_LMIS" | "TAESHIR" | "TELESIGN" | "EMBASSY" | "KUWAIT_EMBASSY" | "DEPARTURE";
    targetStatus: string;
    row: WorkspaceApplicantRow;
    validation: StageValidationResult;
  }

  const [stageModalState, setStageModalState] = React.useState<StageModalState | null>(null);
  const [isSubmittingStageAction, setIsSubmittingStageAction] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Stage form inputs
  const [formLaborId, setFormLaborId] = React.useState("");
  const [formIssueDate, setFormIssueDate] = React.useState("");
  const [formCocStatus, setFormCocStatus] = React.useState("Issued");
  const [formPoliceAsharaStatus, setFormPoliceAsharaStatus] = React.useState("Completed");
  const [formPoliceAsharaDate, setFormPoliceAsharaDate] = React.useState("");
  const [formPoliceAsharaRemark, setFormPoliceAsharaRemark] = React.useState("");
  const [formLmisRemark, setFormLmisRemark] = React.useState("");
  const [formTeshirRef, setFormTeshirRef] = React.useState("");
  const [formAppointmentDate, setFormAppointmentDate] = React.useState("");
  const [formInjazAppId, setFormInjazAppId] = React.useState("");
  const [formInjazPaymentStatus, setFormInjazPaymentStatus] = React.useState("Paid");
  const [formTeshirStatus, setFormTeshirStatus] = React.useState("INFORMED");
  const [formTeshirCompleted, setFormTeshirCompleted] = React.useState("In Progress");
  const [formTeshirRemark, setFormTeshirRemark] = React.useState("");
  const [formVisaNumber, setFormVisaNumber] = React.useState("");
  const [formSubmissionDate, setFormSubmissionDate] = React.useState("");
  const [formVisaValidUntil, setFormVisaValidUntil] = React.useState("");
  const [formWakalaStatus, setFormWakalaStatus] = React.useState("Paid");
  const [formEmbassyRemark, setFormEmbassyRemark] = React.useState("");
  const [formTicketNumber, setFormTicketNumber] = React.useState("");
  const [formAirline, setFormAirline] = React.useState("");
  const [formFlightNumber, setFormFlightNumber] = React.useState("");
  const [formDepartureDate, setFormDepartureDate] = React.useState("");
  const [formDepartureTime, setFormDepartureTime] = React.useState("");
  const [formMedical2Status, setFormMedical2Status] = React.useState("FIT");
  const [formDepartureStatus, setFormDepartureStatus] = React.useState("Scheduled");
  const [formTicketRemark, setFormTicketRemark] = React.useState("");

  // Invalidate queries helper
  const handleMutationSuccess = async (message: string) => {
    toast.success(message);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_queue"] }),
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
    ]);
    onRefresh();
  };

  // --- INLINE EXCEL HANDLERS ---

  // 1. LMIS Status Inline Save
  const handleSaveLmisStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
    const stepName =
      row.lms?.name ||
      row.clearanceStepName ||
      (row as any).siblingSteps?.find(
        (s: any) =>
          s.step_type?.toLowerCase().includes("lmis") ||
          s.step_type?.toLowerCase().includes("lms")
      )?.name;

    if (!stepName) {
      toast.error(
        `Cannot update LMIS status: Candidate "${row.fullName}" is in the "${row.stageStatus || "Intake"}" stage and has not reached the "Processing (LMIS and Teashir)" stage yet. Clearance steps are only initialized once an applicant is advanced to Processing.`
      );
      return;
    }

    if (row.lmisStatus === "ISSUED") {
      toast.error("An issued LMIS clearance step is finalized and cannot be relabelled.");
      return;
    }

    if (newStatus === "REJECTED") {
      setTableRejectRow(row);
      setTableRejectReasons([]);
      return;
    }

    if (newStatus === "OTHER") {
      setTableOtherRow(row);
      setTableOtherStatusText("");
      return;
    }

    if (newStatus === "ISSUED") {
      // 1. Intercept before normal status-update request is made
      // 2. Keep the existing displayed status in the table unchanged
      const validation = checkLmisStageRequirements(row);

      setFormLaborId(validation.fieldValues.laborId || "");
      setFormIssueDate(validation.fieldValues.issueDate || new Date().toISOString().split("T")[0]);
      setFormCocStatus(validation.fieldValues.cocStatus || "Issued");
      setFormPoliceAsharaStatus(validation.fieldValues.policeAsharaStatus || "Completed");
      setFormPoliceAsharaDate(validation.fieldValues.policeAsharaDate || new Date().toISOString().split("T")[0]);
      setFormPoliceAsharaRemark(validation.fieldValues.policeAsharaRemark || "");
      setFormLmisRemark(validation.fieldValues.lmisRemark || "");
      setFieldErrors({});

      if (validation.isComplete) {
        // Case B: All required info is already saved and valid -> Confirmation Modal
        setStageModalState({
          open: true,
          mode: "confirm",
          stage: isKuwait ? "KUWAIT_LMIS" : "LMIS",
          targetStatus: "ISSUED",
          row,
          validation,
        });
      } else {
        // Case A (Missing) & Case C (Partial/Invalid) -> Stage Editor Modal with validation
        setStageModalState({
          open: true,
          mode: "edit",
          stage: isKuwait ? "KUWAIT_LMIS" : "LMIS",
          targetStatus: "ISSUED",
          row,
          validation,
        });
      }
      return;
    }

    // Working statuses update (IN PROGRESS, PULLED, CHECKED, etc.)
    try {
      await setLmisStatusV2(stepName, newStatus);
      await handleMutationSuccess(`LMIS status updated to ${newStatus}`);
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
      throw err;
    }
  };

  // 2. Te'shir / Telesign Inline Save
  const handleSaveTeshirStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
    const stepName =
      row.injaz?.name ||
      (row as any).siblingSteps?.find(
        (s: any) =>
          s.step_type?.toLowerCase().includes("taeshir") ||
          s.step_type?.toLowerCase().includes("telesign") ||
          s.step_type?.toLowerCase().includes("injaz")
      )?.name;

    if (!stepName) {
      toast.error(`Cannot update Te'shir/Telesign: Candidate "${row.fullName}" has not reached the clearance processing stage yet.`);
      return;
    }

    if (row.teshirStatus === "Completed" || row.injaz?.status === "Complete") {
      toast.error("This stage is already complete and cannot be relabelled.");
      return;
    }

    if (newStatus === "Completed") {
      const validation = checkTaeshirStageRequirements(row);
      setFormTeshirRef(validation.fieldValues.telesignRef || "");
      setFormAppointmentDate(validation.fieldValues.appointmentDate || new Date().toISOString().split("T")[0]);
      setFormInjazAppId(validation.fieldValues.injazApplicationId || "");
      setFormInjazPaymentStatus(validation.fieldValues.injazPaymentStatus || "Paid");
      setFormTeshirStatus(validation.fieldValues.teshirStatus || "INFORMED");
      setFormTeshirCompleted(validation.fieldValues.teshirCompleted || "In Progress");
      setFormTeshirRemark(validation.fieldValues.teshirRemark || "");
      setFieldErrors({});

      if (validation.isComplete) {
        setStageModalState({
          open: true,
          mode: "confirm",
          stage: isKuwait ? "TELESIGN" : "TAESHIR",
          targetStatus: "Completed",
          row,
          validation,
        });
      } else {
        setStageModalState({
          open: true,
          mode: "edit",
          stage: isKuwait ? "TELESIGN" : "TAESHIR",
          targetStatus: "Completed",
          row,
          validation,
        });
      }
      return;
    }

    try {
      if (!isKuwait) {
        await setTaeshirStatusV2(stepName, newStatus);
      }
      await handleMutationSuccess(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
      throw err;
    }
  };

  // 3. Embassy Visa Inline Save
  const handleSaveEmbassyStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
    const stepName =
      row.embassy?.name ||
      (row as any).siblingSteps?.find((s: any) => s.step_type?.toLowerCase().includes("embassy"))?.name;

    if (!stepName) {
      toast.error(`Cannot update Embassy: Candidate "${row.fullName}" has not reached the embassy clearance stage yet.`);
      return;
    }

    if (row.embassyStatus === "Stamped" || row.embassy?.status === "Stamped") {
      toast.error("Visa is already stamped and cannot be relabelled.");
      return;
    }

    if (newStatus === "Stamped") {
      const validation = checkEmbassyStageRequirements(row);
      setFormVisaNumber(validation.fieldValues.visaNumber || "");
      setFormIssueDate(validation.fieldValues.visaIssueDate || new Date().toISOString().split("T")[0]);
      setFormSubmissionDate(validation.fieldValues.submissionDate || "");
      setFormVisaValidUntil(validation.fieldValues.visaDeadline || "");
      setFormWakalaStatus(validation.fieldValues.wakalaStatus || "Paid");
      setFormEmbassyRemark(validation.fieldValues.embassyRemark || "");
      setFieldErrors({});

      if (validation.isComplete) {
        setStageModalState({
          open: true,
          mode: "confirm",
          stage: isKuwait ? "KUWAIT_EMBASSY" : "EMBASSY",
          targetStatus: "Stamped",
          row,
          validation,
        });
      } else {
        setStageModalState({
          open: true,
          mode: "edit",
          stage: isKuwait ? "KUWAIT_EMBASSY" : "EMBASSY",
          targetStatus: "Stamped",
          row,
          validation,
        });
      }
      return;
    }

    if (newStatus === "Submitted") {
      try {
        await submitEmbassyStepV2(stepName);
        await handleMutationSuccess(`Embassy clearance submitted for ${row.fullName}`);
      } catch (err) {
        toast.error(formatCleanErrorMessage(err));
        throw err;
      }
      return;
    }

    if (newStatus === "Rejected") {
      const remark = window.prompt(`Enter mandatory rejection remark for ${row.fullName}:`);
      if (!remark || !remark.trim()) {
        toast.error("Rejection remark is required to reject an Embassy step.");
        return;
      }
      try {
        await rejectEmbassyStepV2(stepName, remark.trim());
        await handleMutationSuccess(`Embassy clearance rejected for ${row.fullName}`);
      } catch (err) {
        toast.error(formatCleanErrorMessage(err));
        throw err;
      }
      return;
    }
  };

  // 4. Departure Inline Save
  const handleSaveDepartureStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const placementName = row.placementName || row.placementId || row.dsrName;
    if (!placementName) {
      toast.error(`Placement record not found for "${row.fullName}".`);
      return;
    }

    if (row.departureStatus === "Departed" || row.stageStatus === "Departed") {
      toast.error("Candidate has already departed and stage is finalized.");
      return;
    }

    if (newStatus === "Departed") {
      const validation = checkDepartureStageRequirements(row);
      setFormTicketNumber(validation.fieldValues.ticketNumber || "");
      setFormAirline(validation.fieldValues.airline || "Ethiopian Airlines");
      setFormFlightNumber(validation.fieldValues.flightNumber || "");
      setFormDepartureDate(validation.fieldValues.departureDate || new Date().toISOString().split("T")[0]);
      setFormDepartureTime(validation.fieldValues.departureTime || "10:00");
      setFormMedical2Status(validation.fieldValues.medical2Status || "FIT");
      setFormDepartureStatus(validation.fieldValues.departureStatus || "Scheduled");
      setFormTicketRemark(validation.fieldValues.ticketRemark || "");
      setFieldErrors({});

      if (validation.isComplete) {
        setStageModalState({
          open: true,
          mode: "confirm",
          stage: "DEPARTURE",
          targetStatus: "Departed",
          row,
          validation,
        });
      } else {
        setStageModalState({
          open: true,
          mode: "edit",
          stage: "DEPARTURE",
          targetStatus: "Departed",
          row,
          validation,
        });
      }
      return;
    }
  };

  // --- STAGE ACTION MODAL SUBMISSION HANDLERS ---

  // Case B Submission: Confirmed directly since all required info is saved
  const handleConfirmStageAction = async () => {
    if (!stageModalState) return;
    const { row, stage, targetStatus } = stageModalState;
    const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");

    setIsSubmittingStageAction(true);
    try {
      if (stage === "LMIS" || stage === "KUWAIT_LMIS") {
        const stepName =
          row.lms?.name ||
          row.clearanceStepName ||
          (row as any).siblingSteps?.find(
            (s: any) =>
              s.step_type?.toLowerCase().includes("lmis") ||
              s.step_type?.toLowerCase().includes("lms")
          )?.name;
        if (!stepName) throw new Error("LMIS clearance step record not found.");

        const laborId = stageModalState.validation.fieldValues.laborId || undefined;
        const issueDate = stageModalState.validation.fieldValues.issueDate || new Date().toISOString().split("T")[0];

        await setLmisStatusV2(stepName, "ISSUED", undefined, laborId, issueDate);
        await completeClearanceStepV2(stepName, laborId, undefined, issueDate);

        await handleMutationSuccess(`LMIS clearance completed as ISSUED for ${row.fullName}`);
        setStageModalState(null);
      } else if (stage === "TAESHIR" || stage === "TELESIGN") {
        const stepName =
          row.injaz?.name ||
          (row as any).siblingSteps?.find(
            (s: any) =>
              s.step_type?.toLowerCase().includes("taeshir") ||
              s.step_type?.toLowerCase().includes("telesign") ||
              s.step_type?.toLowerCase().includes("injaz")
          )?.name;
        if (!stepName) throw new Error("Te'shir clearance step record not found.");

        const refNo = stageModalState.validation.fieldValues.telesignRef || undefined;
        await completeClearanceStepV2(stepName, refNo);

        await handleMutationSuccess(`Te'shir clearance marked as Complete for ${row.fullName}`);
        setStageModalState(null);
      } else if (stage === "EMBASSY" || stage === "KUWAIT_EMBASSY") {
        const stepName =
          row.embassy?.name ||
          (row as any).siblingSteps?.find((s: any) => s.step_type?.toLowerCase().includes("embassy"))?.name;
        if (!stepName) throw new Error("Embassy clearance step record not found.");

        const visaNumber = stageModalState.validation.fieldValues.visaNumber;
        await stampEmbassyStepV2(stepName, visaNumber);

        await handleMutationSuccess(`Embassy visa clearance stamped for ${row.fullName}`);
        setStageModalState(null);
      } else if (stage === "DEPARTURE") {
        const placementName = row.placementName || row.placementId || row.dsrName;
        if (!placementName) throw new Error("Placement record not found.");

        await advancePlacementV2(placementName, "Departed");
        await handleMutationSuccess(`Candidate ${row.fullName} marked as Departed`);
        setStageModalState(null);
      }
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
    } finally {
      setIsSubmittingStageAction(false);
    }
  };

  // Case A & C Submission: Save details and optionally invoke backend completion
  const handleSubmitStageEditor = async (andComplete: boolean = true) => {
    if (!stageModalState) return;
    const { row, stage } = stageModalState;
    const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
    const errors: Record<string, string> = {};

    if (andComplete) {
      if (stage === "LMIS" || stage === "KUWAIT_LMIS") {
        const trimmedLabor = formLaborId.trim();
        if (!trimmedLabor) {
          errors.laborId = "Labor / Reference ID is required.";
        } else if (trimmedLabor.toUpperCase().startsWith("APP-")) {
          errors.laborId = "Applicant ID (APP-...) cannot be used as Labor ID.";
        }

        if (!formIssueDate) {
          errors.issueDate = "Completion / Issue date is required.";
        }

        if (isKuwait) {
          if (!formPoliceAsharaStatus || formPoliceAsharaStatus === "Pending") {
            errors.policeAsharaStatus = "Police Ashara must be Scheduled or Completed.";
          }
          if (!formPoliceAsharaDate) {
            errors.policeAsharaDate = "Police Ashara appointment date is required.";
          }
          if (formPoliceAsharaStatus === "Failed" && !formPoliceAsharaRemark.trim()) {
            errors.policeAsharaRemark = "A remark is required when Police Ashara status is Failed.";
          }
        } else {
          if (!formCocStatus || formCocStatus === "Not Started") {
            errors.cocStatus = "COC status is required for Saudi Arabia corridor.";
          }
        }
      } else if (stage === "TAESHIR") {
        if (!formInjazAppId.trim()) errors.injazAppId = "Injaz E-Number is required.";
        if (!formAppointmentDate) errors.appointmentDate = "Appointment Date is required.";
        if (formInjazPaymentStatus.toLowerCase() !== "paid") errors.injazPaymentStatus = "Payment status must be Paid.";
      } else if (stage === "TELESIGN") {
        if (!formTeshirRef.trim()) errors.teshirRef = "Telesign Reference Number is required.";
      } else if (stage === "EMBASSY" || stage === "KUWAIT_EMBASSY") {
        if (!formVisaNumber.trim()) errors.visaNumber = "Visa Number is required.";
        if (!formIssueDate) errors.issueDate = "Visa Issue Date is required.";
        if (!isKuwait && formWakalaStatus.toLowerCase() !== "paid") errors.wakalaStatus = "Wakala Payment must be Paid.";
      } else if (stage === "DEPARTURE") {
        if (!formTicketNumber.trim()) errors.ticketNumber = "Ticket Number is required.";
        if (!formAirline.trim()) errors.airline = "Airline is required.";
        if (!formFlightNumber.trim()) errors.flightNumber = "Flight Number is required.";
        if (!formDepartureDate) errors.departureDate = "Departure Date is required.";
        if (formMedical2Status !== "FIT") errors.medical2Status = "Medical 2 result must be FIT before departing candidate.";
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        toast.error("Please fill in all required fields before completing the stage.");
        return;
      }
    }

    setFieldErrors({});
    setIsSubmittingStageAction(true);

    let stageDetailsSaved = false;
    try {
      if (stage === "LMIS" || stage === "KUWAIT_LMIS") {
        const stepName =
          row.lms?.name ||
          row.clearanceStepName ||
          (row as any).siblingSteps?.find(
            (s: any) =>
              s.step_type?.toLowerCase().includes("lmis") ||
              s.step_type?.toLowerCase().includes("lms")
          )?.name;
        if (!stepName) throw new Error("LMIS clearance step record not found.");

        const cleanLabor = formLaborId.trim();

        // 1. Save stage details
        if (isKuwait) {
          await recordPoliceAsharaV2(stepName, {
            police_ashara_status: formPoliceAsharaStatus,
            police_ashara_appointment_date: formPoliceAsharaDate,
            police_ashara_remark: formPoliceAsharaRemark.trim() || undefined,
          });
          if (cleanLabor) {
            await updateApplicantForLmisV2({
              applicant_name: row.applicantId,
              labor_id: cleanLabor,
            });
          }
        } else {
          await updateApplicantForLmisV2({
            applicant_name: row.applicantId,
            labor_id: cleanLabor,
            coc_status: formCocStatus,
          });
        }
        if (formLmisRemark.trim()) {
          await setStepRemarksV2(stepName, formLmisRemark.trim());
        }
        stageDetailsSaved = true;

        // 2. If completing stage
        if (andComplete) {
          await setLmisStatusV2(stepName, "ISSUED", undefined, cleanLabor, formIssueDate);
          await completeClearanceStepV2(stepName, cleanLabor, undefined, formIssueDate);
          await handleMutationSuccess(`LMIS clearance details saved and marked as ISSUED for ${row.fullName}`);
          setStageModalState(null);
        } else {
          await handleMutationSuccess(`LMIS stage details saved for ${row.fullName}`);
          setStageModalState(null);
        }
      } else if (stage === "TAESHIR") {
        const stepName =
          row.injaz?.name ||
          (row as any).siblingSteps?.find(
            (s: any) =>
              s.step_type?.toLowerCase().includes("taeshir") ||
              s.step_type?.toLowerCase().includes("injaz")
          )?.name;
        if (!stepName) throw new Error("Te'shir clearance step record not found.");

        if (formAppointmentDate || formInjazAppId.trim()) {
          await setTaeshirAppointmentV2(stepName, formAppointmentDate, formInjazAppId.trim());
        }
        if (formInjazPaymentStatus) {
          const injazStatus =
            formInjazPaymentStatus.toLowerCase() === "paid"
              ? "Paid"
              : formInjazPaymentStatus.toLowerCase() === "printed"
              ? "Printed"
              : "Unpaid";
          await recordInjazPaymentV2(stepName, injazStatus);
        }
        if (formTeshirStatus) {
          await setTaeshirStatusV2(stepName, formTeshirStatus);
        }
        if (formTeshirRemark.trim()) {
          await setStepRemarksV2(stepName, formTeshirRemark.trim());
        }
        stageDetailsSaved = true;

        if (andComplete || formTeshirCompleted === "Completed") {
          await completeClearanceStepV2(stepName);
          await handleMutationSuccess(`Te'shir stage completed for ${row.fullName}`);
          setStageModalState(null);
        } else {
          await handleMutationSuccess(`Te'shir stage details saved for ${row.fullName}`);
          setStageModalState(null);
        }
      } else if (stage === "TELESIGN") {
        const stepName =
          row.injaz?.name ||
          (row as any).siblingSteps?.find((s: any) => s.step_type?.toLowerCase().includes("telesign"))?.name;
        if (!stepName) throw new Error("Telesign clearance step record not found.");

        if (formTeshirRemark.trim()) {
          await setStepRemarksV2(stepName, formTeshirRemark.trim());
        }
        stageDetailsSaved = true;

        if (andComplete || formTeshirCompleted === "Completed") {
          await completeClearanceStepV2(stepName, formTeshirRef.trim());
          await handleMutationSuccess(`Telesign stage completed for ${row.fullName}`);
          setStageModalState(null);
        } else {
          if (formTeshirRef.trim()) {
            await completeClearanceStepV2(stepName, formTeshirRef.trim());
          }
          await handleMutationSuccess(`Telesign details saved for ${row.fullName}`);
          setStageModalState(null);
        }
      } else if (stage === "EMBASSY" || stage === "KUWAIT_EMBASSY") {
        const stepName =
          row.embassy?.name ||
          (row as any).siblingSteps?.find((s: any) => s.step_type?.toLowerCase().includes("embassy"))?.name;
        if (!stepName) throw new Error("Embassy clearance step record not found.");

        if (formIssueDate) {
          await setVisaIssueDateV2(stepName, formIssueDate);
        }
        if (!isKuwait && formWakalaStatus) {
          await recordWakalaPaymentV2(stepName, formWakalaStatus.toLowerCase() === "paid" ? "Paid" : "Pending");
        }
        if (formEmbassyRemark.trim()) {
          await setStepRemarksV2(stepName, formEmbassyRemark.trim());
        }

        const placementName = row.placementName || row.placementId || row.dsrName;
        if (placementName) {
          const parsedFields: any = {};
          if (formVisaNumber.trim()) parsedFields.visa_number = formVisaNumber.trim();
          if (formIssueDate) parsedFields.visa_issue_date = formIssueDate;
          if (formVisaValidUntil) parsedFields.visa_expiry_date = formVisaValidUntil;
          if (formSubmissionDate) parsedFields.submission_date = formSubmissionDate;
          if (Object.keys(parsedFields).length > 0) {
            await updatePlacementParsedFieldsV2(placementName, parsedFields);
          }
        }
        stageDetailsSaved = true;

        if (andComplete) {
          await stampEmbassyStepV2(stepName, formVisaNumber.trim());
          await handleMutationSuccess(`Embassy visa stamped for ${row.fullName}`);
          setStageModalState(null);
        } else {
          await handleMutationSuccess(`Embassy details saved for ${row.fullName}`);
          setStageModalState(null);
        }
      } else if (stage === "DEPARTURE") {
        const placementName = row.placementName || row.placementId || row.dsrName;
        if (!placementName) throw new Error("Placement record not found.");

        if (formTicketNumber.trim() && formDepartureDate) {
          await recordTicketDetailsV2(placementName, formTicketNumber.trim(), formDepartureDate, undefined, formDepartureTime || undefined);
        }
        if (formMedical2Status) {
          await recordPredepartureMedicalResultV2(placementName, formMedical2Status as any);
        }
        if (formTicketRemark.trim()) {
          await setTicketingRemarksV2(placementName, formTicketRemark.trim());
        }
        if (formAirline.trim() || formFlightNumber.trim()) {
          await updatePlacementParsedFieldsV2(placementName, {
            airline: formAirline.trim() || undefined,
            flight_number: formFlightNumber.trim() || undefined,
          });
        }
        stageDetailsSaved = true;

        if (andComplete || formDepartureStatus === "Departed") {
          await advancePlacementV2(placementName, "Departed");
          await handleMutationSuccess(`Candidate ${row.fullName} marked as Departed`);
          setStageModalState(null);
        } else {
          await handleMutationSuccess(`Departure ticket details saved for ${row.fullName}`);
          setStageModalState(null);
        }
      }
    } catch (err) {
      if (stageDetailsSaved && andComplete) {
        toast.error(
          `Stage details were saved successfully, but marking the stage as complete failed: ${formatCleanErrorMessage(err)}. Please retry.`
        );
      } else {
        toast.error(formatCleanErrorMessage(err));
      }
    } finally {
      setIsSubmittingStageAction(false);
    }
  };

  // Options for LMIS working status select dropdown
  const lmisOptions = React.useMemo(() => {
    return LMIS_WORKING_STATUSES.map((st) => ({
      value: st,
      label: st,
      badgeClass:
        st === "ISSUED"
          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
          : st === "REJECTED"
          ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
          : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200",
    }));
  }, []);

  const saudiTaeshirOptions = React.useMemo(() => [
    { value: "INFORMED", label: "INFORMED", badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300" },
    { value: "RECEIVED", label: "RECEIVED", badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300" },
    { value: "READY TO EMBASSY", label: "READY TO EMBASSY", badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300" },
    { value: "Completed", label: "Completed", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
  ], []);

  const kuwaitTelesignOptions = React.useMemo(() => [
    { value: "Pending", label: "Pending", badgeClass: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200" },
    { value: "Submitted", label: "Submitted", badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300" },
    { value: "Completed", label: "Completed", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
  ], []);

  const embassyOptions = React.useMemo(() => [
    { value: "Pending", label: "Pending", badgeClass: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200" },
    { value: "Submitted", label: "Submitted", badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300" },
    { value: "Stamped", label: "Stamped", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
    { value: "Rejected", label: "Rejected", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300" },
  ], []);

  const departureOptions = React.useMemo(() => [
    { value: "Pending", label: "Pending", badgeClass: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200" },
    { value: "Ticketed", label: "Ticketed", badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300" },
    { value: "Departed", label: "Departed", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold" },
  ], []);

  // Columns for Level 1 Table: Checkbox select, Number, and preserved exact approved order (14 columns)
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "select",
      header: (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isSomeSelected;
            }}
            onChange={handleToggleAll}
            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-800 focus:ring-emerald-500 cursor-pointer"
            aria-label="Select all candidates"
          />
        </div>
      ),
      width: "28px",
      align: "center",
      sortable: false,
      isReadOnly: true,
      cell: (row) => {
        const { eligible, reason } = isCandidateEligibleForTaeshir(row);
        const isSelected = selectedApplicantIds.has(row.applicantId);
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRow(row);
            }}
            title={
              eligible
                ? isSelected
                  ? "Deselect candidate"
                  : "Select candidate for Te'shir export"
                : `Ineligible: ${reason}`
            }
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleRow(row)}
              className={cn(
                "h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-800 focus:ring-emerald-500",
                eligible ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
              )}
              aria-label={`Select candidate ${row.fullName}`}
            />
          </div>
        );
      },
    },
    {
      id: "no",
      header: "NO",
      width: "32px",
      align: "center",
      sortable: false,
      isReadOnly: true,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
          {index ?? 1}
        </span>
      ),
    },
    // 1. Name
    {
      id: "name",
      header: "NAME",
      accessorKey: "fullName",
      width: "125px",
      isReadOnly: true,
      cell: (row) => (
        <div
          className="flex items-center gap-1.5 group cursor-pointer"
          title={`Click to view detailed workspace for ${row.fullName}`}
          onClick={() => router.push(`/applicants/${encodeURIComponent(row.applicantId)}/follow-up`)}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[9px] border border-emerald-300/40 uppercase group-hover:scale-105 transition-transform">
            {row.fullName?.substring(0, 2) || "A"}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[100px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors text-[11px]">
            {row.fullName}
          </span>
        </div>
      ),
    },
    // 2. Stage Status
    {
      id: "stageStatus",
      header: "STAGE",
      accessorKey: "stageStatus",
      width: "95px",
      isReadOnly: true,
      cell: (row) => {
        const stage = row.stageStatus || "Draft";
        const cfg = getStageBadgeVariant(stage);
        return (
          <Badge variant={cfg.variant} className={cn("text-[9.5px] py-0 px-1 font-semibold", cfg.className)}>
            {stage === "Processing" ? "Processing (LMIS and Teashir)" : stage}
          </Badge>
        );
      },
    },
    // 6. Duration
    {
      id: "duration",
      header: "DURATION",
      accessorKey: "contractDays",
      width: "55px",
      isReadOnly: true,
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 text-[10.5px]">
          {row.contractDays || (row.duration ? `${row.duration}d` : "—")}
        </span>
      ),
    },
    // 7. LMIS Status
    {
      id: "lmisStatus",
      header: "LMIS STATUS",
      accessorKey: "lmisStatus",
      width: "85px",
      cell: (row) => {
        const currentVal = row.lmisStatus || "Pending";
        const isIssued = currentVal === "ISSUED";
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={lmisOptions}
              onSave={(newVal) => handleSaveLmisStatus(row, newVal)}
              disabled={!canEditLmis || isIssued}
              ariaLabel="LMIS Working Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    // 6. Taeshir Status (Saudi) / Telesign Status (Kuwait)
    {
      id: "teshirStatus",
      header: "TAESHIR / TELESIGN",
      accessorKey: "teshirStatus",
      width: "85px",
      cell: (row) => {
        const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
        const status = row.teshirStatus || (isKuwait ? "Pending" : "—");
        const isComplete = status === "Completed" || row.injaz?.status === "Complete";
        const options = isKuwait ? kuwaitTelesignOptions : saudiTaeshirOptions;
        const hasStep = Boolean(
          row.injazStepName ||
          row.injaz?.name ||
          (row as any).siblingSteps?.some(
            (s: any) =>
              s.step_type?.toLowerCase().includes("taeshir") ||
              s.step_type?.toLowerCase().includes("telesign") ||
              s.step_type?.toLowerCase().includes("injaz")
          )
        );
        if (!canEditTaeshir || !hasStep) {
          return getStatusBadge(status);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={status}
              options={options}
              onSave={(newVal) => handleSaveTeshirStatus(row, newVal)}
              disabled={isComplete}
              ariaLabel="Te'shir / Telesign Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    // 11. Wakala Status
    {
      id: "wakalaStatus",
      header: "WAKALA STATUS",
      accessorKey: "wakalaStatus",
      width: "75px",
      isReadOnly: true,
      cell: (row) => {
        const isKuwait = (row.destinationCountry || "").toLowerCase().includes("kuwait");
        if (isKuwait) {
          return <span className="text-slate-400 font-mono text-[11px]" title="Not applicable for Kuwait">—</span>;
        }
        return getStatusBadge(row.wakalaStatus);
      },
    },
    // 12. Embassy/Visa Status
    {
      id: "embassyStatus",
      header: "EMBASSY / VISA",
      accessorKey: "embassyStatus",
      width: "80px",
      cell: (row) => {
        const currentVal = row.embassyStatus || "Pending";
        const isStamped = currentVal === "Stamped" || row.embassy?.status === "Stamped";
        const hasStep = Boolean(
          row.embassyStepName ||
          row.embassy?.name ||
          (row as any).siblingSteps?.some((s: any) => s.step_type?.toLowerCase().includes("embassy"))
        );
        if (!canEditEmbassy || !hasStep) {
          return getStatusBadge(currentVal);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={embassyOptions}
              onSave={(newVal) => handleSaveEmbassyStatus(row, newVal)}
              disabled={isStamped}
              ariaLabel="Embassy Visa Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    // Departure Status
    {
      id: "departureStatus",
      header: "DEPARTURE",
      accessorKey: "departureStatus",
      width: "75px",
      cell: (row) => {
        const currentVal = row.departureStatus || "Pending";
        const isDeparted = currentVal === "Departed" || row.stageStatus === "Departed";
        if (!canEditDeparture) {
          return getStatusBadge(currentVal);
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={departureOptions}
              onSave={(newVal) => handleSaveDepartureStatus(row, newVal)}
              disabled={isDeparted}
              ariaLabel="Departure Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    // Row Actions
    {
      id: "actions",
      header: "ACTION",
      width: "65px",
      align: "center",
      sortable: false,
      isReadOnly: true,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <FollowUpExtensionsDropdown row={row} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/applicants/${encodeURIComponent(row.applicantId)}/follow-up`)}
            className="h-6 w-6 rounded-md text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/60 transition cursor-pointer"
            title={`Open detailed operational workspace for ${row.fullName}`}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // Extra Header Actions: Export for Te'shir button + Filter by Stage Status
  const extraHeaderControls = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExportTaeshir}
        disabled={isExportingTaeshir || (selectedApplicantIds.size === 0 && eligibleFilteredIds.length === 0)}
        className="h-8 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
        title={
          selectedApplicantIds.size > 0
            ? `Export official Taeshir group bio (.xls) for ${selectedApplicantIds.size} selected candidate(s)`
            : `Export official Taeshir group bio (.xls) for all ${eligibleFilteredIds.length} candidate(s) at Te'shir stage or later`
        }
      >
        <Download className={cn("h-3.5 w-3.5", isExportingTaeshir && "animate-spin")} />
        <span>
          {selectedApplicantIds.size > 0
            ? `Export for Te'shir (${selectedApplicantIds.size})`
            : "Export for Te'shir"}
        </span>
      </Button>
      {selectedApplicantIds.size > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedApplicantIds(new Set())}
          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
          title="Clear candidate selection"
        >
          Clear
        </Button>
      )}
      <div className="min-w-[140px] sm:min-w-[160px]">
        <SimpleSelect
          value={stageFilter}
          onValueChange={setStageFilter}
          options={stageOptions}
          triggerClassName="h-8 px-2.5 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36] font-semibold whitespace-nowrap"
          aria-label="Filter by Stage Status"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* LEVEL 1: Compact Main Follow-up Table */}
      <OperationalTable
        title="Follow-up Tracking"
        subtitle="Operational summary workspace for later workflow stages (LMIS, Taeshir, Embassy, Medical 2, Departure)."
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        onRowClick={(row) => {
          router.push(`/applicants/${encodeURIComponent(row.applicantId)}/follow-up`);
        }}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
        availableCorridors={availableCorridors}
        hideStatusFilter={true}
        extraHeaderActions={extraHeaderControls}
      />

      {/* Quick In-Table LMIS Rejection Reasons Dialog */}
      <Dialog
        open={Boolean(tableRejectRow)}
        onOpenChange={(open) => !open && setTableRejectRow(null)}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 dark:text-rose-400">
              Select LMIS Rejection Reason(s)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Candidate: <strong className="uppercase">{tableRejectRow?.fullName}</strong>. Please select the official reason for rejecting this clearance step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            {LMIS_REJECTION_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-[#1a1a22] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={tableRejectReasons.includes(reason)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTableRejectReasons((prev) => [...prev, reason]);
                    } else {
                      setTableRejectReasons((prev) => prev.filter((r) => r !== reason));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="font-medium text-slate-800 dark:text-zinc-200">{reason}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTableRejectRow(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={tableRejectReasons.length === 0 || isSubmittingTableReject}
              onClick={async () => {
                if (!tableRejectRow) return;
                const stepName =
                  tableRejectRow.lms?.name ||
                  tableRejectRow.clearanceStepName ||
                  (tableRejectRow as any).siblingSteps?.find(
                    (s: any) =>
                      s.step_type?.toLowerCase().includes("lmis") ||
                      s.step_type?.toLowerCase().includes("lms")
                  )?.name;
                if (!stepName) return;
                try {
                  setIsSubmittingTableReject(true);
                  await setLmisStatusV2(stepName, "REJECTED", tableRejectReasons);
                  await handleMutationSuccess(`LMIS clearance rejected for ${tableRejectRow.fullName}`);
                  setTableRejectRow(null);
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsSubmittingTableReject(false);
                }
              }}
              className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white"
            >
              {isSubmittingTableReject ? "Saving..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick In-Table LMIS Custom Status (OTHER) Dialog */}
      <Dialog
        open={Boolean(tableOtherRow)}
        onOpenChange={(open) => !open && setTableOtherRow(null)}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Specify Custom LMIS Status
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Candidate: <strong className="uppercase">{tableOtherRow?.fullName}</strong>. Enter the specific status description (up to 140 characters).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <input
              type="text"
              maxLength={140}
              value={tableOtherStatusText}
              onChange={(e) => setTableOtherStatusText(e.target.value)}
              placeholder="e.g. Awaiting biometric re-capture..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white"
            />
            <div className="text-right text-[10px] text-slate-400">
              {tableOtherStatusText.length}/140 characters
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTableOtherRow(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!tableOtherStatusText.trim() || isSubmittingTableOther}
              onClick={async () => {
                if (!tableOtherRow) return;
                const stepName =
                  tableOtherRow.lms?.name ||
                  tableOtherRow.clearanceStepName ||
                  (tableOtherRow as any).siblingSteps?.find(
                    (s: any) =>
                      s.step_type?.toLowerCase().includes("lmis") ||
                      s.step_type?.toLowerCase().includes("lms")
                  )?.name;
                if (!stepName) return;
                try {
                  setIsSubmittingTableOther(true);
                  await setLmisStatusV2(stepName, "OTHER", undefined, undefined, undefined, tableOtherStatusText.trim());
                  await handleMutationSuccess(`LMIS custom status set for ${tableOtherRow.fullName}`);
                  setTableOtherRow(null);
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                } finally {
                  setIsSubmittingTableOther(false);
                }
              }}
              className="text-xs h-8 bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              {isSubmittingTableOther ? "Saving..." : "Save Custom Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Stage Completion & Validation Modal (Case A, B, C, D) */}
      <Dialog
        open={Boolean(stageModalState?.open)}
        onOpenChange={(open) => {
          if (!open) {
            setStageModalState(null);
            setFieldErrors({});
          }
        }}
      >
        <DialogContent className="max-w-lg bg-white dark:bg-[#141419] border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-5">
          {stageModalState && (
            <>
              {/* Header */}
              <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-2 rounded-xl",
                      stageModalState.mode === "confirm"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                    )}>
                      {stageModalState.stage.includes("LMIS") && <FileCheck2 className="h-5 w-5" />}
                      {stageModalState.stage.includes("TAESHIR") && <CreditCard className="h-5 w-5" />}
                      {stageModalState.stage.includes("TELESIGN") && <CreditCard className="h-5 w-5" />}
                      {stageModalState.stage.includes("EMBASSY") && <Building2 className="h-5 w-5" />}
                      {stageModalState.stage.includes("DEPARTURE") && <Plane className="h-5 w-5" />}
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                        {stageModalState.mode === "confirm" ? (
                          <>Confirm Stage Completion</>
                        ) : (
                          <>Validate Stage Information</>
                        )}
                      </DialogTitle>
                      <DialogDescription asChild>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          Candidate: <strong className="text-slate-800 dark:text-zinc-200 font-semibold uppercase">{stageModalState.row.fullName}</strong>
                          {" • "}
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {stageModalState.stage.replace("_", " ")}
                          </span>
                          {" • "}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                            {(stageModalState.row.destinationCountry || "").toLowerCase().includes("kuwait") ? "Kuwait" : "Saudi Arabia"}
                          </Badge>
                        </div>
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Body */}
              <div className="py-3 text-xs space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {stageModalState.mode === "confirm" ? (
                  /* --- CASE B: ALL REQUIRED INFORMATION ALREADY SAVED & VALID --- */
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs">
                          All Required Information Is Saved
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                          This stage has all verified mandatory information saved on the record. Confirm below to complete the transition to <span className="font-bold underline">{stageModalState.targetStatus}</span> on the backend.
                        </p>
                      </div>
                    </div>

                    {/* Summary of Saved Information */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-[#181820] space-y-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                        Verified Saved Details
                      </div>
                      
                      {(stageModalState.stage === "LMIS" || stageModalState.stage === "KUWAIT_LMIS") && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Labor / Reference ID:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.laborId || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Completion / Issue Date:</span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.issueDate || "—"}
                            </span>
                          </div>
                          {stageModalState.stage === "LMIS" && (
                            <div>
                              <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">COC Status:</span>
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 font-semibold">
                                {stageModalState.validation.fieldValues.cocStatus || "Issued"}
                              </Badge>
                            </div>
                          )}
                          {stageModalState.stage === "KUWAIT_LMIS" && (
                            <>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Police Ashara Status:</span>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 font-semibold">
                                  {stageModalState.validation.fieldValues.policeAsharaStatus || "Completed"}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Police Ashara Appt:</span>
                                <span className="font-mono text-slate-900 dark:text-white">
                                  {stageModalState.validation.fieldValues.policeAsharaDate || "—"}
                                </span>
                              </div>
                            </>
                          )}
                          {stageModalState.validation.fieldValues.lmisRemark && (
                            <div className="col-span-2">
                              <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">LMIS Remark:</span>
                              <span className="text-slate-700 dark:text-zinc-300 text-[11px]">
                                {stageModalState.validation.fieldValues.lmisRemark}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(stageModalState.stage === "TAESHIR" || stageModalState.stage === "TELESIGN") && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {stageModalState.stage === "TAESHIR" ? (
                            <>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Injaz E-Number:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {stageModalState.validation.fieldValues.injazApplicationId || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Appointment Date:</span>
                                <span className="font-mono text-slate-900 dark:text-white">
                                  {stageModalState.validation.fieldValues.appointmentDate || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Payment Status:</span>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 font-semibold">
                                  {stageModalState.validation.fieldValues.injazPaymentStatus || "Paid"}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Te&apos;shir Status:</span>
                                <Badge variant="outline" className="text-blue-700 border-blue-300 dark:border-blue-700 font-semibold">
                                  {stageModalState.validation.fieldValues.teshirStatus || "INFORMED"}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Te&apos;shir Completed:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {stageModalState.validation.fieldValues.teshirCompleted || "In Progress"}
                                </span>
                              </div>
                              {stageModalState.validation.fieldValues.teshirRemark && (
                                <div>
                                  <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Te&apos;shir Remark:</span>
                                  <span className="text-slate-700 dark:text-zinc-300 text-[11px]">
                                    {stageModalState.validation.fieldValues.teshirRemark}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Telesign Reference:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {stageModalState.validation.fieldValues.telesignRef || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Telesign Status:</span>
                                <Badge variant="outline" className="text-blue-700 border-blue-300 dark:border-blue-700 font-semibold">
                                  {stageModalState.validation.fieldValues.telesignStatus || "Pending"}
                                </Badge>
                              </div>
                              {stageModalState.validation.fieldValues.telesignRemark && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Telesign Remark:</span>
                                  <span className="text-slate-700 dark:text-zinc-300 text-[11px]">
                                    {stageModalState.validation.fieldValues.telesignRemark}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {(stageModalState.stage === "EMBASSY" || stageModalState.stage === "KUWAIT_EMBASSY") && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Visa Number:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.visaNumber || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Visa Issue Date:</span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.visaIssueDate || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Embassy Submission Date:</span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.submissionDate || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Visa Deadline:</span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.visaDeadline || "—"}
                            </span>
                          </div>
                          {stageModalState.stage === "EMBASSY" && (
                            <div>
                              <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Wakala Payment:</span>
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 font-semibold">
                                {stageModalState.validation.fieldValues.wakalaStatus || "Paid"}
                              </Badge>
                            </div>
                          )}
                          {stageModalState.validation.fieldValues.embassyRemark && (
                            <div className="col-span-2">
                              <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Embassy Remark:</span>
                              <span className="text-slate-700 dark:text-zinc-300 text-[11px]">
                                {stageModalState.validation.fieldValues.embassyRemark}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {stageModalState.stage === "DEPARTURE" && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Ticket Number:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.ticketNumber || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Airline & Flight:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.airline} ({stageModalState.validation.fieldValues.flightNumber})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Departure Date & Time:</span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.departureDate} {stageModalState.validation.fieldValues.departureTime ? `at ${stageModalState.validation.fieldValues.departureTime}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Medical 2 Result:</span>
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 font-semibold">
                              {stageModalState.validation.fieldValues.medical2Status || "FIT"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Departure Status:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {stageModalState.validation.fieldValues.departureStatus || "Scheduled"}
                            </span>
                          </div>
                          {stageModalState.validation.fieldValues.ticketRemark && (
                            <div className="col-span-2">
                              <span className="text-slate-500 dark:text-zinc-400 block text-[10.5px]">Ticket Remark:</span>
                              <span className="text-slate-700 dark:text-zinc-300 text-[11px]">
                                {stageModalState.validation.fieldValues.ticketRemark}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* --- CASE A & C: MISSING OR PARTIAL/INVALID INFORMATION --- */
                  <div className="space-y-3.5">
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-200 text-xs">
                          {stageModalState.validation.isPartial
                            ? "Incomplete Stage Information"
                            : "Required Information Missing"}
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                          The required fields below must be provided and validated before this stage can be marked as <span className="font-bold underline">{stageModalState.targetStatus}</span>.
                        </p>
                        {stageModalState.validation.missingFields.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {stageModalState.validation.missingFields.map((field) => (
                              <Badge key={field} variant="destructive" className="text-[9.5px] py-0 px-1.5 font-medium">
                                Missing: {field}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage Specific Input Fields */}
                    {(stageModalState.stage === "LMIS" || stageModalState.stage === "KUWAIT_LMIS") && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Labor ID / Reference No <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={formLaborId}
                            onChange={(e) => {
                              setFormLaborId(e.target.value);
                              if (fieldErrors.laborId) setFieldErrors((prev) => ({ ...prev, laborId: "" }));
                            }}
                            placeholder="e.g. LAB-2026-9812"
                            className={cn(
                              "h-8 text-xs font-mono",
                              fieldErrors.laborId && "border-rose-500 focus-visible:ring-rose-500"
                            )}
                          />
                          {fieldErrors.laborId && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                              {fieldErrors.laborId}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Official Ministry labor reference or contract number (cannot be applicant ID).
                          </p>
                        </div>

                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Approval / Issue Date <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={formIssueDate}
                            onChange={(e) => {
                              setFormIssueDate(e.target.value);
                              if (fieldErrors.issueDate) setFieldErrors((prev) => ({ ...prev, issueDate: "" }));
                            }}
                            className={cn(
                              "h-8 text-xs font-mono",
                              fieldErrors.issueDate && "border-rose-500 focus-visible:ring-rose-500"
                            )}
                          />
                          {fieldErrors.issueDate && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                              {fieldErrors.issueDate}
                            </p>
                          )}
                        </div>

                        {stageModalState.stage === "LMIS" ? (
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              COC Status <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <select
                              value={formCocStatus}
                              onChange={(e) => {
                                setFormCocStatus(e.target.value);
                                if (fieldErrors.cocStatus) setFieldErrors((prev) => ({ ...prev, cocStatus: "" }));
                              }}
                              className={cn(
                                "w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium",
                                fieldErrors.cocStatus && "border-rose-500"
                              )}
                            >
                              <option value="Issued">Issued (Certified)</option>
                              <option value="Certified">Certified</option>
                              <option value="In Training">In Training</option>
                              <option value="Pending">Pending</option>
                              <option value="Exempt">Exempt</option>
                            </select>
                            {fieldErrors.cocStatus && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                {fieldErrors.cocStatus}
                              </p>
                            )}
                          </div>
                        ) : (
                          /* Kuwait LMIS Police Ashara fields */
                          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-zinc-800">
                            <div>
                              <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                Police Ashara Status <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <select
                                value={formPoliceAsharaStatus}
                                onChange={(e) => {
                                  setFormPoliceAsharaStatus(e.target.value);
                                  if (fieldErrors.policeAsharaStatus) setFieldErrors((prev) => ({ ...prev, policeAsharaStatus: "" }));
                                }}
                                className={cn(
                                  "w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium",
                                  fieldErrors.policeAsharaStatus && "border-rose-500"
                                )}
                              >
                                <option value="Completed">Completed</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Pending">Pending</option>
                                <option value="Failed">Failed</option>
                              </select>
                              {fieldErrors.policeAsharaStatus && (
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                  {fieldErrors.policeAsharaStatus}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                Police Ashara Appointment Date <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                type="date"
                                value={formPoliceAsharaDate}
                                onChange={(e) => {
                                  setFormPoliceAsharaDate(e.target.value);
                                  if (fieldErrors.policeAsharaDate) setFieldErrors((prev) => ({ ...prev, policeAsharaDate: "" }));
                                }}
                                className={cn(
                                  "h-8 text-xs font-mono",
                                  fieldErrors.policeAsharaDate && "border-rose-500 focus-visible:ring-rose-500"
                                )}
                              />
                              {fieldErrors.policeAsharaDate && (
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                  {fieldErrors.policeAsharaDate}
                                </p>
                              )}
                            </div>

                            {formPoliceAsharaStatus === "Failed" && (
                              <div>
                                <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                  Police Ashara Failure Remark <span className="text-rose-500 font-bold">*</span>
                                </Label>
                                <Input
                                  type="text"
                                  value={formPoliceAsharaRemark}
                                  onChange={(e) => {
                                    setFormPoliceAsharaRemark(e.target.value);
                                    if (fieldErrors.policeAsharaRemark) setFieldErrors((prev) => ({ ...prev, policeAsharaRemark: "" }));
                                  }}
                                  placeholder="Reason for failure..."
                                  className={cn(
                                    "h-8 text-xs",
                                    fieldErrors.policeAsharaRemark && "border-rose-500 focus-visible:ring-rose-500"
                                  )}
                                />
                                {fieldErrors.policeAsharaRemark && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                    {fieldErrors.policeAsharaRemark}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            LMIS Remark
                          </Label>
                          <Input
                            type="text"
                            value={formLmisRemark}
                            onChange={(e) => setFormLmisRemark(e.target.value)}
                            placeholder="Remarks for LMIS clearance..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {stageModalState.stage === "TAESHIR" && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Injaz Application ID (E-Number) <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={formInjazAppId}
                            onChange={(e) => {
                              setFormInjazAppId(e.target.value);
                              if (fieldErrors.injazAppId) setFieldErrors((prev) => ({ ...prev, injazAppId: "" }));
                            }}
                            placeholder="e.g. E98234190"
                            className={cn("h-8 text-xs font-mono", fieldErrors.injazAppId && "border-rose-500")}
                          />
                          {fieldErrors.injazAppId && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.injazAppId}</p>
                          )}
                        </div>
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Taeshir Appointment Date <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={formAppointmentDate}
                            onChange={(e) => {
                              setFormAppointmentDate(e.target.value);
                              if (fieldErrors.appointmentDate) setFieldErrors((prev) => ({ ...prev, appointmentDate: "" }));
                            }}
                            className={cn("h-8 text-xs font-mono", fieldErrors.appointmentDate && "border-rose-500")}
                          />
                          {fieldErrors.appointmentDate && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.appointmentDate}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Injaz Payment Status <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <select
                              value={formInjazPaymentStatus}
                              onChange={(e) => setFormInjazPaymentStatus(e.target.value)}
                              className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Printed">Printed</option>
                              <option value="Unpaid">Unpaid</option>
                            </select>
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Te&apos;shir Status
                            </Label>
                            <select
                              value={formTeshirStatus}
                              onChange={(e) => setFormTeshirStatus(e.target.value)}
                              className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium"
                            >
                              <option value="INFORMED">INFORMED</option>
                              <option value="RECEIVED">RECEIVED</option>
                              <option value="SUBMITTED">SUBMITTED</option>
                              <option value="BIOMETRICS">BIOMETRICS</option>
                              <option value="MEDICAL">MEDICAL</option>
                              <option value="CONTRACT">CONTRACT</option>
                              <option value="READY TO EMBASSY">READY TO EMBASSY</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Te&apos;shir Completed
                          </Label>
                          <select
                            value={formTeshirCompleted}
                            onChange={(e) => setFormTeshirCompleted(e.target.value)}
                            className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium"
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Te&apos;shir Remark
                          </Label>
                          <Input
                            type="text"
                            value={formTeshirRemark}
                            onChange={(e) => setFormTeshirRemark(e.target.value)}
                            placeholder="Remarks for Te'shir..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {stageModalState.stage === "TELESIGN" && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Telesign Reference Number <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={formTeshirRef}
                            onChange={(e) => {
                              setFormTeshirRef(e.target.value);
                              if (fieldErrors.teshirRef) setFieldErrors((prev) => ({ ...prev, teshirRef: "" }));
                            }}
                            placeholder="e.g. TL-8912304"
                            className={cn("h-8 text-xs font-mono", fieldErrors.teshirRef && "border-rose-500")}
                          />
                          {fieldErrors.teshirRef && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.teshirRef}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Telesign Status
                            </Label>
                            <select
                              value={formTeshirStatus}
                              onChange={(e) => setFormTeshirStatus(e.target.value)}
                              className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Telesign Remark
                            </Label>
                            <Input
                              type="text"
                              value={formTeshirRemark}
                              onChange={(e) => setFormTeshirRemark(e.target.value)}
                              placeholder="Remarks for Telesign..."
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(stageModalState.stage === "EMBASSY" || stageModalState.stage === "KUWAIT_EMBASSY") && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Visa Number <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={formVisaNumber}
                            onChange={(e) => {
                              setFormVisaNumber(e.target.value);
                              if (fieldErrors.visaNumber) setFieldErrors((prev) => ({ ...prev, visaNumber: "" }));
                            }}
                            placeholder="e.g. 1309824102"
                            className={cn("h-8 text-xs font-mono", fieldErrors.visaNumber && "border-rose-500")}
                          />
                          {fieldErrors.visaNumber && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.visaNumber}</p>
                          )}
                        </div>
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Visa Issue Date <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={formIssueDate}
                            onChange={(e) => {
                              setFormIssueDate(e.target.value);
                              if (fieldErrors.issueDate) setFieldErrors((prev) => ({ ...prev, issueDate: "" }));
                            }}
                            className={cn("h-8 text-xs font-mono", fieldErrors.issueDate && "border-rose-500")}
                          />
                          {fieldErrors.issueDate && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.issueDate}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Embassy Submission Date
                            </Label>
                            <Input
                              type="date"
                              value={formSubmissionDate}
                              onChange={(e) => setFormSubmissionDate(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Visa Deadline (Valid Until)
                            </Label>
                            <Input
                              type="date"
                              value={formVisaValidUntil}
                              onChange={(e) => setFormVisaValidUntil(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        {stageModalState.stage === "EMBASSY" && (
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Wakala Payment Status <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <select
                              value={formWakalaStatus}
                              onChange={(e) => setFormWakalaStatus(e.target.value)}
                              className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Pending">Pending</option>
                            </select>
                            {fieldErrors.wakalaStatus && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.wakalaStatus}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Embassy Remark
                          </Label>
                          <Input
                            type="text"
                            value={formEmbassyRemark}
                            onChange={(e) => setFormEmbassyRemark(e.target.value)}
                            placeholder="Remarks for Embassy step..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {stageModalState.stage === "DEPARTURE" && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Ticket Number <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={formTicketNumber}
                            onChange={(e) => setFormTicketNumber(e.target.value)}
                            placeholder="e.g. ET-071-891230491"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Medical 2 Result <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <select
                              value={formMedical2Status}
                              onChange={(e) => setFormMedical2Status(e.target.value)}
                              className={cn(
                                "w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium",
                                fieldErrors.medical2Status && "border-rose-500"
                              )}
                            >
                              <option value="FIT">FIT</option>
                              <option value="UNFIT">UNFIT</option>
                              <option value="Pending">Pending</option>
                            </select>
                            {fieldErrors.medical2Status && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{fieldErrors.medical2Status}</p>
                            )}
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Departure Status
                            </Label>
                            <select
                              value={formDepartureStatus}
                              onChange={(e) => setFormDepartureStatus(e.target.value)}
                              className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a22] text-slate-900 dark:text-white font-medium"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="Ticketed">Ticketed</option>
                              <option value="Departed">Departed</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Airline <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <Input
                              type="text"
                              value={formAirline}
                              onChange={(e) => setFormAirline(e.target.value)}
                              placeholder="e.g. Ethiopian Airlines"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Flight Number <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <Input
                              type="text"
                              value={formFlightNumber}
                              onChange={(e) => setFormFlightNumber(e.target.value)}
                              placeholder="e.g. ET 402"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Departure Date <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <Input
                              type="date"
                              value={formDepartureDate}
                              onChange={(e) => setFormDepartureDate(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                              Departure Time
                            </Label>
                            <Input
                              type="time"
                              value={formDepartureTime}
                              onChange={(e) => setFormDepartureTime(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                            Ticket Remark
                          </Label>
                          <Input
                            type="text"
                            value={formTicketRemark}
                            onChange={(e) => setFormTicketRemark(e.target.value)}
                            placeholder="Remarks for departure / ticketing..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between sm:justify-between w-full">
                {stageModalState.mode === "confirm" ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStageModalState(null)}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStageModalState((prev) => prev ? { ...prev, mode: "edit" } : null);
                        }}
                        className="text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Change info</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSubmittingStageAction}
                        onClick={handleConfirmStageAction}
                        className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                      >
                        {isSubmittingStageAction ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            Confirming...
                          </>
                        ) : (
                          `Confirm ${stageModalState.targetStatus}`
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStageModalState(null)}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmittingStageAction}
                        onClick={() => handleSubmitStageEditor(false)}
                        className="text-xs h-8 cursor-pointer"
                        title="Save entered data without completing the stage"
                      >
                        Save Draft Info
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSubmittingStageAction}
                        onClick={() => handleSubmitStageEditor(true)}
                        className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                      >
                        {isSubmittingStageAction ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            Saving & Completing...
                          </>
                        ) : (
                          `Save & Mark as ${stageModalState.targetStatus}`
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
