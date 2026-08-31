"use client";

import * as React from "react";
import Image from "next/image";
import {
  MapPin,
  Briefcase,
  Clock,
  Globe2,
  Eye,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
  ImageOff,
} from "lucide-react";
import { PortalAvailableCandidate } from "@/types/applicant";
import { Button } from "@/components/ui/button";

interface CandidateCardProps {
  candidate: PortalAvailableCandidate;
  onViewDetails: (candidate: PortalAvailableCandidate) => void;
  onSelect: (candidate: PortalAvailableCandidate) => void;
  isSelecting?: boolean;
}

export function CandidateCard({
  candidate,
  onViewDetails,
  onSelect,
  isSelecting = false,
}: CandidateCardProps) {
  const [passportImgError, setPassportImgError] = React.useState(false);
  const [fullBodyImgError, setFullBodyImgError] = React.useState(false);

  const hasPassport = !passportImgError && Boolean(candidate.photo_passport);
  const hasFullBody = !fullBodyImgError && Boolean(candidate.photo_full_body);

  return (
    <div
      onClick={() => onViewDetails(candidate)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-700/50 dark:hover:border-emerald-500/40 transition-all duration-200 cursor-pointer"
    >
      {/* 1. Clean Two-Photo Area */}
      <div className="relative grid grid-cols-2 gap-1.5 p-2.5 bg-slate-100/70 dark:bg-[#18181e]/60 border-b border-slate-100 dark:border-[#202026]">
        {/* Formal Passport Photo */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-slate-200/80 dark:bg-[#202028] flex items-center justify-center">
          {hasPassport ? (
            <img
              src={candidate.photo_passport}
              alt={`${candidate.full_name} - Passport Photo`}
              onError={() => setPassportImgError(true)}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-zinc-500">
              <User className="h-8 w-8 stroke-[1.5] mb-1 opacity-60" />
              <span className="text-[10px] font-medium">Passport Photo</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-medium text-white">
            Formal
          </div>
        </div>

        {/* Full-Body Photo */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-slate-200/80 dark:bg-[#202028] flex items-center justify-center">
          {hasFullBody ? (
            <img
              src={candidate.photo_full_body}
              alt={`${candidate.full_name} - Full Body Photo`}
              onError={() => setFullBodyImgError(true)}
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-zinc-500">
              <User className="h-8 w-8 stroke-[1.5] mb-1 opacity-60" />
              <span className="text-[10px] font-medium">Full Portrait</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-medium text-white">
            Full Portrait
          </div>
        </div>
      </div>

      {/* 2. Identity & Facts Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Name & Destination */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {candidate.full_name}
            </h3>
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
              {candidate.job_applied || "Housemaid"}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#1c1c22] px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
            <Globe2 className="h-3 w-3 text-slate-500" />
            <span>{candidate.destination_country || "GCC"}</span>
          </div>
        </div>

        {/* Key Facts Grid */}
        {(() => {
          const rawPeriod = candidate.experience_period?.trim() || "";
          const rawCountry = candidate.experience_country?.trim() || "";
          const isExperienced = Boolean(
            rawCountry &&
            rawCountry !== "" &&
            rawCountry.toLowerCase() !== "none" &&
            rawCountry.toLowerCase() !== "first time" &&
            rawCountry.toLowerCase() !== "first time applicant" &&
            rawCountry.toLowerCase() !== "overseas"
          );
          const expDisplay = isExperienced
            ? (rawPeriod && rawPeriod !== "0" && rawPeriod !== "0 years" ? `${rawCountry} (${rawPeriod})` : `${rawCountry} Exp`)
            : "First Time";
          const priorWorkDisplay = isExperienced ? rawCountry : "First Time Applicant";

          return (
            <>
              <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-[#17171c] p-2.5 text-xs text-slate-600 dark:text-zinc-300 border border-slate-100 dark:border-[#222229]">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Age: <strong className="text-slate-900 dark:text-white">{candidate.age} yrs</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Religion: <strong className="text-slate-900 dark:text-white">{candidate.religion || "Muslim"}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Birthplace: <strong className="text-slate-900 dark:text-white">{candidate.place_of_birth || candidate.leaving_town || "Ethiopia"}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Exp: <strong className="text-slate-900 dark:text-white">{expDisplay}</strong></span>
                </div>
              </div>

              {/* Prior Work & Salary Row */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 px-0.5">
                <span className="truncate max-w-[65%]">Prior Work: <strong className="text-slate-700 dark:text-zinc-300">{priorWorkDisplay}</strong></span>
                {candidate.monthly_salary ? (
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400 font-mono shrink-0">
                    {candidate.monthly_salary} SAR/mo
                  </span>
                ) : null}
              </div>
            </>
          );
        })()}

        {/* 3. Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#202026] flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(candidate);
            }}
            className="flex-1 text-xs font-semibold h-9 rounded-xl border-slate-200 dark:border-[#26262d] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a1a20]"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            View Details
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSelecting}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate);
            }}
            className="flex-1 text-xs font-semibold h-9 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-xs"
          >
            {isSelecting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Reserving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Select & Reserve Candidate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
