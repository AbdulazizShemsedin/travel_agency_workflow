"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Save,
  RotateCcw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileDown,
} from "lucide-react";
import {
  getClearanceGridColumnsV2,
  listClearanceGridV2,
  saveClearanceGridV2,
  ClearanceGridRow,
  ClearanceGridColumn,
  ClearanceGridChange,
  ClearanceGridStepType,
} from "@/lib/api/v2";
import { reopenClearanceStepV2 } from "@/lib/api/v2/clearance";
import { exportGroupScheduleBioXlsV2 } from "@/lib/api/v2/reports";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ClearanceGridWorkspaceProps {
  initialStepType?: ClearanceGridStepType;
  allowedStepTypes?: ClearanceGridStepType[];
}

const STEP_TYPES: Array<{ id: ClearanceGridStepType; label: string; corridor: string }> = [
  { id: "LMIS Clearance", label: "Saudi LMIS", corridor: "Saudi Arabia" },
  { id: "Taeshir", label: "Saudi Taeshir / Injaz", corridor: "Saudi Arabia" },
  { id: "Embassy", label: "Saudi Embassy", corridor: "Saudi Arabia" },
  { id: "Kuwait LMIS", label: "Kuwait LMIS", corridor: "Kuwait" },
  { id: "Telesign", label: "Kuwait Telesign", corridor: "Kuwait" },
  { id: "Kuwait Embassy", label: "Kuwait Embassy", corridor: "Kuwait" },
];

export function ClearanceGridWorkspace({
  initialStepType = "LMIS Clearance",
  allowedStepTypes,
}: ClearanceGridWorkspaceProps) {
  const queryClient = useQueryClient();
  const { roles, can } = useAuth();

  const isManagerOrAdmin = React.useMemo(() => {
    return (
      can("manageUsers") ||
      (roles || []).some((r) =>
        ["manager", "admin", "system manager", "agency admin"].includes(String(r).toLowerCase().trim())
      )
    );
  }, [roles, can]);

  // Active step type
  const [selectedStepType, setSelectedStepType] = React.useState<ClearanceGridStepType>(initialStepType);
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(0);
  const pageSize = 50;

  // Staged cell changes: rowName -> { [fieldName]: newValue }
  const [cellChanges, setCellChanges] = React.useState<Record<string, Record<string, any>>>({});
  // Staged cell errors: rowName -> { [fieldName]: errorMessage }
  const [cellErrors, setCellErrors] = React.useState<Record<string, Record<string, string>>>({});
  // Staged conflict rows
  const [conflictRows, setConflictRows] = React.useState<Set<string>>(new Set());

  // Reopen Modal state
  const [reopenTarget, setReopenTarget] = React.useState<{ name: string; currentStatus: string } | null>(null);
  const [reopenReason, setReopenReason] = React.useState<string>("");
  const [reopenTargetStatus, setReopenTargetStatus] = React.useState<string>("In Progress");

  // Manager Override Modal state (for Wakala unpaid blocks)
  const [overrideModal, setOverrideModal] = React.useState<{
    rowName: string;
    pendingField: string;
    pendingValue: any;
  } | null>(null);
  const [overrideReasonInput, setOverrideReasonInput] = React.useState<string>("");

  // 1. Fetch column definitions for the active step type
  const { data: columns = [], isLoading: isColsLoading } = useQuery<ClearanceGridColumn[]>({
    queryKey: ["v2_clearance_grid_columns", selectedStepType],
    queryFn: () => getClearanceGridColumnsV2(selectedStepType),
    staleTime: 60000,
  });

  // 2. Fetch clearance grid rows
  const {
    data: gridData,
    isLoading: isRowsLoading,
    refetch,
  } = useQuery({
    queryKey: ["v2_clearance_grid_rows", selectedStepType, statusFilter, searchQuery, page],
    queryFn: () =>
      listClearanceGridV2(selectedStepType, {
        status: statusFilter !== "All" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit_start: page * pageSize,
        limit_page_length: pageSize,
        with_total: 1,
      }),
    staleTime: 15000,
  });

  const rows = gridData?.data || [];
  const totalCount = gridData?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Track unsaved row count
  const changedRowCount = Object.keys(cellChanges).length;

  const handleCellChange = (rowName: string, fieldName: string, newValue: any) => {
    setCellChanges((prev) => ({
      ...prev,
      [rowName]: {
        ...(prev[rowName] || {}),
        [fieldName]: newValue,
      },
    }));

    // Clear error on this cell if any
    setCellErrors((prev) => {
      if (!prev[rowName]?.[fieldName]) return prev;
      const nextRow = { ...prev[rowName] };
      delete nextRow[fieldName];
      return { ...prev, [rowName]: nextRow };
    });
  };

  const [isExportingTaeshir, setIsExportingTaeshir] = React.useState(false);

  const handleExportTaeshir = async () => {
    try {
      setIsExportingTaeshir(true);
      const applicantIds = rows
        .map((r) => r.applicant)
        .filter(Boolean);
      if (applicantIds.length === 0) {
        toast.error("No applicants in the grid to export.");
        return;
      }
      toast.info(`Exporting Taeshir schedule for ${applicantIds.length} applicants...`);
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
      toast.success("Taeshir schedule (.xls) downloaded successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Taeshir (.xls) file.");
    } finally {
      setIsExportingTaeshir(false);
    }
  };

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: ClearanceGridChange[] = [];

      for (const [rowName, fields] of Object.entries(cellChanges)) {
        const row = rows.find((r) => r.name === rowName);
        if (!row) continue;
        payload.push({
          name: rowName,
          modified: row.modified,
          fields,
          override_reason: overrideReasonInput || undefined,
        });
      }

      if (payload.length === 0) return [];
      return await saveClearanceGridV2(payload);
    },
    onSuccess: (results) => {
      let savedCount = 0;
      let conflictCount = 0;
      let errorCount = 0;

      const newErrors: Record<string, Record<string, string>> = {};
      const newConflicts = new Set<string>();

      results.forEach((res, idx) => {
        const rowName = Object.keys(cellChanges)[idx];
        if (!rowName) return;

        if (res.ok) {
          savedCount++;
          // Clear changes for this row
          setCellChanges((prev) => {
            const next = { ...prev };
            delete next[rowName];
            return next;
          });
        } else {
          if (res.conflict) {
            conflictCount++;
            newConflicts.add(rowName);
          } else {
            errorCount++;
            if (res.field && res.error) {
              newErrors[rowName] = {
                ...(newErrors[rowName] || {}),
                [res.field]: res.error,
              };
            }
          }
        }
      });

      setCellErrors(newErrors);
      setConflictRows(newConflicts);

      if (savedCount > 0) {
        toast.success(`Successfully saved ${savedCount} row(s)`);
      }
      if (conflictCount > 0) {
        toast.error(`${conflictCount} row(s) conflicted. Please reload to sync the latest data.`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} row(s) had errors. Review the highlighted cells.`);
      }

      setOverrideReasonInput("");
      refetch();
    },
    onError: (err: any) => {
      toast.error("Failed to save changes", {
        description: err?.message || "Please check your network connection and retry.",
      });
    },
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!reopenTarget) return;
      return await reopenClearanceStepV2(
        reopenTarget.name,
        reopenReason,
        reopenTargetStatus as any
      );
    },
    onSuccess: () => {
      toast.success("Clearance step reopened successfully");
      setReopenTarget(null);
      setReopenReason("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
    },
    onError: (err: any) => {
      toast.error("Failed to reopen clearance step", {
        description: err?.message || "Please try again.",
      });
    },
  });

  const availableStepTypes = allowedStepTypes
    ? STEP_TYPES.filter((s) => allowedStepTypes.includes(s.id))
    : STEP_TYPES;

  return (
    <div className="space-y-4">
      {/* Top Header & Step Type Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Clearance Excel Grid
            </h2>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider">
              High-Speed Operational Mode
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Real-time spreadsheet matrix with cell-level editing, concurrent save validation, and automatic fee logging.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {changedRowCount > 0 && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save {changedRowCount} Changes
            </Button>
          )}

          {selectedStepType === "Taeshir" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportTaeshir}
              disabled={isExportingTaeshir}
              className="text-xs gap-1.5 text-emerald-800 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
              title="Export for Taeshir (.xls)"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{isExportingTaeshir ? "Exporting..." : "Export for Taeshir (.xls)"}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCellChanges({});
              setCellErrors({});
              setConflictRows(new Set());
              refetch();
            }}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reload
          </Button>
        </div>
      </div>

      {/* Corridor / Step Type Selection Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableStepTypes.map((step) => {
          const isActive = selectedStepType === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (changedRowCount > 0) {
                  if (!confirm("You have unsaved changes. Discard them and switch step type?")) {
                    return;
                  }
                }
                setSelectedStepType(step.id);
                setCellChanges({});
                setCellErrors({});
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition border text-left",
                isActive
                  ? "bg-emerald-900 text-white border-emerald-900 shadow-xs"
                  : "bg-white dark:bg-[#16161c] text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-[#26262e] hover:bg-slate-50 dark:hover:bg-[#1c1c24]"
              )}
            >
              {step.label}
              <span className="block text-[10px] opacity-75 font-normal">
                {step.corridor}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#15151c] p-2.5 rounded-xl border border-slate-200 dark:border-[#222228]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search applicant or passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-64 border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217] text-slate-700 dark:text-zinc-200"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted">Submitted</option>
              <option value="Complete">Complete / Issued / Stamped</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{rows.length}</strong> of <strong>{totalCount}</strong> rows
        </div>
      </div>

      {/* Conflict Warning Banner */}
      {conflictRows.size > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{conflictRows.size} row(s)</strong> have been modified by another user since you loaded them. Click Reload to sync latest values.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConflictRows(new Set());
              refetch();
            }}
            className="h-7 text-xs border-amber-300 bg-white"
          >
            Reload Rows
          </Button>
        </div>
      )}

      {/* Main Excel Grid Table Container */}
      <div className="rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] overflow-x-auto shadow-xs">
        {isColsLoading || isRowsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="text-xs font-semibold">Loading clearance grid matrix...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No clearance records found for <strong>{selectedStepType}</strong>.
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-[#181820] border-b border-slate-200 dark:border-[#222228] text-slate-700 dark:text-zinc-300 font-semibold uppercase text-[11px] tracking-wider select-none">
                <th className="py-2.5 px-3 whitespace-nowrap w-12 text-center">#</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Applicant</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Passport</th>
                {columns.map((col) => {
                  const displayLabel =
                    col.name === "injaz_application_id" ||
                    col.name === "injaz_number" ||
                    col.label === "Injaz Application ID" ||
                    col.label === "E.No" ||
                    col.label === "E-No" ||
                    col.label === "E. No" ||
                    col.label.toLowerCase().includes("e.no")
                      ? "E-number (Injaz Application No.)"
                      : col.label;
                  return (
                    <th
                      key={col.name}
                      className="py-2.5 px-3 whitespace-nowrap"
                      style={{ width: col.width ? `${col.width}px` : undefined }}
                    >
                      <div className="flex items-center gap-1">
                        <span>{displayLabel}</span>
                        {!col.editable && <Lock className="h-2.5 w-2.5 text-slate-400" />}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d1d24]">
              {rows.map((row, rowIdx) => {
                const isConflict = conflictRows.has(row.name);
                const hasStagedChanges = Boolean(cellChanges[row.name]);
                const rowErrors = cellErrors[row.name] || {};

                return (
                  <tr
                    key={row.name}
                    className={cn(
                      "hover:bg-slate-50/70 dark:hover:bg-[#16161d] transition-colors",
                      hasStagedChanges && "bg-emerald-50/30 dark:bg-emerald-950/20",
                      isConflict && "bg-amber-50/60 dark:bg-amber-950/30"
                    )}
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center text-[10px] text-slate-400 font-mono">
                      {page * pageSize + rowIdx + 1}
                    </td>

                    {/* Applicant Name */}
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-zinc-100 font-mono text-[11px]">
                      {row.applicant_name || row.applicant}
                    </td>

                    {/* Passport Number */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                      {row.passport_number || "—"}
                    </td>

                    {/* Dynamic Columns from get_clearance_grid_columns */}
                    {columns.map((col) => {
                      const fieldKey = col.name;
                      const isStaged = cellChanges[row.name]?.[fieldKey] !== undefined;
                      const currentValue = isStaged
                        ? cellChanges[row.name][fieldKey]
                        : row[fieldKey];
                      const cellError = rowErrors[fieldKey];

                      if (!col.editable) {
                        return (
                          <td
                            key={col.name}
                            className="py-2 px-3 whitespace-nowrap text-slate-500 bg-slate-50/40 dark:bg-[#141419]"
                          >
                            <span className="font-mono text-[11px]">
                              {String(currentValue ?? "—")}
                            </span>
                          </td>
                        );
                      }

                      // Editable Status Select
                      if (fieldKey === "status" && col.options && col.options.length > 0) {
                        return (
                          <td key={col.name} className="py-1 px-2 whitespace-nowrap">
                            <div className="relative">
                              <select
                                value={currentValue || ""}
                                onChange={(e) =>
                                  handleCellChange(row.name, fieldKey, e.target.value)
                                }
                                className={cn(
                                  "h-7 w-full text-xs rounded border px-2 py-0.5 bg-white dark:bg-[#121217] font-semibold text-slate-900 dark:text-zinc-100",
                                  isStaged
                                    ? "border-emerald-600 ring-1 ring-emerald-500/20"
                                    : "border-slate-200 dark:border-[#2a2a35]",
                                  cellError && "border-rose-500 ring-1 ring-rose-500/30"
                                )}
                              >
                                <option value={row.status}>{row.status} (Current)</option>
                                {col.options
                                  .filter((opt) => opt !== row.status)
                                  .map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                              </select>
                              {cellError && (
                                <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                                  {cellError}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Injaz / Wakala / Police Ashara Status Select
                      if (
                        ["injaz_payment_status", "wakala_status", "police_ashara_status"].includes(
                          fieldKey
                        )
                      ) {
                        const options =
                          fieldKey === "injaz_payment_status" || fieldKey === "wakala_status"
                            ? ["Pending", "Paid"]
                            : ["Pending", "Scheduled", "Completed", "Failed"];

                        return (
                          <td key={col.name} className="py-1 px-2 whitespace-nowrap">
                            <select
                              value={currentValue || "Pending"}
                              onChange={(e) =>
                                handleCellChange(row.name, fieldKey, e.target.value)
                              }
                              className={cn(
                                "h-7 w-full text-xs rounded border px-2 py-0.5 bg-white dark:bg-[#121217] font-medium",
                                isStaged
                                  ? "border-emerald-600 ring-1 ring-emerald-500/20"
                                  : "border-slate-200 dark:border-[#2a2a35]",
                                cellError && "border-rose-500"
                              )}
                            >
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            {cellError && (
                              <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                                {cellError}
                              </span>
                            )}
                          </td>
                        );
                      }

                      // Date Input
                      if (col.type === "date" || fieldKey.includes("date")) {
                        return (
                          <td key={col.name} className="py-1 px-2 whitespace-nowrap">
                            <Input
                              type="date"
                              value={currentValue ? String(currentValue).split("T")[0] : ""}
                              onChange={(e) =>
                                handleCellChange(row.name, fieldKey, e.target.value)
                              }
                              className={cn(
                                "h-7 text-xs border-slate-200 dark:border-[#2a2a35]",
                                isStaged && "border-emerald-600 ring-1 ring-emerald-500/20",
                                cellError && "border-rose-500"
                              )}
                            />
                            {cellError && (
                              <span className="text-[10px] text-rose-600 block mt-0.5">
                                {cellError}
                              </span>
                            )}
                          </td>
                        );
                      }

                      // Generic Text Input
                      return (
                        <td key={col.name} className="py-1 px-2 whitespace-nowrap">
                          <Input
                            value={currentValue ?? ""}
                            onChange={(e) =>
                              handleCellChange(row.name, fieldKey, e.target.value)
                            }
                            placeholder="—"
                            className={cn(
                              "h-7 text-xs font-mono border-slate-200 dark:border-[#2a2a35]",
                              isStaged && "border-emerald-600 ring-1 ring-emerald-500/20",
                              cellError && "border-rose-500"
                            )}
                          />
                          {cellError && (
                            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                              {cellError}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions (Reopen for terminal rows) */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {isManagerOrAdmin &&
                      ["Issued", "Complete", "Stamped", "Rejected"].includes(row.status) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setReopenTarget({
                              name: row.name,
                              currentStatus: row.status,
                            })
                          }
                          className="h-6 px-2 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reopen
                        </Button>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Reopen Clearance Step Modal */}
      <Dialog
        open={Boolean(reopenTarget)}
        onOpenChange={(open) => !open && setReopenTarget(null)}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-400">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Reopen Clearance Step
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400">
              Reversing terminal outcome for <strong>{reopenTarget?.name}</strong>. A mandatory written reason is required for the immutable audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Target Status *
              </label>
              <select
                value={reopenTargetStatus}
                onChange={(e) => setReopenTargetStatus(e.target.value)}
                className="w-full h-8 px-2 mt-1 text-xs rounded border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c]"
              >
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                {selectedStepType.includes("Embassy") && (
                  <option value="Submitted">Submitted</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Written Reason for Reopening *
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this completed determination was incorrect..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full mt-1 p-2 text-xs rounded border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReopenTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending || !reopenReason.trim()}
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs"
            >
              {reopenMutation.isPending ? "Reopening..." : "Confirm Reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
