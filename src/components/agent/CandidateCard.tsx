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
  User,
  HeartPulse,
} from "lucide-react";
import { PortalAvailableCandidate } from "@/types/applicant";
import { Button } from "@/components/ui/button";
import { getCandidatePhotoUrl } from "@/lib/api/v2/portal";

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

  // The portal must load photos via the sanctioned get_candidate_photo endpoint; the raw
  // file URL fields aren't readable by a foreign agency session.
  const applicantName = candidate.name || "";

  const passportPhotoSrc = getCandidatePhotoUrl(applicantName, "photograph");
  const fullBodyPhotoSrc = getCandidatePhotoUrl(applicantName, "photo_full_body");

  const hasPassport = !passportImgError && Boolean(passportPhotoSrc);
  const hasFullBody = !fullBodyImgError && Boolean(fullBodyPhotoSrc);

  return (
    <div
      onClick={() => onViewDetails(candidate)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-700/50 dark:hover:border-emerald-500/40 transition-all duration-200 cursor-pointer"
    >
      {/* 1. Clean Two-Photo Area */}
      <div className="relative grid grid-cols-2 gap-1.5 p-2.5 bg-slate-100/70 dark:bg-[#18181e]/60 border-b border-slate-100 dark:border-[#202028]">
        {/* Formal Passport Photo */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-slate-200/80 dark:bg-[#202028] flex items-center justify-center">
          {hasPassport ? (
            <img
              src={passportPhotoSrc}
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
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-slate-900/10 dark:bg-black/40 flex items-center justify-center">
          {hasFullBody ? (
            <img
              src={fullBodyPhotoSrc}
              alt={`${candidate.full_name} - Full Body Photo`}
              onError={() => setFullBodyImgError(true)}
              className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 dark:text-zinc-500">
              <User className="h-8 w-8 stroke-[1.5] mb-1 opacity-60" />
              <span className="text-[10px] font-medium">Full-Body Photo</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-medium text-white">
            Full-Body
          </div>
        </div>
      </div>

      {/* 2. Identity & Facts Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Name, Destination & Medical Status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors uppercase">
              {candidate.full_name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                {candidate.job_applied || "Housemaid"}
              </span>
              {candidate.passport_number && (
                <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-[#1a1a22] px-1.5 py-0.2 rounded border border-slate-200/80 dark:border-[#2a2a35]">
                  {candidate.passport_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#1c1c22] px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
              <Globe2 className="h-3 w-3 text-slate-500" />
              <span>{candidate.destination_country || "GCC"}</span>
            </div>

            {/* Medical Status Badge */}
            {(() => {
              const med = (candidate.medical_status || "").toUpperCase();
              const isFit = med.includes("FIT") && !med.includes("UNFIT");
              const isUnfit = med.includes("UNFIT");
              const isPending = med.includes("PENDING") || med.includes("PROGRESS");
              const label = isFit
                ? "Medical: FIT ✓"
                : isUnfit
                ? "Medical: UNFIT ✕"
                : isPending
                ? "Medical: Pending"
                : "Medical: Not Done";
              const badgeClasses = isFit
                ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                : isUnfit
                ? "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                : isPending
                ? "bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700";

              return (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${badgeClasses}`}
                >
                  <HeartPulse className="h-3 w-3" />
                  <span>{label}</span>
                </span>
              );
            })()}
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
            ? rawPeriod && rawPeriod !== "0" && rawPeriod !== "0 years"
              ? `${rawCountry} (${rawPeriod})`
              : `${rawCountry} Exp`
            : "First Time";
          const priorWorkDisplay = isExperienced ? rawCountry : "First Time Applicant";

          const ageDisplay = (() => {
            const directAge = Number(candidate.age);
            if (directAge > 0) return `${directAge} yrs`;
            if (candidate.date_of_birth) {
              const birth = new Date(candidate.date_of_birth);
              if (!isNaN(birth.getTime())) {
                const today = new Date();
                let diff = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                  diff--;
                }
                if (diff > 0) return `${diff} yrs`;
              }
            }
            return "N/A";
          })();

          const maritalDisplay = candidate.marital_status || "Single";
          const childrenCount = Number(candidate.children);
          const maritalWithChildren =
            childrenCount > 0
              ? `${maritalDisplay} (${childrenCount} ch.)`
              : maritalDisplay;

          // Extract top verified skills
          const c = candidate as any;
          const topSkills: string[] = [];
          if (c.skill_cooking || c.skill_arabic_cooking) topSkills.push("Cooking");
          if (c.skill_cleaning) topSkills.push("Cleaning");
          if (c.skill_baby_sitting || c.skill_babysitting || c.skill_children_care) topSkills.push("Babysitting");
          if (c.skill_washing || c.skill_ironing) topSkills.push("Laundry");
          if (c.skill_elderly_care) topSkills.push("Elderly Care");
          if (c.skill_sewing) topSkills.push("Sewing");
          if (topSkills.length === 0) {
            if (c.arabic_level && c.arabic_level.toLowerCase() !== "none") topSkills.push(`Arabic: ${c.arabic_level}`);
            if (c.english_level && c.english_level.toLowerCase() !== "none") topSkills.push(`English: ${c.english_level}`);
          }

          return (
            <>
              <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-[#17171c] p-2.5 text-xs text-slate-600 dark:text-zinc-300 border border-slate-100 dark:border-[#222229]">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Age: <strong className="text-slate-900 dark:text-white">{ageDisplay}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Religion:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {candidate.religion || "Not Specified"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Marital:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {maritalWithChildren}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Birthplace:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {candidate.place_of_birth || candidate.leaving_town || "Ethiopia"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Exp:{" "}
                    <strong className="text-slate-900 dark:text-white">{expDisplay}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Lang:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {candidate.arabic_level || candidate.english_level || "Amharic"}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Skills Tags */}
              {topSkills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 px-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Skills:
                  </span>
                  {topSkills.slice(0, 3).map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}

              {/* Prior Work & Salary Row */}
              {(() => {
                const isKuwait = (candidate.destination_country || "")
                  .toLowerCase()
                  .includes("kuwait");
                const salaryCurrency = isKuwait ? "KD" : "SAR";
                const salaryDisplay = (() => {
                  const num = Number(candidate.monthly_salary);
                  if (!isNaN(num) && num > 0) {
                    if (isExperienced && num === 1000) return isKuwait ? "140" : "1,200";
                    if (!isExperienced && num === 1200) return isKuwait ? "120" : "1,000";
                    return num.toLocaleString();
                  }
                  return isKuwait
                    ? isExperienced
                      ? "140"
                      : "120"
                    : isExperienced
                    ? "1,200"
                    : "1,000";
                })();

                return (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 px-0.5">
                    <span className="truncate max-w-[60%]">
                      Prior Work:{" "}
                      <strong className="text-slate-700 dark:text-zinc-300">
                        {priorWorkDisplay}
                      </strong>
                    </span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400 font-mono shrink-0">
                      {salaryDisplay} {salaryCurrency}/mo
                    </span>
                  </div>
                );
              })()}
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
