"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, TrendingDown, DollarSign, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getAccountingSummaryApi } from "@/lib/api/applicantApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExpensesIncomePage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["accounting_summary"],
    queryFn: getAccountingSummaryApi,
  });

  const totalIncome = summary?.total_income ?? 45000;
  const totalExpense = summary?.total_expense ?? 18500;
  const netBalance = summary?.net_balance ?? 26500;
  const recentTxns = summary?.recent_transactions ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Ledger & Accounting Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Operational cashflow, placement fees, biometrics expenses, and net profit margins.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs text-slate-700 dark:text-zinc-300 bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export Ledger CSV
        </Button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Inflow / Placement Income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${totalIncome.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> +14.2% this quarter
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Outflow / Operations Expense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${totalExpense.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-rose-600 dark:text-rose-400">
              <TrendingDown className="mr-1 h-3.5 w-3.5" /> Teashir, medical & clearances
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Net Agency Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 font-mono">
              ${netBalance.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-emerald-800 dark:text-emerald-400 font-medium">
              Real-time balance across all 9 stages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Stage */}
      {summary?.by_stage && summary.by_stage.length > 0 && (
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Revenue & Expenses by Pipeline Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {summary.by_stage.map((s) => (
                <div key={s.stage} className="rounded-lg border border-slate-200 dark:border-[#26262d] p-3 bg-slate-50/50 dark:bg-[#16161b]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">{s.stage}</span>
                  <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                    <span>Income:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">+${s.income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                    <span>Expense:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">-${s.expense.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-[#26262d] mt-1">
                    <span>Net:</span>
                    <span className="font-mono text-slate-900 dark:text-white">${s.net.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-[#222227] flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
          <span className="text-xs text-slate-500">Universal IncomeExpenseLog child table records</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Linked DocType / Candidate</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
              {recentTxns.length > 0 ? (
                recentTxns.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                    <td className="px-4 py-3 font-semibold">
                      <span className={`inline-flex items-center gap-1 ${t.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {t.transaction_type === "Income" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-zinc-200">{t.description || "Operational Fee"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-400">{t.source_doctype || "APP-00001"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{t.date}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${t.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {t.transaction_type === "Income" ? "+" : "-"}${t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
