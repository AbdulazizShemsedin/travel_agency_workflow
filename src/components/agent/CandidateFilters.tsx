"use client";

import * as React from "react";
import { Search, Filter, RotateCcw, Building2, Globe2, Briefcase, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CandidateFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  destinationCountry: string;
  onDestinationChange: (value: string) => void;
  jobApplied: string;
  onJobChange: (value: string) => void;
  religion: string;
  onReligionChange: (value: string) => void;
  onReset: () => void;
  totalAvailable: number;
}

export function CandidateFilters({
  searchTerm,
  onSearchChange,
  destinationCountry,
  onDestinationChange,
  jobApplied,
  onJobChange,
  religion,
  onReligionChange,
  onReset,
  totalAvailable,
}: CandidateFiltersProps) {
  const DESTINATIONS = ["All Countries", "Saudi Arabia", "Kuwait", "UAE", "Qatar", "Oman", "Jordan"];
  const JOBS = ["All Jobs", "Housemaid", "Nanny / Childcare", "Cook / Arabic Cuisine", "Private Driver", "Caregiver"];
  const RELIGIONS = ["All Religions", "Muslim", "Orthodox", "Protestant", "Catholic", "Other"];

  const hasActiveFilters =
    searchTerm ||
    destinationCountry !== "All Countries" ||
    jobApplied !== "All Jobs" ||
    religion !== "All Religions";

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-4 shadow-2xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search candidate name, ID, or prior country..."
            className="pl-9 pr-3 h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] focus-visible:ring-emerald-700"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Destination Country Filter */}
          <div className="w-full sm:w-44">
            <select
              aria-label="Destination Country"
              value={destinationCountry}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border border-slate-200 dark:border-[#26262f] text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
            >
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d === "All Countries" ? "🌐 Destination (All)" : d}
                </option>
              ))}
            </select>
          </div>

          {/* Job Filter */}
          <div className="w-full sm:w-44">
            <select
              aria-label="Job Applied"
              value={jobApplied}
              onChange={(e) => onJobChange(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border border-slate-200 dark:border-[#26262f] text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
            >
              {JOBS.map((j) => (
                <option key={j} value={j}>
                  {j === "All Jobs" ? "💼 Job Position (All)" : j}
                </option>
              ))}
            </select>
          </div>

          {/* Religion Filter */}
          <div className="w-full sm:w-36">
            <select
              aria-label="Religion"
              value={religion}
              onChange={(e) => onReligionChange(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border border-slate-200 dark:border-[#26262f] text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
            >
              {RELIGIONS.map((r) => (
                <option key={r} value={r}>
                  {r === "All Religions" ? "Religion (All)" : r}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-10 px-3 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{totalAvailable}</strong> selectable candidate(s) in active pool
        </span>
        <span className="text-emerald-800 dark:text-emerald-400 font-medium">
          ✓ Verified Medical & Passport Gate Passed
        </span>
      </div>
    </div>
  );
}
