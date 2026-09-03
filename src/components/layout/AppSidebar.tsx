"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  BarChart3,
  Receipt,
  DollarSign,
  Plus,
  Settings,
  Globe2,
  X,
  AlertCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { PermissionAction } from "@/lib/auth/permissions";

interface NavItemConfig {
  label: string;
  href: string;
  icon: any;
  action: PermissionAction;
}

const navItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, action: "viewDashboard" },
  { label: "Applicants", href: "/applicants", icon: Users, action: "viewApplicants" },
  { label: "Messages / Chat", href: "/chat", icon: MessageSquare, action: "manageCommunication" },
  { label: "Employees", href: "/employees", icon: Briefcase, action: "manageUsers" },
  { label: "Contractors", href: "/contractors", icon: Building2, action: "manageContractors" },
  { label: "Commissions", href: "/commission", icon: DollarSign, action: "manageCommission" },
  { label: "Complaints Desk", href: "/complaints", icon: AlertCircle, action: "manageComplaints" },
  { label: "Reports", href: "/reports", icon: BarChart3, action: "viewReports" },
  { label: "Expenses/Income", href: "/expenses-income", icon: Receipt, action: "viewFinance" },
];

interface AppSidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, authUser, can, roles } = useAuth();

  // Check if current user is an external Foreign Agency partner
  const hasForeignAgencyRole = roles.some((r) => String(r).toLowerCase().trim() === "foreign agency");
  const isForeignAgency = hasForeignAgencyRole && authUser?.is_internal_staff === false;

  // If user is authenticated, filter nav items based on verified backend roles
  const visibleNavItems = React.useMemo(() => {
    if (isForeignAgency) {
      // Pure foreign agency is isolated from internal operational links
      return [];
    }
    if (!user) return navItems; // Unauthenticated preview
    return navItems.filter((item) => can(item.action));
  }, [user, can, isForeignAgency]);

  const canRegister = !isForeignAgency && (Boolean(user) ? can("registerApplicant") : false);
  const canAccessAgentPortal = can("accessAgentPortal") || hasForeignAgencyRole;
  const showLabels = isMobileOpen || !isCollapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#0d0d10] transition-all duration-300 shadow-sm",
          // Mobile state: always full width (w-64) when opened
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          // Desktop collapsed state
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-[#222227] px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-900 dark:bg-emerald-600 text-white shadow-xs">
              <Globe2 className="h-5 w-5" />
            </div>
            {showLabels && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                  Travel Agency
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  Management Portal
                </p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Action: Add Applicant Button */}
        {canRegister && (
          <div className="p-3">
            <Link href="/applicants/new" onClick={onCloseMobile}>
              <Button
                className={cn(
                  "w-full justify-center gap-2 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-xs font-medium text-xs",
                  !showLabels ? "px-0" : ""
                )}
                title={!showLabels ? "Add Applicant" : undefined}
              >
                <Plus className="h-4 w-4 shrink-0" />
                {showLabels && <span>Add Applicant</span>}
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation Links (Role-Aware) */}
        <nav className="flex-1 space-y-1 px-2.5 py-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/applicants"
                ? pathname.startsWith("/applicants") || pathname === "/"
                : pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                title={!showLabels ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-semibold border-l-4 border-emerald-800 dark:border-emerald-500 rounded-l-none"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white",
                  !showLabels ? "justify-center px-2" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-emerald-800 dark:text-emerald-400" : "text-slate-400"
                  )}
                />
                {showLabels && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-slate-100 dark:border-[#222227] p-3 space-y-2">
          {canAccessAgentPortal && (
            <Link
              href="/agent"
              onClick={onCloseMobile}
              title={!showLabels ? "Agency Portal" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-2 text-xs font-semibold text-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition",
                !showLabels ? "justify-center px-1" : ""
              )}
            >
              <Globe2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
              {showLabels && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Partner Agency Portal</span>
                  <ExternalLink className="h-3 w-3 text-emerald-600" />
                </div>
              )}
            </Link>
          )}

          <Link
            href="/settings"
            onClick={onCloseMobile}
            title={!showLabels ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#18181f] hover:text-slate-900 dark:hover:text-white transition",
              !showLabels ? "justify-center px-2" : ""
            )}
          >
            <Settings className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
            {showLabels && <span>Settings</span>}
          </Link>

          {/* User Card */}
          {user ? (
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-[#222227] bg-slate-50/80 dark:bg-[#141418] p-2",
                !showLabels ? "justify-center p-1.5" : ""
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                {(authUser?.full_name || user).slice(0, 2)}
              </div>
              {showLabels && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {authUser?.full_name || user}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {roles.slice(0, 2).map((r) => (
                      <span key={r} className="truncate text-[9px] font-medium text-emerald-800 dark:text-emerald-400">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
