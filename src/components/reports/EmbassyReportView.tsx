"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Search,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileText,
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

export function EmbassyReportView() {
  const [corridorFilter, setCorridorFilter] = React.useState<string>("All");
  const [wakalaFilter, setWakalaFilter] = React.useState<string>("All");
  const [embassyStatusFilter, setEmbassyStatusFilter] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const {
    data: embassyData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["embassy_report_data", corridorFilter],
    queryFn: () => fetchOperationalWorkspaceData("embassy", corridorFilter),
    staleTime: 10000,
  });

  // Calculate Embassy & Wakala KPIs
  const totalPassports = embassyData.length;
  const wakalaAuthorized = embassyData.filter((r) => (r.wakalaStatus || "").toLowerCase().includes("completed") || (r.wakalaStatus || "").toLowerCase().includes("authorized")).length;
  const embassyApproved = embassyData.filter((r) => r.embassyStatus === "Approved" || r.stamp?.status === "Completed").length;
  const embassySubmitted = embassyData.filter((r) => r.embassyStatus === "Submitted").length;
  const embassyRejected = embassyData.filter((r) => r.embassyStatus === "Rejected").length;

  const embassyPieData = [
    { name: "Approved / Stamped", value: embassyApproved, color: "#059669" },
    { name: "Submitted", value: embassySubmitted, color: "#2563eb" },
    { name: "Pending", value: totalPassports - (embassyApproved + embassySubmitted + embassyRejected), color: "#d97706" },
    { name: "Rejected", value: embassyRejected, color: "#e11d48" },
  ].filter((d) => d.value > 0);

  const wakalaPieData = [
    { name: "Authorized", value: wakalaAuthorized, color: "#059669" },
    { name: "Pending Authorization", value: totalPassports - wakalaAuthorized, color: "#d97706" },
  ].filter((d) => d.value > 0);

  // Filtered rows
  const filteredRows = React.useMemo(() => {
    return embassyData.filter((row) => {
      const matchesWakala = wakalaFilter === "All" || row.wakalaStatus === wakalaFilter;
      const matchesEmbassy = embassyStatusFilter === "All" || row.embassyStatus === embassyStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.passportNumber.toLowerCase().includes(q) ||
        (row.contact && row.contact.toLowerCase().includes(q));

      return matchesWakala && matchesEmbassy && matchesSearch;
    });
  }, [embassyData, wakalaFilter, embassyStatusFilter, searchQuery]);

  // Export Columns
  const exportColumns: ExportColumn<WorkspaceApplicantRow>[] = [
    { header: "Applicant ID", accessor: "applicantId" },
    { header: "Candidate Name", accessor: "fullName" },
    { header: "Passport Number", accessor: "passportNumber" },
    { header: "Destination Country", accessor: "destinationCountry" },
    { header: "Wakala Status", accessor: (r: WorkspaceApplicantRow) => r.wakalaStatus || "Pending" },
    { header: "Embassy Status", accessor: (r: WorkspaceApplicantRow) => r.embassyStatus || "Pending" },
    { header: "Visa Stamp Number", accessor: (r: WorkspaceApplicantRow) => r.visaNumber || "—" },
    { header: "Sponsor Name", accessor: (r: WorkspaceApplicantRow) => r.sponsorName || "—" },
    { header: "Contract Number", accessor: (r: WorkspaceApplicantRow) => r.contractNumber || "—" },
    { header: "Remark", accessor: (r: WorkspaceApplicantRow) => r.remark || "—" },
  ];

  // Excel Export
  const handleExportExcel = () => {
    if (filteredRows.length === 0) return;
    exportToExcel(
      `Embassy_Clearance_Report_${new Date().toISOString().split("T")[0]}`,
      exportColumns,
      filteredRows,
      "Embassy Clearance & Wakala Authorization Report",
      {
        "Corridor": corridorFilter,
        "Wakala Filter": wakalaFilter,
        "Embassy Status Filter": embassyStatusFilter,
        "Total Filtered Records": filteredRows.length,
      }
    );
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredRows.length === 0) return;
    exportToPDF(
      "Embassy Clearance & Wakala Authorization Report",
      exportColumns,
      filteredRows,
      [
        { label: "Total Candidates", value: filteredRows.length },
        { label: "Visa Stamped", value: filteredRows.filter((r) => r.embassyStatus === "Approved").length },
        { label: "Submitted to Embassy", value: filteredRows.filter((r) => r.embassyStatus === "Submitted").length },
        { label: "Wakala Verified", value: filteredRows.filter((r) => r.wakalaStatus === "Completed").length },
      ],
      `Corridor: ${corridorFilter} | Wakala: ${wakalaFilter} | Embassy: ${embassyStatusFilter}`
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
              <Building2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Embassy Clearance & Wakala Authorization Report
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Musaned electronic power of attorney verification, consular passport submissions, and visa sticker stamping analytics.
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
                Total Submissions
              </span>
              <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalPassports}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">passports</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Wakala Authorized
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {wakalaAuthorized}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                {totalPassports > 0 ? `${Math.round((wakalaAuthorized / totalPassports) * 100)}% verified` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Visa Stamped (Approved)
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {embassyApproved}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">visa stickers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Submitted at Embassy
              </span>
              <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800 dark:text-blue-400">
                {embassySubmitted}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-500">at consular mission</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Visual Analytics Charts                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Embassy Stamping Share */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Embassy Clearance & Stamping Status</span>
              <Badge variant="outline" className="text-[10px] font-medium">Consular Status</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Distribution of Approved (Stamped), Submitted, and Pending passports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {embassyPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No embassy data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={embassyPieData}
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
                      {embassyPieData.map((entry, index) => (
                        <Cell key={`emb-${index}`} fill={entry.color} />
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

        {/* Musaned Wakala Verification */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Musaned Wakala Authorization Rate</span>
              <Badge variant="outline" className="text-[10px] font-medium">Power of Attorney</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Employer Musaned electronic authorization confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              {wakalaPieData.length === 0 ? (
                <div className="text-xs text-slate-400">No Wakala data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wakalaPieData}
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
                      {wakalaPieData.map((entry, index) => (
                        <Cell key={`wak-${index}`} fill={entry.color} />
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
                Embassy & Wakala Pipeline Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Accurate table matching the exact EMBASSY sheet layout specifications.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search name, passport..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div className="w-36">
                <SimpleSelect
                  value={wakalaFilter}
                  onValueChange={setWakalaFilter}
                  options={[
                    { value: "All", label: "All Wakala" },
                    { value: "Authorized", label: "Authorized" },
                    { value: "Pending", label: "Pending" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Wakala"
                />
              </div>

              <div className="w-44">
                <SimpleSelect
                  value={embassyStatusFilter}
                  onValueChange={setEmbassyStatusFilter}
                  options={[
                    { value: "All", label: "All Embassy Status" },
                    { value: "Approved", label: "Approved / Stamped" },
                    { value: "Submitted", label: "Submitted" },
                    { value: "Pending", label: "Pending" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                  triggerClassName="h-8 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  aria-label="Filter by Embassy Status"
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
                <th className="py-2.5 px-3 text-center">WEKALA</th>
                <th className="py-2.5 px-3 text-center">EMBASSY STATUS</th>
                <th className="py-2.5 px-3">REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-3 px-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#252530] rounded-sm w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No Embassy / Wakala records match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isApproved = row.embassyStatus === "Approved" || row.stamp?.status === "Completed";
                  const isSubmitted = row.embassyStatus === "Submitted";
                  const isRejected = row.embassyStatus === "Rejected";
                  const isAuth = (row.wakalaStatus || "").toLowerCase().includes("completed") || (row.wakalaStatus || "").toLowerCase().includes("authorized");

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
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isAuth
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {row.wakalaStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            isApproved
                              ? "bg-emerald-600 text-white font-semibold text-[10px]"
                              : isSubmitted
                              ? "bg-blue-600 text-white font-semibold text-[10px]"
                              : isRejected
                              ? "bg-rose-600 text-white font-semibold text-[10px]"
                              : "bg-amber-500 text-white font-semibold text-[10px]"
                          }
                        >
                          {row.embassyStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400 truncate max-w-[200px]">
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
