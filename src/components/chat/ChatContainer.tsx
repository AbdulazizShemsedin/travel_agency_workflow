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
import { cn } from "@/lib/utils";

export function ChatContainer() {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();
  const currentEmail = (authUser?.email || "").toLowerCase().trim();

  // Role detection
  const isForeignAgency = React.useMemo(() => {
    const hasRole = (roles || []).some((r) => String(r).toLowerCase().trim() === "foreign agency");
    return hasRole && authUser?.is_internal_staff === false;
  }, [roles, authUser]);

  // Executive oversight permission: Administrator, System Manager, Admin, or Communication Manager
  const isSupervisorOrAdmin = React.useMemo(() => {
    const adminRoles = ["administrator", "system manager", "admin", "communication manager"];
    const userRoles = (roles || []).map((r) => String(r).toLowerCase().trim());
    const authUserRoles = (authUser?.roles || []).map((r: any) =>
      typeof r === "string" ? r.toLowerCase().trim() : String(r?.role || "").toLowerCase().trim()
    );
    const allUserRoles = new Set([...userRoles, ...authUserRoles]);
    if (currentEmail === "administrator") return true;
    return adminRoles.some((role) => allUserRoles.has(role));
  }, [roles, authUser, currentEmail]);

  // View Mode: "my" (only communicating parties) vs "oversight" (Admin & Communication Manager supervision)
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
  const [mentionedApplicant, setMentionedApplicant] = React.useState<string>("");
  const [mentionedPlacement, setMentionedPlacement] = React.useState<string>("");
  const [showMentionInputs, setShowMentionInputs] = React.useState<boolean>(false);
  const [pendingAttachment, setPendingAttachment] = React.useState<{ file: File; url?: string } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState<boolean>(false);

  // Modals
  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = React.useState<boolean>(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = React.useState<boolean>(false);

  // New Thread Form State
  const [newThreadType, setNewThreadType] = React.useState<"Internal" | "Agency">(
    isForeignAgency ? "Agency" : "Internal"
  );
  const [newThreadRecipient, setNewThreadRecipient] = React.useState<string>("");
  const [selectedContractorId, setSelectedContractorId] = React.useState<string>("");
  const [newThreadContextType, setNewThreadContextType] = React.useState<string>("General");
  const [newThreadContextRef, setNewThreadContextRef] = React.useState<string>("");

  // Add Participant Form State
  const [newParticipantEmail, setNewParticipantEmail] = React.useState<string>("");

  // Queries for internal staff and foreign agency selection
  const { data: internalEmployees = [] } = useQuery({
    queryKey: ["v2_employees_chat_dropdown"],
    queryFn: listEmployeesV2,
    enabled: !isForeignAgency,
    staleTime: 60000,
  });

  const { data: availableContractors = [], isLoading: isContractorsLoading } = useQuery({
    queryKey: ["v2_contractors_chat_dropdown"],
    queryFn: () => listContractorsV2(),
    enabled: !isForeignAgency,
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

  // 2. Fetch All Organization Threads for Oversight (Admin & Communication Manager only)
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
    // Strict privacy for "my" conversations: ensure user is participant or owner
    return myThreads.filter((t) => {
      if (t.owner?.toLowerCase().trim() === currentEmail) return true;
      const participants = (t.participants || []).map((p) => p.toLowerCase().trim());
      if (participants.includes(currentEmail)) return true;
      if (isForeignAgency && t.thread_type === "Agency") return true;
      return false;
    });
  }, [isSupervisorOrAdmin, viewMode, allOversightThreads, myThreads, currentEmail, isForeignAgency]);

  // Oversight Statistics
  const oversightStats = React.useMemo(() => {
    const total = allOversightThreads.length;
    const internal = allOversightThreads.filter((t) => t.thread_type === "Internal").length;
    const agency = allOversightThreads.filter((t) => t.thread_type === "Agency").length;
    return { total, internal, agency };
  }, [allOversightThreads]);

  // Resolves any user email/identifier to full name and role
  const resolveUserDisplay = React.useCallback(
    (emailOrUsername: string) => {
      if (!emailOrUsername) return { name: "Unknown", email: "", role: "User", isStaff: true };
      const clean = emailOrUsername.toLowerCase().trim();
      if (clean === "administrator") {
        return { name: "System Administrator", email: "Administrator", role: "Administrator", isStaff: true };
      }

      const emp = internalEmployees.find(
        (e) => (e.email || e.name || "").toLowerCase().trim() === clean
      );
      if (emp) {
        const staffRoles = (emp.roles || []).filter((r: string) => r !== "Desk User");
        return {
          name: emp.full_name || emp.name,
          email: emp.email || emp.name,
          role: staffRoles[0] || "Internal Staff",
          isStaff: true,
        };
      }

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

      return {
        name: emailOrUsername.split("@")[0] || emailOrUsername,
        email: emailOrUsername,
        role: "Staff Member",
        isStaff: true,
      };
    },
    [internalEmployees, availableContractors]
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
          return cleanP !== conUser && cleanP !== (thread.owner || "").toLowerCase().trim();
        });

        const staffEmail = staffParticipants[0] || (thread.owner !== conUser ? thread.owner : "") || "";
        const staffInfo = staffEmail ? resolveUserDisplay(staffEmail) : { name: "Communication Manager", role: "HQ Staff" };

        return {
          type: "Agency" as const,
          staffName: staffInfo.name,
          staffRole: staffInfo.role,
          agencyName,
          agencyCountry,
          badgeLabel: "Staff ↔ Foreign Agency",
          partyLine: `${staffInfo.name} (${staffInfo.role}) ⟷ ${agencyName}${agencyCountry}`,
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
          partyLine: `${p1.name} (${p1.role}) ⟷ ${p2.name} (${p2.role})${extras}`,
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

      return await sendMessageV2(
        selectedThread.name,
        messageText.trim() || undefined,
        mentionedApplicant.trim() || undefined,
        mentionedPlacement.trim() || undefined,
        attachmentUrl
      );
    },
    onSuccess: () => {
      setMessageText("");
      setPendingAttachment(null);
      setMentionedApplicant("");
      setMentionedPlacement("");
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
        return await createAgencyThreadV2();
      } else if (newThreadType === "Agency") {
        if (!selectedContractorId) {
          throw new Error("Please select a registered foreign agency from the list.");
        }
        // Check if an existing thread for this contractor already exists
        const existing = (allOversightThreads.length > 0 ? allOversightThreads : myThreads).find(
          (t) =>
            t.thread_type === "Agency" &&
            (t.contractor === selectedContractorId ||
              t.title?.toLowerCase().includes(selectedContractorId.toLowerCase()) ||
              t.name.includes(selectedContractorId))
        );
        if (existing) {
          return { name: existing.name, thread_name: existing.name, existed: true };
        }
        // Connect directly to the selected contractor
        return await createAgencyThreadV2(selectedContractorId);
      } else {
        if (!newThreadRecipient.trim() || !newThreadRecipient.includes("@")) {
          throw new Error("Please select a staff colleague from the dropdown.");
        }
        return await createInternalThreadV2(
          newThreadRecipient.trim(),
          newThreadContextType,
          newThreadContextRef.trim() || undefined
        );
      }
    },
    onSuccess: (res: any) => {
      toast.success(
        isForeignAgency
          ? "Staff conversation ready"
          : newThreadType === "Agency"
          ? "Foreign agency channel active"
          : "Conversation thread initialized successfully"
      );
      setIsNewThreadModalOpen(false);
      setNewThreadRecipient("");
      setSelectedContractorId("");
      setNewThreadContextRef("");
      setNewThreadContextType("General");

      queryClient.invalidateQueries({ queryKey: ["chat_threads_my"] });
      queryClient.invalidateQueries({ queryKey: ["chat_threads_oversight"] });
      const threadName = res?.name || res?.thread_name;
      if (threadName) {
        setSelectedThread({
          name: threadName,
          thread_type: isForeignAgency ? "Agency" : newThreadType,
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
    <div className="h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#101014] overflow-hidden shadow-sm">
      {/* ------------------------------------------------------------- */}
      {/* Top Banner & Quick Header                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-[#202027] bg-slate-50/50 dark:bg-[#141419] flex items-center justify-between">
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
            onClick={() => {
              if (isForeignAgency) {
                createThreadMutation.mutate();
              } else {
                setIsNewThreadModalOpen(true);
              }
            }}
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
            {isForeignAgency ? "Connect with Staff" : "New Conversation"}
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
            "w-full md:w-84 lg:w-96 border-r border-slate-200 dark:border-[#202027] flex flex-col bg-slate-50/30 dark:bg-[#121217]",
            isMobileThreadOpen ? "hidden md:flex" : "flex"
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
          <div className="p-3 border-b border-slate-200 dark:border-[#202027] space-y-2">
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
                  className="w-full h-7.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a38] bg-white dark:bg-[#161622] text-slate-800 dark:text-zinc-200 font-medium"
                >
                  <option value="all">-- All Internal Staff ({internalEmployees.length}) --</option>
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
                    label: "All",
                    count: isSupervisorOrAdmin && viewMode === "oversight" ? oversightStats.total : undefined,
                  },
                  {
                    id: "Internal",
                    label: "Staff ↔ Staff",
                    count: isSupervisorOrAdmin && viewMode === "oversight" ? oversightStats.internal : undefined,
                  },
                  {
                    id: "Agency",
                    label: "Staff ↔ Agency",
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
                        "flex-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-all flex items-center justify-center gap-1",
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#20202a]"
                      )}
                    >
                      <span>{type.label}</span>
                      {type.count !== undefined && (
                        <span className="opacity-75 font-mono">({type.count})</span>
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
                      "w-full p-3 text-left transition-all flex flex-col gap-1.5",
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-800 dark:border-l-emerald-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-[#181820]"
                    )}
                  >
                    {/* Header: Communicating Parties Breakdown */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isAgency ? (
                          <Globe2 className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {isAgency && isForeignAgency
                            ? "Agency Communication Desk"
                            : parties.partyLine}
                        </span>
                      </div>

                      {thread.unread_count ? (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {thread.unread_count}
                        </span>
                      ) : null}
                    </div>

                    {/* Who Communicated With Whom Summary Badge */}
                    <div className="flex items-center justify-between text-[10px] gap-1">
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
                      <span className="font-mono text-slate-400 text-[10px]">{thread.name}</span>
                    </div>

                    {/* Last message snippet */}
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {thread.last_message || "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{thread.last_message_time || "Recent"}</span>
                      {thread.context_type && thread.context_type !== "General" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-200/80 dark:bg-[#1e1e28] text-slate-700 dark:text-zinc-300">
                          {thread.context_type}: {thread.context_reference || "Linked"}
                        </span>
                      )}
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
            "flex-1 flex flex-col bg-white dark:bg-[#0e0e12]",
            !isMobileThreadOpen ? "hidden md:flex" : "flex"
          )}
        >
          {selectedThread ? (
            <>
              {/* Supervisory Mode Audit Banner: Highlight when viewing outside participant scope */}
              {isSupervisorOrAdmin && viewMode === "oversight" && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold">Supervisory Oversight Stream:</span>{" "}
                      <span>{selectedParties?.partyLine}</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 shrink-0">
                    Audit & Compliance View
                  </span>
                </div>
              )}

              {/* Thread Header */}
              <div className="p-3.5 border-b border-slate-200 dark:border-[#202027] flex items-center justify-between gap-3 bg-white dark:bg-[#111116]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileThreadOpen(false)}
                    className="md:hidden -ml-1.5 mr-0.5 p-1.5 h-8 w-8 text-slate-600 dark:text-zinc-300 shrink-0"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#191922] border border-slate-200 dark:border-[#272734] flex items-center justify-center shrink-0">
                    {isAgencyThread ? (
                      <Globe2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Building2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {isAgencyThread && isForeignAgency
                          ? "Agency Communication Desk"
                          : selectedParties?.partyLine || selectedThread.title || selectedThread.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 font-semibold shrink-0",
                          isAgencyThread
                            ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50"
                            : "border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50"
                        )}
                      >
                        {selectedParties?.badgeLabel || selectedThread.thread_type || "Internal"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                      <Users className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {isAgencyThread
                          ? `Bilateral Line: ${selectedParties?.agencyName || "Foreign Agency"} ↔ HQ Staff`
                          : (selectedThread.participants || []).join(", ") || "Active Participants"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Context Link */}
                  {selectedThread.context_type === "Applicant" && selectedThread.context_reference && (
                    <Link
                      href={isForeignAgency ? "/agent" : `/applicants/${selectedThread.context_reference}`}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#1a1a24] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#292938] hover:underline"
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
                      variant="outline"
                      onClick={() => setIsAddParticipantModalOpen(true)}
                      className="h-8 text-xs border-slate-300 dark:border-[#282835]"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add Colleague
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
                    className="h-8 w-8 text-slate-500"
                    title="Refresh conversation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Messages Stream Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
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

                    return (
                      <div
                        key={msg.name}
                        className={cn(
                          "flex flex-col max-w-[85%] sm:max-w-[75%]",
                          isOutgoing ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {/* Sender info showing Name, Role & Time */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">
                            {isOutgoing ? "You" : senderInfo.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-[#20202c] text-slate-600 dark:text-zinc-400 font-medium">
                            {senderInfo.role}
                          </span>
                          <span className="text-slate-400">
                            •{" "}
                            {msg.creation
                              ? new Date(msg.creation).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "p-3 rounded-2xl text-xs space-y-2 leading-relaxed shadow-2xs",
                            isOutgoing
                              ? "bg-emerald-900 text-white rounded-tr-xs"
                              : "bg-slate-100 dark:bg-[#181822] text-slate-900 dark:text-zinc-100 rounded-tl-xs border border-slate-200/80 dark:border-[#262634]"
                          )}
                        >
                          {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                          {/* Mentions pills */}
                          {(msg.mentioned_applicant || msg.mentioned_placement) && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {msg.mentioned_applicant && (
                                <Link
                                  href={`/applicants/${msg.mentioned_applicant}`}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                                    isOutgoing
                                      ? "bg-emerald-800 text-emerald-100 border-emerald-700"
                                      : "bg-white dark:bg-[#1e1e28] text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
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
                                      ? "bg-emerald-800 text-emerald-100 border-emerald-700"
                                      : "bg-white dark:bg-[#1e1e28] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#323242]"
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
                                    ? "bg-emerald-800 text-white border-emerald-700 hover:bg-emerald-700"
                                    : "bg-white dark:bg-[#1f1f2a] text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-[#2f2f3d] hover:bg-slate-50"
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

              {/* Message Composer Area */}
              <div className="p-3 border-t border-slate-200 dark:border-[#202027] bg-slate-50/50 dark:bg-[#111116] space-y-2">
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
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Optional Mention Inputs */}
                {showMentionInputs && (
                  <div className="p-2 rounded-lg bg-white dark:bg-[#16161f] border border-slate-200 dark:border-[#262635] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                        Mention Applicant (ID):
                      </label>
                      <Input
                        value={mentionedApplicant}
                        onChange={(e) => setMentionedApplicant(e.target.value)}
                        placeholder="e.g. APP-00001"
                        className="h-7 text-xs font-mono mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                        Mention Placement (ID):
                      </label>
                      <Input
                        value={mentionedPlacement}
                        onChange={(e) => setMentionedPlacement(e.target.value)}
                        placeholder="e.g. PLM-00006"
                        className="h-7 text-xs font-mono mt-0.5"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach document or file"
                    className="h-9 w-9 text-slate-500 shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowMentionInputs(!showMentionInputs)}
                    title="Mention applicant or placement"
                    className={cn(
                      "h-9 w-9 shrink-0",
                      showMentionInputs
                        ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                        : "text-slate-500"
                    )}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>

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
                    placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                    className="flex-1 min-h-[36px] max-h-32 text-xs py-2 bg-white dark:bg-[#15151c]"
                  />

                  <Button
                    type="button"
                    disabled={
                      (!messageText.trim() && !pendingAttachment) ||
                      sendMessageMutation.isPending ||
                      isUploadingAttachment
                    }
                    onClick={() => sendMessageMutation.mutate()}
                    className="h-9 px-3 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shrink-0"
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
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Initialize Conversation Thread
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Create an internal staff discussion or connect with registered foreign agency partners.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Thread Type Selector */}
            {!isForeignAgency ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewThreadType("Internal")}
                  className={cn(
                    "p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all",
                    newThreadType === "Internal"
                      ? "border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-800"
                      : "border-slate-200 dark:border-[#262634] text-slate-600 dark:text-zinc-400"
                  )}
                >
                  <Building2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold block">Internal Staff Thread</span>
                    <span className="text-[11px] opacity-80">Coordination between agency colleagues</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewThreadType("Agency")}
                  className={cn(
                    "p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all",
                    newThreadType === "Agency"
                      ? "border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-1 ring-blue-800"
                      : "border-slate-200 dark:border-[#262634] text-slate-600 dark:text-zinc-400"
                  )}
                >
                  <Globe2 className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-bold block">Foreign Agency Channel</span>
                    <span className="text-[11px] opacity-80">Direct agency partner thread</span>
                  </div>
                </button>
              </div>
            ) : null}

            {/* Internal Thread Fields or Agency Selector */}
            {!isForeignAgency && newThreadType === "Internal" ? (
              <div className="space-y-3 pt-1">
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
                      .filter((emp: any) => emp.email !== currentEmail)
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
            ) : !isForeignAgency && newThreadType === "Agency" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Select Foreign Agency to Communicate With:
                  </label>
                  {isContractorsLoading ? (
                    <div className="h-8.5 px-3 flex items-center gap-2 text-xs text-slate-500 border rounded-lg bg-slate-50 dark:bg-[#161622]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Loading registered foreign agencies...
                    </div>
                  ) : availableContractors.length > 0 ? (
                    <select
                      value={selectedContractorId}
                      onChange={(e) => setSelectedContractorId(e.target.value)}
                      className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200 font-medium"
                    >
                      <option value="">-- Select Registered Foreign Agency ({availableContractors.length} Available) --</option>
                      {availableContractors.map((c: any) => {
                        const countryStr = c.country ? ` — ${c.country}` : "";
                        const contactStr = c.contact_person ? ` (Contact: ${c.contact_person})` : "";
                        const userStr = c.user ? ` • [${c.user}]` : "";
                        return (
                          <option key={c.name} value={c.name}>
                            {c.company_name || c.contractor_name || c.name}{countryStr}{contactStr}{userStr}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-xs">
                      No registered foreign agencies found. Register contractors in the Contractors module.
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Dedicated Foreign Agency Channel</p>
                  <p className="text-[11px] leading-relaxed">
                    Selecting a registered foreign agency opens or establishes direct coordination between agency headquarters and the partner contractor. Only the communicating parties and oversight administrators can inspect these threads.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                <p className="font-semibold">Direct Agency Communication Channel</p>
                <p className="text-[11px] leading-relaxed">
                  Foreign Agency channels connect directly with headquarters Communication Managers on the backend. Click Initialize to establish or refresh this live channel.
                </p>
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
              disabled={createThreadMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-xs"
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              Initialize Discussion
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
                  .filter((emp: any) => emp.email !== currentEmail && !(selectedThread?.participants || []).includes(emp.email))
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
