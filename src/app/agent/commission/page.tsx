"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Receipt,
  Users,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import {
  getMyOwedCommissionsV2,
  V2MyOwedCommissionItem,
} from "@/lib/api/v2/portal";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/ui/LoadError";
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

  // Fetch portal owed commissions from V2 portal API (no staff-only endpoints)
  const {
    data: candidateList = [],
    isLoading: isListLoading,
    refetch: refetchList,
    isRefetching: isSummaryRefetching,
    error: commissionError,
  } = useQuery<V2MyOwedCommissionItem[]>({
    queryKey: ["agent-my-owed-commissions"],
    queryFn: () => getMyOwedCommissionsV2(),
    retry: false,
  });

  const totalOutstanding = React.useMemo(() => {
    return candidateList.reduce(
      (acc, curr) => acc + (Number(curr.amount_original) || 0),
      0
    );
  }, [candidateList]);

  const currency = candidateList[0]?.currency_original || "SAR";

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Back Link */}
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidate Directory
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Commission Billing & Statements
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Owed Commissions
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Commissions accrued and awaiting official batch invoice generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchList()}
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
                Owed Candidates
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {commissionError ? "—" : isListLoading ? "..." : candidateList.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Placements awaiting invoice inclusion
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Average Rate / Candidate
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {commissionError
                ? "—"
                : isListLoading
                ? "..."
                : candidateList.length > 0
                ? `${Math.round(totalOutstanding / candidateList.length).toLocaleString()} ${currency}`
                : "—"}
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
              {commissionError
                ? "—"
                : isListLoading
                ? "..."
                : `${totalOutstanding.toLocaleString()} ${currency}`}
            </p>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-1">
              Pending batch invoice creation
            </p>
          </div>
        </div>

        {/* Candidate Breakdown Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          <div className="border-b border-slate-100 dark:border-[#222227] px-5 py-4 bg-slate-50/70 dark:bg-[#16161b] flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Owed Commission Schedule
            </h4>
            <span className="text-xs text-slate-500">
              {commissionError ? "—" : `${candidateList.length} Record(s)`}
            </span>
          </div>

          {isListLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">Loading commission records...</span>
            </div>
          ) : commissionError ? (
            <div className="p-8">
              <LoadError
                title="Failed to load commission statements"
                error={commissionError}
                onRetry={() => refetchList()}
              />
            </div>
          ) : candidateList.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 space-y-1.5">
              <Receipt className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-600 dark:text-zinc-300">
                No owed commissions awaiting invoice.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
                Commissions accrue as candidates progress through the corridor. Uninvoiced items are listed here in your agency&apos;s billing currency.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto md:overflow-x-clip relative">
              <table className="w-full text-left text-xs min-w-[700px] md:min-w-0 border-separate border-spacing-0">
                <thead className="bg-slate-100 dark:bg-[#16161b] text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="md:sticky md:left-0 md:z-20 bg-slate-100 dark:bg-[#16161b] px-3 py-2.5 sm:px-5 sm:py-3.5 border-b border-r border-slate-300 dark:border-[#222227] md:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)]">
                      Candidate Name
                    </th>
                    <th className="px-5 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Passport Number</th>
                    <th className="px-5 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Target Job</th>
                    <th className="px-5 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Accrued On</th>
                    <th className="px-5 py-3.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Commission Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                  {candidateList.map((cand, idx) => {
                    const candidateName = cand.full_name || "—";
                    const candidatePassport = cand.passport_number || "—";
                    const candidateJob = cand.target_job || "Housemaid";
                    const accruedDate = cand.creation ? new Date(cand.creation).toLocaleDateString() : "—";
                    const amountFormatted = Number(cand.amount_original || 0).toLocaleString();
                    const currencyCode = cand.currency_original || currency;

                    return (
                      <tr key={cand.placement || idx} className="group hover:bg-slate-100/90 dark:hover:bg-[#16161c] transition">
                        <td className="md:sticky md:left-0 md:z-10 bg-white dark:bg-[#121216] group-hover:bg-slate-100 dark:group-hover:bg-[#16161c] px-3 py-2.5 sm:px-5 sm:py-3.5 border-b border-r border-slate-300 dark:border-[#222227] md:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)] font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs transition-colors truncate">
                          {candidateName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-zinc-300 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                          {candidatePassport}
                        </td>
                        <td className="px-5 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {candidateJob}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-300 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                          {accruedDate}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-800 dark:text-emerald-300 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                          {amountFormatted} {currencyCode}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
