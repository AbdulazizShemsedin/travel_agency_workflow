"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, Menu, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AppNavbarProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onMobileMenuToggle?: () => void;
}

export function AppNavbar({
  isSidebarCollapsed = false,
  onToggleSidebar,
  onMobileMenuToggle,
}: AppNavbarProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#0d0d10]/95 px-4 backdrop-blur-md sm:px-6 transition-colors duration-200 shadow-xs">
      {/* Left controls: Sidebar toggle & Search Bar */}
      <div className="flex flex-1 items-center gap-3">
        {/* Mobile Hamburger toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c22] md:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Modern Sidebar Toggle Button as requested */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#26262d] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181f] transition cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar Collapse"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200" />
          )}
        </button>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search applicants, ID, passport, phone..."
            className="h-9 w-full rounded-lg bg-slate-50/80 dark:bg-[#141418] pl-9 text-xs focus:bg-white dark:focus:bg-[#121215] border-slate-200 dark:border-[#26262d]"
          />
        </div>
      </div>

      {/* Right Controls: Dark/Light Mode Toggle & Top-Right Notification Button */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Toggle Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleDarkMode}
          className="h-9 w-9 p-0 rounded-lg text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#141418] hover:bg-slate-100 dark:hover:bg-[#1c1c22] transition cursor-pointer"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 animate-in spin-in-180 duration-200" />
          )}
        </Button>

        {/* Top-Right Notifications Button with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#141418] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c22] transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                3
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] px-4 py-3 bg-slate-50/80 dark:bg-[#16161b]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Notifications (3)
              </h4>
              <Link
                href="/notifications"
                className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-[#222227] text-xs">
              <Link
                href="/applicants/APP-2024-1249"
                className="block p-3 hover:bg-slate-50 dark:hover:bg-[#18181f] transition"
              >
                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                  Candidate Selected: Ali Ahmed
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Document approved from Gulf Horizons Agency. Ready for staff assignment.
                </p>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">10 mins ago</span>
              </Link>

              <Link
                href="/applicants/APP-2024-1250"
                className="block p-3 hover:bg-slate-50 dark:hover:bg-[#18181f] transition"
              >
                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                  Passport Expiry Notice
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Ahmed Ali Muhammed passport validity check alert.
                </p>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">1 hour ago</span>
              </Link>

              <Link
                href="/applicants/APP-2024-1245"
                className="block p-3 hover:bg-slate-50 dark:hover:bg-[#18181f] transition"
              >
                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                  Departure Confirmed
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Solomon Fikru Desta boarded flight ET-414 to Jeddah.
                </p>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">Yesterday</span>
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
