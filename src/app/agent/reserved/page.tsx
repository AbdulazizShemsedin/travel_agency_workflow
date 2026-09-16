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
} from "lucide-react";
import {
  listPlacementsV2,
  V2PlacementRecord,
} from "@/lib/api/v2";
import { getCandidatePhotoUrl } from "@/lib/api/v2/portal";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { CandidateDetailModal } from "@/components/agent/CandidateDetailModal";

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
  const src = !hasError && (photoUrl || getCandidatePhotoUrl(applicantId, "photograph"));

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

  const {
    data: reservedCandidates = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-reserved-candidates", effectiveContractor],
    queryFn: () => listPlacementsV2(),
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

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Selected Applicants
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {filteredCandidates.length} Selected Candidate{filteredCandidates.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Applicants selected and reserved by your foreign agency. Click any row or Details button to view full candidate profile.
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
              Refresh
            </Button>

            <Link href="/agent">
              <Button
                type="button"
                size="sm"
                className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search candidate name, passport, job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-white dark:bg-[#141418] border-slate-200 dark:border-[#26262f]"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Loading selected applicants...
              </span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-rose-600">
              <p className="text-xs font-semibold">{(error as Error)?.message || "Failed to load selected applicants."}</p>
              <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3 text-xs">
                Retry
              </Button>
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
                You haven&apos;t selected any applicants from the marketplace yet. Browse available applicants to allocate them to your agency.
              </p>
              <Link href="/agent" className="mt-4">
                <Button size="sm" className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white">
                  Go to Candidate Marketplace
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-xs min-w-[780px] border-separate border-spacing-0">
                <thead className="bg-slate-50/95 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-[#16161b] px-2 py-2 sm:px-4 sm:py-3.5 w-[130px] min-w-[130px] max-w-[140px] sm:w-auto sm:min-w-[240px] sm:max-w-[280px] border-b border-r border-slate-200 dark:border-[#222227] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)]">
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
                  {filteredCandidates.map((c) => {
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
                        className="group hover:bg-emerald-50/40 dark:hover:bg-[#16161c]/80 transition cursor-pointer"
                        title="Click to view full candidate details"
                      >
                        {/* Candidate Identity - STICKY FIRST COLUMN */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-[#121216] group-hover:bg-emerald-50/40 dark:group-hover:bg-[#16161c] px-2 py-2 sm:px-4 sm:py-3.5 w-[130px] min-w-[130px] max-w-[140px] sm:w-auto sm:min-w-[240px] sm:max-w-[280px] border-b border-r border-slate-100 dark:border-[#222227] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)] transition-colors">
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
                            <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                              ✓ Reserved ({c.status || "Selected"})
                            </Badge>
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

                            {/* Contract Upload or View Button */}
                            {c.contract_file ? (
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
