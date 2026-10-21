"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
  FileText,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { listDeletedMessagesV2, V2DeletedMessageRecord } from "@/lib/api/v2/communication";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { LoadError } from "@/components/ui/LoadError";

export default function DeletedMessagesAuditPage() {
  const { authUser, roles } = useAuth();

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAdmin =
    userRoles.some((r) => ["Admin", "Administrator", "System Manager"].includes(r)) ||
    (authUser?.email || "").toLowerCase() === "administrator";

  const [searchTerm, setSearchTerm] = React.useState("");

  const {
    data: deletedMessages = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<V2DeletedMessageRecord[]>({
    queryKey: ["deleted_messages_log"],
    queryFn: () => listDeletedMessagesV2(),
    enabled: isAdmin,
    staleTime: 60 * 1000,
  });

  const filteredItems = React.useMemo(() => {
    return deletedMessages.filter((msg) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        msg.sender?.toLowerCase().includes(q) ||
        msg.sender_name?.toLowerCase().includes(q) ||
        msg.deleted_by?.toLowerCase().includes(q) ||
        msg.deleted_by_name?.toLowerCase().includes(q) ||
        msg.message?.toLowerCase().includes(q) ||
        msg.contractor?.toLowerCase().includes(q) ||
        msg.thread_type?.toLowerCase().includes(q)
      );
    });
  }, [deletedMessages, searchTerm]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1c1c22] text-slate-400">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
          The deleted messages audit history is accessible exclusively to System Administrators.
        </p>
        <Link href="/chat">
          <Button variant="outline" size="sm" className="text-xs mt-2">
            Return to Messages
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Conversations
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Deleted Messages Audit
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Full retention audit log of redacted messages. Shows original content, timestamp, and actor who deleted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 px-3 text-xs border-slate-200 dark:border-[#26262f] hover:bg-slate-100 dark:hover:bg-[#1a1a20]"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${
                isLoading || isRefetching ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by sender, channel, or message text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs pl-8 border-slate-200 dark:border-[#26262f] bg-white dark:bg-[#121216]"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        {deletedMessages.length > 0 && (
          <Badge variant="outline" className="text-xs text-slate-600 dark:text-zinc-300">
            {filteredItems.length} {filteredItems.length === 1 ? "record" : "records"}
          </Badge>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs">Loading deleted messages audit log...</p>
        </div>
      ) : isError ? (
        <LoadError
          resourceName="Deleted Messages"
          error={error}
          onRetry={() => refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center bg-white/50 dark:bg-[#121216]/50">
          <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No deleted messages recorded
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Retracted messages will appear here for security and regulatory compliance oversight.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121216] shadow-xs">
          <div className="overflow-x-auto lg:overflow-hidden">
            <table className="w-full text-left text-xs lg:table-fixed">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#222227] bg-slate-50/75 dark:bg-[#16161c] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Sender</th>
                  <th className="px-4 py-3.5">Channel / Agency</th>
                  <th className="px-4 py-3.5 w-1/3">Original Message Content</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Sent At</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Deleted By & When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f26]">
                {filteredItems.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 dark:hover:bg-[#17171d]/60 transition-colors"
                  >
                    {/* Sender */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {row.sender_name || row.sender}
                        </span>
                        {row.sender_name && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {row.sender}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="neutral"
                          className={
                            row.thread_type === "Agency"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {row.contractor || row.thread_type || "Internal Discussion"}
                        </Badge>
                      </div>
                    </td>

                    {/* Original Message Content */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {row.message ? (
                          <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-w-md">
                            {row.message}
                          </p>
                        ) : (
                          <span className="italic text-slate-400 text-[11px]">
                            (Empty text message)
                          </span>
                        )}

                        {row.attachment && (
                          <a
                            href={row.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline pt-0.5"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Attachment: {row.attachment.split("/").pop()}</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Sent At */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                      {row.creation ? (
                        <div className="flex flex-col">
                          <span>{row.creation.split(" ")[0]}</span>
                          <span className="text-[10px] text-slate-400">
                            {row.creation.split(" ")[1] || ""}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Deleted By & When */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-rose-600 dark:text-rose-400">
                          {row.deleted_by_name || row.deleted_by || "Sender"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {row.deleted_on || "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
