"use client";

import * as React from "react";
import { DollarSign, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { logStageExpenseV2, logStageIncomeV2, V2SupportedCurrency } from "@/lib/api/v2";
import { toast } from "sonner";

interface StageFeeSectionProps {
  placementId?: string;
  stageName: string;
  defaultDirection?: "Expense" | "Income";
  className?: string;
}

export function StageFeeSection({
  placementId,
  stageName,
  defaultDirection = "Expense",
  className = "",
}: StageFeeSectionProps) {
  const [feeRequired, setFeeRequired] = React.useState(false);
  const [feeDirection, setFeeDirection] = React.useState<"Expense" | "Income">(defaultDirection);
  const [feeAmount, setFeeAmount] = React.useState<string>("");
  const [feeCurrency, setFeeCurrency] = React.useState<V2SupportedCurrency>("ETB");
  const [feeNotes, setFeeNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLogged, setIsLogged] = React.useState(false);

  const handleLogFee = async () => {
    const amountNum = parseFloat(feeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid fee amount greater than 0");
      return;
    }

    const description = `[${stageName}] ${feeNotes ? feeNotes.trim() : `${feeDirection} fee for ${stageName}`}`;

    try {
      setIsSubmitting(true);
      if (feeDirection === "Expense") {
        await logStageExpenseV2(amountNum, feeCurrency, description, placementId, stageName);
      } else {
        await logStageIncomeV2(amountNum, feeCurrency, description, placementId, stageName);
      }
      setIsLogged(true);
      toast.success(`${feeDirection} fee of ${amountNum} ${feeCurrency} submitted!`, {
        description: "Transaction submitted for Finance approval before entering the Expenses/Income log.",
      });
    } catch (err: any) {
      toast.error("Failed to submit stage fee", {
        description: err.message || "An error occurred while logging fee",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-3 rounded-xl border border-slate-200 dark:border-[#272730] bg-slate-50/70 dark:bg-[#141419] p-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer">
            <DollarSign className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
            Fee Required Toggle ({stageName})
          </Label>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Enable if this task or stage incurs an agency expense or client collection.
          </p>
        </div>
        <Switch checked={feeRequired} onCheckedChange={setFeeRequired} />
      </div>

      {feeRequired && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#24242e] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Direction
              </Label>
              <select
                value={feeDirection}
                onChange={(e) => setFeeDirection(e.target.value as "Expense" | "Income")}
                disabled={isLogged}
                className="h-8 w-full rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2.5 text-xs text-slate-800 dark:text-zinc-200"
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
                value={feeAmount}
                disabled={isLogged}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-[#1a1a20]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Currency
              </Label>
              <select
                value={feeCurrency}
                disabled={isLogged}
                onChange={(e) => setFeeCurrency(e.target.value as V2SupportedCurrency)}
                className="h-8 w-full rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2.5 text-xs text-slate-800 dark:text-zinc-200"
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
            <Input
              placeholder={`e.g., ${stageName} fee receipt or reference number`}
              value={feeNotes}
              disabled={isLogged}
              onChange={(e) => setFeeNotes(e.target.value)}
              className="h-8 text-xs bg-white dark:bg-[#1a1a20]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Pending Finance approval before entering ledger.</span>
            </div>

            {isLogged ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Submitted to Finance
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleLogFee}
                disabled={isSubmitting || !feeAmount}
                className="h-8 px-3 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Fee to Finance"
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
