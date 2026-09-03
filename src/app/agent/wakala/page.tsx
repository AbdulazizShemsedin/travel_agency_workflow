"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  RefreshCw,
  Search,
  Users,
  Clock,
  Globe2,
  Briefcase,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  BellRing,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Lock,
  User,
} from "lucide-react";
import {
  listMyWakalaRequestsV2,
  V2WakalaRequestItem,
} from "@/lib/api/v2/portal";
import { triggerWakalaReminderV2 } from "@/lib/api/v2/notifications";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function AgentWakalaRequestsPage() {
  const queryClient = useQueryClient();
  const { authUser, agencyContext, roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];

  const defaultContractor = agencyContext?.contractor?.name || authUser?.contractor || "";
  const [activeContractor, setActiveContractor] = React.useState(defaultContractor);

  React.useEffect(() => {
    if (defaultContractor && !activeContractor) {
      setActiveContractor(defaultContractor);
    }
  }, [defaultContractor, activeContractor]);

  const effectiveContractor = agencyContext?.contractor?.name || authUser?.contractor || activeContractor;
  const isForeignAgency = userRoles.some((r) => r.toLowerCase().includes("foreign agency") || r.toLowerCase().includes("agent"));
  const isInternalStaff = userRoles.some((r) => ["Administrator", "System Manager", "Manager", "Admin"].includes(r));

  const [searchTerm, setSearchTerm] = React.useState("");
  const [remindingStepName, setRemindingStepName] = React.useState<string | null>(null);

  // 1. Fetch Real Unpaid Wakala Requests from V2 Portal API
  const {
    data: wakalaRequests = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<V2WakalaRequestItem[]>({
    queryKey: ["agency-wakala-requests", effectiveContractor],
    queryFn: () => listMyWakalaRequestsV2(),
    staleTime: 15000,
  });

  // Filter requests client-side by keyword
  const filteredRequests = React.useMemo(() => {
    return (wakalaRequests || []).filter((req) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (req.clearance_step_name && req.clearance_step_name.toLowerCase().includes(q)) ||
        (req.full_name && req.full_name.toLowerCase().includes(q)) ||
        (req.applicant_name && req.applicant_name.toLowerCase().includes(q)) ||
        (req.passport_number && req.passport_number.toLowerCase().includes(q)) ||
        (req.placement_name && req.placement_name.toLowerCase().includes(q))
      );
    });
  }, [wakalaRequests, searchTerm]);

  // Mutation: Trigger Wakala Reminder
  const reminderMutation = useMutation({
    mutationFn: (clearanceStepName: string) => triggerWakalaReminderV2(clearanceStepName),
    onSuccess: (data, stepName) => {
      toast.success("Wakala Reminder Dispatched", {
        description: data?.message || `Wakala payment reminder sent for step ${stepName}.`,
      });
      setRemindingStepName(null);
      queryClient.invalidateQueries({ queryKey: ["agency-wakala-requests"] });
    },
    onError: (err: any) => {
      toast.error("Reminder Failed", {
        description: err?.message || "Backend rejected Wakala reminder trigger.",
      });
      setRemindingStepName(null);
    },
  });

  const handleTriggerReminder = (stepName: string) => {
    setRemindingStepName(stepName);
    reminderMutation.mutate(stepName);
  };

  return (
    <AgentLayout
      activeContractor={effectiveContractor}
      onContractorChange={setActiveContractor}
    >
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Wakala Authorization Requests
              </h1>
              <Badge
                variant="outline"
                className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              >
                V2 SAUDI EMBASSY WORKFLOW
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Review pending Musaned Wakala authorization requests for your agency&apos;s placements before the Monday Embassy submission deadline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="text-xs border-slate-300 dark:border-[#26262d]"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Foreign Agency Linkage Check Alert */}
        {isForeignAgency && !effectiveContractor && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold">No Contractor Record Linked</h4>
              <p>
                No Contractor record is linked to this user. A linked Foreign Agency Contractor profile is required to access Wakala authorization records. Please contact the administrator.
              </p>
            </div>
          </div>
        )}

        {/* Embassy Submission Deadline Notice */}
        <Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Saudi Embassy Monday Submission Gate
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-zinc-300 space-y-1">
            <p>
              Musaned Wakala authorization and payment must be completed prior to the <strong>Monday document submission deadline</strong>. Clearance steps without paid Wakala cannot proceed to Embassy stamping.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Automatic payment reminders run every Friday, Saturday, and Sunday via Web Push and WhatsApp to ensure timely submission.
            </p>
          </CardContent>
        </Card>

        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search candidate, passport, or step ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-white dark:bg-[#15151c]"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
            {filteredRequests.length} Pending Wakala Requests
          </span>
        </div>

        {/* Requests Table Card */}
        <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Unpaid Wakala-Bearing Embassy Steps
                </CardTitle>
              </div>
              <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]">
                portal_api.list_my_wakala_requests
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto relative">
              <table className="w-full text-xs text-left min-w-[760px] border-separate border-spacing-0">
                <thead className="text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50/95 dark:bg-[#171720] uppercase font-semibold">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-[#171720] py-2.5 px-3.5 min-w-[170px] sm:min-w-[200px] border-b border-r border-slate-200 dark:border-[#202028] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)]">
                      Candidate
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] whitespace-nowrap">Step ID</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] whitespace-nowrap">Placement</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] whitespace-nowrap">Passport</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] whitespace-nowrap">Wakala Status</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] whitespace-nowrap">Created / Due</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-[#202028] text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                        Loading pending Wakala authorization records...
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-rose-500">
                        <AlertCircle className="h-5 w-5 mx-auto mb-2 text-rose-600" />
                        Failed to load Wakala records: {(error as any)?.message || "Server Error"}
                      </td>
                    </tr>
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                      <tr key={req.clearance_step_name} className="group hover:bg-slate-50 dark:hover:bg-[#15151c]">
                        {/* Candidate Identity - STICKY FIRST COLUMN (Unscrollable on mobile) */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-[#121216] group-hover:bg-slate-50 dark:group-hover:bg-[#15151c] py-2.5 px-3.5 min-w-[170px] sm:min-w-[200px] border-b border-r border-slate-100 dark:border-[#202028] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)] transition-colors">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {req.full_name || req.applicant_name || "Candidate"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {req.passport_number || req.applicant_name || "Passport"}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          {req.clearance_step_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          {req.placement_name || "Active Placement"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          {req.passport_number || "—"}
                        </td>
                        <td className="py-2.5 px-3 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]"
                          >
                            {req.status || "Pending Payment"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          {req.creation ? new Date(req.creation).toLocaleDateString() : "Pending"}
                        </td>
                        <td className="py-2.5 px-3 text-right border-b border-slate-100 dark:border-[#1c1c24] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerReminder(req.clearance_step_name)}
                              disabled={remindingStepName === req.clearance_step_name}
                              className="h-7 text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                              title="Send manual Wakala reminder to agency user"
                            >
                              {remindingStepName === req.clearance_step_name ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <BellRing className="h-3 w-3 mr-1" />
                              )}
                              Send Reminder
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600/40 mx-auto mb-2" />
                        Zero unpaid Wakala authorization requests found. All placements are paid or not at Embassy stage.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AgentLayout>
  );
}
