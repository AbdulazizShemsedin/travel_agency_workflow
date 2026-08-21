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
} from "lucide-react";
import {
  getAgencyComplaintsApi,
  submitAgencyComplaintApi,
  resolveAgencyComplaintApi,
  uploadFileApi,
} from "@/lib/api/applicantApi";
import { AgencyComplaint, ComplaintSeverity } from "@/types/applicant";
import { AgentLayout, MOCK_CONTRACTORS } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AgentComplaintsPage() {
  const queryClient = useQueryClient();
  const [activeContractor, setActiveContractor] = React.useState(MOCK_CONTRACTORS[0].name);
  const [activeTab, setActiveTab] = React.useState<"unresolved" | "new" | "resolved">("unresolved");

  // Submit Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    applicant_search: "",
    full_name: "",
    complaint_category: "Medical Refusal / Unfit on Arrival",
    severity: "High" as ComplaintSeverity,
    complaint_details: "",
    attachment: "",
  });
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Query Complaints
  const {
    data: complaints = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agency-complaints", activeTab, activeContractor],
    queryFn: () =>
      getAgencyComplaintsApi({
        tab: activeTab,
        contractor: activeContractor,
      }),
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      submitAgencyComplaintApi({
        contractor: activeContractor,
        applicant_search: data.applicant_search,
        complaint_category: data.complaint_category,
        severity: data.severity,
        complaint_details: data.complaint_details,
        attachment: data.attachment,
        full_name: data.full_name,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["agency-complaints"] });
      setIsSubmitModalOpen(false);
      setFormData({
        applicant_search: "",
        full_name: "",
        complaint_category: "Medical Refusal / Unfit on Arrival",
        severity: "High",
        complaint_details: "",
        attachment: "",
      });
      setToastMessage(res?.message?.message || "Complaint submitted successfully.");
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingAttachment(true);
      try {
        const res = await uploadFileApi(file, "Agency Complaint", "", "attachment");
        if (res?.message?.file_url) {
          setFormData((prev) => ({ ...prev, attachment: res.message.file_url }));
        }
      } catch {
        setFormData((prev) => ({ ...prev, attachment: `/files/${file.name}` }));
      } finally {
        setIsUploadingAttachment(false);
      }
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <Badge variant="destructive">Critical SLA</Badge>;
      case "High":
        return <Badge variant="warning">High Priority</Badge>;
      case "Medium":
        return <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300">Medium</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
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

        {/* Multi-Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#222228] pb-2">
          <button
            onClick={() => setActiveTab("unresolved")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "unresolved"
                ? "bg-emerald-800 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            }`}
          >
            🚨 Unresolved Backlog ({complaints.filter((c) => c.status !== "Resolved").length})
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "new"
                ? "bg-emerald-800 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181e]"
            }`}
          >
            ⚡ New Tickets
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

        {/* Complaints Listing Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
              <span className="ml-2 text-xs text-slate-500">Loading complaints desk...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600/40 dark:text-emerald-400/40 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Complaints Found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                There are currently no tickets in this tab for {activeContractor}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#202026]">
              {complaints.map((c) => (
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
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      c.status === "Resolved"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      {c.status}
                    </span>
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
                  if (!formData.applicant_search || !formData.complaint_details) return;
                  submitMutation.mutate(formData);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Applicant ID or Passport Number *</Label>
                  <Input
                    required
                    placeholder="e.g. APP-00012 or EP1234567"
                    value={formData.applicant_search}
                    onChange={(e) => setFormData({ ...formData, applicant_search: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Complaint Category *</Label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs text-slate-800 dark:text-zinc-200"
                      value={formData.complaint_category}
                      onChange={(e) => setFormData({ ...formData, complaint_category: e.target.value })}
                    >
                      <option value="Medical Refusal / Unfit on Arrival">Medical Refusal / Unfit on Arrival</option>
                      <option value="Refusal to Work / Runaway">Refusal to Work / Runaway</option>
                      <option value="Worker Incompetence / Skill Mismatch">Worker Incompetence / Skill Mismatch</option>
                      <option value="Legal / Law Enforcement Violation">Legal / Law Enforcement Violation</option>
                      <option value="Passport / Documentation Error">Passport / Documentation Error</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Severity Level *</Label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#18181e] px-2 text-xs text-slate-800 dark:text-zinc-200"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as ComplaintSeverity })}
                    >
                      <option value="Critical">Critical (Immediate 24h Action)</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
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
