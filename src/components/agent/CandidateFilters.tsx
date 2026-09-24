"use client";

import * as React from "react";
import {
  Search,
  RotateCcw,
  Globe2,
  Briefcase,
  Heart,
  HeartPulse,
  MapPin,
} from "lucide-react";
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
  medicalStatus: string;
  onMedicalStatusChange: (value: string) => void;
  placeOfBirth: string;
  onPlaceOfBirthChange: (value: string) => void;
  experience: string;
  onExperienceChange: (value: string) => void;
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
  medicalStatus,
  onMedicalStatusChange,
  placeOfBirth,
  onPlaceOfBirthChange,
  experience,
  onExperienceChange,
  onReset,
  totalAvailable,
}: CandidateFiltersProps) {
  const DESTINATIONS = [
    { value: "All Countries", label: "Destination (All)", icon: <Globe2 className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "Saudi Arabia", label: "🇸🇦 Saudi Arabia" },
    { value: "Kuwait", label: "🇰🇼 Kuwait" },
    { value: "UAE", label: "🇦🇪 UAE" },
    { value: "Qatar", label: "🇶🇦 Qatar" },
    { value: "Oman", label: "🇴🇲 Oman" },
    { value: "Jordan", label: "🇯🇴 Jordan" },
  ];

  const JOBS = [
    { value: "All Jobs", label: "Job Position (All)", icon: <Briefcase className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "House worker", label: "House worker" },
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

  const MEDICAL_STATUSES = [
    { value: "All Medical", label: "Medical (All)", icon: <HeartPulse className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "FIT", label: "FIT (Medically Cleared)" },
    { value: "Pending", label: "In Progress / Pending" },
    { value: "Not Done", label: "Not Done / None" },
  ];

  const EXPERIENCES = [
    { value: "All Experience", label: "Experience (All)", icon: <Briefcase className="h-3.5 w-3.5 text-slate-400" /> },
    { value: "Experienced", label: "Experienced (Ex-GCC)" },
    { value: "First Time", label: "First Time / Fresher" },
  ];

  const hasActiveFilters =
    searchTerm ||
    destinationCountry !== "All Countries" ||
    jobApplied !== "All Jobs" ||
    religion !== "All Religions" ||
    medicalStatus !== "All Medical" ||
    placeOfBirth.trim() !== "" ||
    experience !== "All Experience";

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-4 shadow-2xs space-y-3">
      {/* Search & Top Filters */}
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

        {/* Place of Birth Input Filter */}
        <div className="relative w-full lg:w-48">
          <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <Input
            type="text"
            value={placeOfBirth}
            onChange={(e) => onPlaceOfBirthChange(e.target.value)}
            placeholder="Place of Birth..."
            className="pl-8 pr-3 h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] focus-visible:ring-emerald-700"
          />
        </div>
      </div>

      {/* Second Row: Dropdown Selects */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
        {/* Destination Country Filter */}
        <div>
          <SimpleSelect
            value={destinationCountry}
            onValueChange={onDestinationChange}
            options={DESTINATIONS}
            triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
            aria-label="Destination Country"
          />
        </div>

        {/* Medical Status Filter */}
        <div>
          <SimpleSelect
            value={medicalStatus}
            onValueChange={onMedicalStatusChange}
            options={MEDICAL_STATUSES}
            triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
            aria-label="Medical Status"
          />
        </div>

        {/* Religion Filter */}
        <div>
          <SimpleSelect
            value={religion}
            onValueChange={onReligionChange}
            options={RELIGIONS}
            triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
            aria-label="Religion"
          />
        </div>

        {/* Experience Filter */}
        <div>
          <SimpleSelect
            value={experience}
            onValueChange={onExperienceChange}
            options={EXPERIENCES}
            triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
            aria-label="Experience"
          />
        </div>

        {/* Job Filter */}
        <div className="col-span-2 sm:col-span-1">
          <SimpleSelect
            value={jobApplied}
            onValueChange={onJobChange}
            options={JOBS}
            triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-[#17171d] border-slate-200 dark:border-[#26262f] font-medium"
            aria-label="Job Applied"
          />
        </div>
      </div>

      {/* Available Count, Reset Button, and Active Filter Indicators */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-[#1e1e24]">
        <div>
          <span>Showing </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {totalAvailable}
          </span>
          <span> selectable candidate{totalAvailable === 1 ? "" : "s"} ready for foreign agency selection</span>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2.5 text-xs text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 rounded-lg cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
