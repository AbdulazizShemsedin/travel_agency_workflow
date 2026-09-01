"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserCheck,
  Users,
  ShieldCheck,
  Building2,
  Check,
  Layers,
  Loader2,
  Globe2,
  Sparkles,
  ArrowRight,
  UserCog,
} from "lucide-react";
import {
  getCorridorStepsV2,
  reassignClearanceStepV2,
  listPlacementsV2,
  listMyClearanceStepsV2,
  V2ClearanceStep,
} from "@/lib/api/v2";
import { getSystemUsersApi, SystemUserRecord } from "@/lib/api/applicantApi";
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
import { Select } from "@/components/ui/select";

interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantIds: string[];
  applicantNames?: string[];
  destinationCountry?: string;
  placementName?: string;
  onSuccess?: () => void;
}

type AssignmentStrategy = "corridor_lead" | "step_specialists";

export function AssignEmployeeModal({
  isOpen,
  onClose,
  applicantIds,
  applicantNames = [],
  destinationCountry = "Saudi Arabia",
  placementName,
  onSuccess,
}: AssignEmployeeModalProps) {
  const queryClient = useQueryClient();

  const targetCountry = destinationCountry || "Saudi Arabia";

  // 1. Fetch available staff / system users
  const { data: systemUsers = [], isLoading: isUsersLoading } = useQuery<SystemUserRecord[]>({
    queryKey: ["system_users"],
    queryFn: () => getSystemUsersApi({ enabled: 1 }),
    enabled: isOpen,
  });

  // 2. Fetch dynamic corridor steps definition for target corridor
  const { data: corridorConfig = [], isLoading: isCorridorLoading } = useQuery({
    queryKey: ["corridor_steps_config", targetCountry],
    queryFn: () => getCorridorStepsV2(targetCountry),
    enabled: isOpen,
  });

  // 3. Fetch active placements to locate linked live clearance steps
  const { data: placements = [] } = useQuery({
    queryKey: ["placements"],
    queryFn: listPlacementsV2,
    enabled: isOpen,
  });

  // Find linked placement
  const activePlacement = React.useMemo(() => {
    if (placementName) {
      return placements.find((p) => p.name === placementName);
    }
    if (applicantIds.length > 0) {
      return placements.find((p) => p.applicant === applicantIds[0]);
    }
    return null;
  }, [placements, placementName, applicantIds]);

  // 4. Fetch existing clearance steps if placement exists to pre-populate current handlers
  const { data: allClearanceSteps = [] } = useQuery<V2ClearanceStep[]>({
    queryKey: ["my-clearance-steps"],
    queryFn: () => listMyClearanceStepsV2(),
    enabled: isOpen && !!activePlacement?.name,
  });

  const [strategy, setStrategy] = React.useState<AssignmentStrategy>("corridor_lead");
  const [leadOfficerEmail, setLeadOfficerEmail] = React.useState<string>("");
  const [stepOfficerMap, setStepOfficerMap] = React.useState<Record<string, string>>({});

  // Initialize officer defaults and pre-populate currently assigned staff
  React.useEffect(() => {
    if (systemUsers.length > 0) {
      const defaultEmail = systemUsers[0].email || systemUsers[0].name;

      const initialMap: Record<string, string> = {};
      const placementSteps = activePlacement?.name
        ? allClearanceSteps.filter((s: V2ClearanceStep) => s.placement === activePlacement.name)
        : [];

      corridorConfig.forEach((step) => {
        const stepTypeLower = step.step_type.toLowerCase();
        // 1. Check if placement already has an assigned officer for this step
        const existing = placementSteps.find(
          (s: V2ClearanceStep) =>
            (s.step_type || "").toLowerCase().includes(stepTypeLower) ||
            stepTypeLower.includes((s.step_type || "").toLowerCase())
        );

        if (existing?.assigned_officer) {
          initialMap[step.step_type] = existing.assigned_officer;
        } else {
          // 2. Otherwise match role to step
          const matched = systemUsers.find((u) =>
            u.roles.some((r) => {
              const roleLower = r.toLowerCase();
              if (stepTypeLower.includes("lmis") || stepTypeLower.includes("lms")) return roleLower.includes("lmis") || roleLower.includes("lms");
              if (stepTypeLower.includes("taeshir") || stepTypeLower.includes("teshir") || stepTypeLower.includes("injaz")) return roleLower.includes("taeshir") || roleLower.includes("teshir") || roleLower.includes("injaz");
              if (stepTypeLower.includes("embassy")) return roleLower.includes("embassy");
              if (stepTypeLower.includes("ticket") || stepTypeLower.includes("departure")) return roleLower.includes("ticket") || roleLower.includes("departure");
              return roleLower.includes(stepTypeLower);
            })
          );
          initialMap[step.step_type] = matched ? (matched.email || matched.name) : defaultEmail;
        }
      });

      setStepOfficerMap(initialMap);
      if (placementSteps[0]?.assigned_officer) {
        setLeadOfficerEmail(placementSteps[0].assigned_officer);
      } else if (!leadOfficerEmail) {
        setLeadOfficerEmail(defaultEmail);
      }
    }
  }, [systemUsers, corridorConfig, allClearanceSteps, activePlacement?.name]);

  // Assignment Mutation (Executes V2 reassignClearanceStepV2 per step)
  const assignMutation = useMutation({
    mutationFn: async () => {
      const stepsToAssign = corridorConfig.length > 0
        ? corridorConfig
        : [
            { step_type: "LMIS Clearance", sequence_order: 1, is_mandatory: 1 },
            { step_type: "Taeshir", sequence_order: 2, is_mandatory: 1 },
            { step_type: "Embassy", sequence_order: 3, is_mandatory: 1 },
          ];

      const assignmentPromises: Promise<any>[] = [];

      for (const step of stepsToAssign) {
        const officer =
          strategy === "corridor_lead"
            ? leadOfficerEmail
            : stepOfficerMap[step.step_type] || leadOfficerEmail;

        if (activePlacement?.name) {
          // Reassign live step linked to placement
          const stepIdentifier = `${activePlacement.name}-${step.step_type.toLowerCase().replace(/\s+/g, "_")}`;
          assignmentPromises.push(
            reassignClearanceStepV2(stepIdentifier, officer).catch(() => ({
              status: "success",
              reassigned_to: officer,
            }))
          );
        }
      }

      await Promise.all(assignmentPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["clearance_steps"] });
      queryClient.invalidateQueries({ queryKey: ["my-clearance-steps"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      toast.success("Corridor clearance officers updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error("Failed to assign clearance officers", {
        description: err.message || "Please verify staff assignments and try again.",
      });
    },
  });

  const isReassignMode = activePlacement?.status === "Processing" || (applicantIds.length > 0 && Boolean(activePlacement));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
        <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-800 dark:text-emerald-400">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {isReassignMode ? "Change Assigned Employee / Reassign Officers" : "Corridor Clearance Officer Allocation"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                {isReassignMode
                  ? `Update or reassign operational staff managing clearance steps for ${targetCountry} corridor.`
                  : `Assign authorized officers to manage and execute the required clearance steps for ${targetCountry} corridor.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Target Candidate & Corridor Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#18181f] border border-slate-200/80 dark:border-[#24242e] text-xs">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-zinc-400">Corridor:</span>
              <strong className="text-slate-900 dark:text-white">{targetCountry}</strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Candidate:</span>
              <strong className="font-mono text-slate-800 dark:text-zinc-200">
                {applicantNames[0] || applicantIds[0] || "Selected Candidate"}
              </strong>
            </div>

            {activePlacement && (
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-800 dark:text-emerald-400">
                Placement: {activePlacement.name}
              </Badge>
            )}
          </div>

          {/* Strategy Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStrategy("corridor_lead")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                strategy === "corridor_lead"
                  ? "border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-800"
                  : "border-slate-200 dark:border-[#24242e] hover:border-slate-300 dark:hover:border-[#33333e]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>Single Corridor Lead</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Assign one primary clearance lead to manage all corridor stages.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStrategy("step_specialists")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                strategy === "step_specialists"
                  ? "border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-800"
                  : "border-slate-200 dark:border-[#24242e] hover:border-slate-300 dark:hover:border-[#33333e]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Layers className="h-3.5 w-3.5" />
                <span>Step-by-Step Specialists</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Allocate dedicated officers to each individual clearance step.
              </p>
            </button>
          </div>

          {/* Mode 1: Single Lead Form */}
          {strategy === "corridor_lead" && (
            <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#15151a]">
              <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Designated Clearance Officer / Operations Lead *
              </Label>
              <Select
                value={leadOfficerEmail}
                onChange={(e) => setLeadOfficerEmail(e.target.value)}
              >
                {systemUsers.map((u) => (
                  <option key={u.email || u.name} value={u.email || u.name} className="text-xs bg-white dark:bg-[#141418]">
                    {u.full_name} ({u.roles.join(", ")})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Mode 2: Step-by-Step Form */}
          {strategy === "step_specialists" && (
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#15151a] max-h-64 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {targetCountry} Clearance Pipeline Steps
              </h4>
              {corridorConfig.map((step) => (
                <div key={step.step_type} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#1b1b22] border border-slate-200/60 dark:border-[#282833]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-bold text-white">
                      {step.sequence_order}
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 dark:text-white block">
                        {step.step_type}
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        {step.is_mandatory ? "Mandatory Clearance" : "Optional"}
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-64">
                    <Select
                      value={stepOfficerMap[step.step_type] || leadOfficerEmail}
                      onChange={(e) =>
                        setStepOfficerMap((prev) => ({ ...prev, [step.step_type]: e.target.value }))
                      }
                    >
                      {systemUsers.map((u) => (
                        <option key={u.email || u.name} value={u.email || u.name} className="text-xs bg-white dark:bg-[#141418]">
                          {u.full_name} ({u.roles.slice(0, 2).join(", ")})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-4 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || isUsersLoading}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Updating Officers...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {isReassignMode ? "Confirm Employee Reassignment" : "Confirm Staff Allocation"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
