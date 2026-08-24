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
  Globe2,
  Briefcase,
  Download,
  Loader2,
  FileText,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { getAgencyReservedCandidatesApi } from "@/lib/api/applicantApi";
import { AgencyPipelineCandidate } from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";

export default function MyReservedCandidatesPage() {
  const { authUser, agencyContext } = useAuth();

  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

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
    queryFn: () => getAgencyReservedCandidatesApi(effectiveContractor),
  });

  const filteredCandidates = React.useMemo(() => {
    return reservedCandidates.filter((c) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.passport_number?.toLowerCase().includes(q) ||
        c.job_applied?.toLowerCase().includes(q)
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
                My Reserved Candidates
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {filteredCandidates.length} Active Allocation{filteredCandidates.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Applicants reserved by your agency. Upload Musaned employment contracts to generate dossiers and advance to processing.
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
              placeholder="Search candidate name, ID, passport..."
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
                Loading reserved candidates from backend...
              </span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-rose-600">
              <p className="text-xs font-semibold">{(error as Error)?.message || "Failed to load reserved candidates."}</p>
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
                No Reserved Candidates Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
                You haven&apos;t reserved any candidates from the pool yet. Select candidates from the marketplace to allocate them.
              </p>
              <Link href="/agent" className="mt-4">
                <Button size="sm" className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white">
                  Go to Candidate Marketplace
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Job & Destination</th>
                    <th className="px-4 py-3.5">Reservation Status</th>
                    <th className="px-4 py-3.5">Allocation Date</th>
                    <th className="px-4 py-3.5 text-center">CV Document</th>
                    <th className="px-4 py-3.5 text-right">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                  {filteredCandidates.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                      {/* Candidate Identity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {c.photo_passport ? (
                            <img
                              src={c.photo_passport}
                              alt={c.full_name}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-[#26262f]"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-800 text-xs">
                              {c.full_name?.slice(0, 2) || "CA"}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{c.full_name || c.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {c.name} • {c.passport_number || "Passport Verified"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Job & Destination */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">{c.job_applied || "Housemaid"}</p>
                        <p className="text-[10px] text-slate-400">{c.destination_country || "Saudi Arabia"}</p>
                      </td>

                      {/* Reservation Status */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                            ✓ Reserved (Selected)
                          </Badge>
                          <span className="text-[10px] text-slate-400">Locked to {effectiveContractor || "Your Agency"}</span>
                        </div>
                      </td>

                      {/* Allocation Date */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{c.contract_date ? c.contract_date.split(" ")[0] : "Active"}</span>
                        </div>
                      </td>

                      {/* CV Download */}
                      <td className="px-4 py-3.5 text-center">
                        {c.cv_file_url ? (
                          <a
                            href={c.cv_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            <span>PDF CV</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Primary Next Action */}
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/applicants/${encodeURIComponent(c.name)}/contractor-doc`}>
                          <Button
                            type="button"
                            size="sm"
                            className="text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-2xs"
                          >
                            <FileUp className="mr-1.5 h-3.5 w-3.5" />
                            Upload Musaned Contract
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
