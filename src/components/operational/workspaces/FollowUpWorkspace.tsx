"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Lock,
  Loader2,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  setLmisStatusV2,
  setTaeshirAppointmentV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import { recordPredepartureMedicalResultV2 } from "@/lib/api/v2/placements";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { ApplicantFollowUpWorkspace } from "./ApplicantFollowUpWorkspace";

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
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  // Selected row for Level 2 dedicated applicant workspace
  const [selectedApplicantRow, setSelectedApplicantRow] = React.useState<WorkspaceApplicantRow | null>(null);

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
  const canEditMedical = isAdmin || hasRoleKeyword(["medical"]) || hasAnyV2Role(authUserV2, ["Clearance Officer"]);

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
    const stepName = row.lms?.name || row.clearanceStepName;
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

  // 2. Taeshir Appointment Date Inline Save
  const handleSaveTaeshirDate = async (row: WorkspaceApplicantRow, newDate: string) => {
    const stepName = row.injaz?.name;
    if (!stepName) {
      toast.error("Could not find active Taeshir clearance step for this candidate.");
      return;
    }

    try {
      const currentInjazId = row.injazApplicationId || (row.injaz as any)?.injaz_application_id || "";
      await setTaeshirAppointmentV2(stepName, newDate, currentInjazId);
      await handleMutationSuccess("Taeshir appointment date updated");
    } catch (err) {
      toast.error(formatCleanErrorMessage(err));
      throw err;
    }
  };

  // 3. Medical 2 Status Inline Save
  const handleSaveMedical2Status = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const placementName = row.placementName || row.placementId;
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

  // Columns for Level 1 Table: Preserved exact order, with Agency Name & Sponsor Name removed
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "no",
      header: "NO",
      width: "44px",
      align: "center",
      sortable: false,
      isReadOnly: true,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-xs">
          {index ?? 1}
        </span>
      ),
    },
    {
      id: "name",
      header: "NAME",
      accessorKey: "fullName",
      width: "160px",
      isReadOnly: true,
      cell: (row) => (
        <div className="flex items-center gap-2 group cursor-pointer" title="Click row to open detailed workspace">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase group-hover:scale-105 transition-transform">
            {row.fullName?.substring(0, 2) || "A"}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[130px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {row.fullName}
          </span>
        </div>
      ),
    },
    {
      id: "destination",
      header: "DESTINATION COUNTRY",
      accessorKey: "destinationCountry",
      width: "115px",
      isReadOnly: true,
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-zinc-300 text-xs">
          {row.destinationCountry || "—"}
        </span>
      ),
    },
    {
      id: "stageStatus",
      header: "STAGE STATUS",
      accessorKey: "stageStatus",
      width: "110px",
      isReadOnly: true,
      cell: (row) => {
        const stage = row.stageStatus || "Draft";
        const cfg = getStageBadgeVariant(stage);
        return (
          <Badge variant={cfg.variant} className={cn("text-[10px] py-0 px-1.5 font-semibold", cfg.className)}>
            {stage}
          </Badge>
        );
      },
    },
    {
      id: "duration",
      header: "DURATION",
      accessorKey: "contractDays",
      width: "85px",
      isReadOnly: true,
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 text-xs">
          {row.contractDays || (row.duration ? `${row.duration} days` : "—")}
        </span>
      ),
    },
    {
      id: "cocStatus",
      header: "COC STATUS",
      accessorKey: "cocStatus",
      width: "95px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.cocStatus),
    },
    {
      id: "lmisStatus",
      header: "LMIS STATUS",
      accessorKey: "lmisStatus",
      width: "140px",
      cell: (row) => {
        const currentVal = row.lmisStatus || "Pending";
        const hasStep = Boolean(row.lms?.name || row.clearanceStepName);

        if (!canEditLmis || !hasStep) {
          return (
            <div className="flex items-center gap-1">
              {getStatusBadge(currentVal)}
              {!canEditLmis && (
                <span title="Read-only">
                  <Lock className="h-2.5 w-2.5 text-slate-400/60" />
                </span>
              )}
            </div>
          );
        }

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
      id: "teshirApptDate",
      header: "TE'SHIR APPT. DATE",
      accessorKey: "appointmentDate",
      width: "125px",
      cell: (row) => {
        const currentDate = row.appointmentDate && row.appointmentDate !== "—" ? row.appointmentDate : "";
        const hasStep = Boolean(row.injaz?.name);

        if (!canEditTaeshir || !hasStep) {
          return (
            <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-zinc-300 text-[11px]">
              <span>{currentDate || "—"}</span>
              {!canEditTaeshir && (
                <span title="Read-only">
                  <Lock className="h-2.5 w-2.5 text-slate-400/60" />
                </span>
              )}
            </div>
          );
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelDateInput
              value={currentDate}
              onSave={(newDate) => handleSaveTaeshirDate(row, newDate)}
              ariaLabel="Taeshir Appointment Date"
            />
          </div>
        );
      },
    },
    {
      id: "teshirStatus",
      header: "TE'SHIR STATUS",
      accessorKey: "teshirStatus",
      width: "105px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.teshirStatus),
    },
    {
      id: "wakalaStatus",
      header: "WAKALA STATUS",
      accessorKey: "wakalaStatus",
      width: "105px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.wakalaStatus),
    },
    {
      id: "embassyStatus",
      header: "EMBASSY / VISA STATUS",
      accessorKey: "embassyStatus",
      width: "130px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.embassyStatus),
    },
    {
      id: "medical2Status",
      header: "MEDICAL 2 STATUS",
      accessorKey: "medical2Status",
      width: "120px",
      cell: (row) => {
        const currentVal = row.medical2Status || "—";
        const isTicketedStage = row.stageStatus === "Ticketed";

        if (!canEditMedical || !isTicketedStage) {
          return (
            <div className="flex items-center gap-1">
              {getStatusBadge(currentVal)}
              {!canEditMedical && (
                <span title="Read-only">
                  <Lock className="h-2.5 w-2.5 text-slate-400/60" />
                </span>
              )}
            </div>
          );
        }

        const medOptions = [
          { value: "FIT", label: "FIT", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
          { value: "UNFIT", label: "UNFIT", badgeClass: "bg-rose-100 text-rose-800 border-rose-300" },
          { value: "Pending", label: "Pending", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ExcelSelect
              value={currentVal}
              options={medOptions}
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
      width: "120px",
      isReadOnly: true,
      cell: (row) => getStatusBadge(row.departureStatus),
    },
  ];

  return (
    <>
      {/* LEVEL 1: Compact Main Follow-up Table */}
      <OperationalTable
        title="Follow-up Tracking"
        subtitle="Operational summary workspace for later workflow stages (LMIS, Taeshir, Embassy, Medical 2, Departure)."
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRowClick={(row) => {
          setSelectedApplicantRow(row);
        }}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
      />

      {/* LEVEL 2: Dedicated Applicant Follow-up Workspace */}
      <ApplicantFollowUpWorkspace
        isOpen={Boolean(selectedApplicantRow)}
        onClose={() => setSelectedApplicantRow(null)}
        row={selectedApplicantRow}
        onRefresh={onRefresh}
        employees={employees}
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
                const stepName = tableRejectRow.lms?.name || tableRejectRow.clearanceStepName;
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
