"use client";

import * as React from "react";
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
  Globe2,
  X,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  columns,
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumnId, setSortColumnId] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  // 1. Filter data by search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    return data.filter((row) => {
      const nameMatch = row.fullName.toLowerCase().includes(q);
      const passMatch = row.passportNumber.toLowerCase().includes(q);
      const idMatch = row.applicantId.toLowerCase().includes(q);
      const sponsorMatch = row.sponsorName?.toLowerCase().includes(q);
      const contractorMatch = row.lockedContractor?.toLowerCase().includes(q);
      const visaMatch = row.visaNumber?.toLowerCase().includes(q);

      return nameMatch || passMatch || idMatch || sponsorMatch || contractorMatch || visaMatch;
    });
  }, [data, searchQuery]);

  // 2. Sort filtered data
  const sortedData = React.useMemo(() => {
    if (!sortColumnId) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      const col = columns.find((c) => c.id === sortColumnId);
      if (!col || !col.accessorKey) return 0;

      const aVal = a[col.accessorKey] ?? "";
      const bVal = b[col.accessorKey] ?? "";

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumnId, sortDirection, columns]);

  // 3. Paginate
  const totalEntries = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  // Toggle sort direction
  const handleSort = (colId: string) => {
    if (sortColumnId === colId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumnId(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumnId(colId);
      setSortDirection("asc");
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const headers = columns.map((c) => `"${c.header}"`).join(",");
    const rows = sortedData.map((row: any) => {
      return columns
        .map((col) => {
          const val = col.accessorKey ? row[col.accessorKey] ?? "" : "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate, passport, sponsor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 pr-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
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
            title="Export Table to CSV"
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
      {/* Compact Excel-Like Table Body                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-x-auto min-h-[360px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider bg-slate-100/90 dark:bg-[#181820]/95 backdrop-blur-xs border-b border-slate-200 dark:border-[#272730]">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumnId === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={{ width: col.width }}
                    className={cn(
                      "py-2.5 px-3 select-none",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.sortable !== false && "cursor-pointer hover:bg-slate-200/60 dark:hover:bg-[#22222a]"
                    )}
                    onClick={() => col.sortable !== false && handleSort(col.id)}
                  >
                    <div className={cn("inline-flex items-center gap-1", col.align === "center" && "justify-center", col.align === "right" && "justify-end")}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === "asc" ? (
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
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
            {isLoading && paginatedData.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, idx) => (
                    <td key={idx} className="py-3 px-3">
                      <div className="h-3.5 bg-slate-200 dark:bg-[#252530] rounded-sm w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="h-8 w-8 text-slate-300 dark:text-zinc-600 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      No matching candidate records found
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery
                        ? `No results matching "${searchQuery}". Try clearing your search query.`
                        : "There are currently no active pipeline records in this operational queue."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, rowIndex) => {
                const isSelected = selectedRowId === row.applicantId;
                const displayIndex = startIndex + rowIndex + 1;

                return (
                  <tr
                    key={row.applicantId}
                    onClick={() => onRowClick(row)}
                    className={cn(
                      "cursor-pointer transition-colors duration-100 hover:bg-emerald-50/60 dark:hover:bg-[#1a2e26]/30",
                      isSelected
                        ? "bg-emerald-50/90 dark:bg-[#183428]/50 ring-1 ring-inset ring-emerald-500 font-medium"
                        : "even:bg-slate-50/30 dark:even:bg-[#141419]/40"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "py-2 px-3 whitespace-nowrap text-slate-800 dark:text-zinc-200 text-xs",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.cell(row, displayIndex)}
                      </td>
                    ))}
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

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="ml-2 h-7 px-1.5 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-700 dark:text-zinc-300"
          >
            <option value={10}>10 / page</option>
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="h-7 w-7 p-0 border-slate-200 dark:border-[#2c2c36]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="px-2 text-xs font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="h-7 w-7 p-0 border-slate-200 dark:border-[#2c2c36]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
