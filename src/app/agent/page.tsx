"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Building2,
  ShieldCheck,
  UserCheck,
  Briefcase,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  listPortalCandidatesV2,
  selectCandidateV2,
  V2PortalCandidate,
  ApiV2Error,
} from "@/lib/api/v2";
import { PortalAvailableCandidate } from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { CandidateCard } from "@/components/agent/CandidateCard";
import { CandidateDetailModal } from "@/components/agent/CandidateDetailModal";
import { CandidateFilters } from "@/components/agent/CandidateFilters";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

export default function AgentDiscoveryPage() {
  const queryClient = useQueryClient();
  const { authUser, agencyContext } = useAuth();

  // Contractor context: authoritative from auth, with state for internal staff switching
  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;

  // Filters State
  const [searchTerm, setSearchTerm] = React.useState("");
  const [destinationCountry, setDestinationCountry] = React.useState("All Countries");
  const [jobApplied, setJobApplied] = React.useState("All Jobs");
  const [religion, setReligion] = React.useState("All Religions");
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");

  // Selection & Detail Modal State
  const [selectedCandidateForDetail, setSelectedCandidateForDetail] =
    React.useState<PortalAvailableCandidate | null>(null);
  const [candidateToConfirm, setCandidateToConfirm] =
    React.useState<PortalAvailableCandidate | null>(null);
  const [selectingCandidateId, setSelectingCandidateId] = React.useState<string | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);
  const [conflictToast, setConflictToast] = React.useState<string | null>(null);
  const [selectedTodayCount, setSelectedTodayCount] = React.useState(0);

  // Excluded candidates in this session (e.g. selected or 409 conflict)
  const [locallyRemovedIds, setLocallyRemovedIds] = React.useState<string[]>([]);

  // Fetch Available Candidate Pool from V2 API
  const {
    data: candidates = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "portal-available-candidates",
      effectiveContractor,
      destinationCountry,
      jobApplied,
      religion,
    ],
    queryFn: () => listPortalCandidatesV2(),
  });

  // Filter candidates client-side by search keyword and exclude locally removed
  const visibleCandidates = React.useMemo(() => {
    return (candidates as any[])
      .filter((c) => !locallyRemovedIds.includes(c.name))
      .filter((c) => {
        if (destinationCountry !== "All Countries" && (c.destination_country || "").toLowerCase() !== destinationCountry.toLowerCase()) return false;
        if (jobApplied !== "All Jobs" && ((c.job_applied || "").toLowerCase() !== jobApplied.toLowerCase() && (c.target_job || "").toLowerCase() !== jobApplied.toLowerCase())) return false;
        if (religion !== "All Religions" && (c.religion || "").toLowerCase() !== religion.toLowerCase()) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          c.full_name?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.job_applied?.toLowerCase().includes(q) ||
          c.target_job?.toLowerCase().includes(q) ||
          c.experience_country?.toLowerCase().includes(q) ||
          c.nationality?.toLowerCase().includes(q)
        );
      });
  }, [candidates, locallyRemovedIds, searchTerm, destinationCountry, jobApplied, religion]);

  // Selection Mutation
  const selectMutation = useMutation({
    mutationFn: async (candidate: PortalAvailableCandidate) => {
      setSelectingCandidateId(candidate.name);
      return await selectCandidateV2(candidate.name);
    },
    onSuccess: (res, candidate) => {
      setSelectingCandidateId(null);
      // Remove candidate immediately from pool
      setLocallyRemovedIds((prev) => [...prev, candidate.name]);
      setSelectedTodayCount((prev) => prev + 1);
      if (selectedCandidateForDetail?.name === candidate.name) {
        setSelectedCandidateForDetail(null);
      }

      setSuccessToast(
        `✓ Applicant ${candidate.full_name} (${candidate.name}) reserved successfully. State advanced to Selected.`
      );
      setTimeout(() => setSuccessToast(null), 6000);

      // Invalidate queries to refresh background
      queryClient.invalidateQueries({ queryKey: ["portal-available-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["agency-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["agency-reserved-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: (err: ApiV2Error | any, candidate) => {
      setSelectingCandidateId(null);
      if (err?.statusCode === 409 || err?.message?.includes("longer available") || err?.message?.includes("already")) {
        setLocallyRemovedIds((prev) => [...prev, candidate.name]);
        if (selectedCandidateForDetail?.name === candidate.name) {
          setSelectedCandidateForDetail(null);
        }
        setConflictToast(
          `Candidate ${candidate.full_name} (${candidate.name}) is no longer available in the candidate pool.`
        );
        setTimeout(() => setConflictToast(null), 6000);
      } else {
        setConflictToast(formatCleanErrorMessage(err) || "Failed to reserve candidate.");
        setTimeout(() => setConflictToast(null), 6000);
      }
    },
  });

  const handleSelectCandidate = (candidate: PortalAvailableCandidate) => {
    setCandidateToConfirm(candidate);
  };

  const handleConfirmSelection = () => {
    if (candidateToConfirm) {
      selectMutation.mutate(candidateToConfirm);
      setCandidateToConfirm(null);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDestinationCountry("All Countries");
    setJobApplied("All Jobs");
    setReligion("All Religions");
  };

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
      selectedCount={selectedTodayCount}
    >
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Available Applicant Pool
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Live Selection
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Browse pre-screened candidates with verified GAMCA medical clearance, passport OCR validation, and bilingual profiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs rounded-xl border-slate-200 dark:border-[#26262f] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-700" : ""}`} />
              Refresh Pool
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* 409 Conflict Alert */}
        {conflictToast && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/60 dark:border-amber-800 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">{conflictToast}</span>
            </div>
            <button
              onClick={() => setConflictToast(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters & Search */}
        <CandidateFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          destinationCountry={destinationCountry}
          onDestinationChange={setDestinationCountry}
          jobApplied={jobApplied}
          onJobChange={setJobApplied}
          religion={religion}
          onReligionChange={setReligion}
          onReset={handleResetFilters}
          totalAvailable={visibleCandidates.length}
        />

        {/* Main Content Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
            <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Retrieving available candidates from secure pool...
            </p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
            <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            <h3 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
              Unable to load candidate pool
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md">
              {(error as Error)?.message || "Please check connection or retry."}
            </p>
            <Button
              onClick={() => refetch()}
              size="sm"
              className="mt-4 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-xl"
            >
              Retry Connection
            </Button>
          </div>
        ) : visibleCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1c1c22] text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Available Applicants Match Criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
              Try broadening your filters or resetting search keywords to view all selectable applicants.
            </p>
            <Button
              onClick={handleResetFilters}
              size="sm"
              variant="outline"
              className="mt-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-[#26262f]"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* View Mode & Count Header */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                <span>
                  Showing <strong className="text-slate-900 dark:text-white">{visibleCandidates.length}</strong> available candidates
                </span>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-emerald-800 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                    viewMode === "table"
                      ? "bg-emerald-800 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                  title="Mobile-Optimized Table View (Sticky First Column)"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>

            {viewMode === "grid" ? (
              /* Responsive Candidate Grid: ~3 cards per row on larger screens, 1 per row on mobile */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.name}
                    candidate={candidate}
                    onViewDetails={setSelectedCandidateForDetail}
                    onSelect={handleSelectCandidate}
                    isSelecting={selectingCandidateId === candidate.name}
                  />
                ))}
              </div>
            ) : (
              /* Mobile-Optimized Candidate Table with STICKY FIRST COLUMN */
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
                <div className="overflow-x-auto relative">
                  <table className="w-full text-left text-xs min-w-[780px] border-separate border-spacing-0">
                    <thead className="bg-slate-50/95 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="sticky left-0 z-20 bg-slate-50 dark:bg-[#16161b] px-2 py-2 sm:px-4 sm:py-3.5 w-[115px] min-w-[115px] max-w-[120px] sm:w-auto sm:min-w-[220px] sm:max-w-[260px] border-b border-r border-slate-200 dark:border-[#222227] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)]">
                          Candidate
                        </th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Job & Destination</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Demographics</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Experience</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Medical Status</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                      {visibleCandidates.map((candidate) => (
                        <tr key={candidate.name} className="group hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                          {/* Candidate Identity - STICKY FIRST COLUMN (Unscrollable on mobile, compact width) */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-[#121216] group-hover:bg-slate-50 dark:group-hover:bg-[#16161c] px-2 py-2 sm:px-4 sm:py-3.5 w-[115px] min-w-[115px] max-w-[120px] sm:w-auto sm:min-w-[220px] sm:max-w-[260px] border-b border-r border-slate-100 dark:border-[#222227] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)] transition-colors">
                            <div className="flex items-center gap-1.5 sm:gap-3">
                              {candidate.photo_passport ? (
                                <img
                                  src={candidate.photo_passport}
                                  alt={candidate.full_name}
                                  className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl object-cover border border-slate-200 dark:border-[#26262f] shrink-0"
                                />
                              ) : (
                                <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-800 text-[10px] sm:text-xs shrink-0">
                                  {candidate.full_name?.slice(0, 2) || "CA"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate leading-tight">{candidate.full_name || candidate.name}</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                                  {candidate.passport_number || candidate.name}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Job & Destination */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">{candidate.job_applied || candidate.target_job || "Domestic Worker"}</p>
                            <p className="text-[10px] text-slate-400">{candidate.destination_country || "Not Specified"}</p>
                          </td>

                          {/* Demographics */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap text-[11px] text-slate-600 dark:text-zinc-300">
                            <div>{candidate.religion || "Not Specified"} • {(() => {
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
                            })()}</div>
                            <div className="text-[10px] text-slate-400">{candidate.marital_status || "Not Specified"}</div>
                          </td>

                          {/* Experience */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap text-[11px] text-slate-600 dark:text-zinc-300">
                            {candidate.experience_country ? (
                              <Badge variant="outline" className="text-[10px] font-medium border-slate-300 dark:border-[#26262f]">
                                {candidate.experience_country} ({candidate.experience_years || 1}y)
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[10px]">First Time</span>
                            )}
                          </td>

                          {/* Medical Status */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {candidate.medical_status || "Fit / Passed"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCandidateForDetail(candidate)}
                                className="text-xs h-7 rounded-lg border-slate-200 dark:border-[#26262f]"
                              >
                                Details
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={selectingCandidateId === candidate.name}
                                onClick={() => handleSelectCandidate(candidate)}
                                className="text-xs h-7 rounded-lg bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
                              >
                                {selectingCandidateId === candidate.name ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Select"
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidateForDetail}
        isOpen={!!selectedCandidateForDetail}
        onClose={() => setSelectedCandidateForDetail(null)}
        onSelect={handleSelectCandidate}
        isSelecting={selectingCandidateId === selectedCandidateForDetail?.name}
      />

      {/* Candidate Selection Confirmation Dialog */}
      {candidateToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#16161b] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Are you sure you want to select this candidate?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Please confirm to reserve and allocate this applicant to your agency
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-[#1a1a22] border border-slate-100 dark:border-[#22222b] p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <strong className="text-slate-900 dark:text-white">{candidateToConfirm.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant ID:</span>
                <span className="font-mono">{candidateToConfirm.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Job Role:</span>
                <span>{candidateToConfirm.job_applied || "Housemaid"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span>{candidateToConfirm.destination_country || "Saudi Arabia"}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Once confirmed, this candidate will be exclusively allocated to your agency and advanced to Selected stage in the workflow pipeline.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCandidateToConfirm(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSelection}
                disabled={selectMutation.isPending}
                className="text-xs h-8 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
              >
                {selectMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Yes, Select Candidate
              </Button>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}
