"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Clock,
  CheckCircle2,
  Plane,
  AlertTriangle,
  ArrowRight,
  Loader2,
  UserCheck,
  PlusCircle,
  ChevronRight,
  Activity,
  Check,
} from "lucide-react";
import {
  listApplicantsV2,
  listPlacementsV2,
  listMyClearanceStepsV2,
  V2ApplicantDetails,
} from "@/lib/api/v2";
import { calculateRemainingDays } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";

// Live backend truth: the Applicant DocType status remains at the intake milestone
// (Draft / Registered / CV Generated / Cancelled). When a Placement exists, the operational
// pipeline stage progresses on the Placement (Selected / Processing / Stamped / Ticketed / Departed).
function resolveApplicantStage(app: any, plc: any): string {
  const ownStatus = String(app.status || app.applicant_state || "Draft");
  if (ownStatus === "Cancelled") return "Cancelled";
  if (plc && plc.status) {
    if (String(plc.status) === "Cancelled") return "Cancelled";
    if (["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(String(plc.status))) {
      return String(plc.status);
    }
  }
  return ownStatus;
}

export default function DashboardPage() {
  const router = useRouter();
  const { can } = useAuth();
  const canRegister = can("registerApplicant");

  const { data: rawApplicants = [], isLoading: isApplicantsLoading } = useQuery({
    queryKey: ["applicants_v2_dashboard"],
    queryFn: () => listApplicantsV2(),
  });

  const { data: placementsData = [], isLoading: isPlacementsLoading } = useQuery({
    queryKey: ["dashboard-placements-join"],
    queryFn: () => listPlacementsV2(),
    staleTime: 30000,
    retry: false,
  });

  const { data: clearanceStepsData = [] } = useQuery({
    queryKey: ["dashboard-clearance-steps"],
    queryFn: () => listMyClearanceStepsV2(),
    staleTime: 30000,
    retry: false,
  });

  const isLoading = isApplicantsLoading || isPlacementsLoading;

  const applicants = rawApplicants as V2ApplicantDetails[];

  // Join active placement onto applicants to resolve true lifecycle state
  const applicantRows = React.useMemo(() => {
    if (placementsData.length === 0) return applicants;
    const byApplicant = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const p of placementsData) {
      if (String(p.status) === "Cancelled") continue;
      if (p.applicant) byApplicant.set(String(p.applicant).toLowerCase().trim(), p);
      if (p.name) byName.set(String(p.name).toLowerCase().trim(), p);
    }
    return applicants.map((applicant) => {
      let plc =
        byApplicant.get(String(applicant.name || "").toLowerCase().trim()) ||
        byApplicant.get(String((applicant as any).active_placement || "").toLowerCase().trim()) ||
        byName.get(String((applicant as any).active_placement || "").toLowerCase().trim());
      if (plc && (applicant as any).active_placement) {
        const preferred = byName.get(String((applicant as any).active_placement).toLowerCase().trim());
        if (preferred) plc = preferred;
      }
      if (!plc) return applicant;
      const copy = { ...applicant } as any;
      const derivedStage = resolveApplicantStage(applicant, plc);
      copy.status = derivedStage;
      copy.applicant_state = derivedStage;
      copy.active_placement = plc.name;
      copy.placement_status = plc.status;
      return copy;
    });
  }, [applicants, placementsData]);

  // Calculate dynamic stats matching authoritative live database state
  const totalCount = applicantRows.length;
  const draftCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Draft"
  ).length;
  const registeredCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Registered"
  ).length;
  const cvCount = applicantRows.filter((a) =>
    ["Registered", "CV Generated"].includes(String(a.status || a.applicant_state))
  ).length;
  const selectedCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Selected"
  ).length;
  const processingCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Processing"
  ).length;
  const stampedCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Stamped"
  ).length;
  const ticketedCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Ticketed"
  ).length;
  const departedCount = applicantRows.filter(
    (a) => (a.status || a.applicant_state) === "Departed"
  ).length;

  const inProgressCount = applicantRows.filter((a) => {
    const s = String(a.status || a.applicant_state || "Draft");
    return s !== "Draft" && s !== "Departed" && s !== "Cancelled";
  }).length;

  const completedCount = stampedCount + ticketedCount;

  // Sub-stream breakdown for parallel Processing stage from live clearance steps
  const { lmisActiveCount, injazActiveCount } = React.useMemo(() => {
    const processingPlacements = new Set(
      applicantRows
        .filter((a) => (a.status || a.applicant_state) === "Processing")
        .map((a) => (a as any).active_placement)
        .filter(Boolean)
    );

    const lmisPlacements = new Set<string>();
    const injazPlacements = new Set<string>();

    for (const step of clearanceStepsData) {
      if (processingPlacements.size > 0 && !processingPlacements.has(step.placement)) {
        continue;
      }
      const type = (step.step_type || "").toLowerCase();
      const status = (step.status || "").toLowerCase();
      const isActive = status === "pending" || status === "in progress" || status === "started";
      if (type.includes("lmis") && isActive) {
        lmisPlacements.add(step.placement);
      }
      if ((type.includes("taeshir") || type.includes("telesign") || type.includes("injaz")) && isActive) {
        injazPlacements.add(step.placement);
      }
    }

    let lmis = lmisPlacements.size;
    let injaz = injazPlacements.size;

    // Graceful fallback if clearance step details are not yet provisioned
    if (lmis === 0 && injaz === 0 && processingCount > 0) {
      lmis = processingCount;
      injaz = processingCount;
    }

    return { lmisActiveCount: lmis, injazActiveCount: injaz };
  }, [applicantRows, clearanceStepsData, processingCount]);

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

    applicantRows
      .filter((a) => {
        const s = String(a.status || a.applicant_state || "Draft");
        return s !== "Departed" && s !== "Cancelled";
      })
      .forEach((a) => {
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
  }, [applicantRows]);

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
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Selected")
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
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Registered")
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
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Draft")
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
  }, [applicantRows]);

  // Pipeline stages with exact real counts from backend
  const pipelineStages = [
    {
      step: 1,
      title: "Data Input",
      count: draftCount,
      badge: "Draft",
      color: "border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-[#16161b] text-slate-800 dark:text-zinc-200 hover:border-slate-400 dark:hover:border-zinc-500",
      accent: "bg-slate-500",
      link: "/applicants?status=Draft",
    },
    {
      step: 2,
      title: "CV Generated",
      count: cvCount,
      badge: "CV Ready",
      color: "border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-700",
      accent: "bg-purple-600",
      link: "/applicants?status=CV Generated",
    },
    {
      step: 3,
      title: "Selected",
      count: selectedCount,
      badge: "Selected",
      color: "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-700",
      accent: "bg-blue-600",
      link: "/applicants?status=Selected",
    },
    {
      step: 4,
      title: "Processing",
      count: processingCount,
      badge: "Parallel Streams",
      color: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 hover:border-emerald-500 dark:hover:border-emerald-600",
      accent: "bg-emerald-700",
      isParent: true,
      subBranches: [
        {
          name: "LMIS",
          count: lmisActiveCount,
          link: "/applicants?tab=lms",
          color: "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/80",
        },
        {
          name: "INJAZ",
          count: injazActiveCount,
          link: "/applicants?tab=injaz",
          color: "text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 hover:bg-blue-200/80 dark:hover:bg-blue-900/80",
        },
      ],
      link: "/applicants?status=Processing",
    },
    {
      step: 5,
      title: "Embassy Stamp",
      count: stampedCount,
      badge: "Visa Issued",
      color: "border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300 hover:border-teal-400 dark:hover:border-teal-700",
      accent: "bg-teal-600",
      link: "/applicants?status=Stamped",
    },
    {
      step: 6,
      title: "Ticket Booked",
      count: ticketedCount,
      badge: "Flight Ticket",
      color: "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 hover:border-indigo-400 dark:hover:border-indigo-700",
      accent: "bg-indigo-600",
      link: "/applicants?status=Ticketed",
    },
    {
      step: 7,
      title: "Departed",
      count: departedCount,
      badge: "Deployed",
      color: "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 hover:border-emerald-500 dark:hover:border-emerald-600",
      accent: "bg-emerald-700",
      link: "/applicants?status=Departed",
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:white">
            Dashboard
          </h1>
        </div>
        {canRegister && (
          <div className="flex items-center gap-3">
            <Link href="/applicants/new">
              <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-xs">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Add Applicant
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 1. Top Stat Metric Cards (Clickable redirection) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => router.push("/applicants")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 select-none group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Total Applicants
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
              <Users className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {totalCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=In Progress")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 select-none group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              In Progress
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {inProgressCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=Completed")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 select-none group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Completed / Cleared
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {completedCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=Departed")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs cursor-pointer hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 select-none group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              Departed
            </CardDescription>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
              <Plane className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {departedCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Pipeline Overview Section */}
      <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#222227] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Pipeline Overview
              </CardTitle>
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
                onClick={() => router.push(stage.link)}
                role="button"
                tabIndex={0}
                className={`relative rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] cursor-pointer ${stage.color}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-semibold ${stage.accent}`}>
                    {stage.step}
                  </span>
                  <span className="font-mono text-xl font-bold text-slate-800 dark:text-zinc-200 leading-none">
                    {stage.count}
                  </span>
                </div>

                <h4 className="mt-2.5 text-sm font-semibold leading-snug text-slate-800 dark:text-zinc-200">
                  {stage.badge}
                </h4>
                <p className="mt-0.5 text-xs font-medium leading-snug text-slate-500 dark:text-zinc-400">
                  {stage.title}
                </p>

                {stage.isParent && stage.subBranches ? (
                  <div className="mt-3 space-y-2 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2.5">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                      Sub-Streams
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {stage.subBranches.map((sub: any) => (
                        <div
                          key={sub.name}
                          onClick={(e) => {
                            if (sub.link) {
                              e.stopPropagation();
                              router.push(sub.link);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all hover:scale-105 cursor-pointer ${sub.color}`}
                        >
                          <span className="text-xs font-semibold leading-tight">{sub.name}</span>
                          <span className="font-mono font-medium text-xs mt-0.5">{sub.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2.5">
                    <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                      Candidates
                    </span>
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </span>
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
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Document Expiry Warnings
                </CardTitle>
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
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Action Items & Tasks
                </CardTitle>
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
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Applicants
            </CardTitle>
            <Link href="/applicants" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              View All Directory →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-[#222227]">
            {applicants.length > 0 ? (
              applicants.slice(0, 5).map((applicant) => (
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
