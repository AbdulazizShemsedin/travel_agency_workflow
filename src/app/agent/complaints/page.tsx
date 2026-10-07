"use client";

import * as React from "react";
import Link from "next/link";
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
  ArrowLeft,
} from "lucide-react";
import {
  listUnresolvedComplaintsV2,
  createComplaintV2,
  uploadFileV2,
  listMyPlacementsV2,
  listApplicantsV2,
  listPortalCandidatesV2,
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
import { PremiumDropzone } from "@/components/ui/PremiumDropzone";
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

  const isAgencyUser = Boolean(agencyContext?.contractor || authUser?.contractor);
  // Fetch all placements for searchable dropdown
  const { data: allAvailableCandidates = [] } = useQuery({
    queryKey: ["all-agency-placements", effectiveContractor],
    queryFn: () => listMyPlacementsV2(effectiveContractor || undefined),
    enabled: Boolean(isAgencyUser || effectiveContractor),
    retry: false,
  });

  const { data: applicants = [] } = useQuery({
    queryKey: ["all-agency-applicants-for-complaints"],
    queryFn: () => listApplicantsV2(),
    enabled: Boolean(authUser?.is_internal_staff),
  });

  const { data: portalCandidates = [] } = useQuery({
    queryKey: ["portal-candidates-complaints"],
    queryFn: () => listPortalCandidatesV2(),
    retry: false,
  });

  // Reset candidate selection if active contractor changes
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      applicant_search: "",
      full_name: "",
    }));
  }, [effectiveContractor]);

  // Only candidates that appear on the Foreign Agency applicant marketplace section (/agent)
  const marketplaceCandidates = React.useMemo(() => {
    return (portalCandidates as any[])
      .filter((c) => Boolean(c && c.name))
      .filter((c) => c.medical_status !== "UNFIT")
      .map((c) => {
        const displayName =
          c.full_name ||
          [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ") ||
          c.applicant_name ||
          c.name;
        const passport = c.passport_number || "";
        const destination = c.destination_country || "";
        const job = c.target_job || c.job_applied || "";

        // Link placement record if this marketplace applicant has one under this contractor
        const matchedPlacement = (allAvailableCandidates as any[]).find(
          (p) =>
            (p.applicant === c.name || p.name === c.name) &&
            (!effectiveContractor || p.contractor === effectiveContractor)
        );

        return {
          id: c.name,
          name: c.name,
          applicant: c.name,
          placement_name: matchedPlacement?.name || c.name,
          full_name: displayName,
          passport_number: passport,
          destination_country: destination,
          target_job: job,
          status: matchedPlacement?.status || "Marketplace Applicant",
        };
      });
  }, [portalCandidates, allAvailableCandidates, effectiveContractor]);

  // Strictly filter candidates placed with THIS Foreign Agency
  const agencyPlacements = React.useMemo(() => {
    if (!effectiveContractor) return [];
    return (allAvailableCandidates as any[])
      .filter((c) => c.contractor === effectiveContractor)
      .map((c) => {
        const a = (applicants as any[]).find((app) => app.name === c.applicant);
        const pc = (portalCandidates as any[]).find((p) => p.name === c.applicant);
        const displayName = a?.full_name || a?.first_name || pc?.full_name || c.full_name || c.applicant_name || c.applicant;
        const passport = a?.passport_number || pc?.passport_number || c.passport_number || "";
        const status = c.status || a?.applicant_state || "Placed";
        const destination = c.destination_country || a?.destination_country || pc?.destination_country || "";
        return {
          ...c,
          full_name: displayName,
          passport_number: passport,
          status,
          destination_country: destination,
        };
      });
  }, [allAvailableCandidates, applicants, portalCandidates, effectiveContractor]);

  const getAgentComplaintDetails = React.useCallback(
    (c: any) => {
      const placement = (allAvailableCandidates as any[]).find(
        (p) => p.name === c.placement || p.applicant === c.applicant
      );
      const applicant = (applicants as any[]).find(
        (a) => a.name === c.applicant || (placement && a.name === placement.applicant)
      );
      const candidateId = c.applicant || placement?.applicant;
      const portalCandidate = (portalCandidates as any[]).find(
        (pc) => pc.name === candidateId
      );

      const candidateName =
        c.full_name ||
        c.applicant_name ||
        applicant?.full_name ||
        placement?.full_name ||
        placement?.applicant_name ||
        portalCandidate?.full_name ||
        applicant?.first_name ||
        c.applicant ||
        "Candidate";

      const passportNumber =
        c.passport_number ||
        placement?.passport_number ||
        applicant?.passport_number ||
        portalCandidate?.passport_number ||
        "";

      const contactName =
        applicant?.emergency_contact_name ||
        applicant?.relative_name ||
        applicant?.contact_person_name ||
        applicant?.contact_person_2nd ||
        portalCandidate?.emergency_contact_name ||
        c.contact_person ||
        c.contact_person_name ||
        "";

      const contactPhone =
        applicant?.emergency_contact_phone ||
        applicant?.relative_phone ||
        applicant?.contact_person_phone ||
        applicant?.contact_phone_2nd ||
        applicant?.phone ||
        portalCandidate?.phone ||
        c.contact_person_phone ||
        "";

      const contactRelation =
        applicant?.relative_kinship ||
        applicant?.emergency_contact_relation ||
        "";

      const sponsorName =
        placement?.employer_name ||
        placement?.sponsor_name ||
        applicant?.sponsor_name ||
        applicant?.current_employer ||
        portalCandidate?.current_employer ||
        c.sponsor_name ||
        c.employer_name ||
        "";

      const sponsorId =
        placement?.employer_national_id ||
        placement?.sponsor_civil_id ||
        applicant?.sponsor_id ||
        c.sponsor_id ||
        "";

      const sponsorAddress =
        placement?.employer_address ||
        applicant?.sponsor_address ||
        c.sponsor_address ||
        "";

      const visaNumber =
        placement?.visa_number ||
        applicant?.visa_number ||
        c.visa_number ||
        "";

      return {
        candidateName,
        applicantId: applicant?.name || placement?.applicant || c.applicant || "",
        placementId: placement?.name || c.placement || "",
        passportNumber,
        contactName,
        contactPhone,
        contactRelation,
        sponsorName,
        sponsorId,
        sponsorAddress,
        visaNumber,
      };
    },
    [allAvailableCandidates, applicants, portalCandidates]
  );

  // Dynamic filter by candidate name, passport, destination, job, or ID
  const filteredCandidateOptions = React.useMemo(() => {
    if (!candidateSearchQuery.trim()) return marketplaceCandidates;
    const q = candidateSearchQuery.toLowerCase().trim();
    return marketplaceCandidates.filter((c) => {
      const fullName = (c.full_name || "").toLowerCase();
      const parts = fullName.split(" ").filter(Boolean);
      const firstName = parts[0] || "";
      const lastName = parts[parts.length - 1] || "";
      const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
      const pass = (c.passport_number || "").toLowerCase();
      const dest = (c.destination_country || "").toLowerCase();
      const job = (c.target_job || "").toLowerCase();

      return (
        c.name.toLowerCase().includes(q) ||
        (c.placement_name && c.placement_name.toLowerCase().includes(q)) ||
        fullName.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        middleName.includes(q) ||
        pass.includes(q) ||
        dest.includes(q) ||
        job.includes(q)
      );
    });
  }, [marketplaceCandidates, candidateSearchQuery]);

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
      const targetIdentifier = data.applicant_search;
      const matched = marketplaceCandidates.find(
        (c) => c.name === targetIdentifier || c.placement_name === targetIdentifier || c.applicant === targetIdentifier
      );
      const target = matched?.placement_name || targetIdentifier;
      return await createComplaintV2(
        target,
        `[${data.complaint_category} - ${data.severity}] ${data.complaint_details}`,
        "Working Abroad",
        {
          applicant: matched?.applicant || matched?.name,
          applicant_name: matched?.full_name || data.full_name,
        }
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
        `Applicant "${formData.applicant_search}" could not be validated. Complaints can only be filed for active candidates.`
      );
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
                90-Day Guarantee
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              File and track dispute tickets.
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
            <div className="overflow-x-auto xl:overflow-x-clip max-h-[calc(100vh-270px)] min-h-[300px] overflow-y-auto relative">
              <table className="w-full text-left text-xs min-w-[960px] xl:min-w-0 border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-[#16161b]/95 backdrop-blur-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Ticket #</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Candidate</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Passport</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Contact Person</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Sponsor Details</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Status</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] min-w-[180px]">Category & Details</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">Severity</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] whitespace-nowrap">SLA / Age</th>
                    <th className="px-2.5 py-2 lg:px-3 lg:py-2.5 border-b border-slate-200 dark:border-[#222227] text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#202026]">
                  {filteredAndSortedComplaints.map((c) => {
                    const details = getAgentComplaintDetails(c);
                    return (
                      <tr key={c.name} className="hover:bg-slate-50/70 dark:hover:bg-[#16161c]/70 transition">
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          {c.display_no ? `#${c.display_no}` : c.name}
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 min-w-[140px] border-b border-slate-100 dark:border-[#202026]">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {details.candidateName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {details.placementId || details.applicantId || ""}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          {details.passportNumber ? (
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-[#1f1f26] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-[#2b2b36]">
                              {details.passportNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 min-w-[140px] border-b border-slate-100 dark:border-[#202026]">
                          {details.contactName || details.contactPhone ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                <span>{details.contactName || "Contact"}</span>
                                {details.contactRelation && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({details.contactRelation})
                                  </span>
                                )}
                              </div>
                              {details.contactPhone && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                                  {details.contactPhone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 min-w-[150px] border-b border-slate-100 dark:border-[#202026]">
                          {details.sponsorName || details.sponsorId || details.visaNumber ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-white text-xs">
                                {details.sponsorName || "Sponsor"}
                              </div>
                              {(details.sponsorId || details.visaNumber) && (
                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                                  {details.sponsorId && <span>ID: {details.sponsorId}</span>}
                                  {details.sponsorId && details.visaNumber && <span className="mx-1">•</span>}
                                  {details.visaNumber && <span>Visa: {details.visaNumber}</span>}
                                </div>
                              )}
                              {details.sponsorAddress && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={details.sponsorAddress}>
                                  {details.sponsorAddress}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
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
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 max-w-xs border-b border-slate-100 dark:border-[#202026]">
                          <div className="font-semibold text-slate-800 dark:text-zinc-200">
                            {c.complaint_category || c.worker_status_at_complaint || "Complaint"}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                            {c.complaint_details || c.description}
                          </p>
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
                          {getSeverityBadge(c.severity)}
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
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
                        </td>
                        <td className="px-2.5 py-2 lg:px-3 lg:py-2 text-right whitespace-nowrap border-b border-slate-100 dark:border-[#202026]">
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
                            {c.status === "Resolved" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Resolved
                              </span>
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
                                {marketplaceCandidates.length === 0
                                  ? "No applicants currently available in your applicant marketplace."
                                  : `No marketplace applicants match "${candidateSearchQuery}"`}
                              </div>
                            ) : (
                              filteredCandidateOptions.map((cand) => (
                                <button
                                  key={cand.name}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      applicant_search: cand.placement_name || cand.name,
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
                                        {cand.name} {cand.passport_number ? `• ${cand.passport_number}` : ""} {cand.destination_country ? `• ${cand.destination_country}` : ""} {cand.target_job ? `(${cand.target_job})` : ""}
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
                  <Label className="text-xs font-semibold">Attach Evidence / Medical Report (Optional)</Label>
                  <PremiumDropzone
                    id="complaint-evidence-dropzone"
                    variant="compact"
                    value={formData.attachment}
                    isLoading={isUploadingAttachment}
                    loadingText="Uploading dispute evidence..."
                    label="Attach Incident Evidence / Medical Report"
                    description="PDF or photo"
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
