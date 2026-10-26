"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
  RefreshCw,
  UserCheck,
  ListTodo,
  Send,
  Calendar,
  AlertCircle,
  FileText,
  User,
  HeartPulse,
  CheckCheck,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getSentNotificationsV2,
  getLiveAlertsV2,
  markAlertsReadV2,
  setAlertStateV2,
  V2SentNotificationItem,
  V2LiveAlertItem,
} from "@/lib/api/v2/notifications";
import { listMyTodosV2 } from "@/lib/api/v2/clearance";
import { V2UserTodoItem } from "@/types/workspace";
import { useAuth } from "@/components/providers/AuthProvider";
import { isPureForeignAgency } from "@/lib/auth/permissions";
import { stripRecordIds, shortRef } from "@/lib/utils/display-id";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { authUser } = useAuth();
  const isAgency = React.useMemo(() => isPureForeignAgency(authUser), [authUser]);

  // Three primary tabs: "attention" (Needs attention) | "sent" (Sent to you) | "tasks" (My tasks)
  const [activeTab, setActiveTab] = React.useState<"attention" | "sent" | "tasks">(
    isAgency ? "sent" : "attention"
  );
  const [sentPage, setSentPage] = React.useState<number>(1);

  React.useEffect(() => {
    if (isAgency && activeTab !== "sent") {
      setActiveTab("sent");
    }
  }, [isAgency, activeTab]);

  // Tab 1: Live Alerts ("Needs attention")
  const {
    data: liveAlertsData,
    isLoading: isLoadingAlerts,
    isRefetching: isRefetchingAlerts,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ["v2_live_alerts"],
    queryFn: getLiveAlertsV2,
    enabled: !isAgency,
    refetchInterval: 30000,
  });

  const alerts = React.useMemo<V2LiveAlertItem[]>(() => {
    return liveAlertsData?.alerts || [];
  }, [liveAlertsData]);

  const unreadAlertsCount = liveAlertsData?.unread_count ?? alerts.length;

  // Tab 2: Sent Notifications ("Sent to you")
  const {
    data: sentData,
    isLoading: isLoadingSent,
    isRefetching: isRefetchingSent,
    refetch: refetchSent,
  } = useQuery({
    queryKey: ["v2_sent_notifications", sentPage],
    queryFn: () => getSentNotificationsV2(sentPage, 50),
    refetchInterval: 30000,
  });

  const sentNotifications = React.useMemo<V2SentNotificationItem[]>(() => {
    return sentData?.notifications || [];
  }, [sentData]);

  const sentTotalCount = sentData?.total_count || 0;
  const sentTotalPages = Math.max(1, Math.ceil(sentTotalCount / 50));

  // Tab 3: My Tasks ("My tasks")
  const {
    data: myTodos = [],
    isLoading: isLoadingTodos,
    isRefetching: isRefetchingTodos,
    refetch: refetchTodos,
  } = useQuery<V2UserTodoItem[]>({
    queryKey: ["v2_my_todos", authUser?.email],
    queryFn: () => listMyTodosV2("Open"),
    enabled: !isAgency && Boolean(authUser?.email),
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();
  const [isActionPending, setIsActionPending] = React.useState(false);

  const handleRefresh = () => {
    if (activeTab === "attention") refetchAlerts();
    else if (activeTab === "sent") refetchSent();
    else if (activeTab === "tasks") refetchTodos();
  };

  const handleMarkAllRead = async () => {
    const keys = alerts.map((a) => a.alert_key || a.name).filter(Boolean);
    if (keys.length === 0) return;
    setIsActionPending(true);
    try {
      await markAlertsReadV2(keys);
      toast.success("All alerts marked as read");
      queryClient.invalidateQueries({ queryKey: ["v2_live_alerts"] });
      refetchAlerts();
    } catch (err: any) {
      toast.error("Failed to mark alerts as read", {
        description: err?.message || "An error occurred",
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDismissAlert = async (alert: V2LiveAlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = alert.alert_key || alert.name;
    if (!key) return;
    try {
      await setAlertStateV2(key, "Dismissed");
      toast.success("Alert dismissed");
      queryClient.invalidateQueries({ queryKey: ["v2_live_alerts"] });
      refetchAlerts();
    } catch (err: any) {
      toast.error("Failed to dismiss alert", {
        description: err?.message || "An error occurred",
      });
    }
  };

  const handleMarkSingleRead = async (alert: V2LiveAlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = alert.alert_key || alert.name;
    if (!key) return;
    try {
      await setAlertStateV2(key, "Read");
      toast.success("Alert marked as read");
      queryClient.invalidateQueries({ queryKey: ["v2_live_alerts"] });
      refetchAlerts();
    } catch (err: any) {
      toast.error("Failed to update alert", {
        description: err?.message || "An error occurred",
      });
    }
  };

  // Desktop pagination for Needs Attention tab (5 alerts per page to fit viewport)
  const [alertPage, setAlertPage] = React.useState(1);
  const alertsPerPage = 5;
  const totalAlertPages = Math.max(1, Math.ceil(alerts.length / alertsPerPage));
  const paginatedAlerts = React.useMemo(() => {
    const start = (alertPage - 1) * alertsPerPage;
    return alerts.slice(start, start + alertsPerPage);
  }, [alerts, alertPage]);

  // Desktop pagination for My Tasks tab (5 tasks per page to fit viewport)
  const [todoPage, setTodoPage] = React.useState(1);
  const todosPerPage = 5;
  const totalTodoPages = Math.max(1, Math.ceil(myTodos.length / todosPerPage));
  const paginatedTodos = React.useMemo(() => {
    const start = (todoPage - 1) * todosPerPage;
    return myTodos.slice(start, start + todosPerPage);
  }, [myTodos, todoPage]);

  const isCurrentRefetching =
    activeTab === "attention"
      ? isRefetchingAlerts
      : activeTab === "sent"
      ? isRefetchingSent
      : isRefetchingTodos;

  const isCurrentLoading =
    activeTab === "attention"
      ? isLoadingAlerts
      : activeTab === "sent"
      ? isLoadingSent
      : isLoadingTodos;

  // Resolve target link and icon for notification alerts
  const resolveAlertMeta = (alert: V2LiveAlertItem) => {
    const alertType = String(alert.type || alert.title || "").toLowerCase();
    if (alertType.includes("visa_deadline") || alertType.includes("visa deadline")) {
      return {
        icon: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        href: alert.url || "/workspaces?tab=embassy",
        label: "Open Visa Clearance",
      };
    }
    if (alertType.includes("replacement_owed") || alertType.includes("replacement")) {
      return {
        icon: <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        href: alert.url || "/agent/replacements",
        label: "View Replacements",
      };
    }
    if (alertType.includes("medical") || alertType.includes("unfit")) {
      return {
        icon: <HeartPulse className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        href: alert.url || "/workspaces?tab=medical",
        label: "View Medical Gate",
      };
    }
    if (alertType.includes("complaint")) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        href: alert.url || "/complaints",
        label: "View Complaint",
      };
    }
    return {
      icon: <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      href: alert.url || "/workspaces",
      label: "View Details",
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notifications & Action Center
            </h2>
            {activeTab === "attention" && unreadAlertsCount > 0 && (
              <Badge className="bg-rose-600 text-white font-mono text-xs font-bold">
                {unreadAlertsCount} Unread
              </Badge>
            )}
            {activeTab === "sent" && (
              <Badge variant="outline" className="font-mono text-xs">
                {sentTotalCount} Dispatched
              </Badge>
            )}
            {activeTab === "tasks" && (
              <Badge variant="outline" className="font-mono text-xs">
                {myTodos.length} Open
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Real-time compliance alerts, server dispatch logs, and assigned operational duties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "attention" && !isAgency && unreadAlertsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isActionPending || isCurrentRefetching}
              className="text-xs border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#141418] text-slate-700 dark:text-zinc-300 hover:text-emerald-600"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isCurrentRefetching}
            className="text-xs border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#141418] text-slate-700 dark:text-zinc-300"
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", isCurrentRefetching && "animate-spin text-emerald-600")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#222227] pb-3">
        {!isAgency && (
          <button
            type="button"
            onClick={() => setActiveTab("attention")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
              activeTab === "attention"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#22222b]"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Needs Attention</span>
            {unreadAlertsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("sent")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
            activeTab === "sent"
              ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 shadow-xs"
              : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#22222b]"
          )}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Sent to You</span>
          {sentTotalCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-mono">
              {sentTotalCount}
            </span>
          )}
        </button>

        {!isAgency && (
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
              activeTab === "tasks"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#22222b]"
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span>My Tasks</span>
            {myTodos.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-mono font-bold">
                {myTodos.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Needs Attention                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "attention" && !isAgency && (
        <div className="space-y-3">
          {isCurrentLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading real-time alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Clear</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                No active compliance warnings or attention items require immediate action.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedAlerts.map((alert, idx) => {
                const meta = resolveAlertMeta(alert);
                const displayTitle = stripRecordIds(alert.title || "Compliance Alert");
                const displayBody = stripRecordIds(alert.body || alert.description || "");

                const isUnread = !alert.read && !alert.dismissed;

                return (
                  <Card
                    key={alert.name || alert.alert_key || idx}
                    className={cn(
                      "border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 transition hover:border-slate-300 dark:hover:border-[#2c2c35]",
                      isUnread && "border-l-4 border-l-emerald-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#1a1a22] shrink-0 mt-0.5">
                          {meta.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {displayTitle}
                            </h4>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Unread alert" />
                            )}
                            {alert.applicant_name && (
                              <Badge variant="outline" className="text-[10px] font-mono py-0">
                                {alert.applicant_name}
                                {alert.passport_number ? ` (${alert.passport_number})` : ""}
                              </Badge>
                            )}
                          </div>
                          {displayBody && (
                            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {displayBody}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
                            <Clock className="h-3 w-3" />
                            <span>{alert.created_at || alert.creation || "Recent"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {meta.href && (
                          <Link
                            href={meta.href}
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition"
                          >
                            <span>{meta.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleMarkSingleRead(alert, e)}
                            title="Mark as read"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDismissAlert(alert, e)}
                          title="Dismiss alert"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Desktop Compact Pagination for Alerts */}
              {alerts.length > alertsPerPage && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1e1e24] text-xs">
                  <span className="text-slate-500 font-mono">
                    Showing {Math.min(alerts.length, (alertPage - 1) * alertsPerPage + 1)}–{Math.min(alerts.length, alertPage * alertsPerPage)} of {alerts.length} alerts
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAlertPage((p) => Math.max(1, p - 1))}
                      disabled={alertPage <= 1}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 px-1">
                      {alertPage} / {totalAlertPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAlertPage((p) => Math.min(totalAlertPages, p + 1))}
                      disabled={alertPage >= totalAlertPages}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Sent to You                                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "sent" && (
        <div className="space-y-3">
          {isCurrentLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading sent notifications...
            </div>
          ) : sentNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center">
              <Send className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Pushes Sent Yet</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                You have not received any direct push dispatches in the past 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sentNotifications.map((n, idx) => {
                const displayTitle = stripRecordIds(n.title || "Notification");
                const displayBody = stripRecordIds(n.body || "");

                return (
                  <Card
                    key={idx}
                    className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 transition hover:border-slate-300 dark:hover:border-[#2c2c35]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#1a1a22] shrink-0 mt-0.5 text-slate-600 dark:text-zinc-400">
                          <Send className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {displayTitle}
                            </h4>
                            {n.delivered ? (
                              <Badge className="text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 py-0">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                Delivered
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 py-0">
                                <Clock className="h-3 w-3 mr-1 text-amber-600" />
                                Not delivered
                              </Badge>
                            )}
                          </div>
                          {displayBody && (
                            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {displayBody}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{n.sent_at}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Pagination */}
              {sentTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#1e1e24] text-xs">
                  <span className="text-slate-500 font-mono">
                    Page {sentPage} of {sentTotalPages} ({sentTotalCount} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSentPage((p) => Math.max(1, p - 1))}
                      disabled={sentPage <= 1}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSentPage((p) => Math.min(sentTotalPages, p + 1))}
                      disabled={sentPage >= sentTotalPages}
                      className="h-8 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: My Tasks                                               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "tasks" && !isAgency && (
        <div className="space-y-3">
          {isCurrentLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
              Loading open tasks...
            </div>
          ) : myTodos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#222227] p-12 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Open Tasks</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                You are completely caught up on your assigned clearance steps and operational duties.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedTodos.map((todo) => {
                const displayDesc = stripRecordIds(todo.description || "Operational Duty");

                return (
                  <Card
                    key={todo.name}
                    className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 transition hover:border-slate-300 dark:hover:border-[#2c2c35]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                          <ListTodo className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {displayDesc}
                            </h4>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 text-blue-700 border-blue-200 dark:border-blue-800">
                              {todo.reference_type || "Clearance Step"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {todo.creation}</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/workspaces"
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 transition"
                      >
                        <span>Open Workspace</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </Card>
                );
              })}

              {/* Desktop Compact Pagination for Tasks */}
              {myTodos.length > todosPerPage && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1e1e24] text-xs">
                  <span className="text-slate-500 font-mono">
                    Showing {Math.min(myTodos.length, (todoPage - 1) * todosPerPage + 1)}–{Math.min(myTodos.length, todoPage * todosPerPage)} of {myTodos.length} tasks
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTodoPage((p) => Math.max(1, p - 1))}
                      disabled={todoPage <= 1}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 px-1">
                      {todoPage} / {totalTodoPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTodoPage((p) => Math.min(totalTodoPages, p + 1))}
                      disabled={todoPage >= totalTodoPages}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
