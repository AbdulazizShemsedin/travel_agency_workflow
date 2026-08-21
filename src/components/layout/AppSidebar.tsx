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
  Plus,
  Settings,
  Globe2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applicants", href: "/applicants", icon: Users },
  { label: "Employees", href: "/employees", icon: Briefcase },
  { label: "Contractors", href: "/contractors", icon: Building2 },
  { label: "Complaints Desk", href: "/complaints", icon: AlertCircle },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Expenses/Income", href: "/expenses-income", icon: Receipt },
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
          // Mobile state
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
            {!isCollapsed && (
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
        <div className="p-3">
          <Link href="/applicants/new" onClick={onCloseMobile}>
            <Button
              className={cn(
                "w-full justify-center gap-2 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-xs font-medium text-xs",
                isCollapsed ? "px-0" : ""
              )}
              title={isCollapsed ? "Add Applicant" : undefined}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Add Applicant</span>}
            </Button>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-2.5 py-2 overflow-y-auto">
          {navItems.map((item) => {
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
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-semibold border-l-4 border-emerald-800 dark:border-emerald-500 rounded-l-none"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white",
                  isCollapsed ? "justify-center px-2" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-emerald-800 dark:text-emerald-400" : "text-slate-400"
                  )}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-slate-100 dark:border-[#222227] p-3 space-y-2">
          <Link
            href="/agent"
            onClick={onCloseMobile}
            title={isCollapsed ? "Agency Portal" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-2 text-xs font-semibold text-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition",
              isCollapsed ? "justify-center px-1" : ""
            )}
          >
            <Globe2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>Partner Agency Portal</span>
                <ExternalLink className="h-3 w-3 text-emerald-600" />
              </div>
            )}
          </Link>

          <Link
            href="/settings"
            onClick={onCloseMobile}
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#18181f] hover:text-slate-900 dark:hover:text-white transition",
              isCollapsed ? "justify-center px-2" : ""
            )}
          >
            <Settings className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          {/* User Card */}
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-[#222227] bg-slate-50/80 dark:bg-[#141418] p-2",
              isCollapsed ? "justify-center p-1.5" : ""
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              OP
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  Operations Lead
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-zinc-400">
                  operations@agency.et
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
