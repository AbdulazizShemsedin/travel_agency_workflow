"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertOctagon, AlertTriangle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  icon: CustomIcon,
}: ConfirmationModalProps) {
  const IconComponent =
    CustomIcon ||
    (variant === "danger"
      ? AlertOctagon
      : variant === "warning"
      ? AlertTriangle
      : Info);

  const iconContainerStyles =
    variant === "danger"
      ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
      : variant === "warning"
      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60"
      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  const confirmButtonStyles =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
      : "bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold shadow-xs";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6 bg-white dark:bg-[#131317] border border-slate-200 dark:border-[#262630] shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-3 sm:text-left">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                iconContainerStyles
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100 dark:border-[#1f1f26] mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold h-9 px-4 border-slate-300 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a1a20]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn("text-xs h-9 px-4", confirmButtonStyles)}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
