"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import {
  UserCheck,
  ShieldCheck,
  FileCheck2,
  Globe2,
  Plane,
  Loader2,
  Check,
  UserCog,
  Sparkles,
} from "lucide-react";
import {
  reassignClearanceStepV2,
  assignClearanceStepV2,
  getPlacementOfficersV2,
  listPlacementsV2,
  listMyClearanceStepsV2,
  listEmployeeRosterV2,
  V2PlacementRecord,
  V2ClearanceStepItem,
  V2EmployeeRecord,
  resolveDefaultEmployeeForRole,
  mapStepToRole,
  getSavedDefaultRoleAssignments,
  saveDefaultRoleAssignments,
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

interface StageDefinition {
  key: "lmis" | "teshir" | "embassy" | "ticket";
  title: string;
  roleName: string;
  description: string;
  icon: React.ElementType;
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

  // Target candidate name & ID
  const targetApplicantId = propApplicantId || applicantIds[0];
  const targetApplicantName =
    propApplicantName ||
    applicantNames[0] ||
    (targetApplicantId ? `Candidate ${targetApplicantId}` : "Selected Candidate");

  // 1. Fetch Placements to find active placement
  const { data: placements = [] } = useQuery<V2PlacementRecord[]>({
    queryKey: ["v2_placements_for_reassign"],
    queryFn: () => listPlacementsV2(),
    enabled: isOpen && !propPlacementName,
    staleTime: 10000,
  });

  const placementRecord = React.useMemo(() => {
    if (targetApplicantId) {
      return placements.find((p) => p.applicant === targetApplicantId) || null;
    }
    return null;
  }, [targetApplicantId, placements]);

  const activePlacementName = propPlacementName || placementRecord?.name || "";
  const resolvedCountry =
    propCountry || placementRecord?.destination_country || "Saudi Arabia";
  const isKuwait = resolvedCountry.toLowerCase().includes("kuwait");

  // 2. Fetch clearance steps
  const { data: clearanceSteps = [] } = useQuery<V2ClearanceStepItem[]>({
    queryKey: ["v2_clearance_steps_for_reassign"],
    queryFn: () => listMyClearanceStepsV2(),
    enabled: isOpen,
    staleTime: 10000,
  });

  const availablePlacementSteps = React.useMemo<V2ClearanceStepItem[]>(() => {
    if (activePlacementName) {
      const matched = clearanceSteps.filter(
        (s) => s.placement === activePlacementName || s.placement_name === activePlacementName
      );
      if (matched.length > 0) return matched;
    }
    return clearanceSteps;
  }, [activePlacementName, clearanceSteps]);

  // 3. Fetch placement officers via chat_engine
  const { data: placementOfficers = [] } = useQuery({
    queryKey: ["placement_officers", activePlacementName],
    queryFn: () =>
      activePlacementName ? getPlacementOfficersV2(activePlacementName) : Promise.resolve([]),
    enabled: isOpen && !!activePlacementName,
    staleTime: 15000,
  });

  // 4. Fetch all internal employees via list_employee_roster
  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery<V2EmployeeRecord[]>({
    queryKey: ["v2_employees_for_assign"],
    queryFn: () => listEmployeeRosterV2(),
    enabled: isOpen,
    staleTime: 30000,
  });

  // Canonical 4 Stages definition (LMIS, Te'shir, Embassy, Ticket)
  const stages: StageDefinition[] = React.useMemo(
    () => [
      {
        key: "lmis",
        title: isKuwait ? "Kuwait LMIS" : "LMIS Clearance",
        roleName: isKuwait ? "Kuwait LMIS" : "Saudi LMIS",
        description: isKuwait
          ? "Ministry work permit & labor clearance approval"
          : "Ministry of Labor clearance, COC test tracking & approval",
        icon: FileCheck2,
      },
      {
        key: "teshir",
        title: isKuwait ? "Kuwait Telesign" : "Te'shir Biometrics",
        roleName: isKuwait ? "Kuwait Telesign" : "Saudi Taeshir",
        description: isKuwait
          ? "Telesign authentication & documentation references"
          : "VFS Taeshir biometric appointments & Injaz fees",
        icon: ShieldCheck,
      },
      {
        key: "embassy",
        title: isKuwait ? "Kuwait Embassy" : "Embassy Visa Stamping",
        roleName: isKuwait ? "Kuwait Embassy" : "Saudi Embassy",
        description: isKuwait
          ? "Consular submission & document attestation"
          : "Consular visa submission and stamping verification",
        icon: Globe2,
      },
      {
        key: "ticket",
        title: "Ticketing & Departure",
        roleName: "Ticketer",
        description: "Flight reservation, final medical clearance & departure dispatch",
        icon: Plane,
      },
    ],
    [isKuwait]
  );

  // Selected assignees for each of the 4 stages
  const [stageAssignments, setStageAssignments] = React.useState<Record<string, string>>({
    lmis: "",
    teshir: "",
    embassy: "",
    ticket: "",
  });

  // Pre-fill dropdowns with respective default/assigned staff on modal open
  React.useEffect(() => {
    if (!isOpen || employees.length === 0) return;

    const savedDefaults = getSavedDefaultRoleAssignments();
    const resolvedDefaults: Record<string, string> = {};

    stages.forEach((stage) => {
      // 1. Check if placement step exists with an already assigned officer
      const existingStep = availablePlacementSteps.find(
        (s) => mapStepToRole(s.step_type || s.name, resolvedCountry) === stage.roleName
      );
      if (existingStep?.assigned_officer) {
        resolvedDefaults[stage.key] = existingStep.assigned_officer;
        return;
      }

      // 2. Check placement officers from chat_engine
      const officerMatch = placementOfficers.find(
        (o) => mapStepToRole(o.step_type, resolvedCountry) === stage.roleName
      );
      if (officerMatch?.user) {
        resolvedDefaults[stage.key] = officerMatch.user;
        return;
      }

      // 3. Check configured default or role default from defaultRoles engine
      const defaultEmp = resolveDefaultEmployeeForRole(stage.roleName, employees, savedDefaults);
      if (defaultEmp?.name) {
        resolvedDefaults[stage.key] = defaultEmp.name;
        return;
      }

      // 4. Fallback to first active employee holding this role
      const roleMatch = employees.find((e) => {
        if (!e.enabled) return false;
        const userRoles = Array.isArray(e.roles) ? e.roles : [];
        return userRoles.some(
          (r) => r.toLowerCase().trim() === stage.roleName.toLowerCase().trim()
        );
      });
      resolvedDefaults[stage.key] = roleMatch?.name || "";
    });

    setStageAssignments((prev) => {
      const isIdentical =
        prev.lmis === resolvedDefaults.lmis &&
        prev.teshir === resolvedDefaults.teshir &&
        prev.embassy === resolvedDefaults.embassy &&
        prev.ticket === resolvedDefaults.ticket;
      if (isIdentical) return prev;
      return resolvedDefaults;
    });
  }, [isOpen, employees, availablePlacementSteps, placementOfficers, stages, resolvedCountry]);

  // Handle dropdown value change for a stage
  const handleStageChange = (stageKey: string, officerEmail: string) => {
    setStageAssignments((prev) => ({
      ...prev,
      [stageKey]: officerEmail,
    }));
  };

  // Save staff assignments for all 4 stages
  const saveMutation = useMutation({
    mutationFn: async () => {
      let assignedCount = 0;
      const errors: string[] = [];

      // If active placement steps exist, assign/reassign directly via V2 API
      if (activePlacementName) {
        for (const stage of stages) {
          const selectedOfficer = stageAssignments[stage.key];
          if (!selectedOfficer) continue;

          const matchingStep = availablePlacementSteps.find(
            (s) => mapStepToRole(s.step_type || s.name, resolvedCountry) === stage.roleName
          );

          if (matchingStep?.name) {
            try {
              await assignClearanceStepV2(matchingStep.name, selectedOfficer);
              assignedCount++;
            } catch (err: any) {
              try {
                await reassignClearanceStepV2(matchingStep.name, selectedOfficer);
                assignedCount++;
              } catch (reErr: any) {
                errors.push(`${stage.title}: ${reErr.message || "Failed to assign"}`);
              }
            }
          }
        }
      }

      // Also persist to default role assignments so advance_placement auto-assigns these exact specialists
      const savedConfig = getSavedDefaultRoleAssignments();
      const updatedConfig = { ...savedConfig };
      stages.forEach((stage) => {
        if (stageAssignments[stage.key]) {
          updatedConfig[stage.roleName] = stageAssignments[stage.key];
        }
      });
      saveDefaultRoleAssignments(updatedConfig);

      return { assignedCount, errors };
    },
    onSuccess: ({ assignedCount, errors }) => {
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["placement_officers"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_for_reassign"] });
      queryClient.invalidateQueries({ queryKey: ["my-clearance-steps"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });

      if (errors.length > 0 && assignedCount === 0) {
        toast.error("Could not assign staff members", {
          description: errors.join(" • "),
        });
      } else {
        toast.success("Staff assignments updated successfully", {
          description:
            assignedCount > 0
              ? `${assignedCount} clearance steps updated.`
              : "Corridor specialists successfully configured for this candidate.",
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error("Failed to update staff assignments", {
        description: formatCleanErrorMessage(err),
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
        <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Edit Staff Assignment
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Candidate: <strong className="text-slate-800 dark:text-zinc-200">{targetApplicantName}</strong> • Corridor:{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">{resolvedCountry}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 4 Clearance Stages Dropdowns */}
        <div className="space-y-3.5 py-3">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const currentVal = stageAssignments[stage.key] || "";
            const savedDefaults = getSavedDefaultRoleAssignments();
            const defaultEmp = resolveDefaultEmployeeForRole(stage.roleName, employees, savedDefaults);
            const isSelectedDefault = Boolean(
              defaultEmp?.name && currentVal && (defaultEmp.name === currentVal || defaultEmp.email === currentVal)
            );

            return (
              <div
                key={stage.key}
                className="p-3 rounded-xl border border-slate-200/90 dark:border-[#24242e] bg-slate-50/50 dark:bg-[#16161c] space-y-2 transition hover:border-slate-300 dark:hover:border-[#2e2e3a]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/70 dark:bg-[#22222a] text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <Icon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      {stage.title}
                    </div>
                  </div>

                  {isSelectedDefault && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="h-3 w-3" />
                      Default Specialist
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {stage.description}
                </p>

                <div>
                  <select
                    aria-label={`Select staff for ${stage.title}`}
                    value={currentVal}
                    onChange={(e) => handleStageChange(stage.key, e.target.value)}
                    disabled={isEmployeesLoading || saveMutation.isPending}
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#141419] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                  >
                    <option value="">-- Choose Assigned Staff --</option>
                    {employees.map((emp) => {
                      const empName =
                        emp.full_name ||
                        [emp.first_name, emp.last_name].filter(Boolean).join(" ") ||
                        emp.name;
                      const empRole =
                        Array.isArray(emp.roles) && emp.roles.length > 0
                          ? emp.roles.filter((r: string) => r !== "Desk User").join(", ") || "Staff"
                          : "Staff";
                      const isDefault = Boolean(defaultEmp?.name && (emp.name === defaultEmp.name || emp.email === defaultEmp.name));

                      return (
                        <option key={emp.name} value={emp.name}>
                          {empName} ({empRole}) {isDefault ? "★ [Default]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold h-9 shadow-xs px-5"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving Staff Assignments...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Save Staff Assignments
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
