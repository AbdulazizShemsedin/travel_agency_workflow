"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileDown,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  Heart,
  Users,
  MapPin,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { OperationalDrawer } from "../OperationalDrawer";
import { ExcelTextInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateApplicantV2 } from "@/lib/api/v2/applicants";
import { renderCvPdfV2 } from "@/lib/api/v2/cv";
import { cn } from "@/lib/utils";

interface CVWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function CVWorkspace({
  data,
  isLoading,
  onRefresh,
  corridorFilter,
  onCorridorChange,
}: CVWorkspaceProps) {
  const queryClient = useQueryClient();

  // Drawer & Row selection state
  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Additional secondary filters
  const [medicalFilter, setMedicalFilter] = React.useState<string>("All");
  const [religionFilter, setReligionFilter] = React.useState<string>("All");
  const [maritalFilter, setMaritalFilter] = React.useState<string>("All");
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState<string | null>(null);

  // Mutation for updating applicant in-cell or via drawer (e.g. remarks, labor_id)
  const updateMutation = useMutation({
    mutationFn: async ({ applicantId, payload }: { applicantId: string; payload: Record<string, any> }) => {
      return updateApplicantV2(applicantId, payload);
    },
    onSuccess: () => {
      toast.success("Applicant updated successfully");
      queryClient.invalidateQueries({ queryKey: ["v2_operational_workspace"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error("Failed to update applicant", {
        description: err?.message || "Please check your network connection and permissions.",
      });
    },
  });

  const handleSaveRemark = async (row: WorkspaceApplicantRow, newRemark: string) => {
    try {
      await updateMutation.mutateAsync({
        applicantId: row.applicantId,
        payload: { remarks: newRemark },
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleDownloadCvPdf = async (row: WorkspaceApplicantRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsDownloadingPdf(row.applicantId);
      toast.info(`Preparing CV PDF for ${row.fullName}...`);
      const blob = await renderCvPdfV2(row.applicantId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_${(row.passportNumber || row.applicantId).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("CV PDF downloaded successfully");
    } catch (err: any) {
      toast.error("Failed to generate CV PDF", {
        description: err?.message || "Please ensure the applicant profile has required photo and details.",
      });
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  // Export current table view to CSV formatted exactly like the client's spreadsheet
  const handleExportCsv = () => {
    if (!filteredData.length) {
      toast.info("No candidate records to export.");
      return;
    }

    const headers = [
      "NO",
      "CONTACT",
      "NAME",
      "PASSPORT",
      "LABOUR ID",
      "MEDICAL",
      "RELIGION",
      "REGION",
      "AGE",
      "MARRIED/NOT",
      "# OF CHILDREN",
      "REMARK",
    ];

    const rows = filteredData.map((r, idx) => [
      idx + 1,
      `"${(r.phone || r.contact || "").replace(/"/g, '""')}"`,
      `"${(r.fullName || "").replace(/"/g, '""')}"`,
      `"${(r.passportNumber || "").replace(/"/g, '""')}"`,
      `"${(r.laborId || "").replace(/"/g, '""')}"`,
      `"${(r.medicalStatus || "").replace(/"/g, '""')}"`,
      `"${(r.religion || "").replace(/"/g, '""')}"`,
      `"${(r.region || "").replace(/"/g, '""')}"`,
      `"${r.age ?? ""}"`,
      `"${(r.maritalStatus || "").replace(/"/g, '""')}"`,
      `"${r.children ?? 0}"`,
      `"${(r.remark || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CV_Candidates_Roster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exported candidate roster to CSV successfully!");
  };

  // Derive unique religions and marital statuses for filter dropdowns
  const availableReligions = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      if (r.religion && r.religion !== "—") set.add(r.religion.trim());
    });
    return Array.from(set).sort();
  }, [data]);

  const availableMaritalStatuses = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      if (r.maritalStatus && r.maritalStatus !== "—") set.add(r.maritalStatus.trim());
    });
    return Array.from(set).sort();
  }, [data]);

  // Secondary filtering on top of corridor
  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      // Medical filter
      if (medicalFilter !== "All") {
        const med = (row.medicalStatus || "").toUpperCase();
        if (medicalFilter === "FIT" && med !== "FIT") return false;
        if (medicalFilter === "UNFIT" && med !== "UNFIT") return false;
        if (medicalFilter === "Pending" && med === "FIT") return false;
      }

      // Religion filter
      if (religionFilter !== "All") {
        if ((row.religion || "").toLowerCase() !== religionFilter.toLowerCase()) return false;
      }

      // Marital filter
      if (maritalFilter !== "All") {
        if ((row.maritalStatus || "").toLowerCase() !== maritalFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [data, medicalFilter, religionFilter, maritalFilter]);

  // Columns definition matching exactly the client's spreadsheet columns
  // (NO, CONTACT, NAME, PASSPORT, LABOUR ID, MEDICAL, RELIGION, REGION, AGE, MARRIED/NOT, # OF CHILDREN, REMARK)
  const columns = React.useMemo<OperationalColumn<WorkspaceApplicantRow>[]>(() => {
    return [
      {
        id: "no",
        header: "NO",
        width: "55px",
        align: "center",
        sortable: true,
        cell: (_, index) => (
          <span className="font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">
            {(index ?? 0) + 1}
          </span>
        ),
      },
      {
        id: "contact",
        header: "CONTACT",
        accessorKey: "phone",
        width: "140px",
        sortable: true,
        cell: (row) => {
          const contactStr = row.phone || row.contact || "—";
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-zinc-200">
              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{contactStr}</span>
            </div>
          );
        },
      },
      {
        id: "name",
        header: "NAME",
        accessorKey: "fullName",
        width: "200px",
        sortable: true,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {row.fullName}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {row.applicantId}
            </span>
          </div>
        ),
      },
      {
        id: "passport",
        header: "PASSPORT",
        accessorKey: "passportNumber",
        width: "120px",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-semibold tracking-wider text-slate-800 dark:text-zinc-200">
            {row.passportNumber || "—"}
          </span>
        ),
      },
      {
        id: "labour_id",
        header: "LABOUR ID",
        accessorKey: "laborId",
        width: "135px",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-medium text-slate-700 dark:text-zinc-300">
            {row.laborId && row.laborId !== "—" ? row.laborId : <span className="text-slate-400">—</span>}
          </span>
        ),
      },
      {
        id: "medical",
        header: "MEDICAL",
        accessorKey: "medicalStatus",
        width: "105px",
        sortable: true,
        cell: (row) => {
          const med = (row.medicalStatus || "").toUpperCase().trim();
          const isFit = med === "FIT";
          const isUnfit = med === "UNFIT";

          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide",
                isFit && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
                isUnfit && "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800",
                !isFit && !isUnfit && "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800"
              )}
            >
              {med || "PENDING"}
            </Badge>
          );
        },
      },
      {
        id: "religion",
        header: "RELIGION",
        accessorKey: "religion",
        width: "110px",
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-slate-700 dark:text-zinc-300 capitalize">
            {row.religion || "—"}
          </span>
        ),
      },
      {
        id: "region",
        header: "REGION",
        accessorKey: "region",
        width: "120px",
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-slate-700 dark:text-zinc-300 truncate block">
            {row.region || "—"}
          </span>
        ),
      },
      {
        id: "age",
        header: "AGE",
        accessorKey: "age",
        width: "70px",
        align: "center",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
            {row.age ?? "—"}
          </span>
        ),
      },
      {
        id: "married_not",
        header: "MARRIED/NOT",
        accessorKey: "maritalStatus",
        width: "115px",
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-slate-700 dark:text-zinc-300 capitalize">
            {row.maritalStatus || "—"}
          </span>
        ),
      },
      {
        id: "children",
        header: "# OF CHILDREN",
        accessorKey: "children",
        width: "110px",
        align: "center",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-medium text-slate-800 dark:text-zinc-200">
            {row.children ?? 0}
          </span>
        ),
      },
      {
        id: "remark",
        header: "REMARK",
        accessorKey: "remark",
        width: "200px",
        sortable: true,
        cell: (row) => (
          <ExcelTextInput
            value={row.remark}
            onSave={(val) => handleSaveRemark(row, val)}
            placeholder="Click to add remark..."
            className="w-full text-xs"
          />
        ),
      },
      {
        id: "actions",
        header: "ACTIONS",
        width: "130px",
        align: "center",
        sortable: false,
        cell: (row) => {
          const isDownloading = isDownloadingPdf === row.applicantId;

          return (
            <div className="flex items-center justify-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRow(row);
                  setIsDrawerOpen(true);
                }}
                className="h-7 px-2 text-[11px] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                title="View candidate dossier"
              >
                View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDownloading}
                onClick={(e) => handleDownloadCvPdf(row, e)}
                className="h-7 px-2 text-[11px] text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Download CV PDF"
              >
                <FileDown className={cn("h-3 w-3 mr-1", isDownloading && "animate-spin")} />
                CV
              </Button>
            </div>
          );
        },
      },
    ];
  }, [isDownloadingPdf, updateMutation]);

  // Extra filter controls passed to OperationalTable header
  const extraHeaderFilters = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Medical filter */}
      <select
        aria-label="Filter by Medical Status"
        value={medicalFilter}
        onChange={(e) => setMedicalFilter(e.target.value)}
        className="h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
      >
        <option value="All">All Medical</option>
        <option value="FIT">FIT Only</option>
        <option value="UNFIT">UNFIT Only</option>
        <option value="Pending">Pending Only</option>
      </select>

      {/* Religion filter */}
      {availableReligions.length > 0 && (
        <select
          aria-label="Filter by Religion"
          value={religionFilter}
          onChange={(e) => setReligionFilter(e.target.value)}
          className="h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
        >
          <option value="All">All Religions ({availableReligions.length})</option>
          {availableReligions.map((rel) => (
            <option key={rel} value={rel}>
              {rel}
            </option>
          ))}
        </select>
      )}

      {/* Marital status filter */}
      {availableMaritalStatuses.length > 0 && (
        <select
          aria-label="Filter by Marital Status"
          value={maritalFilter}
          onChange={(e) => setMaritalFilter(e.target.value)}
          className="h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
        >
          <option value="All">All Marital Statuses</option>
          {availableMaritalStatuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      )}

      {/* Export to CSV / Excel */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExportCsv}
        className="h-8 text-xs gap-1.5 font-semibold text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        title="Export to CSV Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* CV Operational Table                                          */}
      {/* ------------------------------------------------------------- */}
      <OperationalTable
        title="Candidate CV Database"
        subtitle="Master candidate profiles, biological details, medical verification, and remarks"
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        selectedRowId={selectedRow?.applicantId}
        onRowClick={(row) => {
          setSelectedRow(row);
          setIsDrawerOpen(true);
        }}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
        availableCorridors={["All", "Saudi Arabia", "Kuwait"]}
        extraHeaderActions={extraHeaderFilters}
      />

      {/* ------------------------------------------------------------- */}
      {/* Candidate Dossier Detail Drawer                               */}
      {/* ------------------------------------------------------------- */}
      {selectedRow && (
        <OperationalDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedRow(null);
          }}
          title="Candidate Profile & CV Dossier"
          applicantName={selectedRow.fullName}
          applicantId={selectedRow.applicantId}
          passportNumber={selectedRow.passportNumber}
          statusBadge={
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide",
                selectedRow.medicalStatus === "FIT"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : selectedRow.medicalStatus === "UNFIT"
                  ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                  : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
              )}
            >
              Medical: {selectedRow.medicalStatus || "PENDING"}
            </Badge>
          }
          leftAction={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf === selectedRow.applicantId}
              onClick={() => handleDownloadCvPdf(selectedRow)}
              className="text-xs h-8 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
            >
              <FileDown className="h-3.5 w-3.5 mr-1" />
              Download CV PDF
            </Button>
          }
        >
          <div className="space-y-6 text-xs">
            {/* 1. Identification & Contact */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                Identity & Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#14141a]">
                <div>
                  <span className="text-[11px] text-slate-500">Full Name</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedRow.fullName}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Contact Phone</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedRow.phone || selectedRow.contact || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Passport Number</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedRow.passportNumber || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Labour ID</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedRow.laborId || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Biological & Demographic Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Biological & Personal Profile
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#14141a]">
                <div>
                  <span className="text-[11px] text-slate-500">Age</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedRow.age ?? "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Religion</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 capitalize">{selectedRow.religion || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Region</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedRow.region || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Marital Status</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 capitalize">{selectedRow.maritalStatus || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Children Count</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedRow.children ?? 0}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Destination</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedRow.destinationCountry}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Target Role</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedRow.jobApplied || "Housemaid"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Medical Status</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedRow.medicalStatus || "Pending"}</p>
                </div>
              </div>
            </div>

            {/* 3. Operational Remarks */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Operational Remark
              </Label>
              <Input
                defaultValue={selectedRow.remark || ""}
                placeholder="Enter candidate note or remark..."
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (selectedRow.remark || "")) {
                    handleSaveRemark(selectedRow, val);
                  }
                }}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Changes blur-save automatically into the applicant&apos;s authoritative profile.
              </p>
            </div>
          </div>
        </OperationalDrawer>
      )}
    </div>
  );
}
