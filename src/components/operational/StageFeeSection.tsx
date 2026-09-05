"use client";

import * as React from "react";
import { DollarSign, CheckCircle2, Loader2, ShieldAlert, Plus, Trash2, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { logStageExpenseV2, logStageIncomeV2, V2SupportedCurrency } from "@/lib/api/v2";
import { toast } from "sonner";

export interface StageFeeEntry {
  id: string;
  direction: "Expense" | "Income";
  amount: string;
  currency: V2SupportedCurrency;
  notes: string;
  isLogged: boolean;
}

interface StageFeeSectionProps {
  placementId?: string;
  stageName: string;
  defaultDirection?: "Expense" | "Income";
  className?: string;
  onFeesChange?: (fees: StageFeeEntry[]) => void;
}

export function StageFeeSection({
  placementId,
  stageName,
  defaultDirection = "Expense",
  className = "",
  onFeesChange,
}: StageFeeSectionProps) {
  const [feeRequired, setFeeRequired] = React.useState(false);
  const [fees, setFees] = React.useState<StageFeeEntry[]>([
    {
      id: "fee-1",
      direction: defaultDirection,
      amount: "",
      currency: "ETB",
      notes: "",
      isLogged: false,
    },
  ]);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);
  const [isSubmittingAll, setIsSubmittingAll] = React.useState(false);

  const updateFee = (id: string, updates: Partial<StageFeeEntry>) => {
    setFees((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      onFeesChange?.(next);
      return next;
    });
  };

  const addFeeRow = () => {
    const newEntry: StageFeeEntry = {
      id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      direction: defaultDirection,
      amount: "",
      currency: "ETB",
      notes: "",
      isLogged: false,
    };
    setFees((prev) => {
      const next = [...prev, newEntry];
      onFeesChange?.(next);
      return next;
    });
  };

  const removeFeeRow = (id: string) => {
    setFees((prev) => {
      if (prev.length <= 1) {
        const resetEntry: StageFeeEntry = {
          id: `fee-${Date.now()}`,
          direction: defaultDirection,
          amount: "",
          currency: "ETB",
          notes: "",
          isLogged: false,
        };
        onFeesChange?.([resetEntry]);
        return [resetEntry];
      }
      const next = prev.filter((f) => f.id !== id);
      onFeesChange?.(next);
      return next;
    });
  };

  const handleLogSingleFee = async (entry: StageFeeEntry) => {
    const amountNum = parseFloat(entry.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid fee amount greater than 0");
      return;
    }

    const description = `[${stageName}] ${entry.notes ? entry.notes.trim() : `${entry.direction} fee for ${stageName}`}`;

    try {
      setSubmittingId(entry.id);
      if (entry.direction === "Expense") {
        await logStageExpenseV2(amountNum, entry.currency, description, placementId, stageName);
      } else {
        await logStageIncomeV2(amountNum, entry.currency, description, placementId, stageName);
      }
      updateFee(entry.id, { isLogged: true });
      toast.success(`${entry.direction} fee of ${amountNum} ${entry.currency} submitted!`, {
        description: "Transaction submitted for Finance approval before entering the Expenses/Income log.",
      });
    } catch (err: any) {
      toast.error("Failed to submit stage fee", {
        description: err.message || "An error occurred while logging fee",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleLogAllFees = async () => {
    const unlogged = fees.filter((f) => !f.isLogged && parseFloat(f.amount) > 0);
    if (unlogged.length === 0) {
      toast.info("No unsubmitted fees with valid amounts to submit.");
      return;
    }

    try {
      setIsSubmittingAll(true);
      let successCount = 0;
      for (const entry of unlogged) {
        const amountNum = parseFloat(entry.amount);
        const description = `[${stageName}] ${entry.notes ? entry.notes.trim() : `${entry.direction} fee for ${stageName}`}`;
        if (entry.direction === "Expense") {
          await logStageExpenseV2(amountNum, entry.currency, description, placementId, stageName);
        } else {
          await logStageIncomeV2(amountNum, entry.currency, description, placementId, stageName);
        }
        updateFee(entry.id, { isLogged: true });
        successCount++;
      }
      toast.success(`Submitted ${successCount} fee entries to Finance!`);
    } catch (err: any) {
      toast.error("Error submitting fee batch", { description: err?.message });
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const unloggedCount = fees.filter((f) => !f.isLogged && parseFloat(f.amount) > 0).length;

  return (
    <div className={`space-y-3 rounded-xl border border-slate-200 dark:border-[#272730] bg-slate-50/70 dark:bg-[#141419] p-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer">
            <DollarSign className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
            Stage Fee & Expense Tracking ({stageName})
          </Label>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Log single or multiple expenses or collections incurred during this stage.
          </p>
        </div>
        <Switch checked={feeRequired} onCheckedChange={setFeeRequired} />
      </div>

      {feeRequired && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#24242e] animate-in fade-in slide-in-from-top-2 duration-200">
          {fees.map((entry, idx) => (
            <div
              key={entry.id}
              className="space-y-2 p-2.5 rounded-lg border border-slate-200/80 dark:border-[#2b2b35] bg-white dark:bg-[#18181f]"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#25252e]">
                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                  Fee Entry #{idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  {entry.isLogged ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Submitted to Finance
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      Pending Submission
                    </span>
                  )}
                  {fees.length > 1 && !entry.isLogged && (
                    <button
                      type="button"
                      onClick={() => removeFeeRow(entry.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Remove fee entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Direction
                  </Label>
                  <select
                    value={entry.direction}
                    onChange={(e) => updateFee(entry.id, { direction: e.target.value as "Expense" | "Income" })}
                    disabled={entry.isLogged}
                    className="h-8 w-full rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2 text-xs text-slate-800 dark:text-zinc-200"
                  >
                    <option value="Expense">Expense (Agency Paid)</option>
                    <option value="Income">Income (Applicant Paid)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Amount
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={entry.amount}
                    disabled={entry.isLogged}
                    onChange={(e) => updateFee(entry.id, { amount: e.target.value })}
                    className="h-8 text-xs bg-white dark:bg-[#1a1a20]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Currency
                  </Label>
                  <select
                    value={entry.currency}
                    disabled={entry.isLogged}
                    onChange={(e) => updateFee(entry.id, { currency: e.target.value as V2SupportedCurrency })}
                    className="h-8 w-full rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2 text-xs text-slate-800 dark:text-zinc-200"
                  >
                    <option value="ETB">ETB (Ethiopian Birr)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Fee Notes / Purpose
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`e.g. ${stageName} receipt or breakdown`}
                    value={entry.notes}
                    disabled={entry.isLogged}
                    onChange={(e) => updateFee(entry.id, { notes: e.target.value })}
                    className="h-8 text-xs bg-white dark:bg-[#1a1a20] flex-1"
                  />
                  {!entry.isLogged && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleLogSingleFee(entry)}
                      disabled={submittingId === entry.id || !entry.amount}
                      className="h-8 px-2.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shrink-0"
                    >
                      {submittingId === entry.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeeRow}
              className="h-7 text-xs border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Another Fee Entry
            </Button>

            {unloggedCount > 1 && (
              <Button
                type="button"
                size="sm"
                onClick={handleLogAllFees}
                disabled={isSubmittingAll}
                className="h-7 px-3 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                {isSubmittingAll ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Submitting All...
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-3 w-3" /> Submit All Pending ({unloggedCount})
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-400 pt-1">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>All stage fees are forwarded to the Finance queue for verification and approval.</span>
          </div>
        </div>
      )}
    </div>
  );
}
