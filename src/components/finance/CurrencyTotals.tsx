"use client";

import * as React from "react";

export interface CurrencyTotalsProps {
  totals: Record<string, number> | Array<{ currency: string; amount: number }>;
  className?: string;
  badgeClassName?: string;
}

/**
 * Displays one total per currency; never adds amounts of different currencies together.
 * Per specification D-30 / 2026-10-05.
 */
export function CurrencyTotals({ totals, className = "", badgeClassName = "" }: CurrencyTotalsProps) {
  const entries: [string, number][] = React.useMemo(() => {
    if (Array.isArray(totals)) {
      const map: Record<string, number> = {};
      for (const item of totals) {
        if (!item || !item.currency) continue;
        map[item.currency] = (map[item.currency] || 0) + (Number(item.amount) || 0);
      }
      return Object.entries(map);
    }
    if (typeof totals === "object" && totals !== null) {
      return Object.entries(totals).map(([curr, amt]) => [curr, Number(amt) || 0]);
    }
    return [];
  }, [totals]);

  if (entries.length === 0) {
    return <span className="text-xs text-slate-400 font-mono">—</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {entries.map(([curr, amt]) => (
        <span
          key={curr}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold border border-slate-200 dark:border-[#2b2b36] bg-slate-50 dark:bg-[#18181f] text-slate-800 dark:text-zinc-200 ${badgeClassName}`}
        >
          <span>{amt.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 font-sans">{curr}</span>
        </span>
      ))}
    </div>
  );
}
