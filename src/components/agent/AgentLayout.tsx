"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  Globe2,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const MOCK_CONTRACTORS = [
  { id: "con-1", name: "Al-Amal Recruitment Riyadh", country: "Saudi Arabia", quota: "45 Allocated" },
  { id: "con-2", name: "Al-Khaleej International Manpower Co.", country: "Saudi Arabia", quota: "60 Allocated" },
  { id: "con-3", name: "Kuwait Manpower Bureau", country: "Kuwait", quota: "30 Allocated" },
  { id: "con-4", name: "Doha International Workforce", country: "Qatar", quota: "25 Allocated" },
];

interface AgentLayoutProps {
  children: React.ReactNode;
  activeContractor: string;
  onContractorChange: (contractor: string) => void;
  selectedCount?: number;
}

export function AgentLayout({
  children,
  activeContractor,
  onContractorChange,
  selectedCount = 0,
}: AgentLayoutProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
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

  const navItems = [
    { label: "Applicant Discovery", href: "/agent", icon: Users },
    { label: "Complaints & Guarantee", href: "/agent/complaints", icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090c] text-slate-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Banner: Temporary Agency Portal Disclaimer & Quick Switcher */}
      <div className="bg-emerald-950 text-emerald-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide">
            Agency Portal • Partner Access
          </span>
          <span className="hidden sm:inline text-emerald-300/80">|</span>
          <span className="hidden sm:inline text-[11px] text-emerald-300/80">
            Dedicated candidate selection & dispute management environment
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Agency Context Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsAgencyDropdownOpen(!isAgencyDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-900 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-700/60 transition"
            >
              <Building2 className="h-3 w-3 text-emerald-400" />
              <span>Agency: <strong>{activeContractor}</strong></span>
              <ChevronDown className="h-3 w-3 text-emerald-400" />
            </button>

            {isAgencyDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-slate-200 dark:border-[#222229] bg-white dark:bg-[#15151a] p-1.5 shadow-xl z-50 text-slate-800 dark:text-zinc-200">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                  Switch Partner Context
                </div>
                {MOCK_CONTRACTORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onContractorChange(c.name);
                      setIsAgencyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex flex-col transition ${
                      activeContractor === c.name
                        ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-[#1f1f26]"
                    }`}
                  >
                    <span className="line-clamp-1">{c.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">{c.country} • {c.quota}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/applicants"
            className="text-[11px] font-medium text-emerald-300 hover:text-white underline underline-offset-2 flex items-center gap-1"
          >
            <span>Internal Admin View</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      {/* Main Agency Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#222227] bg-white/95 dark:bg-[#0d0d11]/95 backdrop-blur-md px-4 sm:px-8">
        <div className="flex items-center gap-6">
          {/* Agency Brand */}
          <Link href="/agent" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Global Talent Portal
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Foreign Partner Gateway
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-[#222227]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/agent/discovery");

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-800 dark:text-emerald-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Selected candidates counter badge */}
          {selectedCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{selectedCount} Selected Today</span>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="h-9 w-9 p-0 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
        {children}
      </main>

      {/* Agency Footer */}
      <footer className="border-t border-slate-200/80 dark:border-[#202026] bg-white dark:bg-[#0c0c0f] py-6 px-4 text-center text-xs text-slate-500 dark:text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Applicant Processing System • Foreign Partner Portal</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>90-Day Bilateral Guarantee</span>
            <span>•</span>
            <span>Direct Row-Level Selection Lock</span>
            <span>•</span>
            <span>Bilateral Deployment Accord</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
