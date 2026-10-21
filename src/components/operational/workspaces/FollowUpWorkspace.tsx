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
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2 } from "@/lib/api/v2/applicants";
import { recordPredepartureMedicalResultV2 } from "@/lib/api/v2/placements";
import { exportGroupScheduleBioXlsV2 } from "@/lib/api/v2/reports";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

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
          className="h-6 px-2 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 gap-1 shadow-2xs cursor-pointer"
          title="Send candidate data to browser extensions"
        >
          <Puzzle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>Extensions</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
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
        <button
          type="button"
          onClick={() => handleSend("Taeshir", "For Taeshir")}
          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-zinc-200 hover:text-emerald-800 dark:hover:text-emerald-400 transition flex items-center justify-between cursor-pointer"
        >
          <span>For Taeshir</span>
          <ExternalLink className="h-3 w-3 opacity-50" />
        </button>
        <button
          type="button"
          onClick={() => handleSend("Musaned", "For Musaned")}
          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-zinc-200 hover:text-emerald-800 dark:hover:text-emerald-400 transition flex items-center justify-between cursor-pointer"
        >
          <span>For Musaned</span>
          <ExternalLink className="h-3 w-3 opacity-50" />
        </button>
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
    { value: "Processing", label: "Stage: Processing" },
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

  // Quick rejection modal state for table inline edit
  const [tableRejectRow, setTableRejectRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [tableRejectReasons, setTableRejectReasons] = React.useState<string[]>([]);
  const [isSubmittingTableReject, setIsSubmittingTableReject] = React.useState(false);

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
    const stepName =
      row.lms?.name ||
      row.clearanceStepName ||
      (row as any).siblingSteps?.find(
        (s: any) =>
          s.step_type?.toLowerCase().includes("lmis") ||
          s.step_type?.toLowerCase().includes("lms")
      )?.name;

    if (!stepName) {
      toast.error("Could not find active LMIS clearance step for this candidate.");
      return;
    }

    if (newStatus === "REJECTED") {
      setTableRejectRow(row);
      setTableRejectReasons([]);
      return;
    }

    try {
      await setLmisStatusV2(stepName, newStatus);
      await handleMutationSuccess(`LMIS status updated to ${newStatus}`);
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
      throw err;
    }
  };


  // 3. Medical 2 Status Inline Save
  const handleSaveMedical2Status = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const placementName = row.placementName || row.placementId || row.dsrName;
    if (!placementName) {
      toast.error("Could not find placement record for this candidate.");
      return;
    }

    try {
      await recordPredepartureMedicalResultV2(placementName, newStatus as "FIT" | "UNFIT");
      await handleMutationSuccess(`Pre-departure medical recorded as ${newStatus}`);
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
      throw err;
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

  const med2Options = React.useMemo(() => [
    { value: "FIT", label: "FIT", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
    { value: "UNFIT", label: "UNFIT", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300" },
    { value: "Pending", label: "Pending", badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" },
  ], []);

  // Columns for Level 1 Table: Checkbox select, Number, and preserved exact approved order
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
    {
      id: "stageStatus",
      header: "STAGE STATUS",
      accessorKey: "stageStatus",
      width: "80px",
      isReadOnly: true,
      cell: (row) => {
        const stage = row.stageStatus || "Draft";
        const cfg = getStageBadgeVariant(stage);
        return (
          <Badge variant={cfg.variant} className={cn("text-[9.5px] py-0 px-1 font-semibold", cfg.className)}>
            {stage}
          </Badge>
        );
      },
    },
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
    {
      id: "lmisStatus",
      header: "LMIS STATUS",
      accessorKey: "lmisStatus",
      width: "85px",
      cell: (row) => {
        const currentVal = row.lmisStatus || "Pending";
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={lmisOptions}
              onSave={(newVal) => handleSaveLmisStatus(row, newVal)}
              ariaLabel="LMIS Working Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    {
      id: "teshirStatus",
      header: "TE'SHIR STATUS",
      accessorKey: "teshirStatus",
      width: "70px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.teshirStatus),
    },
    {
      id: "wakalaStatus",
      header: "WAKALA STATUS",
      accessorKey: "wakalaStatus",
      width: "70px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.wakalaStatus),
    },
    {
      id: "embassyStatus",
      header: "EMBASSY / VISA",
      accessorKey: "embassyStatus",
      width: "80px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.embassyStatus),
    },
    {
      id: "medical2Status",
      header: "MEDICAL 2 STATUS",
      accessorKey: "medical2Status",
      width: "75px",
      cell: (row) => {
        const currentVal = row.medical2Status && row.medical2Status !== "—" ? row.medical2Status : "Pending";
        const hasPlacement = Boolean(row.placementName || row.placementId || row.dsrName);
        const stage = (row.stageStatus || "").toLowerCase();
        const hasReachedTicketStage = stage === "ticketed" || stage === "departed";

        if (!hasPlacement || !hasReachedTicketStage) {
          return getStatusBadge(row.medical2Status);
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={med2Options}
              onSave={(newVal) => handleSaveMedical2Status(row, newVal)}
              ariaLabel="Medical 2 Status"
              className="text-[10px]"
            />
          </div>
        );
      },
    },
    {
      id: "departureStatus",
      header: "DEPARTURE STATUS",
      accessorKey: "departureStatus",
      width: "75px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.departureStatus),
    },
    {
      id: "actions",
      header: "ACTION",
      width: "140px",
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
    </>
  );
}
