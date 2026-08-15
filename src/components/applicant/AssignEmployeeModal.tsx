"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserCheck,
  Users,
  Briefcase,
  Plane,
  Fingerprint,
  Building2,
  Check,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ProcessingRoleType, StreamAssignmentPayload } from "@/types/applicant";
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

type AssignmentMode = "single_lead" | "multi_process" | "team_collaborative";

export function AssignEmployeeModal({
  isOpen,
  onClose,
  applicantIds,
  applicantNames = [],
  onSuccess,
}: AssignEmployeeModalProps) {
  const queryClient = useQueryClient();

  // Mode Selection: Single Employee for All Processes, Dedicated Per-Process Employees, or Multiple Collaborating Employees
  const [assignmentMode, setAssignmentMode] = React.useState<AssignmentMode>("single_lead");

  // Mode 1: Single Lead
  const [selectedRoleType, setSelectedRoleType] = React.useState<ProcessingRoleType>(
    "All Roles / Operations Lead"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(
    mockEmployeesList[0]?.id || ""
  );

  // Mode 2: Multi-Process Staffing
  const [lmsStaffId, setLmsStaffId] = React.useState<string>("EMP-002"); // Sara Mohammed
  const [injazStaffId, setInjazStaffId] = React.useState<string>("EMP-003"); // Dawit Haile
  const [wakalaStaffId, setWakalaStaffId] = React.useState<string>("EMP-004"); // Tigist Alemu

  // Mode 3: Team Collaborative (Multiple employees to multiple applicants)
  const [collaboratingIds, setCollaboratingIds] = React.useState<string[]>([
    "EMP-001",
    "EMP-002",
  ]);

  const [notes, setNotes] = React.useState<string>("");

  const toggleCollaborator = (id: string) => {
    setCollaboratingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      let roleType = "All Roles / Operations Lead";
      let empId = selectedEmployeeId || "EMP-001";
      let empIds: string[] = [empId];
      let streamAssignments: any = null;

      if (assignmentMode === "single_lead") {
        roleType = selectedRoleType;
        empId = selectedEmployeeId || "EMP-001";
        empIds = [empId];
      } else if (assignmentMode === "multi_process") {
        roleType = "All Roles / Operations Lead";
        const lmsEmp = mockEmployeesList.find((e: any) => e.id === lmsStaffId);
        const injazEmp = mockEmployeesList.find((e: any) => e.id === injazStaffId);
        const wakalaEmp = mockEmployeesList.find((e: any) => e.id === wakalaStaffId);

        streamAssignments = {
          lms: lmsStaffId,
          injaz: injazStaffId,
          wakala: wakalaStaffId,
        };
        empId = lmsStaffId || "EMP-002";
      } else if (assignmentMode === "team_collaborative") {
        roleType = "All Roles / Operations Lead";
        empIds = collaboratingIds;
        empId = collaboratingIds[0] || "EMP-001";
      }

      return assignEmployeeApi(
        applicantIds,
        roleType,
        empId,
        streamAssignments
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      applicantIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ["applicant", id] });
      });
      toast.success("Employee Assignment Confirmed", {
        description: `Successfully assigned ${applicantIds.length} applicant(s). Candidates are now in Processing stage.`,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <UserCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            Assign Processing Staff & Pipeline Workflows
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Configure single employee, multi-process delegation, or multi-employee collaborative staffing for selected candidate(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Applicants Summary */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Target Selected Candidate{applicantIds.length > 1 ? "s" : ""} ({applicantIds.length}):
              </span>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Selected Stage
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-20 overflow-y-auto">
              {applicantIds.map((id, idx) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-900 dark:text-emerald-300"
                >
                  {id} {applicantNames[idx] ? `(${applicantNames[idx]})` : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Mode Selector Tabs (Single Lead vs Multi-Process vs Team Collaboration) */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-800 dark:text-slate-200">
              Assignment Strategy
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAssignmentMode("single_lead")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  assignmentMode === "single_lead"
                    ? "border-emerald-800 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-800"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-700" /> Single Lead
                  </span>
                  {assignmentMode === "single_lead" && (
                    <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  1 employee handles all processes for applicant(s).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode("multi_process")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  assignmentMode === "multi_process"
                    ? "border-emerald-800 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-800"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" /> Per-Process Staff
                  </span>
                  {assignmentMode === "multi_process" && (
                    <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Dedicated staff for LMS, Injaz, and Wakala streams.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode("team_collaborative")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  assignmentMode === "team_collaborative"
                    ? "border-emerald-800 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-800"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-purple-600" /> Multi-Employee
                  </span>
                  {assignmentMode === "team_collaborative" && (
                    <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Multiple staff members assigned to candidate batch.
                </p>
              </button>
            </div>
          </div>

          {/* MODE 1 CONTROLS: Single Lead */}
          {assignmentMode === "single_lead" && (
            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              <div className="space-y-1">
                <Label htmlFor="single_role" className="font-semibold text-slate-800 dark:text-slate-200">
                  Role Type Designation
                </Label>
                <select
                  id="single_role"
                  value={selectedRoleType}
                  onChange={(e) => setSelectedRoleType(e.target.value as ProcessingRoleType)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 shadow-xs"
                >
                  <option value="All Roles / Operations Lead">All Roles / Operations Lead</option>
                  <option value="LMS Officer">LMS Officer</option>
                  <option value="Injaz Officer">Injaz Officer</option>
                  <option value="Wakala Admin">Wakala Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">
                  Select Lead Employee
                </Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {mockEmployeesList.map((emp: any) => {
                    const isSelected = emp.id === selectedEmployeeId;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 transition ${
                          isSelected
                            ? "border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-700"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            {emp.name.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {emp.roleType} • {emp.email}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2 CONTROLS: Dedicated Per-Process Employees */}
          {assignmentMode === "multi_process" && (
            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Assign Specialized Staff per Process Stream
              </h4>

              {/* 1. LMS & Ticket Staff */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Plane className="h-3.5 w-3.5 text-emerald-700" /> LMS & Departure Ticket Specialist
                </Label>
                <select
                  value={lmsStaffId}
                  onChange={(e) => setLmsStaffId(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  {mockEmployeesList.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Injaz & Teashir Staff */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Fingerprint className="h-3.5 w-3.5 text-blue-600" /> Injaz & Teashir Biometrics Specialist
                </Label>
                <select
                  value={injazStaffId}
                  onChange={(e) => setInjazStaffId(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  {mockEmployeesList.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Wakala Admin */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Building2 className="h-3.5 w-3.5 text-amber-600" /> Wakala Foreign Agency Administrator
                </Label>
                <select
                  value={wakalaStaffId}
                  onChange={(e) => setWakalaStaffId(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  {mockEmployeesList.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* MODE 3 CONTROLS: Multiple Collaborating Employees */}
          {assignmentMode === "team_collaborative" && (
            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">
                  Select Collaborating Staff Members ({collaboratingIds.length} selected)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCollaboratingIds(
                      collaboratingIds.length === mockEmployeesList.length
                        ? [mockEmployeesList[0].id]
                        : mockEmployeesList.map((e: any) => e.id)
                    )
                  }
                  className="h-6 text-[11px] text-emerald-800 dark:text-emerald-400"
                >
                  {collaboratingIds.length === mockEmployeesList.length ? "Clear" : "Select All"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {mockEmployeesList.map((emp: any) => {
                  const isChecked = collaboratingIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleCollaborator(emp.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 transition ${
                        isChecked
                          ? "border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-700"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {emp.roleType}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operational Notes */}
          <div className="space-y-1">
            <Label htmlFor="assign_notes" className="font-semibold text-slate-800 dark:text-slate-200">
              Processing Instructions & Notes (Optional)
            </Label>
            <Textarea
              id="assign_notes"
              placeholder="e.g. Priority visa quota processing; coordination requested between Wakala and Injaz teams."
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
            disabled={
              assignMutation.isPending ||
              (assignmentMode === "single_lead" && !selectedEmployeeId) ||
              (assignmentMode === "team_collaborative" && collaboratingIds.length === 0)
            }
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Assigning...
              </>
            ) : (
              `Confirm Assignment (${applicantIds.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
