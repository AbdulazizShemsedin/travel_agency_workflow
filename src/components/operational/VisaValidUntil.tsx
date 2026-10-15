"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface VisaValidUntilProps {
  deadline?: string | null;
  className?: string;
}

export function VisaValidUntil({ deadline, className }: VisaValidUntilProps) {
  if (!deadline) {
    return <span className="text-slate-400 font-mono text-xs">—</span>;
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
        {deadline}
      </span>
      <span
        className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap",
          diffDays < 0
            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
            : diffDays <= 7
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
        )}
      >
        {diffDays < 0
          ? `${Math.abs(diffDays)}d expired`
          : diffDays === 0
          ? "Expires today"
          : `${diffDays}d remaining`}
      </span>
    </div>
  );
}
