"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  Paperclip,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  Search,
  ChevronDown,
  User,
  Check,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  listUnresolvedComplaintsV2,
  createComplaintV2,
  uploadFileV2,
  listPlacementsV2,
  V2ComplaintItem,
} from "@/lib/api/v2";
import {
  AgencyComplaint,
  ComplaintSeverity,
  ComplaintCategory,
  COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITIES,
} from "@/types/applicant";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/AuthProvider";

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
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All Categories");
  const [severityFilter, setSeverityFilter] = React.useState<string>("All Severities");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest" | "severity" | "sla">("newest");

  // Submit Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    applicant_search: "",
    full_name: "",
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

  // Fetch all placements for searchable dropdown
  const { data: allAvailableCandidates = [] } = useQuery({
    queryKey: ["all-agency-placements", activeContractor],
    queryFn: () => listPlacementsV2(),
  });

  // Dynamic filter by first name, last name, full name, or ID
  const filteredCandidateOptions = React.useMemo(() => {
    if (!candidateSearchQuery.trim()) return allAvailableCandidates;
    const q = candidateSearchQuery.toLowerCase().trim();
    return (allAvailableCandidates as any[]).filter((c) => {
      const fullName = (c.full_name || c.applicant_name || "").toLowerCase();
      const parts = fullName.split(" ").filter(Boolean);
      const firstName = parts[0] || "";
      const lastName = parts[parts.length - 1] || "";
      const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
      const pass = (c.passport_number || "").toLowerCase();

      return (
        c.name.toLowerCase().includes(q) ||
        (c.applicant && c.applicant.toLowerCase().includes(q)) ||
        fullName.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        middleName.includes(q) ||
        pass.includes(q)
      );
    });
  }, [allAvailableCandidates, candidateSearchQuery]);

  // Query Complaints
  const {
    data: complaints = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-complaints", activeTab, effectiveContractor],
    queryFn: () => listUnresolvedComplaintsV2(),
  });

  // Client-side filtering & sorting
  const filteredAndSortedComplaints = React.useMemo(() => {
    let list = (complaints as any[]);

    // Filter by Category
    if (categoryFilter !== "All Categories") {
      list = list.filter((c) => c.complaint_category === categoryFilter || c.category === categoryFilter);
    }

    // Filter by Severity
    if (severityFilter !== "All Severities") {
      list = list.filter((c) => c.severity === severityFilter);
    }

    // Sort order
    list.sort((a, b) => {
      if (sortOrder === "newest") {
        const timeA = a.creation ? new Date(a.creation).getTime() : 0;
        const timeB = b.creation ? new Date(b.creation).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOrder === "oldest") {
        const timeA = a.creation ? new Date(a.creation).getTime() : 0;
        const timeB = b.creation ? new Date(b.creation).getTime() : 0;
        return timeA - timeB;
      }
      return 0;
    });

    return list;
  }, [complaints, categoryFilter, severityFilter, sortOrder]);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const placementTarget = data.applicant_search;
      return await createComplaintV2(
        placementTarget,
        `[${data.complaint_category} - ${data.severity}] ${data.complaint_details}`,
        "Working Abroad"
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["agency-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      setIsSubmitModalOpen(false);
      setFormError(null);
      setFormData({
        applicant_search: "",
        full_name: "",
        complaint_category: COMPLAINT_CATEGORIES[0],
        severity: "High",
        complaint_details: "",
        attachment: "",
      });
      setToastMessage(res?.message || "Complaint submitted successfully.");
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setFormError(
        err?.message ||
        `Placement "${formData.applicant_search}" could not be validated. Complaints can only be filed for active placements.`
      );
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingAttachment(true);
      setFormError(null);
      try {
        const res = await uploadFileV2(file, true, "Agency Complaint");
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
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical / Emergency":
      case "Critical":
        return <Badge variant="destructive">Critical / Emergency</Badge>;
      case "High":
        return <Badge variant="warning">High Priority</Badge>;
      case "Normal":
      case "Medium":
      case "Low":
      default:
        return <Badge variant="outline">Normal</Badge>;
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
                Foreign Agency Complaints Desk
              </h2>
              <span className="rounded-full bg-slate-100 dark:bg-[#1f1f26] px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
                90-Day Guarantee
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              File and track dispute tickets, arrival medical failures, runway claims, and free candidate replacement requests.
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

        {/* Multi-Tab Navigation & Filter/Sort Toolbar */}
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
                🚨 Unresolved Backlog ({complaints.length})
              </button>
              <button
                onClick={() => setActiveTab("resolved")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === "resolved"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
                }`}
              >
                ✓ Resolved / Replaced
              </button>
            </div>

            {/* Quick Sort & Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="All Categories">All Categories</option>
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
                <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="All Severities">All Severities</option>
                  {COMPLAINT_SEVERITIES.map((sev) => (
                    <option key={sev} value={sev}>
                      {sev}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="newest">Most Recent First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="severity">Severity: Highest First</option>
                  <option value="sla">Longest Unresolved SLA</option>
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
          ) : filteredAndSortedComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600/40 dark:text-emerald-400/40 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Complaints Found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                There are currently no tickets matching your active filters for {activeContractor}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#202026]">
              {filteredAndSortedComplaints.map((c) => (
                <div
                  key={c.name}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-[#16161c]/70 transition"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-[#202026] px-2 py-0.5 rounded-md">
                        {c.name}
                      </span>
                      {getSeverityBadge(c.severity)}
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        {c.complaint_category}
                      </span>
                      {c.days_unresolved !== undefined && c.days_unresolved > 0 && (
                        <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                          ⏱ {c.days_unresolved}d unresolved
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300">
                      {c.complaint_details}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-zinc-500 pt-1">
                      <span>Candidate: <strong className="text-slate-700 dark:text-zinc-300">{c.full_name || c.applicant}</strong> ({c.applicant})</span>
                      {c.passport_number && <span>Passport: <strong className="text-slate-700 dark:text-zinc-300">{c.passport_number}</strong></span>}
                      <span>Logged: {c.creation?.split(" ")[0]}</span>
                      {c.outcome && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Outcome: {c.outcome}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.attachment && (
                      <a
                        href={c.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#26262f] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
                      >
                        <Paperclip className="h-3 w-3" />
                        Attachment
                      </a>
                    )}
                    {c.status === "Resolved" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ✓ {c.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
                  if (!formData.applicant_search.trim()) {
                    setFormError("Please enter or select a registered candidate.");
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
                    <Label className="text-xs font-semibold">Select Applicant *</Label>
                    <span className="text-[10px] text-slate-400">Search by first/last name or pick from list</span>
                  </div>

                  {formData.applicant_search && formData.full_name ? (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white font-bold text-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-emerald-950 dark:text-emerald-200">{formData.full_name}</p>
                          <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                            {formData.applicant_search}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, applicant_search: "", full_name: "" }));
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
                          Click to choose candidate or search by first/last name...
                        </span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isCandidateDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isCandidateDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#15151a] p-2.5 shadow-2xl space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              autoFocus
                              placeholder="Type first name, last name, or ID..."
                              value={candidateSearchQuery}
                              onChange={(e) => setCandidateSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-xs rounded-lg bg-slate-50 dark:bg-[#1a1a22] border-slate-200 dark:border-[#26262f]"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202028] rounded-lg">
                            {filteredCandidateOptions.length === 0 ? (
                              <div className="p-4 text-center text-[11px] text-slate-400">
                                No registered applicants match &quot;{candidateSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredCandidateOptions.map((cand) => (
                                <button
                                  key={cand.name}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      applicant_search: cand.name,
                                      full_name: cand.full_name,
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
                                        {cand.full_name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        {cand.name} {cand.passport_number ? `• ${cand.passport_number}` : ""}
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
                      onChange={(e) => setFormData({ ...formData, complaint_category: e.target.value })}
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
                  <Label className="text-xs font-semibold">Attach Evidence / Medical Report (PDF or Image)</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {isUploadingAttachment && <p className="text-[11px] text-emerald-600">Uploading document...</p>}
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
