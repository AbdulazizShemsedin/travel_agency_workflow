"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
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
import {
  setLmisStatusV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2 } from "@/lib/api/v2/applicants";
import { recordPredepartureMedicalResultV2 } from "@/lib/api/v2/placements";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

interface FollowUpWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
  employees?: { name: string; full_name?: string; email?: string }[];
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
        variant: "purple",
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
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
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold",
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

export function FollowUpWorkspace({
  data,
  isLoading,
  onRefresh,
  corridorFilter,
  onCorridorChange,
  employees = [],
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

  // 4. COC Status Inline Save
  const handleSaveCocStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    if (!row.applicantId) {
      toast.error("Could not find applicant ID for this candidate.");
      return;
    }

    try {
      await updateApplicantForLmisV2({
        applicant_name: row.applicantId,
        coc_status: newStatus,
      });
      await handleMutationSuccess(`COC status updated to ${newStatus}`);
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

  const cocOptions = React.useMemo(() => [
    { value: "Issued", label: "Issued", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
    { value: "Pending", label: "Pending", badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" },
    { value: "Not Started", label: "Not Started", badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300" },
  ], []);

  const med2Options = React.useMemo(() => [
    { value: "FIT", label: "FIT", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
    { value: "UNFIT", label: "UNFIT", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300" },
    { value: "Pending", label: "Pending", badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" },
  ], []);

  // Columns for Level 1 Table: Preserved exact approved order, with Agency, Sponsor & Destination removed, plus Action column
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
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
      id: "cocStatus",
      header: "COC STATUS",
      accessorKey: "cocStatus",
      width: "75px",
      cell: (row) => {
        const currentVal = row.cocStatus || "Not Started";
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={cocOptions}
              onSave={(newVal) => handleSaveCocStatus(row, newVal)}
              ariaLabel="COC Status"
              className="text-[10px]"
            />
          </div>
        );
      },
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
      width: "38px",
      align: "center",
      sortable: false,
      isReadOnly: true,
      cell: (row) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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

  // Extra Header Filter: Filter by Stage Status
  const stageFilterControl = (
    <div className="min-w-[140px] sm:min-w-[160px]">
      <SimpleSelect
        value={stageFilter}
        onValueChange={setStageFilter}
        options={stageOptions}
        triggerClassName="h-8 px-2.5 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36] font-semibold whitespace-nowrap"
        aria-label="Filter by Stage Status"
      />
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
        hideStatusFilter={true}
        extraHeaderActions={stageFilterControl}
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
              Candidate: <strong className="uppercase">{tableRejectRow?.fullName}</strong>. Backend state machine requires at least one official reason to reject LMIS clearance.
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
