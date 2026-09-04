"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  Paperclip,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  UserCheck,
  Building2,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import {
  listUnresolvedComplaintsV2,
  listNewComplaintsV2,
  listComplaintsV2,
  createComplaintV2,
  resolveComplaintV2,
  acknowledgeComplaintV2,
  listContractorsV2,
  listApplicantsV2,
  uploadFileV2,
  V2ComplaintItem,
} from "@/lib/api/v2";
import {
  AgencyComplaint,
  ComplaintSeverity,
  ComplaintCategory,
  COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITIES,
  COMPLAINT_OUTCOMES,
} from "@/types/applicant";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"new" | "unresolved" | "all" | "resolved">("new");
  const [statusFilter, setStatusFilter] = React.useState("All Statuses");
  const [contractorFilter, setContractorFilter] = React.useState("All Agencies");
  const [categoryFilter, setCategoryFilter] = React.useState("All Categories");
  const [severityFilter, setSeverityFilter] = React.useState("All Severities");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest" | "severity" | "sla">("oldest");

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors_v2"],
    queryFn: () => listContractorsV2(),
  });

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [submitForm, setSubmitForm] = React.useState({
    contractor: "",
    applicant_search: "",
    full_name: "",
    complaint_category: COMPLAINT_CATEGORIES[0] as ComplaintCategory,
    severity: "High" as ComplaintSeverity,
    complaint_details: "",
    attachment: "",
  });

  // Auto-set contractor default once loaded
  React.useEffect(() => {
    if (!submitForm.contractor && contractors.length > 0) {
      setSubmitForm((prev) => ({
        ...prev,
        contractor: prev.contractor || (contractors[0] as any)?.name || "",
      }));
    }
  }, [contractors, submitForm.contractor]);

  // Resolve Modal
  const [selectedComplaintForResolve, setSelectedComplaintForResolve] = React.useState<any | null>(null);
  const [resolveForm, setResolveForm] = React.useState({
    outcome: COMPLAINT_OUTCOMES[0] as string,
    resolution_notes: "",
    replacement_applicant: "",
    return_date: new Date().toISOString().split("T")[0],
  });

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Authoritative query based on active tab and status filter
  const { data: complaints = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-complaints-v2", activeTab, statusFilter, contractorFilter],
    queryFn: async () => {
      if (activeTab === "new") {
        return await listNewComplaintsV2();
      } else if (activeTab === "unresolved") {
        return await listUnresolvedComplaintsV2();
      } else if (activeTab === "resolved") {
        return await listComplaintsV2("Resolved");
      } else {
        return await listComplaintsV2(statusFilter === "All Statuses" ? undefined : statusFilter);
      }
    },
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

    // Sort Order
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

  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants-v2-complaints"],
    queryFn: () => listApplicantsV2(),
  });

  const availableReplacements = (applicants as any[]).filter((a) => a.applicant_state === "Registered" || a.applicant_state === "CV Generated");

  const submitMutation = useMutation({
    mutationFn: async (data: typeof submitForm) => {
      return await createComplaintV2(
        data.applicant_search,
        `[${data.complaint_category} - ${data.severity}] ${data.complaint_details}`,
        "Working Abroad"
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints-v2"] });
      setIsSubmitModalOpen(false);
      setErrorMessage(null);
      setSubmitForm({
        contractor: (contractors[0] as any)?.name || "",
        applicant_search: "",
        full_name: "",
        complaint_category: COMPLAINT_CATEGORIES[0] as ComplaintCategory,
        severity: "High" as ComplaintSeverity,
        complaint_details: "",
        attachment: "",
      });
      setToastMessage(res?.message || "Complaint logged successfully.");
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(formatCleanErrorMessage(err) || "Failed to submit complaint. Please verify applicant exists.");
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (complaintId: string) => {
      return await acknowledgeComplaintV2(complaintId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints-v2"] });
      setToastMessage("Complaint acknowledged and transitioned to Unresolved backlog.");
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(formatCleanErrorMessage(err) || "Failed to acknowledge complaint.");
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: typeof resolveForm & { complaint_id: string }) => {
      return await resolveComplaintV2(data.complaint_id, "Resolved", data.resolution_notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints-v2"] });
      setSelectedComplaintForResolve(null);
      setErrorMessage(null);
      setToastMessage("Complaint resolved and updated.");
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(formatCleanErrorMessage(err) || "Failed to resolve complaint.");
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical / Emergency":
      case "Critical":
        return <Badge variant="destructive">Critical / Emergency</Badge>;
      case "High":
        return <Badge variant="warning">High</Badge>;
      case "Normal":
      case "Medium":
      case "Low":
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Agency Complaints & Dispute Desk
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs rounded-xl"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-700" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log New Ticket
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Filter & Tabs Toolbar */}
      <div className="space-y-3 border-b border-slate-200 dark:border-[#222228] pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("new")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === "new"
                  ? "bg-blue-800 dark:bg-blue-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
              }`}
            >
              New / Triage {activeTab === "new" ? `(${complaints.length})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("unresolved")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === "unresolved"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
              }`}
            >
              Unresolved Backlog {activeTab === "unresolved" ? `(${complaints.length})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === "all"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
              }`}
            >
              All Complaints
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === "resolved"
                  ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
              }`}
            >
              Resolved & Dismissed
            </button>
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter for All Complaints Tab */}
            {activeTab === "all" && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Unresolved">Unresolved</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
            )}

            {/* Agency Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
              <select
                value={contractorFilter}
                onChange={(e) => setContractorFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-hidden"
              >
                <option value="All Agencies">All Foreign Agencies</option>
                {contractors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.company_name || c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#18181e] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#26262f]">
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

            {/* Sort Order */}
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

      {/* Complaints Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading complaints...</span>
          </div>
        ) : filteredAndSortedComplaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No complaints found matching your active filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Ticket #</th>
                <th className="px-4 py-3.5">Partner Agency</th>
                <th className="px-4 py-3.5">Applicant / Passport</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Category & Details</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">{activeTab === "resolved" ? "Resolution" : "SLA / Age"}</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
              {filteredAndSortedComplaints.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">{c.contractor}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.full_name || c.applicant || "Applicant"}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{c.placement || c.applicant || ""}</span>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200">{c.complaint_category || c.worker_status_at_complaint || "Complaint"}</div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{c.description || c.complaint_details}</p>
                  </td>
                  <td className="px-4 py-3">{getSeverityBadge(c.severity || "Normal")}</td>
                  <td className="px-4 py-3">
                    {c.status === "Resolved" || c.status === "Dismissed" ? (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ {c.resolution_notes ? "Resolved with notes" : c.status}
                        </span>
                        {c.resolved_on && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {c.resolved_on} {c.resolved_by ? `by ${c.resolved_by}` : ""}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
                          {c.creation ? c.creation.split(" ")[0] : "Recent"}
                        </span>
                        {c.days_unresolved !== undefined && c.days_unresolved > 0 && (
                          <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                            ⏱ {c.days_unresolved}d unresolved
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {c.status === "New" && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeMutation.mutate(c.name)}
                          disabled={acknowledgeMutation.isPending}
                          className="h-7 text-[11px] bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                        >
                          {acknowledgeMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Acknowledge"
                          )}
                        </Button>
                      )}
                      {c.status !== "Resolved" && c.status !== "Dismissed" ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedComplaintForResolve(c)}
                          className="h-7 text-[11px] bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">✓ Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedComplaintForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202026]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Resolve Complaint #{selectedComplaintForResolve.name}</h3>
                <p className="text-xs text-slate-500">Agency: {selectedComplaintForResolve.contractor}</p>
              </div>
              <button onClick={() => setSelectedComplaintForResolve(null)} className="text-slate-400">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                resolveMutation.mutate({
                  complaint_id: selectedComplaintForResolve.name,
                  ...resolveForm,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Resolution Outcome *</Label>
                <select
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                  value={resolveForm.outcome}
                  onChange={(e) => setResolveForm({ ...resolveForm, outcome: e.target.value })}
                >
                  {COMPLAINT_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {outcome}
                    </option>
                  ))}
                </select>
              </div>

              {resolveForm.outcome.includes("Replacement") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Allocate Free Replacement Candidate</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                    value={resolveForm.replacement_applicant}
                    onChange={(e) => setResolveForm({ ...resolveForm, replacement_applicant: e.target.value })}
                  >
                    <option value="">-- Select Replacement Applicant --</option>
                    {availableReplacements.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.full_name || a.first_name} ({a.name}) - {a.job_applied || "Housemaid"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Resolution Notes *</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Describe resolution terms or agreement with sponsor/agency..."
                  value={resolveForm.resolution_notes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#202026] flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedComplaintForResolve(null)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={resolveMutation.isPending} className="bg-emerald-800 text-white text-xs">
                  {resolveMutation.isPending ? "Resolving..." : "Confirm Resolution"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log New Ticket Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202026]">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Log Agency Dispute Ticket
                  </h3>
                  <p className="text-xs text-slate-500">
                    Internal Operations Desk
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!submitForm.applicant_search.trim()) return;
                submitMutation.mutate(submitForm);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Foreign Partner Agency *</Label>
                <select
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                  value={submitForm.contractor}
                  onChange={(e) => setSubmitForm({ ...submitForm, contractor: e.target.value })}
                >
                  {contractors.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Candidate *</Label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                  value={submitForm.applicant_search}
                  onChange={(e) => {
                    const sel = applicants.find((a) => a.name === e.target.value);
                    const candidateContractor = (sel as any)?.contractor || (sel as any)?.locked_contractor || (sel as any)?.selected_by;
                    setSubmitForm({
                      ...submitForm,
                      applicant_search: e.target.value,
                      full_name: sel ? (sel.full_name || (sel as any).first_name || "") : "",
                      contractor: candidateContractor || submitForm.contractor || (contractors[0] as any)?.name || "",
                    });
                  }}
                >
                  <option value="">-- Select Registered Applicant --</option>
                  {applicants.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.full_name || a.first_name} ({a.name}) {a.passport_number ? `• ${a.passport_number}` : ""} - {a.applicant_state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category *</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                    value={submitForm.complaint_category}
                    onChange={(e) => setSubmitForm({ ...submitForm, complaint_category: e.target.value })}
                  >
                    {COMPLAINT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Severity *</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs"
                    value={submitForm.severity}
                    onChange={(e) => setSubmitForm({ ...submitForm, severity: e.target.value as ComplaintSeverity })}
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
                <Label className="text-xs font-semibold">Dispute Details *</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="State the incident description, embassy reports, or sponsor claim..."
                  value={submitForm.complaint_details}
                  onChange={(e) => setSubmitForm({ ...submitForm, complaint_details: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#202026] flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsSubmitModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={submitMutation.isPending} className="bg-rose-800 text-white text-xs">
                  {submitMutation.isPending ? "Logging..." : "Log Dispute Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
