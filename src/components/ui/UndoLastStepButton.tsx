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
} from "@/lib/api/v2/undo";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { cn } from "@/lib/utils";

export interface UndoLastStepButtonProps {
  doctype: UndoableDocType;
  name: string;
  label?: string;
  onSuccess?: () => void;
  className?: string;
  variant?: "outline" | "ghost" | "default" | "destructive" | "secondary";
  size?: "sm" | "default" | "lg";
}

export function UndoLastStepButton({
  doctype,
  name,
  label = "Undo Last Step",
  onSuccess,
  className,
  variant = "outline",
  size = "sm",
}: UndoLastStepButtonProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const {
    data: undoInfo,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["undoable_step", doctype, name],
    queryFn: () => getUndoableStepV2(doctype, name),
    enabled: !!name,
    staleTime: 5000,
  });

  const undoMutation = useMutation({
    mutationFn: () =>
      reverseLastStepV2(doctype, name, undoInfo?.from_status, reason.trim() || undefined),
    onSuccess: (res) => {
      setIsModalOpen(false);
      setReason("");
      toast.success(
        res?.message ||
          `Reversed ${undoInfo?.from_status || "step"}${
            undoInfo?.to_status ? ` back to ${undoInfo.to_status}` : ""
          }`
      );
      queryClient.invalidateQueries({ queryKey: ["undoable_step", doctype, name] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      queryClient.invalidateQueries({ queryKey: ["placement"] });
      queryClient.invalidateQueries({ queryKey: ["clearance"] });
      queryClient.invalidateQueries({ queryKey: ["complaint"] });
      queryClient.invalidateQueries({ queryKey: ["agent_portal"] });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error("Failed to undo last step", {
        description: formatCleanErrorMessage(err),
      });
      refetch();
    },
  });

  if (isLoading || !undoInfo || !undoInfo.available) {
    return null;
  }

  const isBlocked = Boolean(undoInfo.blocked);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={isBlocked || undoMutation.isPending}
        title={isBlocked ? undoInfo.blocked : undefined}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "gap-1.5 text-xs font-semibold",
          isBlocked && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        {undoMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Undo2 className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Confirm Step Reversal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
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
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {isBlocked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{undoInfo.blocked}</p>
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
              disabled={isBlocked || undoMutation.isPending}
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
