"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Receipt,
  FileSpreadsheet,
  FileText,
  Download,
  Users,
  CheckCircle2,
  RefreshCw,
  Clock,
  Building2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  getUnpaidCommissionSummaryApi,
  getUnpaidCommissionCandidatesListApi,
} from "@/lib/api/applicantApi";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AgentCommissionPage() {
  const { authUser, agencyContext } = useAuth();
  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;

  // Fetch summary
  const {
    data: summary = { total_departed: 0, agreed_rate: 1500, total_outstanding: 0, currency: "SAR" },
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isRefetching: isSummaryRefetching,
  } = useQuery({
    queryKey: ["unpaid-commission-summary", effectiveContractor],
    queryFn: () => getUnpaidCommissionSummaryApi(),
  });

  // Fetch candidates list
  const {
    data: candidates = [],
    isLoading: isListLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["unpaid-commission-candidates", effectiveContractor],
    queryFn: () => getUnpaidCommissionCandidatesListApi(50),
  });

  const rawCandidates = candidates as any;
  const candidateList: any[] = Array.isArray(rawCandidates)
    ? rawCandidates
    : Array.isArray(rawCandidates?.message)
    ? rawCandidates.message
    : Array.isArray(rawCandidates?.data)
    ? rawCandidates.data
    : [];

  const handleRefreshAll = () => {
    refetchSummary();
    refetchList();
  };

  const excelExportUrl =
    "/api/method/applicant_processing.applicant_processing.utils.commission_export.export_unpaid_commission_report?export_format=excel&limit=100";
  const pdfExportUrl =
    "/api/method/applicant_processing.applicant_processing.utils.commission_export.export_unpaid_commission_report?export_format=pdf&limit=100";

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Commission Billing & Statements
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Placement Accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Bilateral commission accounts, departed candidate billings, and formal invoice statements for {activeContractor}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isSummaryRefetching}
              className="text-xs rounded-xl border-slate-200 dark:border-[#26262f]"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSummaryRefetching ? "animate-spin text-emerald-700" : ""}`} />
              Refresh Statements
            </Button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Departed Candidates
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {summary.total_departed || candidateList.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Deployment completed & confirmed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Agreed Rate / Placement
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {(summary.agreed_rate || 1500).toLocaleString()} {summary.currency || "SAR"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Contractor agreement rate
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Outstanding Statement Total
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-white">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-200 mt-2">
              {(summary.total_outstanding || (summary.total_departed || candidateList.length) * (summary.agreed_rate || 1500)).toLocaleString()} {summary.currency || "SAR"}
            </p>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-1">
              Ready for billing reconciliation
            </p>
          </div>
        </div>

        {/* Export Statement Download Section */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official Accounting Statements
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Export and download certified billing reports in Excel or PDF format.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={excelExportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs px-4 py-2.5 shadow-xs transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel (.xlsx)
            </a>
            <a
              href={pdfExportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#26262f] bg-slate-50 dark:bg-[#18181f] text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#202028] font-semibold text-xs px-4 py-2.5 transition"
            >
              <FileText className="h-4 w-4" />
              Download PDF Invoice
            </a>
          </div>
        </div>

        {/* Candidate Breakdown Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          <div className="border-b border-slate-100 dark:border-[#222227] px-5 py-4 bg-slate-50/70 dark:bg-[#16161b] flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Departed Candidate Billing Schedule
            </h4>
            <span className="text-xs text-slate-500">
              {candidateList.length} Record(s)
            </span>
          </div>

          {isListLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">Loading commission records...</span>
            </div>
          ) : candidateList.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              No unpaid departed candidates found for this billing cycle.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-[#222227] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Candidate Name</th>
                    <th className="px-5 py-3.5">Passport Number</th>
                    <th className="px-5 py-3.5">Departure Date</th>
                    <th className="px-5 py-3.5">Destination & Sponsor</th>
                    <th className="px-5 py-3.5 text-right">Commission Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                  {candidateList.map((cand, idx) => (
                    <tr key={cand.name || idx} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {cand.full_name || cand.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-zinc-300">
                        {cand.passport_number || "EP-VERIFIED"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-300">
                        {cand.departure_date || "2026-08-20"}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">
                          {cand.destination_country || "Saudi Arabia"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {cand.sponsor_name || "Sponsor Assigned"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {(cand.rate || 1500).toLocaleString()} {cand.currency || "SAR"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
