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
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  RefreshCw,
  AtSign,
  Briefcase,
  X,
  ArrowLeft,
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
import { cn } from "@/lib/utils";

export function ChatContainer() {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();
  const currentEmail = (authUser?.email || "").toLowerCase().trim();

  const isForeignAgency = React.useMemo(() => {
    const hasRole = (roles || []).some((r) => String(r).toLowerCase().trim() === "foreign agency");
    return hasRole && authUser?.is_internal_staff === false;
  }, [roles, authUser]);

  // State
  const [selectedThread, setSelectedThread] = React.useState<V2ChatThread | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [threadTypeFilter, setThreadTypeFilter] = React.useState<string>("All");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = React.useState<boolean>(false);

  // Composer State
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
  const [newThreadContextType, setNewThreadContextType] = React.useState<string>("General");
  const [newThreadContextRef, setNewThreadContextRef] = React.useState<string>("");

  // Add Participant Form State
  const [newParticipantEmail, setNewParticipantEmail] = React.useState<string>("");

  // 1. Fetch User's Real Threads List
  const {
    data: threads = [],
    isLoading: isThreadsLoading,
    isRefetching: isThreadsRefetching,
    refetch: refetchThreads,
  } = useQuery<V2ChatThread[]>({
    queryKey: ["chat_threads"],
    queryFn: listThreadsV2,
    staleTime: 10000,
    refetchInterval: 15000, // Reactive polling every 15s
  });

  // Keep selectedThread in sync if updated
  React.useEffect(() => {
    if (threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0]);
    } else if (selectedThread) {
      const refreshed = threads.find((t) => t.name === selectedThread.name);
      if (refreshed) {
        setSelectedThread(refreshed);
      }
    }
  }, [threads, selectedThread]);

  // Auto-initialize agency thread with Communication Manager if foreign agency has no threads yet
  React.useEffect(() => {
    if (isForeignAgency && !isThreadsLoading && threads.length === 0) {
      createAgencyThreadV2()
        .then((res: any) => {
          queryClient.invalidateQueries({ queryKey: ["chat_threads"] });
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
  }, [isForeignAgency, isThreadsLoading, threads.length, queryClient]);

  // 2. Fetch Messages for Selected Thread
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

  // 3. Automatically Mark as Read when Thread is opened
  React.useEffect(() => {
    if (selectedThread?.name && selectedThread.unread_count && selectedThread.unread_count > 0) {
      markReadV2(selectedThread.name)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["chat_threads"] });
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
      queryClient.invalidateQueries({ queryKey: ["chat_threads"] });
    },
    onError: (err: any) => {
      toast.error("Failed to send message", {
        description: err?.message || "Backend rejected message transmission.",
      });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (isForeignAgency || newThreadType === "Agency") {
        return await createAgencyThreadV2();
      } else {
        if (!newThreadRecipient.trim() || !newThreadRecipient.includes("@")) {
          throw new Error("Recipient email must be a valid User name (email address).");
        }
        return await createInternalThreadV2(
          newThreadRecipient.trim(),
          newThreadContextType,
          newThreadContextRef.trim() || undefined
        );
      }
    },
    onSuccess: (res: any) => {
      toast.success(isForeignAgency ? "Staff conversation ready" : "Conversation thread initialized successfully");
      setIsNewThreadModalOpen(false);
      setNewThreadRecipient("");
      setNewThreadContextRef("");
      setNewThreadContextType("General");

      queryClient.invalidateQueries({ queryKey: ["chat_threads"] });
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
      queryClient.invalidateQueries({ queryKey: ["chat_threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat_messages", selectedThread?.name] });
    },
    onError: (err: any) => {
      toast.error("Failed to add participant", {
        description: err?.message || "Backend rejected participant addition.",
      });
    },
  });

  // Filter threads
  const filteredThreads = React.useMemo(() => {
    return threads.filter((t) => {
      if (threadTypeFilter !== "All" && t.thread_type !== threadTypeFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.last_message?.toLowerCase().includes(q) ||
        (t.participants || []).some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [threads, threadTypeFilter, searchQuery]);

  // File selection handler
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAttachment({ file });
    }
  };

  const isAgencyThread = selectedThread?.thread_type === "Agency";

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#101014] overflow-hidden shadow-sm">
      {/* ------------------------------------------------------------- */}
      {/* Top Banner & Quick Stats                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-[#202027] bg-slate-50/50 dark:bg-[#141419] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-900 dark:bg-emerald-600 text-white flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              {isForeignAgency ? "Staff Coordination & Messages" : "V2 Communication & Agency Chat"}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {isForeignAgency
                ? "Direct bilateral channel with Agency Communication Manager."
                : "Live discussion threads with internal staff and foreign agency partners."}
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
        {/* Left Column: Thread List                                     */}
        {/* ============================================================= */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-[#202027] flex flex-col bg-slate-50/30 dark:bg-[#121217]",
            isMobileThreadOpen ? "hidden md:flex" : "flex"
          )}
        >
          {/* Thread Search & Filter Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-[#202027] space-y-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 h-8 text-xs bg-white dark:bg-[#17171f]"
              />
            </div>

            {/* Filter Pills */}
            {!isForeignAgency && (
              <div className="flex items-center gap-1">
                {["All", "Internal", "Agency"].map((type) => {
                  const active = threadTypeFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setThreadTypeFilter(type)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#20202a]"
                      )}
                    >
                      {type === "Agency" ? "Foreign Agencies" : type === "Internal" ? "Internal Staff" : "All Channels"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thread Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1c1c24]">
            {isThreadsLoading ? (
              <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                Loading conversations...
              </div>
            ) : filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.name === thread.name;
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
                      "w-full p-3.5 text-left transition-all flex flex-col gap-1.5",
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-800 dark:border-l-emerald-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-[#181820]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isAgency ? (
                          <Globe2 className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {isAgency && isForeignAgency ? "Agency Communication Desk" : thread.title || thread.name}
                        </span>
                      </div>

                      {thread.unread_count ? (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {thread.unread_count}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {thread.last_message || "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="font-mono">{thread.name}</span>
                      <span>{thread.last_message_time || "Recent"}</span>
                    </div>

                    {thread.context_type && thread.context_type !== "General" && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 dark:bg-[#1e1e28] text-slate-700 dark:text-zinc-300">
                          {thread.context_type}: {thread.context_reference || "Linked"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="h-7 w-7 text-slate-300 dark:text-zinc-600 mx-auto" />
                <p>No conversations found</p>
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
                  className="text-xs h-7"
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
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200 dark:border-[#202027] flex items-center justify-between gap-3 bg-white dark:bg-[#111116]">
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
                          : selectedThread.title || selectedThread.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 font-semibold",
                          isAgencyThread
                            ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50"
                            : "border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50"
                        )}
                      >
                        {isAgencyThread ? "Partner Channel" : selectedThread.thread_type || "Internal"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                      <Users className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {isAgencyThread
                          ? "Direct Line: Foreign Partner ↔ Communication Manager"
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
                      refetchThreads();
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

                    return (
                      <div
                        key={msg.name}
                        className={cn(
                          "flex flex-col max-w-[85%] sm:max-w-[75%]",
                          isOutgoing ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {/* Sender info */}
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 mb-1 px-1">
                          {isOutgoing ? "You" : msg.sender_name || msg.sender} •{" "}
                          {msg.creation ? new Date(msg.creation).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>

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
                    className={cn("h-9 w-9 shrink-0", showMentionInputs ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500")}
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
                  Select a discussion thread from the list on the left, or initialize a new conversation to communicate with staff or foreign agencies.
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
              Create an internal staff discussion or connect with foreign agency channels.
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

            {/* Internal Thread Fields or Agency Message */}
            {!isForeignAgency && newThreadType === "Internal" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Recipient Colleague (User.name = email):
                  </label>
                  <Input
                    value={newThreadRecipient}
                    onChange={(e) => setNewThreadRecipient(e.target.value)}
                    placeholder="colleague@agency.com"
                    className="h-8 text-xs font-mono"
                  />
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
              Add Participant to Conversation
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
              <Input
                value={newParticipantEmail}
                onChange={(e) => setNewParticipantEmail(e.target.value)}
                placeholder="colleague@agency.com"
                className="h-8 text-xs font-mono"
              />
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
