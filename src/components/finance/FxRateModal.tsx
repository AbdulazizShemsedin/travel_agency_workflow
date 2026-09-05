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
  fetchFxRatesNowV2,
  V2SupportedCurrency,
  V2FetchFxRatesNowResponse,
} from "@/lib/api/v2/finance";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

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
  const [isFetchingLive, setIsFetchingLive] = React.useState(false);
  const [liveRatesResult, setLiveRatesResult] = React.useState<V2FetchFxRatesNowResponse | null>(null);

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
      setLiveRatesResult(null);
    }
  }, [isOpen, selectedCurrency, fetchCurrentRate]);

  // Action: Pull live FX rates now from server (Global mode)
  const handleFetchRatesNow = async () => {
    if (!canMutate) {
      toast.error("Permission Denied", {
        description: "Pulling live FX rates requires Finance Manager or Administrator privileges.",
      });
      return;
    }

    setIsFetchingLive(true);
    try {
      const result = await fetchFxRatesNowV2();
      setLiveRatesResult(result);

      if (result.count > 0 && result.recorded && Object.keys(result.recorded).length > 0) {
        toast.success("Live FX Rates Synchronized", {
          description: `Successfully updated ${result.count} currency exchange rates.`,
        });
        fetchCurrentRate(selectedCurrency);
        onSuccess?.();
      } else {
        toast.info("Source Temporarily Unavailable", {
          description: "Live FX source unreachable; existing cached rates stand.",
        });
      }
    } catch (err: any) {
      toast.error("Live Fetch Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsFetchingLive(false);
    }
  };

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
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Foreign Exchange Rate Management
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            View active FX conversion rates, pull real-time exchange rates, or manually record conversion multipliers against ETB (Birr).
          </DialogDescription>
        </DialogHeader>

        {!canMutate && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>View-Only Mode: Mutating FX conversion rates requires Finance Manager or Administrator role.</span>
          </div>
        )}

        {/* Live FX Sync Section */}
        {canMutate && (
          <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-600", isFetchingLive && "animate-spin")} />
                  Real-Time FX Synchronization
                </span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Fetch live market rates from the currency service now.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isFetchingLive}
                onClick={handleFetchRatesNow}
                className="text-xs h-7 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950"
              >
                {isFetchingLive ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Rates Now"
                )}
              </Button>
            </div>

            {liveRatesResult && (
              <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/30">
                {liveRatesResult.count > 0 && Object.keys(liveRatesResult.recorded).length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                      Live Rates Recorded ({liveRatesResult.count} currencies):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(liveRatesResult.recorded).map(([curr, rate]) => (
                        <Badge
                          key={curr}
                          variant="outline"
                          className="text-[10px] font-mono border-emerald-300 text-emerald-800 bg-white dark:bg-[#15151c] dark:text-emerald-300"
                        >
                          1 {curr} = {Number(rate).toFixed(2)} ETB
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Live source unreachable; existing cached rates stand.
                  </p>
                )}
              </div>
            )}
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
