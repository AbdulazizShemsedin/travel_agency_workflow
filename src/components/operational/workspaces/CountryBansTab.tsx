"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Lock,
} from "lucide-react";
import {
  listCountryBansV2,
  removeCountryBanV2,
  undoCountryBanLiftV2,
  V2CountryBanRecord,
} from "@/lib/api/v2/applicants";
import { stripRecordIds } from "@/lib/utils/display-id";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CountryBansTabProps {
  isManagerOrAdmin: boolean;
  onRefresh?: () => void;
}

export function CountryBansTab({ isManagerOrAdmin, onRefresh }: CountryBansTabProps) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = React.useState<"active" | "lifted">("active");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog State for Lift Ban
  const [liftingBan, setLiftingBan] = React.useState<V2CountryBanRecord | null>(null);
  const [liftReason, setLiftReason] = React.useState("");

  // Dialog State for Put Back (Undo Lift)
  const [puttingBackBan, setPuttingBackBan] = React.useState<V2CountryBanRecord | null>(null);
  const [putBackReason, setPutBackReason] = React.useState("");

  // Fetch full ban history (active_only=0)
  const {
    data: allBans = [],
    isLoading,
    refetch,
  } = useQuery<V2CountryBanRecord[]>({
    queryKey: ["v2_all_country_bans"],
    queryFn: () => listCountryBansV2(undefined, 0),
    staleTime: 15000,
  });

  const liftMutation = useMutation({
    mutationFn: async ({ banName, reason }: { banName: string; reason?: string }) => {
      return await removeCountryBanV2(banName, reason);
    },
    onSuccess: () => {
      toast.success("Country ban lifted successfully.");
      queryClient.invalidateQueries({ queryKey: ["v2_all_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setLiftingBan(null);
      setLiftReason("");
      onRefresh?.();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  const putBackMutation = useMutation({
    mutationFn: async ({ banName, reason }: { banName: string; reason?: string }) => {
      return await undoCountryBanLiftV2(banName, reason);
    },
    onSuccess: () => {
      toast.success("Country ban restored (put back).");
      queryClient.invalidateQueries({ queryKey: ["v2_all_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setPuttingBackBan(null);
      setPutBackReason("");
      onRefresh?.();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  const activeBans = React.useMemo(() => {
    return allBans.filter((b) => b.active === 1 || b.active === undefined);
  }, [allBans]);

  const liftedBans = React.useMemo(() => {
    return allBans.filter((b) => b.active === 0);
  }, [allBans]);

  const currentList = activeSubTab === "active" ? activeBans : liftedBans;

  const filteredBans = React.useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter((b) => {
      return (
        (b.full_name && b.full_name.toLowerCase().includes(q)) ||
        (b.passport_number && b.passport_number.toLowerCase().includes(q)) ||
        (b.country && b.country.toLowerCase().includes(q)) ||
        (b.reason && b.reason.toLowerCase().includes(q)) ||
        (b.set_by_name && b.set_by_name.toLowerCase().includes(q)) ||
        (b.lifted_by_name && b.lifted_by_name.toLowerCase().includes(q))
      );
    });
  }, [currentList, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Subtab Selector & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#222228] pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("active")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeSubTab === "active"
                ? "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-b-2 border-rose-600"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Active Bans</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-rose-300 text-rose-700 bg-rose-100/50">
              {activeBans.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("lifted")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeSubTab === "lifted"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-b-2 border-emerald-600"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Lifted Bans</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-300 text-emerald-700 bg-emerald-100/50">
              {liftedBans.length}
            </Badge>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search candidate, passport, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-white dark:bg-[#15151c]"
          />
        </div>
      </div>

      {/* Bans Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
        <table className="w-full text-xs text-left border-separate border-spacing-0 lg:table-fixed">
          <thead className="text-[11px] text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-[#171720] uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028]">Candidate</th>
              <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028]">Destination</th>
              <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028]">Ban Reason</th>
              <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028]">
                {activeSubTab === "active" ? "Set By / Date" : "Lifted By / Date"}
              </th>
              {activeSubTab === "lifted" && (
                <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028]">Lift Reason</th>
              )}
              <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
            {isLoading ? (
              <tr>
                <td colSpan={activeSubTab === "lifted" ? 6 : 5} className="py-8 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                  Loading country bans records...
                </td>
              </tr>
            ) : filteredBans.length > 0 ? (
              filteredBans.map((ban) => {
                const displayName = ban.full_name || ban.applicant || "Candidate";
                const displayPassport = ban.passport_number || "—";
                const cleanedReason = stripRecordIds(ban.reason || "Permanent administrative restriction");
                const cleanedLiftReason = stripRecordIds(ban.lift_reason || "Administrative review");

                return (
                  <tr key={ban.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161e]">
                    <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24]">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs">
                        {displayName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {displayPassport}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                      <Badge variant="outline" className="border-slate-300 dark:border-zinc-700 font-semibold">
                        {ban.country}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24] max-w-xs">
                      <p className="line-clamp-2 text-slate-700 dark:text-zinc-300" title={ban.reason}>
                        {cleanedReason}
                      </p>
                    </td>

                    <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                      {activeSubTab === "active" ? (
                        <div>
                          <div className="font-medium text-slate-800 dark:text-zinc-200">
                            {ban.set_by_name || ban.set_by || "Staff"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {ban.set_on ? new Date(ban.set_on).toLocaleDateString() : "Active"}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-800 dark:text-zinc-200">
                            {ban.lifted_by_name || ban.lifted_by || "Staff"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {ban.lifted_on ? new Date(ban.lifted_on).toLocaleDateString() : "Lifted"}
                          </div>
                        </div>
                      )}
                    </td>

                    {activeSubTab === "lifted" && (
                      <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24] max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-zinc-400" title={ban.lift_reason}>
                          {cleanedLiftReason}
                        </p>
                      </td>
                    )}

                    <td className="py-2.5 px-3 text-right border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                      {activeSubTab === "active" ? (
                        isManagerOrAdmin ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLiftingBan(ban);
                              setLiftReason("");
                            }}
                            className="h-7 text-xs border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Lift</span>
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px]">
                            Active Ban
                          </Badge>
                        )
                      ) : isManagerOrAdmin ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPuttingBackBan(ban);
                            setPutBackReason("");
                          }}
                          className="h-7 text-xs border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Put back</span>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]">
                          Lifted
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={activeSubTab === "lifted" ? 6 : 5} className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600/40 mx-auto mb-2" />
                  No {activeSubTab === "active" ? "active" : "lifted"} country bans found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lift Ban Dialog */}
      <Dialog open={Boolean(liftingBan)} onOpenChange={(open) => !open && setLiftingBan(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Lift Country Ban
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Lifting ban for{" "}
              <strong className="text-slate-800 dark:text-zinc-200">
                {liftingBan?.full_name || liftingBan?.applicant}
              </strong>{" "}
              ({liftingBan?.passport_number || "Passport"}) for destination{" "}
              <strong className="text-slate-800 dark:text-zinc-200">{liftingBan?.country}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Lift Reason (Recorded for Audit)
            </Label>
            <Textarea
              placeholder="State the administrative justification for lifting this restriction..."
              value={liftReason}
              onChange={(e) => setLiftReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLiftingBan(null)}
              disabled={liftMutation.isPending}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!liftingBan) return;
                liftMutation.mutate({
                  banName: liftingBan.name,
                  reason: liftReason.trim() || undefined,
                });
              }}
              disabled={liftMutation.isPending}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {liftMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirm Lift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Put Back (Undo Lift) Dialog */}
      <Dialog open={Boolean(puttingBackBan)} onOpenChange={(open) => !open && setPuttingBackBan(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Put Back Ban (Restore Active Restriction)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Re-activate ban for{" "}
              <strong className="text-slate-800 dark:text-zinc-200">
                {puttingBackBan?.full_name || puttingBackBan?.applicant}
              </strong>{" "}
              ({puttingBackBan?.passport_number || "Passport"}) for destination{" "}
              <strong className="text-slate-800 dark:text-zinc-200">{puttingBackBan?.country}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Reason for Restoring Ban (Optional)
            </Label>
            <Textarea
              placeholder="State reason for restoring the restriction..."
              value={putBackReason}
              onChange={(e) => setPutBackReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPuttingBackBan(null)}
              disabled={putBackMutation.isPending}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!puttingBackBan) return;
                putBackMutation.mutate({
                  banName: puttingBackBan.name,
                  reason: putBackReason.trim() || undefined,
                });
              }}
              disabled={putBackMutation.isPending}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {putBackMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Put Back Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
