"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Undo2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getUndoableStepV2,
  reverseLastStepV2,
  UndoableDocType,
  UndoableStepInfo,
} from "@/lib/api/v2/undo";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export interface UndoLastStepButtonProps {
  doctype: UndoableDocType;
  name: string;
  label?: string;
  onSuccess?: () => void;
  className?: string;
  variant?: "outline" | "ghost" | "default" | "destructive" | "secondary";
  size?: "sm" | "default" | "lg";
  /** Optional: show text explanation next to disabled button when blocked */
  showBlockedText?: boolean;
  /** Deprecated compatibility prop - queries are now cleanly performed per record */
  askOnClick?: boolean;
}

export function UndoLastStepButton({
  doctype,
  name,
  label = "Undo",
  onSuccess,
  className,
  variant = "outline",
  size = "sm",
  showBlockedText = false,
}: UndoLastStepButtonProps) {
  const queryClient = useQueryClient();
  const { authUser, isReadOnly } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  // Rule 0.-24: View-only roles (`read_only_roles`) never see Undo.
  const isAdminOrManager = React.useMemo(() => {
    const roles = authUser?.roles || [];
    return roles.some((r) =>
      ["Admin", "Manager", "System Manager", "Administrator"].includes(r)
    );
  }, [authUser]);

  const isViewOnlyUser = React.useMemo(() => {
    if (isAdminOrManager) return false;
    if (isReadOnly()) return true;
    const ro = authUser?.read_only_roles || [];
    return ro.length > 0;
  }, [isAdminOrManager, isReadOnly, authUser]);

  // Rule 0.-24: One call per record shown.
  // Never let an Undo error blank the screen (catch errors and preserve existing page state).
  const {
    data: undoInfo,
    isLoading,
    refetch,
  } = useQuery<UndoableStepInfo>({
    queryKey: ["undoable_step", doctype, name],
    queryFn: async (): Promise<UndoableStepInfo> => {
      try {
        if (!name) return { available: false, blocked: null };
        const result = await getUndoableStepV2(doctype, name);
        return (
          result || {
            available: false,
            blocked: null,
          }
        );
      } catch (err) {
        console.warn(`[UndoLastStepButton] get_undoable_step error for ${doctype} ${name}:`, err);
        return {
          available: false,
          blocked: null,
        };
      }
    },
    enabled: !!name && !isViewOnlyUser,
    staleTime: 5000,
    retry: 0,
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      // Send from_status with reverse_last_step(doctype, name, from_status, reason?)
      return await reverseLastStepV2(
        doctype,
        name,
        undoInfo?.from_status,
        reason.trim() || undefined
      );
    },
    onSuccess: (res) => {
      setIsModalOpen(false);
      setReason("");
      toast.success(
        res?.message ||
          `Reversed ${undoInfo?.from_status || "step"}${
            undoInfo?.to_status ? ` back to ${undoInfo.to_status}` : ""
          }`
      );
      // Invalidate relevant queries so the full record is reloaded from API
      queryClient.invalidateQueries({ queryKey: ["undoable_step", doctype, name] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["placement"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["clearance"] });
      queryClient.invalidateQueries({ queryKey: ["clearance_step"] });
      queryClient.invalidateQueries({ queryKey: ["clearance_steps_for_applicant"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["complaint"] });
      queryClient.invalidateQueries({ queryKey: ["agent_portal"] });
      queryClient.invalidateQueries({ queryKey: ["v2_transactions"] });

      // Ask again after every change / action
      refetch();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error("Failed to undo last step", {
        description: formatCleanErrorMessage(err),
      });
      // Refresh eligibility state after error
      refetch();
    },
  });

  // View-only roles never see Undo
  if (isViewOnlyUser) {
    return null;
  }

  // Still loading eligibility check: render nothing until resolved
  if (isLoading) {
    return null;
  }

  // Rule 0.-24: When available: false -> hide Undo
  if (!undoInfo || !undoInfo.available) {
    return null;
  }

  // Rule 0.-24: When available: true, blocked: "<message>" -> greyed out (disabled) Undo button
  // with message next to it / tooltip. Never hide if blocked!
  const isBlocked = Boolean(undoInfo.blocked);
  const blockedMessage = typeof undoInfo.blocked === "string" ? undoInfo.blocked : "Step reversal blocked";

  if (isBlocked) {
    return (
      <div className="inline-flex items-center gap-1.5" title={blockedMessage}>
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={true}
          title={blockedMessage}
          className={cn(
            "gap-1 text-xs font-semibold opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700 select-none",
            className
          )}
        >
          <Undo2 className="h-3 w-3" />
          <span>{label}</span>
        </Button>
        {showBlockedText && (
          <span
            className="text-[10px] text-amber-700 dark:text-amber-400 max-w-[150px] truncate"
            title={blockedMessage}
          >
            {blockedMessage}
          </span>
        )}
      </div>
    );
  }

  // Rule 0.-24: When available: true, blocked: null -> active Undo button
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={undoMutation.isPending}
        title={`Undo last step (revert from ${undoInfo.from_status || "current status"}${undoInfo.to_status ? ` to ${undoInfo.to_status}` : ""})`}
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={cn("gap-1 text-xs font-semibold cursor-pointer", className)}
      >
        {undoMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Undo2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        )}
        <span>{label}</span>
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Confirm Step Reversal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {undoInfo.available ? (
                <>
                  This will safely reverse {doctype} from{" "}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {undoInfo.from_status || "current status"}
                  </strong>{" "}
                  {undoInfo.to_status && (
                    <>
                      back to{" "}
                      <strong className="text-slate-800 dark:text-zinc-200">
                        {undoInfo.to_status}
                      </strong>
                    </>
                  )}
                  .
                </>
              ) : (
                <span>No step reversal is currently available for this record.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {isBlocked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{blockedMessage}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="undo-reason" className="text-xs font-medium">
                  Reason for reversal (optional)
                </Label>
                <Input
                  id="undo-reason"
                  placeholder="e.g. Documentation corrected, candidate requested change"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={undoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBlocked || !undoInfo.available || undoMutation.isPending}
              onClick={() => undoMutation.mutate()}
              className="gap-1.5"
            >
              {undoMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
