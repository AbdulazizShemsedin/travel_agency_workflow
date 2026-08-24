"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Plane,
  FileCheck,
  Stamp,
  Ticket,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Calendar,
  Building2,
  Loader2,
} from "lucide-react";
import { getAgencyPipelineCandidatesApi } from "@/lib/api/applicantApi";
import { AgencyPipelineCandidate } from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AgentPipelinePage() {
  const { authUser, agencyContext } = useAuth();
  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;
  const [selectedStage, setSelectedStage] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const {
    data: pipelineCandidates = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-pipeline", selectedStage, effectiveContractor],
    queryFn: () => getAgencyPipelineCandidatesApi({ stage: selectedStage, limit: 100 }),
  });

  const filteredCandidates = pipelineCandidates.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.passport_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sponsor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stages = [
    { label: "All Candidates", value: "all" },
    { label: "Selected", value: "Selected" },
    { label: "Processing", value: "Processing" },
    { label: "Visa Stamped", value: "Stamped" },
    { label: "Ticket Issued", value: "Ticketed" },
    { label: "Departed", value: "Departed" },
  ];

  const getStageBadge = (state: string) => {
    switch (state) {
      case "Departed":
        return <Badge className="bg-emerald-600 text-white">✈️ Departed</Badge>;
      case "Ticketed":
        return <Badge className="bg-blue-600 text-white">🎫 Ticket Issued</Badge>;
      case "Stamped":
        return <Badge className="bg-purple-600 text-white">🏛️ Visa Stamped</Badge>;
      case "Processing":
        return <Badge className="bg-amber-600 text-white">⏳ Processing Clearances</Badge>;
      case "Selected":
        return <Badge className="bg-teal-600 text-white">📋 Contract Pending</Badge>;
      default:
        return <Badge variant="outline">{state || "In Pipeline"}</Badge>;
    }
  };

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Live Deployment Pipeline
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Active Tracking
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Live milestones for candidates reserved and allocated to {activeContractor}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs rounded-xl border-slate-200 dark:border-[#26262f]"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-700" : ""}`} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {stages.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStage(st.value)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  selectedStage === st.value
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search candidate, sponsor, passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-white dark:bg-[#141418] border-slate-200 dark:border-[#26262f]"
            />
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">Loading pipeline candidates...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <Plane className="h-10 w-10 text-emerald-600/40 dark:text-emerald-400/40 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Pipeline Candidates Found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                No candidates in this stage for {activeContractor}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Job & Destination</th>
                    <th className="px-4 py-3.5">Contract & Sponsor</th>
                    <th className="px-4 py-3.5">Flight & Ticketing</th>
                    <th className="px-4 py-3.5">Milestone Status</th>
                    <th className="px-4 py-3.5 text-right">CV Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                  {filteredCandidates.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
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

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">{c.job_applied || "Housemaid"}</p>
                        <p className="text-[10px] text-slate-400">{c.destination_country || "Saudi Arabia"}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200">
                          {c.sponsor_name || "Sponsor Assigned"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {c.visa_number ? `Visa #${c.visa_number}` : "Visa in clearance"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        {c.flight_number || c.airline ? (
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">
                              ✈️ {c.airline || "ET"} {c.flight_number || ""}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {c.flight_date ? `Date: ${c.flight_date}` : "Scheduled"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Awaiting Ticketing</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {getStageBadge(c.applicant_state)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {c.cv_file_url ? (
                          <a
                            href={c.cv_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#26262f] bg-slate-50 dark:bg-[#18181f] px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-slate-100"
                          >
                            <Download className="h-3 w-3" />
                            PDF CV
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
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
