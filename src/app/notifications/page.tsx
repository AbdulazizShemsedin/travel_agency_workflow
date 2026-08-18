"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
  Check,
  Trash2,
  RefreshCw,
  Filter,
  UserCheck,
  Plane,
  Stamp,
  HeartPulse,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotificationsList, AppNotification } from "@/lib/api/applicantApi";
import { toast } from "sonner";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "compliance" | "workflow" | "dossier"
  >("all");

  const {
    data: notifications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotificationsList,
    refetchInterval: 30000,
  });

  const handleDismiss = (id: string) => {
    const existing = JSON.parse(
      localStorage.getItem("dismissed_notifications") || "[]"
    );
    existing.push(id);
    localStorage.setItem("dismissed_notifications", JSON.stringify(existing));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Notification dismissed");
  };

  const handleDismissAll = () => {
    const ids = notifications.map((n) => n.id);
    const existing = JSON.parse(
      localStorage.getItem("dismissed_notifications") || "[]"
    );
    const updated = Array.from(new Set([...existing, ...ids]));
    localStorage.setItem("dismissed_notifications", JSON.stringify(updated));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
  };

  const handleRestoreAll = () => {
    localStorage.removeItem("dismissed_notifications");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications restored");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    return n.category === activeFilter;
  });

  const urgentCount = notifications.filter((n) => n.severity === "urgent").length;
  const complianceCount = notifications.filter((n) => n.category === "compliance").length;
  const workflowCount = notifications.filter((n) => n.category === "workflow").length;
  const dossierCount = notifications.filter((n) => n.category === "dossier").length;

  const getCategoryIcon = (category: string, severity: string) => {
    if (category === "compliance") {
      return severity === "urgent" ? (
        <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      ) : (
        <HeartPulse className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      );
    }
    if (category === "dossier") {
      return <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
    return <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
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
            <Badge variant="neutral" className="font-mono text-xs">
              {notifications.length} Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Real-time compliance alerts, expiry warnings, contractor demands, and stage progress from Frappe backend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#141418] text-slate-700 dark:text-zinc-300"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${
                isRefetching ? "animate-spin text-emerald-600" : ""
              }`}
            />
            Refresh
          </Button>

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissAll}
              className="text-xs border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#141418] text-slate-700 dark:text-zinc-300"
            >
              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Mark All Read
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestoreAll}
            className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800"
            title="Restore previously dismissed notifications"
          >
            Reset Dismissed
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              Total Alerts
            </span>
            <Bell className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white font-mono">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
              Urgent / Expired
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-400 font-mono">
            {urgentCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50/50 dark:bg-amber-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Compliance & Medical
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400 font-mono">
            {complianceCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-950/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Workflow Actions
            </span>
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            {workflowCount}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 dark:border-[#222227] pb-3">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === "all"
              ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900"
              : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter("compliance")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === "compliance"
              ? "bg-rose-900 text-white dark:bg-rose-700"
              : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
          }`}
        >
          Compliance & Expiry ({complianceCount})
        </button>
        <button
          onClick={() => setActiveFilter("workflow")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === "workflow"
              ? "bg-emerald-900 text-white dark:bg-emerald-700"
              : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
          }`}
        >
          Workflow & Clearances ({workflowCount})
        </button>
        <button
          onClick={() => setActiveFilter("dossier")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === "dossier"
              ? "bg-purple-900 text-white dark:bg-purple-700"
              : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
          }`}
        >
          Contractor Demands ({dossierCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading live operational alerts from Frappe...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardContent className="py-12 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              All Clear! No Pending Alerts
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              There are no pending compliance alerts or unhandled actions in this category. All candidate stages are currently on track.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredNotifications.map((n) => {
            const isUrgent = n.severity === "urgent";
            const isWarn = n.severity === "warning";

            return (
              <Card
                key={n.id}
                className={`border-l-4 transition hover:shadow-md bg-white dark:bg-[#121215] ${
                  isUrgent
                    ? "border-l-rose-600 border-slate-200/80 dark:border-[#222227]"
                    : isWarn
                    ? "border-l-amber-500 border-slate-200/80 dark:border-[#222227]"
                    : "border-l-emerald-600 border-slate-200/80 dark:border-[#222227]"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(n.category, n.severity)}
                      <Badge
                        variant={
                          isUrgent
                            ? "destructive"
                            : isWarn
                            ? "warning"
                            : "success"
                        }
                        className="text-[10px] uppercase tracking-wider font-bold"
                      >
                        {n.severity} • {n.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                        {n.timestamp}
                      </span>
                      <button
                        onClick={() => handleDismiss(n.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition p-0.5"
                        title="Dismiss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                    {n.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {n.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    {n.applicant_name && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                        Candidate: <strong className="text-slate-700 dark:text-zinc-200">{n.applicant_name}</strong>
                      </span>
                    )}

                    <Link href={n.action_url} className="ml-auto">
                      <Button
                        size="sm"
                        className={`text-xs font-semibold ${
                          isUrgent
                            ? "bg-rose-700 hover:bg-rose-800 text-white"
                            : isWarn
                            ? "bg-amber-800 hover:bg-amber-900 text-white"
                            : "bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {n.action_label} <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
