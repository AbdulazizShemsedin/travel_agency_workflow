"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  CreditCard,
  FileText,
  FileCheck2,
  Plane,
  Globe2,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { OperationalStreamType } from "@/types/workspace";
import {
  fetchOperationalWorkspaceData,
  getEmployeesList,
} from "@/lib/api/applicantApi";
import { LMISWorkspace } from "./workspaces/LMISWorkspace";
import { InjazWorkspace } from "./workspaces/InjazWorkspace";
import { WakalaWorkspace } from "./workspaces/WakalaWorkspace";
import { EmbassyWorkspace } from "./workspaces/EmbassyWorkspace";
import { DepartureWorkspace } from "./workspaces/DepartureWorkspace";
import { ApplicantTable } from "@/components/applicant/ApplicantTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export function RoleWorkspaceContainer() {
  const { authUser, roles } = useAuth();

  // Determine if user has administrator privileges
  const isAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = (typeof r === "string" ? r : "").trim().toLowerCase();
      return norm === "system manager" || norm === "administrator" || norm === "agency admin";
    });
  }, [authUser, roles]);

  const allTabsConfig = [
    { id: "directory", label: "Directory", icon: Users, desc: "All Candidates" },
    { id: "lms", label: "LMIS", icon: FileCheck2, desc: "Ministry & COC" },
    { id: "injaz", label: "Te'shir / Injaz", icon: CreditCard, desc: "Saudi MOFA" },
    { id: "wakala", label: "Wakala", icon: FileText, desc: "Musaned Authorization" },
    { id: "embassy", label: "Embassy & Stamping", icon: Building2, desc: "Passport Visa" },
    { id: "departure", label: "Ticket & Departure", icon: Plane, desc: "Flight & Dispatch" },
  ];

  // Determine available tabs for current user
  const availableTabs = React.useMemo(() => {
    if (isAdmin) return allTabsConfig;

    const r = (roles || []).map((x) => String(x).toLowerCase().trim()).join(" ");
    const allowed: string[] = [];

    if (r.includes("lms") || r.includes("lmis") || r.includes("clearance")) allowed.push("lms");
    if (r.includes("injaz") || r.includes("teshir") || r.includes("te'shir")) allowed.push("injaz");
    if (r.includes("wakala")) allowed.push("wakala");
    if (r.includes("embassy")) allowed.push("embassy");
    if (r.includes("ticket") || r.includes("departure")) allowed.push("departure");
    if (r.includes("recruiter") || r.includes("intake") || r.includes("applicant viewer") || allowed.length === 0) {
      if (allowed.length === 0) allowed.push("directory");
    }

    return allTabsConfig.filter((tab) => allowed.includes(tab.id));
  }, [isAdmin, roles]);

  const defaultTab = React.useMemo<string>(() => {
    return availableTabs[0]?.id || (isAdmin ? "directory" : "lms");
  }, [availableTabs, isAdmin]);

  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);
  const [corridorFilter, setCorridorFilter] = React.useState<string>("All");

  // Keep activeTab synced with defaultTab on mount/role changes
  React.useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [availableTabs, defaultTab, activeTab]);

  // Fetch employees list for drawers
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesList,
  });

  // Fetch live workspace data for active operational stream
  const isOperationalTab = activeTab !== "directory";
  const streamType = (isOperationalTab ? activeTab : "lms") as OperationalStreamType;

  const {
    data: workspaceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["operational_workspace", streamType, corridorFilter],
    queryFn: () => fetchOperationalWorkspaceData(streamType, corridorFilter),
    enabled: isOperationalTab,
    staleTime: 10000,
  });

  // Workspace Titles & Descriptions for header
  const getHeaderInfo = () => {
    if (isAdmin) {
      return {
        title: "Applicant Processing",
        subtitle: "Comprehensive candidate lifecycle management and operational workspaces.",
      };
    }
    if (activeTab === "lms") {
      return {
        title: "LMIS Clearance Workspace",
        subtitle: "Ministry of Labor clearance, quota compliance, and candidate COC verification.",
      };
    }
    if (activeTab === "injaz") {
      return {
        title: "Te'shir / Injaz MOFA Processing",
        subtitle: "Saudi MOFA electronic visa application, fee settlement, and biometric appointment tracking.",
      };
    }
    if (activeTab === "wakala") {
      return {
        title: "Wakala Authorization Workspace",
        subtitle: "Musaned electronic power of attorney verification and agency payment confirmation.",
      };
    }
    if (activeTab === "embassy") {
      return {
        title: "Embassy Clearance & Visa Stamping",
        subtitle: "Diplomatic mission submission, embassy fee receipts, and passport visa sticker stamping.",
      };
    }
    if (activeTab === "departure") {
      return {
        title: "Flight Ticketing & Departure Workspace",
        subtitle: "Airline ticket reservation, Pre-departure Medical 2 fitness, and Bole Airport dispatch.",
      };
    }
    return {
      title: "Applicant Processing",
      subtitle: "Role-based candidate operational workspace.",
    };
  };

  const headerInfo = getHeaderInfo();

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
          {isAdmin && (
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
      {/* Operational Workspace Navigation Tabs (Shown if >1 Tab Available) */}
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
                  "flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap",
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
      {/* Active Operational Workspace Rendering                        */}
      {/* ------------------------------------------------------------- */}
      <div>
        {activeTab === "directory" && <ApplicantTable />}

        {activeTab === "lms" && (
          <LMISWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "injaz" && (
          <InjazWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "wakala" && (
          <WakalaWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "embassy" && (
          <EmbassyWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "departure" && (
          <DepartureWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}
      </div>
    </div>
  );
}
