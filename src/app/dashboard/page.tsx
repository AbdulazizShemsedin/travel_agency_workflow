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
  Loader2,
  Search,
  UserCheck,
  PlusCircle,
  ChevronRight,
  Activity,
  Check,
} from "lucide-react";
import { getApplicantsList } from "@/lib/api/applicantApi";
import { calculateRemainingDays } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  // Calculate dynamic stats from real backend database
  const totalCount = applicants.length;
  const draftCount = applicants.filter((a) => a.applicant_state === "Draft").length;
  const registeredCount = applicants.filter((a) => a.applicant_state === "Registered").length;
  const cvCount = applicants.filter((a) => a.applicant_state === "CV Generated").length;
  const selectedCount = applicants.filter((a) => a.applicant_state === "Selected").length;
  const processingCount = applicants.filter((a) => a.applicant_state === "Processing").length;
  const stampedCount = applicants.filter((a) => a.applicant_state === "Stamped").length;
  const ticketedCount = applicants.filter((a) => a.applicant_state === "Ticketed").length;
  const departedCount = applicants.filter((a) => a.applicant_state === "Departed").length;

  // Sub-stream breakdown for parallel Processing stage
  const lmsActiveCount = applicants.filter(
    (a) => a.lms_processing?.status === "Issued" || a.applicant_state === "Processing"
  ).length;
  const wakalaActiveCount = applicants.filter(
    (a) => a.wakala_processing?.status === "Completed" || a.applicant_state === "Processing"
  ).length;
  const injazActiveCount = applicants.filter(
    (a) => a.injaz_processing?.status === "Completed" || a.applicant_state === "Processing"
  ).length;

  const inProgressCount = applicants.filter(
    (a) =>
      a.applicant_state !== "Draft" &&
      a.applicant_state !== "Departed" &&
      a.applicant_state !== "Cancelled"
  ).length;

  const completedCount = departedCount + stampedCount + ticketedCount;

  // Real compliance & expiry alerts from real records only
  const realAlerts = React.useMemo(() => {
    const list: {
      id: string;
      name: string;
      applicantName: string;
      type: "Passport" | "Medical" | "Visa";
      message: string;
      severity: "URGENT" | "WARNING";
      days: number;
    }[] = [];

    applicants.forEach((a) => {
      if (a.passport_expiry) {
        const pDays = calculateRemainingDays(a.passport_expiry);
        if (pDays !== undefined && pDays <= 30) {
          list.push({
            id: `${a.name}-passport`,
            name: a.full_name || a.name,
            applicantName: a.name,
            type: "Passport",
            message: pDays <= 0 ? "Passport Expired" : `Passport expires in ${pDays} days`,
            severity: pDays <= 7 ? "URGENT" : "WARNING",
            days: pDays,
          });
        }
      }
      if (a.medical_expiry_date) {
        const mDays = calculateRemainingDays(a.medical_expiry_date);
        if (mDays !== undefined && mDays <= 30) {
          list.push({
            id: `${a.name}-med`,
            name: a.full_name || a.name,
            applicantName: a.name,
            type: "Medical",
            message: mDays <= 0 ? "Medical Check Expired" : `Medical check expires in ${mDays} days`,
            severity: mDays <= 14 ? "URGENT" : "WARNING",
            days: mDays,
          });
        }
      }
    });

    return list.sort((a, b) => a.days - b.days);
  }, [applicants]);

  // Real operational tasks derived from database
  const operationalTasks = React.useMemo(() => {
    const tasks: {
      id: string;
      title: string;
      candidate: string;
      applicantId: string;
      type: string;
      badge: string;
    }[] = [];

    // Applicants in Selected stage need officer assignment
    applicants
      .filter((a) => a.applicant_state === "Selected")
      .forEach((a) => {
        tasks.push({
          id: `task-assign-${a.name}`,
          title: "Assign Clearance Officers",
          candidate: `${a.full_name || a.name} (Ready for staff assignment)`,
          applicantId: a.name,
          type: "Assignment",
          badge: "ASSIGN OFFICERS",
        });
      });

    // Applicants in Registered stage need CV generation
    applicants
      .filter((a) => a.applicant_state === "Registered")
      .forEach((a) => {
        tasks.push({
          id: `task-cv-${a.name}`,
          title: "Generate Bilateral CV",
          candidate: `${a.full_name || a.name} (Registered & verified)`,
          applicantId: a.name,
          type: "CV",
          badge: "GENERATE CV",
        });
      });

    // Applicants in Draft stage need completion
    applicants
      .filter((a) => a.applicant_state === "Draft")
      .forEach((a) => {
        tasks.push({
          id: `task-draft-${a.name}`,
          title: "Complete KYC & Register",
          candidate: `${a.full_name || a.name} (Draft incomplete)`,
          applicantId: a.name,
          type: "Registration",
          badge: "COMPLETE DRAFT",
        });
      });

    return tasks.slice(0, 5);
  }, [applicants]);

  // Pipeline stages with exact real counts from backend
  const pipelineStages = [
    {
      step: 1,
      title: "Data Input",
      count: draftCount,
      badge: "Draft",
      color: "border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161b] text-slate-800 dark:text-zinc-200",
      accent: "bg-slate-500",
      link: "/applicants?filter=Draft",
    },
    {
      step: 2,
      title: "CV Generated",
      count: cvCount,
      badge: "CV Ready",
      color: "border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300",
      accent: "bg-purple-600",
      link: "/applicants?filter=CV Generated",
    },
    {
      step: 3,
      title: "Selected",
      count: selectedCount,
      badge: "Selected",
      color: "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300",
      accent: "bg-blue-600",
      link: "/applicants?filter=Selected",
    },
    {
      step: 4,
      title: "Processing",
      count: processingCount,
      badge: "Parallel Streams",
      color: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200",
      accent: "bg-emerald-700",
      isParent: true,
      subBranches: [
        { name: "LMS", count: lmsActiveCount, color: "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800" },
        { name: "WAKALA", count: wakalaActiveCount, color: "text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800" },
        { name: "INJAZ", count: injazActiveCount, color: "text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800" },
      ],
      link: "/applicants?filter=Processing",
    },
    {
      step: 5,
      title: "Embassy Stamp",
      count: stampedCount,
      badge: "Visa Issued",
      color: "border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300",
      accent: "bg-teal-600",
      link: "/applicants?filter=Stamped",
    },
    {
      step: 6,
      title: "Ticket Booked",
      count: ticketedCount,
      badge: "Flight Ticket",
      color: "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300",
      accent: "bg-indigo-600",
      link: "/applicants?filter=Ticketed",
    },
    {
      step: 7,
      title: "Departed",
      count: departedCount,
      badge: "Deployed",
      color: "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300",
      accent: "bg-emerald-700",
      link: "/applicants?filter=Departed",
    },
  ];

  const filteredApplicants = applicants.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.passport_number?.toLowerCase().includes(q) ||
      a.phone_number?.includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Live applicant pipeline and operational status across all workflow stages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            <Input
              type="text"
              placeholder="Search applicants, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9.5 bg-white dark:bg-[#141418] border-slate-200 dark:border-[#26262d]"
            />
          </div>
          <Link href="/applicants/new">
            <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-xs">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Applicant
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Top Stat Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Applicants
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {totalCount.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Total in system
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              In Progress
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {inProgressCount.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span>Registered & Processing</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Completed / Cleared
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {completedCount.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Stamped, ticketed or departed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Departed
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
              <Plane className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {departedCount.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  Overseas placement complete
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Pipeline Overview Section */}
      <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#222227] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Pipeline Overview
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Live candidate counts across all active recruitment stages.
              </CardDescription>
            </div>
            <Link href="/applicants">
              <Button variant="outline" size="sm" className="text-xs border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b]">
                View All Applicants <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {pipelineStages.map((stage) => (
              <div
                key={stage.step}
                className={`relative rounded-xl border p-4 transition-all duration-200 hover:shadow-xs ${stage.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold ${stage.accent}`}>
                      {stage.step}
                    </span>
                    {stage.badge}
                  </span>
                  <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                    {stage.count}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  {stage.title}
                </h4>

                {stage.isParent && stage.subBranches ? (
                  <div className="mt-2 space-y-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase">
                      Sub-Streams:
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {stage.subBranches.map((sub) => (
                        <div
                          key={sub.name}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center ${sub.color}`}
                        >
                          <span className="text-[9px] font-black">{sub.name}</span>
                          <span className="font-mono font-bold text-xs">{sub.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-200/50 dark:border-zinc-800/60">
                    <span>Candidates</span>
                    <Link
                      href={stage.link}
                      className="text-emerald-800 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Expiry Alerts & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Expiry Alerts */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Document Expiry Warnings
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Passports and medical certificates expiring soon.
                  </CardDescription>
                </div>
              </div>
              <Link href="/applicants" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {realAlerts.length > 0 ? (
                realAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] p-3.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#1a1a22]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          alert.severity === "URGENT"
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {alert.message}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Candidate: <strong className="text-slate-800 dark:text-zinc-200">{alert.name}</strong> • ID: <span className="font-mono">{alert.applicantName}</span>
                      </p>
                    </div>
                    <Link href={`/applicants/${encodeURIComponent(alert.applicantName)}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215]"
                      >
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 rounded-lg border border-dashed border-slate-200 dark:border-[#26262d]">
                  <Check className="h-6 w-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  All candidate passports and medical checks are currently valid.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pending Operational Tasks */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Action Items & Tasks
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Applicants requiring next step action.
                  </CardDescription>
                </div>
              </div>
              <Link href="/applicants" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {operationalTasks.length > 0 ? (
                operationalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] p-3.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#1a1a22]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 font-bold text-[10px] text-emerald-900 dark:text-emerald-300">
                          {task.badge}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {task.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {task.candidate}
                      </p>
                    </div>
                    <Link href={`/applicants/${encodeURIComponent(task.applicantId)}`}>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                      >
                        Open
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 rounded-lg border border-dashed border-slate-200 dark:border-[#26262d]">
                  <Check className="h-6 w-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  No pending action items. All applicants are up to date.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Live Recent Applicants Stream */}
      <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Recent Applicants
            </CardTitle>
            <Link href="/applicants" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              View All Directory →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-[#222227]">
            {filteredApplicants.length > 0 ? (
              filteredApplicants.slice(0, 5).map((applicant) => (
                <Link
                  key={applicant.name}
                  href={`/applicants/${encodeURIComponent(applicant.name)}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-[#16161b] transition cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c1c22] font-bold text-slate-700 dark:text-zinc-300">
                      {applicant.first_name?.[0]}
                      {applicant.last_name?.[0]}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white">
                        {applicant.full_name || `${applicant.first_name} ${applicant.last_name}`}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        ID: <span className="font-mono">{applicant.name}</span> • Passport: <span className="font-mono">{applicant.passport_number || "Pending"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="default">{applicant.applicant_state}</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                No applicants registered yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
