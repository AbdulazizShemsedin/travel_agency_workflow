"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStage, setSelectedStage] = React.useState<string>("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

  const { data: applicants = [], isLoading, isError } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  // Filtered & searched data
  const filteredApplicants = React.useMemo(() => {
    return applicants.filter((applicant) => {
      const matchesStage =
        selectedStage === "All" || applicant.applicant_state === selectedStage;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        applicant.name?.toLowerCase().includes(query) ||
        applicant.full_name?.toLowerCase().includes(query) ||
        applicant.passport_number?.toLowerCase().includes(query) ||
        applicant.phone_number?.toLowerCase().includes(query) ||
        applicant.city?.toLowerCase().includes(query);

      return matchesStage && matchesSearch;
    });
  }, [applicants, selectedStage, searchQuery]);

  // Paginated slice
  const totalPages = Math.ceil(filteredApplicants.length / pageSize) || 1;
  const paginatedApplicants = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplicants.slice(start, start + pageSize);
  }, [filteredApplicants, currentPage, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(paginatedApplicants.map((a) => a.name)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleToggleRow = (name: string) => {
    const next = new Set(selectedRows);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedRows(next);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls: Search, Stage Filter, Export, Add New */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applicant, passport, phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => {
              setSelectedStage(e.target.value);
              setCurrentPage(1);
            }}
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
                encodeURIComponent(JSON.stringify(filteredApplicants, null, 2));
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
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                    checked={
                      paginatedApplicants.length > 0 &&
                      paginatedApplicants.every((a) => selectedRows.has(a.name))
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Full Name</th>
                <th className="px-4 py-3.5">Passport No.</th>
                <th className="px-4 py-3.5">Current Stage</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading applicants...
                  </td>
                </tr>
              ) : paginatedApplicants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No applicants found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedApplicants.map((applicant) => {
                  const stage = applicant.applicant_state || "Draft";
                  const badge = getStageBadgeVariant(stage);
                  const isSelected = selectedRows.has(applicant.name);

                  return (
                    <tr
                      key={applicant.name}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                          checked={isSelected}
                          onChange={() => handleToggleRow(applicant.name)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {applicant.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-900 border border-emerald-200">
                            {applicant.first_name?.[0] || "A"}
                          </div>
                          <span className="font-medium text-slate-900">
                            {applicant.full_name ||
                              `${applicant.first_name} ${applicant.last_name}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {applicant.passport_number || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} dotColor={badge.dotColor}>
                          {stage}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/applicants/${encodeURIComponent(applicant.name)}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-emerald-900"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching Figma */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredApplicants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, filteredApplicants.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{filteredApplicants.length}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 text-xs font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
