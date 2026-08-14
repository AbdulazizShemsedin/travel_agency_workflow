"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AppNavbarProps {
  onMobileMenuToggle?: () => void;
}

export function AppNavbar({ onMobileMenuToggle }: AppNavbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6 md:pl-70">
      {/* Search Bar matching Figma */}
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applicants, ID, passport, phone..."
            className="h-9 w-full rounded-lg bg-slate-50/80 pl-9 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Link href="/applicants/new">
          <Button
            size="sm"
            className="hidden sm:inline-flex bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-medium"
          >
            + New Applicant
          </Button>
        </Link>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Bell className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
