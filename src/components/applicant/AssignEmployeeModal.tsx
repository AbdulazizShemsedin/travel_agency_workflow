"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, Users, Briefcase, FileText, Loader2, Check } from "lucide-react";
import { ProcessingRoleType } from "@/types/applicant";
import { assignEmployeeApi } from "@/lib/api/applicantApi";
import { mockEmployeesList } from "@/lib/server/applicantStore";
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
import { Textarea } from "@/components/ui/textarea";

interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantIds: string[];
  applicantNames?: string[];
  onSuccess?: () => void;
}

const ROLE_TYPES: { value: ProcessingRoleType; label: string; desc: string }[] = [
  {
    value: "All Roles / Operations Lead",
    label: "All Roles / Operations Lead",
    desc: "Assign a lead supervisor to oversee LMS, Wakala, and Injaz processing in parallel.",
  },
  {
    value: "LMS Officer",
    label: "LMS Officer",
    desc: "Responsible for Labour Management System, ticket input, and final departure tracking.",
  },
  {
    value: "Injaz Officer",
    label: "Injaz Officer",
    desc: "Handles Teashir fingerprint processing, biometrics appointments, and visa codes.",
  },
  {
    value: "Wakala Admin",
    label: "Wakala Admin",
    desc: "Oversees foreign agency electronic delegation, contract verification, and Wakala authorizations.",
  },
];

export function AssignEmployeeModal({
  isOpen,
  onClose,
  applicantIds,
  applicantNames = [],
  onSuccess,
}: AssignEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [selectedRoleType, setSelectedRoleType] = React.useState<ProcessingRoleType>(
    "All Roles / Operations Lead"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(
    mockEmployeesList[0]?.id || ""
  );
  const [notes, setNotes] = React.useState<string>("");

  // Filter employees matching selected role type or all
  const filteredEmployees = React.useMemo(() => {
    if (selectedRoleType === "All Roles / Operations Lead") {
      return mockEmployeesList;
    }
    return mockEmployeesList.filter(
      (emp) => emp.roleType === selectedRoleType || emp.roleType === "All Roles / Operations Lead"
    );
  }, [selectedRoleType]);

  React.useEffect(() => {
    if (filteredEmployees.length > 0) {
      if (!filteredEmployees.some((e) => e.id === selectedEmployeeId)) {
        setSelectedEmployeeId(filteredEmployees[0].id);
      }
    }
  }, [filteredEmployees, selectedEmployeeId]);

  const assignMutation = useMutation({
    mutationFn: () =>
      assignEmployeeApi(applicantIds, selectedRoleType, selectedEmployeeId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      applicantIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ["applicant", id] });
      });
      toast.success("Employee(s) Successfully Assigned", {
        description: `Assigned ${applicantIds.length} candidate(s) to ${selectedRoleType}. Stage transitioned to Processing.`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Assignment Failed", { description: err.message });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <UserCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            Assign Processing Employee
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Assign assigned staff to handle parallel processing streams (LMS, Wakala, Injaz).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Selected Candidates Summary */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Target Candidate(s) ({applicantIds.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-20 overflow-y-auto">
              {applicantIds.map((id, idx) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-900 dark:text-emerald-300"
                >
                  {id} {applicantNames[idx] ? `(${applicantNames[idx]})` : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Role Type Dropdown as requested */}
          <div className="space-y-1.5">
            <Label htmlFor="role_type" className="font-semibold text-slate-800 dark:text-slate-200">
              Role Type <span className="text-rose-500">*</span>
            </Label>
            <select
              id="role_type"
              value={selectedRoleType}
              onChange={(e) => setSelectedRoleType(e.target.value as ProcessingRoleType)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 shadow-xs focus:border-emerald-700 focus:outline-none"
            >
              {ROLE_TYPES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {ROLE_TYPES.find((r) => r.value === selectedRoleType)?.desc}
            </p>
          </div>

          {/* Select Assigned Employee */}
          <div className="space-y-1.5">
            <Label htmlFor="employee_id" className="font-semibold text-slate-800 dark:text-slate-200">
              Select Designated Employee <span className="text-rose-500">*</span>
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {filteredEmployees.map((emp) => {
                const isSelected = emp.id === selectedEmployeeId;
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${
                      isSelected
                        ? "border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 dark:border-emerald-700"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {emp.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{emp.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.role} • {emp.email}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignment Instructions / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="font-semibold text-slate-800 dark:text-slate-200">
              Processing Notes & Priority Instructions (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Urgent departure target. Please fast-track Teashir appointment."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || !selectedEmployeeId}
            className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-medium"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Assigning...
              </>
            ) : (
              "Confirm & Assign Processing"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
