"use client";

import * as React from "react";
import { Search, RotateCcw, Globe2, Briefcase, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";

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
  const DESTINATIONS = [
    { value: "All Countries", label: "🌐 Destination (All)", icon: <Globe2 className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "Saudi Arabia", label: "🇸🇦 Saudi Arabia" },
    { value: "Kuwait", label: "🇰🇼 Kuwait" },
    { value: "UAE", label: "🇦🇪 UAE" },
    { value: "Qatar", label: "🇶🇦 Qatar" },
    { value: "Oman", label: "🇴🇲 Oman" },
    { value: "Jordan", label: "🇯🇴 Jordan" },
  ];

  const JOBS = [
    { value: "All Jobs", label: "💼 Job Position (All)", icon: <Briefcase className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "Housemaid", label: "Housemaid" },
    { value: "Nanny / Childcare", label: "Nanny / Childcare" },
    { value: "Cook / Arabic Cuisine", label: "Cook / Arabic Cuisine" },
    { value: "Private Driver", label: "Private Driver" },
    { value: "Caregiver", label: "Caregiver" },
  ];

  const RELIGIONS = [
    { value: "All Religions", label: "Religion (All)", icon: <Heart className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "Muslim", label: "Muslim" },
    { value: "Orthodox", label: "Orthodox" },
    { value: "Protestant", label: "Protestant" },
    { value: "Catholic", label: "Catholic" },
    { value: "Other", label: "Other" },
  ];

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

        {/* Filters Row with Themed Radix Dropdowns */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Destination Country Filter */}
          <div className="w-full sm:w-48">
            <SimpleSelect
              value={destinationCountry}
              onValueChange={onDestinationChange}
              options={DESTINATIONS}
              triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
              aria-label="Destination Country"
            />
          </div>

          {/* Job Filter */}
          <div className="w-full sm:w-48">
            <SimpleSelect
              value={jobApplied}
              onValueChange={onJobChange}
              options={JOBS}
              triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
              aria-label="Job Applied"
            />
          </div>

          {/* Religion Filter */}
          <div className="w-full sm:w-40">
            <SimpleSelect
              value={religion}
              onValueChange={onReligionChange}
              options={RELIGIONS}
              triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
              aria-label="Religion"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-10 px-3 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Available Count and Active Filter Indicators */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-[#1e1e24]">
        <div>
          <span>Showing </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {totalAvailable}
          </span>
          <span> selectable candidate{totalAvailable === 1 ? "" : "s"} ready for foreign agency selection</span>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-emerald-800 dark:text-emerald-400 font-semibold">Active Filter Criteria</span>
          </div>
        )}
      </div>
    </div>
  );
}
