"use client";

import * as React from "react";
import {
  X,
  User,
  Globe2,
  Calendar,
  Briefcase,
  MapPin,
  FileText,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Download,
  ExternalLink,
  Loader2,
  Phone,
} from "lucide-react";
import { PortalAvailableCandidate } from "@/types/applicant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CandidateDetailModalProps {
  candidate: PortalAvailableCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (candidate: PortalAvailableCandidate) => void;
  isSelecting?: boolean;
}

export function CandidateDetailModal({
  candidate,
  isOpen,
  onClose,
  onSelect,
  isSelecting = false,
}: CandidateDetailModalProps) {
  const [passportImgError, setPassportImgError] = React.useState(false);
  const [fullBodyImgError, setFullBodyImgError] = React.useState(false);

  if (!isOpen || !candidate) return null;

  const hasPassport = !passportImgError && Boolean(candidate.photo_passport);
  const hasFullBody = !fullBodyImgError && Boolean(candidate.photo_full_body);

  const checkSkill = (keys: string[], label: string): boolean => {
    const cand = candidate as any;
    for (const k of keys) {
      const v = cand[k];
      if (
        v === 1 ||
        v === "1" ||
        v === true ||
        v === "YES" ||
        v === "Yes" ||
        v === "yes" ||
        v === "true"
      ) {
        return true;
      }
    }
    // Also check if candidate.skills is an array or string
    const rawSkills = cand.skills || cand.skills_list || cand.qualification_skills;
    if (Array.isArray(rawSkills)) {
      const norm = rawSkills.map((s) => String(s).toLowerCase().trim());
      if (norm.some((s) => keys.some((k) => k.replace(/^skill_/, "").includes(s)) || label.toLowerCase().includes(s))) {
        return true;
      }
    } else if (typeof rawSkills === "string") {
      const norm = rawSkills.toLowerCase();
      if (keys.some((k) => norm.includes(k.replace(/^skill_/, ""))) || norm.includes(label.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  const skills = [
    { label: "Cleaning & Housekeeping", isVerified: checkSkill(["skill_cleaning", "cleaning", "housekeeping"], "Cleaning") },
    { label: "Cooking", isVerified: checkSkill(["skill_cooking", "cooking"], "Cooking") },
    { label: "Arabic Cooking", isVerified: checkSkill(["skill_arabic_cooking", "arabic_cooking"], "Arabic Cooking") },
    { label: "Babysitting & Child Care", isVerified: checkSkill(["skill_baby_sitting", "skill_babysitting", "baby_sitting", "babysitting", "skill_children_care", "children_care"], "Babysitting") },
    { label: "Washing & Laundry", isVerified: checkSkill(["skill_washing", "washing", "laundry"], "Washing") },
    { label: "Ironing", isVerified: checkSkill(["skill_ironing", "ironing"], "Ironing") },
    { label: "Elderly Care", isVerified: checkSkill(["skill_elderly_care", "elderly_care", "elderly"], "Elderly Care") },
    { label: "Sewing", isVerified: checkSkill(["skill_sewing", "sewing"], "Sewing") },
    { label: "Driving", isVerified: checkSkill(["skill_driving", "driving"], "Driving") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#202026] px-6 py-4 bg-slate-50/50 dark:bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {candidate.full_name}
                </h2>
                <span className="rounded-md bg-slate-200/80 dark:bg-[#22222a] px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  {candidate.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {candidate.job_applied || "Hospitality Candidate"} • Destination: {candidate.destination_country || "GCC"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f1f26] hover:text-slate-700 dark:hover:text-zinc-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Photos Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col items-center overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#22222a] bg-slate-50 dark:bg-[#17171d] p-3">
              <div className="relative aspect-[4/5] w-full max-w-[240px] overflow-hidden rounded-lg bg-slate-200 dark:bg-[#202028] flex items-center justify-center">
                {hasPassport ? (
                  <img
                    src={candidate.photo_passport}
                    alt={`${candidate.full_name} Passport`}
                    onError={() => setPassportImgError(true)}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                    <User className="h-12 w-12 stroke-[1.5] mb-2 opacity-60" />
                    <span className="text-xs font-medium">Passport Photo Not Uploaded</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Official Formal Photo
              </p>
            </div>

            <div className="flex flex-col items-center overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#22222a] bg-slate-50 dark:bg-[#17171d] p-3">
              <div className="relative aspect-[4/5] w-full max-w-[240px] overflow-hidden rounded-lg bg-slate-200 dark:bg-[#202028] flex items-center justify-center">
                {hasFullBody ? (
                  <img
                    src={candidate.photo_full_body}
                    alt={`${candidate.full_name} Full Body`}
                    onError={() => setFullBodyImgError(true)}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                    <User className="h-12 w-12 stroke-[1.5] mb-2 opacity-60" />
                    <span className="text-xs font-medium">Full Portrait Not Uploaded</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Full-Body Portrait
              </p>
            </div>
          </div>

          {/* Key Qualifications & Profile Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-100 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Age / DOB</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {candidate.age} yrs {candidate.date_of_birth ? `(${candidate.date_of_birth})` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Religion</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {candidate.religion || "Muslim"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Place of Birth</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {candidate.place_of_birth || candidate.leaving_town || "Ethiopia"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Nationality</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {candidate.nationality || "Ethiopia"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Monthly Salary</span>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mt-0.5 font-mono">
                {candidate.monthly_salary || 1200} SAR
              </p>
            </div>
          </div>

          {/* Prior Overseas Work History */}
          <div className="rounded-xl border border-slate-200/80 dark:border-[#22222a] bg-white dark:bg-[#16161c] p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
              Prior Overseas Work Experience
            </h4>
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
              const countryDisplay = isExperienced ? rawCountry : "None / First Time Applicant";
              const durationDisplay = isExperienced
                ? (rawPeriod && rawPeriod !== "0" && rawPeriod !== "0 years" ? rawPeriod : `${(candidate as any).years_of_experience || 1} years`)
                : "None";

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-zinc-400">Country of Experience: </span>
                    <strong className="text-slate-900 dark:text-white">{countryDisplay}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-zinc-400">Duration: </span>
                    <strong className="text-slate-900 dark:text-white">{durationDisplay}</strong>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Verified Skills Matrix */}
          <div className="rounded-xl border border-slate-200/80 dark:border-[#22222a] bg-white dark:bg-[#16161c] p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
              Skills & Qualifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {skills.map((s) => {
                const isVerified = Boolean(s.isVerified);
                return (
                  <div
                    key={s.label}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                      isVerified
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-medium"
                        : "bg-slate-50 dark:bg-[#1a1a20] text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="font-semibold">{isVerified ? "✓ Verified" : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Candidate CV Document */}
          <div className="rounded-xl border border-slate-200/80 dark:border-[#22222a] bg-slate-50/70 dark:bg-[#16161b] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  Standardized Candidate CV (PDF)
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Verified biometric and employment snapshot for bilateral placement.
                </p>
              </div>
            </div>

            {candidate.cv_file_url ? (
              <a
                href={candidate.cv_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#1b1b22] px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#22222a] transition shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                <span>Download CV</span>
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">CV generated upon reservation</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#202026] px-6 py-4 bg-slate-50/50 dark:bg-[#16161c]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1f1f26]"
          >
            Close
          </Button>

          <Button
            type="button"
            disabled={isSelecting}
            onClick={() => onSelect(candidate)}
            className="bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs px-5 h-10 rounded-xl shadow-xs"
          >
            {isSelecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving Candidate...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Select & Reserve Candidate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
