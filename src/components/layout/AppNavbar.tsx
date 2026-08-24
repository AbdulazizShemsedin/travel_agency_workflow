"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, Menu, Sun, Moon, PanelLeftClose, PanelLeftOpen, User, LogOut, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useQuery } from "@tanstack/react-query";
import { getNotificationsList } from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";

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
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotificationsList,
    refetchInterval: 30000,
  });

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

  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md px-4 transition-colors">
      {/* Left: Mobile Toggle & Sidebar Collapse Trigger */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="md:hidden h-8 w-8 p-0 text-slate-600 dark:text-zinc-300"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="hidden md:flex h-8 w-8 p-0 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181b]"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-72 lg:w-96">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search candidates, passport, sponsor ID..."
            className="h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-[#141418] border-slate-200/80 dark:border-[#26262d] rounded-lg focus-visible:ring-emerald-800 dark:focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Right Actions: Dark Mode & Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDarkMode}
          className="h-9 w-9 p-0 rounded-lg border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#141418] hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
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
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-88 p-0 shadow-xl border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] px-4 py-3 bg-slate-50/80 dark:bg-[#16161b]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Notifications ({notifications.length})
              </h4>
              <Link
                href="/notifications"
                className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-[#222227] text-xs max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                  No active operational alerts. Everything is up to date.
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <Link
                    key={n.id}
                    href={n.action_url}
                    className="block p-3 hover:bg-slate-50 dark:hover:bg-[#18181f] transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                        {n.title}
                      </p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          n.severity === "urgent"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            : n.severity === "warning"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}
                      >
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {n.description}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Account Popover or Login Button */}
        {user ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#141418] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1c1c22] transition cursor-pointer text-xs font-semibold"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white uppercase">
                  {user.slice(0, 2)}
                </div>
                <span className="hidden sm:inline truncate max-w-[130px]">{user}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 shadow-xl border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215]">
              <div className="px-2 py-1.5 border-b border-slate-100 dark:border-[#222227] mb-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Signed In As</p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user}</p>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition font-medium cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </PopoverContent>
          </Popover>
        ) : (
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-semibold rounded-lg border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
