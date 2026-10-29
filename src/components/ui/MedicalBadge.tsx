"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { V2MedicalCurrent } from "@/lib/api/v2/medical";
import { cn } from "@/lib/utils";

export interface MedicalBadgeProps {
  medicalCurrent?: V2MedicalCurrent | null;
  fallbackStatus?: string | null;
  fallbackExpired?: boolean;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Standardized Medical Status Badge implementing Rule 0.-22:
 * Displays `medical_current.status` accompanied by its workflow `stage`
 * (e.g. "FIT · Selection", "UNFIT · Pre-departure", "FIT (expired) · Registration"),
 * with resilient fallback to legacy `medical_status` when `medical_current` is not yet present.
 */
export function MedicalBadge({
  medicalCurrent,
  fallbackStatus,
  fallbackExpired = false,
  className,
  size = "default",
}: MedicalBadgeProps) {
  // 1. Authoritative 0.-22: medical_current takes absolute priority when populated
  if (medicalCurrent && medicalCurrent.status) {
    const rawStatus = medicalCurrent.status.toUpperCase();
    const isFit = rawStatus === "FIT";
    const isUnfit = rawStatus === "UNFIT";
    const isPending = rawStatus === "PENDING";
    const isExpired = Boolean(medicalCurrent.expired);
    const stage = medicalCurrent.stage;

    let statusDisplay = rawStatus;
    if (isFit && isExpired) {
      statusDisplay = "FIT (expired)";
    }

    const label = stage ? `${statusDisplay} · ${stage}` : statusDisplay;

    let colorClass =
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    if (isUnfit) {
      colorClass =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    } else if (isFit && isExpired) {
      colorClass =
        "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    } else if (isFit) {
      colorClass =
        "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    } else if (isPending) {
      colorClass =
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border whitespace-nowrap",
          size === "sm" ? "text-[10px] px-1.5 py-0.5 leading-tight" : "text-xs px-2 py-0.5",
          colorClass,
          className
        )}
      >
        {label}
      </Badge>
    );
  }

  // 2. Fallback to legacy single status (e.g. medical_status)
  if (!fallbackStatus || fallbackStatus === "—" || fallbackStatus === "None") {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const rawFallback = fallbackStatus.toUpperCase();
  const isExpired = fallbackExpired || rawFallback.includes("EXPIRED");
  const isFit = rawFallback === "FIT" || rawFallback.startsWith("FIT");
  const isUnfit = rawFallback === "UNFIT";
  const isPending = rawFallback === "PENDING" || rawFallback === "IN PROGRESS";

  let statusDisplay = isFit && isExpired ? "FIT (expired)" : fallbackStatus;

  let colorClass =
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  if (isUnfit) {
    colorClass =
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  } else if (isFit && isExpired) {
    colorClass =
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  } else if (isFit) {
    colorClass =
      "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  } else if (isPending) {
    colorClass =
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border whitespace-nowrap",
        size === "sm" ? "text-[10px] px-1.5 py-0.5 leading-tight" : "text-xs px-2 py-0.5",
        colorClass,
        className
      )}
    >
      {statusDisplay}
    </Badge>
  );
}

