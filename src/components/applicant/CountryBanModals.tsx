"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Send,
  History,
  FileText,
  Clock,
  User,
  Calendar,
  Lock,
} from "lucide-react";
import {
  setCountryBanV2,
  removeCountryBanV2,
  undoCountryBanLiftV2,
  requestCountryBanExceptionV2,
  listCountryBansV2,
  listCountryBanRequestsV2,
  V2CountryBanRecord,
  V2CountryBanRequestItem,
} from "@/lib/api/v2/applicants";
import { stripRecordIds } from "@/lib/utils/display-id";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export interface BanApplicantTarget {
  name: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  destination_country?: string;
}

// --------------------------------------------------------------------------
// 1. SET COUNTRY BAN MODAL (For applicants without an active ban)
// --------------------------------------------------------------------------

interface SetCountryBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: BanApplicantTarget | null;
  onSuccess?: () => void;
}

export function SetCountryBanModal({
  isOpen,
  onClose,
  applicant,
  onSuccess,
}: SetCountryBanModalProps) {
  const queryClient = useQueryClient();
  const [country, setCountry] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errorNotice, setErrorNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (applicant && isOpen) {
      setCountry(applicant.destination_country || "Saudi Arabia");
      setReason("");
      setErrorNotice(null);
    }
  }, [applicant, isOpen]);

  const banMutation = useMutation({
    mutationFn: async () => {
      if (!applicant?.name) throw new Error("No applicant selected.");
      if (!country.trim()) throw new Error("Destination country is required.");
      if (!reason.trim()) throw new Error("A ban reason is required.");
      return await setCountryBanV2(applicant.name, country.trim(), reason.trim());
    },
    onSuccess: (res) => {
      toast.success(
        res?.message || `Country ban for ${country} imposed on ${applicant?.full_name || applicant?.name}.`
      );
      queryClient.invalidateQueries({ queryKey: ["v2_active_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_all_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_country_ban_requests"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const msg = formatCleanErrorMessage(err);
      setErrorNotice(msg);
      toast.error(msg);
    },
  });

  const applicantDisplayName =
    applicant?.full_name ||
    (applicant?.first_name ? `${applicant.first_name} ${applicant.last_name || ""}`.trim() : applicant?.name);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-[#15151b] border-slate-200 dark:border-[#2a2a35]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Impose Country Ban
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Permanently restrict candidate from registering or processing for a specific destination country.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Warning Consequence Banner */}
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Consequence of Restricting Applicant</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
              Applying this ban permanently blocks <strong>{applicantDisplayName}</strong> from registering, generating a CV, changing destination, or restarting for <strong>{country || "this country"}</strong>. To proceed later, an authorized manager must approve an exception request or lift the ban.
            </p>
          </div>

          {errorNotice && (
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
              {errorNotice}
            </div>
          )}

          {/* Applicant Info */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-[#1c1c24] rounded-lg border border-slate-200 dark:border-[#2a2a35]">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Candidate</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">{applicantDisplayName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Passport Number</span>
              <span className="font-mono text-slate-800 dark:text-zinc-200">{applicant?.passport_number || "—"}</span>
            </div>
          </div>

          {/* Destination Country */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Restricted Destination Country <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Saudi Arabia, Kuwait, etc."
              className="h-8 text-xs bg-white dark:bg-[#121217]"
            />
          </div>

          {/* Ban Reason */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Reason for Ban <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed explanation (e.g. returned worker, serious complaint, contract violation, biometric mismatch)..."
              rows={3}
              className="text-xs bg-white dark:bg-[#121217] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={banMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={banMutation.isPending || !country.trim() || !reason.trim()}
            onClick={() => banMutation.mutate()}
            className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
          >
            {banMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Imposing Ban...
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                Confirm Country Ban
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------------
// 2. MANAGE COUNTRY BAN MODAL (For applicants with an active ban)
// --------------------------------------------------------------------------

interface ManageCountryBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: BanApplicantTarget | null;
  activeBanRecord?: V2CountryBanRecord | null;
  isManagerOrAdmin: boolean;
  canSetBan?: boolean;
  onSuccess?: () => void;
}

export function ManageCountryBanModal({
  isOpen,
  onClose,
  applicant,
  activeBanRecord,
  isManagerOrAdmin,
  canSetBan = false,
  onSuccess,
}: ManageCountryBanModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"overview" | "request" | "history">("overview");

  // Lift state (Manager direct action)
  const [isLiftingOpen, setIsLiftingOpen] = React.useState(false);
  const [liftReason, setLiftReason] = React.useState("");

  // Exception request state (Registrars and staff)
  const [requestType, setRequestType] = React.useState<"Override" | "Lift">("Override");
  const [blockedAction, setBlockedAction] = React.useState<"Register" | "Generate CV" | "Restart" | "Change Destination">("Register");
  const [requestedDestination, setRequestedDestination] = React.useState("");
  const [exceptionReason, setExceptionReason] = React.useState("");
  const [exceptionError, setExceptionError] = React.useState<string | null>(null);

  // Undo lift state
  const [undoTargetBan, setUndoTargetBan] = React.useState<V2CountryBanRecord | null>(null);
  const [undoReason, setUndoReason] = React.useState("");

  // Fetch full applicant ban history (active + lifted)
  const {
    data: applicantBans = [],
    isLoading: isLoadingBans,
    refetch: refetchBans,
  } = useQuery<V2CountryBanRecord[]>({
    queryKey: ["v2_applicant_country_bans", applicant?.name],
    queryFn: () => listCountryBansV2(applicant!.name, 0),
    enabled: isOpen && Boolean(applicant?.name),
    staleTime: 5000,
  });

  // Fetch exception requests for this applicant
  const {
    data: applicantRequests = [],
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
  } = useQuery<V2CountryBanRequestItem[]>({
    queryKey: ["v2_applicant_country_ban_requests", applicant?.name],
    queryFn: () => listCountryBanRequestsV2(undefined, applicant!.name),
    enabled: isOpen && Boolean(applicant?.name),
    staleTime: 5000,
  });

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab("overview");
      setIsLiftingOpen(false);
      setLiftReason("");
      setExceptionReason("");
      setExceptionError(null);
      setUndoTargetBan(null);
      setUndoReason("");
      if (applicant?.destination_country) {
        setRequestedDestination(applicant.destination_country);
      }
    }
  }, [isOpen, applicant]);

  // Determine active ban from query or prop
  const currentActiveBan = React.useMemo(() => {
    if (activeBanRecord && (activeBanRecord.active === 1 || activeBanRecord.active === undefined)) {
      return activeBanRecord;
    }
    return applicantBans.find((b) => b.active === 1 || b.active === undefined) || null;
  }, [activeBanRecord, applicantBans]);

  const liftedBans = React.useMemo(() => {
    return applicantBans.filter((b) => b.active === 0);
  }, [applicantBans]);

  // Lift Ban Mutation (Manager direct action)
  const liftMutation = useMutation({
    mutationFn: async () => {
      if (!currentActiveBan?.name) throw new Error("No active ban found to lift.");
      return await removeCountryBanV2(currentActiveBan.name, liftReason.trim() || undefined);
    },
    onSuccess: (res) => {
      toast.success(res?.message || "Country ban lifted successfully.");
      queryClient.invalidateQueries({ queryKey: ["v2_active_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_all_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      setIsLiftingOpen(false);
      setLiftReason("");
      refetchBans();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  // Exception Request Mutation (Non-managers or staff)
  const exceptionMutation = useMutation({
    mutationFn: async () => {
      if (!applicant?.name) throw new Error("No applicant selected.");
      if (!exceptionReason.trim()) throw new Error("Reason is required for exception request.");
      if (requestType === "Override" && !blockedAction) {
        throw new Error("Specific blocked action is required for an Override request.");
      }
      return await requestCountryBanExceptionV2(
        applicant.name,
        requestType,
        exceptionReason.trim(),
        requestType === "Override" ? blockedAction : undefined,
        requestType === "Override" && blockedAction === "Change Destination" ? requestedDestination.trim() : undefined
      );
    },
    onSuccess: (res) => {
      toast.success(res?.message || "Ban exception request submitted to managers successfully.");
      queryClient.invalidateQueries({ queryKey: ["v2_country_ban_requests"] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_country_ban_requests"] });
      setExceptionReason("");
      setExceptionError(null);
      refetchRequests();
      setActiveTab("overview");
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = formatCleanErrorMessage(err);
      setExceptionError(msg);
      toast.error(msg);
    },
  });

  // Undo Lift Mutation (Restores previously lifted ban)
  const undoLiftMutation = useMutation({
    mutationFn: async () => {
      if (!undoTargetBan?.name) throw new Error("No ban selected to restore.");
      return await undoCountryBanLiftV2(undoTargetBan.name, undoReason.trim() || undefined);
    },
    onSuccess: (res) => {
      toast.success(res?.message || "Lift undone. Country ban restored to Active status.");
      queryClient.invalidateQueries({ queryKey: ["v2_active_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_all_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_country_bans"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      setUndoTargetBan(null);
      setUndoReason("");
      refetchBans();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  const applicantDisplayName =
    applicant?.full_name ||
    (applicant?.first_name ? `${applicant.first_name} ${applicant.last_name || ""}`.trim() : applicant?.name);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#15151b] border-slate-200 dark:border-[#2a2a35] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#181820]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Country Ban Management
              </DialogTitle>
              {currentActiveBan ? (
                <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-bold text-[10px]">
                  Active Ban
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-400 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-[10px]">
                  No Active Ban
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Candidate: <strong>{applicantDisplayName}</strong> {applicant?.passport_number ? `(${applicant.passport_number})` : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Subtabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTab === "overview"
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900"
                  : "bg-slate-200/70 dark:bg-[#202028] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Active Ban & Actions</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("request")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTab === "request"
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900"
                  : "bg-slate-200/70 dark:bg-[#202028] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              )}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Request Exception</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                activeTab === "history"
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900"
                  : "bg-slate-200/70 dark:bg-[#202028] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
              )}
            >
              <History className="h-3.5 w-3.5" />
              <span>History & Log</span>
              {(liftedBans.length > 0 || applicantRequests.length > 0) && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-300 dark:bg-zinc-700 font-mono">
                  {liftedBans.length + applicantRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: OVERVIEW & ACTIVE BAN */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {currentActiveBan ? (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">
                        Restricted Destination
                      </span>
                      <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">
                        {currentActiveBan.country}
                      </h4>
                    </div>
                    <Badge className="bg-rose-600 text-white font-mono text-[10px]">
                      Restricted
                    </Badge>
                  </div>

                  <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                      Ban Justification
                    </span>
                    <p className="p-2.5 bg-white/80 dark:bg-[#121217]/80 rounded-lg border border-rose-200/70 dark:border-rose-900/40 leading-relaxed font-sans">
                      {stripRecordIds(currentActiveBan.reason || "No explicit reason logged.")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400 pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Imposed by: <strong>{currentActiveBan.set_by_name || currentActiveBan.set_by || "System"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Date: {currentActiveBan.set_on || currentActiveBan.creation?.split(" ")[0] || "—"}</span>
                    </div>
                  </div>

                  {/* Manager Direct Lift Section */}
                  {isManagerOrAdmin && (
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 space-y-2">
                      {!isLiftingOpen ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-zinc-400 text-xs">
                            Authorized managers may remove this ban directly:
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setIsLiftingOpen(true)}
                            className="h-7 text-xs bg-rose-700 hover:bg-rose-800"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                            Lift Country Ban
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white dark:bg-[#15151b] rounded-lg border border-slate-200 dark:border-[#2a2a35] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-800 dark:text-rose-400">
                              Confirm Lifting Country Ban
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsLiftingOpen(false)}
                              className="h-6 text-xs text-slate-400"
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Lifting this ban will immediately restore applicant access. The ban will remain in the audit history.
                          </p>
                          <div>
                            <Label className="text-xs font-semibold mb-1 block">
                              Reason for Lifting Ban (Recommended)
                            </Label>
                            <Input
                              value={liftReason}
                              onChange={(e) => setLiftReason(e.target.value)}
                              placeholder="e.g. Case resolved, dispute settled, agency verified clearance..."
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              disabled={liftMutation.isPending}
                              onClick={() => liftMutation.mutate()}
                              className="bg-emerald-800 hover:bg-emerald-900 text-white h-7 text-xs font-semibold"
                            >
                              {liftMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              Confirm Lift Ban
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#222228] p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    No Active Country Ban
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                    This candidate is currently clear of all destination restrictions and can proceed through normal workflow stages.
                  </p>
                </div>
              )}

              {/* Active / Pending Requests Snapshot */}
              {applicantRequests.filter((r) => r.status === "Pending" || r.status === "Approved").length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Active Exception Requests
                  </h5>
                  <div className="space-y-2">
                    {applicantRequests
                      .filter((r) => r.status === "Pending" || r.status === "Approved")
                      .map((req) => (
                        <div
                          key={req.name}
                          className="p-3 bg-slate-50 dark:bg-[#181820] rounded-lg border border-slate-200 dark:border-[#26262e] flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {req.request_type} {req.action ? `(${req.action})` : ""}
                              </span>
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  req.status === "Pending" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                                )}
                              >
                                {req.status === "Approved" ? "Approved (One-Time Pass Ready)" : "Pending Review"}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {stripRecordIds(req.reason)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Requested by: {req.requested_by || "Staff"} • {req.creation?.split(" ")[0]}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REQUEST EXCEPTION / OVERRIDE */}
          {activeTab === "request" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>How Ban Exceptions Work</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  • <strong>Override</strong>: Request a one-time pass tied to a specific blocked action. When a manager approves it, retry that action once without being blocked. The pass is consumed automatically.
                  <br />
                  • <strong>Lift</strong>: Request permanent removal of the country restriction.
                </p>
              </div>

              {exceptionError && (
                <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                  {exceptionError}
                </div>
              )}

              {/* Request Type Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Request Type <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("Override")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5",
                      requestType === "Override"
                        ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                        : "border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217] text-slate-600 dark:text-zinc-400"
                    )}
                  >
                    <span className="font-bold text-xs">Action Override</span>
                    <span className="text-[10px] text-slate-500">One-time pass for a blocked operation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType("Lift")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5",
                      requestType === "Lift"
                        ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                        : "border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217] text-slate-600 dark:text-zinc-400"
                    )}
                  >
                    <span className="font-bold text-xs">Permanent Lift</span>
                    <span className="text-[10px] text-slate-500">Ask manager to lift the ban completely</span>
                  </button>
                </div>
              </div>

              {/* Blocked Action (For Override) */}
              {requestType === "Override" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Blocked Action to Unlock <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={blockedAction}
                    onChange={(e) => setBlockedAction(e.target.value as any)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#121217] text-slate-800 dark:text-zinc-200"
                  >
                    <option value="Register">Register (Draft → Registered)</option>
                    <option value="Generate CV">Generate CV</option>
                    <option value="Restart">Restart (Cancelled / Returned → Draft)</option>
                    <option value="Change Destination">Change Destination</option>
                  </select>
                </div>
              )}

              {/* Requested Destination Country (If changing destination) */}
              {requestType === "Override" && blockedAction === "Change Destination" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Target Destination Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={requestedDestination}
                    onChange={(e) => setRequestedDestination(e.target.value)}
                    placeholder="e.g. Saudi Arabia, Kuwait, etc."
                    className="h-8 text-xs bg-white dark:bg-[#121217]"
                  />
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Justification for Exception <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Explain why this applicant should be granted an exception (e.g. clearance verified, erroneous flag, employer agreement)..."
                  rows={3}
                  className="text-xs bg-white dark:bg-[#121217] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={
                    exceptionMutation.isPending ||
                    !exceptionReason.trim() ||
                    (requestType === "Override" && blockedAction === "Change Destination" && !requestedDestination.trim())
                  }
                  onClick={() => exceptionMutation.mutate()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                >
                  {exceptionMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Submit Exception Request
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: BAN HISTORY & REQUEST AUDIT LOG */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Lifted Bans Section */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                  Historical Lifted Bans
                </h5>
                {liftedBans.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-[#26262e] text-center text-slate-400 text-xs">
                    No lifted ban records in historical archive.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {liftedBans.map((ban) => (
                      <div
                        key={ban.name}
                        className="p-3 bg-slate-50 dark:bg-[#181820] rounded-lg border border-slate-200 dark:border-[#26262e] text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {ban.country}
                          </div>
                          <Badge variant="outline" className="border-slate-300 dark:border-zinc-700 text-slate-500 text-[10px]">
                            Lifted
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400">
                          Initial Reason: <em>{stripRecordIds(ban.reason || "None")}</em>
                        </div>
                        <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded border border-emerald-200/50 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-300 space-y-0.5">
                          <div>Lifted by: <strong>{ban.lifted_by_name || ban.lifted_by || "Manager"}</strong> on {ban.lifted_on || "—"}</div>
                          {ban.lift_reason && <div>Lift Reason: <em>{ban.lift_reason}</em></div>}
                        </div>

                        {/* Undo Lift Option for Managers */}
                        {isManagerOrAdmin && (
                          <div className="pt-1 flex justify-end">
                            {undoTargetBan?.name === ban.name ? (
                              <div className="w-full p-2 bg-white dark:bg-[#121217] rounded border border-amber-300 dark:border-amber-800 space-y-2">
                                <span className="font-bold text-amber-800 dark:text-amber-400 text-xs block">
                                  Restore this Ban?
                                </span>
                                <Input
                                  value={undoReason}
                                  onChange={(e) => setUndoReason(e.target.value)}
                                  placeholder="Reason for restoring ban..."
                                  className="h-7 text-xs"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setUndoTargetBan(null)}
                                    className="h-6 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={undoLiftMutation.isPending}
                                    onClick={() => undoLiftMutation.mutate()}
                                    className="h-6 text-xs bg-rose-700 hover:bg-rose-800 text-white"
                                  >
                                    Confirm Restore
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setUndoTargetBan(ban);
                                  setUndoReason("");
                                }}
                                className="h-6 text-[10.5px] text-amber-700 border-amber-300 dark:border-amber-800 hover:bg-amber-50"
                              >
                                <RotateCcw className="h-2.5 w-2.5 mr-1" />
                                Undo Lift (Restore Ban)
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exception Requests Audit List */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#222228]">
                <h5 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Past Exception Requests
                </h5>
                {applicantRequests.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-[#26262e] text-center text-slate-400 text-xs">
                    No exception requests filed for this candidate.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {applicantRequests.map((req) => (
                      <div
                        key={req.name}
                        className="p-3 bg-slate-50 dark:bg-[#181820] rounded-lg border border-slate-200 dark:border-[#26262e] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {req.request_type} {req.action ? `• ${req.action}` : ""}
                          </span>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              req.status === "Pending" && "bg-amber-500 text-white",
                              req.status === "Approved" && "bg-emerald-600 text-white",
                              req.status === "Used" && "bg-blue-600 text-white",
                              req.status === "Rejected" && "bg-rose-600 text-white"
                            )}
                          >
                            {req.status === "Approved" ? "Approved (One-Time Pass)" : req.status === "Used" ? "Pass Redeemed" : req.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-300">
                          {stripRecordIds(req.reason)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                          <span>Requested: {req.requested_by || "Staff"}</span>
                          {req.decided_by && (
                            <span>Decided: {req.decided_by} ({req.decided_on?.split(" ")[0]})</span>
                          )}
                        </div>
                        {req.note && (
                          <div className="text-[10.5px] italic text-slate-500 dark:text-zinc-400 pl-1 border-l-2 border-slate-300 dark:border-zinc-700">
                            Decision Note: {req.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#222228] bg-slate-50 dark:bg-[#181820] flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
