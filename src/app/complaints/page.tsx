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
} from "lucide-react";
import {
  getAgencyComplaintsApi,
  submitAgencyComplaintApi,
  resolveAgencyComplaintApi,
  getApplicantsList,
  uploadFileApi,
} from "@/lib/api/applicantApi";
import { AgencyComplaint, ComplaintSeverity } from "@/types/applicant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"unresolved" | "new" | "resolved">("unresolved");
  const [contractorFilter, setContractorFilter] = React.useState("All Agencies");

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [submitForm, setSubmitForm] = React.useState({
    contractor: "Al-Amal Recruitment Riyadh",
    applicant_search: "",
    full_name: "",
    complaint_category: "Medical Refusal / Unfit on Arrival",
    severity: "High" as ComplaintSeverity,
    complaint_details: "",
    attachment: "",
  });

  // Resolve Modal
  const [selectedComplaintForResolve, setSelectedComplaintForResolve] = React.useState<AgencyComplaint | null>(null);
  const [resolveForm, setResolveForm] = React.useState({
    outcome: "Returned / Free Replacement Required",
    resolution_notes: "",
    replacement_applicant: "",
    return_date: new Date().toISOString().split("T")[0],
  });

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const { data: complaints = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-complaints", activeTab, contractorFilter],
    queryFn: () =>
      getAgencyComplaintsApi({
        tab: activeTab,
        contractor: contractorFilter !== "All Agencies" ? contractorFilter : undefined,
      }),
  });

  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  const availableReplacements = applicants.filter((a) => a.applicant_state === "Registered" || a.applicant_state === "CV Generated");

  const submitMutation = useMutation({
    mutationFn: (data: typeof submitForm) => submitAgencyComplaintApi(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      setIsSubmitModalOpen(false);
      setToastMessage(res?.message?.message || "Complaint logged successfully.");
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (data: typeof resolveForm & { complaint_id: string }) => resolveAgencyComplaintApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      setSelectedComplaintForResolve(null);
      setToastMessage("Complaint resolved and updated.");
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "High":
        return <Badge variant="warning">High</Badge>;
      case "Medium":
        return <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300">Medium</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
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
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Overseas partner disputes, 90-day bilateral replacement guarantees, arrival medical rejections, and legal claims.
          </p>
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Filter & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("unresolved")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === "unresolved" ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            }`}
          >
            Unresolved Backlog
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === "new" ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            }`}
          >
            New Tickets
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === "resolved" ? "bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            }`}
          >
            Resolved & Replaced
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <select
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#141418] px-2 text-xs text-slate-800 dark:text-zinc-200"
          >
            <option value="All Agencies">All Foreign Agencies</option>
            <option value="Al-Amal Recruitment Riyadh">Al-Amal Recruitment Riyadh</option>
            <option value="Al-Khaleej International Manpower Co.">Al-Khaleej International Co.</option>
            <option value="Kuwait Manpower Bureau">Kuwait Manpower Bureau</option>
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No complaints found in this category.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Ticket #</th>
                <th className="px-4 py-3.5">Partner Agency</th>
                <th className="px-4 py-3.5">Applicant / Passport</th>
                <th className="px-4 py-3.5">Category & Details</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
              {complaints.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">{c.contractor}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.full_name || c.applicant}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{c.applicant} {c.passport_number ? `• ${c.passport_number}` : ""}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200">{c.complaint_category}</div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{c.complaint_details}</p>
                  </td>
                  <td className="px-4 py-3">{getSeverityBadge(c.severity)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === "Resolved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status !== "Resolved" ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedComplaintForResolve(c)}
                        className="h-7 text-[11px] bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg"
                      >
                        Resolve Ticket
                      </Button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-medium">✓ Closed</span>
                    )}
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
                  <option value="Returned / Free Replacement Required">Returned / Free Replacement Required</option>
                  <option value="Resolved via Mediation">Resolved via Mediation</option>
                  <option value="Contract Terminated with Sponsor">Contract Terminated with Sponsor</option>
                  <option value="Worker Transferred">Worker Transferred</option>
                  <option value="Dismissed / Invalid Claim">Dismissed / Invalid Claim</option>
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
    </div>
  );
}
