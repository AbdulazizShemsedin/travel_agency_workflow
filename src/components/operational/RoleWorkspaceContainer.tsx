"use client";

import * as React from "react";
import {
  Users,
  ShieldCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { V2ClearanceQueueWorkspace } from "./V2ClearanceQueueWorkspace";
import { ApplicantTable } from "@/components/applicant/ApplicantTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export function RoleWorkspaceContainer() {
  const { authUser, roles } = useAuth();

  // Determine if user has administrator or management privileges
  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin"
      );
    });
  }, [authUser, roles]);

  const allTabsConfig = [
    {
      id: "clearance",
      label: "Clearance Queue",
      icon: ShieldCheck,
      desc: "Role-scoped V2 Clearance Steps",
    },
    {
      id: "directory",
      label: "Candidate Directory",
      icon: Users,
      desc: "All Registered Candidates",
    },
  ];

  // Both Clearance Queue and Candidate Directory tabs are accessible
  const availableTabs = React.useMemo(() => {
    return allTabsConfig;
  }, []);

  const defaultTab = "clearance";
  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);

  // Keep activeTab synced with defaultTab on role or tab changes
  React.useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [availableTabs, defaultTab, activeTab]);

  // Dynamic Workspace Titles & Descriptions for header
  const headerInfo = React.useMemo(() => {
    if (activeTab === "clearance") {
      return {
        title: "Operational Clearance Queue",
        subtitle: "Dynamic corridor stages and role-scoped clearance step execution.",
      };
    }
    return {
      title: "Applicant Directory",
      subtitle: "Comprehensive candidate registration and intake registry.",
    };
  }, [activeTab]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* Top Header Bar                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {headerInfo.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {headerInfo.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManagerOrAdmin && (
            <Link href="/applicants/new">
              <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-xs font-semibold text-xs h-9">
                <Plus className="mr-1.5 h-4 w-4" />
                New Applicant
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Workspace Navigation Tabs (Shown if >1 Tab Available)        */}
      {/* ------------------------------------------------------------- */}
      {availableTabs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-[#272730] scrollbar-none">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap",
                  isActive
                    ? "border-emerald-700 dark:border-emerald-500 text-emerald-950 dark:text-emerald-400 bg-emerald-50/50 dark:bg-[#13241d]/50"
                    : "border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#181820]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Active Operational View                                       */}
      {/* ------------------------------------------------------------- */}
      <div>
        {activeTab === "clearance" && <V2ClearanceQueueWorkspace />}
        {activeTab === "directory" && <ApplicantTable />}
      </div>
    </div>
  );
}
