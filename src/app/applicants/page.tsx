import * as React from "react";
import dynamic from "next/dynamic";

const RoleWorkspaceContainer = dynamic(
  () => import("@/components/operational/RoleWorkspaceContainer").then((m) => m.RoleWorkspaceContainer),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="animate-pulse rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216]">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-[#222227] px-4 py-3.5">
            <div className="h-3 w-40 rounded-xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-3 w-24 rounded-xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-3 w-32 rounded-xl bg-slate-200 dark:bg-zinc-800 ml-auto" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-slate-100 dark:border-[#1b1b22] px-4 py-4 last:border-0"
            >
              <div className="h-3 w-36 rounded-xl bg-slate-200 dark:bg-zinc-800" />
              <div className="h-3 w-20 rounded-xl bg-slate-200 dark:bg-zinc-800" />
              <div className="h-3 w-28 rounded-xl bg-slate-200 dark:bg-zinc-800" />
              <div className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-zinc-800 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

export default function ApplicantsPage() {
  return (
    <div className="space-y-6">
      <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading applicants workspace...</div>}>
        <RoleWorkspaceContainer />
      </React.Suspense>
    </div>
  );
}