"use client";

import * as React from "react";
import { toast } from "sonner";
import { DollarSign, Loader2, RefreshCw, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getFxRateV2,
  setFxRateV2,
  V2SupportedCurrency,
} from "@/lib/api/v2/finance";
import { Badge } from "@/components/ui/badge";

interface FxRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  canMutate?: boolean;
  onSuccess?: () => void;
}

const SUPPORTED_CURRENCIES: Exclude<V2SupportedCurrency, "ETB">[] = [
  "SAR",
  "USD",
  "AED",
  "KWD",
  "QAR",
];

const CURRENCY_LABELS: Record<Exclude<V2SupportedCurrency, "ETB">, string> = {
  SAR: "Saudi Riyal (SAR)",
  USD: "US Dollar (USD)",
  AED: "UAE Dirham (AED)",
  KWD: "Kuwaiti Dinar (KWD)",
  QAR: "Qatari Riyal (QAR)",
};

export function FxRateModal({ isOpen, onClose, canMutate = true, onSuccess }: FxRateModalProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState<Exclude<V2SupportedCurrency, "ETB">>("SAR");
  const [rateToBirr, setRateToBirr] = React.useState<string>("");
  const [currentActiveRate, setCurrentActiveRate] = React.useState<number | null>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch active rate when selected currency changes
  const fetchCurrentRate = React.useCallback(async (curr: Exclude<V2SupportedCurrency, "ETB">) => {
    setIsLoadingCurrent(true);
    try {
      const res = await getFxRateV2(curr);
      if (typeof res === "number") {
        setCurrentActiveRate(res);
      } else if (res && typeof (res as any).rate === "number") {
        setCurrentActiveRate((res as any).rate);
      } else {
        setCurrentActiveRate(null);
      }
    } catch {
      setCurrentActiveRate(null);
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      fetchCurrentRate(selectedCurrency);
    }
  }, [isOpen, selectedCurrency, fetchCurrentRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error("Permission Denied", { description: "Setting FX rates requires Finance Manager or Administrator privileges." });
      return;
    }

    const parsedRate = parseFloat(rateToBirr);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      toast.error("Invalid Rate", { description: "Please enter a positive numeric exchange rate." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setFxRateV2(selectedCurrency, parsedRate);
      toast.success("FX Rate Updated", {
        description: res?.message || `1 ${selectedCurrency} rate set to ${parsedRate} ETB.`,
      });
      setRateToBirr("");
      fetchCurrentRate(selectedCurrency);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to Update Rate", {
        description: err?.message || "Backend rejected FX rate mutation.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Foreign Exchange Rate Management
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            View active backend FX conversion rates or manually record new conversion multipliers against ETB (Birr).
          </DialogDescription>
        </DialogHeader>

        {!canMutate && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>View-Only Mode: Mutating FX conversion rates requires Finance Manager or Administrator role.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Currency</Label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Exclude<V2SupportedCurrency, "ETB">)}
              className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {CURRENCY_LABELS[curr]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#171720] p-3 text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">Current Active Rate:</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
              {isLoadingCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              ) : currentActiveRate !== null ? (
                <>
                  1 {selectedCurrency} = {currentActiveRate.toFixed(2)} ETB
                  <Badge variant="outline" className="text-[10px] ml-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                    Live
                  </Badge>
                </>
              ) : (
                <span className="text-slate-400 font-normal">Not configured</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              New Exchange Rate (1 {selectedCurrency} = X Birr) *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={!canMutate}
                value={rateToBirr}
                onChange={(e) => setRateToBirr(e.target.value)}
                placeholder={canMutate ? "e.g. 33.50" : "Permission required to edit rate"}
                className="pl-9 text-xs font-mono h-9"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Applies to future commission conversions and foreign currency income settlements.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canMutate || isSubmitting || !rateToBirr.trim()}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Recording Rate...
                </>
              ) : (
                "Save FX Rate"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
