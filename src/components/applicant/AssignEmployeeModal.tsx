"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
} from "lucide-react";
import { assignEmployeeApi, getEmployeesList } from "@/lib/api/applicantApi";
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
  destinationCountry?: string;
  onSuccess?: () => void;
}

type AssignmentMode = "single_lead" | "multi_process" | "team_collaborative";

export function AssignEmployeeModal({
  isOpen,
  onClose,
  applicantIds,
  applicantNames = [],
  destinationCountry,
  onSuccess,
}: AssignEmployeeModalProps) {
  const queryClient = useQueryClient();

  const isKuwait = (destinationCountry || "").toLowerCase().trim() === "kuwait";

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesList,
  });

  // Mode Selection: Single Employee for All Processes, Dedicated Per-Process Employees, or Multiple Collaborating Employees
  const [assignmentMode, setAssignmentMode] = React.useState<AssignmentMode>("single_lead");

  // Mode 1: Single Lead
  const [selectedRoleType, setSelectedRoleType] = React.useState<string>(
    "All Roles / Operations Lead"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("");

  // Mode 2: Multi-Process Staffing
  const [lmsStaffId, setLmsStaffId] = React.useState<string>("");
  // Saudi streams
  const [injazStaffId, setInjazStaffId] = React.useState<string>("");
  const [wakalaStaffId, setWakalaStaffId] = React.useState<string>("");
  // Kuwait streams
  const [telesignStaffId, setTelesignStaffId] = React.useState<string>("");
  const [embassyStaffId, setEmbassyStaffId] = React.useState<string>("");

  // Mode 3: Team Collaborative (Multiple employees to multiple applicants)
  const [collaboratingIds, setCollaboratingIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (employees.length > 0) {
      if (!selectedEmployeeId) setSelectedEmployeeId(employees[0].name);
      if (!lmsStaffId) setLmsStaffId(employees[0].name);
      if (!injazStaffId) setInjazStaffId(employees[0].name);
      if (!wakalaStaffId) setWakalaStaffId(employees[0].name);
      if (!telesignStaffId) setTelesignStaffId(employees[0].name);
      if (!embassyStaffId) setEmbassyStaffId(employees[0].name);
      if (collaboratingIds.length === 0) setCollaboratingIds([employees[0].name]);
    }
  }, [employees, selectedEmployeeId, lmsStaffId, injazStaffId, wakalaStaffId, telesignStaffId, embassyStaffId, collaboratingIds]);

  const [notes, setNotes] = React.useState<string>("");

  const toggleCollaborator = (id: string) => {
    setCollaboratingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      const getFormattedEmp = (idOrEmail: string) => {
        if (!idOrEmail) return "";
        const found = employees.find((e) => e.name === idOrEmail || e.email === idOrEmail);
        if (found && found.name) {
          return found.name;
        }
        return idOrEmail;
      };

      const defaultLead = getFormattedEmp(selectedEmployeeId || employees[0]?.name || "Administrator");
      let roleType = "All Roles / Operations Lead";
      let empId = defaultLead;
      let streamAssignments: any = null;

      if (assignmentMode === "single_lead") {
        roleType = selectedRoleType;
        empId = defaultLead;
        if (isKuwait) {
          // Kuwait Corridor: LMS + Telesign + Embassy ONLY
          streamAssignments = {
            lms: defaultLead,
            telesign: defaultLead,
            embassy: defaultLead,
          };
        } else {
          // Saudi Arabia Corridor: LMS + Injaz + Wakala ONLY
          streamAssignments = {
            lms: defaultLead,
            injaz: defaultLead,
            wakala: defaultLead,
          };
        }
      } else if (assignmentMode === "multi_process") {
        roleType = "All Roles / Operations Lead";
        const lms = getFormattedEmp(lmsStaffId || defaultLead);
        if (isKuwait) {
          // Kuwait Corridor: LMS + Telesign + Embassy ONLY
          const telesign = getFormattedEmp(telesignStaffId || defaultLead);
          const embassy = getFormattedEmp(embassyStaffId || defaultLead);
          streamAssignments = {
            lms,
            telesign,
            embassy,
          };
          empId = lms || defaultLead;
        } else {
          // Saudi Arabia Corridor: LMS + Injaz + Wakala ONLY
          const injaz = getFormattedEmp(injazStaffId || defaultLead);
          const wakala = getFormattedEmp(wakalaStaffId || defaultLead);
          streamAssignments = {
            lms,
            injaz,
            wakala,
          };
          empId = lms || defaultLead;
        }
      } else if (assignmentMode === "team_collaborative") {
        roleType = "All Roles / Operations Lead";
        const teamLead = getFormattedEmp(collaboratingIds[0] || defaultLead);
        empId = teamLead;
        if (isKuwait) {
          streamAssignments = {
            lms: teamLead,
            telesign: teamLead,
            embassy: teamLead,
          };
        } else {
          streamAssignments = {
            lms: teamLead,
            injaz: teamLead,
            wakala: teamLead,
          };
        }
      }

      return assignEmployeeApi(
        applicantIds,
        roleType,
        empId,
        streamAssignments
      );
    },
    onSuccess: () => {
      applicantIds.forEach((id) => {
        queryClient.setQueryData(["applicant", id], (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            applicant_state: "Processing",
          };
        });
        queryClient.invalidateQueries({ queryKey: ["applicant", id] });
        queryClient.invalidateQueries({ queryKey: ["processing", id] });
      });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
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
            Assign Processing Staff ({isKuwait ? "Kuwait Corridor" : "Saudi Arabia Corridor"})
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            {isKuwait
              ? "Configure staff assignment for Kuwait processing streams: LMS Permit & Visa, Telesign, and Embassy clearance."
              : "Configure staff assignment for Saudi processing streams: LMS Permit, Injaz/Teashir, and Wakala authorization."}
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
                {isKuwait ? "Kuwait Corridor" : "Saudi Corridor"}
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
                  1 employee handles all corridor clearance streams.
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
                  {isKuwait
                    ? "Dedicated staff for LMS, Telesign, and Embassy streams."
                    : "Dedicated staff for LMS, Injaz, and Wakala streams."}
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
                  onChange={(e) => setSelectedRoleType(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 shadow-xs"
                >
                  <option value="All Roles / Operations Lead">All Roles / Operations Lead</option>
                  <option value="LMS Officer">LMS Officer</option>
                  {isKuwait ? (
                    <>
                      <option value="Telesign Officer">Telesign Officer</option>
                      <option value="Embassy Officer">Embassy Officer</option>
                    </>
                  ) : (
                    <>
                      <option value="Injaz Officer">Injaz Officer</option>
                      <option value="Wakala Admin">Wakala Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">
                  Select Lead Employee
                </Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {employees.map((emp) => {
                    const isSelected = emp.name === selectedEmployeeId;
                    return (
                      <div
                        key={emp.name}
                        onClick={() => setSelectedEmployeeId(emp.name)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 transition ${
                          isSelected
                            ? "border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-700"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            {emp.employee_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {emp.employee_name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {emp.role_type || "Operations"} • {emp.name}
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
                Assign Specialized Staff per Process Stream ({isKuwait ? "Kuwait Corridor" : "Saudi Arabia Corridor"})
              </h4>

              {/* 1. LMS Permit & Visa */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Plane className="h-3.5 w-3.5 text-emerald-700" /> {isKuwait ? "Kuwait LMS Permit & Visa Specialist" : "LMS & Departure Ticket Specialist"}
                </Label>
                <select
                  value={lmsStaffId}
                  onChange={(e) => setLmsStaffId(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.employee_name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Corridor Specific Streams */}
              {isKuwait ? (
                <>
                  {/* Kuwait 2. Telesign Verification */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <Fingerprint className="h-3.5 w-3.5 text-purple-600" /> Telesign / Ministry Verification Specialist
                    </Label>
                    <select
                      value={telesignStaffId}
                      onChange={(e) => setTelesignStaffId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {employees.map((e) => (
                        <option key={e.name} value={e.name}>
                          {e.employee_name} ({e.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kuwait 3. Embassy Clearance */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" /> Embassy / Consulate Clearance Officer
                    </Label>
                    <select
                      value={embassyStaffId}
                      onChange={(e) => setEmbassyStaffId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {employees.map((e) => (
                        <option key={e.name} value={e.name}>
                          {e.employee_name} ({e.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Saudi 2. Injaz & Teashir Staff */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <Fingerprint className="h-3.5 w-3.5 text-blue-600" /> Injaz & Teashir Biometrics Specialist
                    </Label>
                    <select
                      value={injazStaffId}
                      onChange={(e) => setInjazStaffId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {employees.map((e) => (
                        <option key={e.name} value={e.name}>
                          {e.employee_name} ({e.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Saudi 3. Wakala Admin */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <Building2 className="h-3.5 w-3.5 text-amber-600" /> Wakala Foreign Agency Administrator
                    </Label>
                    <select
                      value={wakalaStaffId}
                      onChange={(e) => setWakalaStaffId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {employees.map((e) => (
                        <option key={e.name} value={e.name}>
                          {e.employee_name} ({e.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
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
                      collaboratingIds.length === employees.length
                        ? [employees[0]?.name].filter(Boolean)
                        : employees.map((e) => e.name)
                    )
                  }
                  className="h-6 text-[11px] text-emerald-800 dark:text-emerald-400"
                >
                  {collaboratingIds.length === employees.length ? "Clear" : "Select All"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {employees.map((emp) => {
                  const isChecked = collaboratingIds.includes(emp.name);
                  return (
                    <div
                      key={emp.name}
                      onClick={() => toggleCollaborator(emp.name)}
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
                            {emp.employee_name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {emp.role_type || "Operations"} • {emp.email}
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
