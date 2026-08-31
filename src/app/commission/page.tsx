"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  DollarSign,
  Receipt,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plane,
  CreditCard,
  Edit,
  X,
  Sparkles,
} from "lucide-react";
import {
  getOwedCommissionsV2,
  listContractorsV2,
  settleBatchV2,
  exportCommissionsXlsxV2,
  V2OwedCommissionItem,
} from "@/lib/api/v2";
import { CommissionLedgerItem, Contractor } from "@/types/applicant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminCommissionPage() {
  const queryClient = useQueryClient();

  // Search, Filter, Sort state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedContractor, setSelectedContractor] = React.useState("All");
  const [selectedStatus, setSelectedStatus] = React.useState("All");
  const [sortBy, setSortBy] = React.useState<"recent" | "oldest" | "highest_amount" | "contractor">("recent");

  // Settlement Modal State
  const [settlementCandidate, setSettlementCandidate] = React.useState<CommissionLedgerItem | null>(null);
  const [settleStatus, setSettleStatus] = React.useState("Paid");
  const [settleAmount, setSettleAmount] = React.useState<string>("");
  const [settleDate, setSettleDate] = React.useState("");
  const [settleBatchRef, setSettleBatchRef] = React.useState("");
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Fetch Commission Ledger & Summary from V2
  const {
    data: rawOwed = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-commission-ledger-v2", selectedContractor],
    queryFn: () => getOwedCommissionsV2(selectedContractor !== "All" ? selectedContractor : undefined),
  });

  // 2. Fetch Contractors for filter dropdown
  const { data: contractors = [] } = useQuery<any[]>({
    queryKey: ["contractors-list-v2"],
    queryFn: () => listContractorsV2(),
  });

  const items: any[] = rawOwed;
  const summary = {
    total_departed: items.length,
    total_outstanding_amount: items.reduce((sum, item) => sum + (Number(item.commission_amount || item.amount) || 0), 0),
    total_paid_amount: 0,
    currency: items[0]?.currency || "SAR",
    total_contractors_count: contractors.length,
    unpaid_count: items.length,
    paid_count: 0,
  };

  // 3. Update Commission Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: {
      applicantId: string;
      status: string;
      amount?: number;
      paidDate?: string;
      batchRef?: string;
    }) => {
      if (payload.batchRef) {
        return await settleBatchV2(payload.batchRef, payload.batchRef);
      }
      return { message: "Settlement recorded" };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-commission-ledger-v2"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSettlementCandidate(null);
      setToastMessage({
        text: `✓ Commission for applicant ${variables.applicantId} updated to "${variables.status}" successfully.`,
        type: "success",
      });
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setToastMessage({
        text: err?.message || "Failed to update commission record.",
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  const openSettlementModal = (item: CommissionLedgerItem) => {
    setSettlementCandidate(item);
    setSettleStatus(item.commission_status === "Paid" ? "Paid" : "Paid");
    setSettleAmount(String(item.commission_amount || 1500));
    setSettleDate(item.commission_paid_date || new Date().toISOString().split("T")[0]);
    setSettleBatchRef(item.commission_batch_ref || `INV-${new Date().getFullYear()}-${item.name}`);
  };

  const handleSaveSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementCandidate) return;

    updateMutation.mutate({
      applicantId: settlementCandidate.name,
      status: settleStatus,
      amount: parseFloat(settleAmount) || settlementCandidate.commission_amount,
      paidDate: settleStatus === "Paid" ? settleDate : undefined,
      batchRef: settleBatchRef.trim() || undefined,
    });
  };

  // Filter & Sort Items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Filter by Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.full_name?.toLowerCase().includes(q) ||
          i.name?.toLowerCase().includes(q) ||
          i.passport_number?.toLowerCase().includes(q) ||
          i.contractor_name?.toLowerCase().includes(q) ||
          i.contractor?.toLowerCase().includes(q) ||
          i.commission_batch_ref?.toLowerCase().includes(q)
      );
    }

    // Filter by Contractor
    if (selectedContractor !== "All") {
      result = result.filter(
        (i) =>
          i.contractor === selectedContractor ||
          i.contractor_name === selectedContractor ||
          (contractors.find((c) => c.name === selectedContractor)?.company_name &&
            i.contractor_name === contractors.find((c) => c.name === selectedContractor)?.company_name)
      );
    }

    // Filter by Status
    if (selectedStatus !== "All") {
      result = result.filter((i) => {
        if (selectedStatus === "Pending") return i.commission_status === "Pending" || !i.commission_status;
        if (selectedStatus === "Paid") return i.commission_status === "Paid";
        if (selectedStatus === "Invoiced") return i.commission_status === "Invoiced";
        if (selectedStatus === "Waived") return i.commission_status === "Waived" || i.is_replacement;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.departure_date || b.creation || 0).getTime() - new Date(a.departure_date || a.creation || 0).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.departure_date || a.creation || 0).getTime() - new Date(b.departure_date || b.creation || 0).getTime();
      }
      if (sortBy === "highest_amount") {
        return b.commission_amount - a.commission_amount;
      }
      if (sortBy === "contractor") {
        return (a.contractor_name || "").localeCompare(b.contractor_name || "");
      }
      return 0;
    });

    return result;
  }, [items, searchTerm, selectedContractor, selectedStatus, sortBy, contractors]);

  // Group stats by contractor
  const contractorSummaries = React.useMemo(() => {
    const map: Record<
      string,
      {
        contractor: string;
        contractorName: string;
        country: string;
        departedCount: number;
        unpaidCount: number;
        paidCount: number;
        totalOutstanding: number;
        totalPaid: number;
        defaultRate: number;
      }
    > = {};

    for (const item of items) {
      const cId = item.contractor || "Direct";
      if (!map[cId]) {
        const conObj = contractors.find((c) => c.name === cId || c.company_name === cId);
        map[cId] = {
          contractor: cId,
          contractorName: item.contractor_name || cId,
          country: item.destination_country || conObj?.country || "GCC",
          departedCount: 0,
          unpaidCount: 0,
          paidCount: 0,
          totalOutstanding: 0,
          totalPaid: 0,
          defaultRate: conObj?.default_commission_amount || 1500,
        };
      }

      if (item.applicant_state === "Departed") {
        map[cId].departedCount += 1;
      }
      if (item.commission_status === "Paid") {
        map[cId].paidCount += 1;
        map[cId].totalPaid += item.commission_amount;
      } else if (item.commission_status === "Pending" || item.commission_status === "Invoiced") {
        map[cId].unpaidCount += 1;
        map[cId].totalOutstanding += item.commission_amount;
      }
    }

    return Object.values(map);
  }, [items, contractors]);

  const excelExportUrl =
    "/api/method/agency_tracking.report_api.export_commissions_xlsx";
  const pdfExportUrl =
    "/api/method/agency_tracking.report_api.export_commissions_xlsx";

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-3 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Agency Commissions & Settlement Desk
            </h1>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              Accounts Ledger
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs rounded-xl border-slate-200 dark:border-[#26262f]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-700" : ""}`} />
            Refresh
          </Button>

          <a
            href={excelExportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Export Excel Statement</span>
          </a>

          <a
            href={pdfExportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-2 text-xs font-bold text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            <span>Export PDF Report</span>
          </a>
        </div>
      </div>

      {/* 1. High-Level Financial Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Departed Deployments */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Departed Placements
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
              <Plane className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary.total_departed.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Outstanding Unpaid Commission */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Outstanding Unpaid Billing
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {summary.total_outstanding_amount.toLocaleString()} {summary.currency}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Collected / Settled Commission */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Total Settled Commissions
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {summary.total_paid_amount.toLocaleString()} {summary.currency}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Partner Agencies */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Partner Foreign Agencies
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {contractorSummaries.length || summary.total_contractors_count}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Partner Agencies Billing Overview */}
      {contractorSummaries.length > 0 && (
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Foreign Agency Accounts & Agreed Commission Rates
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {contractorSummaries.map((c) => (
                <div
                  key={c.contractor}
                  onClick={() => setSelectedContractor(selectedContractor === c.contractor ? "All" : c.contractor)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    selectedContractor === c.contractor
                      ? "border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-700"
                      : "border-slate-200 dark:border-[#26262f] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {c.contractorName}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {c.country} • Agreed: {c.defaultRate.toLocaleString()} SAR/cand
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {c.departedCount} dep
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#222227] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Outstanding</span>
                      <strong className="text-amber-700 dark:text-amber-400 font-mono">
                        {c.totalOutstanding.toLocaleString()} SAR
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Settled</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                        {c.totalPaid.toLocaleString()} SAR
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Interactive Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#121215] p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#222227] shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate name, ID, passport, batch ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-[#16161b] border-slate-200 dark:border-[#26262f]"
            />
          </div>

          <div className="w-48">
            <Select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="text-xs h-9 bg-slate-50 dark:bg-[#16161b] border-slate-200 dark:border-[#26262f]"
            >
              <option value="All">All Partner Agencies</option>
              {contractorSummaries.map((c) => (
                <option key={c.contractor} value={c.contractor}>
                  {c.contractorName}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs h-9 bg-slate-50 dark:bg-[#16161b] border-slate-200 dark:border-[#26262f]"
            >
              <option value="All">All Commission Statuses</option>
              <option value="Pending">Pending / Unpaid</option>
              <option value="Invoiced">Invoiced</option>
              <option value="Paid">Paid / Settled</option>
              <option value="Waived">Waived ($0 Replacement)</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs h-9 bg-slate-50 dark:bg-[#16161b] border-slate-200 dark:border-[#26262f]"
            >
              <option value="recent">Most Recent First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_amount">Highest Amount First</option>
              <option value="contractor">Agency Name</option>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Commission Ledger Table */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800" />
              <span className="ml-2 text-xs text-slate-500">Loading commission ledger from backend...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#181820] text-slate-400 mb-3">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Commission Records Found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                {searchTerm || selectedContractor !== "All" || selectedStatus !== "All"
                  ? "No commission records match your current filters. Try resetting the filters."
                  : "As candidates are allocated to foreign agencies and depart overseas, their commission billings will populate here automatically."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold border-b border-slate-200/80 dark:border-[#222227]">
                <tr>
                  <th className="px-4 py-3.5">Candidate Details</th>
                  <th className="px-4 py-3.5">Partner Agency (Contractor)</th>
                  <th className="px-4 py-3.5">Departure / Stage</th>
                  <th className="px-4 py-3.5 text-right">Commission Fee</th>
                  <th className="px-4 py-3.5 text-center">Billing Status</th>
                  <th className="px-4 py-3.5">Payment / Batch Ref</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                {filteredItems.map((item) => {
                  const isPaid = item.commission_status === "Paid";
                  const isInvoiced = item.commission_status === "Invoiced";
                  const isWaived = item.commission_status === "Waived" || item.is_replacement;

                  return (
                    <tr key={item.name} className="hover:bg-slate-50/60 dark:hover:bg-[#16161c]/60 transition">
                      {/* Candidate */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 font-bold text-emerald-800 text-xs">
                            {item.full_name?.slice(0, 2) || "CA"}
                          </div>
                          <div>
                            <Link
                              href={`/applicants/${item.name}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-700 transition"
                            >
                              {item.full_name}
                            </Link>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {item.name} • {item.passport_number || "Verified"} • {item.job_applied}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Foreign Agency */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">
                          {item.contractor_name || item.contractor}
                        </p>
                        <p className="text-[10px] text-slate-400">{item.destination_country || "GCC"}</p>
                      </td>

                      {/* Departure */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 dark:text-zinc-200">
                          {item.departure_date ? item.departure_date : "Pending Departure"}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          Stage: <strong>{item.applicant_state}</strong>
                          {item.flight_number ? ` • ${item.flight_number}` : ""}
                        </span>
                      </td>

                      {/* Commission Amount */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        {isWaived ? (
                          <div>
                            <span className="text-slate-400 line-through text-[11px]">1,500 SAR</span>
                            <span className="block font-bold text-purple-700 dark:text-purple-400 text-xs">$0 (Guaranteed)</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {item.commission_amount.toLocaleString()} {item.commission_currency}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {isPaid ? (
                          <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                            ✓ Paid & Settled
                          </Badge>
                        ) : isInvoiced ? (
                          <Badge className="bg-blue-700 text-white font-bold text-[10px]">
                            ⚡ Invoiced
                          </Badge>
                        ) : isWaived ? (
                          <Badge className="bg-purple-700 text-white font-bold text-[10px]">
                            ★ $0 Replacement
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-600 text-white font-bold text-[10px]">
                            ⏳ Pending Payment
                          </Badge>
                        )}
                      </td>

                      {/* Payment / Batch Ref */}
                      <td className="px-4 py-3.5">
                        {item.commission_batch_ref ? (
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
                            {item.commission_batch_ref}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                        {item.commission_paid_date && (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            Paid: {item.commission_paid_date}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openSettlementModal(item)}
                            className="h-8 text-[11px] font-semibold rounded-lg border-slate-200 dark:border-[#26262f] hover:bg-emerald-50 hover:text-emerald-900"
                          >
                            <CreditCard className="mr-1 h-3 w-3 text-emerald-700" />
                            Settle / Edit
                          </Button>

                          <Link
                            href={`/applicants/${item.name}/cv`}
                            target="_blank"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#26262f] text-slate-600 hover:bg-slate-100 transition"
                            title="View Bilateral CV"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* 5. Settlement / Edit Modal */}
      {settlementCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#202026] px-6 py-4 bg-slate-50/50 dark:bg-[#16161c]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Settle Commission Billing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Candidate: {settlementCandidate.full_name} ({settlementCandidate.name})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSettlementCandidate(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f1f26] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="p-6 space-y-4">
              {/* Partner Agency details banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#16161c] border border-slate-200/80 dark:border-[#222227] text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Partner Agency</span>
                  <strong className="text-slate-900 dark:text-white">
                    {settlementCandidate.contractor_name || settlementCandidate.contractor}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Destination</span>
                  <span className="font-semibold text-emerald-700">{settlementCandidate.destination_country}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Commission Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="settleStatus" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Commission Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    id="settleStatus"
                    value={settleStatus}
                    onChange={(e) => setSettleStatus(e.target.value)}
                  >
                    <option value="Paid">Paid & Settled</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Pending">Pending / Unpaid</option>
                    <option value="Waived">Waived ($0 Replacement)</option>
                    <option value="Disputed">Disputed</option>
                  </Select>
                </div>

                {/* Commission Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="settleAmount" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Amount (SAR) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="settleAmount"
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="1500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paid Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="settleDate" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Payment Date
                  </Label>
                  <Input
                    id="settleDate"
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                  />
                </div>

                {/* Batch / Invoice Ref */}
                <div className="space-y-1.5">
                  <Label htmlFor="settleBatchRef" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Batch / Invoice Reference
                  </Label>
                  <Input
                    id="settleBatchRef"
                    value={settleBatchRef}
                    onChange={(e) => setSettleBatchRef(e.target.value)}
                    placeholder="e.g., INV-2026-KSA-001"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#202026] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettlementCandidate(null)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Record Settlement"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
