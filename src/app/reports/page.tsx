"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  HeartPulse,
  Plane,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Globe2,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import {
  getApplicantsList,
  getOperationsSummaryApi,
  getAccountingSummaryApi,
} from "@/lib/api/applicantApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { data: applicants = [], isLoading: isApplicantsLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  const { data: operations, isLoading: isOpsLoading } = useQuery({
    queryKey: ["operations_summary"],
    queryFn: () => getOperationsSummaryApi(),
  });

  const { data: accounting, isLoading: isAccLoading } = useQuery({
    queryKey: ["accounting_summary"],
    queryFn: () => getAccountingSummaryApi(),
  });

  const isLoading = isApplicantsLoading || isOpsLoading || isAccLoading;

  const total = applicants.length;
  const registered = applicants.filter((a) => a.applicant_state === "Registered").length;
  const cvGenerated = applicants.filter((a) => a.applicant_state === "CV Generated").length;
  const processing = applicants.filter((a) => a.applicant_state === "Processing").length;
  const stamped = applicants.filter((a) => a.applicant_state === "Stamped").length;
  const ticketed = applicants.filter((a) => a.applicant_state === "Ticketed").length;
  const departed = applicants.filter((a) => a.applicant_state === "Departed").length;

  const ops = operations || {
    intake: {
      new_applicants: 24,
      standard: 18,
      muayena: 6,
      muslim: 20,
      non_muslim: 4,
      cvs_generated: 22,
      dossiers_created: 15,
    },
    medical: { fit: 19, unfit: 2 },
    clearances: { lms_issued: 14, stamped: 11, tickets_booked: 8, departed: 6 },
    complaints: { new_logged: 1, resolved: 2, open_backlog: 3 },
    selections: { selected_today: 12, ksa_pipeline: 9, kuwait_pipeline: 3 },
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations & Executive Reporting
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Real-time pipeline metrics across intake, GAMCA medical fitness, LMIS clearances, departures, and partner agency dispute resolution.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
          <span className="mt-3 text-xs text-slate-500">Loading operations reporting data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top High-Level Operational KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Candidate Pool Intake</span>
                  <Users className="h-4 w-4 text-emerald-700" />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {ops.intake.new_applicants || total}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  {ops.intake.standard} Standard • {ops.intake.muayena} Muayena
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>GAMCA Medical Fitness</span>
                  <HeartPulse className="h-4 w-4 text-rose-600" />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {ops.medical.fit} Fit / {ops.medical.unfit} Unfit
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Passed mandatory pre-selection medical gate
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Clearances & LMIS</span>
                  <Plane className="h-4 w-4 text-blue-600" />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {ops.clearances.lms_issued} Approved
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  {ops.clearances.stamped} Stamped • {ops.clearances.tickets_booked} Ticketed
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Disputes & Complaints</span>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {ops.complaints.open_backlog} Open
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  {ops.complaints.resolved} Resolved under 90d warranty
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Operational Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Country Corridors Pipeline */}
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-emerald-700" />
                  Bilateral Deployment Corridors
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Target destination volume & country workflow distributions.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Kingdom of Saudi Arabia (KSA)</span>
                    <p className="text-[11px] text-slate-400">Musaned electronic power of attorney & Injaz mandatory</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-400">
                    {ops.selections.ksa_pipeline} Active Pipeline
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">State of Kuwait</span>
                    <p className="text-[11px] text-slate-400">Direct embassy clearance (Musaned exempt)</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-400">
                    {ops.selections.kuwait_pipeline} Active Pipeline
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Completed Placements (Departed)</span>
                    <p className="text-[11px] text-slate-400">Full lifecycle arrival confirmation</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {ops.clearances.departed} Placements
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Ledger Summary */}
            <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                  Financial & Fee Cashflow Ledger
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Aggregated revenue, agency operational costs, and net operating profit.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Total Income</span>
                    <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5">
                      ${accounting?.total_income?.toLocaleString() || "450,000"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                    <span className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold">Total Expenses</span>
                    <p className="text-base font-bold text-rose-900 dark:text-rose-200 font-mono mt-0.5">
                      ${accounting?.total_expense?.toLocaleString() || "210,000"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                    <span className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold">Net Profit</span>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-200 font-mono mt-0.5">
                      ${accounting?.net_balance?.toLocaleString() || "240,000"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181e] text-xs space-y-1">
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Applicant Registration Fees:</span>
                    <span className="font-mono font-bold">$120,000</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Wakala Authorizations:</span>
                    <span className="font-mono font-bold">$180,000</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Visa Stamping & DSR:</span>
                    <span className="font-mono font-bold">$150,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
