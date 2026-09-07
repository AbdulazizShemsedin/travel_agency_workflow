"use client";

import * as React from "react";
import { toast } from "sonner";
import { DollarSign, Loader2, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
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

type CurrencyKey = Exclude<V2SupportedCurrency, "ETB">;

const SUPPORTED_CURRENCIES: CurrencyKey[] = [
  "USD",
  "SAR",
  "KWD",
  "AED",
  "QAR",
];

const CURRENCY_CONFIG: Record<CurrencyKey, { label: string; fieldLabel: string; code: string }> = {
  USD: { label: "US Dollar", fieldLabel: "Dollar to Birr", code: "USD" },
  SAR: { label: "Saudi Riyal", fieldLabel: "Saudi Riyal to Birr", code: "SAR" },
  KWD: { label: "Kuwaiti Dinar", fieldLabel: "Kuwaiti Dinar to Birr", code: "KWD" },
  AED: { label: "UAE Dirham", fieldLabel: "UAE Dirham to Birr", code: "AED" },
  QAR: { label: "Qatari Riyal", fieldLabel: "Qatari Riyal to Birr", code: "QAR" },
};

export function FxRateModal({ isOpen, onClose, canMutate = true, onSuccess }: FxRateModalProps) {
  const [rates, setRates] = React.useState<Record<CurrencyKey, string>>({
    USD: "",
    SAR: "",
    KWD: "",
    AED: "",
    QAR: "",
  });

  const [activeRates, setActiveRates] = React.useState<Record<CurrencyKey, number | null>>({
    USD: null,
    SAR: null,
    KWD: null,
    AED: null,
    QAR: null,
  });

  const [isLoadingCurrent, setIsLoadingCurrent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingLive, setIsFetchingLive] = React.useState(false);
  const [liveRatesResult, setLiveRatesResult] = React.useState<V2FetchFxRatesNowResponse | null>(null);

  // Fetch all active rates on dialog open
  const fetchAllActiveRates = React.useCallback(async () => {
    setIsLoadingCurrent(true);
    try {
      const results = await Promise.all(
        SUPPORTED_CURRENCIES.map(async (curr) => {
          try {
            const res = await getFxRateV2(curr);
            const val =
              typeof res === "number"
                ? res
                : res && typeof (res as any).rate === "number"
                ? (res as any).rate
                : null;
            return { curr, val };
          } catch {
            return { curr, val: null };
          }
        })
      );

      const newActive: Record<CurrencyKey, number | null> = {
        USD: null,
        SAR: null,
        KWD: null,
        AED: null,
        QAR: null,
      };

      setRates((prev) => {
        const nextRates = { ...prev };
        results.forEach(({ curr, val }) => {
          newActive[curr] = val;
          if (val !== null && (!nextRates[curr] || nextRates[curr] === "")) {
            nextRates[curr] = String(val);
          }
        });
        return nextRates;
      });

      setActiveRates(newActive);
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      fetchAllActiveRates();
      setLiveRatesResult(null);
    }
  }, [isOpen, fetchAllActiveRates]);

  // Action: Pull live FX rates now from server and automatically fill fields
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
        setRates((prev) => {
          const next = { ...prev };
          Object.entries(result.recorded).forEach(([curr, rate]) => {
            const key = curr.toUpperCase() as CurrencyKey;
            if (SUPPORTED_CURRENCIES.includes(key)) {
              next[key] = String(rate);
            }
          });
          return next;
        });

        toast.success("Live FX Rates Synchronized", {
          description: `Automatically populated ${result.count} currency rate fields with live market data.`,
        });
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

  const handleRateChange = (currency: CurrencyKey, value: string) => {
    setRates((prev) => ({
      ...prev,
      [currency]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error("Permission Denied", {
        description: "Setting FX rates requires Finance Manager or Administrator privileges.",
      });
      return;
    }

    const entriesToSave: { currency: CurrencyKey; rate: number }[] = [];
    for (const curr of SUPPORTED_CURRENCIES) {
      const raw = rates[curr];
      if (raw && raw.trim() !== "") {
        const parsed = parseFloat(raw);
        if (isNaN(parsed) || parsed <= 0) {
          toast.error("Invalid Rate", {
            description: `Please enter a valid positive numeric rate for ${CURRENCY_CONFIG[curr].label}.`,
          });
          return;
        }
        entriesToSave.push({ currency: curr, rate: parsed });
      }
    }

    if (entriesToSave.length === 0) {
      toast.error("No Rates Specified", {
        description: "Please enter at least one currency exchange rate to save.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        entriesToSave.map(({ currency, rate }) => setFxRateV2(currency, rate))
      );

      toast.success("Official FX Rates Saved", {
        description: `Successfully configured ${entriesToSave.length} official exchange rate(s) against Birr (ETB).`,
      });
      await fetchAllActiveRates();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to Save FX Rates", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Foreign Exchange Rate Management
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Configure official conversion multipliers to Birr (ETB). Fetching live market rates automatically fills each field, which you can adjust and save system-wide.
          </DialogDescription>
        </DialogHeader>

        {!canMutate && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>View-Only Mode: Mutating FX conversion rates requires Finance Manager or Administrator role.</span>
          </div>
        )}

        {/* Live FX Sync Header */}
        {canMutate && (
          <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-600", isFetchingLive && "animate-spin")} />
                  Real-Time FX Synchronization
                </span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Fetch live market rates now to auto-fill all currency fields below.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isFetchingLive}
                onClick={handleFetchRatesNow}
                className="text-xs h-8 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950"
              >
                {isFetchingLive ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Fetching Rates...
                  </>
                ) : (
                  "Fetch Rates Now"
                )}
              </Button>
            </div>

            {liveRatesResult && (
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/30 text-[11px]">
                {liveRatesResult.count > 0 && Object.keys(liveRatesResult.recorded).length > 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Auto-filled {liveRatesResult.count} currency rate fields with live market exchange.</span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">
                    Live source unreachable; existing cached values preserved.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Currency Rate Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#202026]">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Currency Exchange Multipliers (1 Foreign Unit = X Birr)
              </span>
              {isLoadingCurrent && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading active rates...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {SUPPORTED_CURRENCIES.map((curr) => {
                const config = CURRENCY_CONFIG[curr];
                const active = activeRates[curr];
                return (
                  <div
                    key={curr}
                    className="p-3 rounded-lg border border-slate-200 dark:border-[#262630] bg-slate-50/50 dark:bg-[#15151c] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`rate-${curr}`} className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {config.fieldLabel}
                      </Label>
                      {active !== null ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-emerald-300 bg-white dark:bg-[#101014] text-emerald-800 dark:text-emerald-300"
                        >
                          Active: {active.toFixed(2)} ETB
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unset</span>
                      )}
                    </div>

                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id={`rate-${curr}`}
                        type="number"
                        step="any"
                        min="0"
                        disabled={!canMutate}
                        value={rates[curr]}
                        onChange={(e) => handleRateChange(curr, e.target.value)}
                        placeholder="Birr amount for 1 unit"
                        className="pl-8 text-xs font-mono h-8 bg-white dark:bg-[#1a1a22]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Amount in Birr for 1 {config.code} ({config.label})
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100 dark:border-[#202026]">
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
              disabled={!canMutate || isSubmitting}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving Official Rates...
                </>
              ) : (
                "Save Official FX Rates"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
