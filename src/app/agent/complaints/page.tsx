"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Plus,
  CheckCircle2,
  Paperclip,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Search,
  ChevronDown,
  User,
  ArrowUpDown,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import {
  listMyComplaintsV2,
  createComplaintV2,
  uploadFileV2,
  listMyPlacementsV2,
  V2MyComplaintItem,
} from "@/lib/api/v2";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITIES,
  ComplaintCategory,
  ComplaintSeverity,
} from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumDropzone } from "@/components/ui/PremiumDropzone";
import { LoadError } from "@/components/ui/LoadError";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { shortRef } from "@/lib/utils/display-id";

export default function AgentComplaintsPage() {
  const queryClient = useQueryClient();
  const { authUser, agencyContext } = useAuth();
  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;
  const [activeTab, setActiveTab] = React.useState<"unresolved" | "resolved">("unresolved");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  // Submit Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    placement_name: "",
    full_name: "",
    passport_number: "",
    complaint_category: COMPLAINT_CATEGORIES[0] as ComplaintCategory,
    severity: "High" as ComplaintSeverity,
    complaint_details: "",
    attachment: "",
  });
  const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = React.useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = React.useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Fetch complaints via portal API (no staff-only endpoints)
  const {
    data: allComplaints = [],
    isLoading,
    error: complaintsError,
    refetch,
    isRefetching,
  } = useQuery<V2MyComplaintItem[]>({
    queryKey: ["agent-my-complaints"],
    queryFn: () => listMyComplaintsV2(),
    retry: false,
  });

  // Fetch agency placements for complaint submission dropdown
  const { data: myPlacements = [] } = useQuery({
    queryKey: ["agency-placements-for-complaints", effectiveContractor],
    queryFn: () => listMyPlacementsV2(effectiveContractor || undefined),
    enabled: Boolean(effectiveContractor),
    retry: false,
  });

  // Filter complaints by active tab
  const tabFilteredComplaints = React.useMemo(() => {
    const isClosed = (status: string) => status === "Resolved" || status === "Closed";
    if (activeTab === "unresolved") {
      return allComplaints.filter((c) => !isClosed(c.status));
    }
    return allComplaints.filter((c) => isClosed(c.status));
  }, [allComplaints, activeTab]);

  // Sort complaints
  const sortedComplaints = React.useMemo(() => {
    return [...tabFilteredComplaints].sort((a, b) => {
      const timeA = a.creation ? new Date(a.creation).getTime() : 0;
      const timeB = b.creation ? new Date(b.creation).getTime() : 0;
      if (sortOrder === "newest") return timeB - timeA;
      return timeA - timeB;
    });
  }, [tabFilteredComplaints, sortOrder]);

  const openCount = React.useMemo(() => {
    return allComplaints.filter((c) => c.status !== "Resolved" && c.status !== "Closed").length;
  }, [allComplaints]);

  const resolvedCount = React.useMemo(() => {
    return allComplaints.filter((c) => c.status === "Resolved" || c.status === "Closed").length;
  }, [allComplaints]);

  // Filter candidate options for dropdown
  const filteredCandidates = React.useMemo(() => {
    if (!candidateSearchQuery.trim()) return myPlacements;
    const q = candidateSearchQuery.toLowerCase().trim();
    return myPlacements.filter((p: any) => {
      const name = (p.full_name || p.applicant_name || "").toLowerCase();
      const pass = (p.passport_number || "").toLowerCase();
      return name.includes(q) || pass.includes(q);
    });
  }, [myPlacements, candidateSearchQuery]);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await createComplaintV2(
        data.placement_name,
        `[${data.complaint_category} - ${data.severity}] ${data.complaint_details}`,
        "Working Abroad"
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["agent-my-complaints"] });
      setIsSubmitModalOpen(false);
      setFormError(null);
      setFormData({
        placement_name: "",
        full_name: "",
        passport_number: "",
        complaint_category: COMPLAINT_CATEGORIES[0],
        severity: "High",
        complaint_details: "",
        attachment: "",
      });
      setToastMessage(res?.message || "Complaint submitted successfully.");
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setFormError(err?.message || "Failed to submit complaint. Please check fields and try again.");
    },
  });

  const handleFileSelect = async (file: File) => {
    setIsUploadingAttachment(true);
    setFormError(null);
    try {
      const res = await uploadFileV2(file, true);
      const fileUrl = res?.file_url || "";
      if (fileUrl) {
        setFormData((prev) => ({ ...prev, attachment: fileUrl }));
      } else {
        throw new Error("No file URL returned from server.");
      }
    } catch (err: any) {
      setFormError(err?.message || "Failed to upload attachment file to server. Please try again.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  return (
    <AgentLayout
      activeContractor={activeContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="space-y-4 pb-6">
        {/* Back Link */}
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidate Directory
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Foreign Agency Complaints Desk
              </h2>
              <span className="rounded-full bg-slate-100 dark:bg-[#1f1f26] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
                Dispute Tickets
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              File and track dispute tickets for candidates placed with your agency.
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
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              File Formal Complaint
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* Tab Navigation & Sort Toolbar */}
        <div className="space-y-3 border-b border-slate-200 dark:border-[#222228] pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("unresolved")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "unresolved"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
                }`}
              >
                🚨 Open Backlog ({complaintsError ? "—" : isLoading ? "..." : openCount})
              </button>
              <button
                onClick={() => setActiveTab("resolved")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "resolved"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
                }`}
              >
                ✓ Resolved / Closed ({complaintsError ? "—" : isLoading ? "..." : resolvedCount})
              </button>
            </div>

            {/* Quick Sort Toolbar (Most Recent / Oldest First) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="newest">Most Recent First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Listing Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">Loading complaints desk...</span>
            </div>
          ) : complaintsError ? (
            <div className="p-8">
              <LoadError
                title="Failed to load agency complaints"
                error={complaintsError}
                onRetry={() => refetch()}
              />
            </div>
          ) : sortedComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600/40 dark:text-emerald-400/40 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Complaints Found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {activeTab === "unresolved"
                  ? "There are currently no open complaint tickets for your agency."
                  : "No resolved complaints on record."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto md:overflow-x-clip max-h-[calc(100vh-270px)] min-h-[300px] overflow-y-auto relative">
              <table className="w-full text-left text-xs min-w-[800px] md:min-w-0 border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-[#16161b]/95 backdrop-blur-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Ticket #</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Candidate</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Passport</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Target Job</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Status</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] min-w-[200px]">Details</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Date Filed</th>
                    <th className="px-3 py-2.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#202026]">
                  {sortedComplaints.map((c) => {
                    const displayNo = c.display_no ? `#${c.display_no}` : shortRef(c.name);
                    const candidateName = c.full_name || "—";
                    const passportNumber = c.passport_number || "—";
                    const targetJob = c.target_job || "Housemaid";

                    return (
                      <tr key={c.name} className="hover:bg-slate-50/70 dark:hover:bg-[#16161c]/70 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          {displayNo}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#202026]">
                          {candidateName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-zinc-300 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          {passportNumber}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {targetJob}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === "New"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : c.status === "Unresolved"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : c.status === "Resolved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-sm border-b border-slate-100 dark:border-[#202026]">
                          <p className="text-slate-800 dark:text-zinc-200 text-xs line-clamp-2">
                            {c.description || "—"}
                          </p>
                          {c.resolution_notes && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 line-clamp-1">
                              Resolution: {c.resolution_notes}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 dark:border-[#202026] text-slate-600 dark:text-zinc-400">
                          {c.creation ? new Date(c.creation).toLocaleDateString() : "Recent"}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          <div className="flex items-center justify-end gap-2">
                            {c.attachment && (
                              <a
                                href={c.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#26262f] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
                              >
                                <Paperclip className="h-3 w-3" />
                                File
                              </a>
                            )}
                            <UndoLastStepButton
                              doctype="Complaint"
                              name={c.name}
                              label="Undo"
                              size="sm"
                              onSuccess={() => refetch()}
                            />
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

        {/* Submit Complaint Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202026]">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      File Agency Complaint
                    </h3>
                    <p className="text-xs text-slate-500">
                      Agency: {activeContractor}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formData.placement_name.trim()) {
                    setFormError("Please select a candidate.");
                    return;
                  }
                  if (!formData.complaint_details.trim()) {
                    setFormError("Please provide incident details.");
                    return;
                  }
                  submitMutation.mutate(formData);
                }}
                className="space-y-4 text-xs"
              >
                {/* Form Error Banner */}
                {formError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/60 dark:border-rose-800 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 shadow-xs">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Validation Error</p>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">{formError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Select Candidate *</Label>
                    <span className="text-[10px] text-slate-400">Search by name or passport</span>
                  </div>

                  {formData.placement_name && formData.full_name ? (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white font-bold text-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-emerald-950 dark:text-emerald-200">{formData.full_name}</p>
                          <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                            {formData.passport_number ? `Passport: ${formData.passport_number}` : "Candidate Selected"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, placement_name: "", full_name: "", passport_number: "" }));
                          setIsCandidateDropdownOpen(true);
                        }}
                        className="h-7 text-[11px] rounded-lg border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                      >
                        Change Candidate
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCandidateDropdownOpen(!isCandidateDropdownOpen)}
                        className="w-full h-10 px-3 flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] text-xs text-slate-700 dark:text-zinc-200 hover:border-emerald-600 transition text-left shadow-xs"
                      >
                        <span className="text-slate-400">
                          Click to choose candidate or search by name / passport...
                        </span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isCandidateDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isCandidateDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#15151a] p-2.5 shadow-2xl space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              autoFocus
                              placeholder="Type name or passport..."
                              value={candidateSearchQuery}
                              onChange={(e) => setCandidateSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-xs rounded-lg bg-slate-50 dark:bg-[#1a1a22] border-slate-200 dark:border-[#26262f]"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202028] rounded-lg">
                            {filteredCandidates.length === 0 ? (
                              <div className="p-4 text-center text-[11px] text-slate-400">
                                {myPlacements.length === 0
                                  ? "No candidates currently placed with your agency."
                                  : `No placed candidates match "${candidateSearchQuery}"`}
                              </div>
                            ) : (
                              filteredCandidates.map((cand: any) => (
                                <button
                                  key={cand.name}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      placement_name: cand.name,
                                      full_name: cand.full_name || cand.applicant_name || "Candidate",
                                      passport_number: cand.passport_number || "",
                                    }));
                                    setIsCandidateDropdownOpen(false);
                                    setCandidateSearchQuery("");
                                    setFormError(null);
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-slate-100 dark:hover:bg-[#1f1f26] rounded-lg transition flex items-center justify-between text-xs group"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-[#22222a] text-slate-600 dark:text-zinc-300 font-bold text-[10px]">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                        {cand.full_name || cand.applicant_name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        {cand.passport_number ? `Passport: ${cand.passport_number}` : ""} {cand.target_job ? `(${cand.target_job})` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    Select →
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Dispute Category *</Label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs text-slate-800 dark:text-zinc-200"
                      value={formData.complaint_category}
                      onChange={(e) => setFormData({ ...formData, complaint_category: e.target.value as ComplaintCategory })}
                    >
                      {COMPLAINT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Severity Level *</Label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs text-slate-800 dark:text-zinc-200"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as ComplaintSeverity })}
                    >
                      {COMPLAINT_SEVERITIES.map((sev) => (
                        <option key={sev} value={sev}>
                          {sev}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Detailed Incident Description *</Label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Provide clinic reports, sponsor statements, or date of incident..."
                    value={formData.complaint_details}
                    onChange={(e) => setFormData({ ...formData, complaint_details: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Attach Evidence / Medical Report (Optional)</Label>
                  <PremiumDropzone
                    id="complaint-evidence-dropzone"
                    variant="compact"
                    value={formData.attachment}
                    isLoading={isUploadingAttachment}
                    loadingText="Uploading dispute evidence..."
                    label="Attach Incident Evidence / Medical Report"
                    description="PDF or photo (up to 20MB)"
                    onFileSelect={handleFileSelect}
                    onRemove={() => setFormData((prev) => ({ ...prev, attachment: "" }))}
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-[#202026] flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || isUploadingAttachment}
                    className="bg-rose-800 hover:bg-rose-900 text-white font-semibold text-xs rounded-xl"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Formal Dispute"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
