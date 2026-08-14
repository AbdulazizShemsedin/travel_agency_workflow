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
  Bell,
  Settings,
  Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applicants", href: "/applicants", icon: Users },
  { label: "Employees", href: "/employees", icon: Briefcase },
  { label: "Contractors", href: "/contractors", icon: Building2 },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Expenses/Income", href: "/expenses-income", icon: Receipt },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900 text-white shadow-xs">
          <Globe2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">
            Travel Agency
          </h1>
          <p className="text-[11px] text-slate-500">Management Portal</p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <Link href="/applicants/new">
          <Button className="w-full justify-center gap-2 bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm font-medium">
            <Plus className="h-4 w-4" />
            Add Applicant
          </Button>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-2">
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-950 font-semibold border-l-4 border-emerald-800 rounded-l-none"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-emerald-800" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile & Settings Section */}
      <div className="border-t border-slate-100 p-4 space-y-3">
        <Link
          href="/notifications"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-slate-400" />
            <span>Notifications</span>
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            3
          </span>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Settings</span>
        </Link>

        {/* User Card matching Figma */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
            E1
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              Employee 1
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Operations Lead
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
