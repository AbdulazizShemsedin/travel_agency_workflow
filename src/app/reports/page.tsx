"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  Plane,
  FileSpreadsheet,
  FileCheck2,
  Lock,
  Layers,
  Award,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Search,
  Activity,
  ArrowUpRight,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getOperationsSummaryV2,
  getDailyWorkReportV2,
  getStaffPerformanceReportV2,
  getPlacementAgingReportV2,
  getComplaintAgingReportV2,
  getFinancialOverviewV2,
  getCostBreakdownReportV2,
  getEmployeeFinancialReportV2,
  getPendingApprovalQueueV2,
  exportCommissionsXlsxV2,
  V2OperationsSummary,
  V2DailyWorkReport,
  V2StaffPerformanceItem,
  V2PlacementAgingReport,
  V2ComplaintAgingSummary,
  V2FinancialOverviewReport,
  V2CostBreakdownReport,
  V2EmployeeFinancialItem,
  V2PendingApprovalItem,
} from "@/lib/api/v2/reports";
import { cn } from "@/lib/utils";

type ReportTab = "operations" | "daily_work" | "aging" | "financial" | "approvals";

const FUNNEL_COLORS = [
  "#94a3b8", // Draft
  "#3b82f6", // Registered
  "#0ea5e9", // CV Generated
  "#8b5cf6", // Selected
  "#6366f1", // Processing
  "#10b981", // Stamped
  "#059669", // Ticketed
  "#047857", // Departed
];

export default function ReportsPage() {
  const { authUser, roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAdminOrFinance = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Finance Manager"].includes(r)
  );
  const isManagerOrAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Manager", "Finance Manager"].includes(r)
  );

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<ReportTab>("operations");

  // Period / Date Filters
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [activePeriod, setActivePeriod] = React.useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("yearly");

  const [fromDate, setFromDate] = React.useState<string>("2026-01-01");
  const [toDate, setToDate] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isExportingXlsx, setIsExportingXlsx] = React.useState<boolean>(false);

  // Quick Preset Helper (Daily, Weekly, Monthly, Yearly)
  const setPreset = React.useCallback((preset: "daily" | "weekly" | "monthly" | "yearly" | "all") => {
    setActivePeriod(preset === "all" ? "custom" : preset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setToDate(todayStr);

    if (preset === "daily") {
      setFromDate(todayStr);
    } else if (preset === "weekly") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
    } else if (preset === "monthly") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(d.toISOString().split("T")[0]);
    } else if (preset === "yearly") {
      setFromDate(`${today.getFullYear()}-01-01`);
    } else {
      setFromDate("2025-01-01");
    }
  }, []);

  // Sync with ?period= from sidebar navigation links
  React.useEffect(() => {
    if (periodParam === "daily" || periodParam === "weekly" || periodParam === "monthly" || periodParam === "yearly") {
      setPreset(periodParam);
      if (periodParam === "daily") {
        setActiveTab("daily_work");
      }
    }
  }, [periodParam, setPreset]);

  const dateParams = React.useMemo(() => ({ from_date: fromDate, to_date: toDate }), [fromDate, toDate]);

  // 1. Operations Summary & Funnel
  const {
    data: opsSummary,
    isLoading: isOpsLoading,
    refetch: refetchOps,
  } = useQuery<V2OperationsSummary>({
    queryKey: ["report_operations_summary", dateParams],
    queryFn: () => getOperationsSummaryV2(dateParams),
    staleTime: 60000,
  });

  // 2. Daily Work Report
  const {
    data: dailyWork,
    isLoading: isDailyLoading,
    refetch: refetchDaily,
  } = useQuery<V2DailyWorkReport>({
    queryKey: ["report_daily_work", dateParams],
    queryFn: () => getDailyWorkReportV2(dateParams),
    enabled: activeTab === "daily_work",
    staleTime: 60000,
  });

  // 3. Staff Performance Report
  const {
    data: staffPerformance = [],
    isLoading: isStaffLoading,
    refetch: refetchStaff,
  } = useQuery<V2StaffPerformanceItem[]>({
    queryKey: ["report_staff_performance", dateParams],
    queryFn: () => getStaffPerformanceReportV2(dateParams),
    enabled: activeTab === "daily_work",
    staleTime: 60000,
  });

  // 4. Placement Aging Report
  const {
    data: placementAging,
    isLoading: isPlacementAgingLoading,
    refetch: refetchPlacementAging,
  } = useQuery<V2PlacementAgingReport>({
    queryKey: ["report_placement_aging"],
    queryFn: getPlacementAgingReportV2,
    enabled: activeTab === "aging",
    staleTime: 30000,
  });

  // 5. Complaint Aging Report
  const {
    data: complaintAging,
    isLoading: isComplaintAgingLoading,
    refetch: refetchComplaintAging,
  } = useQuery<V2ComplaintAgingSummary>({
    queryKey: ["report_complaint_aging"],
    queryFn: getComplaintAgingReportV2,
    enabled: activeTab === "aging",
    staleTime: 30000,
  });

  // 6. Financial Overview (Admin / Finance Manager)
  const {
    data: financialOverview,
    isLoading: isFinancialLoading,
    refetch: refetchFinancial,
  } = useQuery<V2FinancialOverviewReport>({
    queryKey: ["report_financial_overview", dateParams],
    queryFn: () => getFinancialOverviewV2(dateParams),
    enabled: activeTab === "financial" && isAdminOrFinance,
    staleTime: 60000,
  });

  // 7. Cost Breakdown Report (Admin)
  const {
    data: costBreakdown,
    isLoading: isCostLoading,
    refetch: refetchCost,
  } = useQuery<V2CostBreakdownReport>({
    queryKey: ["report_cost_breakdown", dateParams],
    queryFn: () => getCostBreakdownReportV2(dateParams),
    enabled: activeTab === "financial" && isAdminOrFinance,
    staleTime: 60000,
  });

  // 8. Employee Financial Report (Admin)
  const {
    data: employeeFinancial = [],
    isLoading: isEmployeeFinancialLoading,
    refetch: refetchEmployeeFinancial,
  } = useQuery<V2EmployeeFinancialItem[]>({
    queryKey: ["report_employee_financial", dateParams],
    queryFn: () => getEmployeeFinancialReportV2(dateParams),
    enabled: activeTab === "financial" && isAdminOrFinance,
    staleTime: 60000,
  });

  // 9. Pending Approval Queue (Admin)
  const {
    data: pendingApprovals = [],
    isLoading: isApprovalsLoading,
    refetch: refetchApprovals,
  } = useQuery<V2PendingApprovalItem[]>({
    queryKey: ["report_pending_approvals"],
    queryFn: getPendingApprovalQueueV2,
    enabled: activeTab === "approvals" && isAdminOrFinance,
    staleTime: 20000,
  });

  // Handle Binary XLSX Export
  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await exportCommissionsXlsxV2(undefined, undefined, fromDate, toDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Commissions_Export_${fromDate}_to_${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Commissions Export Downloaded", {
        description: `Exported binary spreadsheet from ${fromDate} to ${toDate}.`,
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: err?.message || "Backend rejected spreadsheet export request.",
      });
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // Funnel Data Transformation
  const funnelChartData = React.useMemo(() => {
    if (!opsSummary?.applicant_funnel) return [];
    const f = opsSummary.applicant_funnel;
    return [
      { stage: "Draft", count: f.Draft || 0 },
      { stage: "Registered", count: f.Registered || 0 },
      { stage: "CV Generated", count: f["CV Generated"] || 0 },
      { stage: "Selected", count: f.Selected || 0 },
      { stage: "Processing", count: f.Processing || 0 },
      { stage: "Stamped", count: f.Stamped || 0 },
      { stage: "Ticketed", count: f.Ticketed || 0 },
      { stage: "Departed", count: f.Departed || 0 },
    ];
  }, [opsSummary]);

  // Cost by Country Transformation
  const costByCountryData = React.useMemo(() => {
    if (!costBreakdown?.by_country_birr) return [];
    return Object.entries(costBreakdown.by_country_birr).map(([country, amount]) => ({
      country,
      amount,
    }));
  }, [costBreakdown]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Export Controls                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Reports & Operational Analytics
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-600/30 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
            >
              OPERATIONAL REPORT SUITE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Authoritative operational funnels, daily work logs, staff SLAs, financial ledgers, and aging queues.
          </p>
        </div>

        {/* Global Date Range Filter & XLSX Export Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-[#272732] bg-white dark:bg-[#121217]">
            <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-7 w-32 text-xs border-0 bg-transparent px-1 focus-visible:ring-0"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-7 w-32 text-xs border-0 bg-transparent px-1 focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-[#272732] bg-white dark:bg-[#121217]">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                variant={activePeriod === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreset(p)}
                className={cn(
                  "text-[11px] h-7 px-2.5 capitalize font-medium",
                  activePeriod === p
                    ? "bg-emerald-900 text-white dark:bg-emerald-700 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {p}
              </Button>
            ))}
          </div>

          {isManagerOrAdmin && (
            <Button
              type="button"
              size="sm"
              disabled={isExportingXlsx}
              onClick={handleExportXlsx}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              {isExportingXlsx ? "Exporting..." : "Export .xlsx"}
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Primary Report Navigation Tabs                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#202028] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "operations"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Funnel & Operations Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("daily_work")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "daily_work"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Daily Work & Staff Activity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("aging")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "aging"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Placement & Complaint Aging
          {opsSummary?.pending_overdue?.placements_critical_not_departed ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
              {opsSummary.pending_overdue.placements_critical_not_departed}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "financial"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Financial Ledgers & Costs
          {!isAdminOrFinance && <Lock className="h-3 w-3 text-amber-500" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approvals")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "approvals"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Inbox className="h-3.5 w-3.5" />
          Pending Approvals Queue
          {!isAdminOrFinance && <Lock className="h-3 w-3 text-amber-500" />}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXECUTIVE OPERATIONS SUMMARY & FUNNEL                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          {/* Key SLA Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Selection ➔ Ticketed SLA
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {opsSummary?.turnaround_days?.selected_to_ticketed != null
                      ? `${opsSummary.turnaround_days.selected_to_ticketed}d`
                      : "—"}
                  </span>
                  <span className="text-xs text-slate-500">avg turnaround</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Selection ➔ Departed SLA
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {opsSummary?.turnaround_days?.selected_to_departed != null
                      ? `${opsSummary.turnaround_days.selected_to_departed}d`
                      : "—"}
                  </span>
                  <span className="text-xs text-slate-500">end-to-end</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Stamped ➔ Ticketed Rate
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                    {opsSummary?.conversion_rates?.stamped_to_ticketed != null
                      ? `${(opsSummary.conversion_rates.stamped_to_ticketed * 100).toFixed(0)}%`
                      : "—"}
                  </span>
                  <span className="text-xs text-slate-500">conversion</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Critical Overdue Gate
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {opsSummary?.pending_overdue?.placements_critical_not_departed || 0}
                  </span>
                  <span className="text-xs text-slate-500">not departed (30d+)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recruitment Funnel Chart */}
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Recruitment Pipeline Funnel (Applicant States)
                </span>
                <span className="text-xs font-normal text-slate-400">
                  {fromDate} to {toDate}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Candidate progression counts across each lifecycle stage computed authoritatively.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e24", border: "1px solid #333", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#047857" radius={[4, 4, 0, 0]}>
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAILY WORK & STAFF PERFORMANCE                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "daily_work" && (
        <div className="space-y-6">
          {/* Daily Work Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "CVs Created", value: dailyWork?.cvs_created || 0 },
              { label: "Medicals Processed", value: dailyWork?.medicals_processed || 0 },
              { label: "Clearances Issued", value: dailyWork?.clearances_issued || 0 },
              { label: "Embassies Cleared", value: dailyWork?.embassies_cleared || 0 },
              { label: "Tickets Booked", value: dailyWork?.tickets_booked || 0 },
              { label: "Departures Confirmed", value: dailyWork?.departures_confirmed || 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] space-y-1 shadow-xs"
              >
                <span className="text-[10px] text-slate-400 font-semibold uppercase block truncate">
                  {stat.label}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Staff Performance Table */}
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Staff Output Breakdown
                </span>
                <span className="text-xs font-normal text-slate-400">
                  {fromDate} to {toDate}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Per-officer operational completions recorded across clearance gates, ticketing, and departures.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                    <tr>
                      <th className="py-2.5 px-3">Officer</th>
                      <th className="py-2.5 px-3">CVs Created</th>
                      <th className="py-2.5 px-3">Clearances Issued</th>
                      <th className="py-2.5 px-3">Tickets Booked</th>
                      <th className="py-2.5 px-3">Departures Confirmed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {staffPerformance.length > 0 ? (
                      staffPerformance.map((staff) => (
                        <tr key={staff.user} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {staff.full_name || staff.user}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {staff.user}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{staff.cvs_created}</td>
                          <td className="py-2.5 px-3 font-semibold">{staff.clearances_completed}</td>
                          <td className="py-2.5 px-3 font-semibold">{staff.tickets_booked}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800 dark:text-emerald-400">
                            {staff.departures_confirmed}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No staff completions recorded in selected window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PLACEMENT & COMPLAINT AGING                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "aging" && (
        <div className="space-y-6">
          {/* Critical Placements Not Departed Table */}
          <Card className="border-red-200 dark:border-red-950/60 bg-white dark:bg-[#121216]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-red-950 dark:text-red-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Critical Placements Not Departed (30+ Days from Selection)
                </span>
                <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50 text-[10px]">
                  {placementAging?.critical_not_departed?.length || 0} Critical
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Placements exceeding the standard 30-day turnaround without departure confirmation.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 bg-red-50/50 dark:bg-red-950/20 border-y border-red-100 dark:border-red-950/40">
                    <tr>
                      <th className="py-2.5 px-3">Placement ID</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Corridor</th>
                      <th className="py-2.5 px-3">Current Status</th>
                      <th className="py-2.5 px-3">Age (Days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {(placementAging?.critical_not_departed || []).length > 0 ? (
                      placementAging!.critical_not_departed.map((row) => (
                        <tr key={row.name} className="hover:bg-red-50/30">
                          <td className="py-2.5 px-3 font-mono font-bold">{row.name}</td>
                          <td className="py-2.5 px-3 font-semibold">{row.full_name || row.applicant}</td>
                          <td className="py-2.5 px-3">{row.destination_country}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-red-600">{row.age_days}d</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Zero critical overdue placements detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Complaint Aging Report */}
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Welfare Complaint Aging & Resolution
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                    {complaintAging?.unresolved_count || 0} Unresolved
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                    {complaintAging?.resolved_count || 0} Resolved
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                    <tr>
                      <th className="py-2.5 px-3">Complaint</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Agency Partner</th>
                      <th className="py-2.5 px-3">Days Open</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {(complaintAging?.aging_breakdown || []).length > 0 ? (
                      (complaintAging?.aging_breakdown || []).map((c, idx) => (
                        <tr key={c.complaint_name || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-semibold">{c.complaint_name}</td>
                          <td className="py-2.5 px-3">{c.full_name || c.applicant}</td>
                          <td className="py-2.5 px-3">{c.contractor_name || c.contractor}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-800 dark:text-amber-400">{c.days_unresolved}d</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Zero active unresolved complaints.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: FINANCIAL LEDGERS & COST BREAKDOWN                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "financial" && (
        <>
          {!isAdminOrFinance ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Financial Ledgers are Role-Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Access to Financial Overview, Cost Breakdown, and Employee Financial reports is restricted to <strong>Administrator</strong> and <strong>Finance Manager</strong> roles.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Financial Ledger Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Income
                    </span>
                    <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                      ETB {(financialOverview?.totals_birr?.income || 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Expense
                    </span>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ETB {(financialOverview?.totals_birr?.expense || 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Outstanding Commissions Owed
                    </span>
                    <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">
                      ETB {(financialOverview?.outstanding_owed_birr || 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Settled Commissions in Period
                    </span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      ETB {(financialOverview?.settled_in_period_birr || 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Breakdown by Country */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Approved Expenses by Destination Country
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 w-full pt-2">
                    {costByCountryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costByCountryData}>
                          <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1e1e24", border: "1px solid #333", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                          />
                          <Bar dataKey="amount" fill="#047857" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Zero cost data recorded for window.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Financial Handling Table */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">
                    Per-Employee Net Expense & Approval Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                        <tr>
                          <th className="py-2 px-3">Officer</th>
                          <th className="py-2 px-3">Approved Count</th>
                          <th className="py-2 px-3">Rejected Count</th>
                          <th className="py-2 px-3">Net Expense Handled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                        {employeeFinancial.length > 0 ? (
                          employeeFinancial.map((ef) => (
                            <tr key={ef.user} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold">{ef.full_name || ef.user}</td>
                              <td className="py-2 px-3 text-emerald-800 font-bold">{ef.approved_transactions_count || 0}</td>
                              <td className="py-2 px-3 text-red-600 font-bold">{ef.rejected_transactions_count || 0}</td>
                              <td className="py-2 px-3 font-bold">ETB {(ef.net_expense_handled_birr || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              No employee financial records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: PENDING APPROVAL QUEUE                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "approvals" && (
        <>
          {!isAdminOrFinance ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Approval Queue is Admin-Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Access to Pending Approval Queue is restricted to <strong>Administrator</strong> and <strong>Finance Manager</strong> roles.
              </p>
            </div>
          ) : (
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-emerald-600" />
                    Pending Financial Approvals Queue (Oldest First)
                  </span>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
                    {pendingApprovals.length} Pending Actions
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Applicant transaction expenses and receipts awaiting Finance Manager audit and formal approval.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                      <tr>
                        <th className="py-2.5 px-3">Transaction</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Logged By</th>
                        <th className="py-2.5 px-3">Logged At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                      {pendingApprovals.length > 0 ? (
                        pendingApprovals.map((tx) => (
                          <tr key={tx.name} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                            <td className="py-2.5 px-3 font-mono font-bold">{tx.name}</td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  tx.transaction_type === "Income"
                                    ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                                    : "border-red-300 text-red-800 bg-red-50"
                                )}
                              >
                                {tx.transaction_type}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-bold">
                              {tx.amount} {tx.currency || "ETB"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300">
                              {tx.description}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{tx.owner}</td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(tx.creation).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Zero pending transactions in queue. All records approved or voided.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
