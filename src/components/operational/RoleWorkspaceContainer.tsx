"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  CreditCard,
  FileCheck2,
  Plane,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OperationalStreamType } from "@/types/workspace";
import { fetchOperationalWorkspaceDataV2 } from "@/lib/api/v2/operational";
import { listEmployeeRosterV2 } from "@/lib/api/v2/employees";
import { LMISWorkspace } from "./workspaces/LMISWorkspace";
import { InjazWorkspace } from "./workspaces/InjazWorkspace";
import { EmbassyWorkspace } from "./workspaces/EmbassyWorkspace";
import { DepartureWorkspace } from "./workspaces/DepartureWorkspace";
import { V2ClearanceQueueWorkspace } from "./V2ClearanceQueueWorkspace";
import { ApplicantTable } from "@/components/applicant/ApplicantTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export function RoleWorkspaceContainer() {
  const { authUser, roles, can } = useAuth();

  // Determine if user has administrator or manager privileges
  const isAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    // Use the authoritative permission check (covers System Manager, Administrator, Admin, Manager, Agency Admin)
    if (can("manageUsers")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin" ||
        norm === "admin" ||
        norm === "agency admin"
      );
    });
  }, [authUser, roles, can]);


  const canRegister = can("registerApplicant");

  const allTabsConfig = [
    { id: "directory", label: "Applicant List", icon: Users, desc: "All Candidates" },
    { id: "lms", label: "LMIS Clearance", icon: FileCheck2, desc: "Ministry & COC" },
    { id: "injaz", label: "Te'shir / Injaz", icon: CreditCard, desc: "Saudi MOFA & Biometrics" },
    { id: "embassy", label: "Embassy & Stamping", icon: Building2, desc: "Embassy, Wakala & Stamping" },
    { id: "departure", label: "Ticket & Departure", icon: Plane, desc: "Flight & Departure" },
    { id: "clearance", label: "Clearance List", icon: ShieldCheck, desc: "Step Pipeline" },
  ];

  // Determine available tabs and default workspace for current user
  const { availableTabs, defaultTab, defaultCorridor } = React.useMemo(() => {
    if (isAdmin) {
      return {
        availableTabs: allTabsConfig,
        defaultTab: "directory",
        defaultCorridor: "All",
      };
    }

    const r = (roles || []).map((x) => String(x).toLowerCase().trim());
    const hasRoleKeyword = (keywords: string[]) =>
      r.some((roleName) => keywords.some((k) => roleName.includes(k)));

    let prefCorridor = "All";
    if (hasRoleKeyword(["saudi"])) prefCorridor = "Saudi Arabia";
    if (hasRoleKeyword(["kuwait"])) prefCorridor = "Kuwait";

    const allowed: string[] = ["directory"]; // All internal staff can access the Applicant List directory
    let prefTab = "directory";

    // 1. LMIS Clearance table: strictly restricted to LMIS roles (Saudi LMIS, Kuwait LMIS) or Admin
    if (hasRoleKeyword(["lms", "lmis"])) {
      allowed.push("lms");
      prefTab = "lms";
    }

    // 2. Te'shir / Injaz table: strictly restricted to Te'shir roles (Saudi Taeshir, Kuwait Telesign) or Admin
    if (hasRoleKeyword(["taeshir", "teshir", "te'shir", "injaz", "telesign"])) {
      allowed.push("injaz");
      if (prefTab === "directory") prefTab = "injaz";
    }

    // 3. Embassy & Stamping table: strictly restricted to Embassy roles (Saudi Embassy, Kuwait Embassy) or Admin
    if (hasRoleKeyword(["embassy"])) {
      allowed.push("embassy");
      if (prefTab === "directory") prefTab = "embassy";
    }

    // 4. Ticket & Departure table: strictly restricted to Ticket role (Ticketer) or Admin
    if (hasRoleKeyword(["ticket", "ticketer"])) {
      allowed.push("departure");
      if (prefTab === "directory") prefTab = "departure";
    }

    // 5. Clearance List (Step Pipeline): strictly restricted to Admin (Administrator, System Manager, Admin, Manager)
    // Non-admin roles are never granted access to the Clearance list table.

    const filteredTabs = allTabsConfig.filter((tab) => allowed.includes(tab.id));
    return {
      availableTabs: filteredTabs,
      defaultTab: prefTab,
      defaultCorridor: prefCorridor,
    };
  }, [isAdmin, roles]);

  const rolesKey = React.useMemo(() => (roles || []).join(","), [roles]);
  const searchParams = useSearchParams();
  const filterParam = searchParams?.get("status") || searchParams?.get("stage") || searchParams?.get("filter");
  const tabParam = searchParams?.get("tab");

  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (tabParam && availableTabs.some((t) => t.id === tabParam)) return tabParam;
    if (filterParam) return "directory";
    return defaultTab;
  });
  const [corridorFilter, setCorridorFilter] = React.useState<string>(defaultCorridor);

  // Sync activeTab when tabParam, filterParam, availableTabs, or persona changes
  React.useEffect(() => {
    if (tabParam && availableTabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
      return;
    }
    if (filterParam) {
      setActiveTab("directory");
      return;
    }
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [availableTabs, defaultTab, activeTab, rolesKey, authUser?.email, filterParam, tabParam]);

  // Fetch employees list for drawers
  const { data: employees = [] } = useQuery({
    queryKey: ["employees_v2"],
    queryFn: listEmployeeRosterV2,
  });

  // Fetch live workspace data for active operational stream
  const isOperationalTab = activeTab !== "directory" && activeTab !== "clearance";
  const isTabAllowed = availableTabs.some((t) => t.id === activeTab);
  const streamType = (isOperationalTab ? activeTab : "lms") as OperationalStreamType;

  const {
    data: workspaceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["operational_workspace_v2", streamType, corridorFilter],
    queryFn: () => fetchOperationalWorkspaceDataV2(streamType, corridorFilter),
    enabled: isOperationalTab && isTabAllowed,
    staleTime: 0,
  });

  // Workspace Titles & Descriptions for header
  const getHeaderInfo = () => {
    if (activeTab === "lms") {
      return {
        title: "LMIS Clearance",
        subtitle: "Ministry of Labor clearance and COC documents.",
      };
    }
    if (activeTab === "injaz") {
      return {
        title: "Te'shir & Injaz",
        subtitle: "Saudi MOFA visa application, payments, and finger-print appointments.",
      };
    }
    if (activeTab === "embassy") {
      return {
        title: "Embassy & Stamping",
        subtitle: "Send passports to the embassy and record visa stamping.",
      };
    }
    if (activeTab === "departure") {
      return {
        title: "Tickets & Departure",
        subtitle: "Flight bookings, pre-departure medical checks, and airport departures.",
      };
    }
    if (activeTab === "clearance") {
      return {
        title: "Clearance List",
        subtitle: "Track clearance steps for all applicants.",
      };
    }
    return {
      title: "Applicants",
      subtitle: "Manage all applicants here.",
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
          {canRegister && (
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
      {/* Operational Workspace Navigation Tabs                         */}
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
        {activeTab === "directory" && isTabAllowed && <ApplicantTable />}

        {activeTab === "lms" && isTabAllowed && (
          <LMISWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "injaz" && isTabAllowed && (
          <InjazWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "embassy" && isTabAllowed && (
          <EmbassyWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "departure" && isTabAllowed && (
          <DepartureWorkspace
            data={workspaceData}
            isLoading={isLoading || isRefetching}
            onRefresh={refetch}
            employees={employees}
            corridorFilter={corridorFilter}
            onCorridorChange={setCorridorFilter}
          />
        )}

        {activeTab === "clearance" && isTabAllowed && <V2ClearanceQueueWorkspace />}

        {!isTabAllowed && (
          <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-bold">Access Restricted</h3>
            </div>
            <p className="leading-relaxed">
              You do not have permission to view this operational clearance table. Please switch to an authorized workspace or contact an Administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
