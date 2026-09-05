"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Coins,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Info,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getCommissionRatesV2,
  setCommissionRatesV2,
  V2ContractorCommissionRate,
} from "@/lib/api/v2/contractors";

interface ContractorRateMatrixModalProps {
  contractor: string;
  contractorName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SUPPORTED_COUNTRIES = [
  "Saudi Arabia",
  "Kuwait",
  "United Arab Emirates",
  "Qatar",
  "Jordan",
  "Bahrain",
  "Oman",
];

const ENTRY_TRACKS = ["Standard", "Muayena"] as const;
const GENDERS = ["Female", "Male"] as const;
const CURRENCIES = [
  "Country Currency",
  "SAR",
  "KWD",
  "USD",
  "ETB",
  "AED",
  "QAR",
] as const;

export function ContractorRateMatrixModal({
  contractor,
  contractorName,
  isOpen,
  onClose,
  onSuccess,
}: ContractorRateMatrixModalProps) {
  const { roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];

  // Backend authorized roles: Manager, Admin, Finance Manager, Registrar, System Manager, Administrator
  const canEdit = userRoles.some((r) =>
    [
      "Administrator",
      "System Manager",
      "Admin",
      "Manager",
      "Finance Manager",
      "Registrar",
    ].includes(r)
  );

  const [rates, setRates] = React.useState<V2ContractorCommissionRate[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [presetCountry, setPresetCountry] = React.useState<string>("Saudi Arabia");
  const [activeCountryFilter, setActiveCountryFilter] = React.useState<string>("All");

  // Fetch rates when opened
  const loadRates = React.useCallback(async () => {
    if (!contractor) return;
    setIsLoading(true);
    try {
      const data = await getCommissionRatesV2(contractor);
      setRates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error("Failed to Load Commission Rates", {
        description: formatCleanErrorMessage(err),
      });
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  }, [contractor]);

  React.useEffect(() => {
    if (isOpen) {
      loadRates();
    }
  }, [isOpen, loadRates]);

  // Validation Analysis
  const duplicateKeys = React.useMemo(() => {
    const counts = new Map<string, number>();
    rates.forEach((r) => {
      const key = `${r.destination_country}::${r.entry_track}::${r.gender}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const dupes = new Set<string>();
    counts.forEach((val, key) => {
      if (val > 1) dupes.add(key);
    });
    return dupes;
  }, [rates]);

  // Check unique countries present
  const configuredCountries = React.useMemo(() => {
    const set = new Set<string>();
    rates.forEach((r) => {
      if (r.destination_country) set.add(r.destination_country);
    });
    return Array.from(set).sort();
  }, [rates]);

  const hasInvalidRows = React.useMemo(() => {
    return rates.some(
      (r) =>
        !r.destination_country?.trim() ||
        !r.entry_track?.trim() ||
        !r.gender?.trim() ||
        r.rate === undefined ||
        isNaN(Number(r.rate)) ||
        Number(r.rate) < 0
    );
  }, [rates]);

  // Row update handlers
  const handleUpdateRow = (
    index: number,
    field: keyof V2ContractorCommissionRate,
    value: any
  ) => {
    setRates((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveRow = (index: number) => {
    setRates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSingleRow = () => {
    setRates((prev) => [
      ...prev,
      {
        destination_country: presetCountry || "Saudi Arabia",
        entry_track: "Standard",
        gender: "Female",
        rate: 0,
        currency: "Country Currency",
      },
    ]);
  };

  // Preset generator: Adds the full 4 canonical combinations for a destination country
  const handleAddCountrySet = (countryToAdd: string) => {
    const existingKeys = new Set(
      rates.map((r) => `${r.destination_country}::${r.entry_track}::${r.gender}`)
    );

    const standardCombinations: Array<{
      entry_track: "Standard" | "Muayena";
      gender: "Female" | "Male";
    }> = [
      { entry_track: "Standard", gender: "Female" },
      { entry_track: "Standard", gender: "Male" },
      { entry_track: "Muayena", gender: "Female" },
      { entry_track: "Muayena", gender: "Male" },
    ];

    const newRows: V2ContractorCommissionRate[] = [];

    standardCombinations.forEach((combo) => {
      const key = `${countryToAdd}::${combo.entry_track}::${combo.gender}`;
      if (!existingKeys.has(key)) {
        newRows.push({
          destination_country: countryToAdd,
          entry_track: combo.entry_track,
          gender: combo.gender,
          rate: 0,
          currency: "Country Currency",
        });
      }
    });

    if (newRows.length === 0) {
      toast.info("All Combinations Exist", {
        description: `All 4 standard combinations for ${countryToAdd} are already present in the table.`,
      });
      return;
    }

    setRates((prev) => [...prev, ...newRows]);
    toast.success("Corridor Set Added", {
      description: `Added ${newRows.length} combination rows for ${countryToAdd}. Fill in the rates and save.`,
    });
  };

  // Submit complete replacement table
  const handleSaveAll = async () => {
    if (!canEdit) {
      toast.error("Permission Denied", {
        description: "Editing commission rates requires Manager, Admin, or Finance Manager role.",
      });
      return;
    }

    if (duplicateKeys.size > 0) {
      toast.error("Duplicate Combinations Detected", {
        description: "Each Country × Track × Gender combination must be unique. Please remove duplicates before saving.",
      });
      return;
    }

    if (hasInvalidRows) {
      toast.error("Invalid Rate Rows", {
        description: "All rows must have a destination country, track, gender, valid non-negative rate, and currency.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const persisted = await setCommissionRatesV2(contractor, rates);
      setRates(persisted);
      toast.success("Commission Rates Persisted", {
        description: `Successfully replaced and saved ${persisted.length} rate rules for ${contractorName || contractor}.`,
      });
      onSuccess?.();
    } catch (err: any) {
      toast.error("Save Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered rows for viewing
  const visibleRates = React.useMemo(() => {
    if (activeCountryFilter === "All") return rates;
    return rates.filter((r) => r.destination_country === activeCountryFilter);
  }, [rates, activeCountryFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121217] border-slate-200 dark:border-[#222228] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-[#202028]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Default Commission Rates:</span>
                  <span className="font-mono text-emerald-800 dark:text-emerald-400">
                    {contractorName || contractor}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Authoritative V2 defaults keyed by Destination Country × Entry Track × Gender. Used when placements have no manual rate overrides.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || isSaving}
              onClick={loadRates}
              className="text-xs h-8"
              title="Reload from backend"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Rule Guidance & Permission Alert */}
          {!canEdit ? (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                View-only mode: Mutating agency commission rates requires Manager, Admin, Finance Manager, or Registrar privileges.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#181822] border border-slate-200 dark:border-[#262634] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200">
                <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Backend Resolution & Replacement Architecture</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                • <strong>Full Replacement Notice</strong>: Saving sends the complete table to <code>contractor_api.set_commission_rates</code>.
                <br />
                • <strong>Resolution Order</strong>: Manual placement commission overrides (both amount + currency) take precedence. Otherwise, the matching row (Country + Track + Gender) is applied.
                <br />
                • <strong>Country Currency</strong>: Resolves dynamically to <code>SAR</code> for Saudi Arabia and <code>KWD</code> for Kuwait at accrual time.
              </p>
            </div>
          )}

          {/* Quick Generator Toolbar */}
          {canEdit && (
            <div className="p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-950/40 bg-emerald-50/40 dark:bg-emerald-950/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                  Quick Corridor Generator:
                </span>
                <select
                  value={presetCountry}
                  onChange={(e) => setPresetCountry(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#121217] text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c} value={c} className="dark:bg-[#121217]">
                      {c}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddCountrySet(presetCountry)}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Add 4 Standard Rows ({presetCountry})
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSingleRow}
                className="text-xs h-8 bg-white dark:bg-[#121217]"
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Add Custom Row
              </Button>
            </div>
          )}

          {/* Country Sub-filter Tabs if multiple countries exist */}
          {configuredCountries.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100 dark:border-[#22222a]">
              <button
                type="button"
                onClick={() => setActiveCountryFilter("All")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                  activeCountryFilter === "All"
                    ? "bg-emerald-900 text-white dark:bg-emerald-800"
                    : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#1a1a24]"
                )}
              >
                All Corridors ({rates.length})
              </button>
              {configuredCountries.map((c) => {
                const count = rates.filter((r) => r.destination_country === c).length;
                const isComplete = count >= 4;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCountryFilter(c)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                      activeCountryFilter === c
                        ? "bg-emerald-900 text-white dark:bg-emerald-800"
                        : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#1a1a24]"
                    )}
                  >
                    <span>{c}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0 h-3.5",
                        isComplete
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-amber-300 text-amber-700 bg-amber-50"
                      )}
                    >
                      {count} {isComplete ? "✓" : "rows"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Duplicate Key Warning Alert */}
          {duplicateKeys.size > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">Duplicate Combinations Found:</p>
                <p className="text-[11px] mt-0.5">
                  The table contains duplicate rules for the same Country, Track, and Gender. Please remove duplicates before saving.
                </p>
              </div>
            </div>
          )}

          {/* Rates Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-[#22222a] bg-white dark:bg-[#121217]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-b border-slate-100 dark:border-[#202028]">
                  <tr>
                    <th className="py-2.5 px-3">Destination Country</th>
                    <th className="py-2.5 px-3">Entry Track</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Commission Rate</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3 text-center">Rule Status</th>
                    {canEdit && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                        Fetching authoritative contractor default rates...
                      </td>
                    </tr>
                  ) : visibleRates.length > 0 ? (
                    visibleRates.map((row, idx) => {
                      // Find actual index in parent rates array
                      const realIndex = rates.indexOf(row);
                      const key = `${row.destination_country}::${row.entry_track}::${row.gender}`;
                      const isDuplicate = duplicateKeys.has(key);

                      return (
                        <tr
                          key={realIndex}
                          className={cn(
                            "hover:bg-slate-50 dark:hover:bg-[#15151c] transition-colors",
                            isDuplicate && "bg-red-50/50 dark:bg-red-950/20"
                          )}
                        >
                          {/* Destination Country */}
                          <td className="py-2 px-3">
                            {canEdit ? (
                              <select
                                value={row.destination_country}
                                onChange={(e) =>
                                  handleUpdateRow(realIndex, "destination_country", e.target.value)
                                }
                                className="h-7 px-2 rounded-md border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
                              >
                                {SUPPORTED_COUNTRIES.map((c) => (
                                  <option key={c} value={c} className="dark:bg-[#121217]">
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {row.destination_country}
                              </span>
                            )}
                          </td>

                          {/* Entry Track */}
                          <td className="py-2 px-3">
                            {canEdit ? (
                              <select
                                value={row.entry_track}
                                onChange={(e) =>
                                  handleUpdateRow(realIndex, "entry_track", e.target.value)
                                }
                                className="h-7 px-2 rounded-md border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs font-medium text-slate-900 dark:text-white"
                              >
                                {ENTRY_TRACKS.map((t) => (
                                  <option key={t} value={t} className="dark:bg-[#121217]">
                                    {t}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  row.entry_track === "Muayena"
                                    ? "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/30"
                                    : "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/30"
                                )}
                              >
                                {row.entry_track}
                              </Badge>
                            )}
                          </td>

                          {/* Gender */}
                          <td className="py-2 px-3">
                            {canEdit ? (
                              <select
                                value={row.gender}
                                onChange={(e) =>
                                  handleUpdateRow(realIndex, "gender", e.target.value)
                                }
                                className="h-7 px-2 rounded-md border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs font-medium text-slate-900 dark:text-white"
                              >
                                {GENDERS.map((g) => (
                                  <option key={g} value={g} className="dark:bg-[#121217]">
                                    {g}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-medium text-slate-700 dark:text-zinc-300">
                                {row.gender}
                              </span>
                            )}
                          </td>

                          {/* Rate Amount */}
                          <td className="py-2 px-3">
                            {canEdit ? (
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={row.rate}
                                onChange={(e) =>
                                  handleUpdateRow(realIndex, "rate", Number(e.target.value))
                                }
                                className="h-7 text-xs w-28 font-mono font-bold"
                              />
                            ) : (
                              <span className="font-bold font-mono text-slate-900 dark:text-white">
                                {Number(row.rate || 0).toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Currency */}
                          <td className="py-2 px-3">
                            {canEdit ? (
                              <select
                                value={row.currency}
                                onChange={(e) =>
                                  handleUpdateRow(realIndex, "currency", e.target.value)
                                }
                                className="h-7 px-2 rounded-md border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs font-semibold text-slate-900 dark:text-white"
                              >
                                {CURRENCIES.map((cur) => (
                                  <option key={cur} value={cur} className="dark:bg-[#121217]">
                                    {cur}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                              >
                                {row.currency}
                              </Badge>
                            )}
                          </td>

                          {/* Rule Status / Quality */}
                          <td className="py-2 px-3 text-center">
                            {isDuplicate ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] border-red-300 text-red-700 bg-red-50 dark:bg-red-950/40 font-bold"
                              >
                                DUPLICATE
                              </Badge>
                            ) : Number(row.rate) > 0 ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                Rate is 0
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          {canEdit && (
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(realIndex)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                title="Delete Rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Zero commission rate defaults configured for {contractorName || contractor}.
                        {canEdit && (
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddCountrySet("Saudi Arabia")}
                              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs h-7"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Add 4 Default Rows for Saudi Arabia
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-[#202028] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#16161d]">
          <div className="text-xs text-slate-500">
            Total Rules: <strong>{rates.length}</strong> configured across{" "}
            <strong>{configuredCountries.length}</strong> destination corridors
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs h-8"
            >
              Cancel
            </Button>

            {canEdit && (
              <Button
                type="button"
                size="sm"
                disabled={isSaving || duplicateKeys.size > 0 || hasInvalidRows}
                onClick={handleSaveAll}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving Complete Table...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Save All {rates.length} Rates
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
