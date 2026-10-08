"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Sun, Moon, PanelLeftClose, PanelLeftOpen, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";

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
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md px-4 transition-colors shadow-2xs">
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

        <Link
          href="/dashboard"
          className="flex md:hidden items-center gap-2 hover:opacity-90 transition-opacity"
          title="Navigate to Dashboard"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-900 dark:bg-emerald-600 text-white shadow-xs">
            <Globe2 className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            Travel Agency
          </span>
        </Link>

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
      </div>

      {/* Right Actions: Dark Mode & Notifications */}
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

        {/* Unified Push & Notifications Button */}
        <PushNotificationToggle />
      </div>
    </header>
  );
}
