"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  listCountryBanRequestsV2,
  decideCountryBanRequestV2,
  V2CountryBanRequestItem,
} from "@/lib/api/v2/applicants";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CountryBanRequestsWorkspaceProps {
  onRefresh?: () => void;
}

export function CountryBanRequestsWorkspace({ onRefresh }: CountryBanRequestsWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser, roles, can } = useAuth();

  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (can("manageUsers")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin" ||
        norm === "admin"
      );
    });
  }, [authUser, roles, can]);

  const [statusFilter, setStatusFilter] = React.useState<string>("Pending");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Decision Dialog state
  const [activeRequest, setActiveRequest] = React.useState<V2CountryBanRequestItem | null>(null);
  const [decisionType, setDecisionType] = React.useState<"Approve" | "Reject">("Approve");
  const [decisionNote, setDecisionNote] = React.useState<string>("");

  const {
    data: requests = [],
    isLoading,
    refetch,
  } = useQuery<V2CountryBanRequestItem[]>({
    queryKey: ["v2_country_ban_requests", statusFilter],
    queryFn: () => listCountryBanRequestsV2(statusFilter === "All" ? undefined : statusFilter),
    staleTime: 15000,
  });

  const decideMutation = useMutation({
    mutationFn: async () => {
      if (!activeRequest) return;
      return await decideCountryBanRequestV2(
        activeRequest.name,
        decisionType,
        decisionNote.trim() || undefined
      );
    },
    onSuccess: (res) => {
      toast.success(
        res?.message ||
          `Ban request ${activeRequest?.name} ${decisionType.toLowerCase()}d successfully.`
      );
      queryClient.invalidateQueries({ queryKey: ["v2_country_ban_requests"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      setActiveRequest(null);
      setDecisionNote("");
      refetch();
      if (onRefresh) onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.message || `Failed to ${decisionType.toLowerCase()} ban request.`);
    },
  });

  const filteredRequests = React.useMemo(() => {
    return requests.filter((req) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const applicantName = (req.applicant_name || req.full_name || req.applicant || "").toLowerCase();
      const reason = (req.reason || "").toLowerCase();
      const country = (req.country || "").toLowerCase();
      const action = (req.action || "").toLowerCase();
      const requestedBy = (req.requested_by || "").toLowerCase();
      return (
        applicantName.includes(q) ||
        reason.includes(q) ||
        country.includes(q) ||
        action.includes(q) ||
        requestedBy.includes(q)
      );
    });
  }, [requests, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#121217] p-4 rounded-xl border border-slate-200 dark:border-[#222228] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Country Ban Exception Queue (Ashara Teyezuwal)
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Review, approve, or reject override passes and permanent ban lift requests filed by registrars and staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#15151c] p-2.5 rounded-xl border border-slate-200 dark:border-[#222228]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search applicant, reason, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-64 border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217] text-slate-700 dark:text-zinc-200"
            >
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved (Ready to Use)</option>
              <option value="Used">Used Pass</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All Requests</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredRequests.length}</strong> request(s)
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] overflow-x-auto shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-800 dark:text-emerald-400 mb-2" />
            <span className="text-xs text-slate-500">Loading country ban requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No country ban exception requests found for <strong>{statusFilter}</strong>.
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-[#181820] border-b border-slate-200 dark:border-[#222228] text-slate-700 dark:text-zinc-300 font-semibold uppercase text-[11px] tracking-wider select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">Applicant</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Country</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Requested By</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Reason</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Decided By</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d1d24]">
              {filteredRequests.map((req) => {
                const isPending = req.status === "Pending";
                const isApproved = req.status === "Approved";
                const isUsed = req.status === "Used";
                const isRejected = req.status === "Rejected";

                return (
                  <tr
                    key={req.name}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#16161d] transition-colors"
                  >
                    {/* Applicant */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-zinc-100">
                      <div className="font-semibold">{req.applicant_name || req.full_name || req.applicant}</div>
                      <div className="font-mono text-[10px] text-slate-400">{req.applicant}</div>
                    </td>

                    {/* Country */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-zinc-200">
                      {req.country || "—"}
                    </td>

                    {/* Request Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          req.request_type === "Lift"
                            ? "border-emerald-400 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-purple-400 text-purple-800 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300"
                        )}
                      >
                        {req.request_type}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                      {req.action || "—"}
                    </td>

                    {/* Requested By */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                      <div>{req.requested_by || "—"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {req.creation ? req.creation.split(" ")[0] : ""}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 dark:text-zinc-300" title={req.reason}>
                      {req.reason}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold",
                          isPending && "bg-amber-500 text-white",
                          isApproved && "bg-emerald-600 text-white",
                          isUsed && "bg-blue-600 text-white",
                          isRejected && "bg-rose-600 text-white"
                        )}
                      >
                        {req.status}
                      </Badge>
                    </td>

                    {/* Decided By & Note */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                      {req.decided_by ? (
                        <div>
                          <div className="font-semibold text-slate-700 dark:text-zinc-200">{req.decided_by}</div>
                          {req.note && <div className="text-[10px] italic truncate max-w-[140px]" title={req.note}>{req.note}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      {isPending && isManagerOrAdmin ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              setActiveRequest(req);
                              setDecisionType("Approve");
                              setDecisionNote("");
                            }}
                            className="h-7 px-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setActiveRequest(req);
                              setDecisionType("Reject");
                              setDecisionNote("");
                            }}
                            className="h-7 px-2.5 text-xs font-semibold"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isApproved ? "One-time pass active" : isUsed ? "Pass redeemed" : "Closed"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Decision Confirmation Dialog */}
      <Dialog open={!!activeRequest} onOpenChange={(open) => !open && setActiveRequest(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-[#15151b] border-slate-200 dark:border-[#2a2a35]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              {decisionType === "Approve" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              {decisionType} Ban Exception Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {decisionType === "Approve"
                ? activeRequest?.request_type === "Lift"
                  ? "Approving this request will immediately remove the country ban from this applicant."
                  : `Approving gives a one-time pass for the '${activeRequest?.action}' action. The requester can then retry without being blocked.`
                : "Rejecting this request will uphold the country ban and deny the requested action."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-[#1c1c24] rounded-lg border border-slate-200 dark:border-[#2a2a35] space-y-1">
              <div>
                Applicant: <strong>{activeRequest?.applicant_name || activeRequest?.full_name || activeRequest?.applicant}</strong> ({activeRequest?.applicant})
              </div>
              <div>Country: <strong>{activeRequest?.country}</strong> • Request: <strong>{activeRequest?.request_type}</strong></div>
              {activeRequest?.action && <div>Action: <strong>{activeRequest.action}</strong></div>}
              <div>Requested by: <strong>{activeRequest?.requested_by}</strong></div>
              <div className="pt-1 text-slate-600 dark:text-zinc-300 italic">
                &ldquo;{activeRequest?.reason}&rdquo;
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Decision Note / Remarks (Optional)
              </label>
              <Input
                placeholder="Optional manager note recorded in audit log..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveRequest(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={decideMutation.isPending}
              onClick={() => decideMutation.mutate()}
              className={cn(
                "text-xs font-semibold text-white",
                decisionType === "Approve" ? "bg-emerald-800 hover:bg-emerald-900" : "bg-rose-700 hover:bg-rose-800"
              )}
            >
              {decideMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Confirm {decisionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
