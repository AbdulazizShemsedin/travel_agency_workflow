"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  Receipt,
  Loader2,
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
  exportTransactionsXlsxV2,
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
import { downloadBackendSpreadsheet } from "@/lib/utils/reportExport";
import {
  listUnresolvedComplaintsV2,
  listNewComplaintsV2,
  V2ComplaintRecord,
} from "@/lib/api/v2/complaints";
import {
  listTransactionsV2,
  V2TransactionRecord,
} from "@/lib/api/v2/finance";
import { cn } from "@/lib/utils";

type ReportTab = "operations" | "daily_work" | "aging" | "financial" | "transactions" | "approvals";

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
  const { authUser, roles, can } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin"].includes(r)
  );
  const isManagerOrAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Manager"].includes(r)
  );
  const isAdminOrFinance = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Finance Manager"].includes(r)
  );

  // Role guard
  const canViewReports = can("viewReports");

  // All hooks must come before any conditional returns - tab determination based on authoritative RBAC
  const [activeTab, setActiveTab] = React.useState<ReportTab>(() => {
    return isManagerOrAdmin ? "operations" : "transactions";
  });
  const [activePeriod, setActivePeriod] = React.useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("yearly");
  const [fromDate, setFromDate] = React.useState<string>("2026-01-01");
  const [toDate, setToDate] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isExportingXlsx, setIsExportingXlsx] = React.useState<boolean>(false);

  // Transactions ledger filters
  const [txnSearchQuery, setTxnSearchQuery] = React.useState<string>("");
  const [txnStatusFilter, setTxnStatusFilter] = React.useState<string>("All");
  const [txnTypeFilter, setTxnTypeFilter] = React.useState<string>("All");

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
      if (periodParam === "daily" && isManagerOrAdmin) {
        setActiveTab("daily_work");
      }
    }
  }, [periodParam, setPreset, isManagerOrAdmin]);

  // If user does not have Manager/Admin privileges and is on a manager tab, redirect to transactions
  React.useEffect(() => {
    if (userRoles.length > 0 && !isManagerOrAdmin) {
      if (["operations", "daily_work", "aging"].includes(activeTab)) {
        setActiveTab("transactions");
      }
    }
  }, [isManagerOrAdmin, userRoles.length, activeTab]);

  const dateParams = React.useMemo(() => ({ from_date: fromDate, to_date: toDate }), [fromDate, toDate]);

  // 1. Operations Summary & Funnel (Manager & Admin only)
  const {
    data: opsSummary,
    isLoading: isOpsLoading,
    refetch: refetchOps,
  } = useQuery<V2OperationsSummary>({
    queryKey: ["report_operations_summary", dateParams],
    queryFn: () => getOperationsSummaryV2(dateParams),
    enabled: Boolean(isManagerOrAdmin && activeTab === "operations"),
    staleTime: 60000,
  });

  // 2. Daily Work Report (Manager & Admin only)
  const {
    data: dailyWork,
    isLoading: isDailyLoading,
    refetch: refetchDaily,
  } = useQuery<V2DailyWorkReport>({
    queryKey: ["report_daily_work", dateParams],
    queryFn: () => getDailyWorkReportV2(dateParams),
    enabled: Boolean(isManagerOrAdmin && activeTab === "daily_work"),
    staleTime: 60000,
  });

  // 3. Staff Performance Report (Manager & Admin only)
  const {
    data: staffPerformance = [],
    isLoading: isStaffLoading,
    refetch: refetchStaff,
  } = useQuery<V2StaffPerformanceItem[]>({
    queryKey: ["report_staff_performance", dateParams],
    queryFn: () => getStaffPerformanceReportV2(dateParams),
    enabled: Boolean(isManagerOrAdmin && activeTab === "daily_work"),
    staleTime: 60000,
  });

  // 4. Placement Aging Report (Manager & Admin only)
  const {
    data: placementAging,
    isLoading: isPlacementAgingLoading,
    refetch: refetchPlacementAging,
  } = useQuery<V2PlacementAgingReport>({
    queryKey: ["report_placement_aging"],
    queryFn: getPlacementAgingReportV2,
    enabled: Boolean(isManagerOrAdmin && activeTab === "aging"),
    staleTime: 30000,
  });

  // 5. Complaint Aging Report (Manager & Admin only)
  const {
    data: complaintAging,
    isLoading: isComplaintAgingLoading,
    refetch: refetchComplaintAging,
  } = useQuery<V2ComplaintAgingSummary>({
    queryKey: ["report_complaint_aging"],
    queryFn: getComplaintAgingReportV2,
    enabled: Boolean(isManagerOrAdmin && activeTab === "aging"),
    staleTime: 30000,
  });

  // Query active unresolved and new complaints directly to list current records
  const {
    data: activeComplaints = [],
    isLoading: isActiveComplaintsLoading,
  } = useQuery<V2ComplaintRecord[]>({
    queryKey: ["report_active_unresolved_complaints"],
    queryFn: async () => {
      const [unresolved, newComplaints] = await Promise.all([
        listUnresolvedComplaintsV2().catch(() => []),
        listNewComplaintsV2().catch(() => []),
      ]);
      const map = new Map<string, V2ComplaintRecord>();
      [...unresolved, ...newComplaints].forEach((c) => {
        if (c.name && !map.has(c.name)) map.set(c.name, c);
      });
      return Array.from(map.values());
    },
    enabled: Boolean(isManagerOrAdmin && activeTab === "aging"),
    staleTime: 30000,
  });

  const displayedComplaints = React.useMemo(() => {
    if (activeComplaints.length > 0) {
      return activeComplaints.map((c) => {
        const daysOpen =
          typeof c.days_unresolved === "number"
            ? c.days_unresolved
            : c.creation
            ? Math.max(0, Math.floor((Date.now() - new Date(c.creation).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
        return {
          complaint_name: c.name,
          display_no: c.display_no,
          full_name: c.full_name || c.applicant || "—",
          contractor_name: c.contractor_name || c.contractor || "—",
          days_unresolved: daysOpen,
          status: c.status || "Unresolved",
        };
      });
    }

    if (Array.isArray(complaintAging?.aging_breakdown) && complaintAging.aging_breakdown.length > 0) {
      return complaintAging.aging_breakdown;
    }

    if (Array.isArray((complaintAging as any)?.unresolved) && (complaintAging as any).unresolved.length > 0) {
      return (complaintAging as any).unresolved.map((u: any) => ({
        complaint_name: u.name || u.complaint_name,
        display_no: u.display_no,
        full_name: u.applicant || u.full_name || "—",
        contractor_name: u.contractor_name || u.contractor || "—",
        days_unresolved: u.age_days ?? u.days_unresolved ?? 0,
        status: u.status || "Unresolved",
      }));
    }

    return [];
  }, [activeComplaints, complaintAging]);

  // 6. Financial Overview (Admin only)
  const {
    data: financialOverview,
    isLoading: isFinancialLoading,
    refetch: refetchFinancial,
  } = useQuery<V2FinancialOverviewReport>({
    queryKey: ["report_financial_overview", dateParams],
    queryFn: () => getFinancialOverviewV2(dateParams),
    enabled: Boolean(activeTab === "financial" && isAdmin),
    staleTime: 60000,
  });

  // 7. Cost Breakdown Report (Admin only)
  const {
    data: costBreakdown,
    isLoading: isCostLoading,
    refetch: refetchCost,
  } = useQuery<V2CostBreakdownReport>({
    queryKey: ["report_cost_breakdown", dateParams],
    queryFn: () => getCostBreakdownReportV2(dateParams),
    enabled: Boolean(activeTab === "financial" && isAdmin),
    staleTime: 60000,
  });

  // 8. Employee Financial Report (Admin only)
  const {
    data: employeeFinancial = [],
    isLoading: isEmployeeFinancialLoading,
    refetch: refetchEmployeeFinancial,
  } = useQuery<V2EmployeeFinancialItem[]>({
    queryKey: ["report_employee_financial", dateParams],
    queryFn: () => getEmployeeFinancialReportV2(dateParams),
    enabled: Boolean(activeTab === "financial" && isAdmin),
    staleTime: 60000,
  });

  // 9. Pending Approval Queue (Admin only)
  const {
    data: pendingApprovals = [],
    isLoading: isApprovalsLoading,
    refetch: refetchApprovals,
  } = useQuery<V2PendingApprovalItem[]>({
    queryKey: ["report_pending_approvals"],
    queryFn: getPendingApprovalQueueV2,
    enabled: Boolean(activeTab === "approvals" && isAdmin),
    staleTime: 20000,
  });

  // 10. All Transactions Ledger (Admin / Finance Manager)
  const {
    data: allTransactions = [],
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = useQuery<V2TransactionRecord[]>({
    queryKey: ["report_all_transactions", dateParams, txnStatusFilter, txnTypeFilter],
    queryFn: () =>
      listTransactionsV2({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: txnStatusFilter !== "All" ? txnStatusFilter : undefined,
        transactionType: txnTypeFilter !== "All" ? txnTypeFilter : undefined,
        limitPageLength: 200,
      }),
    enabled: Boolean(activeTab === "transactions" && isAdminOrFinance),
    staleTime: 30000,
  });

  const filteredTransactions = React.useMemo(() => {
    if (!txnSearchQuery.trim()) return allTransactions;
    const q = txnSearchQuery.toLowerCase();
    return allTransactions.filter((t: any) => {
      return (
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.applicant?.toLowerCase().includes(q) ||
        t.placement?.toLowerCase().includes(q) ||
        t.logged_by?.toLowerCase().includes(q) ||
        t.stage_logged_at?.toLowerCase().includes(q) ||
        t.currency?.toLowerCase().includes(q) ||
        t.currency_original?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
      );
    });
  }, [allTransactions, txnSearchQuery]);

  const transactionMetrics = React.useMemo(() => {
    let totalExpenseBirr = 0;
    let totalIncomeBirr = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    allTransactions.forEach((t: any) => {
      const birr = Number(t.amount_birr || t.amount || 0);
      if (t.transaction_type === "Expense" && t.status === "Approved") {
        totalExpenseBirr += birr;
      } else if (t.transaction_type === "Income" && t.status === "Approved") {
        totalIncomeBirr += birr;
      }

      if (t.status === "Pending") pendingCount++;
      else if (t.status === "Approved") approvedCount++;
      else if (t.status === "Rejected" || t.status === "Voided") rejectedCount++;
    });

    return {
      totalCount: allTransactions.length,
      totalExpenseBirr,
      totalIncomeBirr,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }, [allTransactions]);

  // Handle Backend Spreadsheet Export (.xlsx or .csv fallback)
  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await exportCommissionsXlsxV2(undefined, undefined, fromDate, toDate);
      const fallback = `Commissions_Export_${fromDate}_to_${toDate}`;
      const res = await downloadBackendSpreadsheet(blob, fallback);
      toast.success("Spreadsheet Downloaded", {
        description: `Exported as ${res.filename} (${res.format.toUpperCase()}).`,
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: err?.message || "Failed to export spreadsheet. Please try again.",
      });
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const [isExportingTransactionsXlsx, setIsExportingTransactionsXlsx] = React.useState<boolean>(false);
  const handleExportTransactionsXlsx = async (statusFilter?: string) => {
    setIsExportingTransactionsXlsx(true);
    try {
      const blob = await exportTransactionsXlsxV2({
        from_date: fromDate,
        to_date: toDate,
        status: statusFilter,
      });
      const fallback = `Transactions_Export_${statusFilter || "All"}_${fromDate}_to_${toDate}`;
      const res = await downloadBackendSpreadsheet(blob, fallback);
      toast.success("Transactions Spreadsheet Downloaded", {
        description: `Exported as ${res.filename} (${res.format.toUpperCase()}).`,
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: err?.message || "Failed to export transactions spreadsheet. Please try again.",
      });
    } finally {
      setIsExportingTransactionsXlsx(false);
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

  // Access denied rendered after all hooks
  if (authUser && !canViewReports) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40">
          <Lock className="h-10 w-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
            The Reports section is only accessible to Administrators, Managers, Finance Managers, and Communication Managers.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-950 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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

          <div className="flex items-center gap-2">
            {isManagerOrAdmin && (
              <Button
                type="button"
                size="sm"
                disabled={isExportingXlsx}
                onClick={handleExportXlsx}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                title="Export commissions spreadsheet (Excel / CSV)"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                {isExportingXlsx ? "Exporting..." : "Export Commissions (.xlsx)"}
              </Button>
            )}

            {isAdminOrFinance && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExportingTransactionsXlsx}
                onClick={() => handleExportTransactionsXlsx(activeTab === "approvals" ? "Pending" : undefined)}
                className="text-xs h-8 border-slate-300 dark:border-[#2a2a35] font-semibold"
                title="Export all transactions (Expense/Income/Commission) with rich formatting to Excel (.xlsx)"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {isExportingTransactionsXlsx ? "Exporting..." : "Export Transactions (.xlsx)"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Primary Report Navigation Tabs                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#202028] pb-2 overflow-x-auto">
        {isManagerOrAdmin && (
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
        )}

        {isManagerOrAdmin && (
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
        )}

        {isManagerOrAdmin && (
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
        )}

        {isAdmin && (
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
          </button>
        )}

        {isAdminOrFinance && (
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "transactions"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            All Transactions Ledger
            {allTransactions.length > 0 && activeTab === "transactions" ? (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                {allTransactions.length}
              </span>
            ) : null}
          </button>
        )}

        {isAdmin && (
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
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXECUTIVE OPERATIONS SUMMARY & FUNNEL                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "operations" && isManagerOrAdmin && (
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
      {activeTab === "daily_work" && isManagerOrAdmin && (
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
      {activeTab === "aging" && isManagerOrAdmin && (
        <div className="space-y-6">
          {/* Critical Placements Not Departed Table */}
          <Card className="border-red-200 dark:border-red-950/60 bg-white dark:bg-[#121216]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-red-950 dark:text-red-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Critical Placements Not Departed (30+ Days from Selected applicant's Musaned was Uploaded)
                </span>
                <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50 text-[10px]">
                  {placementAging?.critical_not_departed?.length || 0} Critical
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Placements exceeding 30 days since candidate's Musaned contract upload without departure confirmation.
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
                    {displayedComplaints.length > 0 ? displayedComplaints.length : (complaintAging?.unresolved_count || 0)} Unresolved
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
                    {displayedComplaints.length > 0 ? (
                      displayedComplaints.map((c: any, idx: number) => (
                        <tr key={c.complaint_name || idx} className="hover:bg-slate-50 dark:hover:bg-[#1a1a22]">
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            {c.display_no ? `#${c.display_no}` : c.complaint_name}
                          </td>
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
          {!isAdmin ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Financial Ledgers are Role-Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Access to Financial Overview, Cost Breakdown, and Employee Financial reports is restricted to <strong>Administrator</strong> roles.
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
      {/* TAB: ALL TRANSACTIONS LEDGER                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "transactions" && (
        <>
          {!isAdminOrFinance ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Transaction History is Role-Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Access to the complete system transaction ledger is restricted to <strong>Administrator</strong> and <strong>Finance Manager</strong> roles.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Transactions
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {transactionMetrics.totalCount}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        In Date Window
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Approved Expenses
                    </span>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ETB {transactionMetrics.totalExpenseBirr.toLocaleString()}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Approved Income
                    </span>
                    <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                      ETB {transactionMetrics.totalIncomeBirr.toLocaleString()}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Pending Approvals
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">
                        {transactionMetrics.pendingCount}
                      </span>
                      {transactionMetrics.pendingCount > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("approvals")}
                          className="h-6 text-[11px] px-2 text-amber-800 hover:text-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          Review Queue →
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Master Table */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600" />
                        Complete Financial Transactions Ledger
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                        Authoritative ledger of all operational expenses, stage fees, and incomes across every status.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchTransactions()}
                        disabled={isTransactionsLoading}
                        className="h-8 text-xs border-slate-200 dark:border-[#2a2a35] font-semibold"
                      >
                        <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isTransactionsLoading && "animate-spin text-emerald-600")} />
                        Refresh
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isExportingTransactionsXlsx}
                        onClick={() => handleExportTransactionsXlsx(txnStatusFilter !== "All" ? txnStatusFilter : undefined)}
                        className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                      >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                        {isExportingTransactionsXlsx ? "Exporting..." : "Export Ledger (.xlsx)"}
                      </Button>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={txnSearchQuery}
                        onChange={(e) => setTxnSearchQuery(e.target.value)}
                        placeholder="Search ID, description, candidate, user..."
                        className="h-8 pl-8 text-xs bg-slate-50 dark:bg-[#181820] border-slate-200 dark:border-[#282834]"
                      />
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-0.5 rounded-lg bg-slate-100 dark:bg-[#1a1a24]">
                      {(["All", "Pending", "Approved", "Rejected", "Voided"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setTxnStatusFilter(st)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                            txnStatusFilter === st
                              ? "bg-white dark:bg-[#252535] text-slate-900 dark:text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {/* Type Filter Tabs */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#1a1a24] ml-auto">
                      {(["All", "Expense", "Income"] as const).map((tp) => (
                        <button
                          key={tp}
                          type="button"
                          onClick={() => setTxnTypeFilter(tp)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                            txnTypeFilter === tp
                              ? "bg-white dark:bg-[#252535] text-slate-900 dark:text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
                          )}
                        >
                          {tp}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-b border-slate-100 dark:border-[#20202a]">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Transaction</th>
                          <th className="py-2.5 px-3 font-semibold">Type</th>
                          <th className="py-2.5 px-3 font-semibold">Description & Stage</th>
                          <th className="py-2.5 px-3 font-semibold">Candidate / Placement</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Amount (Original)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Amount (ETB)</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Logged By</th>
                          <th className="py-2.5 px-3 font-semibold">Approval / Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                        {isTransactionsLoading ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                              Loading financial transactions...
                            </td>
                          </tr>
                        ) : filteredTransactions.length > 0 ? (
                          filteredTransactions.map((t: any) => {
                            const isExpense = t.transaction_type === "Expense";
                            const origCurr = t.currency_original || t.currency || "ETB";
                            const origAmt = Number(t.amount_original || t.amount || 0);
                            const birrAmt = Number(t.amount_birr || t.amount || 0);

                            return (
                              <tr key={t.name} className="hover:bg-slate-50/80 dark:hover:bg-[#181822] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                  <div>{t.name}</div>
                                  <div className="text-[10px] font-normal text-slate-400 font-sans">
                                    {t.creation ? t.creation.split(" ")[0] : "—"}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-bold px-2 py-0.5",
                                      isExpense
                                        ? "border-rose-300 text-rose-700 bg-rose-50/60 dark:bg-rose-950/30 dark:border-rose-800"
                                        : "border-emerald-300 text-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-800"
                                    )}
                                  >
                                    {t.transaction_type || "Expense"}
                                  </Badge>
                                </td>

                                <td className="py-2.5 px-3 max-w-xs">
                                  <div className="font-medium text-slate-800 dark:text-zinc-200 line-clamp-1">
                                    {t.description || "No description"}
                                  </div>
                                  {t.stage_logged_at && (
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                      <Layers className="h-2.5 w-2.5 text-slate-400" />
                                      {t.stage_logged_at}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                  {t.applicant ? (
                                    <Link
                                      href={`/applicants/${encodeURIComponent(t.applicant)}`}
                                      className="text-emerald-800 dark:text-emerald-400 hover:underline block font-semibold"
                                    >
                                      {t.applicant}
                                    </Link>
                                  ) : null}
                                  {t.placement && (
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      {t.placement}
                                    </span>
                                  )}
                                  {!t.applicant && !t.placement && (
                                    <span className="text-slate-400 font-sans text-[11px]">General Ledger</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-800 dark:text-zinc-200">
                                  {origCurr} {origAmt.toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                  <span className={cn(isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-400")}>
                                    {isExpense ? "-" : "+"} ETB {birrAmt.toLocaleString()}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-semibold px-2 py-0.5",
                                      t.status === "Approved"
                                        ? "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800"
                                        : t.status === "Pending"
                                        ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800"
                                        : t.status === "Rejected"
                                        ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/40 dark:border-red-800"
                                        : "border-slate-300 text-slate-600 bg-slate-50 dark:bg-[#1a1a24]"
                                    )}
                                  >
                                    {t.status === "Approved" && <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-emerald-600" />}
                                    {t.status === "Pending" && <Clock className="h-2.5 w-2.5 mr-1 text-amber-600" />}
                                    {t.status || "Pending"}
                                  </Badge>
                                </td>

                                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                  {t.logged_by || "System"}
                                </td>

                                <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs">
                                  {t.status === "Approved" ? (
                                    <div className="text-emerald-800 dark:text-emerald-400">
                                      <span className="font-semibold">Approved</span>
                                      {t.approved_by ? ` by ${t.approved_by}` : ""}
                                      {t.approved_on ? ` (${t.approved_on.split(" ")[0]})` : ""}
                                    </div>
                                  ) : t.status === "Rejected" ? (
                                    <div className="text-red-600 dark:text-red-400">
                                      <span className="font-semibold">Rejected</span>: {t.rejection_reason || "No reason given"}
                                    </div>
                                  ) : t.status === "Voided" ? (
                                    <div className="text-slate-400 italic">Voided transaction</div>
                                  ) : (
                                    <div className="text-amber-800 dark:text-amber-400 italic">Awaiting review</div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <Receipt className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                              <p className="font-semibold text-slate-600 dark:text-zinc-400">No transactions found</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {txnSearchQuery || txnStatusFilter !== "All" || txnTypeFilter !== "All"
                                  ? "No records match the active search or status filters."
                                  : "Zero transactions recorded within the selected date range."}
                              </p>
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
          {!isAdmin ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Approval Queue is Admin-Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Access to Pending Approval Queue is restricted to <strong>Administrator</strong> roles.
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
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isExportingTransactionsXlsx}
                      onClick={() => handleExportTransactionsXlsx("Pending")}
                      className="text-xs h-7 border-slate-300 dark:border-[#2a2a35]"
                      title="Export pending queue to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="mr-1.5 h-3 w-3 text-emerald-600" />
                      Export Queue (.xlsx)
                    </Button>
                    <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
                      {pendingApprovals.length} Pending Actions
                    </Badge>
                  </div>
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
                              {(tx.amount_birr ?? tx.amount ?? 0).toLocaleString()} {tx.currency || "ETB"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300">
                              {tx.description}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{tx.logged_by || tx.owner || "System"}</td>
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
