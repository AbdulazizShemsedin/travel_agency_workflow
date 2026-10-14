"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Repeat,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoadError } from "@/components/ui/LoadError";
import {
  listReplacementsOwedV2,
  V2ReplacementOwedItem,
} from "@/lib/api/v2/portal";
import {
  waiveReplacementV2,
  undoWaiveReplacementV2,
} from "@/lib/api/v2/placements";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

export default function AgencyReplacementsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authUser, agencyContext } = useAuth();
  const isAgencyUser = Boolean(agencyContext?.contractor || authUser?.contractor);

  // Authority check for staff actions (Manager/Admin only)
  const isManagerOrAdmin = Boolean(
    authUser?.roles?.some((r) =>
      ["Admin", "Manager", "System Manager", "Administrator"].includes(r)
    )
  );

  const defaultContractor =
    agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Waive dialog state
  const [waiveItem, setWaiveItem] = React.useState<V2ReplacementOwedItem | null>(null);
  const [waiveReason, setWaiveReason] = React.useState("");
  const [waiveError, setWaiveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor =
    agencyContext?.contractor?.name || authUser?.contractor || activeContractor;

  const {
    data: replacements = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-replacements-owed", effectiveContractor],
    queryFn: () => listReplacementsOwedV2(effectiveContractor || undefined),
    enabled: Boolean(isAgencyUser || effectiveContractor || isManagerOrAdmin),
    retry: false,
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ name, reason }: { name: string; reason: string }) => {
      return await waiveReplacementV2(name, reason);
    },
    onSuccess: () => {
      setWaiveItem(null);
      setWaiveReason("");
      setWaiveError(null);
      queryClient.invalidateQueries({ queryKey: ["agency-replacements-owed"] });
    },
    onError: (err: any) => {
      setWaiveError(formatCleanErrorMessage(err) || "Failed to waive replacement.");
    },
  });

  const undoWaiveMutation = useMutation({
    mutationFn: async (name: string) => {
      return await undoWaiveReplacementV2(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-replacements-owed"] });
    },
  });

  const filteredItems = React.useMemo(() => {
    return replacements.filter((item) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.full_name?.toLowerCase().includes(q) ||
        item.passport_number?.toLowerCase().includes(q) ||
        item.sponsor_name?.toLowerCase().includes(q) ||
        item.employer_name?.toLowerCase().includes(q) ||
        item.target_job?.toLowerCase().includes(q)
      );
    });
  }, [replacements, searchTerm]);

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 items-center justify-center">
                <Repeat className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Replacements Owed
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Candidates who returned from abroad within 90 days. Eligible for a free replacement with zero commission.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-8 px-3 text-xs border-slate-200 dark:border-[#26262f] hover:bg-slate-100 dark:hover:bg-[#1a1a20]"
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${
                  isLoading || isRefetching ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search by candidate name, passport, sponsor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs pl-8 border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216]"
            />
            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          {replacements.length > 0 && (
            <Badge variant="outline" className="text-xs text-slate-600 dark:text-zinc-300">
              {filteredItems.length} {filteredItems.length === 1 ? "case" : "cases"} waiting
            </Badge>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600 mb-3" />
            <p className="text-xs">Loading replacements owed...</p>
          </div>
        ) : isError ? (
          <LoadError
            resourceName="Replacements"
            error={error}
            onRetry={() => refetch()}
          />
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center bg-white/50 dark:bg-[#121216]/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No replacements are owed.
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              There are currently no departed candidates returned within 90 days requiring a replacement.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121216] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#222227] bg-slate-50/75 dark:bg-[#16161c] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Job</th>
                    <th className="px-4 py-3.5">Sponsor / Employer</th>
                    <th className="px-4 py-3.5">Departed</th>
                    <th className="px-4 py-3.5">Returned On</th>
                    <th className="px-4 py-3.5">Waiting</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
                  {filteredItems.map((item) => {
                    const isWaived = Boolean(item.replacement_waived);
                    return (
                      <tr
                        key={item.name}
                        className={`hover:bg-slate-50/50 dark:hover:bg-[#17171d]/60 transition-colors ${
                          isWaived ? "opacity-60 bg-slate-50/40 dark:bg-[#101014]" : ""
                        }`}
                      >
                        {/* Candidate Identity (Full Name + Passport Number) */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.full_name || "Returned Candidate"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.passport_number ? `Passport: ${item.passport_number}` : "No passport"}
                            </span>
                          </div>
                        </td>

                        {/* Job */}
                        <td className="px-4 py-3.5 text-slate-700 dark:text-zinc-300">
                          {item.target_job || "Housemaid"}
                        </td>

                        {/* Sponsor */}
                        <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-300">
                          <span>{item.sponsor_name || item.employer_name || "—"}</span>
                        </td>

                        {/* Departed On */}
                        <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {item.departed_on ? item.departed_on.split(" ")[0] : "—"}
                        </td>

                        {/* Returned On */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-rose-600 dark:text-rose-400">
                              {item.flight_outcome_date || "—"}
                            </span>
                            {item.flight_outcome_reason && (
                              <span className="text-[10px] text-slate-400 max-w-[180px] truncate" title={item.flight_outcome_reason}>
                                {item.flight_outcome_reason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Days Waiting */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge
                            variant="neutral"
                            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {item.days_waiting != null ? `${item.days_waiting} days` : "Pending"}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isWaived ? (
                              <>
                                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">
                                  Waived
                                </Badge>
                                {isManagerOrAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => undoWaiveMutation.mutate(item.name)}
                                    disabled={undoWaiveMutation.isPending}
                                    className="h-7 px-2 text-[11px] text-slate-600 dark:text-zinc-300"
                                  >
                                    Put Back
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                <Link
                                  href={`/agent?replacement_for=${encodeURIComponent(
                                    item.name
                                  )}&replacement_name=${encodeURIComponent(
                                    item.full_name || ""
                                  )}`}
                                >
                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
                                  >
                                    <Repeat className="mr-1 h-3 w-3" />
                                    Replace
                                  </Button>
                                </Link>

                                {isManagerOrAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setWaiveItem(item);
                                      setWaiveReason("");
                                      setWaiveError(null);
                                    }}
                                    className="h-7 px-2 text-[11px] text-slate-400 hover:text-rose-600"
                                    title="Waive replacement (agency does not want replacement)"
                                  >
                                    Waive
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Waive Confirmation Dialog */}
        {waiveItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Waive Replacement
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Remove replacement obligation for{" "}
                <strong>{waiveItem.full_name}</strong> (
                {waiveItem.passport_number || "No passport"}). The foreign agency will not be owed an exchange candidate.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Reason for waiver (required)
                </label>
                <Input
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="e.g. Agency agreed to cash refund or opted out"
                  className="text-xs h-8"
                />
              </div>

              {waiveError && (
                <p className="text-[11px] text-rose-600">{waiveError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWaiveItem(null)}
                  disabled={waiveMutation.isPending}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!waiveReason.trim()) {
                      setWaiveError("Please provide a reason for waiving replacement.");
                      return;
                    }
                    waiveMutation.mutate({
                      name: waiveItem.name,
                      reason: waiveReason.trim(),
                    });
                  }}
                  disabled={waiveMutation.isPending}
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {waiveMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Confirm Waive"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
