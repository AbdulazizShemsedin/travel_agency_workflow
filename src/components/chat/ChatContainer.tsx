"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Paperclip,
  Plus,
  Users,
  Building2,
  Globe2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  UserPlus,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  AtSign,
  Briefcase,
  X,
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listThreadsV2,
  listAllThreadsForOversightV2,
  getThreadMessagesV2,
  sendMessageV2,
  createInternalThreadV2,
  createAgencyThreadV2,
  addParticipantV2,
  markReadV2,
  V2ChatThread,
  V2ChatMessage,
} from "@/lib/api/v2/communication";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { listEmployeesV2 } from "@/lib/api/v2/employees";
import { listContractorsV2 } from "@/lib/api/v2/contractors";
import { listApplicantsV2 } from "@/lib/api/v2/applicants";
import { listPlacementsV2 } from "@/lib/api/v2/placements";
import { listPortalCandidatesV2 } from "@/lib/api/v2/portal";
import { cn } from "@/lib/utils";

function WhatsAppDoubleCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "h-3.5 w-3.5 text-[#53bdeb] shrink-0"}
    >
      <path d="M1 6.2L4.2 9.5L11.5 2" />
      <path d="M5.5 6.2L8.7 9.5L16 2" />
    </svg>
  );
}

export function ChatContainer() {
  const queryClient = useQueryClient();
  const { user, authUser, roles } = useAuth();
  const currentEmail = (authUser?.email || "").toLowerCase().trim();

  // Role detection
  // Role detection: strict Foreign Agency check
  const isForeignAgency = React.useMemo(() => {
    const userRoles = (roles || []).map((r) => String(r).toLowerCase().trim());
    const authUserRoles = (authUser?.roles || []).map((r: any) =>
      typeof r === "string" ? r.toLowerCase().trim() : String(r?.role || "").toLowerCase().trim()
    );
    const allRoles = new Set([...userRoles, ...authUserRoles]);
    const hasAdmin =
      allRoles.has("administrator") ||
      allRoles.has("system manager") ||
      allRoles.has("admin") ||
      currentEmail === "administrator";
    if (hasAdmin) return false;

    return (
      allRoles.has("foreign agency") ||
      allRoles.has("foreign agent") ||
      allRoles.has("agent") ||
      Boolean((authUser as any)?.contractor) ||
      (authUser as any)?.is_internal_staff === false
    );
  }, [roles, authUser, currentEmail]);

  // Executive Admin check: strictly Administrator, System Manager, or Admin only
  const isAdmin = React.useMemo(() => {
    const adminRoles = ["administrator", "system manager", "admin"];
    const userRoles = (roles || []).map((r) => String(r).toLowerCase().trim());
    const authUserRoles = (authUser?.roles || []).map((r: any) =>
      typeof r === "string" ? r.toLowerCase().trim() : String(r?.role || "").toLowerCase().trim()
    );
    const allUserRoles = new Set([...userRoles, ...authUserRoles]);
    if (currentEmail === "administrator") return true;
    return adminRoles.some((role) => allUserRoles.has(role));
  }, [roles, authUser, currentEmail]);

  // Communication Manager check
  const isCommunicationManager = React.useMemo(() => {
    const userRoles = (roles || []).map((r) => String(r).toLowerCase().trim());
    const authUserRoles = (authUser?.roles || []).map((r: any) =>
      typeof r === "string" ? r.toLowerCase().trim() : String(r?.role || "").toLowerCase().trim()
    );
    const allUserRoles = new Set([...userRoles, ...authUserRoles]);
    return allUserRoles.has("communication manager");
  }, [roles, authUser]);

  // Permission to communicate with Foreign Agencies: Admin OR Communication Manager
  const canCommunicateWithForeignAgents = React.useMemo(() => {
    return isAdmin || isCommunicationManager;
  }, [isAdmin, isCommunicationManager]);

  // Audit and Oversight is strictly for users with Admin role only
  const isSupervisorOrAdmin = isAdmin;

  // View Mode: "my" (only communicating parties) vs "oversight" (Admin supervision)
  const [viewMode, setViewMode] = React.useState<"my" | "oversight">("my");
  const [oversightStaffFilter, setOversightStaffFilter] = React.useState<string>("all");

  // Selected Thread State
  const [selectedThread, setSelectedThread] = React.useState<V2ChatThread | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [threadTypeFilter, setThreadTypeFilter] = React.useState<"All" | "Agency" | "Internal">("All");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = React.useState<boolean>(false);

  // Message Composition State
  const [messageText, setMessageText] = React.useState<string>("");
  const [mentionedApplicants, setMentionedApplicants] = React.useState<string[]>([]);
  const [showMentionInputs, setShowMentionInputs] = React.useState<boolean>(false);
  const [pendingAttachment, setPendingAttachment] = React.useState<{ file: File; url?: string } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState<boolean>(false);

  // Modals
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = React.useState<boolean>(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = React.useState<boolean>(false);

  // New Thread Form State: default to "Agency" for Foreign Agency or for staff communicating with agencies
  const [newThreadType, setNewThreadType] = React.useState<"Internal" | "Agency">("Agency");
  const [newThreadRecipient, setNewThreadRecipient] = React.useState<string>("");
  const [selectedContractorId, setSelectedContractorId] = React.useState<string>("");
  const [newThreadContextType, setNewThreadContextType] = React.useState<string>("General");
  const [newThreadContextRef, setNewThreadContextRef] = React.useState<string>("");

  // Sync initial thread type when roles resolve
  React.useEffect(() => {
    if (isForeignAgency) {
      setNewThreadType("Agency");
    } else if (canCommunicateWithForeignAgents) {
      // Default to Agency if staff can chat with Foreign Agencies, or Internal if preferred
      setNewThreadType("Agency");
    } else {
      setNewThreadType("Internal");
    }
  }, [isForeignAgency, canCommunicateWithForeignAgents]);

  // Add Participant Form State
  const [newParticipantEmail, setNewParticipantEmail] = React.useState<string>("");

  // Queries for internal staff and authorized contacts
  const { data: internalEmployees = [] } = useQuery({
    queryKey: ["v2_employees_chat_dropdown"],
    queryFn: listEmployeesV2,
    staleTime: 60000,
  });

  // Foreign agents can ONLY communicate with Administrator / Admin and Communication Manager
  const allowedStaffForAgency = React.useMemo(() => {
    const targetRoles = ["administrator", "admin", "system manager", "communication manager"];
    const filtered = internalEmployees.filter((emp: any) => {
      const empRoles = (emp.roles || []).map((r: string) => String(r).toLowerCase().trim());
      const isEligible =
        emp.email?.toLowerCase() === "administrator" ||
        emp.name?.toLowerCase() === "administrator" ||
        empRoles.some((r: string) => targetRoles.includes(r));
      return isEligible && emp.email?.toLowerCase() !== currentEmail;
    });

    if (filtered.length === 0) {
      return [
        {
          name: "Administrator",
          email: "Administrator",
          full_name: "Agency Headquarters Administrator",
          roles: ["Administrator"],
        },
      ];
    }
    return filtered;
  }, [internalEmployees, currentEmail]);

  const { data: availableContractors = [], isLoading: isContractorsLoading } = useQuery({
    queryKey: ["v2_contractors_chat_dropdown"],
    queryFn: () => listContractorsV2(),
    enabled: canCommunicateWithForeignAgents,
    staleTime: 60000,
  });

  // Queries for Mention Applicant Dropdown Filtering
  const { data: allApplicants = [] } = useQuery({
    queryKey: ["v2_applicants_chat_mentions"],
    queryFn: () => listApplicantsV2(undefined, 250),
    enabled: !isForeignAgency,
    staleTime: 60000,
  });

  const { data: allPlacements = [] } = useQuery({
    queryKey: ["v2_placements_chat_mentions"],
    queryFn: () => listPlacementsV2(),
    staleTime: 60000,
  });

  const { data: portalCandidates = [] } = useQuery({
    queryKey: ["v2_portal_candidates_chat_mentions"],
    queryFn: () => listPortalCandidatesV2(),
    enabled: isForeignAgency,
    staleTime: 60000,
  });

  // 1. Fetch User's Real Participating Threads (My Discussions)
  const {
    data: myThreads = [],
    isLoading: isMyThreadsLoading,
    refetch: refetchMyThreads,
  } = useQuery<V2ChatThread[]>({
    queryKey: ["chat_threads_my"],
    queryFn: listThreadsV2,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // 2. Fetch All Organization Threads for Oversight (strictly Admin only)
  const {
    data: allOversightThreads = [],
    isLoading: isOversightLoading,
    refetch: refetchOversightThreads,
  } = useQuery<V2ChatThread[]>({
    queryKey: ["chat_threads_oversight"],
    queryFn: listAllThreadsForOversightV2,
    enabled: isSupervisorOrAdmin,
    staleTime: 15000,
    refetchInterval: 20000,
  });

  // Active threads based on current viewMode
  const activeThreads = React.useMemo(() => {
    if (isSupervisorOrAdmin && viewMode === "oversight") {
      return allOversightThreads;
    }
    // Return all user's participating threads directly from backend without client-side dropping
    return myThreads;
  }, [isSupervisorOrAdmin, viewMode, allOversightThreads, myThreads]);

  // Oversight Statistics
  const oversightStats = React.useMemo(() => {
    const total = allOversightThreads.length;
    const internal = allOversightThreads.filter((t) => t.thread_type === "Internal").length;
    const agency = allOversightThreads.filter((t) => t.thread_type === "Agency").length;
    return { total, internal, agency };
  }, [allOversightThreads]);

  // Priority role resolution: Admin/Administrator > Communication Manager > Operations Manager > Supervisor > other
  const resolvePrimaryRole = React.useCallback((rolesList: string[] = []): string => {
    const cleanRoles = rolesList.map((r) => String(r).toLowerCase().trim());
    if (
      cleanRoles.some((r) => r === "administrator" || r === "system manager" || r === "admin")
    ) {
      return "Admin";
    }
    if (cleanRoles.some((r) => r.includes("communication manager") || r === "communication")) {
      return "Communication Manager";
    }
    if (cleanRoles.some((r) => r.includes("operations manager"))) {
      return "Operations Manager";
    }
    if (cleanRoles.some((r) => r.includes("supervisor"))) {
      return "Supervisor";
    }
    const filtered = rolesList.filter((r) => {
      const l = String(r).toLowerCase().trim();
      return l !== "desk user" && l !== "all";
    });
    return filtered[0] || "Internal Staff";
  }, []);

  // Resolves any user email/identifier to full name and primary role
  const resolveUserDisplay = React.useCallback(
    (emailOrUsername: string) => {
      if (!emailOrUsername) return { name: "Unknown", email: "", role: "User", isStaff: true };
      const clean = emailOrUsername.toLowerCase().trim();
      
      // 1. If Administrator
      if (clean === "administrator" || clean === "admin") {
        return {
          name: authUser?.full_name || user || "System Administrator",
          email: "Administrator",
          role: "Admin",
          isStaff: true,
        };
      }

      // 2. Check if this is the current logged-in user (e.g. tutu)
      const currentAuthEmail = (authUser?.email || "").toLowerCase().trim();
      const currentUserName = (user || "").toLowerCase().trim();
      const currentAuthFullName = (authUser?.full_name || "").toLowerCase().trim();
      if (
        clean === currentAuthEmail ||
        clean === currentUserName ||
        (currentAuthFullName && clean === currentAuthFullName) ||
        clean === currentEmail
      ) {
        const primaryRole = isAdmin
          ? "Admin"
          : isCommunicationManager
          ? "Communication Manager"
          : resolvePrimaryRole(roles as string[]);

        return {
          name: authUser?.full_name || user || "You",
          email: authUser?.email || user || clean,
          role: primaryRole,
          isStaff: true,
        };
      }

      // 3. Search in internalEmployees
      const emp = internalEmployees.find(
        (e) =>
          (e.email || "").toLowerCase().trim() === clean ||
          (e.name || "").toLowerCase().trim() === clean ||
          (e.full_name || "").toLowerCase().trim() === clean
      );
      if (emp) {
        const primaryRole = resolvePrimaryRole(emp.roles || []);
        return {
          name: emp.full_name || emp.name,
          email: emp.email || emp.name,
          role: primaryRole,
          isStaff: true,
        };
      }

      // 4. Search in availableContractors
      const con = availableContractors.find(
        (c) =>
          (c.user || "").toLowerCase().trim() === clean ||
          (c.name || "").toLowerCase().trim() === clean ||
          (c.company_name || "").toLowerCase().trim() === clean
      );
      if (con) {
        return {
          name: con.company_name || con.contractor_name || con.name,
          email: con.user || emailOrUsername,
          role: `Foreign Agency (${con.country || "GCC"})`,
          isStaff: false,
        };
      }

      // 5. Fallback: clean up username from email
      const fallbackName = emailOrUsername.includes("@")
        ? emailOrUsername.split("@")[0]
        : emailOrUsername;

      return {
        name: fallbackName,
        email: emailOrUsername,
        role: "Staff Member",
        isStaff: true,
      };
    },
    [user, authUser, currentEmail, isAdmin, isCommunicationManager, roles, internalEmployees, availableContractors, resolvePrimaryRole]
  );

  // Resolves communicating parties for any thread: who communicated with whom
  const getThreadParties = React.useCallback(
    (thread: V2ChatThread) => {
      const isAgency = thread.thread_type === "Agency";
      const participants: string[] = thread.participants || [];

      if (isAgency) {
        // Agency Channel: Staff <-> Foreign Agency Partner
        const con = availableContractors.find(
          (c) =>
            c.name === thread.contractor ||
            c.company_name === thread.contractor ||
            (thread.title && thread.title.toLowerCase().includes(c.name.toLowerCase())) ||
            (thread.owner && (c.user || "").toLowerCase() === thread.owner.toLowerCase())
        );
        const agencyName = con ? (con.company_name || con.contractor_name || con.name) : (thread.contractor || "Foreign Agency");
        const agencyCountry = con?.country ? ` (${con.country})` : "";
        const conUser = con?.user?.toLowerCase().trim();

        // Identify internal staff participant
        const staffParticipants = participants.filter((p) => {
          const cleanP = p.toLowerCase().trim();
          return cleanP !== conUser && cleanP !== (con?.name || "").toLowerCase().trim();
        });

        // Resolve staff participant: prefer participant, then thread owner, then current auth user if staff
        const staffEmail =
          staffParticipants[0] ||
          ((thread.owner || "").toLowerCase().trim() !== conUser ? thread.owner : "") ||
          (authUser?.is_internal_staff ? (authUser.email || user) : "") ||
          "";

        const staffInfo = staffEmail
          ? resolveUserDisplay(staffEmail)
          : { name: authUser?.full_name || user || "Staff Member", role: isAdmin ? "Admin" : "Communication Manager" };

        return {
          type: "Agency" as const,
          staffName: staffInfo.name,
          staffRole: staffInfo.role,
          agencyName,
          agencyCountry,
          badgeLabel: "Staff ↔ Foreign Agency",
          partyLine: `${staffInfo.name} ⟷ ${agencyName}${agencyCountry}`,
          shortParties: `${staffInfo.name} ⟷ ${agencyName}`,
          participantsList: participants,
        };
      } else {
        // Internal Thread: Staff A <-> Staff B (or multi-colleague)
        const displays = participants.map((p) => resolveUserDisplay(p));
        const p1 = displays[0] || resolveUserDisplay(thread.owner || "Staff A");
        const p2 = displays[1] || (displays.length > 1 ? displays[1] : { name: "Internal Colleague", role: "Staff" });
        const extras = displays.length > 2 ? ` (+${displays.length - 2} more)` : "";

        return {
          type: "Internal" as const,
          p1Name: p1.name,
          p1Role: p1.role,
          p2Name: p2.name,
          p2Role: p2.role,
          badgeLabel: "Staff ↔ Staff",
          partyLine: `${p1.name} ⟷ ${p2.name}${extras}`,
          shortParties: `${p1.name} ⟷ ${p2.name}${extras}`,
          participantsList: participants,
        };
      }
    },
    [availableContractors, resolveUserDisplay]
  );

  // Filter threads
  const filteredThreads = React.useMemo(() => {
    return activeThreads.filter((t) => {
      // Type filter
      if (threadTypeFilter !== "All" && t.thread_type !== threadTypeFilter) {
        return false;
      }

      // Oversight filter by specific staff member
      if (isSupervisorOrAdmin && viewMode === "oversight" && oversightStaffFilter !== "all") {
        const staffEmail = oversightStaffFilter.toLowerCase().trim();
        const isInParticipants = (t.participants || []).some(
          (p) => p.toLowerCase().trim() === staffEmail
        );
        const isOwner = (t.owner || "").toLowerCase().trim() === staffEmail;
        if (!isInParticipants && !isOwner) {
          return false;
        }
      }

      // Text search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const parties = getThreadParties(t);

      return (
        t.title?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.last_message?.toLowerCase().includes(q) ||
        parties.partyLine.toLowerCase().includes(q) ||
        parties.shortParties.toLowerCase().includes(q) ||
        (t.participants || []).some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [
    activeThreads,
    threadTypeFilter,
    isSupervisorOrAdmin,
    viewMode,
    oversightStaffFilter,
    searchQuery,
    getThreadParties,
  ]);

  // Keep selectedThread in sync if updated
  React.useEffect(() => {
    if (filteredThreads.length > 0 && !selectedThread) {
      setSelectedThread(filteredThreads[0]);
    } else if (selectedThread) {
      const refreshed = filteredThreads.find((t) => t.name === selectedThread.name);
      if (refreshed) {
        setSelectedThread(refreshed);
      }
    }
  }, [filteredThreads, selectedThread]);

  // Auto-initialize agency thread with Communication Manager if foreign agency has no threads yet
  React.useEffect(() => {
    if (isForeignAgency && !isMyThreadsLoading && myThreads.length === 0) {
      createAgencyThreadV2()
        .then((res: any) => {
          queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
          const threadName = res?.name || res?.thread_name;
          if (threadName) {
            setSelectedThread({
              name: threadName,
              thread_type: "Agency",
            });
            setIsMobileThreadOpen(true);
          }
        })
        .catch((err) => {
          console.warn("Auto-initialization of agency thread failed:", err);
        });
    }
  }, [isForeignAgency, isMyThreadsLoading, myThreads.length, queryClient]);

  // 3. Fetch Messages for Selected Thread
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = useQuery<V2ChatMessage[]>({
    queryKey: ["chat_messages", selectedThread?.name],
    queryFn: () => (selectedThread?.name ? getThreadMessagesV2(selectedThread.name) : Promise.resolve([])),
    enabled: !!selectedThread?.name,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // 4. Automatically Mark as Read when Thread is opened
  React.useEffect(() => {
    if (selectedThread?.name && selectedThread.unread_count && selectedThread.unread_count > 0) {
      markReadV2(selectedThread.name)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
        })
        .catch(() => {});
    }
  }, [selectedThread, queryClient]);

  // Auto-scroll messages to bottom
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset mention inputs on thread switch
  React.useEffect(() => {
    setMentionedApplicants([]);
    setShowMentionInputs(false);
  }, [selectedThread?.name]);

  // Determine if active chat is with a foreign agency
  const isCurrentChatWithForeignAgency = React.useMemo(() => {
    if (isForeignAgency) return true;
    if (selectedThread?.thread_type === "Agency") return true;
    return false;
  }, [isForeignAgency, selectedThread]);

  // Identify foreign contractor involved in this channel
  const currentForeignContractor = React.useMemo(() => {
    if (isForeignAgency) {
      return (
        availableContractors.find(
          (c) => (c.user || "").toLowerCase().trim() === currentEmail
        ) || null
      );
    }
    if (selectedThread?.thread_type === "Agency") {
      return (
        availableContractors.find(
          (c) =>
            c.name === selectedThread.contractor ||
            c.company_name === selectedThread.contractor ||
            (selectedThread.title && selectedThread.title.toLowerCase().includes(c.name.toLowerCase())) ||
            (selectedThread.owner && (c.user || "").toLowerCase() === selectedThread.owner.toLowerCase())
        ) || null
      );
    }
    return null;
  }, [isForeignAgency, selectedThread, currentEmail, availableContractors]);

  // Compute mentionable applicants based on communication context:
  // If communicating with foreign agent: STRICTLY ONLY applicants listed on their page and/or selected by them!
  // If internal staff: all agency applicants
  const mentionableApplicants = React.useMemo(() => {
    if (isCurrentChatWithForeignAgency) {
      const contractorName = currentForeignContractor?.name || selectedThread?.contractor || "";
      const contractorCountry = currentForeignContractor?.country || "";

      const candidateMap = new Map<string, { id: string; name: string; tag: string; detail: string }>();

      // 1. Applicants Selected by this Foreign Agency (their Placements)
      const contractorPlacements = allPlacements.filter((p) => {
        if (!contractorName) return false;
        return (
          (p.contractor || "").toLowerCase().trim() === contractorName.toLowerCase().trim() ||
          (currentForeignContractor?.company_name &&
            (p.contractor || "").toLowerCase().trim() === currentForeignContractor.company_name.toLowerCase().trim())
        );
      });

      for (const p of contractorPlacements) {
        if (p.applicant) {
          const appInfo = allApplicants.find((a) => a.name === p.applicant);
          const fullName = appInfo?.full_name || p.full_name || p.applicant_name || p.applicant;
          candidateMap.set(p.applicant, {
            id: p.applicant,
            name: fullName,
            tag: "Selected Candidate",
            detail: `Placement: ${p.name} • ${p.status || "Selected"}`,
          });
        }
      }

      // 2. Applicants Listed on their Portal Discovery Page
      if (isForeignAgency) {
        for (const c of portalCandidates) {
          if (!candidateMap.has(c.name)) {
            candidateMap.set(c.name, {
              id: c.name,
              name: c.full_name || c.applicant_name || c.name,
              tag: "Available on Portal",
              detail: `${c.target_job || c.job_applied || "Candidate"} • ${c.destination_country || contractorCountry || "GCC"}`,
            });
          }
        }
      } else {
        // Internal staff communicating with this foreign agency:
        // Include candidates listed on that agency's interface (matching contractor country, CV Generated, not taken by another agency)
        for (const a of allApplicants) {
          const matchesCountry =
            !contractorCountry ||
            (a.destination_country || "").toLowerCase().trim() === contractorCountry.toLowerCase().trim();
          const isCVGenerated = a.status === "CV Generated";
          const hasNoOtherPlacement =
            !a.active_placement || contractorPlacements.some((p) => p.applicant === a.name);

          if (matchesCountry && isCVGenerated && hasNoOtherPlacement) {
            if (!candidateMap.has(a.name)) {
              candidateMap.set(a.name, {
                id: a.name,
                name: a.full_name || a.name,
                tag: "Available on Portal",
                detail: `${a.target_job || a.job_applied || "Candidate"} • ${a.destination_country || "Approved"}`,
              });
            }
          }
        }
      }

      return Array.from(candidateMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // Internal Staff-to-Staff Communication Context:
      // Can mention any active applicant in the agency workflow
      return allApplicants
        .map((a) => ({
          id: a.name,
          name: a.full_name || a.name,
          tag: a.status || "Registered",
          detail: `${a.destination_country || "General"} • ${a.target_job || a.job_applied || "Candidate"}`,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }
  }, [
    isCurrentChatWithForeignAgency,
    currentForeignContractor,
    selectedThread,
    allPlacements,
    allApplicants,
    portalCandidates,
    isForeignAgency,
  ]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread) throw new Error("No conversation selected");

      let attachmentUrl = pendingAttachment?.url;

      // If attachment file not uploaded yet, upload first
      if (pendingAttachment?.file && !attachmentUrl) {
        setIsUploadingAttachment(true);
        try {
          const uploadRes = await uploadFileV2(
            pendingAttachment.file,
            false,
            "Chat Thread",
            selectedThread.name
          );
          attachmentUrl = uploadRes.file_url;
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      // Support multi-applicant mentions
      const primaryApplicant = mentionedApplicants[0];
      let composedText = messageText.trim();
      if (mentionedApplicants.length > 1) {
        const otherMentions = mentionedApplicants.slice(1).join(", ");
        composedText = `[Mentioned Candidates: ${mentionedApplicants.join(", ")}]\n${composedText}`.trim();
      }

      return await sendMessageV2(
        selectedThread.name,
        composedText || undefined,
        primaryApplicant || undefined,
        undefined,
        attachmentUrl
      );
    },
    onSuccess: () => {
      setMessageText("");
      setPendingAttachment(null);
      setMentionedApplicants([]);
      setShowMentionInputs(false);

      queryClient.invalidateQueries({ queryKey: ["chat_messages", selectedThread?.name] });
      queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
      queryClient.invalidateQueries({ queryKey: ["chat_threads_oversight"] });
    },
    onError: (err: any) => {
      toast.error("Failed to send message", {
        description: err?.message || "Backend rejected message transmission.",
      });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (isForeignAgency) {
        // Foreign Agency initiates communication with internal staff (Admin / Communication Manager)
        // Strictly uses createAgencyThreadV2 to prevent "A Foreign Agency user can only be a participant in an Agency-type thread"
        return await createAgencyThreadV2();
      } else {
        if (canCommunicateWithForeignAgents && newThreadType === "Agency") {
          // Internal staff (Admin or Communication Manager) initiating thread with Foreign Agency partner
          if (!selectedContractorId) {
            throw new Error("Please select a Foreign Agency partner.");
          }
          return await createAgencyThreadV2(selectedContractorId);
        } else {
          // Internal staff colleague discussion
          if (!newThreadRecipient.trim() || (!newThreadRecipient.includes("@") && newThreadRecipient.trim() !== "Administrator")) {
            throw new Error("Please select an internal colleague from the dropdown.");
          }
          return await createInternalThreadV2(
            newThreadRecipient.trim(),
            newThreadContextType,
            newThreadContextRef.trim() || undefined
          );
        }
      }
    },
    onSuccess: (res: any) => {
      toast.success(
        isForeignAgency
          ? "Staff conversation ready"
          : newThreadType === "Agency"
          ? "Foreign Agency partner channel opened"
          : "Conversation thread initialized successfully"
      );
      setIsNewThreadModalOpen(false);
      setNewThreadRecipient("");
      setSelectedContractorId("");
      setNewThreadContextRef("");
      setNewThreadContextType("General");

      queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
      if (isSupervisorOrAdmin) {
        queryClient.invalidateQueries({ queryKey: ["chat_threads_oversight"] });
      }
      const threadName = res?.name || res?.thread_name;
      if (threadName) {
        setSelectedThread({
          name: threadName,
          thread_type: isForeignAgency || newThreadType === "Agency" ? "Agency" : "Internal",
        });
        setIsMobileThreadOpen(true);
      }
    },
    onError: (err: any) => {
      toast.error("Thread creation failed", {
        description: err?.message || "Please verify recipient and authorization.",
      });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread) throw new Error("No conversation selected");
      if (!newParticipantEmail.trim() || !newParticipantEmail.includes("@")) {
        throw new Error("Participant email must be a valid User email address.");
      }
      return await addParticipantV2(selectedThread.name, newParticipantEmail.trim());
    },
    onSuccess: () => {
      toast.success("Participant added to conversation thread");
      setIsAddParticipantModalOpen(false);
      setNewParticipantEmail("");
      queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
      queryClient.invalidateQueries({ queryKey: ["chat_threads_oversight"] });
      queryClient.invalidateQueries({ queryKey: ["chat_messages", selectedThread?.name] });
    },
    onError: (err: any) => {
      toast.error("Failed to add participant", {
        description: err?.message || "Backend rejected participant addition.",
      });
    },
  });

  // File selection handler
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAttachment({ file });
    }
  };

  const isAgencyThread = selectedThread?.thread_type === "Agency";
  const selectedParties = selectedThread ? getThreadParties(selectedThread) : null;

  return (
    <div className="h-[calc(100dvh-56px)] lg:h-[calc(100vh-120px)] w-full min-w-0 max-w-full -m-3 sm:m-0 flex flex-col rounded-none lg:rounded-2xl border-0 lg:border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#101014] overflow-hidden shadow-none lg:shadow-sm">
      {/* ------------------------------------------------------------- */}
      {/* Mobile & Tablet Header (Thread List)                          */}
      {/* ------------------------------------------------------------- */}
      <div
        className={cn(
          "lg:hidden bg-[#008069] dark:bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-xs select-none",
          isMobileThreadOpen ? "hidden" : "flex"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-white">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              {isForeignAgency ? "Agency Chat" : "Discussions"}
            </h1>
            <p className="text-[10px] text-emerald-100 dark:text-[#8696a0]">
              {isForeignAgency
                ? "Direct HQ Coordination"
                : `${activeThreads.length} active conversation${activeThreads.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSupervisorOrAdmin && (
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === "my" ? "oversight" : "my"))}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-colors flex items-center gap-1",
                viewMode === "oversight" ? "bg-white/25 text-white" : "text-white/80 hover:text-white"
              )}
              title={viewMode === "my" ? "Switch to Oversight" : "Switch to My Discussions"}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {viewMode === "oversight" && (
                <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Audit</span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsNewThreadModalOpen(true)}
            disabled={createThreadMutation.isPending}
            className="p-1.5 sm:p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            title={isForeignAgency ? "Contact Headquarters Staff" : "New Conversation"}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Desktop Top Banner & Quick Header                             */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex px-5 py-3 border-b border-slate-200 dark:border-[#202027] bg-slate-50/50 dark:bg-[#141419] items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-900 dark:bg-emerald-600 text-white flex items-center justify-center">
            {isSupervisorOrAdmin && viewMode === "oversight" ? (
              <Shield className="h-4 w-4 text-emerald-200" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                {isForeignAgency
                  ? "Staff Coordination & Messages"
                  : isSupervisorOrAdmin && viewMode === "oversight"
                  ? "Executive Communication Oversight & Supervision"
                  : "V2 Communication & Agency Chat"}
              </h1>
              {isSupervisorOrAdmin && viewMode === "oversight" && (
                <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] px-2 py-0">
                  <ShieldAlert className="h-2.5 w-2.5 mr-1" />
                  Supervision Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {isForeignAgency
                ? "Direct bilateral channel with Agency Communication Manager."
                : isSupervisorOrAdmin && viewMode === "oversight"
                ? "Comprehensive supervision feed: internal staff discussions and foreign agency partner channels."
                : "Live private discussions with internal colleagues and registered foreign agency partners."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsNewThreadModalOpen(true)}
            disabled={createThreadMutation.isPending}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs h-8 shadow-xs font-semibold"
          >
            {createThreadMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : isForeignAgency ? (
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isForeignAgency ? "Contact Headquarters Staff" : "New Conversation"}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Chat Workspace Layout (2-Column Grid)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================= */}
        {/* Left Column: Thread List & Oversight Nav                      */}
        {/* ============================================================= */}
        <div
          className={cn(
            "w-full lg:w-80 xl:w-96 shrink-0 border-r border-slate-200 dark:border-[#202027] flex flex-col bg-slate-50/30 dark:bg-[#121217]",
            isMobileThreadOpen ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Executive View Switcher: Admin & Communication Manager Only */}
          {isSupervisorOrAdmin && (
            <div className="p-2 bg-slate-100/80 dark:bg-[#161622] border-b border-slate-200 dark:border-[#20202e] flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode("my")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  viewMode === "my"
                    ? "bg-white dark:bg-[#20202e] text-emerald-800 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-[#2d2d3e]"
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                My Discussions
              </button>
              <button
                type="button"
                onClick={() => setViewMode("oversight")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  viewMode === "oversight"
                    ? "bg-emerald-900 text-white dark:bg-emerald-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-300" />
                Audit & Oversight
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950/60 text-emerald-200">
                  {oversightStats.total}
                </span>
              </button>
            </div>
          )}

          {/* Thread Search & Supervision Filters */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-[#202027] space-y-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isSupervisorOrAdmin && viewMode === "oversight"
                    ? "Search staff, foreign agencies, messages..."
                    : "Search conversations..."
                }
                className="pl-8 h-8 text-xs bg-white dark:bg-[#17171f]"
              />
            </div>

            {/* Special Oversight Filter by Staff Member */}
            {isSupervisorOrAdmin && viewMode === "oversight" && (
              <div className="pt-0.5 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Filter className="h-2.5 w-2.5 text-emerald-600" />
                  Filter by Staff Member:
                </label>
                <select
                  value={oversightStaffFilter}
                  onChange={(e) => setOversightStaffFilter(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a38] bg-white dark:bg-[#161622] text-slate-800 dark:text-zinc-200 font-medium truncate"
                >
                  <option value="all">-- All Staff ({internalEmployees.length}) --</option>
                  {internalEmployees.map((emp: any) => {
                    const roleStr = (emp.roles || []).filter((r: string) => r !== "Desk User").join(", ");
                    return (
                      <option key={emp.email || emp.name} value={emp.email || emp.name}>
                        {emp.full_name || emp.name} {roleStr ? `— [${roleStr}]` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Filter Pills */}
            {!isForeignAgency && (
              <div className="flex items-center gap-1 pt-0.5">
                {[
                  {
                    id: "All",
                    labelShort: "All",
                    labelFull: "All",
                    count: isSupervisorOrAdmin && viewMode === "oversight" ? oversightStats.total : undefined,
                  },
                  {
                    id: "Internal",
                    labelShort: "Staff",
                    labelFull: "Staff ↔ Staff",
                    count: isSupervisorOrAdmin && viewMode === "oversight" ? oversightStats.internal : undefined,
                  },
                  {
                    id: "Agency",
                    labelShort: "Agency",
                    labelFull: "Staff ↔ Agency",
                    count: isSupervisorOrAdmin && viewMode === "oversight" ? oversightStats.agency : undefined,
                  },
                ].map((type) => {
                  const active = threadTypeFilter === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setThreadTypeFilter(type.id as "All" | "Agency" | "Internal")}
                      className={cn(
                        "flex-1 px-1.5 sm:px-2 py-1 text-[10px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 truncate",
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#20202a]"
                      )}
                    >
                      <span className="hidden sm:inline">{type.labelFull}</span>
                      <span className="sm:hidden">{type.labelShort}</span>
                      {type.count !== undefined && (
                        <span className="opacity-75 font-mono text-[9px]">({type.count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thread Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1c1c24]">
            {(isMyThreadsLoading && viewMode === "my") || (isOversightLoading && viewMode === "oversight") ? (
              <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                Loading conversations...
              </div>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.name === thread.name;
                const parties = getThreadParties(thread);
                const isAgency = thread.thread_type === "Agency";

                return (
                  <button
                    key={thread.name}
                    type="button"
                    onClick={() => {
                      setSelectedThread(thread);
                      setIsMobileThreadOpen(true);
                    }}
                    className={cn(
                      "w-full p-3 text-left transition-all flex items-start gap-3",
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 md:border-l-4 md:border-l-emerald-800 md:dark:border-l-emerald-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-[#181820]"
                    )}
                  >
                    {/* WhatsApp-style Contact Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs",
                          isAgency
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                        )}
                      >
                        {isAgency ? (
                          <Globe2 className="h-5 w-5" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>
                      {thread.unread_count ? (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#25d366] border-2 border-white dark:border-[#121217]" />
                      ) : null}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] md:text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {isAgency && isForeignAgency
                            ? "Agency Communication Desk"
                            : parties.partyLine}
                        </span>
                        <span className="text-[11px] md:text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 font-medium">
                          {thread.last_message_time || "Recent"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] md:text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 flex-1">
                          {thread.last_message || "No messages yet"}
                        </p>
                        {thread.unread_count ? (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#25d366] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {thread.unread_count}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] pt-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 font-medium",
                            isAgency
                              ? "border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30"
                              : "border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
                          )}
                        >
                          {parties.badgeLabel}
                        </Badge>
                        {thread.context_type && thread.context_type !== "General" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-200/80 dark:bg-[#1e1e28] text-slate-700 dark:text-zinc-300">
                            {thread.context_type}: {thread.context_reference || "Linked"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="h-7 w-7 text-slate-300 dark:text-zinc-600 mx-auto" />
                <p className="font-semibold text-slate-600 dark:text-zinc-400">No conversations found</p>
                <p className="text-[11px]">
                  {isSupervisorOrAdmin && viewMode === "oversight"
                    ? "No discussion threads match the current supervision filters."
                    : "No private discussions yet. Start a new conversation to communicate."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isForeignAgency) {
                      createThreadMutation.mutate();
                    } else {
                      setIsNewThreadModalOpen(true);
                    }
                  }}
                  className="text-xs h-7 mt-1"
                >
                  {isForeignAgency ? "Connect with Staff" : "Start Discussion"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* Right Column: Selected Thread Messages & Composer            */}
        {/* ============================================================= */}
        <div
          className={cn(
            "flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0e0e12]",
            !isMobileThreadOpen ? "hidden lg:flex" : "flex"
          )}
        >
          {selectedThread ? (
            <>
              {/* Supervisory Mode Audit Banner: Highlight when viewing outside participant scope */}
              {isSupervisorOrAdmin && viewMode === "oversight" && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 text-xs text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold truncate text-[11px] sm:text-xs">
                      Supervisory Stream: {selectedParties?.partyLine}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 shrink-0">
                    Audit & Compliance
                  </span>
                </div>
              )}

              {/* Thread Header: Styled as WhatsApp header on mobile, standard card header on desktop */}
              <div className="p-2.5 sm:p-3.5 border-b border-slate-200 dark:border-[#202027] flex items-center justify-between gap-2 bg-[#008069] dark:bg-[#1f2c34] lg:bg-white lg:dark:bg-[#111116] text-white lg:text-slate-900 lg:dark:text-white shadow-xs lg:shadow-none select-none">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileThreadOpen(false)}
                    className="lg:hidden -ml-1 p-1 h-8 w-8 text-white lg:text-slate-700 hover:bg-white/15 lg:hover:bg-slate-100 rounded-full shrink-0"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="h-5 w-5 text-white lg:text-slate-700" />
                  </Button>

                  {/* Circular Contact Avatar */}
                  <div className="h-9 w-9 rounded-full lg:rounded-xl bg-white/20 lg:bg-slate-100 lg:dark:bg-[#191922] border-0 lg:border lg:border-slate-200 lg:dark:border-[#272734] flex items-center justify-center shrink-0">
                    {isAgencyThread ? (
                      <Globe2 className="h-4 w-4 text-white lg:text-blue-600 lg:dark:text-blue-400" />
                    ) : (
                      <Building2 className="h-4 w-4 text-white lg:text-emerald-700 lg:dark:text-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-white lg:text-slate-900 lg:dark:text-white truncate">
                        {isAgencyThread && isForeignAgency
                          ? `Headquarters • ${selectedParties?.staffName || "Staff"}`
                          : selectedParties?.partyLine || selectedThread.title || selectedThread.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "hidden sm:inline-flex text-[10px] px-2 py-0 font-semibold shrink-0",
                          isAgencyThread
                            ? "border-white/40 lg:border-blue-300 text-white lg:text-blue-700 lg:dark:text-blue-400 bg-white/10 lg:bg-blue-50/50"
                            : "border-white/40 lg:border-emerald-300 text-white lg:text-emerald-800 lg:dark:text-emerald-400 bg-white/10 lg:bg-emerald-50/50"
                        )}
                      >
                        {selectedParties?.badgeLabel || selectedThread.thread_type || "Internal"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] lg:text-xs text-emerald-100 lg:text-slate-500 dark:text-emerald-200/80 lg:dark:text-zinc-400 mt-0.5 truncate">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#25d366] shrink-0" />
                      <span className="truncate">
                        {isAgencyThread
                          ? `Online • ${selectedParties?.agencyName || "Foreign Agency"} ↔ ${selectedParties?.staffName || "Staff"}`
                          : `Active • ${(selectedThread.participants || []).map((p) => resolveUserDisplay(p).name).filter(Boolean).join(", ") || "Internal Staff"}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Context Link */}
                  {selectedThread.context_type === "Applicant" && selectedThread.context_reference && (
                    <Link
                      href={isForeignAgency ? "/agent" : `/applicants/${selectedThread.context_reference}`}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/15 lg:bg-slate-100 text-white lg:text-slate-700 border border-white/20 lg:border-slate-200 hover:underline"
                    >
                      <User className="h-3 w-3" />
                      Dossier: {selectedThread.context_reference}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}

                  {/* Add Participant: Internal threads only per contract */}
                  {!isAgencyThread && !isForeignAgency && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddParticipantModalOpen(true)}
                      className="h-8 text-xs text-white lg:text-slate-700 hover:bg-white/15 lg:hover:bg-slate-100 lg:border lg:border-slate-300 lg:dark:border-[#282835]"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">Add Colleague</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      refetchMessages();
                      refetchMyThreads();
                      if (isSupervisorOrAdmin) refetchOversightThreads();
                    }}
                    className="h-8 w-8 text-white lg:text-slate-500 hover:bg-white/15 lg:hover:bg-slate-100 rounded-full"
                    title="Refresh conversation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Messages Stream Area: Styled with WhatsApp wallpaper background on mobile */}
              <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2.5 lg:space-y-3.5 bg-[#efeae2] dark:bg-[#0b141a] lg:bg-white lg:dark:bg-[#0e0e12]">
                {/* Date separator */}
                <div className="flex justify-center my-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase bg-white/80 dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] shadow-2xs select-none">
                    Messages History
                  </span>
                </div>

                {isMessagesLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Loading discussion history...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isOutgoing =
                      msg.sender?.toLowerCase().trim() === currentEmail ||
                      msg.sender_name?.toLowerCase().includes("you") ||
                      msg.sender === authUser?.email;

                    const senderInfo = resolveUserDisplay(msg.sender);
                    const formattedTime = msg.creation
                      ? new Date(msg.creation).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <div
                        key={msg.name}
                        className={cn(
                          "flex flex-col max-w-[88%] sm:max-w-[75%]",
                          isOutgoing ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {/* Sender info showing Name & Role */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">
                            {isOutgoing ? `You (${senderInfo.name})` : senderInfo.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-[#20202c] text-slate-600 dark:text-zinc-400 font-medium">
                            {senderInfo.role}
                          </span>
                          <span className="text-slate-400">
                            • {formattedTime}
                          </span>
                        </div>

                        {/* WhatsApp Message bubble */}
                        <div
                          className={cn(
                            "p-2.5 lg:p-3 rounded-2xl text-xs space-y-1.5 leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] lg:shadow-2xs",
                            isOutgoing
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] lg:bg-emerald-900 text-[#111b21] dark:text-[#e9edef] lg:text-white rounded-tr-xs"
                              : "bg-white dark:bg-[#202c33] lg:bg-slate-100 lg:dark:bg-[#181822] text-[#111b21] dark:text-[#e9edef] lg:text-zinc-100 rounded-tl-xs border-0 lg:border lg:border-slate-200/80 lg:dark:border-[#262634]"
                          )}
                        >
                          {msg.message && (
                            <p className="whitespace-pre-wrap text-[13px] md:text-xs">
                              {msg.message}
                            </p>
                          )}

                          {/* Mentions pills */}
                          {(msg.mentioned_applicant || msg.mentioned_placement) && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {msg.mentioned_applicant && (
                                <Link
                                  href={`/applicants/${msg.mentioned_applicant}`}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                                    isOutgoing
                                      ? "bg-[#c4ecc0] dark:bg-[#025243] md:bg-emerald-800 text-emerald-950 dark:text-emerald-100 md:text-emerald-100 border-emerald-300 dark:border-emerald-700 md:border-emerald-700"
                                      : "bg-slate-100 dark:bg-[#182229] md:bg-white md:dark:bg-[#1e1e28] text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  )}
                                >
                                  <User className="h-2.5 w-2.5" />
                                  Applicant: {msg.mentioned_applicant}
                                </Link>
                              )}
                              {msg.mentioned_placement && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                                    isOutgoing
                                      ? "bg-[#c4ecc0] dark:bg-[#025243] md:bg-emerald-800 text-emerald-950 dark:text-emerald-100 md:text-emerald-100 border-emerald-300 dark:border-emerald-700 md:border-emerald-700"
                                      : "bg-slate-100 dark:bg-[#182229] md:bg-white md:dark:bg-[#1e1e28] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#323242]"
                                  )}
                                >
                                  <Briefcase className="h-2.5 w-2.5" />
                                  Placement: {msg.mentioned_placement}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Attachment preview */}
                          {msg.attachment && (
                            <div className="pt-1">
                              <a
                                href={msg.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "inline-flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold border transition-all",
                                  isOutgoing
                                    ? "bg-[#c4ecc0] dark:bg-[#025243] md:bg-emerald-800 text-emerald-950 dark:text-white md:text-white border-emerald-300 dark:border-emerald-700 md:border-emerald-700 hover:opacity-90"
                                    : "bg-slate-50 dark:bg-[#182229] md:bg-white md:dark:bg-[#1f1f2a] text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-[#2f2f3d] hover:bg-slate-100"
                                )}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[200px]">
                                  {msg.attachment.split("/").pop() || "Attached File"}
                                </span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}

                          {/* Timestamp and WhatsApp read receipts checkmark */}
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 text-[10px] select-none pt-0.5",
                              isOutgoing
                                ? "text-[#667781] dark:text-emerald-200/80 md:text-emerald-200"
                                : "text-[#667781] dark:text-[#8696a0]"
                            )}
                          >
                            <span>{formattedTime}</span>
                            {isOutgoing && (
                              <WhatsAppDoubleCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-zinc-700" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-300">
                      No messages in this discussion yet.
                    </p>
                    <p className="text-[11px]">Send the first message to open coordination.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Area: WhatsApp Capsule Input on Mobile */}
              <div className="p-2 md:p-3 border-t border-slate-200 dark:border-[#202027] bg-[#f0f2f5] dark:bg-[#1f2c34] md:bg-slate-50/50 md:dark:bg-[#111116] space-y-2">
                {/* Active Chips Area (Attachment & Mention) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Pending Attachment Chip */}
                  {pendingAttachment && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="font-semibold truncate max-w-[220px]">
                        {pendingAttachment.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Active Mention Chips */}
                  {mentionedApplicants.map((appId) => {
                    const cand = mentionableApplicants.find((a) => a.id === appId);
                    return (
                      <div
                        key={appId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-300"
                      >
                        <AtSign className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                        <span className="font-semibold font-mono">{appId}</span>
                        {cand && (
                          <span className="truncate max-w-[150px] text-slate-600 dark:text-zinc-300">
                            ({cand.name})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setMentionedApplicants((prev) => prev.filter((id) => id !== appId))
                          }
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-0.5"
                          title="Remove mention"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Mention Dropdown */}
                {showMentionInputs && (
                  <div className="p-3 rounded-lg bg-white dark:bg-[#16161f] border border-slate-200 dark:border-[#262635] text-xs shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <AtSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Mention Applicant(s):
                      </label>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                        {isCurrentChatWithForeignAgency
                          ? `${mentionableApplicants.length} candidate${mentionableApplicants.length === 1 ? "" : "s"} available for this agency`
                          : `${mentionableApplicants.length} registered applicant${mentionableApplicants.length === 1 ? "" : "s"}`}
                      </span>
                    </div>

                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !mentionedApplicants.includes(val)) {
                          setMentionedApplicants((prev) => [...prev, val]);
                        }
                      }}
                      className="w-full h-8 text-xs rounded-md border border-slate-200 dark:border-[#2b2b3b] bg-white dark:bg-[#14141a] text-slate-900 dark:text-zinc-100 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Add an applicant to mention --</option>
                      {mentionableApplicants.map((cand) => {
                        const isAlreadyMentioned = mentionedApplicants.includes(cand.id);
                        return (
                          <option
                            key={cand.id}
                            value={cand.id}
                            disabled={isAlreadyMentioned}
                          >
                            {isAlreadyMentioned ? "✓ " : ""}{cand.id} — {cand.name} [{cand.tag}] ({cand.detail})
                          </option>
                        );
                      })}
                    </select>

                    {isCurrentChatWithForeignAgency && mentionableApplicants.length === 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        No candidates are currently listed on this agency&apos;s portal discovery or in active placements.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 md:gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach document or file"
                    className="h-9 w-9 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded-full shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Mention Button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowMentionInputs(!showMentionInputs)}
                    title={
                      mentionedApplicants.length > 0
                        ? `Mentioning ${mentionedApplicants.length} applicant(s)`
                        : "Mention applicant(s)"
                    }
                    className={cn(
                      "h-9 w-9 rounded-full shrink-0 transition-colors",
                      showMentionInputs || mentionedApplicants.length > 0
                        ? "text-[#00a884] bg-white dark:bg-[#2a3942] shadow-2xs"
                        : "text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white"
                    )}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>

                  {/* Input Field: Rounded-full WhatsApp style on mobile */}
                  <Textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim() || pendingAttachment) {
                          sendMessageMutation.mutate();
                        }
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 min-h-[40px] max-h-32 text-xs py-2.5 px-4 rounded-full md:rounded-md bg-white dark:bg-[#2a3942] md:dark:bg-[#15151c] text-[#111b21] dark:text-[#e9edef] border-0 md:border shadow-2xs focus-visible:ring-0 focus-visible:outline-none placeholder:text-[#8696a0]"
                  />

                  {/* Mobile WhatsApp Circular Send Button */}
                  <button
                    type="button"
                    disabled={
                      (!messageText.trim() && !pendingAttachment) ||
                      sendMessageMutation.isPending ||
                      isUploadingAttachment
                    }
                    onClick={() => sendMessageMutation.mutate()}
                    className="md:hidden h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white flex items-center justify-center shadow-md shrink-0 transition-transform active:scale-95"
                    title="Send message"
                  >
                    {sendMessageMutation.isPending || isUploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Send className="h-4 w-4 ml-0.5 text-white" />
                    )}
                  </button>

                  {/* Desktop Send Button */}
                  <Button
                    type="button"
                    disabled={
                      (!messageText.trim() && !pendingAttachment) ||
                      sendMessageMutation.isPending ||
                      isUploadingAttachment
                    }
                    onClick={() => sendMessageMutation.mutate()}
                    className="hidden md:inline-flex h-9 px-3 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shrink-0"
                  >
                    {sendMessageMutation.isPending || isUploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-[#191922] flex items-center justify-center text-slate-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Conversation Selected
                </h3>
                <p className="max-w-sm">
                  {isSupervisorOrAdmin && viewMode === "oversight"
                    ? "Select an audited thread from the supervision list on the left to review communication between staff and foreign agencies."
                    : "Select a discussion thread from the list on the left, or initialize a new conversation to communicate with colleagues or registered foreign agencies."}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (isForeignAgency) {
                    createThreadMutation.mutate();
                  } else {
                    setIsNewThreadModalOpen(true);
                  }
                }}
                disabled={createThreadMutation.isPending}
                className="bg-emerald-900 text-white text-xs h-8 font-semibold"
              >
                {createThreadMutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : isForeignAgency ? (
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Plus className="mr-1 h-3.5 w-3.5" />
                )}
                {isForeignAgency ? "Connect with Staff" : "Start Conversation"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* New Conversation Thread Dialog                                */}
      {/* ============================================================= */}
      <Dialog open={isNewThreadModalOpen} onOpenChange={setIsNewThreadModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-5 sm:p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              {isForeignAgency
                ? "Contact Headquarters Staff"
                : canCommunicateWithForeignAgents
                ? "New Conversation Channel"
                : "New Staff Discussion"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {isForeignAgency
                ? "Communicate directly with Agency Administrator or Communication Manager."
                : canCommunicateWithForeignAgents
                ? "Initiate a channel with a Foreign Agency partner or internal agency colleague."
                : "Coordinate directly with an internal agency colleague."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {isForeignAgency ? (
              /* Foreign Agency Modal: Only Admin and Communication Manager allowed */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Select Headquarters Personnel (Admin or Communication Manager):
                  </label>
                  <select
                    value={newThreadRecipient}
                    onChange={(e) => setNewThreadRecipient(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200 font-medium"
                  >
                    <option value="">-- Select Headquarters Contact --</option>
                    {allowedStaffForAgency.map((emp: any) => {
                      const roleList = (emp.roles || []).filter((r: string) => r !== "Desk User").join(", ");
                      return (
                        <option key={emp.email || emp.name} value={emp.email || emp.name}>
                          {emp.full_name || emp.name} ({emp.email || emp.name}) {roleList ? `— [${roleList}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Authorized Headquarters Channel
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Foreign partners communicate exclusively with authorized Agency Administrators and Communication Managers. Messages sent here are delivered directly to headquarters management.
                  </p>
                </div>
              </div>
            ) : (
              /* Internal Staff Modal */
              <div className="space-y-3 pt-1">
                {/* Channel Selector for Staff with Admin or Communication Manager Role */}
                {canCommunicateWithForeignAgents && (
                  <div className="flex rounded-lg bg-slate-100 dark:bg-[#1a1a24] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewThreadType("Agency");
                        setNewThreadRecipient("");
                      }}
                      className={cn(
                        "flex-1 py-1 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                        newThreadType === "Agency"
                          ? "bg-white dark:bg-[#252535] text-emerald-800 dark:text-emerald-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                      )}
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Foreign Agency Partner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewThreadType("Internal");
                        setSelectedContractorId("");
                      }}
                      className={cn(
                        "flex-1 py-1 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                        newThreadType === "Internal"
                          ? "bg-white dark:bg-[#252535] text-emerald-800 dark:text-emerald-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Internal Colleague
                    </button>
                  </div>
                )}

                {/* Option A: Foreign Agency Partner */}
                {canCommunicateWithForeignAgents && newThreadType === "Agency" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                        Select Foreign Agency Partner:
                      </label>
                      <select
                        value={selectedContractorId}
                        onChange={(e) => setSelectedContractorId(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200 font-medium"
                      >
                        <option value="">-- Select Registered Foreign Agency --</option>
                        {availableContractors.map((c: any) => (
                          <option key={c.name} value={c.name}>
                            {c.company_name || c.contractor_name || c.name} {c.country ? `(${c.country})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Bilateral Foreign Agency Channel
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Authorized staff (Admin and Communication Manager) can maintain direct operational communication with registered foreign agencies.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Option B: Internal Colleague */
                  <div className="space-y-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                        Recipient Colleague (Staff Username / Email):
                      </label>
                      <select
                        value={newThreadRecipient}
                        onChange={(e) => setNewThreadRecipient(e.target.value)}
                        className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200 font-medium"
                      >
                        <option value="">-- Select Internal Staff Member --</option>
                        {internalEmployees
                          .filter((emp: any) => {
                            const isSelf = emp.email?.toLowerCase() === currentEmail || emp.name?.toLowerCase() === currentEmail;
                            const isForeignAgent = (emp.roles || []).some((r: string) => r.toLowerCase().trim() === "foreign agency" || r.toLowerCase().trim() === "foreign agent");
                            return !isSelf && !isForeignAgent;
                          })
                          .map((emp: any) => {
                            const roleList = (emp.roles || []).filter((r: string) => r !== "Desk User").join(", ");
                            return (
                              <option key={emp.email || emp.name} value={emp.email || emp.name}>
                                {emp.full_name || emp.name} ({emp.email || emp.name}) {roleList ? `— [${roleList}]` : ""}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                          Context Type:
                        </label>
                        <select
                          value={newThreadContextType}
                          onChange={(e) => setNewThreadContextType(e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200"
                        >
                          <option value="General">General Coordination</option>
                          <option value="Applicant">Applicant Specific</option>
                          <option value="Placement">Placement Specific</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                          Context Reference (Optional):
                        </label>
                        <Input
                          value={newThreadContextRef}
                          onChange={(e) => setNewThreadContextRef(e.target.value)}
                          placeholder="e.g. APP-00001"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNewThreadModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createThreadMutation.mutate()}
              disabled={
                createThreadMutation.isPending ||
                (isForeignAgency && !newThreadRecipient.trim()) ||
                (!isForeignAgency && canCommunicateWithForeignAgents && newThreadType === "Agency" && !selectedContractorId) ||
                (!isForeignAgency && (newThreadType === "Internal" || !canCommunicateWithForeignAgents) && !newThreadRecipient.trim())
              }
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-xs"
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              {isForeignAgency
                ? "Start Conversation"
                : canCommunicateWithForeignAgents && newThreadType === "Agency"
                ? "Open Agency Channel"
                : "Initialize Discussion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* Add Participant Dialog (Internal Threads Only)                 */}
      {/* ============================================================= */}
      <Dialog open={isAddParticipantModalOpen} onOpenChange={setIsAddParticipantModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              Add Colleague to Conversation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Internal threads support multi-party coordination between agency staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                Colleague Email (User.name = email):
              </label>
              <select
                value={newParticipantEmail}
                onChange={(e) => setNewParticipantEmail(e.target.value)}
                className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200 font-medium"
              >
                <option value="">-- Select Colleague to Add --</option>
                {internalEmployees
                  .filter((emp: any) => {
                    const isSelf = emp.email?.toLowerCase() === currentEmail;
                    const isForeignAgent = (emp.roles || []).some((r: string) => r.toLowerCase().trim() === "foreign agency");
                    const isAlreadyParticipant = (selectedThread?.participants || []).includes(emp.email);
                    return !isSelf && !isForeignAgent && !isAlreadyParticipant;
                  })
                  .map((emp: any) => (
                    <option key={emp.email || emp.name} value={emp.email || emp.name}>
                      {emp.full_name || emp.name} ({emp.email || emp.name})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddParticipantModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => addParticipantMutation.mutate()}
              disabled={addParticipantMutation.isPending || !newParticipantEmail.trim()}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-xs"
            >
              {addParticipantMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 mr-1" />
              )}
              Add to Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
