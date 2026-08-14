"use client";

import * as React from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Applicant, ApplicantState } from "@/types/applicant";
import { getApplicantsList } from "@/lib/api/applicantApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getStageBadgeVariant(stage: ApplicantState): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" | "purple";
  dotColor: string;
} {
  switch (stage) {
    case "Registered":
      return { variant: "success", dotColor: "bg-emerald-600" };
    case "CV Generated":
      return { variant: "purple", dotColor: "bg-purple-600" };
    case "Processing":
      return { variant: "info", dotColor: "bg-blue-600" };
    case "Selected":
      return { variant: "success", dotColor: "bg-emerald-600" };
    case "Draft":
      return { variant: "neutral", dotColor: "bg-slate-500" };
    case "Cancelled":
      return { variant: "destructive", dotColor: "bg-rose-600" };
    default:
      return { variant: "neutral", dotColor: "bg-slate-500" };
  }
}

export function ApplicantTable() {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedStage, setSelectedStage] = React.useState<string>("All");

  const { data: applicants = [], isLoading, isError } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  const columns = React.useMemo<ColumnDef<Applicant>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: "name",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "full_name",
        header: "Full Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-900 border border-emerald-200">
              {row.original.first_name?.[0] || "A"}
            </div>
            <span className="font-medium text-slate-900">
              {row.original.full_name || `${row.original.first_name} ${row.original.last_name}`}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "passport_number",
        header: "Passport No.",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.passport_number || "N/A"}
          </span>
        ),
      },
      {
        accessorKey: "applicant_state",
        header: "Current Stage",
        cell: ({ row }) => {
          const state = row.original.applicant_state || "Draft";
          const badgeConfig = getStageBadgeVariant(state);
          return (
            <Badge variant={badgeConfig.variant} dotColor={badgeConfig.dotColor}>
              {state}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link href={`/applicants/${encodeURIComponent(row.original.name)}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-slate-600 hover:text-emerald-900"
              >
                <Eye className="mr-1 h-3.5 w-3.5" /> Details
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const filteredData = React.useMemo(() => {
    if (selectedStage === "All") return applicants;
    return applicants.filter((a) => a.applicant_state === selectedStage);
  }, [applicants, selectedStage]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Header Controls: Search, Stage Filter, Export, Add New */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applicant, passport, phone..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 shadow-xs focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">All Stages</option>
            <option value="Draft">Draft</option>
            <option value="Registered">Registered</option>
            <option value="CV Generated">CV Generated</option>
            <option value="Processing">Processing</option>
            <option value="Selected">Selected</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dataStr =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(applicants, null, 2));
              const downloadAnchor = document.createElement("a");
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", "applicants_export.json");
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="text-xs text-slate-700"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>

          <Link href="/applicants/new">
            <Button
              size="sm"
              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-medium"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Applicant
            </Button>
          </Link>
        </div>
      </div>

      {/* Table Container matching Figma Card Style */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                    Loading applicants...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                    No applicants found. Click &quot;New Applicant&quot; to register your first candidate.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Figma */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {table.getRowModel().rows.length > 0
                ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredData.length
              )}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{filteredData.length}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 text-xs font-semibold text-slate-800">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
