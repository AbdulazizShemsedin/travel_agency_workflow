"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Search,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchOperationalWorkspaceData } from "@/lib/api/applicantApi";
import { WorkspaceApplicantRow } from "@/types/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToPDF, ExportColumn } from "@/lib/utils/reportExport";

export function LMISReportView() {
  const [corridorFilter, setCorridorFilter] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [medicalFilter, setMedicalFilter] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const {
    data: lmisData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["lmis_report_data", corridorFilter],
    queryFn: () => fetchOperationalWorkspaceData("lms", corridorFilter),
    staleTime: 10000,
  });

  // Calculate High-Impact KPIs
  const totalClearances = lmisData.length;
  const issuedClearances = lmisData.filter((r) => r.lmisStatus === "Issued" || r.lmisStatus === "Approved").length;
  const pendingClearances = lmisData.filter((r) => !r.lmisStatus || r.lmisStatus === "Pending").length;
  const rejectedClearances = lmisData.filter((r) => r.lmisStatus === "Rejected").length;
  const missingDataRequests = lmisData.filter((r) => r.lms?.missing_data_requested).length;

  // Duration Buckets
  const durationUnder30 = lmisData.filter((r) => (r.duration || 0) <= 30).length;
  const duration30to60 = lmisData.filter((r) => (r.duration || 0) > 30 && (r.duration || 0) <= 60).length;
  const duration60to90 = lmisData.filter((r) => (r.duration || 0) > 60 && (r.duration || 0) <= 90).length;
  const durationOver90 = lmisData.filter((r) => (r.duration || 0) > 90).length;

  const durationData = [
    { name: "< 30 Days", count: durationUnder30, fill: "#10b981" },
    { name: "30-60 Days", count: duration30to60, fill: "#3b82f6" },
    { name: "60-90 Days", count: duration60to90, fill: "#f59e0b" },
    { name: "> 90 Days", count: durationOver90, fill: "#ef4444" },
  ];

  const statusPieData = [
    { name: "Issued", value: issuedClearances, color: "#059669" },
    { name: "Pending", value: pendingClearances, color: "#d97706" },
    { name: "Rejected", value: rejectedClearances, color: "#e11d48" },
  ].filter((d) => d.value > 0);

  // Filtered dataset for detailed table
  const filteredRows = React.useMemo(() => {
    return lmisData.filter((row) => {
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Issued" && (row.lmisStatus === "Issued" || row.lmisStatus === "Approved")) ||
        (statusFilter === "Pending" && (!row.lmisStatus || row.lmisStatus === "Pending")) ||
        (statusFilter === "Rejected" && row.lmisStatus === "Rejected");

      const matchesMedical =
        medicalFilter === "All" ||
        (medicalFilter === "FIT" && (row.medicalStatus || "").toUpperCase().includes("FIT")) ||
        (medicalFilter === "UNFIT" && (row.medicalStatus || "").toUpperCase().includes("UNFIT"));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.passportNumber.toLowerCase().includes(q) ||
        (row.laborId && row.laborId.toLowerCase().includes(q)) ||
        (row.contact && row.contact.toLowerCase().includes(q));

      return matchesStatus && matchesMedical && matchesSearch;
    });
  }, [lmisData, statusFilter, medicalFilter, searchQuery]);

  // Export Columns
  const exportColumns: ExportColumn<WorkspaceApplicantRow>[] = [
    { header: "Applicant ID", accessor: "applicantId" },
    { header: "Candidate Name", accessor: "fullName" },
    { header: "Passport Number", accessor: "passportNumber" },
    { header: "Labor ID / Ref", accessor: (r: WorkspaceApplicantRow) => r.laborId || "—" },
    { header: "Contract Date", accessor: (r: WorkspaceApplicantRow) => r.contractDate || "—" },
    { header: "Medical Status", accessor: (r: WorkspaceApplicantRow) => r.medicalStatus || "Pending" },
    { header: "Medical Date", accessor: (r: WorkspaceApplicantRow) => r.medicalDate || "—" },
    { header: "Medical Remaining Days", accessor: (r: WorkspaceApplicantRow) => r.medicalRemaining ?? "—" },
    { header: "LMIS Status", accessor: (r: WorkspaceApplicantRow) => r.lmisStatus || "Pending" },
    { header: "Issue Date", accessor: (r: WorkspaceApplicantRow) => r.issueDate || "—" },
    { header: "Contact", accessor: (r: WorkspaceApplicantRow) => r.contact || "—" },
    { header: "Remark", accessor: (r: WorkspaceApplicantRow) => r.remark || "—" },
  ];

  // Excel Export
  const handleExportExcel = () => {
    if (filteredRows.length === 0) return;
    exportToExcel(
      `LMIS_Ministry_Clearance_Report_${new Date().toISOString().split("T")[0]}`,
      exportColumns,
      filteredRows,
      "LMIS / Ministry of Labor Clearance Operational Report",
      {
        "Corridor": corridorFilter,
        "Status Filter": statusFilter,
        "Medical Filter": medicalFilter,
        "Total Filtered Records": filteredRows.length,
      }
    );
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredRows.length === 0) return;
    exportToPDF(
      "LMIS Ministry Clearance Operations Report",
      exportColumns,
      filteredRows,
      [
        { label: "Total Candidates", value: filteredRows.length },
        { label: "Issued Clearances", value: filteredRows.filter((r) => r.lmisStatus === "Issued").length },
        { label: "Pending Ministry", value: filteredRows.filter((r) => r.lmisStatus === "Pending" || !r.lmisStatus).length },
        { label: "Medical Valid", value: filteredRows.filter((r) => (r.medicalStatus || "").toUpperCase().includes("FIT")).length },
      ],
      `Corridor: ${corridorFilter} | Status: ${statusFilter} | Medical: ${medicalFilter}`
    );
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Operational Actions                              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
              <FileCheck2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              LMIS Ministry Clearance Operations Report
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Labor Market Information System quota clearance tracking, medical validity status, and Ministry processing analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Corridor selector */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-[#2c2c36] bg-white dark:bg-[#1a1a20] p-0.5">
            {["All", "Saudi Arabia", "Kuwait"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCorridorFilter(c)}
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 border-slate-200 dark:border-[#2c2c36]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin text-emerald-600")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 px-2.5 text-xs font-medium gap-1.5 border-slate-300 dark:border-[#2c2c36]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KPI Cards Grid                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Total Clearances
              </span>
              <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalClearances}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">candidates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Issued / Approved
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {issuedClearances}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                {totalClearances > 0 ? `${Math.round((issuedClearances / totalClearances) * 100)}% issued` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Pending Ministry Clearance
              </span>
              <span className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">
                {pendingClearances}
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-500">in queue</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                Missing Docs / Rejected
              </span>
              <span className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-800 dark:text-rose-400">
                {missingDataRequests + rejectedClearances}
              </span>
              <span className="text-[11px] text-rose-600 dark:text-rose-500">action required</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Visual Analytics Charts                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contract Duration Aging Breakdown */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Contract Elapsed Days (Duration Distribution)</span>
              <Badge variant="outline" className="text-[10px] font-medium">DATEDIF Metric</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Days elapsed since contract inception / registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181820", borderColor: "#272730", borderRadius: 8, fontSize: 12, color: "#fff" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {durationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clearance Status Share */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>LMIS Clearance Status Breakdown</span>
              <Badge variant="outline" className="text-[10px] font-medium">Ministry Outcomes</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Ratio of Issued, Pending, and Rejected Labor Clearances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {statusPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No clearance data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#181820", borderColor: "#272730", borderRadius: 8, fontSize: 12, color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Detailed Operational Data Table                               */}
      {/* ------------------------------------------------------------- */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216] overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#15151a]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                LMIS Operational Clearances Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Detailed candidate rows matching the exact LMIS operational specifications.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search name, passport, labor ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div className="w-36">
                <SimpleSelect
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "All", label: "All Statuses" },
                    { value: "Issued", label: "Issued" },
                    { value: "Pending", label: "Pending" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Status"
                />
              </div>

              <div className="w-36">
                <SimpleSelect
                  value={medicalFilter}
                  onValueChange={setMedicalFilter}
                  options={[
                    { value: "All", label: "All Medical" },
                    { value: "FIT", label: "FIT" },
                    { value: "UNFIT", label: "UNFIT" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Medical"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider bg-slate-100/90 dark:bg-[#181820]/95 border-b border-slate-200 dark:border-[#272730]">
              <tr>
                <th className="py-2.5 px-3 text-center">NO</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">PASSPORT</th>
                <th className="py-2.5 px-3">LABOR ID</th>
                <th className="py-2.5 px-3">CONTRACT DATE</th>
                <th className="py-2.5 px-3 text-center">DURATION</th>
                <th className="py-2.5 px-3 text-center">MEDICAL</th>
                <th className="py-2.5 px-3">MED DATE</th>
                <th className="py-2.5 px-3 text-center">MEDI REMAINING</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3">ISSUE DATE</th>
                <th className="py-2.5 px-3">CONTACT</th>
                <th className="py-2.5 px-3">REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={13} className="py-3 px-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#252530] rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400 text-xs">
                    No LMIS clearance records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isFit = (row.medicalStatus || "").toUpperCase().includes("FIT");
                  const isIssued = row.lmisStatus === "Issued" || row.lmisStatus === "Approved";
                  const isRejected = row.lmisStatus === "Rejected";

                  return (
                    <tr key={row.applicantId} className="hover:bg-slate-50 dark:hover:bg-[#181822] transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white uppercase whitespace-nowrap">
                        {row.fullName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-zinc-300">
                        {row.passportNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-400">
                        {row.laborId || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300">
                        {row.contractDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {row.duration ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isFit
                              ? "bg-emerald-600 text-white font-bold text-[10px]"
                              : "bg-rose-600 text-white font-bold text-[10px]"
                          }
                        >
                          {isFit ? "FIT" : "UNFIT"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                        {row.medicalDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-xs">
                        <span className={row.medicalRemaining?.includes("-") ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}>
                          {row.medicalRemaining || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isIssued
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : isRejected
                              ? "bg-rose-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {row.lmisStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                        {row.issueDate || "—"}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-slate-700 dark:text-zinc-300 truncate max-w-[140px]">
                        {row.contact || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400 truncate max-w-[150px]">
                        {row.remark || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
