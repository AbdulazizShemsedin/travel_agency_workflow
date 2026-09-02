"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserCheck,
  ShieldCheck,
  Building2,
  Check,
  Layers,
  Loader2,
  Globe2,
  ArrowRight,
  UserCog,
  AlertCircle,
  Lock,
  CheckCircle2,
  Mail,
  User,
} from "lucide-react";
import {
  reassignClearanceStepV2,
  getPlacementOfficersV2,
  listPlacementsV2,
  listMyClearanceStepsV2,
  V2PlacementRecord,
  V2ClearanceStepItem,
} from "@/lib/api/v2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Specific clearance step target (optional)
  clearanceStepName?: string;
  stepType?: string;
  currentAssignee?: string;
  // Placement / candidate target (optional)
  placementName?: string;
  applicantId?: string;
  applicantName?: string;
  applicantIds?: string[];
  applicantNames?: string[];
  destinationCountry?: string;
  onSuccess?: () => void;
}

export function AssignEmployeeModal({
  isOpen,
  onClose,
  clearanceStepName: propStepName,
  stepType: propStepType,
  currentAssignee: propCurrentAssignee,
  placementName: propPlacementName,
  applicantId: propApplicantId,
  applicantName: propApplicantName,
  applicantIds = [],
  applicantNames = [],
  destinationCountry: propCountry,
  onSuccess,
}: AssignEmployeeModalProps) {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  // 1. RBAC Check: Manager / Admin only per contract
  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin"
      );
    });
  }, [authUser, roles]);

  // Target candidate name & id
  const targetApplicantId = propApplicantId || applicantIds[0];
  const targetApplicantName =
    propApplicantName ||
    applicantNames[0] ||
    (targetApplicantId ? `Candidate ${targetApplicantId}` : "Selected Candidate");

  // 2. Fetch Placements to find linked active placement
  const { data: placements = [] } = useQuery<V2PlacementRecord[]>({
    queryKey: ["v2_placements_for_reassign"],
    queryFn: () => listPlacementsV2(),
    enabled: isOpen && !propPlacementName,
    staleTime: 10000,
  });

  const activePlacement = React.useMemo(() => {
    if (propPlacementName) {
      return { name: propPlacementName, destination_country: propCountry };
    }
    if (targetApplicantId) {
      return placements.find((p) => p.applicant === targetApplicantId);
    }
    return null;
  }, [propPlacementName, propCountry, targetApplicantId, placements]);

  // 3. Fetch Clearance Steps linked to active placement / queue
  const { data: clearanceSteps = [], isLoading: isStepsLoading } = useQuery<V2ClearanceStepItem[]>({
    queryKey: ["v2_clearance_steps_for_reassign"],
    queryFn: listMyClearanceStepsV2,
    enabled: isOpen,
    staleTime: 10000,
  });

  // Filter steps for this placement if placement known
  const availablePlacementSteps = React.useMemo<V2ClearanceStepItem[]>(() => {
    if (propStepName) {
      const found = clearanceSteps.find((s) => s.name === propStepName);
      if (found) return [found];
      return [
        {
          name: propStepName,
          step_type: propStepType || "Clearance Step",
          placement: activePlacement?.name || "",
          sequence_order: 1,
          is_mandatory: 1,
          status: "Pending",
        },
      ];
    }

    if (activePlacement?.name) {
      const matched = clearanceSteps.filter((s) => s.placement === activePlacement.name);
      if (matched.length > 0) return matched;
    }

    return clearanceSteps;
  }, [propStepName, propStepType, activePlacement, clearanceSteps]);

  // 4. Fetch placement officers via chat_engine.get_placement_officers
  const { data: placementOfficers = [] } = useQuery({
    queryKey: ["placement_officers", activePlacement?.name],
    queryFn: () => (activePlacement?.name ? getPlacementOfficersV2(activePlacement.name) : Promise.resolve([])),
    enabled: isOpen && !!activePlacement?.name,
    staleTime: 15000,
  });

  // Selected Clearance Step state
  const [selectedStepName, setSelectedStepName] = React.useState<string>(
    propStepName || (availablePlacementSteps[0]?.name ?? "")
  );

  React.useEffect(() => {
    if (propStepName) {
      setSelectedStepName(propStepName);
    } else if (availablePlacementSteps.length > 0 && !selectedStepName) {
      setSelectedStepName(availablePlacementSteps[0].name);
    }
  }, [propStepName, availablePlacementSteps, selectedStepName]);

  const currentStepRecord = React.useMemo(() => {
    return availablePlacementSteps.find((s) => s.name === selectedStepName);
  }, [availablePlacementSteps, selectedStepName]);

  // Proposed Assignee Officer email state
  const [proposedOfficer, setProposedOfficer] = React.useState<string>("");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Determine current assignee for selected step
  const resolvedCurrentAssignee = React.useMemo<string>(() => {
    if (propCurrentAssignee) return propCurrentAssignee;
    if (currentStepRecord?.completed_by) return currentStepRecord.completed_by;

    // Check if placementOfficers has an open assignment for this step type
    const stepType = currentStepRecord?.step_type;
    if (stepType && placementOfficers.length > 0) {
      const match = placementOfficers.find(
        (o) => o.step_type?.toLowerCase() === stepType.toLowerCase()
      );
      if (match?.user) return match.user;
    }

    return "Unassigned";
  }, [propCurrentAssignee, currentStepRecord, placementOfficers]);

  // Reset feedback on step change
  React.useEffect(() => {
    setFeedback(null);
  }, [selectedStepName]);

  // Reassignment Mutation executing reassign_clearance_step
  const reassignMutation = useMutation({
    mutationFn: async ({ stepName, officerEmail }: { stepName: string; officerEmail: string }) => {
      setFeedback(null);
      return await reassignClearanceStepV2(stepName, officerEmail.trim());
    },
    onSuccess: (data, variables) => {
      const successMsg = `Successfully reassigned ${variables.stepName} to ${variables.officerEmail}`;
      setFeedback({ type: "success", message: successMsg });
      toast.success(successMsg);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["placement_officers"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_for_reassign"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });

      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const errMsg = err?.message || "Failed to reassign clearance step. Backend state rejected mutation.";
      setFeedback({ type: "error", message: errMsg });
      toast.error("Reassignment rejected by backend", {
        description: errMsg,
      });
    },
  });

  const handleExecute = () => {
    if (!selectedStepName) {
      setFeedback({ type: "error", message: "Please select a valid Clearance Step record." });
      return;
    }

    if (!selectedStepName.startsWith("CLR-")) {
      setFeedback({
        type: "error",
        message: "Invalid Clearance Step identifier. Step names must be real Frappe records (e.g. CLR-00001).",
      });
      return;
    }

    const email = proposedOfficer.trim();
    if (!email || !email.includes("@")) {
      setFeedback({
        type: "error",
        message: "Officer identifier must be a valid User name (email address) per the backend contract.",
      });
      return;
    }

    reassignMutation.mutate({
      stepName: selectedStepName,
      officerEmail: email,
    });
  };

  // Canonical role accounts suggestions
  const suggestedOfficers = React.useMemo(() => {
    const list = new Set<string>();

    // From active placement officers
    placementOfficers.forEach((o) => {
      if (o.user) list.add(o.user);
    });

    // Country-specific canonical suggested roles
    const dest = (activePlacement?.destination_country || propCountry || "").toLowerCase();
    if (dest.includes("kuwait")) {
      list.add("kuwait.lmis@agency.com");
      list.add("kuwait.telesign@agency.com");
      list.add("kuwait.embassy@agency.com");
    } else {
      list.add("saudi.lmis@agency.com");
      list.add("saudi.taeshir@agency.com");
      list.add("saudi.embassy@agency.com");
    }
    list.add("clearance.officer@agency.com");

    return Array.from(list);
  }, [placementOfficers, activePlacement, propCountry]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
        <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Clearance Step Reassignment
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Execute V2 backend officer reassignment using authoritative User email identifiers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* RBAC Warning Banner if user is not Manager/Admin */}
          {!isManagerOrAdmin && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authorization Restriction: </span>
                Clearance step reassignment is restricted to <strong>Manager</strong> and{" "}
                <strong>System Administrator</strong> roles. Your current account does not have write
                permission to reassign clearance officers.
              </div>
            </div>
          )}

          {/* Context Card: Placement & Candidate Context */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181f] border border-slate-200/80 dark:border-[#24242e] text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500 dark:text-zinc-400">Candidate:</span>
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {targetApplicantName}
                </strong>
              </div>

              {activePlacement?.name && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                >
                  Placement: {activePlacement.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400">
              {targetApplicantId && (
                <div>
                  Applicant ID: <span className="font-mono text-slate-700 dark:text-zinc-300">{targetApplicantId}</span>
                </div>
              )}
              {activePlacement?.destination_country && (
                <div>
                  Corridor:{" "}
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    {activePlacement.destination_country}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Target Clearance Step (DocType: Clearance Step)</span>
              {currentStepRecord && (
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                  Seq {currentStepRecord.sequence_order || 1} • {currentStepRecord.is_mandatory ? "Mandatory" : "Optional"}
                </span>
              )}
            </Label>

            {availablePlacementSteps.length > 0 ? (
              <select
                aria-label="Select clearance step"
                value={selectedStepName}
                onChange={(e) => setSelectedStepName(e.target.value)}
                disabled={!isManagerOrAdmin || reassignMutation.isPending}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200"
              >
                {availablePlacementSteps.map((step) => (
                  <option key={step.name} value={step.name}>
                    {step.name} — {step.step_type || step.step_name} ({step.status || "Pending"})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-[#262630] bg-slate-50 dark:bg-[#16161c] text-xs text-slate-500">
                No active clearance steps found for this candidate. Candidate must be in Processing stage with an active Placement.
              </div>
            )}
          </div>

          {/* Current Assignee Display */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-[#24242e] bg-slate-50/50 dark:bg-[#16161c] flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Current Assigned Officer
              </span>
              <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                {resolvedCurrentAssignee}
              </div>
            </div>
            {currentStepRecord?.status && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
              >
                Status: {currentStepRecord.status}
              </Badge>
            )}
          </div>

          {/* Proposed Assignee Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Proposed Assignee Officer (User.name = email)
            </Label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={proposedOfficer}
                onChange={(e) => setProposedOfficer(e.target.value)}
                placeholder="officer@agency.com"
                disabled={!isManagerOrAdmin || reassignMutation.isPending}
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>

            {/* Quick-Pick Suggestions */}
            {suggestedOfficers.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 font-medium block mb-1">
                  Quick-pick officer accounts:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {suggestedOfficers.map((email) => (
                    <button
                      key={email}
                      type="button"
                      disabled={!isManagerOrAdmin || reassignMutation.isPending}
                      onClick={() => setProposedOfficer(email)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-mono rounded border transition-all",
                        proposedOfficer === email
                          ? "bg-emerald-800 text-white border-emerald-900 dark:bg-emerald-600"
                          : "bg-slate-100 dark:bg-[#1a1a24] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#262630] hover:bg-slate-200 dark:hover:bg-[#222230]"
                      )}
                    >
                      {email}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline Feedback Banner */}
          {feedback && (
            <div
              className={cn(
                "p-3 rounded-xl border text-xs flex items-start gap-2",
                feedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-300"
              )}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="font-medium break-all">{feedback.message}</div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={reassignMutation.isPending}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleExecute}
            disabled={
              !isManagerOrAdmin ||
              !selectedStepName ||
              !proposedOfficer.trim() ||
              reassignMutation.isPending
            }
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold h-9 shadow-xs"
          >
            {reassignMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Executing Reassignment...
              </>
            ) : (
              <>
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Reassign Officer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
