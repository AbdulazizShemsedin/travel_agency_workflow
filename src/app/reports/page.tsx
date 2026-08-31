"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  HeartPulse,
  Plane,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Globe2,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  BarChart3,
  Layers,
  Award,
  Clock,
  AlertTriangle,
  RotateCcw,
  Building2,
  Check,
  X,
  SlidersHorizontal,
  MapPin,
  Heart,
  Briefcase,
  UserCheck,
  Sparkles,
  CreditCard,
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
import {
  listApplicantsV2,
  getOperationsSummaryV2,
  getFinancialOverviewV2,
  getOwedCommissionsV2,
  listUnresolvedComplaintsV2,
  listContractorsV2,
} from "@/lib/api/v2";
import { fetchCurrentUserContext } from "@/lib/api/auth";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToPrintPDF, ExportColumn } from "@/lib/utils/reportExport";
import { Applicant, CommissionLedgerItem, AgencyComplaint, Contractor } from "@/types/applicant";
import { LMISReportView } from "@/components/reports/LMISReportView";
import { InjazReportView } from "@/components/reports/InjazReportView";
import { EmbassyReportView } from "@/components/reports/EmbassyReportView";
import { DepartureReportView } from "@/components/reports/DepartureReportView";

type ReportTab = "overview" | "stage" | "commission" | "departed" | "lmis" | "injaz" | "embassy" | "departure";
type PeriodPreset = "today" | "week" | "month" | "all" | "custom";

const STAGE_ORDER = [
  "Draft",
  "Registered",
  "CV Generated",
  "Request Pending",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
  "Cancelled",
];

const STAGE_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Registered: "#3b82f6",
  "CV Generated": "#0ea5e9",
  "Request Pending": "#f59e0b",
  Selected: "#8b5cf6",
  Processing: "#6366f1",
  Stamped: "#10b981",
  Ticketed: "#059669",
  Departed: "#047857",
  Cancelled: "#ef4444",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("overview");
  const [periodPreset, setPeriodPreset] = React.useState<PeriodPreset>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  // Filters State: Stage Report
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [stageCountryFilter, setStageCountryFilter] = React.useState<string>("all");
  const [stageTypeFilter, setStageTypeFilter] = React.useState<string>("all");
  const [stageReligionFilter, setStageReligionFilter] = React.useState<string>("all");
  const [stageBirthPlaceFilter, setStageBirthPlaceFilter] = React.useState<string>("all");
  const [stageMaritalFilter, setStageMaritalFilter] = React.useState<string>("all");
  const [stageGenderFilter, setStageGenderFilter] = React.useState<string>("all");
  const [stageJobFilter, setStageJobFilter] = React.useState<string>("all");
  const [stageMedicalFilter, setStageMedicalFilter] = React.useState<string>("all");
  const [stageExperienceFilter, setStageExperienceFilter] = React.useState<string>("all");
  const [stageSearch, setStageSearch] = React.useState<string>("");
  const [showStageAdvanced, setShowStageAdvanced] = React.useState<boolean>(false);

  // Filters State: Commission Report
  const [commAgencyFilter, setCommAgencyFilter] = React.useState<string>("all");
  const [commStatusFilter, setCommStatusFilter] = React.useState<string>("all");
  const [commCountryFilter, setCommCountryFilter] = React.useState<string>("all");
  const [commReligionFilter, setCommReligionFilter] = React.useState<string>("all");
  const [commBirthPlaceFilter, setCommBirthPlaceFilter] = React.useState<string>("all");
  const [commMaritalFilter, setCommMaritalFilter] = React.useState<string>("all");
  const [commGenderFilter, setCommGenderFilter] = React.useState<string>("all");
  const [commJobFilter, setCommJobFilter] = React.useState<string>("all");
  const [commSearch, setCommSearch] = React.useState<string>("");
  const [showCommAdvanced, setShowCommAdvanced] = React.useState<boolean>(false);

  // Filters State: Departed & After-Process Report
  const [depAgencyFilter, setDepAgencyFilter] = React.useState<string>("all");
  const [depOutcomeFilter, setDepOutcomeFilter] = React.useState<string>("all");
  const [depReasonFilter, setDepReasonFilter] = React.useState<string>("all");
  const [depCountryFilter, setDepCountryFilter] = React.useState<string>("all");
  const [depReligionFilter, setDepReligionFilter] = React.useState<string>("all");
  const [depBirthPlaceFilter, setDepBirthPlaceFilter] = React.useState<string>("all");
  const [depMaritalFilter, setDepMaritalFilter] = React.useState<string>("all");
  const [depGenderFilter, setDepGenderFilter] = React.useState<string>("all");
  const [depJobFilter, setDepJobFilter] = React.useState<string>("all");
  const [depSearch, setDepSearch] = React.useState<string>("");
  const [showDepAdvanced, setShowDepAdvanced] = React.useState<boolean>(false);

  // RBAC Authentication
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["current_user_context"],
    queryFn: fetchCurrentUserContext,
  });

  const isAuthorized = can(currentUser, "viewReports");

  // Date Range Calculation based on Preset
  React.useEffect(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (periodPreset === "today") {
      const dStr = formatDate(today);
      setFromDate(dStr);
      setToDate(dStr);
    } else if (periodPreset === "week") {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setFromDate(formatDate(past7));
      setToDate(formatDate(today));
    } else if (periodPreset === "month") {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setFromDate(formatDate(past30));
      setToDate(formatDate(today));
    } else if (periodPreset === "all") {
      setFromDate("");
      setToDate("");
    }
  }, [periodPreset]);

  // 1. Authoritative V2 Backend Queries
  const {
    data: rawOperations,
    isLoading: isOpsLoading,
    refetch: refetchOps,
  } = useQuery({
    queryKey: ["operations_summary_v2", fromDate, toDate],
    queryFn: async () => {
      try {
        return await getOperationsSummaryV2(fromDate && toDate ? { from_date: fromDate, to_date: toDate } : undefined);
      } catch (err) {
        console.warn("[Reports] getOperationsSummaryV2 error:", err);
        return null;
      }
    },
    enabled: isAuthorized,
  });

  const operations = rawOperations as any;

  const {
    data: rawAccounting,
    isLoading: isAccLoading,
    refetch: refetchAcc,
  } = useQuery({
    queryKey: ["accounting_summary_v2"],
    queryFn: async () => {
      try {
        return await getFinancialOverviewV2();
      } catch (err) {
        console.warn("[Reports] getFinancialOverviewV2 error:", err);
        return null;
      }
    },
    enabled: isAuthorized,
  });

  const accounting = rawAccounting as any;

  const {
    data: rawApplicants = [],
    isLoading: isApplicantsLoading,
    refetch: refetchApplicants,
  } = useQuery({
    queryKey: ["applicants_v2_reports"],
    queryFn: async () => {
      try {
        return await listApplicantsV2(undefined, 500);
      } catch (err) {
        console.warn("[Reports] listApplicantsV2 error:", err);
        return [];
      }
    },
    enabled: isAuthorized,
  });

  const applicants = rawApplicants as any[];

  const {
    data: rawCommission = [],
    isLoading: isCommLoading,
    refetch: refetchComm,
  } = useQuery({
    queryKey: ["admin_commission_ledger_v2"],
    queryFn: async () => {
      try {
        return await getOwedCommissionsV2();
      } catch (err) {
        console.warn("[Reports] getOwedCommissionsV2 error:", err);
        return [];
      }
    },
    enabled: isAuthorized,
  });

  const commissionData = {
    items: rawCommission as any[],
    summary: {
      total_departed: rawCommission.length,
      total_outstanding_amount: (rawCommission as any[]).reduce((sum, item) => sum + (Number(item.commission_amount || item.amount) || 0), 0),
      total_paid_amount: 0,
      currency: (rawCommission as any[])[0]?.currency || "SAR",
      total_contractors_count: 0,
      unpaid_count: rawCommission.length,
      paid_count: 0,
    },
  };

  const unpaidSummary = {
    total_departed: rawCommission.length,
    total_outstanding: commissionData.summary.total_outstanding_amount,
    currency: commissionData.summary.currency,
  };

  const {
    data: rawComplaints = [],
    isLoading: isComplaintsLoading,
    refetch: refetchComplaints,
  } = useQuery({
    queryKey: ["agency_complaints_v2", "all"],
    queryFn: async () => {
      try {
        return await listUnresolvedComplaintsV2();
      } catch (err) {
        console.warn("[Reports] listUnresolvedComplaintsV2 error:", err);
        return [];
      }
    },
    enabled: isAuthorized,
  });

  const complaints = rawComplaints as any[];

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors_v2_reports"],
    queryFn: async () => {
      try {
        return await listContractorsV2();
      } catch (err) {
        console.warn("[Reports] listContractorsV2 error:", err);
        return [];
      }
    },
    enabled: isAuthorized,
  });

  const isLoading =
    isUserLoading ||
    isOpsLoading ||
    isAccLoading ||
    isApplicantsLoading ||
    isCommLoading ||
    isComplaintsLoading;

  const handleRefreshAll = () => {
    refetchOps();
    refetchAcc();
    refetchApplicants();
    refetchComm();
    refetchComplaints();
  };

  // Dynamic Options Extracted from Live Backend Data
  const dynamicFilterOptions = React.useMemo(() => {
    const religions = new Set<string>(["Muslim", "Orthodox", "Protestant", "Catholic"]);
    const birthPlaces = new Set<string>([
      "Oromia",
      "Amhara",
      "Addis Ababa",
      "Tigray",
      "Sidama",
      "SNNPR",
      "Somali",
      "Afar",
      "Dire Dawa",
      "Harari",
      "Benishangul-Gumuz",
      "Gambela",
    ]);
    const maritalStatuses = new Set<string>(["Single", "Married", "Divorced", "Widowed"]);
    const jobs = new Set<string>(["Housemaid", "Cook", "Driver", "Elderly Caregiver", "Baby Sitter", "Cleaner"]);
    const countries = new Set<string>(["Saudi Arabia", "Kuwait", "United Arab Emirates", "Qatar", "Oman", "Jordan"]);

    for (const a of applicants) {
      if (a.religion) religions.add(a.religion);
      if (a.place_of_birth) birthPlaces.add(a.place_of_birth);
      if ((a as any).leaving_town) birthPlaces.add((a as any).leaving_town);
      if (a.marital_status) maritalStatuses.add(a.marital_status);
      if (a.job_applied) jobs.add(a.job_applied);
      if (a.destination_country) countries.add(a.destination_country);
    }

    return {
      religions: Array.from(religions).filter(Boolean).sort(),
      birthPlaces: Array.from(birthPlaces).filter(Boolean).sort(),
      maritalStatuses: Array.from(maritalStatuses).filter(Boolean).sort(),
      jobs: Array.from(jobs).filter(Boolean).sort(),
      countries: Array.from(countries).filter(Boolean).sort(),
    };
  }, [applicants]);

  // Date Filtering Helper
  const isWithinSelectedDateRange = (dateStr?: string) => {
    if (!fromDate && !toDate) return true;
    if (!dateStr) return false;
    const target = dateStr.split("T")[0].split(" ")[0];
    if (fromDate && target < fromDate) return false;
    if (toDate && target > toDate) return false;
    return true;
  };

  // -------------------------------------------------------------------------
  // FILTERED APPLICANTS (STAGE REPORT)
  // -------------------------------------------------------------------------
  const filteredApplicants = React.useMemo(() => {
    return applicants.filter((a) => {
      // Date filter
      if (!isWithinSelectedDateRange(a.creation || a.modified)) return false;

      // Stage filter
      if (stageFilter !== "all" && a.applicant_state !== stageFilter) return false;

      // Destination country
      if (stageCountryFilter !== "all" && a.destination_country !== stageCountryFilter) return false;

      // Intake Type
      if (stageTypeFilter !== "all" && (a.applicant_type || "Standard") !== stageTypeFilter) return false;

      // Religion
      if (stageReligionFilter !== "all") {
        const rel = (a.religion || "").toLowerCase().trim();
        if (rel !== stageReligionFilter.toLowerCase().trim()) return false;
      }

      // Place of Birth
      if (stageBirthPlaceFilter !== "all") {
        const pob = (a.place_of_birth || (a as any).leaving_town || "").toLowerCase().trim();
        const targetPob = stageBirthPlaceFilter.toLowerCase().trim();
        if (!pob.includes(targetPob) && !targetPob.includes(pob)) return false;
      }

      // Marital Status
      if (stageMaritalFilter !== "all") {
        const mar = (a.marital_status || "").toLowerCase().trim();
        if (mar !== stageMaritalFilter.toLowerCase().trim()) return false;
      }

      // Gender
      if (stageGenderFilter !== "all") {
        const gen = (a.gender || "").toLowerCase().trim();
        if (gen !== stageGenderFilter.toLowerCase().trim()) return false;
      }

      // Job Applied
      if (stageJobFilter !== "all" && !((a.job_applied || "").toLowerCase().includes(stageJobFilter.toLowerCase()))) return false;

      // Medical Status
      if (stageMedicalFilter !== "all" && (a.medical_status || "Pending") !== stageMedicalFilter) return false;

      // Experience Filter
      if (stageExperienceFilter !== "all") {
        const hasExp = Boolean((a as any).experience_country || (a as any).experience_period);
        if (stageExperienceFilter === "experienced" && !hasExp) return false;
        if (stageExperienceFilter === "first_time" && hasExp) return false;
      }

      // Search query
      if (stageSearch.trim()) {
        const q = stageSearch.toLowerCase().trim();
        const id = (a.name || "").toLowerCase();
        const fn = (a.full_name || `${a.first_name || ""} ${a.middle_name || ""} ${a.last_name || ""}`).toLowerCase();
        const pass = (a.passport_number || "").toLowerCase();
        const pob = (a.place_of_birth || "").toLowerCase();
        if (!id.includes(q) && !fn.includes(q) && !pass.includes(q) && !pob.includes(q)) return false;
      }

      return true;
    });
  }, [
    applicants,
    fromDate,
    toDate,
    stageFilter,
    stageCountryFilter,
    stageTypeFilter,
    stageReligionFilter,
    stageBirthPlaceFilter,
    stageMaritalFilter,
    stageGenderFilter,
    stageJobFilter,
    stageMedicalFilter,
    stageExperienceFilter,
    stageSearch,
  ]);

  // Stage Distribution Counts (for Chart & KPI Pills)
  const stageDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of STAGE_ORDER) {
      counts[stage] = 0;
    }
    for (const a of applicants) {
      if (isWithinSelectedDateRange(a.creation || a.modified)) {
        const s = a.applicant_state || "Draft";
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    return STAGE_ORDER.map((stage) => ({
      stage,
      count: counts[stage] || 0,
      fill: STAGE_COLORS[stage] || "#64748b",
    }));
  }, [applicants, fromDate, toDate]);

  // -------------------------------------------------------------------------
  // FILTERED COMMISSION ITEMS (COMMISSION REPORT)
  // -------------------------------------------------------------------------
  const applicantMap = React.useMemo(() => {
    const map = new Map<string, Applicant>();
    for (const a of applicants) {
      if (a.name) map.set(a.name, a);
    }
    return map;
  }, [applicants]);

  const commissionItems = commissionData?.items || [];
  const filteredCommissionItems = React.useMemo(() => {
    return commissionItems.filter((item) => {
      // Date filter
      if (!isWithinSelectedDateRange(item.departure_date || item.creation)) return false;

      // Agency filter
      if (commAgencyFilter !== "all" && item.contractor !== commAgencyFilter && item.contractor_name !== commAgencyFilter) {
        return false;
      }

      // Status filter
      if (commStatusFilter !== "all" && item.commission_status !== commStatusFilter) {
        return false;
      }

      // Destination country
      if (commCountryFilter !== "all" && item.destination_country !== commCountryFilter) {
        return false;
      }

      const linkedApp = applicantMap.get(item.name);

      // Religion filter
      if (commReligionFilter !== "all") {
        const rel = (linkedApp?.religion || (item as any).religion || "").toLowerCase().trim();
        if (rel !== commReligionFilter.toLowerCase().trim()) return false;
      }

      // Place of Birth filter
      if (commBirthPlaceFilter !== "all") {
        const pob = (linkedApp?.place_of_birth || (linkedApp as any)?.leaving_town || (item as any).place_of_birth || "").toLowerCase().trim();
        const targetPob = commBirthPlaceFilter.toLowerCase().trim();
        if (!pob.includes(targetPob) && !targetPob.includes(pob)) return false;
      }

      // Marital Status filter
      if (commMaritalFilter !== "all") {
        const mar = (linkedApp?.marital_status || (item as any).marital_status || "").toLowerCase().trim();
        if (mar !== commMaritalFilter.toLowerCase().trim()) return false;
      }

      // Gender filter
      if (commGenderFilter !== "all") {
        const gen = (linkedApp?.gender || (item as any).gender || "").toLowerCase().trim();
        if (gen !== commGenderFilter.toLowerCase().trim()) return false;
      }

      // Job Applied filter
      if (commJobFilter !== "all" && !((item.job_applied || linkedApp?.job_applied || "").toLowerCase().includes(commJobFilter.toLowerCase()))) {
        return false;
      }

      // Search
      if (commSearch.trim()) {
        const q = commSearch.toLowerCase().trim();
        const id = (item.name || "").toLowerCase();
        const fn = (item.full_name || "").toLowerCase();
        const pass = (item.passport_number || "").toLowerCase();
        const batch = (item.commission_batch_ref || "").toLowerCase();
        const pob = (linkedApp?.place_of_birth || (item as any).place_of_birth || "").toLowerCase();
        if (!id.includes(q) && !fn.includes(q) && !pass.includes(q) && !batch.includes(q) && !pob.includes(q)) return false;
      }

      return true;
    });
  }, [
    commissionItems,
    applicantMap,
    fromDate,
    toDate,
    commAgencyFilter,
    commStatusFilter,
    commCountryFilter,
    commReligionFilter,
    commBirthPlaceFilter,
    commMaritalFilter,
    commGenderFilter,
    commJobFilter,
    commSearch,
  ]);

  // Commission Totals calculated deterministically from filtered real records
  const filteredCommTotals = React.useMemo(() => {
    const totalEligible = filteredCommissionItems.length;
    const unpaidItems = filteredCommissionItems.filter((i) => i.commission_status === "Pending" || i.commission_status === "Invoiced");
    const paidItems = filteredCommissionItems.filter((i) => i.commission_status === "Paid");
    const waivedItems = filteredCommissionItems.filter((i) => i.commission_status === "Waived");

    const unpaidAmount = unpaidItems.reduce((acc, i) => acc + (Number(i.commission_amount) || 0), 0);
    const paidAmount = paidItems.reduce((acc, i) => acc + (Number(i.commission_amount) || 0), 0);
    const totalAmount = filteredCommissionItems.reduce((acc, i) => acc + (Number(i.commission_amount) || 0), 0);

    const agencyMap: Record<string, { agency: string; amount: number; count: number }> = {};
    for (const item of filteredCommissionItems) {
      const agKey = item.contractor_name || item.contractor || "Direct";
      if (!agencyMap[agKey]) {
        agencyMap[agKey] = { agency: agKey, amount: 0, count: 0 };
      }
      agencyMap[agKey].amount += Number(item.commission_amount) || 0;
      agencyMap[agKey].count += 1;
    }

    const agencyChartData = Object.values(agencyMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const statusChartData = [
      { name: "Paid", value: paidItems.length, amount: paidAmount, color: "#047857" },
      { name: "Pending / Invoiced", value: unpaidItems.length, amount: unpaidAmount, color: "#f59e0b" },
      { name: "Waived / Replacement", value: waivedItems.length, amount: 0, color: "#94a3b8" },
    ].filter((s) => s.value > 0);

    return {
      totalEligible,
      unpaidCount: unpaidItems.length,
      paidCount: paidItems.length,
      unpaidAmount,
      paidAmount,
      totalAmount,
      agencyChartData,
      statusChartData,
    };
  }, [filteredCommissionItems]);

  // -------------------------------------------------------------------------
  // FILTERED DEPARTED CANDIDATES (DEPARTED & AFTER-PROCESS)
  // -------------------------------------------------------------------------
  const departedCandidates = React.useMemo(() => {
    const departedApps = applicants.filter((a) => a.applicant_state === "Departed");
    const complaintMap: Record<string, AgencyComplaint> = {};
    for (const c of complaints) {
      if (c.applicant) complaintMap[c.applicant] = c;
      if (c.passport_number) complaintMap[c.passport_number] = c;
    }

    return departedApps.map((a) => {
      const complaint = complaintMap[a.name] || (a.passport_number ? complaintMap[a.passport_number] : undefined);
      const isReturned = Boolean(
        complaint &&
        (complaint.status === "Returned / Free Replacement Required" ||
         complaint.outcome?.toLowerCase().includes("return") ||
         complaint.return_date)
      );
      const isDisputed = Boolean(
        complaint &&
        complaint.status !== "Resolved" &&
        complaint.status !== "Closed" &&
        complaint.status !== "Dismissed / Closed" &&
        !isReturned
      );
      const isResolved = Boolean(
        complaint &&
        (complaint.status === "Resolved" || complaint.status === "Closed")
      );

      let outcomeStatus = "Active Deployment (No Disputes)";
      if (isReturned) outcomeStatus = "Returned / Replacement Issued";
      else if (isDisputed) outcomeStatus = "Open Warranty Dispute";
      else if (isResolved) outcomeStatus = "Resolved Warranty Case";

      return {
        applicant_id: a.name,
        full_name: a.full_name || `${a.first_name || ""} ${a.middle_name || ""} ${a.last_name || ""}`.trim() || a.name,
        passport_number: a.passport_number || "—",
        destination_country: a.destination_country || "Saudi Arabia",
        contractor: a.locked_contractor || "Direct Employer",
        departure_date: (a as any).departure_date || a.modified?.split(" ")[0] || a.creation?.split(" ")[0] || "—",
        outcome_status: outcomeStatus,
        is_returned: isReturned,
        is_disputed: isDisputed,
        complaint_id: complaint?.name,
        complaint_category: complaint?.complaint_category || "None",
        severity: complaint?.severity,
        complaint_details: complaint?.complaint_details || "",
        return_date: complaint?.return_date || "—",
        replacement_applicant: complaint?.replacement_applicant || "—",
        religion: a.religion || "",
        place_of_birth: a.place_of_birth || (a as any).leaving_town || "",
        marital_status: a.marital_status || "",
        gender: a.gender || "Female",
        job_applied: a.job_applied || "Housemaid",
        creation: a.creation,
      };
    });
  }, [applicants, complaints]);

  // Filtered Departed Items
  const filteredDepartedCandidates = React.useMemo(() => {
    return departedCandidates.filter((item) => {
      if (!isWithinSelectedDateRange(item.departure_date || item.creation)) return false;

      if (depAgencyFilter !== "all" && item.contractor !== depAgencyFilter) return false;

      if (depOutcomeFilter !== "all" && item.outcome_status !== depOutcomeFilter) return false;

      if (depReasonFilter !== "all" && item.complaint_category !== depReasonFilter) return false;

      if (depCountryFilter !== "all" && item.destination_country !== depCountryFilter) return false;

      if (depReligionFilter !== "all") {
        const rel = (item.religion || "").toLowerCase().trim();
        if (rel !== depReligionFilter.toLowerCase().trim()) return false;
      }

      if (depBirthPlaceFilter !== "all") {
        const pob = item.place_of_birth.toLowerCase().trim();
        const targetPob = depBirthPlaceFilter.toLowerCase().trim();
        if (!pob.includes(targetPob) && !targetPob.includes(pob)) return false;
      }

      if (depMaritalFilter !== "all") {
        const mar = (item.marital_status || "").toLowerCase().trim();
        if (mar !== depMaritalFilter.toLowerCase().trim()) return false;
      }

      if (depGenderFilter !== "all") {
        const gen = (item.gender || "").toLowerCase().trim();
        if (gen !== depGenderFilter.toLowerCase().trim()) return false;
      }

      if (depJobFilter !== "all" && !item.job_applied.toLowerCase().includes(depJobFilter.toLowerCase())) return false;

      if (depSearch.trim()) {
        const q = depSearch.toLowerCase().trim();
        const id = item.applicant_id.toLowerCase();
        const fn = item.full_name.toLowerCase();
        const pass = item.passport_number.toLowerCase();
        const repl = (item.replacement_applicant || "").toLowerCase();
        const pob = item.place_of_birth.toLowerCase();
        if (!id.includes(q) && !fn.includes(q) && !pass.includes(q) && !repl.includes(q) && !pob.includes(q)) return false;
      }

      return true;
    });
  }, [
    departedCandidates,
    fromDate,
    toDate,
    depAgencyFilter,
    depOutcomeFilter,
    depReasonFilter,
    depCountryFilter,
    depReligionFilter,
    depBirthPlaceFilter,
    depMaritalFilter,
    depGenderFilter,
    depJobFilter,
    depSearch,
  ]);

  // Return Reasons Breakdown (Whiteboard Specific Requirement)
  const returnReasonsBreakdown = React.useMemo(() => {
    const reasonsMap: Record<string, number> = {};
    let returnedTotal = 0;

    for (const item of filteredDepartedCandidates) {
      if (item.is_returned || (item.complaint_category && item.complaint_category !== "None")) {
        const cat = item.complaint_category || "Unclassified Dispute";
        reasonsMap[cat] = (reasonsMap[cat] || 0) + 1;
        returnedTotal += 1;
      }
    }

    return Object.entries(reasonsMap).map(([category, count]) => ({
      category,
      count,
      percentage: returnedTotal > 0 ? Math.round((count / returnedTotal) * 100) : 0,
    }));
  }, [filteredDepartedCandidates]);

  // Active filter count badges
  const stageActiveFilterCount = [
    stageFilter !== "all",
    stageCountryFilter !== "all",
    stageTypeFilter !== "all",
    stageReligionFilter !== "all",
    stageBirthPlaceFilter !== "all",
    stageMaritalFilter !== "all",
    stageGenderFilter !== "all",
    stageJobFilter !== "all",
    stageMedicalFilter !== "all",
    stageExperienceFilter !== "all",
    Boolean(stageSearch.trim()),
  ].filter(Boolean).length;

  const commActiveFilterCount = [
    commAgencyFilter !== "all",
    commStatusFilter !== "all",
    commCountryFilter !== "all",
    commReligionFilter !== "all",
    commBirthPlaceFilter !== "all",
    commMaritalFilter !== "all",
    commGenderFilter !== "all",
    commJobFilter !== "all",
    Boolean(commSearch.trim()),
  ].filter(Boolean).length;

  const depActiveFilterCount = [
    depAgencyFilter !== "all",
    depOutcomeFilter !== "all",
    depReasonFilter !== "all",
    depCountryFilter !== "all",
    depReligionFilter !== "all",
    depBirthPlaceFilter !== "all",
    depMaritalFilter !== "all",
    depGenderFilter !== "all",
    depJobFilter !== "all",
    Boolean(depSearch.trim()),
  ].filter(Boolean).length;

  // Export Handlers with All Demographic Attributes
  const handleExportPDF = () => {
    const periodStr = periodPreset === "all" ? "All Time" : `${fromDate || "Start"} to ${toDate || "Present"}`;

    if (activeTab === "stage") {
      const columns: ExportColumn<Applicant>[] = [
        { header: "Applicant ID", accessor: "name" },
        { header: "Full Name", accessor: (r) => r.full_name || `${r.first_name || ""} ${r.last_name || ""}` },
        { header: "Passport #", accessor: "passport_number" },
        { header: "Destination", accessor: "destination_country" },
        { header: "Religion", accessor: "religion" },
        { header: "Place of Birth", accessor: (r) => r.place_of_birth || (r as any).leaving_town || "—" },
        { header: "Marital Status", accessor: "marital_status" },
        { header: "Gender", accessor: "gender" },
        { header: "Job Applied", accessor: "job_applied" },
        { header: "Stage", accessor: "applicant_state" },
        { header: "Medical", accessor: "medical_status" },
        { header: "Registered Date", accessor: (r) => r.creation?.split(" ")[0] || "—" },
      ];
      exportToPrintPDF(
        "Candidate Workflow Stage & Demographic Distribution Report",
        columns,
        filteredApplicants,
        [
          { label: "Total Filtered Candidates", value: filteredApplicants.length },
          { label: "Stage Filter", value: stageFilter === "all" ? "All Stages" : stageFilter },
          { label: "Religion Filter", value: stageReligionFilter === "all" ? "All Religions" : stageReligionFilter },
          { label: "Place of Birth", value: stageBirthPlaceFilter === "all" ? "All Places" : stageBirthPlaceFilter },
          { label: "Reporting Period", value: periodStr },
        ],
        `Period: ${periodStr} | Filters: Stage (${stageFilter}), Religion (${stageReligionFilter}), Place of Birth (${stageBirthPlaceFilter})`
      );
    } else if (activeTab === "commission") {
      const columns: ExportColumn<CommissionLedgerItem>[] = [
        { header: "Applicant ID", accessor: "name" },
        { header: "Full Name", accessor: "full_name" },
        { header: "Partner Agency", accessor: (r) => r.contractor_name || r.contractor },
        { header: "Destination", accessor: "destination_country" },
        { header: "Religion", accessor: (r) => applicantMap.get(r.name)?.religion || "—" },
        { header: "Place of Birth", accessor: (r) => applicantMap.get(r.name)?.place_of_birth || "—" },
        { header: "Departure Date", accessor: "departure_date" },
        { header: "Commission Rate", accessor: (r) => `${r.commission_amount} ${r.commission_currency}` },
        { header: "Payment Status", accessor: "commission_status" },
        { header: "Batch Reference", accessor: (r) => r.commission_batch_ref || "—" },
      ];
      exportToPrintPDF(
        "Agency Commission & Billing Settlement Report",
        columns,
        filteredCommissionItems,
        [
          { label: "Total Candidates", value: filteredCommTotals.totalEligible },
          { label: "Unpaid / Outstanding", value: `${filteredCommTotals.unpaidAmount.toLocaleString()} SAR` },
          { label: "Collected / Paid", value: `${filteredCommTotals.paidAmount.toLocaleString()} SAR` },
          { label: "Reporting Period", value: periodStr },
        ],
        `Period: ${periodStr} | Agency: ${commAgencyFilter} | Status: ${commStatusFilter}`
      );
    } else if (activeTab === "departed") {
      const columns: ExportColumn<any>[] = [
        { header: "Applicant ID", accessor: "applicant_id" },
        { header: "Full Name", accessor: "full_name" },
        { header: "Passport #", accessor: "passport_number" },
        { header: "Agency", accessor: "contractor" },
        { header: "Destination", accessor: "destination_country" },
        { header: "Religion", accessor: "religion" },
        { header: "Place of Birth", accessor: "place_of_birth" },
        { header: "Marital Status", accessor: "marital_status" },
        { header: "Departure Date", accessor: "departure_date" },
        { header: "Deployment Status", accessor: "outcome_status" },
        { header: "Return Reason", accessor: "complaint_category" },
        { header: "Return Date", accessor: "return_date" },
        { header: "Replacement Candidate", accessor: "replacement_applicant" },
      ];
      exportToPrintPDF(
        "Departed & Post-Deployment Warranty Outcome Report",
        columns,
        filteredDepartedCandidates,
        [
          { label: "Total Departed", value: filteredDepartedCandidates.length },
          { label: "Returned Cases", value: filteredDepartedCandidates.filter((i) => i.is_returned).length },
          { label: "Active Deployments", value: filteredDepartedCandidates.filter((i) => !i.is_returned && !i.is_disputed).length },
        ],
        `Period: ${periodStr} | Agency: ${depAgencyFilter}`
      );
    } else {
      const columns: ExportColumn<any>[] = [
        { header: "Stage Name", accessor: "stage" },
        { header: "Candidate Volume", accessor: "count" },
      ];
      exportToPrintPDF(
        "Operations & Executive Overview Summary",
        columns,
        stageDistribution,
        [
          { label: "Total Candidate Pool", value: applicants.length },
          { label: "GAMCA Medical FIT", value: applicants.filter((a) => a.medical_status === "FIT").length },
          { label: "Clearances Issued", value: applicants.filter((a) => a.applicant_state === "Processing" || a.applicant_state === "Stamped").length },
          { label: "Departed Placements", value: applicants.filter((a) => a.applicant_state === "Departed").length },
        ],
        `Executive Overview Snapshot (${periodStr})`
      );
    }
  };

  const handleExportExcel = () => {
    const periodStr = periodPreset === "all" ? "All_Time" : `${fromDate}_to_${toDate}`;

    if (activeTab === "stage") {
      const columns: ExportColumn<Applicant>[] = [
        { header: "Applicant ID", accessor: "name" },
        { header: "Full Name", accessor: (r) => r.full_name || `${r.first_name || ""} ${r.last_name || ""}` },
        { header: "Passport #", accessor: "passport_number" },
        { header: "Destination Country", accessor: "destination_country" },
        { header: "Applicant Type", accessor: "applicant_type" },
        { header: "Religion", accessor: "religion" },
        { header: "Place of Birth", accessor: (r) => r.place_of_birth || (r as any).leaving_town || "" },
        { header: "Marital Status", accessor: "marital_status" },
        { header: "Gender", accessor: "gender" },
        { header: "Job Applied", accessor: "job_applied" },
        { header: "Applicant State", accessor: "applicant_state" },
        { header: "Medical Status", accessor: "medical_status" },
        { header: "Passport Expiry", accessor: "passport_expiry" },
        { header: "Creation Date", accessor: (r) => r.creation?.split(" ")[0] || "—" },
      ];
      exportToCSV(
        `Stage_Distribution_Report_${periodStr}.csv`,
        columns,
        filteredApplicants,
        "Candidate Workflow Stage Distribution Report",
        { "Period": periodStr, "Total Records": filteredApplicants.length }
      );
    } else if (activeTab === "commission") {
      const columns: ExportColumn<CommissionLedgerItem>[] = [
        { header: "Applicant ID", accessor: "name" },
        { header: "Full Name", accessor: "full_name" },
        { header: "Passport #", accessor: "passport_number" },
        { header: "Partner Agency", accessor: (r) => r.contractor_name || r.contractor },
        { header: "Destination", accessor: "destination_country" },
        { header: "Religion", accessor: (r) => applicantMap.get(r.name)?.religion || "" },
        { header: "Place of Birth", accessor: (r) => applicantMap.get(r.name)?.place_of_birth || "" },
        { header: "Departure Date", accessor: "departure_date" },
        { header: "Flight #", accessor: (r) => r.flight_number || "" },
        { header: "Commission Amount", accessor: "commission_amount" },
        { header: "Currency", accessor: "commission_currency" },
        { header: "Commission Status", accessor: "commission_status" },
        { header: "Paid Date", accessor: "commission_paid_date" },
        { header: "Batch Reference", accessor: "commission_batch_ref" },
      ];
      exportToCSV(
        `Commission_Report_${periodStr}.csv`,
        columns,
        filteredCommissionItems,
        "Agency Commission & Billing Settlement Report",
        {
          "Period": periodStr,
          "Total Unpaid SAR": filteredCommTotals.unpaidAmount,
          "Total Paid SAR": filteredCommTotals.paidAmount,
        }
      );
    } else if (activeTab === "departed") {
      const columns: ExportColumn<any>[] = [
        { header: "Applicant ID", accessor: "applicant_id" },
        { header: "Full Name", accessor: "full_name" },
        { header: "Passport #", accessor: "passport_number" },
        { header: "Agency", accessor: "contractor" },
        { header: "Destination", accessor: "destination_country" },
        { header: "Religion", accessor: "religion" },
        { header: "Place of Birth", accessor: "place_of_birth" },
        { header: "Marital Status", accessor: "marital_status" },
        { header: "Departure Date", accessor: "departure_date" },
        { header: "Deployment Status", accessor: "outcome_status" },
        { header: "Return / Dispute Reason", accessor: "complaint_category" },
        { header: "Return Date", accessor: "return_date" },
        { header: "Replacement Candidate", accessor: "replacement_applicant" },
      ];
      exportToCSV(
        `Departed_After_Process_Report_${periodStr}.csv`,
        columns,
        filteredDepartedCandidates,
        "Departed & Post-Deployment Warranty Outcome Report",
        { "Period": periodStr, "Total Departed": filteredDepartedCandidates.length }
      );
    } else {
      const columns: ExportColumn<any>[] = [
        { header: "Workflow Stage", accessor: "stage" },
        { header: "Candidate Volume", accessor: "count" },
      ];
      exportToCSV(
        `Operations_Overview_${periodStr}.csv`,
        columns,
        stageDistribution,
        "Operations & Executive Overview Summary",
        { "Period": periodStr, "Total Pool": applicants.length }
      );
    }
  };

  // RBAC Access Guard
  if (!isUserLoading && !isAuthorized) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-300">Access Restricted</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 max-w-md">
            The Reports Workspace is restricted to authorized internal staff and administrators.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // User Role Resolution & Dedicated Workspace Views
  const userRoles = (currentUser?.roles || []).map((r: any) =>
    (typeof r === "string" ? r : r.role || "").toLowerCase().trim()
  );
  const emailOrName = (currentUser?.email || currentUser?.full_name || "").toLowerCase().trim();
  const isAdmin =
    emailOrName === "administrator" ||
    emailOrName.startsWith("admin") ||
    userRoles.some((r: string) => r === "system manager" || r === "administrator" || r === "agency admin");

  const isLmisOnly = !isAdmin && userRoles.some((r: string) => r.includes("lms") || r.includes("lmis") || r.includes("clearance"));
  const isInjazOnly = !isAdmin && !isLmisOnly && userRoles.some((r: string) => r.includes("injaz") || r.includes("teshir") || r.includes("te'shir"));
  const isEmbassyOnly = !isAdmin && !isLmisOnly && !isInjazOnly && userRoles.some((r: string) => r.includes("embassy") || r.includes("wakala"));
  const isDepartureOnly = !isAdmin && !isLmisOnly && !isInjazOnly && !isEmbassyOnly && userRoles.some((r: string) => r.includes("ticket") || r.includes("departure"));

  // Specialized Single-Role Views
  if (isLmisOnly) {
    return (
      <div className="space-y-6 pb-20">
        <LMISReportView />
      </div>
    );
  }

  if (isInjazOnly) {
    return (
      <div className="space-y-6 pb-20">
        <InjazReportView />
      </div>
    );
  }

  if (isEmbassyOnly) {
    return (
      <div className="space-y-6 pb-20">
        <EmbassyReportView />
      </div>
    );
  }

  if (isDepartureOnly) {
    return (
      <div className="space-y-6 pb-20">
        <DepartureReportView />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Toolbar & Period Selection */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reports & Operations Intelligence
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Authoritative Frappe backend reporting, workflow stage tracking, demographic filters, commission settlements, and post-departure analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Period Filter & Global Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Presets */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/80 dark:bg-[#16161b] p-1">
            <button
              type="button"
              onClick={() => setPeriodPreset("today")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                periodPreset === "today"
                  ? "bg-white dark:bg-[#22222a] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                periodPreset === "week"
                  ? "bg-white dark:bg-[#22222a] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("month")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                periodPreset === "month"
                  ? "bg-white dark:bg-[#22222a] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                periodPreset === "all"
                  ? "bg-white dark:bg-[#22222a] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("custom")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                periodPreset === "custom"
                  ? "bg-white dark:bg-[#22222a] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Pickers */}
          {periodPreset === "custom" && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs w-32"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-xs w-32"
              />
            </div>
          )}

          {/* Refresh Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="h-8 text-xs gap-1.5"
            title="Refresh all live backend metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Export Actions */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-[#2a2a32]"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-300" />
            <span>Export PDF</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#222227] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>A. Reports Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stage")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "stage"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>B. Stage Report</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
            {applicants.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("commission")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "commission"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300/70 dark:border-emerald-800/60"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>C. Commission Report ★</span>
          <span className="rounded-full bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
            Priority
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("departed")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "departed"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <Plane className="h-4 w-4" />
          <span>D. Departed & Warranty</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
            {departedCandidates.length}
          </Badge>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-[#282830] mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveTab("lmis")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "lmis"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>LMIS Clearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("injaz")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "injaz"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Te'shir / Injaz</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("embassy")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "embassy"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Embassy / Wakala</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("departure")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "departure"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181f]"
          }`}
        >
          <Plane className="h-4 w-4" />
          <span>Ticket & Departure</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
          <span className="mt-3 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Fetching authoritative backend reporting records...
          </span>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB A: REPORTS OVERVIEW */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top High-Level Operational KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Candidate Pool Intake
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {operations?.intake?.new_applicants ?? applicants.length}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  {operations?.intake?.standard ?? applicants.filter((a) => a.applicant_type !== "Muayena").length} Standard • {operations?.intake?.muayena ?? applicants.filter((a) => a.applicant_type === "Muayena").length} Muayena
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  GAMCA Medical Fitness
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                  <HeartPulse className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {operations?.medical?.fit ?? applicants.filter((a) => a.medical_status === "FIT").length} Fit / {operations?.medical?.unfit ?? applicants.filter((a) => a.medical_status === "UNFIT").length} Unfit
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Passed mandatory biometric medical screening
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Clearances & LMIS
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  <Plane className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {operations?.clearances?.lms_issued ?? applicants.filter((a) => a.applicant_state === "Processing").length} Approved
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 font-medium">
                  {operations?.clearances?.stamped ?? applicants.filter((a) => a.applicant_state === "Stamped").length} Stamped • {operations?.clearances?.tickets_booked ?? applicants.filter((a) => a.applicant_state === "Ticketed").length} Ticketed
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Disputes & 90d Warranty
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {operations?.complaints?.open_backlog ?? complaints.filter((c) => c.status !== "Resolved" && c.status !== "Closed").length} Open
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  {operations?.complaints?.resolved ?? complaints.filter((c) => c.status === "Resolved" || c.status === "Closed").length} Resolved under warranty
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section: Operational Pipeline & Financial Ledgers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bilateral Deployment Corridors */}
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  Bilateral Deployment Corridors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Kingdom of Saudi Arabia (KSA)</span>
                    <p className="text-[11px] text-slate-400">Musaned power of attorney & Injaz mandatory</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-400">
                    {applicants.filter((a) => (a.destination_country || "").toLowerCase().includes("saudi")).length} Candidates
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">State of Kuwait & Other GCC</span>
                    <p className="text-[11px] text-slate-400">Direct embassy clearance pipeline</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-400">
                    {applicants.filter((a) => !(a.destination_country || "").toLowerCase().includes("saudi")).length} Candidates
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Completed Placements (Departed)</span>
                    <p className="text-[11px] text-slate-400">Full lifecycle arrival confirmation</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {applicants.filter((a) => a.applicant_state === "Departed").length} Departed
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Ledger Summary */}
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  Financial & Accounting Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Total Income</span>
                    <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5">
                      ${accounting?.total_income ? accounting.total_income.toLocaleString() : "0"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                    <span className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold">Total Expenses</span>
                    <p className="text-base font-bold text-rose-900 dark:text-rose-200 font-mono mt-0.5">
                      ${accounting?.total_expense ? accounting.total_expense.toLocaleString() : "0"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                    <span className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold">Net Profit</span>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-200 font-mono mt-0.5">
                      ${accounting?.net_balance ? accounting.net_balance.toLocaleString() : "0"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs space-y-1">
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Applicant Registration Fees:</span>
                    <span className="font-mono font-bold">
                      ${(accounting?.by_stage?.find((s: any) => s.stage === "Applicant Registration")?.income || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Wakala Authorizations:</span>
                    <span className="font-mono font-bold">
                      ${(accounting?.by_stage?.find((s: any) => s.stage === "Wakala")?.income || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Visa Stamping & DSR:</span>
                    <span className="font-mono font-bold">
                      ${(accounting?.by_stage?.find((s: any) => s.stage === "DSR Stamp")?.income || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB B: STAGE REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "stage" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stage KPI Cards & Quick Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {stageDistribution.map((s) => {
              const isSelected = stageFilter === s.stage;
              return (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => setStageFilter(isSelected ? "all" : s.stage)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    isSelected
                      ? "border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-700 ring-2 ring-emerald-700/40"
                      : "border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] hover:border-slate-300"
                  }`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 line-clamp-1">
                    {s.stage}
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {s.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lifecycle Distribution Chart */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Candidate Lifecycle Stage Distribution</span>
                <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                  {filteredApplicants.length} Total Candidates Active in Selected Filters
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="stage"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        borderColor: "#27272a",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Filter Toolbar for Detail Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardContent className="p-4 space-y-4">
              {/* Row 1: Primary Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Search Candidate
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Name, Passport #, POB, ID..."
                      value={stageSearch}
                      onChange={(e) => setStageSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                {/* Stage Select */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Workflow Stage
                  </Label>
                  <Select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Lifecycle Stages</option>
                    {STAGE_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Destination Country */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Destination
                  </Label>
                  <Select
                    value={stageCountryFilter}
                    onChange={(e) => setStageCountryFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Destinations</option>
                    {dynamicFilterOptions.countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Religion Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Religion
                  </Label>
                  <Select
                    value={stageReligionFilter}
                    onChange={(e) => setStageReligionFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Religions</option>
                    {dynamicFilterOptions.religions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Advanced Filters Toggle & Reset */}
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStageAdvanced(!showStageAdvanced)}
                    className={`h-8 flex-1 text-xs gap-1.5 font-semibold ${
                      showStageAdvanced || stageActiveFilterCount > 0
                        ? "border-emerald-600 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>{showStageAdvanced ? "Hide More" : "More Filters"}</span>
                    {stageActiveFilterCount > 0 && (
                      <span className="rounded-full bg-emerald-700 text-white text-[9px] px-1.5 py-0.2 font-mono font-bold">
                        {stageActiveFilterCount}
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStageFilter("all");
                      setStageCountryFilter("all");
                      setStageTypeFilter("all");
                      setStageReligionFilter("all");
                      setStageBirthPlaceFilter("all");
                      setStageMaritalFilter("all");
                      setStageGenderFilter("all");
                      setStageJobFilter("all");
                      setStageMedicalFilter("all");
                      setStageExperienceFilter("all");
                      setStageSearch("");
                    }}
                    className="h-8 text-xs text-slate-500 hover:text-slate-900"
                    title="Reset all filters"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Row 2: Advanced Demographic Filters (Place of Birth, Marital, Gender, Job, Medical, Experience) */}
              {showStageAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-[#222227] animate-in fade-in duration-150">
                  {/* Place of Birth */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-700" />
                      Place of Birth
                    </Label>
                    <Select
                      value={stageBirthPlaceFilter}
                      onChange={(e) => setStageBirthPlaceFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Places of Birth</option>
                      {dynamicFilterOptions.birthPlaces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Marital Status */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-600" />
                      Marital Status
                    </Label>
                    <Select
                      value={stageMaritalFilter}
                      onChange={(e) => setStageMaritalFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Marital Statuses</option>
                      {dynamicFilterOptions.maritalStatuses.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Gender
                    </Label>
                    <Select
                      value={stageGenderFilter}
                      onChange={(e) => setStageGenderFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Genders</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </Select>
                  </div>

                  {/* Job Applied */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-blue-600" />
                      Job Applied
                    </Label>
                    <Select
                      value={stageJobFilter}
                      onChange={(e) => setStageJobFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Positions</option>
                      {dynamicFilterOptions.jobs.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Medical Fitness */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <HeartPulse className="h-3 w-3 text-rose-500" />
                      Medical Status
                    </Label>
                    <Select
                      value={stageMedicalFilter}
                      onChange={(e) => setStageMedicalFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Medical Statuses</option>
                      <option value="FIT">✓ GAMCA FIT</option>
                      <option value="UNFIT">✕ GAMCA UNFIT</option>
                      <option value="Pending">Pending Check</option>
                    </Select>
                  </div>

                  {/* Experience Status */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-amber-600" />
                      Experience
                    </Label>
                    <Select
                      value={stageExperienceFilter}
                      onChange={(e) => setStageExperienceFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Experience Levels</option>
                      <option value="first_time">First Time (No Prior Experience)</option>
                      <option value="experienced">Ex-Abroad / Experienced</option>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Stage Results Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Detailed Candidate Stage Records ({filteredApplicants.length})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#16161b] text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-[#222227] sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Applicant ID</th>
                    <th className="px-4 py-2.5">Full Name</th>
                    <th className="px-4 py-2.5">Passport #</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Religion</th>
                    <th className="px-4 py-2.5">Place of Birth</th>
                    <th className="px-4 py-2.5">Marital Status</th>
                    <th className="px-4 py-2.5">Job Applied</th>
                    <th className="px-4 py-2.5">Stage</th>
                    <th className="px-4 py-2.5">Medical</th>
                    <th className="px-4 py-2.5">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
                  {filteredApplicants.length > 0 ? (
                    filteredApplicants.map((a) => (
                      <tr key={a.name} className="hover:bg-slate-50/60 dark:hover:bg-[#16161c] transition">
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                          <Link href={`/applicants/${encodeURIComponent(a.name)}`} className="hover:underline">
                            {a.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                          {a.full_name || `${a.first_name || ""} ${a.middle_name || ""} ${a.last_name || ""}`}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-zinc-300">
                          {a.passport_number || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">
                          {a.destination_country || "Saudi Arabia"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                          {a.religion || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                          {a.place_of_birth || (a as any).leaving_town || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-zinc-400">
                          {a.marital_status || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">
                          {a.job_applied || "Housemaid"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: STAGE_COLORS[a.applicant_state || "Draft"] || "#64748b" }}
                          >
                            {a.applicant_state || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {a.medical_status === "FIT" ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ FIT</span>
                          ) : a.medical_status === "UNFIT" ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">✕ UNFIT</span>
                          ) : (
                            <span className="text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-500 font-mono">
                          {a.creation ? a.creation.split(" ")[0] : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No candidate records found matching the active stage filters and demographic criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB C: COMMISSION REPORT (HIGHEST PRIORITY ★) */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "commission" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Commission Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  Total Departed Placements
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                  <Plane className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 font-mono">
                  {filteredCommTotals.totalEligible} Candidates
                </div>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-400 mt-1">
                  Commission-eligible overseas placements
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Outstanding / Unpaid Commission
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-950 dark:text-amber-200 font-mono">
                  {filteredCommTotals.unpaidAmount.toLocaleString()} SAR
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-400 mt-1">
                  {filteredCommTotals.unpaidCount} candidates pending agency settlement
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Collected / Paid Commission
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#202028] text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {filteredCommTotals.paidAmount.toLocaleString()} SAR
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {filteredCommTotals.paidCount} settlements deposited into bank ledger
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Partner Agencies with Billings
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#202028] text-slate-800 dark:text-slate-200">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {filteredCommTotals.agencyChartData.length} Agencies
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Foreign partner recruitment agencies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Analytics: Commission By Agency & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Commission Billing Volume by Partner Agency (SAR)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {filteredCommTotals.agencyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredCommTotals.agencyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <XAxis
                          dataKey="agency"
                          angle={-20}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString()} SAR`, "Commission"]}
                          contentStyle={{
                            backgroundColor: "#18181b",
                            borderColor: "#27272a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="amount" fill="#047857" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No agency commission billing data in the selected period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Settlement Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-44 w-full">
                  {filteredCommTotals.statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredCommTotals.statusChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={35}
                          paddingAngle={3}
                        >
                          {filteredCommTotals.statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181b",
                            borderColor: "#27272a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No settlement records.
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-[#222227] pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" /> Paid / Collected:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {filteredCommTotals.paidAmount.toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending Settlement:
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      {filteredCommTotals.unpaidAmount.toLocaleString()} SAR
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar for Commission Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Search Record
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Candidate, Passport, POB, Batch..."
                      value={commSearch}
                      onChange={(e) => setCommSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                {/* Partner Agency */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Partner Agency
                  </Label>
                  <Select
                    value={commAgencyFilter}
                    onChange={(e) => setCommAgencyFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Partner Agencies</option>
                    {contractors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.company_name || c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Payment Status */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Payment Status
                  </Label>
                  <Select
                    value={commStatusFilter}
                    onChange={(e) => setCommStatusFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Paid">Paid</option>
                    <option value="Waived">Waived / Replacement</option>
                  </Select>
                </div>

                {/* Destination Country */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Destination
                  </Label>
                  <Select
                    value={commCountryFilter}
                    onChange={(e) => setCommCountryFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Destinations</option>
                    {dynamicFilterOptions.countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* More Filters Toggle */}
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommAdvanced(!showCommAdvanced)}
                    className={`h-8 flex-1 text-xs gap-1.5 font-semibold ${
                      showCommAdvanced || commActiveFilterCount > 0
                        ? "border-emerald-600 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>{showCommAdvanced ? "Hide More" : "More Filters"}</span>
                    {commActiveFilterCount > 0 && (
                      <span className="rounded-full bg-emerald-700 text-white text-[9px] px-1.5 py-0.2 font-mono font-bold">
                        {commActiveFilterCount}
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCommAgencyFilter("all");
                      setCommStatusFilter("all");
                      setCommCountryFilter("all");
                      setCommReligionFilter("all");
                      setCommBirthPlaceFilter("all");
                      setCommMaritalFilter("all");
                      setCommGenderFilter("all");
                      setCommJobFilter("all");
                      setCommSearch("");
                    }}
                    className="h-8 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Advanced Demographic Filters for Commission */}
              {showCommAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-[#222227] animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Religion
                    </Label>
                    <Select
                      value={commReligionFilter}
                      onChange={(e) => setCommReligionFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Religions</option>
                      {dynamicFilterOptions.religions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-700" />
                      Place of Birth
                    </Label>
                    <Select
                      value={commBirthPlaceFilter}
                      onChange={(e) => setCommBirthPlaceFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Places of Birth</option>
                      {dynamicFilterOptions.birthPlaces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-600" />
                      Marital Status
                    </Label>
                    <Select
                      value={commMaritalFilter}
                      onChange={(e) => setCommMaritalFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Marital Statuses</option>
                      {dynamicFilterOptions.maritalStatuses.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Gender
                    </Label>
                    <Select
                      value={commGenderFilter}
                      onChange={(e) => setCommGenderFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Genders</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-blue-600" />
                      Job Position
                    </Label>
                    <Select
                      value={commJobFilter}
                      onChange={(e) => setCommJobFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Positions</option>
                      {dynamicFilterOptions.jobs.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Commission Ledger Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Agency Commission Records & Settlements ({filteredCommissionItems.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <a
                  href="/api/method/agency_tracking.report_api.export_commissions_xlsx"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                    <Download className="h-3 w-3" />
                    <span>Download Backend Excel</span>
                  </Button>
                </a>
              </div>
            </CardHeader>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#16161b] text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-[#222227] sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Applicant</th>
                    <th className="px-4 py-2.5">Partner Agency</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Religion</th>
                    <th className="px-4 py-2.5">Place of Birth</th>
                    <th className="px-4 py-2.5">Departure Date</th>
                    <th className="px-4 py-2.5">Commission Rate</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Paid Date</th>
                    <th className="px-4 py-2.5">Batch Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
                  {filteredCommissionItems.length > 0 ? (
                    filteredCommissionItems.map((item) => {
                      const linkedApp = applicantMap.get(item.name);
                      return (
                        <tr key={item.name} className="hover:bg-slate-50/60 dark:hover:bg-[#16161c] transition">
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/applicants/${encodeURIComponent(item.name)}`}
                              className="font-mono font-bold text-emerald-800 dark:text-emerald-400 hover:underline block"
                            >
                              {item.name}
                            </Link>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.full_name}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-zinc-200">
                            {item.contractor_name || item.contractor}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">
                            {item.destination_country}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                            {linkedApp?.religion || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                            {linkedApp?.place_of_birth || (linkedApp as any)?.leaving_town || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-mono">
                            {item.departure_date || "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                            {item.commission_amount.toLocaleString()} {item.commission_currency}
                          </td>
                          <td className="px-4 py-2.5">
                            {item.commission_status === "Paid" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                ✓ Paid
                              </span>
                            ) : item.commission_status === "Invoiced" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-300">
                                Invoiced
                              </span>
                            ) : item.commission_status === "Waived" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-[#1e1e24] px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                Waived / Replacement
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-zinc-400 font-mono">
                            {item.commission_paid_date || "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-zinc-400">
                            {item.commission_batch_ref || "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No commission records match the active filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB D: DEPARTED & AFTER-PROCESS REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "departed" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Total Departed Placements
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <Plane className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {filteredDepartedCandidates.length}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  Completed airport departures
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Retained / Active Placements
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-950 dark:text-blue-200 font-mono">
                  {filteredDepartedCandidates.filter((i) => !i.is_returned && !i.is_disputed).length}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Active at employer without warranty claims
                </p>
              </CardContent>
            </Card>

            <Card className="border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                  Returned Candidates
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300">
                  <RotateCcw className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-950 dark:text-rose-200 font-mono">
                  {filteredDepartedCandidates.filter((i) => i.is_returned).length}
                </div>
                <p className="text-xs text-rose-800/80 dark:text-rose-400 mt-1">
                  Warranty replacement & repatriation cases
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Open Post-Departure Disputes
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-950 dark:text-amber-200 font-mono">
                  {filteredDepartedCandidates.filter((i) => i.is_disputed).length}
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-400 mt-1">
                  Active foreign agency complaint tickets
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Return Reasons Breakdown Card (Whiteboard Explicit Requirement) */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Return & Warranty Reasons Breakdown</span>
                <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                  Authoritative breakdown from Agency Complaints records
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {returnReasonsBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {returnReasonsBreakdown.map((r) => (
                    <div
                      key={r.category}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#18181e] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.category}
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                          {r.count} Cases
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">
                        {r.percentage}% of total warranty claims
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                  No return or dispute records recorded in the selected period. All departed candidates active.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters for Departed Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Search Candidate
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Name, Passport, POB, Repl..."
                      value={depSearch}
                      onChange={(e) => setDepSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Partner Agency
                  </Label>
                  <Select
                    value={depAgencyFilter}
                    onChange={(e) => setDepAgencyFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Partner Agencies</option>
                    {contractors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.company_name || c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Deployment Outcome
                  </Label>
                  <Select
                    value={depOutcomeFilter}
                    onChange={(e) => setDepOutcomeFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="Active Deployment (No Disputes)">Active Deployment</option>
                    <option value="Returned / Replacement Issued">Returned / Replacement Issued</option>
                    <option value="Open Warranty Dispute">Open Warranty Dispute</option>
                    <option value="Resolved Warranty Case">Resolved Warranty Case</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Return Reason
                  </Label>
                  <Select
                    value={depReasonFilter}
                    onChange={(e) => setDepReasonFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="all">All Return Reasons</option>
                    <option value="Medical Illness">Medical Illness</option>
                    <option value="Runaway / Refusal to Work">Runaway / Refusal to Work</option>
                    <option value="Salary Dispute">Salary Dispute</option>
                    <option value="Document Issue">Document Issue</option>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDepAdvanced(!showDepAdvanced)}
                    className={`h-8 flex-1 text-xs gap-1.5 font-semibold ${
                      showDepAdvanced || depActiveFilterCount > 0
                        ? "border-emerald-600 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>{showDepAdvanced ? "Hide More" : "More Filters"}</span>
                    {depActiveFilterCount > 0 && (
                      <span className="rounded-full bg-emerald-700 text-white text-[9px] px-1.5 py-0.2 font-mono font-bold">
                        {depActiveFilterCount}
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDepAgencyFilter("all");
                      setDepOutcomeFilter("all");
                      setDepReasonFilter("all");
                      setDepCountryFilter("all");
                      setDepReligionFilter("all");
                      setDepBirthPlaceFilter("all");
                      setDepMaritalFilter("all");
                      setDepGenderFilter("all");
                      setDepJobFilter("all");
                      setDepSearch("");
                    }}
                    className="h-8 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Advanced Demographic Filters for Departed */}
              {showDepAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-[#222227] animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Destination
                    </Label>
                    <Select
                      value={depCountryFilter}
                      onChange={(e) => setDepCountryFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Destinations</option>
                      {dynamicFilterOptions.countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Religion
                    </Label>
                    <Select
                      value={depReligionFilter}
                      onChange={(e) => setDepReligionFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Religions</option>
                      {dynamicFilterOptions.religions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-700" />
                      Place of Birth
                    </Label>
                    <Select
                      value={depBirthPlaceFilter}
                      onChange={(e) => setDepBirthPlaceFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Places of Birth</option>
                      {dynamicFilterOptions.birthPlaces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-600" />
                      Marital Status
                    </Label>
                    <Select
                      value={depMaritalFilter}
                      onChange={(e) => setDepMaritalFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Marital Statuses</option>
                      {dynamicFilterOptions.maritalStatuses.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-blue-600" />
                      Job Position
                    </Label>
                    <Select
                      value={depJobFilter}
                      onChange={(e) => setDepJobFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="all">All Positions</option>
                      {dynamicFilterOptions.jobs.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Departed & After-Process Table */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Departed Candidates & Warranty Cases ({filteredDepartedCandidates.length})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#16161b] text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-[#222227] sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Applicant</th>
                    <th className="px-4 py-2.5">Passport #</th>
                    <th className="px-4 py-2.5">Agency</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Religion</th>
                    <th className="px-4 py-2.5">Place of Birth</th>
                    <th className="px-4 py-2.5">Departure Date</th>
                    <th className="px-4 py-2.5">Deployment Status</th>
                    <th className="px-4 py-2.5">Return Reason</th>
                    <th className="px-4 py-2.5">Return Date</th>
                    <th className="px-4 py-2.5">Replacement Candidate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
                  {filteredDepartedCandidates.length > 0 ? (
                    filteredDepartedCandidates.map((item) => (
                      <tr key={item.applicant_id} className="hover:bg-slate-50/60 dark:hover:bg-[#16161c] transition">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/applicants/${encodeURIComponent(item.applicant_id)}`}
                            className="font-mono font-bold text-emerald-800 dark:text-emerald-400 hover:underline block"
                          >
                            {item.applicant_id}
                          </Link>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.full_name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-zinc-300">
                          {item.passport_number}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 dark:text-zinc-200 font-medium">
                          {item.contractor}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">
                          {item.destination_country}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                          {item.religion}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-medium">
                          {item.place_of_birth}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-zinc-300">
                          {item.departure_date}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.is_returned ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              Returned / Replacement
                            </span>
                          ) : item.is_disputed ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              Dispute Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              ✓ Active Retained
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-zinc-300">
                          {item.complaint_category !== "None" ? item.complaint_category : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-zinc-400 font-mono">
                          {item.return_date}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {item.replacement_applicant !== "—" ? (
                            <Link href={`/applicants/${encodeURIComponent(item.replacement_applicant)}`} className="hover:underline">
                              {item.replacement_applicant}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No departed records match the selected demographic and outcome filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB E: LMIS CLEARANCE REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "lmis" && (
        <div className="animate-in fade-in duration-200">
          <LMISReportView />
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB F: TE'SHIR / INJAZ REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "injaz" && (
        <div className="animate-in fade-in duration-200">
          <InjazReportView />
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB G: EMBASSY / WAKALA REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "embassy" && (
        <div className="animate-in fade-in duration-200">
          <EmbassyReportView />
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB H: TICKET & DEPARTURE REPORT */}
      {/* --------------------------------------------------------------------- */}
      {!isLoading && activeTab === "departure" && (
        <div className="animate-in fade-in duration-200">
          <DepartureReportView />
        </div>
      )}
    </div>
  );
}
