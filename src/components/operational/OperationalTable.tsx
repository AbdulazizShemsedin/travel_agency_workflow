"use client";

import * as React from "react";
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  LegacyColumnDef as ColumnDef,
} from "@tanstack/react-table/legacy";
import { flexRender } from "@tanstack/react-table";
import {
  SortingState,
  ColumnVisibilityState as VisibilityState,
  ColumnFiltersState,
} from "@tanstack/table-core";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  AlertTriangle,
  Clock,
  Eye,
  CheckSquare,
  Square,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SimpleSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OperationalTableProps<T extends WorkspaceApplicantRow = WorkspaceApplicantRow> {
  title: string;
  subtitle?: string;
  columns: OperationalColumn<T>[];
  data: T[];
  isLoading?: boolean;
  selectedRowId?: string | null;
  onRowClick: (row: T) => void;
  onRefresh?: () => void;
  corridorFilter?: string;
  onCorridorChange?: (corridor: string) => void;
  availableCorridors?: string[];
  extraHeaderActions?: React.ReactNode;
}

export function OperationalTable<T extends WorkspaceApplicantRow = WorkspaceApplicantRow>({
  title,
  subtitle,
  columns: inputColumns,
  data,
  isLoading = false,
  selectedRowId,
  onRowClick,
  onRefresh,
  corridorFilter = "All",
  onCorridorChange,
  availableCorridors = ["All", "Saudi Arabia", "Kuwait"],
  extraHeaderActions,
}: OperationalTableProps<T>) {
  // State for TanStack Table
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("ALL");
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = React.useState<string>("ALL");
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = React.useState(false);

  // Derive unique statuses present across the dataset for TanStack filtering
  const availableStatuses = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((row) => {
      const s =
        row.lmisStatus ||
        row.wakalaStatus ||
        row.embassyStatus ||
        row.ticketStatus ||
        row.injazPayment ||
        (row as any).status;
      if (s && typeof s === "string" && s.trim()) {
        set.add(s.trim());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Convert input columns to TanStack ColumnDef
  const tableColumns = React.useMemo<ColumnDef<T, any>[]>(() => {
    return inputColumns.map((col) => {
      const isRemainingCol =
        col.id.toLowerCase().includes("remaining") ||
        col.header.toLowerCase().includes("remaining") ||
        col.accessorKey === "medicalRemaining";

      return {
        id: col.id,
        header: col.header,
        accessorKey: col.accessorKey as string,
        enableSorting: col.sortable !== false,
        size: col.width ? parseInt(col.width, 10) : undefined,
        sortingFn: isRemainingCol
          ? (rowA: any, rowB: any) => {
              const aVal = rowA.original.medicalRemainingDays ??
                (typeof rowA.original.medicalRemaining === "string"
                  ? parseInt(rowA.original.medicalRemaining, 10)
                  : 9999);
              const bVal = rowB.original.medicalRemainingDays ??
                (typeof rowB.original.medicalRemaining === "string"
                  ? parseInt(rowB.original.medicalRemaining, 10)
                  : 9999);
              return (isNaN(aVal) ? 9999 : aVal) - (isNaN(bVal) ? 9999 : bVal);
            }
          : undefined,
        cell: (info) => {
          const row = info.row.original;
          const displayIndex = info.row.index + 1;

          // Special highlight for low remaining date if remaining column
          if (isRemainingCol) {
            const rawText = row.medicalRemaining || "—";
            const days = row.medicalRemainingDays;
            const isUrgent =
              (days !== undefined && days <= 10) ||
              rawText.includes("-") ||
              (days !== undefined && days <= 0);

            return (
              <div className="flex items-center gap-1.5">
                {isUrgent && <AlertTriangle className="h-3 w-3 text-rose-600 animate-pulse shrink-0" />}
                <span
                  className={cn(
                    "font-mono text-xs font-semibold px-2 py-0.5 rounded-md",
                    isUrgent
                      ? "text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300/80 dark:border-rose-800"
                      : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  )}
                >
                  {rawText}
                </span>
              </div>
            );
          }

          return col.cell(row, displayIndex);
        },
        meta: {
          align: col.align || "left",
          width: col.width,
        },
      };
    });
  }, [inputColumns]);

  // Global search filter function
  const globalFilterFn = React.useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      if (!filterValue) return true;
      const q = filterValue.toLowerCase().trim();
      const r = row.original;

      const nameMatch = (r.fullName || "").toLowerCase().includes(q);
      const passMatch = (r.passportNumber || "").toLowerCase().includes(q);
      const idMatch = (r.applicantId || "").toLowerCase().includes(q);
      const sponsorMatch = (r.sponsorName || "").toLowerCase().includes(q);
      const contractorMatch = (r.lockedContractor || "").toLowerCase().includes(q);
      const visaMatch = (r.visaNumber || "").toLowerCase().includes(q);
      const laborMatch = (r.laborId || "").toLowerCase().includes(q);

      return (
        nameMatch ||
        passMatch ||
        idMatch ||
        sponsorMatch ||
        contractorMatch ||
        visaMatch ||
        laborMatch
      );
    },
    []
  );

  // Filtered dataset before TanStack (handling urgency and status filter cleanly)
  const filteredData = React.useMemo(() => {
    let list = data;

    // 1. Status Filter
    if (selectedStatusFilter !== "ALL") {
      list = list.filter((r) => {
        const s =
          r.lmisStatus ||
          r.wakalaStatus ||
          r.embassyStatus ||
          r.ticketStatus ||
          r.injazPayment ||
          (r as any).status;
        return (s || "").toLowerCase().trim() === selectedStatusFilter.toLowerCase().trim();
      });
    }

    // 2. Urgency Filter (Remaining date)
    if (selectedUrgencyFilter !== "ALL") {
      list = list.filter((r) => {
        const days = r.medicalRemainingDays ??
          (typeof r.medicalRemaining === "string" ? parseInt(r.medicalRemaining, 10) : undefined);

        if (selectedUrgencyFilter === "URGENT") {
          return days !== undefined && !isNaN(days) && days <= 15 && days >= 0;
        }
        if (selectedUrgencyFilter === "EXPIRED") {
          return (days !== undefined && !isNaN(days) && days < 0) || (r.medicalRemaining || "").includes("-");
        }
        if (selectedUrgencyFilter === "VALID") {
          return days !== undefined && !isNaN(days) && days > 15;
        }
        return true;
      });
    }

    return list;
  }, [data, selectedStatusFilter, selectedUrgencyFilter]);

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 15,
      },
    },
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const allColumns = table.getAllLeafColumns();
  const totalEntries = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalPages = table.getPageCount() || 1;
  const startIndex = pageIndex * pageSize;

  // CSV Export utility
  const handleExportCSV = () => {
    const rows = table.getFilteredRowModel().rows;
    if (rows.length === 0) return;

    const visibleHeaders = visibleColumns.map((c) => `"${c.columnDef.header || c.id}"`).join(",");
    const csvRows = rows.map((row) => {
      return visibleColumns
        .map((col) => {
          const val = (row.original as any)[col.id] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [visibleHeaders, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick action: Sort by most urgent remaining days (ascending order)
  const handleSortMostUrgent = () => {
    const remCol = tableColumns.find(
      (c) =>
        c.id?.toLowerCase().includes("remaining") ||
        (c.header as string)?.toLowerCase().includes("remaining")
    );
    if (remCol && remCol.id) {
      setSorting([{ id: remCol.id, desc: false }]);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200/80 dark:border-[#272730] bg-white dark:bg-[#121216] shadow-xs overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* Table Action Bar                                              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 p-4 border-b border-slate-100 dark:border-[#222227] sm:flex-row sm:items-center sm:justify-between bg-slate-50/50 dark:bg-[#15151a]">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Top-Left: Column Visibility Dropdown with Checkboxes */}
          <Popover open={isColumnDropdownOpen} onOpenChange={setIsColumnDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1f1f26] cursor-pointer"
                title="Select columns to show or hide"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>Columns</span>
                <span className="ml-1 rounded-md bg-slate-100 dark:bg-[#22222c] px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                  {visibleColumns.length}/{allColumns.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2 shadow-xl border-slate-200 dark:border-[#2b2b36] bg-white dark:bg-[#141419]">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-[#22222a] mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Table Columns
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => table.toggleAllColumnsVisible(true)}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline px-1"
                  >
                    Show All
                  </button>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      table.getAllLeafColumns().forEach((col) => {
                        if (col.id !== "name" && col.id !== "no" && col.id !== "passport") {
                          col.toggleVisibility(false);
                        }
                      });
                    }}
                    className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:underline px-1"
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                {allColumns.map((column) => {
                  const isVisible = column.getIsVisible();
                  const headerTitle = String(column.columnDef.header || column.id);

                  return (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#1e1e27] cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none transition"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={column.getToggleVisibilityHandler()}
                        className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                      />
                      <span className="font-medium truncate">{headerTitle}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* TanStack Status Filter Dropdown */}
          {availableStatuses.length > 0 && (
            <div className="w-40 sm:w-44">
              <SimpleSelect
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
                options={[
                  { value: "ALL", label: `All Statuses (${data.length})` },
                  ...availableStatuses.map((st) => ({ value: st, label: `Status: ${st}` })),
                ]}
                triggerClassName="h-8 px-2.5 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36] font-semibold"
                aria-label="Filter by Status"
              />
            </div>
          )}

          {/* Remaining Date Urgency Filter */}
          <div className="w-44 sm:w-48">
            <SimpleSelect
              value={selectedUrgencyFilter}
              onValueChange={setSelectedUrgencyFilter}
              options={[
                { value: "ALL", label: "All Urgencies" },
                { value: "URGENT", label: "⚠️ Urgent (≤ 15d)" },
                { value: "EXPIRED", label: "❌ Expired (< 0d)" },
                { value: "VALID", label: "✓ Valid (> 15d)" },
              ]}
              triggerClassName={cn(
                "h-8 px-2.5 text-xs font-semibold",
                selectedUrgencyFilter !== "ALL"
                  ? "border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30"
                  : "border-slate-200 dark:border-[#2c2c36] bg-white dark:bg-[#1a1a20]"
              )}
              aria-label="Filter by Urgency"
            />
          </div>

          {/* Quick Sort by Most Urgent Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortMostUrgent}
            className="h-8 px-2.5 text-xs font-semibold gap-1 border-slate-200 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1f1f26]"
            title="Sort by Most Urgent (least remaining days first)"
          >
            <Clock className="h-3.5 w-3.5 text-rose-500" />
            <span className="hidden lg:inline">Most Urgent</span>
          </Button>

          {/* Quick Search */}
          <div className="relative min-w-[180px] sm:min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate, passport..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Corridor Selector */}
          {onCorridorChange && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-[#2c2c36] bg-white dark:bg-[#1a1a20] p-0.5">
              {availableCorridors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCorridorChange(c)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    corridorFilter === c
                      ? "bg-emerald-900 text-white dark:bg-emerald-600 shadow-xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 border-slate-200 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-300"
            title="Export Visible Columns to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0 border-slate-200 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-300"
              title="Refresh Data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-emerald-600")} />
            </Button>
          )}

          {extraHeaderActions}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Compact Excel-Like Table Body with TanStack Table Rendering   */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-x-auto min-h-[360px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider bg-slate-100/90 dark:bg-[#181820]/95 backdrop-blur-xs border-b border-slate-200 dark:border-[#272730]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as any)?.align || "left";
                  const width = (header.column.columnDef.meta as any)?.width;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width }}
                      className={cn(
                        "py-2.5 px-3 select-none",
                        align === "center" && "text-center",
                        align === "right" && "text-right",
                        canSort && "cursor-pointer hover:bg-slate-200/60 dark:hover:bg-[#22222a]"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1",
                          align === "center" && "justify-center",
                          align === "right" && "justify-end"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              isSorted === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-emerald-600 font-bold" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-emerald-600 font-bold" />
                              )
                            ) : (
                              <ArrowUpDown className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
            {isLoading && table.getRowModel().rows.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {visibleColumns.map((col, idx) => (
                    <td key={idx} className="py-3 px-3">
                      <div className="h-3.5 bg-slate-200 dark:bg-[#252530] rounded-sm w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-8 w-8 text-slate-300 dark:text-zinc-600 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      No matching candidate records found
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {globalFilter || selectedStatusFilter !== "ALL" || selectedUrgencyFilter !== "ALL"
                        ? "No results matching the current filters. Try resetting search or status criteria."
                        : "There are currently no active pipeline records in this operational queue."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedRowId === row.original.applicantId;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick(row.original)}
                    className={cn(
                      "cursor-pointer transition-colors duration-100 hover:bg-emerald-50/60 dark:hover:bg-[#1a2e26]/30",
                      isSelected
                        ? "bg-emerald-50/90 dark:bg-[#183428]/50 ring-1 ring-inset ring-emerald-500 font-medium"
                        : "even:bg-slate-50/30 dark:even:bg-[#141419]/40"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const align = (cell.column.columnDef.meta as any)?.align || "left";

                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "py-2 px-3 whitespace-nowrap text-slate-800 dark:text-zinc-200 text-xs",
                            align === "center" && "text-center",
                            align === "right" && "text-right"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Pagination Footer                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#15151a] text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800 dark:text-white">{totalEntries === 0 ? 0 : startIndex + 1}</strong> to{" "}
            <strong className="text-slate-800 dark:text-white">
              {Math.min(startIndex + pageSize, totalEntries)}
            </strong>{" "}
            of <strong className="text-slate-800 dark:text-white">{totalEntries}</strong> entries
          </span>

          <div className="w-28">
            <SimpleSelect
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(val) => table.setPageSize(Number(val))}
              options={[
                { value: "10", label: "10 / page" },
                { value: "15", label: "15 / page" },
                { value: "25", label: "25 / page" },
                { value: "50", label: "50 / page" },
              ]}
              triggerClassName="h-7 px-2 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              aria-label="Items per page"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
            className="h-7 w-7 p-0 border-slate-200 dark:border-[#2c2c36]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="px-2 text-xs font-medium">
            Page {pageIndex + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
            className="h-7 w-7 p-0 border-slate-200 dark:border-[#2c2c36]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
