"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileDown,
  Phone,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelTextInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateApplicantV2 } from "@/lib/api/v2/applicants";
import { generateCvV2, renderCvPdfV2 } from "@/lib/api/v2/cv";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";
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
  const { can } = useAuth();
  const canGenerateCv = can("generateCv");

  // Track in-progress CV generation and PDF download states per applicant
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState<string | null>(null);
  const [cvGeneratedSet, setCvGeneratedSet] = React.useState<Set<string>>(new Set());

  // Additional secondary filters
  const [medicalFilter, setMedicalFilter] = React.useState<string>("All");
  const [religionFilter, setReligionFilter] = React.useState<string>("All");
  const [maritalFilter, setMaritalFilter] = React.useState<string>("All");

  // Mutation for updating applicant in-cell (e.g. remarks)
  const updateMutation = useMutation({
    mutationFn: async ({ applicantId, payload }: { applicantId: string; payload: Record<string, any> }) => {
      return updateApplicantV2(applicantId, payload);
    },
    onSuccess: () => {
      toast.success("Applicant updated successfully");
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
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

  // Helper to determine if an applicant's official CV has already been compiled
  const isCvGenerated = React.useCallback(
    (row: WorkspaceApplicantRow): boolean => {
      if (cvGeneratedSet.has(row.applicantId)) return true;
      const app = row.applicant as any;
      const status = String(app?.status || app?.applicant_state || "").trim();

      // If status is CV Generated or any later operational stage
      if (
        status === "CV Generated" ||
        status === "Selected" ||
        status === "Processing" ||
        status === "Stamped" ||
        status === "Ticketed" ||
        status === "Departed"
      ) {
        return true;
      }

      // If placement is linked (candidate was already selected by agency)
      if (row.dsrName || app?.active_placement || row.placementId) {
        return true;
      }

      // If official CV document record or URL is stored
      if (app?.cv_record || app?.cv_file_url || app?.cv_pdf_url) {
        return true;
      }

      return false;
    },
    [cvGeneratedSet]
  );

  // Mutation to generate official recruitment CV (calls agency_tracking.cv_api.generate_cv)
  const generateCvMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      return generateCvV2(applicantId);
    },
    onSuccess: (data, applicantId) => {
      toast.success("CV Generated Successfully", {
        description: data?.message || `Official recruitment CV compiled for ${applicantId}.`,
      });
      setCvGeneratedSet((prev) => new Set(prev).add(applicantId));
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
    },
    onError: (err: any) => {
      const rawMsg = err?.message || "";
      const isRenderCrash =
        rawMsg.includes("Non-JSON response") ||
        rawMsg.includes("non-JSON") ||
        rawMsg.includes("HTTP 500");
      const description = isRenderCrash
        ? "We couldn't generate the official CV document right now. Please verify applicant information and photo, then try again."
        : formatCleanErrorMessage(err);
      toast.error("CV Generation Failed", { description });
    },
    onSettled: () => {
      setGeneratingId(null);
    },
  });

  const handleGenerateCv = async (row: WorkspaceApplicantRow, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!canGenerateCv) {
      toast.error("Permission Denied", {
        description: "CV generation requires Registrar or Admin permissions.",
      });
      return;
    }

    const med = (row.medicalStatus || (row.applicant as any)?.medical_status || "").toUpperCase().trim();
    if (med === "UNFIT") {
      toast.error("Medically UNFIT", {
        description: `${row.fullName || row.applicantId} is medically UNFIT -- a CV cannot be generated.`,
      });
      return;
    }

    const app = row.applicant as any;
    const status = String(app?.status || app?.applicant_state || "").trim();
    if (status === "Draft") {
      toast.error("Registration Required", {
        description: `${row.fullName || row.applicantId} is still in Draft status. Complete registration before generating a CV.`,
      });
      return;
    }

    setGeneratingId(row.applicantId);
    toast.info(`Generating official CV for ${row.fullName || row.applicantId}...`);
    generateCvMutation.mutate(row.applicantId);
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
  // (NO, CONTACT, NAME, PASSPORT, LABOUR ID, MEDICAL, RELIGION, REGION, AGE, MARRIED/NOT, # OF CHILDREN, REMARK, ACTIONS)
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
            <Link
              href={`/applicants/${encodeURIComponent(row.applicantId)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              title="Open Candidate Profile"
            >
              {row.fullName}
            </Link>
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
        header: <span data-tour="cv-actions-header">ACTIONS</span>,
        width: "165px",
        align: "center",
        sortable: false,
        cell: (row) => {
          const isDownloading = isDownloadingPdf === row.applicantId;
          const isGenerating =
            generatingId === row.applicantId ||
            (generateCvMutation.isPending && generateCvMutation.variables === row.applicantId);
          const hasCv = isCvGenerated(row);
          const isUnfit = (row.medicalStatus || "").toUpperCase().trim() === "UNFIT";
          const app = row.applicant as any;
          const isDraft = String(app?.status || app?.applicant_state || "").trim() === "Draft";

          // If CV is not yet generated, display the "Generate CV" button (like on applicant detail)
          if (!hasCv) {
            return (
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  size="sm"
                  disabled={isGenerating || isUnfit}
                  onClick={(e) => handleGenerateCv(row, e)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] font-bold gap-1 transition shadow-2xs cursor-pointer",
                    isUnfit
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-zinc-700 cursor-not-allowed"
                      : "bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                  )}
                  title={
                    isUnfit
                      ? "Candidate is medically UNFIT -- a CV cannot be generated"
                      : isDraft
                      ? "Candidate is in Draft -- complete registration before generating CV"
                      : "Generate bilateral recruitment CV"
                  }
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3" />
                      <span>Generate CV</span>
                    </>
                  )}
                </Button>
              </div>
            );
          }

          // Once CV is generated, display the Eye icon button (triggering View CV like on applicant detail)
          // and the PDF CV download button
          return (
            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Eye icon button triggering View CV */}
              <Link
                href={`/applicants/${encodeURIComponent(row.applicantId)}/cv`}
                className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-[#1a1a22] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-[#2a2a35] transition shadow-2xs"
                title="View CV"
              >
                <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
                <span>View CV</span>
              </Link>

              {/* Download Official CV PDF Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDownloading}
                onClick={(e) => handleDownloadCvPdf(row, e)}
                className="h-7 px-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Download Official CV PDF"
              >
                <FileDown className={cn("h-3 w-3 mr-1", isDownloading && "animate-spin")} />
                <span>PDF</span>
              </Button>
            </div>
          );
        },
      },
    ];
  }, [
    isDownloadingPdf,
    generatingId,
    generateCvMutation.isPending,
    generateCvMutation.variables,
    isCvGenerated,
    canGenerateCv,
    updateMutation,
  ]);

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
        data-tour="cv-export-button"
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
    <div data-tour="cv-workspace-table" className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* CV Operational Table (without slide drawer popup)              */}
      {/* ------------------------------------------------------------- */}
      <OperationalTable
        title="Candidate CV Database"
        subtitle="Master candidate profiles, biological details, medical verification, and remarks"
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
        availableCorridors={["All", "Saudi Arabia", "Kuwait"]}
        extraHeaderActions={extraHeaderFilters}
      />
    </div>
  );
}
