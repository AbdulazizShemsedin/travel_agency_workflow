"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
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
  ChevronLeft,
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
  exportCommissionsXlsxV2,
  exportTransactionsXlsxV2,
  getWorkersByYearV2,
  exportWorkersByYearV2,
  V2OperationsSummary,
  V2DailyWorkReport,
  V2StaffPerformanceItem,
  V2PlacementAgingReport,
  V2ComplaintAgingSummary,
  V2FinancialOverviewReport,
  V2CostBreakdownReport,
  V2EmployeeFinancialItem,
  V2WorkersByYearResponse,
  V2WorkersByYearRow,
} from "@/lib/api/v2/reports";
import { downloadBackendSpreadsheet, downloadDirectBlob } from "@/lib/utils/reportExport";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import {
  listUnresolvedComplaintsV2,
  listNewComplaintsV2,
  V2ComplaintRecord,
} from "@/lib/api/v2/complaints";
import {
  listTransactionsV2,
  V2TransactionRecord,
} from "@/lib/api/v2/finance";
import {
  listPlacementsV2,
  V2PlacementRecord,
} from "@/lib/api/v2/placements";
import {
  listMyClearanceStepsV2,
  V2ClearanceStepItem,
} from "@/lib/api/v2/clearance";
import { useBirrConversion } from "@/components/finance/useBirrConversion";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";
import { shortRef, stripRecordIds } from "@/lib/utils/display-id";
import { cn } from "@/lib/utils";

type ReportTab = "operations" | "daily_work" | "aging" | "financial" | "transactions" | "workers_by_year";

const FUNNEL_COLORS = [
  "#94a3b8", // Draft
  "#3b82f6", // Registered
  "#0ea5e9", // CV Generated
  "#8b5cf6", // Selected
  "#f59e0b", // LMIS
  "#06b6d4", // Taeshir
  "#10b981", // Stamped
  "#6366f1", // Ticketed
  "#059669", // Departed
];

export const SYSTEM_INCEPTION_DATE = "2026-01-01";

/**
 * Computes current year dynamically according to calendar semantics:
 * - Gregorian: calendar year (e.g. 2026)
 * - Ethiopian Fiscal: begins Hamle 1 (July 8). For year Y: on/after July 8 -> Y - 7 (e.g. 2019 in Oct 2026); before -> Y - 8.
 * - Ethiopian: begins Meskerem 1 (Sept 11). For year Y: on/after Sept 11 -> Y - 7 (e.g. 2019 in Oct 2026); before -> Y - 8.
 */
export function getCurrentYearForType(
  yearType: "Ethiopian Fiscal" | "Gregorian" | "Ethiopian",
  date: Date = new Date()
): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 6 = Jul, 8 = Sep, 11 = Dec
  const day = date.getDate();

  if (yearType === "Gregorian") {
    return year;
  }
  if (yearType === "Ethiopian Fiscal") {
    if (month > 6 || (month === 6 && day >= 8)) {
      return year - 7;
    }
    return year - 8;
  }
  if (yearType === "Ethiopian") {
    if (month > 8 || (month === 8 && day >= 11)) {
      return year - 7;
    }
    return year - 8;
  }
  return year;
}

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
  const { isBirrConversionEnabled } = useBirrConversion();

  // All hooks must come before any conditional returns - tab determination based on authoritative RBAC
  const [activeTab, setActiveTab] = React.useState<ReportTab>(() => {
    return (isManagerOrAdmin || isAdminOrFinance) ? "workers_by_year" : "transactions";
  });

  const [activePeriod, setActivePeriod] = React.useState<"daily" | "weekly" | "monthly" | "yearly" | "all" | "custom">("yearly");
  const [fromDate, setFromDate] = React.useState<string>("2026-01-01");
  const [toDate, setToDate] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isExportingXlsx, setIsExportingXlsx] = React.useState<boolean>(false);

  // Transactions ledger filters
  const [txnSearchQuery, setTxnSearchQuery] = React.useState<string>("");
  const [txnStatusFilter, setTxnStatusFilter] = React.useState<string>("All");
  const [txnTypeFilter, setTxnTypeFilter] = React.useState<string>("All");

  // Quick Preset Helper (Daily, Weekly, Monthly, Yearly, All-time)
  const setPreset = React.useCallback((preset: "daily" | "weekly" | "monthly" | "yearly" | "all") => {
    setActivePeriod(preset);
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
    } else if (preset === "all") {
      // Backend contract: period "all" counts everything up to today without hardcoded dates
      setFromDate("");
      setToDate("");
    } else {
      setFromDate(SYSTEM_INCEPTION_DATE);
    }
  }, []);

  // Sync with ?period= from navigation links
  React.useEffect(() => {
    if (periodParam === "daily" || periodParam === "weekly" || periodParam === "monthly" || periodParam === "yearly" || periodParam === "all") {
      setPreset(periodParam);
      if (periodParam === "daily" && isManagerOrAdmin) {
        setActiveTab("daily_work");
      }
    }
  }, [periodParam, setPreset, isManagerOrAdmin]);

  // If user does not have Manager/Admin privileges and is on a manager tab, redirect to transactions
  React.useEffect(() => {
    if (userRoles.length > 0) {
      if (!isManagerOrAdmin && ["operations", "daily_work", "aging"].includes(activeTab)) {
        setActiveTab("transactions");
      }
      if (!isManagerOrAdmin && !isAdminOrFinance && activeTab === "workers_by_year") {
        setActiveTab("transactions");
      }
    }
  }, [isManagerOrAdmin, isAdminOrFinance, userRoles.length, activeTab]);

  const dateParams = React.useMemo(() => {
    if (activePeriod === "all") {
      return { period: "all" as const };
    }
    return { from_date: fromDate, to_date: toDate };
  }, [activePeriod, fromDate, toDate]);

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

  // Query all placements to enrich placement aging table with Candidate, Corridor, Foreign Agency, and Sponsor
  const {
    data: allPlacements = [],
  } = useQuery<V2PlacementRecord[]>({
    queryKey: ["report_all_placements"],
    queryFn: () => listPlacementsV2(undefined, 250),
    enabled: Boolean(isManagerOrAdmin && (activeTab === "operations" || activeTab === "aging")),
    staleTime: 60000,
  });

  // Query clearance steps to break down Processing into LMIS and Taeshir on the pipeline funnel graph
  const {
    data: allClearanceSteps = [],
  } = useQuery<V2ClearanceStepItem[]>({
    queryKey: ["report_all_clearance_steps"],
    queryFn: () => listMyClearanceStepsV2(),
    enabled: Boolean(isManagerOrAdmin && activeTab === "operations"),
    staleTime: 60000,
  });

  const placementsMap = React.useMemo(() => {
    const map = new Map<string, V2PlacementRecord>();
    allPlacements.forEach((p) => {
      if (p.name) map.set(p.name, p);
    });
    return map;
  }, [allPlacements]);

  const criticalPlacementsEnriched = React.useMemo(() => {
    const rawList = placementAging?.critical_not_departed || [];
    return rawList.map((row) => {
      const p = placementsMap.get(row.name);
      return {
        name: row.name,
        candidate_name: p?.full_name || row.full_name || p?.applicant || row.applicant || "—",
        corridor: p?.destination_country || row.destination_country || "—",
        contractor_name: p?.contractor_name || p?.contractor || row.contractor || "—",
        sponsor: p?.employer_name || p?.sponsor_name || (p as any)?.sponsor || "—",
        status: row.status || p?.status || "Processing",
        age_days: row.age_days ?? 0,
      };
    });
  }, [placementAging, placementsMap]);

  // 6. Financial Overview (Admin & Finance Manager - Authoritative Backend Aggregates)
  const {
    data: financialOverview,
    isLoading: isFinancialLoading,
    refetch: refetchFinancial,
  } = useQuery<V2FinancialOverviewReport>({
    queryKey: ["report_financial_overview", dateParams],
    queryFn: () => getFinancialOverviewV2(dateParams),
    enabled: Boolean(isAdminOrFinance && (activeTab === "financial" || activeTab === "transactions")),
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

  // All Transactions Ledger (Admin / Finance Manager - bounded pagination up to 500 with authoritative total)
  const {
    data: txnResult,
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = useQuery<{ data: V2TransactionRecord[]; total_count: number } | V2TransactionRecord[]>({
    queryKey: ["report_all_transactions", dateParams, txnStatusFilter, txnTypeFilter],
    queryFn: () =>
      listTransactionsV2({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: txnStatusFilter !== "All" ? txnStatusFilter : undefined,
        transactionType: txnTypeFilter !== "All" ? txnTypeFilter : undefined,
        limitPageLength: 500,
        withTotal: 1,
      }),
    enabled: Boolean(activeTab === "transactions" && isAdminOrFinance),
    staleTime: 30000,
  });

  const allTransactions: V2TransactionRecord[] = React.useMemo(() => {
    if (!txnResult) return [];
    if (Array.isArray(txnResult)) return txnResult;
    return txnResult.data || [];
  }, [txnResult]);

  const totalTxnCount = React.useMemo(() => {
    if (!txnResult) return 0;
    if (Array.isArray(txnResult)) return txnResult.length;
    return Number(txnResult.total_count ?? allTransactions.length);
  }, [txnResult, allTransactions.length]);

  const filteredTransactions = React.useMemo(() => {
    if (!txnSearchQuery.trim()) return allTransactions;
    const q = txnSearchQuery.toLowerCase();
    return allTransactions.filter((t) => {
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

  // Desktop viewport-fitting pagination state for Financial Transactions
  const [txnPage, setTxnPage] = React.useState<number>(1);
  const txnPageSize = 10;
  const totalTxnPages = Math.ceil(filteredTransactions.length / txnPageSize) || 1;

  React.useEffect(() => {
    setTxnPage(1);
  }, [dateParams, txnStatusFilter, txnTypeFilter, txnSearchQuery]);

  const paginatedTransactions = React.useMemo(() => {
    const start = (txnPage - 1) * txnPageSize;
    return filteredTransactions.slice(start, start + txnPageSize);
  }, [filteredTransactions, txnPage, txnPageSize]);

  const transactionMetrics = React.useMemo(() => {
    // When no specific filter is active, read backend aggregate totals from financialOverview if available
    const isUnfiltered = txnStatusFilter === "All" && txnTypeFilter === "All" && !txnSearchQuery.trim();

    if (isUnfiltered && financialOverview) {
      const expenseByCurr: Record<string, number> = {};
      const incomeByCurr: Record<string, number> = {};

      if (financialOverview.by_currency && typeof financialOverview.by_currency === "object") {
        Object.entries(financialOverview.by_currency).forEach(([curr, data]) => {
          if (data && typeof data === "object") {
            const entry = data as { expense?: number | string; income?: number | string };
            if (Number(entry.expense)) expenseByCurr[curr] = Number(entry.expense);
            if (Number(entry.income)) incomeByCurr[curr] = Number(entry.income);
          }
        });
      }

      const totalExpenseBirr = Number(financialOverview.totals_birr?.expense ?? financialOverview.total_expenses_etb ?? 0);
      const totalIncomeBirr = Number(financialOverview.totals_birr?.income ?? financialOverview.total_income_etb ?? 0);
      const netBalanceBirr = Number(financialOverview.net_balance_etb ?? (totalIncomeBirr - totalExpenseBirr));

      return {
        totalCount: totalTxnCount,
        totalExpenseBirr,
        totalIncomeBirr,
        netBalanceBirr,
        expenseByCurr,
        incomeByCurr,
      };
    }

    let totalExpenseBirr = 0;
    let totalIncomeBirr = 0;
    const expenseByCurr: Record<string, number> = {};
    const incomeByCurr: Record<string, number> = {};

    allTransactions.forEach((t: any) => {
      const origCurr = t.currency_original || t.currency || "ETB";
      const origAmt = Number(t.amount_original || t.amount || 0);
      const birr = Number(t.amount_birr || t.amount || 0);
      if (t.transaction_type === "Expense") {
        totalExpenseBirr += birr;
        expenseByCurr[origCurr] = (expenseByCurr[origCurr] || 0) + origAmt;
      } else if (t.transaction_type === "Income") {
        totalIncomeBirr += birr;
        incomeByCurr[origCurr] = (incomeByCurr[origCurr] || 0) + origAmt;
      }
    });

    const netBalanceBirr = totalIncomeBirr - totalExpenseBirr;

    return {
      totalCount: totalTxnCount || allTransactions.length,
      totalExpenseBirr,
      totalIncomeBirr,
      netBalanceBirr,
      expenseByCurr,
      incomeByCurr,
    };
  }, [allTransactions, financialOverview, totalTxnCount, txnStatusFilter, txnTypeFilter, txnSearchQuery]);

  // Handle Backend Spreadsheet Export (.xlsx or .csv fallback)
  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await exportCommissionsXlsxV2(
        undefined,
        undefined,
        activePeriod === "all" ? { period: "all" } : fromDate,
        activePeriod === "all" ? undefined : toDate
      );
      const fallback = activePeriod === "all" ? "Commissions_Export_All_Time" : `Commissions_Export_${fromDate}_to_${toDate}`;
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
        ...(activePeriod === "all" ? { period: "all" } : { from_date: fromDate, to_date: toDate }),
        status: statusFilter,
      });
      const fallback = activePeriod === "all" ? `Transactions_Export_${statusFilter || "All"}_All_Time` : `Transactions_Export_${statusFilter || "All"}_${fromDate}_to_${toDate}`;
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

  // Workers by Year State & Handlers
  const [workersBasis, setWorkersBasis] = React.useState<"Departed" | "Registered" | "Labour ID Issued">("Departed");
  const [workersPeriodMode, setWorkersPeriodMode] = React.useState<"year" | "custom" | "all">("year");
  const [workersYearType, setWorkersYearType] = React.useState<"Ethiopian Fiscal" | "Gregorian" | "Ethiopian">("Ethiopian Fiscal");
  const [workersYear, setWorkersYear] = React.useState<string>(() => String(getCurrentYearForType("Ethiopian Fiscal")));
  const [workersFromDate, setWorkersFromDate] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [workersToDate, setWorkersToDate] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isExportingWorkersXlsx, setIsExportingWorkersXlsx] = React.useState<boolean>(false);
  const [isExportingWorkersPdf, setIsExportingWorkersPdf] = React.useState<boolean>(false);

  const handleWorkersYearTypeChange = (newType: "Ethiopian Fiscal" | "Gregorian" | "Ethiopian") => {
    setWorkersYearType(newType);
    setWorkersYear(String(getCurrentYearForType(newType)));
  };

  const workersParams = React.useMemo(() => {
    if (workersPeriodMode === "all") {
      return {
        basis: workersBasis,
        period: "all",
      };
    }
    if (workersPeriodMode === "custom") {
      const from_date = workersFromDate || "2026-01-01";
      const to_date = workersToDate || new Date().toISOString().split("T")[0];
      return {
        basis: workersBasis,
        from_date,
        to_date,
        year_type: workersYearType,
      };
    }
    return {
      basis: workersBasis,
      year_type: workersYearType,
      year: parseInt(workersYear, 10) || workersYear,
    };
  }, [workersBasis, workersPeriodMode, workersFromDate, workersToDate, workersYearType, workersYear]);

  const {
    data: workersByYearData,
    isLoading: isWorkersLoading,
    error: workersError,
    refetch: refetchWorkers,
  } = useQuery<V2WorkersByYearResponse>({
    queryKey: ["report_workers_by_year", workersParams],
    queryFn: () => getWorkersByYearV2(workersParams),
    enabled: Boolean((isManagerOrAdmin || isAdminOrFinance) && activeTab === "workers_by_year"),
    staleTime: 60000,
  });

  const handleExportWorkers = async (format: "xlsx" | "pdf") => {
    if (format === "xlsx") setIsExportingWorkersXlsx(true);
    else setIsExportingWorkersPdf(true);

    try {
      const blob = await exportWorkersByYearV2(workersParams, format);
      const fallback = `Workers_${workersBasis.toLowerCase()}_${
        workersPeriodMode === "all"
          ? "all_time"
          : workersPeriodMode === "custom"
          ? `${workersFromDate}_${workersToDate}`
          : `${workersYearType.toLowerCase().replace(/\s+/g, "_")}_${workersYear}`
      }`;
      const filename = downloadDirectBlob(blob, fallback, `.${format}`);
      toast.success(`${format.toUpperCase()} Export Complete`, {
        description: `Exported ${filename}.`,
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: err?.message || `Failed to export Workers by Year ${format.toUpperCase()}.`,
      });
    } finally {
      if (format === "xlsx") setIsExportingWorkersXlsx(false);
      else setIsExportingWorkersPdf(false);
    }
  };

  // Funnel Data Transformation (Applicant + Placement Funnels + LMIS & Taeshir Breakdown)
  const funnelChartData = React.useMemo(() => {
    if (!opsSummary) return [];
    const af = opsSummary.applicant_funnel || {};
    const pf = opsSummary.placement_funnel || {};

    // Calculate LMIS and Taeshir candidate counts during the Processing stage
    let lmisCount = 0;
    let taeshirCount = 0;

    const processingPlacements = allPlacements.filter((p) => p.status === "Processing");
    if (processingPlacements.length > 0 && allClearanceSteps.length > 0) {
      processingPlacements.forEach((p) => {
        const steps = allClearanceSteps.filter((s) => s.placement === p.name);
        const lmisStep = steps.find((s) => s.step_type?.toLowerCase().includes("lmis"));
        const taeshirStep = steps.find(
          (s) =>
            s.step_type?.toLowerCase().includes("taeshir") ||
            s.step_type?.toLowerCase().includes("injaz") ||
            s.step_type?.toLowerCase().includes("telesign")
        );

        const isLmisIssued = lmisStep && (lmisStep.status === "Issued" || lmisStep.status === "Complete");
        if (!isLmisIssued) {
          lmisCount++;
        }
        if (isLmisIssued) {
          taeshirCount++;
        } else if (taeshirStep && (taeshirStep.status === "In Progress" || taeshirStep.status === "Pending")) {
          // If both are concurrent in this corridor
          taeshirCount++;
        }
      });
    }

    // Graceful fallback: If clearance steps are still loading or unassigned,
    // ensure both LMIS and Taeshir reflect the processing candidates from placement_funnel
    const processingTotal = pf.Processing || 0;
    if (processingTotal > 0 && lmisCount === 0 && taeshirCount === 0) {
      lmisCount = processingTotal;
      taeshirCount = processingTotal;
    } else if (processingTotal > 0 && lmisCount === 0) {
      lmisCount = processingTotal;
    }

    return [
      { stage: "Draft", count: af.Draft || 0 },
      { stage: "Registered", count: af.Registered || 0 },
      { stage: "CV Generated", count: af["CV Generated"] || 0 },
      { stage: "Requested", count: pf.Requested || 0 },
      { stage: "Selected", count: pf.Selected || 0 },
      { stage: "LMIS", count: lmisCount },
      { stage: "Taeshir", count: taeshirCount },
      { stage: "Stamped", count: pf.Stamped || 0 },
      { stage: "Ticketed", count: pf.Ticketed || 0 },
      { stage: "Departed", count: pf.Departed || 0 },
    ];
  }, [opsSummary, allPlacements, allClearanceSteps]);

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
    <div className="space-y-4 flex flex-col h-full min-h-0">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Export Controls                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
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
            Operational funnels, staff logs, and financial ledgers.
          </p>
        </div>

        {/* Global Date Range Filter & XLSX Export Action (Hidden on Applicant list report) */}
        {activeTab !== "workers_by_year" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-[#272732] bg-white dark:bg-[#121217]">
              <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
              {activePeriod === "all" ? (
                <span className="text-xs font-semibold px-2 text-emerald-800 dark:text-emerald-400">
                  All-time (counts all records up to today)
                </span>
              ) : (
                <>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setActivePeriod("custom");
                    }}
                    className="h-7 w-32 text-xs border-0 bg-transparent px-1 focus-visible:ring-0"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setActivePeriod("custom");
                    }}
                    className="h-7 w-32 text-xs border-0 bg-transparent px-1 focus-visible:ring-0"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-[#272732] bg-white dark:bg-[#121217]">
              {(["daily", "weekly", "monthly", "yearly", "all"] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={activePeriod === p ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreset(p)}
                  className={cn(
                    "text-[11px] h-7 px-2.5 font-medium",
                    activePeriod === p
                      ? "bg-emerald-900 text-white dark:bg-emerald-700 shadow-xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {p === "all" ? "All-time" : p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {isManagerOrAdmin && (
                <Button
                  type="button"
                  size="sm"
                  data-tour="reports-export-xlsx"
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
                  onClick={() => handleExportTransactionsXlsx(undefined)}
                  className="text-xs h-8 border-slate-300 dark:border-[#2a2a35] font-semibold"
                  title="Export all transactions (Expense/Income/Commission) with rich formatting to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {isExportingTransactionsXlsx ? "Exporting..." : "Export Transactions (.xlsx)"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Primary Report Navigation Tabs                                */}
      {/* ------------------------------------------------------------- */}
      <div data-tour="reports-tabs" className="flex items-center gap-2 border-b border-slate-200 dark:border-[#202028] pb-2 overflow-x-auto">
        {(isManagerOrAdmin || isAdminOrFinance) && (
          <button
            type="button"
            onClick={() => setActiveTab("workers_by_year")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "workers_by_year"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Applicant list report
            {workersByYearData?.total != null && activeTab === "workers_by_year" ? (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                {workersByYearData.total}
              </span>
            ) : null}
          </button>
        )}

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
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: APPLICANT LIST REPORT (WORKERS BY YEAR)            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "workers_by_year" && (isManagerOrAdmin || isAdminOrFinance) && (
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Applicant list report
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {workersByYearData?.period
                      ? workersByYearData.period
                      : "Candidate placement volumes filtered by registration, labour clearance, or departure year."}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExportingWorkersXlsx || !workersByYearData?.rows?.length}
                    onClick={() => handleExportWorkers("xlsx")}
                    className="text-xs h-8 border-slate-300 dark:border-[#2a2a35] font-semibold"
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    {isExportingWorkersXlsx ? "Exporting..." : "Excel (.xlsx)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExportingWorkersPdf || !workersByYearData?.rows?.length}
                    onClick={() => handleExportWorkers("pdf")}
                    className="text-xs h-8 border-slate-300 dark:border-[#2a2a35] font-semibold"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                    {isExportingWorkersPdf ? "Exporting..." : "PDF (.pdf)"}
                  </Button>
                </div>
              </div>

              {/* Controls bar */}
              <div className="pt-3 flex flex-wrap items-center gap-3 text-xs">
                {/* Basis */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600 dark:text-zinc-400">Basis:</span>
                  <select
                    value={workersBasis}
                    onChange={(e) => setWorkersBasis(e.target.value as any)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#2e2e38] bg-transparent text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Departed" className="dark:bg-[#121217]">Departed (by departure date)</option>
                    <option value="Registered" className="dark:bg-[#121217]">Registered (first registration)</option>
                    <option value="Labour ID Issued" className="dark:bg-[#121217]">Labour ID Issued (LMIS step completed)</option>
                  </select>
                </div>

                {/* Period Mode Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600 dark:text-zinc-400">Period:</span>
                  <select
                    value={workersPeriodMode}
                    onChange={(e) => setWorkersPeriodMode(e.target.value as any)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#2e2e38] bg-transparent text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="year" className="dark:bg-[#121217]">By Calendar Year</option>
                    <option value="custom" className="dark:bg-[#121217]">Custom Date Range</option>
                    <option value="all" className="dark:bg-[#121217]">All Time (Up to Today)</option>
                  </select>
                </div>

                {workersPeriodMode === "year" && (
                  <>
                    {/* Year Type */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">Calendar:</span>
                      <select
                        value={workersYearType}
                        onChange={(e) => handleWorkersYearTypeChange(e.target.value as any)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#2e2e38] bg-transparent text-xs text-slate-900 dark:text-white"
                      >
                        <option value="Ethiopian Fiscal" className="dark:bg-[#121217]">Ethiopian Fiscal (8 Jul - 7 Jul)</option>
                        <option value="Gregorian" className="dark:bg-[#121217]">Gregorian (Jan - Dec)</option>
                        <option value="Ethiopian" className="dark:bg-[#121217]">Ethiopian (11 Sep - 10 Sep)</option>
                      </select>
                    </div>

                    {/* Year Input */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">Year:</span>
                      <Input
                        type="number"
                        value={workersYear}
                        onChange={(e) => setWorkersYear(e.target.value)}
                        placeholder={String(getCurrentYearForType(workersYearType))}
                        className="h-8 w-24 text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {workersPeriodMode === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600 dark:text-zinc-400">Range:</span>
                    <Input
                      type="date"
                      value={workersFromDate}
                      onChange={(e) => setWorkersFromDate(e.target.value)}
                      className="h-8 w-32 text-xs"
                    />
                    <span className="text-slate-400">to</span>
                    <Input
                      type="date"
                      value={workersToDate}
                      onChange={(e) => setWorkersToDate(e.target.value)}
                      className="h-8 w-32 text-xs"
                    />
                  </div>
                )}

                {workersPeriodMode === "all" && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                    Counts all recorded placements up to today.
                  </span>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refetchWorkers()}
                  className="h-8 px-2.5 text-xs text-slate-700 dark:text-zinc-300"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isWorkersLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {workersError ? (
                <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400 space-y-1">
                  <AlertCircle className="h-6 w-6 mx-auto mb-1 text-rose-500" />
                  <p className="font-semibold">Unable to Load Applicant List Report</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {formatCleanErrorMessage(workersError)}
                  </p>
                </div>
              ) : isWorkersLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                  <p>Calculating applicant list statistics...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="px-4 py-2 bg-slate-50/50 dark:bg-[#15151c] border-b border-slate-100 dark:border-[#202028] flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Period: <strong className="text-slate-800 dark:text-zinc-200">{workersByYearData?.period || "—"}</strong>
                    </span>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Total: {workersByYearData?.total ?? 0} Workers
                    </Badge>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">#</th>
                        <th className="py-2.5 px-4 font-semibold">Passport Number</th>
                        <th className="py-2.5 px-4 font-semibold">Full Name</th>
                        <th className="py-2.5 px-4 font-semibold">Labour ID</th>
                        <th className="py-2.5 px-4 font-semibold">Destination Country</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                      {workersByYearData?.rows && workersByYearData.rows.length > 0 ? (
                        workersByYearData.rows.map((row, idx) => (
                          <tr key={`${row.passport_number}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                            <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{row.passport_number || "—"}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-zinc-200">{row.full_name || "—"}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-zinc-400">{row.labor_id || "—"}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-[#2b2b36]">
                                {row.destination_country || "—"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <Users className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                            <p className="font-semibold text-slate-600 dark:text-zinc-400">No applicants recorded for this basis and period</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Try selecting another year, calendar type, or changing basis.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                Candidate progression by stage.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e24", border: "1px solid #333", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                      formatter={(value: any, name: any, item: any) => [
                        `${value} candidate${Number(value) === 1 ? "" : "s"}`,
                        item?.payload?.stage || "Count",
                      ]}
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
                Officer completions by stage.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto lg:overflow-hidden">
                <table className="w-full text-xs text-left lg:table-fixed">
                  <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-normal break-words leading-snug">Officer</th>
                      <th className="py-2.5 px-3 whitespace-normal break-words leading-snug">CVs Created</th>
                      <th className="py-2.5 px-3 whitespace-normal break-words leading-snug">Clearances Issued</th>
                      <th className="py-2.5 px-3 whitespace-normal break-words leading-snug">Tickets Booked</th>
                      <th className="py-2.5 px-3 whitespace-normal break-words leading-snug">Departures Confirmed</th>
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
                Placements exceeding 30-day departure SLA.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto lg:overflow-x-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left lg:table-fixed">
                  <thead className="sticky top-0 z-10 text-[11px] text-slate-400 bg-red-50 dark:bg-red-950/40 border-y border-red-100 dark:border-red-950/40 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-[12%] whitespace-normal break-words leading-snug">Placement ID</th>
                      <th className="py-2.5 px-3 w-[20%] whitespace-normal break-words leading-snug">Candidate</th>
                      <th className="py-2.5 px-3 w-[14%] whitespace-normal break-words leading-snug">Corridor</th>
                      <th className="py-2.5 px-3 w-[18%] whitespace-normal break-words leading-snug">Foreign Agency</th>
                      <th className="py-2.5 px-3 w-[16%] whitespace-normal break-words leading-snug">Sponsor</th>
                      <th className="py-2.5 px-3 w-[10%] text-center whitespace-normal break-words leading-snug">Current Status</th>
                      <th className="py-2.5 px-3 w-[10%] text-right whitespace-normal break-words leading-snug">Age (Days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {criticalPlacementsEnriched.length > 0 ? (
                      criticalPlacementsEnriched.map((row) => (
                        <tr key={row.name} className="hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white truncate">{row.name}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100 truncate">{row.candidate_name}</td>
                          <td className="py-2.5 px-3 truncate">{row.corridor}</td>
                          <td className="py-2.5 px-3 truncate text-slate-600 dark:text-zinc-400">{row.contractor_name}</td>
                          <td className="py-2.5 px-3 truncate text-slate-600 dark:text-zinc-400">{row.sponsor}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600 whitespace-nowrap">{row.age_days}d</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
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
              <div className="overflow-x-auto lg:overflow-hidden">
                <table className="w-full text-xs text-left lg:table-fixed">
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
              {/* Awaiting FX Rate Callout Banner */}
              {isBirrConversionEnabled &&
                ((financialOverview?.awaiting_fx && financialOverview.awaiting_fx.count > 0) ||
                  (costBreakdown?.awaiting_fx && costBreakdown.awaiting_fx.count > 0)) && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-amber-950 dark:text-amber-200">
                        Transactions Awaiting Foreign Exchange Rate
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        {(financialOverview?.awaiting_fx?.count || costBreakdown?.awaiting_fx?.count || 0)} transactions awaiting FX rate (
                        {Object.entries((financialOverview?.awaiting_fx?.by_currency || costBreakdown?.awaiting_fx?.by_currency || {}))
                          .map(([curr, amt]) => `${Number(amt).toLocaleString()} ${curr}`)
                          .join(", ") || "pending rates"}
                        ) are not in these Birr totals yet.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 text-xs font-semibold">
                    {(financialOverview?.awaiting_fx?.count || costBreakdown?.awaiting_fx?.count || 0)} Pending FX
                  </Badge>
                </div>
              )}

              {/* Financial Ledger Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Income
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                        ETB {(financialOverview?.totals_birr?.income || 0).toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {financialOverview?.by_currency && Object.keys(financialOverview.by_currency).length > 0 ? (
                          Object.entries(financialOverview.by_currency).map(([c, val]: [string, any]) => (
                            <div key={c} className="text-lg font-bold text-emerald-800 dark:text-emerald-400">
                              {c} {Number(val?.income || 0).toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Expense
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        ETB {(financialOverview?.totals_birr?.expense || 0).toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {financialOverview?.by_currency && Object.keys(financialOverview.by_currency).length > 0 ? (
                          Object.entries(financialOverview.by_currency).map(([c, val]: [string, any]) => (
                            <div key={c} className="text-lg font-bold text-red-600 dark:text-red-400">
                              {c} {Number(val?.expense || 0).toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-2xl font-bold text-red-600 dark:text-red-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Outstanding Commissions Owed
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">
                        ETB {(financialOverview?.outstanding_owed_birr || 0).toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {financialOverview?.by_currency && Object.keys(financialOverview.by_currency).length > 0 ? (
                          Object.entries(financialOverview.by_currency).map(([c, val]: [string, any]) => (
                            <div key={c} className="text-lg font-bold text-amber-800 dark:text-amber-400">
                              {c} {Number(val?.outstanding_owed || 0).toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-2xl font-bold text-amber-800 dark:text-amber-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Settled Commissions in Period
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        ETB {(financialOverview?.settled_in_period_birr || 0).toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {financialOverview?.by_currency && Object.keys(financialOverview.by_currency).length > 0 ? (
                          Object.entries(financialOverview.by_currency).map(([c, val]: [string, any]) => (
                            <div key={c} className="text-lg font-bold text-slate-900 dark:text-white">
                              {c} {Number(val?.settled_in_period || 0).toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">0</span>
                        )}
                      </div>
                    )}
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
                  {isBirrConversionEnabled ? (
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
                  ) : (
                    <div className="overflow-x-auto lg:overflow-hidden">
                      <table className="w-full text-xs text-left lg:table-fixed">
                        <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-y border-slate-100 dark:border-[#20202a]">
                          <tr>
                            <th className="py-2 px-3">Country</th>
                            <th className="py-2 px-3">Currency</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                          {costBreakdown?.by_country && Object.keys(costBreakdown.by_country).length > 0 ? (
                            Object.entries(costBreakdown.by_country).flatMap(([country, currMap]) =>
                              Object.entries(currMap || {}).map(([curr, amt]) => (
                                <tr key={`${country}-${curr}`} className="hover:bg-slate-50 dark:hover:bg-[#181822]">
                                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">{country}</td>
                                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-zinc-400">{curr}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-right text-emerald-800 dark:text-emerald-400">
                                    {Number(amt).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-400">
                                Zero cost data recorded for window.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                  <div className="overflow-x-auto lg:overflow-hidden">
                    <table className="w-full text-xs text-left lg:table-fixed">
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
                              <td className="py-2 px-3 font-bold">
                                {isBirrConversionEnabled ? (
                                  `ETB ${(ef.net_expense_handled_birr || 0).toLocaleString()}`
                                ) : ef.net_expense_by_currency ? (
                                  Object.entries(ef.net_expense_by_currency)
                                    .map(([curr, amt]) => `${curr} ${Number(amt).toLocaleString()}`)
                                    .join(", ") || "—"
                                ) : (
                                  "—"
                                )}
                              </td>
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
            <div className="space-y-3 flex flex-col flex-1 min-h-0">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-3 space-y-0.5">
                    <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Transactions
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {transactionMetrics.totalCount}
                      </span>
                      <Badge variant="outline" className="text-[9.5px]">
                        In Date Window
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-3 space-y-0.5">
                    <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Approved Expenses
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                        ETB {transactionMetrics.totalExpenseBirr.toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {Object.keys(transactionMetrics.expenseByCurr).length > 0 ? (
                          Object.entries(transactionMetrics.expenseByCurr).map(([c, amt]) => (
                            <div key={c} className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                              {c} {amt.toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-3 space-y-0.5">
                    <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Approved Income
                    </span>
                    {isBirrConversionEnabled ? (
                      <span className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                        ETB {transactionMetrics.totalIncomeBirr.toLocaleString()}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {Object.keys(transactionMetrics.incomeByCurr).length > 0 ? (
                          Object.entries(transactionMetrics.incomeByCurr).map(([c, amt]) => (
                            <div key={c} className="text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-400">
                              {c} {amt.toLocaleString()}
                            </div>
                          ))
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="p-3 space-y-0.5">
                    <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Net Balance
                    </span>
                    {isBirrConversionEnabled ? (
                      <div className="flex items-baseline justify-between">
                        <span
                          className={cn(
                            "text-xl sm:text-2xl font-bold",
                            transactionMetrics.netBalanceBirr >= 0
                              ? "text-emerald-800 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          ETB {transactionMetrics.netBalanceBirr.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {Object.keys({ ...transactionMetrics.incomeByCurr, ...transactionMetrics.expenseByCurr }).length > 0 ? (
                          Object.keys({ ...transactionMetrics.incomeByCurr, ...transactionMetrics.expenseByCurr }).map((c) => {
                            const net = (transactionMetrics.incomeByCurr[c] || 0) - (transactionMetrics.expenseByCurr[c] || 0);
                            return (
                              <div
                                key={c}
                                className={cn(
                                  "text-base sm:text-lg font-bold",
                                  net >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                )}
                              >
                                {c} {net.toLocaleString()}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-slate-400">0</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Master Table */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] flex flex-col flex-1 min-h-0 shadow-xs">
                <CardHeader className="pb-2.5 pt-3 border-b border-slate-100 dark:border-[#202028] shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600" />
                        Complete Financial Transactions Ledger
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                        Complete ledger of expenses and income.
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
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2.5">
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

                <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                  <div className="flex-1 min-h-[220px] max-h-[calc(100vh-390px)] overflow-y-auto overflow-x-auto lg:overflow-x-hidden">
                    <table className="w-full text-xs text-left lg:table-fixed">
                      <thead className="sticky top-0 z-10 text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-b border-slate-100 dark:border-[#20202a] backdrop-blur-xs">
                        <tr>
                          <th className="py-2.5 px-3 w-[11%] font-semibold whitespace-normal break-words leading-snug">Transaction</th>
                          <th className="py-2.5 px-3 w-[8%] font-semibold whitespace-normal break-words leading-snug">Type</th>
                          <th className="py-2.5 px-3 w-[22%] font-semibold whitespace-normal break-words leading-snug">Description & Stage</th>
                          <th className="py-2.5 px-3 w-[14%] font-semibold whitespace-normal break-words leading-snug">Candidate / Placement</th>
                          <th className="py-2.5 px-3 w-[11%] font-semibold text-right whitespace-normal break-words leading-snug">Amount (Original)</th>
                          {isBirrConversionEnabled && (
                            <th className="py-2.5 px-3 w-[11%] font-semibold text-right whitespace-normal break-words leading-snug">Amount (ETB)</th>
                          )}
                          <th className="py-2.5 px-3 w-[8%] font-semibold text-center whitespace-normal break-words leading-snug">Status</th>
                          <th className="py-2.5 px-3 w-[8%] font-semibold whitespace-normal break-words leading-snug">Logged By</th>
                          <th className="py-2.5 px-3 w-[11%] font-semibold whitespace-normal break-words leading-snug">Approval / Audit</th>
                          <th className="py-2.5 px-3 w-[7%] font-semibold text-center whitespace-normal break-words leading-snug">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                        {isTransactionsLoading ? (
                          <tr>
                            <td colSpan={isBirrConversionEnabled ? 10 : 9} className="py-12 text-center text-slate-400">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                              Loading financial transactions...
                            </td>
                          </tr>
                        ) : filteredTransactions.length > 0 ? (
                          paginatedTransactions.map((t: any) => {
                            const isExpense = t.transaction_type === "Expense";
                            const origCurr = t.currency_original || t.currency || "ETB";
                            const origAmt = Number(t.amount_original || t.amount || 0);
                            const birrAmt = Number(t.amount_birr || t.amount || 0);

                            return (
                              <tr key={t.name} className="hover:bg-slate-50/80 dark:hover:bg-[#181822] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                  <div>#{shortRef(t.name)}</div>
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
                                  {t.fee_type && t.clearance_step ? (
                                    <div className="font-semibold text-slate-900 dark:text-zinc-100">
                                      {t.fee_type} · {stripRecordIds(t.clearance_step)}
                                    </div>
                                  ) : t.fee_type ? (
                                    <div className="font-semibold text-slate-900 dark:text-zinc-100">
                                      {t.fee_type}
                                    </div>
                                  ) : null}
                                  <div className="font-medium text-slate-800 dark:text-zinc-200 line-clamp-1">
                                    {stripRecordIds(t.description) || "No description"}
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
                                      {shortRef(t.applicant)}
                                    </Link>
                                  ) : null}
                                  {t.placement && (
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      {shortRef(t.placement)}
                                    </span>
                                  )}
                                  {!t.applicant && !t.placement && (
                                    <span className="text-slate-400 font-sans text-[11px]">General Ledger</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-800 dark:text-zinc-200">
                                  {origCurr} {origAmt.toLocaleString()}
                                </td>

                                {isBirrConversionEnabled && (
                                  <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                    <div className={cn(isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-400")}>
                                      {isExpense ? "-" : "+"} ETB {birrAmt.toLocaleString()}
                                    </div>
                                    {t.awaiting_fx_rate === 1 && (
                                      <Badge variant="outline" className="mt-0.5 text-[9px] border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40">
                                        Awaiting FX Rate
                                      </Badge>
                                    )}
                                  </td>
                                )}

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

                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {t.status !== "Pending" ? (
                                    <UndoLastStepButton
                                      doctype="Applicant Transaction"
                                      name={t.name}
                                      askOnClick
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-slate-500 hover:text-rose-600"
                                      onSuccess={() => refetchTransactions()}
                                    />
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={isBirrConversionEnabled ? 10 : 9} className="py-12 text-center text-slate-400">
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
                  {totalTxnPages > 1 && (
                    <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 dark:border-[#20202a] bg-slate-50/50 dark:bg-[#14141a]">
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Showing <strong className="text-slate-900 dark:text-white">{(txnPage - 1) * txnPageSize + 1}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white">{Math.min(txnPage * txnPageSize, filteredTransactions.length)}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white">{filteredTransactions.length}</strong> transactions
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={txnPage <= 1}
                          onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-200 dark:border-[#2a2a35]"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" />
                          Previous
                        </Button>
                        <span className="text-xs text-slate-600 dark:text-zinc-400 px-2 font-mono">
                          {txnPage} / {totalTxnPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={txnPage >= totalTxnPages}
                          onClick={() => setTxnPage((p) => Math.min(totalTxnPages, p + 1))}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-200 dark:border-[#2a2a35]"
                        >
                          Next
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
