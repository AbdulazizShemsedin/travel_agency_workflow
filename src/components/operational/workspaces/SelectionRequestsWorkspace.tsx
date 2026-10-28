"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Inbox,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Building2,
  Globe,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  listSelectionRequestsV2,
  approveSelectionRequestV2,
  denySelectionRequestV2,
  makeApplicantAvailableV2,
  V2SelectionRequestItem,
} from "@/lib/api/v2/placements";
import { listApplicantsV2, V2ApplicantDetails } from "@/lib/api/v2/applicants";
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
import { useAuth } from "@/components/providers/AuthProvider";

interface SelectionRequestsWorkspaceProps {
  onRefreshParent?: () => void;
}

export function SelectionRequestsWorkspace({ onRefreshParent }: SelectionRequestsWorkspaceProps) {
  const queryClient = useQueryClient();
  const { isReadOnly, roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase().trim()) : [];
  const isAdminOrManager = userRoles.some((r) =>
    ["administrator", "system manager", "admin", "manager"].includes(r)
  );
  const isRegistrarReadOnly = !isAdminOrManager && (isReadOnly("Registrar") || isReadOnly());

  const [subTab, setSubTab] = React.useState<"pending" | "unavailable">("pending");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Approval Modal State
  const [approvingItem, setApprovingItem] = React.useState<V2SelectionRequestItem | null>(null);
  const [approvalRemarks, setApprovalRemarks] = React.useState<string>("");
  const [isApproving, setIsApproving] = React.useState<boolean>(false);

  // Denial Modal State
  const [denyingItem, setDenyingItem] = React.useState<V2SelectionRequestItem | null>(null);
  const [denialReason, setDenialReason] = React.useState<string>("");
  const [isDenying, setIsDenying] = React.useState<boolean>(false);

  // Put Back Modal State
  const [puttingBackApplicant, setPuttingBackApplicant] = React.useState<V2ApplicantDetails | null>(null);
  const [putBackReason, setPutBackReason] = React.useState<string>("");
  const [isPuttingBack, setIsPuttingBack] = React.useState<boolean>(false);

  // 1. Fetch Selection Requests
  const {
    data: rawRequests = [],
    isLoading: isRequestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery<V2SelectionRequestItem[]>({
    queryKey: ["v2_selection_requests_list"],
    queryFn: listSelectionRequestsV2,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const requests = React.useMemo<V2SelectionRequestItem[]>(() => {
    if (Array.isArray(rawRequests)) return rawRequests;
    if (rawRequests && typeof rawRequests === "object") {
      if (Array.isArray((rawRequests as any).data)) return (rawRequests as any).data;
      if (Array.isArray((rawRequests as any).message)) return (rawRequests as any).message;
      if (Array.isArray((rawRequests as any).rows)) return (rawRequests as any).rows;
      if (Array.isArray((rawRequests as any).requests)) return (rawRequests as any).requests;
    }
    return [];
  }, [rawRequests]);

  // 2. Fetch Unavailable Applicants
  const {
    data: rawUnavailable = [],
    isLoading: isUnavailableLoading,
    error: unavailableError,
    refetch: refetchUnavailable,
  } = useQuery<V2ApplicantDetails[]>({
    queryKey: ["v2_unavailable_applicants_list"],
    queryFn: () => listApplicantsV2({ unavailable: 1 } as any),
    enabled: subTab === "unavailable",
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const unavailableApplicants = React.useMemo<V2ApplicantDetails[]>(() => {
    if (Array.isArray(rawUnavailable)) return rawUnavailable;
    if (rawUnavailable && typeof rawUnavailable === "object") {
      if (Array.isArray((rawUnavailable as any).data)) return (rawUnavailable as any).data;
      if (Array.isArray((rawUnavailable as any).message)) return (rawUnavailable as any).message;
    }
    return [];
  }, [rawUnavailable]);

  // Actions
  const handleApproveConfirm = async () => {
    if (isRegistrarReadOnly) {
      toast.error("Permission Denied", {
        description: "You have read-only access here, or do not have permission to perform this action. Please contact your administrator.",
      });
      return;
    }
    if (!approvingItem) return;
    setIsApproving(true);
    try {
      await approveSelectionRequestV2(approvingItem.name, approvalRemarks.trim() || undefined);
      toast.success("Selection Approved", {
        description: `${approvingItem.full_name || "Candidate"} is now Selected and queued for medical clearance.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_list"] });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setApprovingItem(null);
      setApprovalRemarks("");
      onRefreshParent?.();
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.toLowerCase().includes("already decided") || errMsg.toLowerCase().includes("already")) {
        toast.error("Request Already Decided", {
          description: errMsg || "This selection request was already decided. Refreshing current requests...",
        });
        refetchRequests();
        queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
        setApprovingItem(null);
      } else {
        toast.error("Approval Failed", {
          description: errMsg || "Could not approve selection request. Please try again.",
        });
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleDenyConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistrarReadOnly) {
      toast.error("Permission Denied", {
        description: "You have read-only access here, or do not have permission to perform this action. Please contact your administrator.",
      });
      return;
    }
    if (!denyingItem) return;
    const cleanReason = denialReason.trim();
    if (!cleanReason) {
      toast.error("Denial Reason Required", {
        description: "Please specify why this candidate is unavailable.",
      });
      return;
    }

    setIsDenying(true);
    try {
      await denySelectionRequestV2(denyingItem.name, cleanReason);
      toast.success("Request Denied", {
        description: `${denyingItem.full_name || "Candidate"} marked unavailable and agency notified.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_list"] });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
      queryClient.invalidateQueries({ queryKey: ["v2_unavailable_applicants_list"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setDenyingItem(null);
      setDenialReason("");
      onRefreshParent?.();
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.toLowerCase().includes("already decided") || errMsg.toLowerCase().includes("already")) {
        toast.error("Request Already Decided", {
          description: errMsg || "This selection request was already decided. Refreshing current requests...",
        });
        refetchRequests();
        queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
        setDenyingItem(null);
      } else {
        toast.error("Denial Failed", {
          description: errMsg || "Could not deny selection request.",
        });
      }
    } finally {
      setIsDenying(false);
    }
  };

  const handlePutBackConfirm = async () => {
    if (isRegistrarReadOnly) {
      toast.error("Permission Denied", {
        description: "You have read-only access here, or do not have permission to perform this action. Please contact your administrator.",
      });
      return;
    }
    if (!puttingBackApplicant) return;
    setIsPuttingBack(true);
    try {
      await makeApplicantAvailableV2(puttingBackApplicant.name, putBackReason.trim() || undefined);
      toast.success("Candidate Restored", {
        description: `${puttingBackApplicant.full_name || "Candidate"} is now available in agency candidate pools.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_unavailable_applicants_list"] });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_list"] });
      queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setPuttingBackApplicant(null);
      setPutBackReason("");
    } catch (err: any) {
      toast.error("Failed to Restore Candidate", {
        description: err?.message || "Could not restore candidate to available pool.",
      });
    } finally {
      setIsPuttingBack(false);
    }
  };

  // Filtered lists
  const filteredRequests = React.useMemo<V2SelectionRequestItem[]>(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase().trim();
    return requests.filter(
      (r: V2SelectionRequestItem) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.passport_number?.toLowerCase().includes(q) ||
        r.ref_no?.toLowerCase().includes(q) ||
        r.agency_name?.toLowerCase().includes(q) ||
        r.destination_country?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const filteredUnavailable = React.useMemo<V2ApplicantDetails[]>(() => {
    if (!searchQuery.trim()) return unavailableApplicants;
    const q = searchQuery.toLowerCase().trim();
    return unavailableApplicants.filter(
      (a: V2ApplicantDetails) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.passport_number?.toLowerCase().includes(q) ||
        a.ref_no?.toLowerCase().includes(q) ||
        a.destination_country?.toLowerCase().includes(q) ||
        (a as any).unavailable_reason?.toLowerCase().includes(q)
    );
  }, [unavailableApplicants, searchQuery]);

  // Desktop Compact Pagination
  const [requestsPage, setRequestsPage] = React.useState(1);
  const [unavailablePage, setUnavailablePage] = React.useState(1);
  const pageSize = 8;

  React.useEffect(() => {
    setRequestsPage(1);
    setUnavailablePage(1);
  }, [searchQuery, subTab]);

  const totalRequestsPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const totalUnavailablePages = Math.max(1, Math.ceil(filteredUnavailable.length / pageSize));

  React.useEffect(() => {
    if (requestsPage > totalRequestsPages) {
      setRequestsPage(totalRequestsPages);
    }
  }, [requestsPage, totalRequestsPages]);

  React.useEffect(() => {
    if (unavailablePage > totalUnavailablePages) {
      setUnavailablePage(totalUnavailablePages);
    }
  }, [unavailablePage, totalUnavailablePages]);
  const paginatedRequests = React.useMemo(() => {
    const start = (requestsPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, requestsPage]);

  const paginatedUnavailable = React.useMemo(() => {
    const start = (unavailablePage - 1) * pageSize;
    return filteredUnavailable.slice(start, start + pageSize);
  }, [filteredUnavailable, unavailablePage]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col space-y-3">
      {isRegistrarReadOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>You have read-only access to Registrar actions. Approving, denying, or putting candidates back in the pool is disabled.</span>
        </div>
      )}

      {/* Sub-tabs & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-[#272730] shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("pending")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              subTab === "pending"
                ? "bg-emerald-900 text-white dark:bg-emerald-700 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
            )}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Pending Requests</span>
            {requests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab("unavailable")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              subTab === "unavailable"
                ? "bg-emerald-900 text-white dark:bg-emerald-700 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
            )}
          >
            <UserX className="h-3.5 w-3.5 text-rose-500" />
            <span>Unavailable Candidates</span>
            {unavailableApplicants.length > 0 && subTab === "unavailable" && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {unavailableApplicants.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search candidate, passport, agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-2.5 text-xs bg-white dark:bg-[#14141a] border-slate-200 dark:border-[#272730]"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (subTab === "pending") {
                refetchRequests();
                queryClient.invalidateQueries({ queryKey: ["v2_selection_requests_count"] });
              } else {
                refetchUnavailable();
              }
            }}
            className="h-8 px-2.5 text-xs"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-slate-500",
                (isRequestsLoading || isUnavailableLoading) && "animate-spin text-emerald-600"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] overflow-hidden flex flex-col">
        {subTab === "pending" ? (
          /* PENDING SELECTION REQUESTS TABLE */
          <div className="flex-1 min-h-0 overflow-auto">
            {requestsError ? (
              <div className="p-12 text-center text-xs text-rose-600 dark:text-rose-400 space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-rose-500 mb-2" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Error Loading Selection Requests</p>
                  <p className="text-[11px] text-slate-500">{(requestsError as any)?.message || "Server refused request."}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchRequests()}
                  className="inline-flex items-center gap-1.5 h-8 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            ) : isRequestsLoading ? (
              <div className="p-16 text-center text-xs text-slate-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                <p>Loading pending agency selection requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-400 space-y-2">
                <Inbox className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600" />
                <p className="font-semibold text-slate-600 dark:text-zinc-300">No pending selection requests</p>
                <p className="text-[11px]">All agency selections have been confirmed or decided.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Ref No.</th>
                    <th className="py-2.5 px-3 font-semibold">Candidate Name</th>
                    <th className="py-2.5 px-3 font-semibold">Passport</th>
                    <th className="py-2.5 px-3 font-semibold">Foreign Agency</th>
                    <th className="py-2.5 px-3 font-semibold">Destination</th>
                    <th className="py-2.5 px-3 font-semibold">Requested On</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                  {paginatedRequests.map((req: V2SelectionRequestItem) => (
                    <tr key={req.name} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                        {req.ref_no || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {req.full_name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300">
                        {req.passport_number || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300">
                        <span className="font-medium">{req.agency_name || "—"}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-[#2b2b36]">
                          {req.destination_country || "—"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {req.requested_on ? new Date(req.requested_on).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {req.is_free_replacement ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-medium border-0">
                            {req.exchange_for_worker_name
                              ? `Replacement for ${req.exchange_for_worker_name}`
                              : req.exchange_for && !req.exchange_for.startsWith("PLM-") && !req.exchange_for.startsWith("APP-")
                              ? `Replacement for ${req.exchange_for}`
                              : "Replacement Candidate"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-[#2b2b36] text-slate-600">
                            New Selection
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isRegistrarReadOnly}
                            title={isRegistrarReadOnly ? "You have read-only access here, or do not have permission to perform this action. Please contact your administrator." : undefined}
                            onClick={() => {
                              setApprovingItem(req);
                              setApprovalRemarks("");
                            }}
                            className="bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isRegistrarReadOnly}
                            title={isRegistrarReadOnly ? "You have read-only access here, or do not have permission to perform this action. Please contact your administrator." : undefined}
                            onClick={() => {
                              setDenyingItem(req);
                              setDenialReason("");
                            }}
                            className="border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] h-7 px-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredRequests.length > pageSize && (
              <div className="py-2 px-3 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161e] flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {Math.min(filteredRequests.length, (requestsPage - 1) * pageSize + 1)} - {Math.min(filteredRequests.length, requestsPage * pageSize)} of {filteredRequests.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={requestsPage <= 1}
                    onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-[11px] font-medium">Page {requestsPage} of {totalRequestsPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={requestsPage >= totalRequestsPages}
                    onClick={() => setRequestsPage((p) => Math.min(totalRequestsPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* UNAVAILABLE CANDIDATES TABLE */
          <div className="flex-1 min-h-0 overflow-auto">
            {unavailableError ? (
              <div className="p-12 text-center text-xs text-rose-600 dark:text-rose-400 space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-rose-500 mb-2" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Error Loading Unavailable Candidates</p>
                  <p className="text-[11px] text-slate-500">{(unavailableError as any)?.message || "Server refused request."}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchUnavailable()}
                  className="inline-flex items-center gap-1.5 h-8 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            ) : isUnavailableLoading ? (
              <div className="p-16 text-center text-xs text-slate-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                <p>Loading unavailable candidates pool...</p>
              </div>
            ) : filteredUnavailable.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-400 space-y-2">
                <UserCheck className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600" />
                <p className="font-semibold text-slate-600 dark:text-zinc-300">No candidates currently marked unavailable</p>
                <p className="text-[11px]">All active candidates are visible in foreign agency selection pools.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Ref No.</th>
                    <th className="py-2.5 px-3 font-semibold">Candidate Name</th>
                    <th className="py-2.5 px-3 font-semibold">Passport</th>
                    <th className="py-2.5 px-3 font-semibold">Destination</th>
                    <th className="py-2.5 px-3 font-semibold">Reason Unavailable</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                  {paginatedUnavailable.map((app: V2ApplicantDetails) => (
                    <tr key={app.name} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                        {app.ref_no || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {app.full_name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300">
                        {app.passport_number || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-[#2b2b36]">
                          {app.destination_country || "—"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400 text-[11px]">
                        {(app as any).unavailable_reason || (app as any).remarks || "Staff denied selection"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isRegistrarReadOnly}
                          title={isRegistrarReadOnly ? "You have read-only access here, or do not have permission to perform this action. Please contact your administrator." : undefined}
                          onClick={() => {
                            setPuttingBackApplicant(app);
                            setPutBackReason("");
                          }}
                          className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Put Back in Pool
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredUnavailable.length > pageSize && (
              <div className="py-2 px-3 border-t border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161e] flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {Math.min(filteredUnavailable.length, (unavailablePage - 1) * pageSize + 1)} - {Math.min(filteredUnavailable.length, unavailablePage * pageSize)} of {filteredUnavailable.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={unavailablePage <= 1}
                    onClick={() => setUnavailablePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-[11px] font-medium">Page {unavailablePage} of {totalUnavailablePages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={unavailablePage >= totalUnavailablePages}
                    onClick={() => setUnavailablePage((p) => Math.min(totalUnavailablePages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* APPROVE DIALOG */}
      <Dialog open={Boolean(approvingItem)} onOpenChange={(open) => !open && setApprovingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Confirm Selection Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirm that <strong>{approvingItem?.full_name}</strong> ({approvingItem?.ref_no ? `Ref: ${approvingItem.ref_no}` : approvingItem?.passport_number}) is available for{" "}
              <strong>{approvingItem?.agency_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
              Upon approval, the placement status advances to <strong>Selected</strong> and moves into the medical and clearance pipeline. The foreign agency will be notified.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">
                Optional Remarks
              </label>
              <Input
                type="text"
                placeholder="Optional confirmation note..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isApproving}
              onClick={() => setApprovingItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isApproving}
              onClick={handleApproveConfirm}
              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs h-8 font-semibold"
            >
              {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DENY DIALOG */}
      <Dialog open={Boolean(denyingItem)} onOpenChange={(open) => !open && setDenyingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleDenyConfirm}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
                Deny Selection Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Mark <strong>{denyingItem?.full_name}</strong> as unavailable and cancel this placement request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                The placement will be Cancelled and the candidate will be removed from all agency candidate pools until restored. The agency will be notified to select another candidate.
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">
                  Why is she not available? <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Candidate withdrew, medical issue, relocated..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="text-xs h-8"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDenying}
                onClick={() => setDenyingItem(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isDenying || !denialReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-semibold"
              >
                {isDenying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                Deny & Mark Unavailable
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PUT BACK DIALOG */}
      <Dialog open={Boolean(puttingBackApplicant)} onOpenChange={(open) => !open && setPuttingBackApplicant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              Restore Candidate to Selection Pool
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Restore <strong>{puttingBackApplicant?.full_name}</strong> to the available candidate pool.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
              Foreign agencies will once again be able to view and select this candidate.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">
                Optional Reason
              </label>
              <Input
                type="text"
                placeholder="e.g. Candidate resolved personal issue..."
                value={putBackReason}
                onChange={(e) => setPutBackReason(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPuttingBack}
              onClick={() => setPuttingBackApplicant(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPuttingBack}
              onClick={handlePutBackConfirm}
              className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs h-8 font-semibold"
            >
              {isPuttingBack ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
              Restore Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
