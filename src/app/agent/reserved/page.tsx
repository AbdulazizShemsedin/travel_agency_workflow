"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileUp,
  RefreshCw,
  Search,
  Users,
  Clock,
  Download,
  Loader2,
  FileText,
  Eye,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  listMyPlacementsV2,
  V2PlacementRecord,
} from "@/lib/api/v2";
import { getCandidatePhotoUrl, listMyMuayenaWorkersV2, V2MyMuayenaWorkerItem } from "@/lib/api/v2/portal";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { CandidateDetailModal } from "@/components/agent/CandidateDetailModal";
import { LoadError } from "@/components/ui/LoadError";
import { cn } from "@/lib/utils";

function CandidatePhotoAvatar({
  applicantId,
  name,
  photoUrl,
}: {
  applicantId: string;
  name: string;
  photoUrl?: string;
}) {
  const [hasError, setHasError] = React.useState(false);
  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== "");
  const src = !hasError && hasPhoto
    ? (photoUrl!.startsWith("http") || photoUrl!.startsWith("/") ? photoUrl! : getCandidatePhotoUrl(applicantId, "photograph"))
    : "";

  if (!src || hasError) {
    return (
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-xs shrink-0 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
        {name?.slice(0, 2).toUpperCase() || "CA"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setHasError(true)}
      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border border-slate-200 dark:border-[#26262f] shrink-0 shadow-2xs"
    />
  );
}

export default function MyReservedCandidatesPage() {
  const { authUser, agencyContext } = useAuth();
  const isAgencyUser = Boolean(agencyContext?.contractor || authUser?.contractor);

  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);
  const [selectedCandidateForDetail, setSelectedCandidateForDetail] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"selected" | "muayena">("selected");

  const {
    data: reservedCandidates = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-reserved-candidates", effectiveContractor],
    queryFn: () => listMyPlacementsV2(effectiveContractor || undefined),
    enabled: Boolean(isAgencyUser || effectiveContractor),
    retry: false,
  });

  const {
    data: muayenaWorkers = [],
    isLoading: isLoadingMuayena,
    isError: isErrorMuayena,
    error: errorMuayena,
    refetch: refetchMuayena,
    isRefetching: isRefetchingMuayena,
  } = useQuery({
    queryKey: ["agency-muayena-workers", effectiveContractor],
    queryFn: () => listMyMuayenaWorkersV2(effectiveContractor || undefined),
    enabled: Boolean(isAgencyUser || effectiveContractor),
    retry: false,
  });

  const filteredCandidates = React.useMemo(() => {
    return (reservedCandidates as any[]).filter((c) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.applicant_name?.toLowerCase().includes(q) ||
        c.applicant?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.passport_number?.toLowerCase().includes(q) ||
        c.job_applied?.toLowerCase().includes(q) ||
        c.target_job?.toLowerCase().includes(q)
      );
    });
  }, [reservedCandidates, searchTerm]);

  const filteredMuayenaWorkers = React.useMemo(() => {
    return (muayenaWorkers as V2MyMuayenaWorkerItem[]).filter((w) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        w.full_name?.toLowerCase().includes(q) ||
        w.passport_number?.toLowerCase().includes(q) ||
        w.target_job?.toLowerCase().includes(q) ||
        w.destination_country?.toLowerCase().includes(q)
      );
    });
  }, [muayenaWorkers, searchTerm]);

  const [reservedPage, setReservedPage] = React.useState(1);
  const [muayenaPage, setMuayenaPage] = React.useState(1);
  const pageSize = 8;
  const totalReservedPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const totalMuayenaPages = Math.max(1, Math.ceil(filteredMuayenaWorkers.length / pageSize));

  const paginatedCandidates = React.useMemo(() => {
    const start = (reservedPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, reservedPage]);

  const paginatedMuayenaWorkers = React.useMemo(() => {
    const start = (muayenaPage - 1) * pageSize;
    return filteredMuayenaWorkers.slice(start, start + pageSize);
  }, [filteredMuayenaWorkers, muayenaPage]);

  React.useEffect(() => {
    setReservedPage(1);
    setMuayenaPage(1);
  }, [searchTerm, activeTab]);

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Back Link */}
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidate Directory
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {activeTab === "selected" ? "My Cases" : "Waiting for Contract"}
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {activeTab === "selected"
                  ? `${isError ? "—" : filteredCandidates.length} Active Case${filteredCandidates.length === 1 ? "" : "s"}`
                  : `${isErrorMuayena ? "—" : filteredMuayenaWorkers.length} Worker${filteredMuayenaWorkers.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {activeTab === "selected"
                ? "Active candidate cases selected and being processed for your agency."
                : "Muayena workers allocated to your agency upon registration, waiting for contract creation."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                refetchMuayena();
              }}
              disabled={isRefetching || isRefetchingMuayena}
              className="text-xs rounded-xl border-slate-200 dark:border-[#26262f] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${(isRefetching || isRefetchingMuayena) ? "animate-spin text-emerald-700" : ""}`} />
              Refresh
            </Button>

            <Link href="/agent">
              <Button
                type="button"
                size="sm"
                className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                Browse Candidate Pool
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#222228] gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("selected")}
            className={cn(
              "pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors",
              activeTab === "selected"
                ? "border-emerald-700 text-emerald-800 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <span>My Cases</span>
            <span className="rounded-full bg-slate-100 dark:bg-[#1f1f26] px-2 py-0.5 text-[10px] font-bold">
              {reservedCandidates.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("muayena")}
            className={cn(
              "pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors",
              activeTab === "muayena"
                ? "border-emerald-700 text-emerald-800 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <span>Waiting for Contract</span>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              {muayenaWorkers.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              placeholder={activeTab === "selected" ? "Search candidate name, passport, job..." : "Search Muayena workers..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-white dark:bg-[#141418] border-slate-200 dark:border-[#26262f]"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          {activeTab === "selected" ? (
            isLoading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Loading selected applicants...
                </span>
              </div>
            ) : isError ? (
              <div className="p-8">
                <LoadError
                  title="Could not load selected applicants"
                  error={error}
                  onRetry={() => refetch()}
                />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1c1c22] text-slate-400 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Selected Applicants Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
                  You haven&apos;t selected any applicants from the candidate directory yet. Browse available applicants to allocate them to your agency.
                </p>
                <Link href="/agent" className="mt-4">
                  <Button size="sm" className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white">
                    Go to Candidate Directory
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto lg:overflow-hidden relative">
                <table className="w-full text-left text-xs min-w-[780px] lg:min-w-0 border-separate border-spacing-0 lg:table-fixed">
                  <thead className="bg-slate-100 dark:bg-[#16161b] text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="lg:sticky lg:left-0 lg:z-20 bg-slate-100 dark:bg-[#16161b] px-3 py-2.5 sm:px-4 sm:py-3.5 border-b border-r border-slate-300 dark:border-[#222227] lg:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)]">
                        Candidate
                      </th>
                      <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Job & Destination</th>
                      <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Status</th>
                      <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Selected Date</th>
                      <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] text-center whitespace-nowrap">CV Document</th>
                      <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                    {paginatedCandidates.map((c) => {
                      const candidateNameDisplay = c.full_name || c.applicant_name || c.applicant || "Candidate";
                      const candidateForModal = {
                        ...c,
                        name: c.applicant || c.applicant_name || c.name,
                        applicant_name: candidateNameDisplay,
                        full_name: candidateNameDisplay,
                      };

                      return (
                        <tr
                          key={c.name}
                          onClick={() => setSelectedCandidateForDetail(candidateForModal)}
                          className="group hover:bg-slate-100/90 dark:hover:bg-[#16161c] transition cursor-pointer"
                          title="Click to view full candidate details"
                        >
                          {/* Candidate Identity - Sticky on Desktop only */}
                          <td className="lg:sticky lg:left-0 lg:z-10 bg-white dark:bg-[#121216] group-hover:bg-slate-100 dark:group-hover:bg-[#16161c] px-3 py-2.5 sm:px-4 sm:py-3.5 border-b border-r border-slate-300 dark:border-[#222227] lg:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)] transition-colors">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <CandidatePhotoAvatar
                                applicantId={c.applicant || c.name}
                                name={candidateNameDisplay}
                                photoUrl={c.photo_passport || (c as any).photograph || (c as any).photo}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate leading-tight group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                                  {candidateNameDisplay}
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                                  {c.passport_number ? `Passport: ${c.passport_number}` : c.job_applied || "Housemaid"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Job & Destination */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">{c.job_applied || c.target_job || "Housemaid"}</p>
                            <p className="text-[10px] text-slate-400">{c.destination_country || "Saudi Arabia"}</p>
                          </td>

                          {/* Reservation Status */}
                          <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              {(c as any).request_denied === 1 ? (
                                <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-bold">
                                  Unavailable. Please select another candidate.
                                </Badge>
                              ) : c.status === "Requested" ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                                    Waiting for confirmation
                                  </Badge>
                                  <span className="text-[9px] text-slate-500 dark:text-zinc-400">
                                    Request sent. Waiting for agency office to confirm.
                                  </span>
                                </div>
                              ) : (
                                <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                                  ✓ Reserved ({c.status || "Selected"})
                                </Badge>
                              )}
                              {c.exchange_for && (
                                <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[9px] font-medium">
                                  Exchange for {c.exchange_for}
                                </Badge>
                              )}
                              {c.flight_outcome && (
                                <Badge variant="outline" className="text-[9px] font-medium border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400">
                                  {c.flight_outcome}
                                </Badge>
                              )}
                              <span className="text-[10px] text-slate-400">Allocated to {effectiveContractor || "Your Agency"}</span>
                            </div>
                          </td>

                          {/* Allocation Date */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-300 border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>{c.contract_date ? c.contract_date.split(" ")[0] : c.creation ? c.creation.split(" ")[0] : "Active"}</span>
                            </div>
                          </td>

                          {/* CV Download */}
                          <td className="px-4 py-3.5 text-center border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            {c.cv_file_url ? (
                              <a
                                href={c.cv_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                              >
                                <Download className="h-3 w-3" />
                                <span>PDF CV</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {/* Detail Button */}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCandidateForDetail(candidateForModal)}
                                className="h-7 px-2.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-[#2a2a35] hover:bg-slate-100 dark:hover:bg-[#1e1e28] text-slate-700 dark:text-zinc-300 shadow-2xs"
                                title="View full candidate details"
                              >
                                <Eye className="mr-1 h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                                Details
                              </Button>

                              {/* Contract Upload or View Button or Select Another Candidate */}
                              {(c as any).request_denied === 1 ? (
                                <Link href="/agent">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs whitespace-nowrap"
                                  >
                                    Browse Candidates
                                  </Button>
                                </Link>
                              ) : c.status === "Requested" || (!c.contract_file && c.status !== "Selected" && c.status !== "Clearance" && c.status !== "Processing" && c.status !== "Stamped" && c.status !== "Ticketed" && c.status !== "Departed") ? (
                                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-2.5 py-1">
                                  Waiting for confirmation
                                </span>
                              ) : c.contract_file ? (
                                <a
                                  href={c.contract_file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-semibold rounded-xl border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-2xs"
                                  >
                                    <FileText className="mr-1 h-3.5 w-3.5" />
                                    View Contract
                                  </Button>
                                </a>
                              ) : (
                                <Link href={`/applicants/${encodeURIComponent(c.name)}/contractor-doc`}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 px-3 text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-2xs whitespace-nowrap"
                                  >
                                    <FileUp className="mr-1.5 h-3.5 w-3.5" />
                                    Upload Contract
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Desktop Compact Pagination */}
              {filteredCandidates.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-[#1d1d24] bg-slate-50/50 dark:bg-[#121216] text-xs text-slate-500">
                  <span>
                    Showing {Math.min(filteredCandidates.length, (reservedPage - 1) * pageSize + 1)}–{Math.min(filteredCandidates.length, reservedPage * pageSize)} of {filteredCandidates.length} applicants
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={reservedPage <= 1}
                      onClick={() => setReservedPage((p) => Math.max(1, p - 1))}
                      className="h-6 px-2 text-[11px]"
                    >
                      Prev
                    </Button>
                    <span className="font-semibold text-slate-700 dark:text-zinc-300 px-1">
                      {reservedPage} / {totalReservedPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={reservedPage >= totalReservedPages}
                      onClick={() => setReservedPage((p) => Math.min(totalReservedPages, p + 1))}
                      className="h-6 px-2 text-[11px]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
            )
          ) : (
            /* activeTab === "muayena" (Waiting for Contract) */
            isLoadingMuayena ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Loading Muayena workers...
                </span>
              </div>
            ) : isErrorMuayena ? (
              <div className="p-8">
                <LoadError
                  title="Could not load Muayena workers"
                  error={errorMuayena}
                  onRetry={() => refetchMuayena()}
                />
              </div>
            ) : filteredMuayenaWorkers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1c1c22] text-slate-400 mb-3">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Muayena Workers Waiting for Contract
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
                  Muayena workers registered with your agency will appear here while waiting for the office to generate their case contract.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto lg:overflow-hidden relative">
                  <table className="w-full text-left text-xs min-w-[780px] lg:min-w-0 border-separate border-spacing-0 lg:table-fixed">
                    <thead className="bg-slate-100 dark:bg-[#16161b] text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">
                          Worker
                        </th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Passport Number</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Target Job & Destination</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Registered On</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Status</th>
                        <th className="px-4 py-3.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                      {paginatedMuayenaWorkers.map((w) => {
                        const workerNameDisplay = w.full_name || "Muayena Worker";
                        const modalItem = {
                          ...w,
                          name: w.applicant,
                          applicant: w.applicant,
                          applicant_name: workerNameDisplay,
                          full_name: workerNameDisplay,
                        };

                        return (
                          <tr
                            key={w.applicant || w.passport_number}
                            onClick={() => setSelectedCandidateForDetail(modalItem)}
                            className="group hover:bg-slate-100/90 dark:hover:bg-[#16161c] transition cursor-pointer"
                            title="Click to view full worker details"
                          >
                            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227]">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <CandidatePhotoAvatar
                                  applicantId={w.applicant}
                                  name={workerNameDisplay}
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
                                    {workerNameDisplay}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-mono">Muayena Track</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] font-mono text-xs text-slate-700 dark:text-zinc-300">
                              {w.passport_number || "—"}
                            </td>
                            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227]">
                              <p className="font-semibold text-slate-800 dark:text-zinc-200">{w.target_job || "House Worker"}</p>
                              <p className="text-[10px] text-slate-400">{w.destination_country || "—"}</p>
                            </td>
                            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227] text-slate-600 dark:text-zinc-300 text-xs">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{w.registered_on ? w.registered_on.split(" ")[0] : "Recent"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-[#222227]">
                              <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                                Waiting for contract
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-right border-b border-slate-100 dark:border-[#222227] whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedCandidateForDetail(modalItem)}
                                  className="h-7 px-2.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-[#2a2a35] hover:bg-slate-100 dark:hover:bg-[#1e1e28] text-slate-700 dark:text-zinc-300 shadow-2xs"
                                >
                                  <Eye className="mr-1 h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                                  Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Muayena Pagination */}
                {filteredMuayenaWorkers.length > pageSize && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-[#1d1d24] bg-slate-50/50 dark:bg-[#121216] text-xs text-slate-500">
                    <span>
                      Showing {Math.min(filteredMuayenaWorkers.length, (muayenaPage - 1) * pageSize + 1)}–{Math.min(filteredMuayenaWorkers.length, muayenaPage * pageSize)} of {filteredMuayenaWorkers.length} workers
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={muayenaPage <= 1}
                        onClick={() => setMuayenaPage((p) => Math.max(1, p - 1))}
                        className="h-6 px-2 text-[11px]"
                      >
                        Prev
                      </Button>
                      <span className="font-semibold text-slate-700 dark:text-zinc-300 px-1">
                        {muayenaPage} / {totalMuayenaPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={muayenaPage >= totalMuayenaPages}
                        onClick={() => setMuayenaPage((p) => Math.min(totalMuayenaPages, p + 1))}
                        className="h-6 px-2 text-[11px]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Full Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidateForDetail}
        isOpen={!!selectedCandidateForDetail}
        onClose={() => setSelectedCandidateForDetail(null)}
        isAlreadyReserved={true}
      />
    </AgentLayout>
  );
}
