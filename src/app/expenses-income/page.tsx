"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Loader2, Plus, ArrowUpRight, ArrowDownLeft, X, CheckCircle2, DollarSign } from "lucide-react";
import { getAccountingSummaryApi, recordAccountingTransactionApi } from "@/lib/api/applicantApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function ExpensesIncomePage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    transaction_type: "Income" as "Income" | "Expense",
    amount: "",
    description: "",
    applicant: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ["accounting_summary"],
    queryFn: getAccountingSummaryApi,
  });

  const recordTxnMutation = useMutation({
    mutationFn: recordAccountingTransactionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      setIsAddModalOpen(false);
      setFormData({
        transaction_type: "Income",
        amount: "",
        description: "",
        applicant: "",
        date: new Date().toISOString().split("T")[0],
      });
      setErrorMessage(null);
      setSuccessMessage("Financial transaction recorded successfully in backend!");
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to record transaction on backend. Please verify your permissions and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!formData.amount || !formData.description) return;
    recordTxnMutation.mutate({
      transaction_type: formData.transaction_type,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description,
      applicant: formData.applicant || undefined,
      date: formData.date,
    });
  };

  const totalIncome = summary?.total_income ?? 0;
  const totalExpense = summary?.total_expense ?? 0;
  const netBalance = summary?.net_balance ?? 0;
  const recentTxns = summary?.recent_transactions ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expenses and Income
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Operational cashflow, registration fee deposits, medical lab costs, visa stamping, and flight tickets.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-sm"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Transaction
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-rose-600 shrink-0" />
          <span>Failed to load live backend accounting records: {(error as any)?.message || "Network/Server Error"}</span>
        </div>
      )}

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${totalIncome.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> Total candidate fees collected
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${totalExpense.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-rose-600 dark:text-rose-400 font-medium">
              <TrendingDown className="mr-1 h-3.5 w-3.5" /> Medical, visa and flight costs
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Net Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 font-mono">
              ${netBalance.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-emerald-800 dark:text-emerald-400 font-medium">
              Current operational balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Stage */}
      {summary?.by_stage && summary.by_stage.length > 0 && (
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Income and Expenses by Stage
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
          <span className="text-xs text-slate-500 dark:text-zinc-400">Verified transaction logs</span>
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
                <th className="px-4 py-3">Reference / Candidate</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
              {recentTxns.length > 0 ? (
                recentTxns.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                    <td className="px-4 py-3">
                      {t.type === "Income" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <ArrowUpRight className="h-3 w-3" /> Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <ArrowDownLeft className="h-3 w-3" /> Expense
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{t.description}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">{t.applicant || "General"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{t.date}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={t.type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {t.type === "Income" ? "+" : "-"}${t.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Transaction</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Add operational income or expense entry</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMessage && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/60 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                  {errorMessage}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="txn_type" className="text-xs font-semibold">
                  Transaction Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="txn_type"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as "Income" | "Expense" })}
                >
                  <option value="Income">Income (Deposit, Fee, Reimbursement)</option>
                  <option value="Expense">Expense (Medical, Visa, Ticket, Logistics)</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="txn_amount" className="text-xs font-semibold">
                    Amount ($) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="txn_amount"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g., 250"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="txn_date" className="text-xs font-semibold">
                    Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="txn_date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="txn_desc" className="text-xs font-semibold">
                  Description / Purpose <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="txn_desc"
                  required
                  placeholder="e.g., Registration Fee Deposit, Medical Lab Testing"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="txn_applicant" className="text-xs font-semibold">
                  Reference Candidate ID <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="txn_applicant"
                  placeholder="e.g., APP-00001 or General"
                  value={formData.applicant}
                  onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={recordTxnMutation.isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium"
                >
                  {recordTxnMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Transaction"
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
