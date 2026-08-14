"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Clock,
  CheckCircle2,
  Plane,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getApplicantsList } from "@/lib/api/applicantApi";
import { calculateRemainingDays, getExpiryBadgeStatus } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  // Dynamic real stats calculated from actual inputs/records
  const totalCount = applicants.length;
  const draftCount = applicants.filter((a) => a.applicant_state === "Draft").length;
  const registeredCount = applicants.filter((a) => a.applicant_state === "Registered").length;
  const cvCount = applicants.filter((a) => a.applicant_state === "CV Generated").length;
  const requestPendingCount = applicants.filter((a) => a.applicant_state === "Request Pending").length;
  const selectedCount = applicants.filter((a) => a.applicant_state === "Selected").length;
  const processingCount = applicants.filter((a) => a.applicant_state === "Processing").length;
  const embassyCount = applicants.filter((a) => a.applicant_state === "Embassy/Stamped").length;
  const departedCount = applicants.filter((a) => a.applicant_state === "Departed").length;

  const inProgressCount =
    registeredCount +
    cvCount +
    requestPendingCount +
    selectedCount +
    processingCount +
    embassyCount;

  // Compute urgent alerts from real applicant data
  const realAlerts = React.useMemo(() => {
    const list: {
      id: string;
      name: string;
      applicantName: string;
      type: "Passport" | "Medical" | "COC";
      days: number;
      badge: ReturnType<typeof getExpiryBadgeStatus>;
    }[] = [];

    applicants.forEach((a) => {
      if (a.passport_expiry) {
        const pDays = calculateRemainingDays(a.passport_expiry);
        if (pDays !== undefined && pDays <= 30) {
          list.push({
            id: a.name,
            name: a.full_name,
            applicantName: a.name,
            type: "Passport",
            days: pDays,
            badge: getExpiryBadgeStatus(pDays),
          });
        }
      }
      if (a.medical_expiry_date) {
        const mDays = calculateRemainingDays(a.medical_expiry_date);
        if (mDays !== undefined && mDays <= 30) {
          list.push({
            id: a.name,
            name: a.full_name,
            applicantName: a.name,
            type: "Medical",
            days: mDays,
            badge: getExpiryBadgeStatus(mDays),
          });
        }
      }
    });

    return list.sort((a, b) => a.days - b.days);
  }, [applicants]);

  // Stage segment colors for the Colorful Progress Bar
  const stageSegments = [
    { label: "Draft", count: draftCount, color: "bg-slate-400 dark:bg-slate-600", dot: "bg-slate-400" },
    { label: "Registered", count: registeredCount, color: "bg-emerald-600", dot: "bg-emerald-600" },
    { label: "CV Generated", count: cvCount, color: "bg-purple-600", dot: "bg-purple-600" },
    { label: "Request Pending", count: requestPendingCount, color: "bg-amber-500", dot: "bg-amber-500" },
    { label: "Selected", count: selectedCount, color: "bg-blue-600", dot: "bg-blue-600" },
    { label: "Processing", count: processingCount, color: "bg-indigo-600", dot: "bg-indigo-600" },
    { label: "Embassy/Stamped", count: embassyCount, color: "bg-teal-600", dot: "bg-teal-600" },
    { label: "Departed", count: departedCount, color: "bg-emerald-800 dark:bg-emerald-500", dot: "bg-emerald-800" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time pipeline overview, operational alerts, and dynamic deployment metrics.
          </p>
        </div>
        <Link href="/applicants/new">
          <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
            + Add Applicant
          </Button>
        </Link>
      </div>

      {/* Top Real Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Applicants
            </CardDescription>
            <Users className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
                <p className="mt-1 flex items-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <TrendingUp className="mr-1 h-3.5 w-3.5" /> Registered in system
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active In Progress
            </CardDescription>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{inProgressCount}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">LMS / Injaz / Wakala pipelines</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selected / Assigned
            </CardDescription>
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCount + processingCount}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Selected & allocated</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Successfully Departed
            </CardDescription>
            <Plane className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{departedCount}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deployed abroad</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Expiry Alerts & Colorful Pipeline Progress Bar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Real Expiry Alerts */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Real Compliance & Expiry Alerts ({realAlerts.length})
                </CardTitle>
              </div>
              <Link href="/applicants">
                <Button variant="ghost" size="sm" className="text-xs text-slate-600 dark:text-slate-300">
                  View All Candidates
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {realAlerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No urgent expiry alerts. All registered candidates are within validity periods.
                </div>
              ) : (
                realAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={`${alert.id}-${alert.type}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.badge.variant}>
                          {alert.type.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {alert.type} {alert.days <= 0 ? "Expired" : `Expires in ${alert.days} days`}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        {alert.name} • Applicant ID: <span className="font-mono">{alert.applicantName}</span>
                      </p>
                    </div>
                    <Link href={`/applicants/${encodeURIComponent(alert.applicantName)}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-white dark:bg-slate-800">
                        Resolve
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Colorful Pipeline Progress Bar as requested */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Pipeline Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Visual workflow distribution across all active lifecycle stages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              {/* Colorful Multi-Segment Progress Bar */}
              <div className="space-y-2">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                  {totalCount > 0 ? (
                    stageSegments.map((segment) => {
                      if (segment.count === 0) return null;
                      const percentage = (segment.count / totalCount) * 100;
                      return (
                        <div
                          key={segment.label}
                          style={{ width: `${percentage}%` }}
                          className={`${segment.color} h-full first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                          title={`${segment.label}: ${segment.count} (${percentage.toFixed(1)}%)`}
                        />
                      );
                    })
                  ) : (
                    <div className="h-full w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
                  )}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
                  <span>Start (Draft)</span>
                  <span>{totalCount} Total Candidates</span>
                  <span>Departure</span>
                </div>
              </div>

              {/* Colorful Legend with Exact Numbers from inputs */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {stageSegments.map((segment) => (
                  <div
                    key={segment.label}
                    className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${segment.dot}`} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {segment.label}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {segment.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
