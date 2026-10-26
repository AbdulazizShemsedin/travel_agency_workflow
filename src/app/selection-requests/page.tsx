"use client";

import * as React from "react";
import Link from "next/link";
import { SelectionRequestsWorkspace } from "@/components/operational/workspaces/SelectionRequestsWorkspace";
import { useAuth } from "@/components/providers/AuthProvider";
import { ShieldAlert, ArrowLeft, Inbox } from "lucide-react";

export default function SelectionRequestsPage() {
  const { roles, can } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase().trim()) : [];
  const isAllowed =
    can("manageSelectionRequests") ||
    userRoles.some((r) =>
      ["registrar", "manager", "admin", "system manager", "administrator"].includes(r)
    );

  if (!isAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
            Selection Requests management is restricted to authorized Registrars, Managers, and Administrators.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col space-y-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200 dark:border-[#222228] shrink-0">
        <div>
          <Link
            href="/applicants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-0.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicants Workspace
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
              <Inbox className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Selection Requests & Unavailable Candidates
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Review agency candidate selection requests oldest-first, confirm availability, or mark unavailable candidates.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex flex-col">
        <SelectionRequestsWorkspace />
      </div>
    </div>
  );
}
