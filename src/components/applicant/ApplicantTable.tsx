"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Download,
  Plus,
  Eye,
  UserCheck,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Applicant, ApplicantState } from "@/types/applicant";
import { listApplicantsV2, V2ApplicantDetails } from "@/lib/api/v2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignEmployeeModal } from "./AssignEmployeeModal";
import { SimpleSelect } from "@/components/ui/select";

function getStageBadgeVariant(stage: string): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" | "purple";
  dotColor: string;
} {
  switch (stage) {
    case "Registered":
      return { variant: "success", dotColor: "bg-emerald-600" };
    case "CV Generated":
      return { variant: "purple", dotColor: "bg-purple-600" };
    case "Selected":
      return { variant: "info", dotColor: "bg-blue-600" };
    case "Processing":
      return { variant: "info", dotColor: "bg-indigo-600" };
    case "Stamped":
      return { variant: "info", dotColor: "bg-teal-600" };
    case "Ticketed":
      return { variant: "purple", dotColor: "bg-indigo-600" };
    case "Departed":
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStage, setSelectedStage] = React.useState<string>("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

  // Modal State for Assign Employee
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [assignTargetIds, setAssignTargetIds] = React.useState<string[]>([]);
  const [assignTargetNames, setAssignTargetNames] = React.useState<string[]>([]);

  const { data: applicants = [], isLoading } = useQuery<V2ApplicantDetails[]>({
    queryKey: ["applicants"],
    queryFn: () => listApplicantsV2(),
  });

  // Filtered & searched data
  const filteredApplicants = React.useMemo(() => {
    return applicants.filter((applicant) => {
      const currentStatus = applicant.status || applicant.applicant_state || "Draft";
      const matchesStage =
        selectedStage === "All" || currentStatus === selectedStage;

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

  const handleToggleRow = (name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(selectedRows);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedRows(next);
  };

  const handleRowClick = (name: string) => {
    router.push(`/applicants/${encodeURIComponent(name)}`);
  };

  const handleBatchAssign = () => {
    const ids = Array.from(selectedRows);
    const selectedApplicants = applicants.filter((a) => ids.includes(a.name));

    // Check if ALL selected applicants are in "Selected" stage
    const nonSelectedCandidates = selectedApplicants.filter(
      (a) => a.applicant_state !== "Selected"
    );

    if (nonSelectedCandidates.length > 0) {
      const invalidNames = nonSelectedCandidates
        .map((a) => `${a.full_name || a.name} (${a.applicant_state || "Draft"})`)
        .slice(0, 3)
        .join(", ");

      toast.error("Cannot Assign Employee: Stage Ineligible", {
        description: `Of the applicants selected, one or more have not reached the 'Selected' stage (${invalidNames}). Only candidates on 'Selected' stage can be assigned processing staff.`,
        duration: 6000,
      });
      return;
    }

    const names = selectedApplicants.map((a) => a.full_name || a.name);
    setAssignTargetIds(ids);
    setAssignTargetNames(names);
    setIsAssignModalOpen(true);
  };

  const handleSingleAssign = (applicant: V2ApplicantDetails, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentStatus = applicant.status || applicant.applicant_state;
    if (currentStatus !== "Selected") {
      toast.error("Cannot Assign Employee", {
        description: `Applicant is currently in '${currentStatus}' stage. Assignment is only available in 'Selected' stage.`,
      });
      return;
    }
    setAssignTargetIds([applicant.name]);
    setAssignTargetNames([applicant.full_name || applicant.name]);
    setIsAssignModalOpen(true);
  };

  // Selected counts breakdown
  const selectedApplicantsList = applicants.filter((a) => selectedRows.has(a.name));
  const selectedStageCount = selectedApplicantsList.filter((a) => a.applicant_state === "Selected").length;
  const hasIneligibleSelected = selectedRows.size > 0 && selectedStageCount < selectedRows.size;

  return (
    <div className="space-y-4">
      {/* Floating Batch Action Banner when items are selected */}
      {selectedRows.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-900 dark:bg-emerald-950 text-white p-3.5 shadow-md border border-emerald-800 dark:border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950">
              {selectedRows.size}
            </span>
            <div>
              <p className="text-xs font-semibold">
                {selectedRows.size} applicant{selectedRows.size > 1 ? "s" : ""} selected
              </p>
              <p className="text-[11px] text-emerald-200">
                {selectedStageCount} in &quot;Selected&quot; stage •{" "}
                {selectedRows.size - selectedStageCount} in other stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              variant="outline"
              className="text-xs border-emerald-700 text-emerald-100 hover:bg-emerald-800 bg-emerald-900/40"
            >
              Clear Selection
            </Button>
            {/* Prominent Assign Employee Button */}
            <Button
              size="sm"
              onClick={handleBatchAssign}
              className={`text-xs font-bold shadow-xs cursor-pointer ${
                hasIneligibleSelected
                  ? "bg-amber-500 hover:bg-amber-400 text-amber-950"
                  : "bg-emerald-400 hover:bg-emerald-300 text-emerald-950"
              }`}
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              Assign Employee ({selectedRows.size})
            </Button>
          </div>
        </div>
      )}

      {/* Header Controls: Search, Stage Filter, Export, Add New */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applicant, passport, phone, city..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="w-44 sm:w-52">
            <SimpleSelect
              value={selectedStage}
              onValueChange={(val) => {
                setSelectedStage(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: `All Stages (${applicants.length})` },
                { value: "Draft", label: "Draft" },
                { value: "Registered", label: "Registered" },
                { value: "CV Generated", label: "CV Generated" },
                { value: "Selected", label: "Selected" },
                { value: "Processing", label: "Processing" },
                { value: "Stamped", label: "Stamped" },
                { value: "Ticketed", label: "Ticketed" },
                { value: "Departed", label: "Departed" },
                { value: "Cancelled", label: "Cancelled" },
              ]}
              triggerClassName="h-9.5 rounded-lg border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] text-xs font-semibold"
              aria-label="Filter by Stage"
            />
          </div>
        </div>
      </div>

      {/* Table Container with Clickable Rows */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
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
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
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
                  const isSelectedStage = stage === "Selected";

                  return (
                    <tr
                      key={applicant.name}
                      onClick={() => handleRowClick(applicant.name)}
                      className={`cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/70 transition-colors ${
                        isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                      }`}
                      title="Click to view applicant details"
                    >
                      {/* Checkbox cell (stops propagation so row click isn't triggered) */}
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleRow(applicant.name, e as unknown as React.MouseEvent)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {applicant.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {applicant.first_name?.[0] || "A"}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100 block">
                              {applicant.full_name ||
                                `${applicant.first_name} ${applicant.last_name}`}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {applicant.phone_number} • {applicant.city}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {applicant.passport_number || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} dotColor={badge.dotColor}>
                          {stage}
                        </Badge>
                      </td>
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Direct Inline Action Buttons */}
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. View Detail Action */}
                          <Link
                            href={`/applicants/${encodeURIComponent(applicant.name)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-[#1a1a22] hover:bg-slate-200 dark:hover:bg-[#252530] border border-slate-200 dark:border-[#2a2a35] transition"
                            title="View Candidate Dossier"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>View</span>
                          </Link>

                          {/* 2. Assign Processing Employee - SHOWN ONLY IF ON 'Selected' STAGE */}
                          {isSelectedStage && (
                            <button
                              type="button"
                              onClick={(e) => handleSingleAssign(applicant, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs"
                              title="Assign Processing Staff"
                            >
                              <UserCheck className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                              <span>Assign</span>
                            </button>
                          )}

                          {/* 3. Preview CV Action */}
                          {applicant.applicant_state !== "Draft" && (
                            <Link
                              href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition"
                              title="Standardized PDF CV"
                            >
                              <FileText className="h-3 w-3 text-purple-600" />
                              <span>CV</span>
                            </Link>
                          )}

                          {/* 4. Contractor Document Action */}
                          {(applicant.applicant_state === "CV Generated" ||
                            applicant.applicant_state === "Selected" ||
                            applicant.applicant_state === "Processing") && (
                            <Link
                              href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition"
                              title="Contractor Deployment Document"
                            >
                              <Building2 className="h-3 w-3 text-amber-600" />
                              <span>Doc</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {filteredApplicants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.min(currentPage * pageSize, filteredApplicants.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-900 dark:text-white">{filteredApplicants.length}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2 text-xs border-slate-200 dark:border-slate-700"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Assign Employee Modal */}
      <AssignEmployeeModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        applicantIds={assignTargetIds}
        applicantNames={assignTargetNames}
        destinationCountry={
          assignTargetIds.length === 1
            ? applicants.find((a) => a.name === assignTargetIds[0])?.destination_country
            : undefined
        }
        onSuccess={() => {
          setSelectedRows(new Set());
        }}
      />
    </div>
  );
}
