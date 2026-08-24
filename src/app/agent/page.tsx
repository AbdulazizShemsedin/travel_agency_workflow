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
} from "lucide-react";
import {
  getPortalAvailableCandidates,
  portalSelectCandidateApi,
  ApiError,
} from "@/lib/api/applicantApi";
import { PortalAvailableCandidate } from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { CandidateCard } from "@/components/agent/CandidateCard";
import { CandidateDetailModal } from "@/components/agent/CandidateDetailModal";
import { CandidateFilters } from "@/components/agent/CandidateFilters";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";

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

  // Selection & Detail Modal State
  const [selectedCandidateForDetail, setSelectedCandidateForDetail] =
    React.useState<PortalAvailableCandidate | null>(null);
  const [selectingCandidateId, setSelectingCandidateId] = React.useState<string | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);
  const [conflictToast, setConflictToast] = React.useState<string | null>(null);
  const [selectedTodayCount, setSelectedTodayCount] = React.useState(0);

  // Excluded candidates in this session (e.g. selected or 409 conflict)
  const [locallyRemovedIds, setLocallyRemovedIds] = React.useState<string[]>([]);

  // Fetch Available Candidate Pool from API
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
    queryFn: () =>
      getPortalAvailableCandidates({
        contractor: effectiveContractor,
        destination_country: destinationCountry !== "All Countries" ? destinationCountry : undefined,
        job_applied: jobApplied !== "All Jobs" ? jobApplied : undefined,
        religion: religion !== "All Religions" ? religion : undefined,
        limit: 50,
      }),
  });

  // Filter candidates client-side by search keyword and exclude locally removed
  const visibleCandidates = React.useMemo(() => {
    return candidates
      .filter((c) => !locallyRemovedIds.includes(c.name))
      .filter((c) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          c.full_name?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.job_applied?.toLowerCase().includes(q) ||
          c.experience_country?.toLowerCase().includes(q) ||
          c.nationality?.toLowerCase().includes(q)
        );
      });
  }, [candidates, locallyRemovedIds, searchTerm]);

  // Selection Mutation
  const selectMutation = useMutation({
    mutationFn: async (candidate: PortalAvailableCandidate) => {
      setSelectingCandidateId(candidate.name);
      return await portalSelectCandidateApi(candidate.name, effectiveContractor);
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
    onError: (err: ApiError | any, candidate) => {
      setSelectingCandidateId(null);
      if (err?.statusCode === 409 || err?.message?.includes("longer available") || err?.message?.includes("already")) {
        // Requirement 8: "Tell the Agent: This applicant is no longer available. Then remove the applicant from the current candidate list. Do not expose which other Agent selected them."
        setLocallyRemovedIds((prev) => [...prev, candidate.name]);
        if (selectedCandidateForDetail?.name === candidate.name) {
          setSelectedCandidateForDetail(null);
        }
        setConflictToast("This applicant is no longer available.");
        setTimeout(() => setConflictToast(null), 6000);
      } else {
        setConflictToast(err?.message || "Failed to reserve candidate. Please retry.");
        setTimeout(() => setConflictToast(null), 5000);
      }
    },
  });

  const handleSelectCandidate = (candidate: PortalAvailableCandidate) => {
    selectMutation.mutate(candidate);
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
    </AgentLayout>
  );
}
