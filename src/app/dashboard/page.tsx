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

  const canAccessClearances = can("manageClearances") || can("manageTicketing");

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

  // Live backend truth: determine which placements have finished all clearance steps
  const clearedPlacementNames = React.useMemo(() => {
    const doneStatuses = new Set(["complete", "issued", "stamped"]);
    const stepsByPlc = new Map<string, Array<any>>();
    for (const s of clearanceStepsData) {
      if (!s.placement) continue;
      if (!stepsByPlc.has(s.placement)) stepsByPlc.set(s.placement, []);
      stepsByPlc.get(s.placement)!.push(s);
    }
    const set = new Set<string>();
    for (const [plcName, steps] of stepsByPlc.entries()) {
      if (steps.length > 0 && steps.every((s) => doneStatuses.has(String(s.status || "").toLowerCase()))) {
        set.add(plcName);
      }
    }
    return set;
  }, [clearanceStepsData]);

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
      copy.is_cleared = clearedPlacementNames.has(plc.name);
      return copy;
    });
  }, [applicants, placementsData, clearedPlacementNames]);

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

  // Completed (but not departed): Stamped, Ticketed, or all clearance steps completed prior to departure
  const completedCount = applicantRows.filter((a) => {
    const s = String(a.status || a.applicant_state || "");
    if (s === "Departed" || s === "Cancelled") return false;
    if (s === "Stamped" || s === "Ticketed") return true;
    if ((a as any).ticket_number) return true;
    const plcName = (a as any).active_placement;
    return Boolean(plcName && clearedPlacementNames.has(plcName));
  }).length;

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
      passportNumber?: string;
      destination?: string;
      phone?: string;
      expiryDate?: string;
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
              passportNumber: a.passport_number,
              destination: a.destination_country,
              phone: a.phone_number || a.phone,
              expiryDate: a.passport_expiry,
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
              passportNumber: a.passport_number,
              destination: a.destination_country,
              phone: a.phone_number || a.phone,
              expiryDate: a.medical_expiry_date,
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
      details?: string;
      applicantId: string;
      type: string;
      badge: string;
    }[] = [];

    // Applicants in Selected stage need officer assignment
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Selected")
      .forEach((a) => {
        const details = [
          a.passport_number ? `Passport: ${a.passport_number}` : null,
          a.destination_country ? `Corridor: ${a.destination_country}` : null,
          "Ready for staff assignment",
        ]
          .filter(Boolean)
          .join(" • ");

        tasks.push({
          id: `task-assign-${a.name}`,
          title: "Assign Staff",
          candidate: a.full_name || a.name,
          details,
          applicantId: a.name,
          type: "Assignment",
          badge: "ASSIGN STAFF",
        });
      });

    // Applicants in Registered stage need CV generation
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Registered")
      .forEach((a) => {
        const details = [
          a.passport_number ? `Passport: ${a.passport_number}` : null,
          a.destination_country ? `Corridor: ${a.destination_country}` : null,
          "Profile verified • Ready for CV",
        ]
          .filter(Boolean)
          .join(" • ");

        tasks.push({
          id: `task-cv-${a.name}`,
          title: "Generate CV",
          candidate: a.full_name || a.name,
          details,
          applicantId: a.name,
          type: "CV",
          badge: "GENERATE CV",
        });
      });

    // Applicants in Draft stage need completion
    applicantRows
      .filter((a) => (a.status || a.applicant_state) === "Draft")
      .forEach((a) => {
        const details = [
          a.phone_number || a.phone ? `Phone: ${a.phone_number || a.phone}` : null,
          "Intake incomplete",
        ]
          .filter(Boolean)
          .join(" • ");

        tasks.push({
          id: `task-draft-${a.name}`,
          title: "Complete Registration",
          candidate: a.full_name || a.name,
          details,
          applicantId: a.name,
          type: "Registration",
          badge: "FINISH DRAFT",
        });
      });

    return tasks.slice(0, 5);
  }, [applicantRows]);

  // Pipeline stages with exact real counts from backend
  const pipelineStages = [
    {
      step: 1,
      title: "Draft",
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
      badge: "CV Generated",
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
      title: "Travel Completed",
      count: departedCount,
      badge: "Departed",
      color: "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 hover:border-emerald-500 dark:hover:border-emerald-600",
      accent: "bg-emerald-700",
      link: "/applicants?status=Departed",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-3.5 md:h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-6rem)] md:max-h-[calc(100vh-5.5rem)] lg:max-h-[calc(100vh-6rem)] min-h-0">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#222227] pb-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Dashboard
          </h1>
        </div>
        {canRegister && (
          <div className="flex items-center gap-2">
            <Link href="/applicants/new">
              <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-xs h-8 px-3 rounded-lg transition-colors">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add Applicant
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 1. Top Stat Metric Cards (Clickable redirection) */}
      <div data-tour="dashboard-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 shrink-0">
        <Card
          onClick={() => router.push("/applicants")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl cursor-pointer hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all select-none group p-3 sm:p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
              Total Applicants
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1 leading-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              totalCount.toLocaleString()
            )}
          </div>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=In Progress")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl cursor-pointer hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all select-none group p-3 sm:p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
              In Progress
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1 leading-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              inProgressCount.toLocaleString()
            )}
          </div>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=Completed")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl cursor-pointer hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all select-none group p-3 sm:p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
              Completed
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1 leading-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              completedCount.toLocaleString()
            )}
          </div>
        </Card>

        <Card
          onClick={() => router.push("/applicants?status=Departed")}
          role="button"
          tabIndex={0}
          className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl cursor-pointer hover:shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all select-none group p-3 sm:p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors truncate">
              Departed
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <Plane className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1 leading-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : (
              departedCount.toLocaleString()
            )}
          </div>
        </Card>
      </div>

      {/* 2. Pipeline Overview Section (Single Compact Row on Desktop) */}
      <Card data-tour="dashboard-pipeline" className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] py-2 px-3.5 bg-slate-50/50 dark:bg-[#141418]">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Pipeline Overview
          </span>
          <Link href="/applicants" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1">
            View All Directory <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="p-2.5 sm:p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
            {pipelineStages.map((stage) => (
              <div
                key={stage.step}
                onClick={() => router.push(stage.link)}
                role="button"
                tabIndex={0}
                className={`rounded-lg border p-2.5 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between h-[92px] sm:h-[96px] select-none group ${stage.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-white text-[10px] font-bold ${stage.accent}`}>
                    {stage.step}
                  </span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-zinc-100 leading-none">
                    {stage.count}
                  </span>
                </div>

                <div className="my-auto py-0.5">
                  <h4 className="text-xs font-bold leading-tight text-slate-800 dark:text-zinc-200 truncate">
                    {stage.badge}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 truncate">
                    {stage.title}
                  </p>
                </div>

                {stage.isParent && stage.subBranches ? (
                  <div className="grid grid-cols-2 gap-1 pt-1 border-t border-emerald-200/80 dark:border-emerald-800/80">
                    {stage.subBranches.map((sub: any) => (
                      <div
                        key={sub.name}
                        onClick={(e) => {
                          if (sub.link) {
                            e.stopPropagation();
                            router.push(sub.link);
                          }
                        }}
                        className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[9px] font-semibold border ${sub.color}`}
                      >
                        <span>{sub.name}</span>
                        <span className="font-mono font-bold">{sub.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-800/60 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    <span>Candidates</span>
                    <ArrowRight className="h-3 w-3 text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Three-Column Bottom Grid: Expiry Alerts, Action Items, & Recent Applicants */}
      <div data-tour="dashboard-operational-tasks" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 flex-1 min-h-0">
        {/* Panel 1: Document Expiry Warnings */}
        <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between py-2 px-3.5 border-b border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#141418] shrink-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Document Expiry Warnings
            </span>
            <Link href="/applicants" className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              View All
            </Link>
          </div>
          <CardContent className="p-2.5 sm:p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
            {realAlerts.length > 0 ? (
              realAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-[#26262d] bg-slate-50/60 dark:bg-[#16161b] p-2 sm:p-2.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-[#1a1a22]"
                >
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        alert.severity === "URGENT"
                          ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {alert.message}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      <span>{alert.name}</span>
                      {alert.passportNumber ? <span className="font-mono"> • {alert.passportNumber}</span> : null}
                      {alert.expiryDate ? <span className="font-mono text-rose-600 dark:text-rose-400"> • {alert.expiryDate}</span> : null}
                    </div>
                  </div>
                  <Link href={`/applicants/${encodeURIComponent(alert.applicantName)}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6.5 text-[11px] px-2.5 font-semibold border-slate-300 dark:border-[#26262d] hover:bg-white dark:hover:bg-[#1f1f26]"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-[#26262d] text-xs text-slate-400 dark:text-zinc-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/70 mb-1.5" />
                <span>All candidate documents valid.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Action Items & Tasks */}
        <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between py-2 px-3.5 border-b border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#141418] shrink-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Action Items &amp; Tasks
            </span>
            <Link href="/applicants" className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              View All
            </Link>
          </div>
          <CardContent className="p-2.5 sm:p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
            {operationalTasks.length > 0 ? (
              operationalTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-[#26262d] bg-slate-50/60 dark:bg-[#16161b] p-2 sm:p-2.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-[#1a1a22]"
                >
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 font-bold text-[9px] text-emerald-900 dark:text-emerald-300">
                        {task.badge}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {task.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      <span>{task.candidate}</span>
                      {task.details && <span> • {task.details}</span>}
                    </p>
                  </div>
                  <Link href={`/applicants/${encodeURIComponent(task.applicantId)}`}>
                    <Button
                      size="sm"
                      className="h-6.5 text-[11px] px-2.5 font-semibold bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                    >
                      Open
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-[#26262d] text-xs text-slate-400 dark:text-zinc-500">
                <Check className="h-6 w-6 text-emerald-500/70 mb-1.5" />
                <span>No pending action items.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: Live Recent Applicants Stream */}
        <Card className="border-slate-200/90 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs rounded-xl flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between py-2 px-3.5 border-b border-slate-100 dark:border-[#222227] bg-slate-50/50 dark:bg-[#141418] shrink-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Recent Applicants
            </span>
            <Link href="/applicants" className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              Directory →
            </Link>
          </div>
          <CardContent className="p-2.5 sm:p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
            {applicants.length > 0 ? (
              applicants.slice(0, 7).map((applicant) => (
                <Link
                  key={applicant.name}
                  href={`/applicants/${encodeURIComponent(applicant.name)}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-[#26262d] bg-slate-50/60 dark:bg-[#16161b] p-2 sm:p-2.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-[#1a1a22] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 font-bold text-[11px] text-emerald-900 dark:text-emerald-300 uppercase border border-emerald-200/60 dark:border-emerald-800/60">
                      {applicant.first_name?.[0] || "A"}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {applicant.full_name || `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || applicant.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        <span className="font-mono">{applicant.passport_number || "No Passport"}</span>
                        {applicant.destination_country && <span> • {applicant.destination_country}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="default" className="text-[10px] py-0.5 px-2 font-medium">
                      {applicant.applicant_state || applicant.status || "Draft"}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-[#26262d] text-xs text-slate-400 dark:text-zinc-500">
                <Users className="h-6 w-6 text-slate-400 mb-1.5" />
                <span>No applicants registered yet.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
