"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldAlert,
  Award,
  CreditCard,
  Phone,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import {
  OperationalDrawer,
  DrawerField,
  DrawerSection,
} from "../OperationalDrawer";
import { StageFeeSection } from "@/components/operational/StageFeeSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  startClearanceStepV2,
  completeClearanceStepV2,
  reassignClearanceStepV2,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2 } from "@/lib/api/v2/applicants";
import { logStageExpenseV2 } from "@/lib/api/v2/finance";
import { useAuth } from "@/components/providers/AuthProvider";

interface LMISWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function LMISWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: LMISWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  const isAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return norm === "system manager" || norm === "administrator" || norm === "manager" || norm === "agency admin";
    });
  }, [authUser, roles]);

  const canEdit = React.useMemo<boolean>(() => {
    if (isAdmin) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return norm === "saudi lmis" || norm === "kuwait lmis" || norm === "clearance officer";
    });
  }, [isAdmin, roles]);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Issued" | "Rejected">("Pending");
  const [issuedOn, setIssuedOn] = React.useState("");
  const [laborRefNo, setLaborRefNo] = React.useState("");
  const [employee, setEmployee] = React.useState("");

  // LMIS Compliance & Candidate Details
  const [nationalId, setNationalId] = React.useState("");
  const [emergencyContactName, setEmergencyContactName] = React.useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState("");
  const [cocStatus, setCocStatus] = React.useState("Not Started");
  const [examDate, setExamDate] = React.useState("");
  const [insurancePayment, setInsurancePayment] = React.useState("");
  const [lmisPayment, setLmisPayment] = React.useState("");

  // Kuwait LMIS / Police Ashara fields
  const [policeClearanceNo, setPoliceClearanceNo] = React.useState("");
  const [policeClearanceStatus, setPoliceClearanceStatus] = React.useState<"Pending" | "Cleared" | "Rejected">("Pending");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const lms = selectedRow.lms;
      const st = lms?.status;
      if (st === "Issued" || st === "Approved" || st === "Completed" || st === "Complete") {
        setStatus("Issued");
      } else if (st === "Rejected") {
        setStatus("Rejected");
      } else {
        setStatus("Pending");
      }

      setIssuedOn(lms?.date_completed || lms?.issued_on || "");
      setLaborRefNo(selectedRow.laborId || lms?.reference_no || "");
      setEmployee(lms?.assigned_officer || lms?.employee || lms?.completed_by || "");

      const app = (selectedRow.applicant as any) || {};
      setNationalId(app.national_id || lms?.national_id || "");
      setEmergencyContactName(app.emergency_contact_name || app.contact_person || "");
      setEmergencyContactPhone(app.emergency_contact_phone || app.contact_phone || selectedRow.phone || "");
      setCocStatus(app.coc_status || lms?.coc_status || "Not Started");
      setExamDate(app.exam_date || lms?.exam_date || "");
      setInsurancePayment(app.insurance_payment ? String(app.insurance_payment) : "");
      setLmisPayment(app.lmis_payment ? String(app.lmis_payment) : "");

      setPoliceClearanceNo(lms?.police_clearance_no || app.police_clearance_no || "");
      setPoliceClearanceStatus((lms?.police_clearance_status as any) || "Pending");
    }
  }, [selectedRow]);

  // Mutation to persist LMIS changes via authoritative V2 endpoints
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const stepName = selectedRow.clearanceStepName || selectedRow.lms?.name;

      // 1. Scoped narrow LMIS fields (labor_id, national_id, exam_date, coc_status, emergency contacts, payments)
      try {
        await updateApplicantForLmisV2({
          applicant_name: selectedRow.applicantId,
          labor_id: laborRefNo.trim() || undefined,
          national_id: nationalId.trim() || undefined,
          emergency_contact_name: emergencyContactName.trim() || undefined,
          emergency_contact_phone: emergencyContactPhone.trim() || undefined,
          coc_status: cocStatus || undefined,
          exam_date: examDate || undefined,
          insurance_payment: insurancePayment ? Number(insurancePayment) : undefined,
          lmis_payment: lmisPayment ? Number(lmisPayment) : undefined,
        });
      } catch (err: any) {
        console.warn("updateApplicantForLmisV2 warning:", err);
      }

      // If insurance or LMIS payment entered and placement exists, also log stage expenses
      if (selectedRow.dsrName) {
        if (insurancePayment && Number(insurancePayment) > 0) {
          try {
            await logStageExpenseV2(
              Number(insurancePayment),
              "ETB",
              "Insurance Payment",
              selectedRow.dsrName,
              "LMIS Clearance"
            );
          } catch (err: any) {
            console.warn("logStageExpenseV2 insurance error:", err);
          }
        }
        if (lmisPayment && Number(lmisPayment) > 0) {
          try {
            await logStageExpenseV2(
              Number(lmisPayment),
              "ETB",
              "LMIS Ministry Payment",
              selectedRow.dsrName,
              "LMIS Clearance"
            );
          } catch (err: any) {
            console.warn("logStageExpenseV2 lmis payment error:", err);
          }
        }
      }

      // 2. Authoritative Clearance Step State Machine
      if (stepName) {
        if (status === "Issued") {
          await completeClearanceStepV2(stepName, laborRefNo);
        } else if (status === "Pending") {
          // If current step is Pending, mark started
          if (selectedRow.lms?.status === "Pending") {
            await startClearanceStepV2(stepName);
          }
        }

        // 3. Reassign officer if modified by Admin
        if (isAdmin && employee && employee !== (selectedRow.lms?.assigned_officer || selectedRow.lms?.employee)) {
          try {
            await reassignClearanceStepV2(stepName, employee);
          } catch (err: any) {
            console.warn("reassignClearanceStepV2 warning:", err);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`LMIS Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update LMIS Clearance record.");
    },
  });

  // Columns definition matching LMIS Sheet specifications (Exact 14 Columns)
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "no",
      header: "NO",
      width: "50px",
      align: "center",
      sortable: false,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-xs">
          {index ?? 1}
        </span>
      ),
    },
    {
      id: "name",
      header: "NAME",
      accessorKey: "fullName",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
            {row.fullName.substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[180px]">
            {row.fullName}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      accessorKey: "passportNumber",
      width: "120px",
      cell: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
          {row.passportNumber}
        </span>
      ),
    },
    {
      id: "laborId",
      header: "LABOR ID",
      accessorKey: "laborId",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-600 dark:text-zinc-400 font-medium">
          {row.laborId || "—"}
        </span>
      ),
    },
    {
      id: "contractDate",
      header: "CONTRACT DATE",
      accessorKey: "contractDate",
      width: "120px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 font-medium">
          {row.contractDate || "—"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "DURATION FROM CONTRACT",
      accessorKey: "duration",
      width: "140px",
      align: "center",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
          {row.duration ?? 0} DAYS
        </span>
      ),
    },
    {
      id: "medical",
      header: "MEDICAL",
      accessorKey: "medicalStatus",
      width: "90px",
      align: "center",
      cell: (row) => {
        const isFit =
          (row.medicalStatus || "").toUpperCase().includes("FIT") ||
          row.medicalStatus === "Passed";
        return (
          <Badge
            className={
              isFit
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : "bg-rose-600 text-white font-bold text-[10px]"
            }
          >
            {isFit ? "FIT" : "UNFIT"}
          </Badge>
        );
      },
    },
    {
      id: "medDate",
      header: "MED DATE",
      accessorKey: "medicalDate",
      width: "110px",
      cell: (row) => (
        <span className="text-slate-600 dark:text-zinc-400 font-medium">
          {row.medicalDate || "—"}
        </span>
      ),
    },
    {
      id: "mediRemaining",
      header: "MEDI REMAINING",
      accessorKey: "medicalRemaining",
      width: "130px",
      align: "center",
      cell: (row) => {
        const text = row.medicalRemaining || "—";
        const days =
          row.medicalRemainingDays ??
          (typeof row.medicalRemaining === "string"
            ? parseInt(row.medicalRemaining, 10)
            : undefined);
        const isUrgent =
          (days !== undefined && !isNaN(days) && days <= 15) ||
          text.includes("-");
        return (
          <span
            className={cn(
              "font-mono font-semibold text-xs px-2 py-0.5 rounded-md inline-block",
              isUrgent
                ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800/80"
                : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {text}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      accessorKey: "lmisStatus",
      width: "110px",
      align: "center",
      cell: (row) => {
        const st = row.lmisStatus || "Pending";
        return (
          <Badge
            className={
              st === "Issued" || st === "Approved" || st === "Complete" || st === "Completed"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "Rejected"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {st}
          </Badge>
        );
      },
    },
    {
      id: "issueDate",
      header: "ISSUE DATE",
      accessorKey: "issueDate",
      width: "110px",
      cell: (row) => (
        <span className="text-slate-600 dark:text-zinc-400 font-medium">
          {row.issueDate || "—"}
        </span>
      ),
    },
    {
      id: "contact",
      header: "CONTACT",
      accessorKey: "contact",
      width: "150px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 uppercase font-medium truncate block max-w-[140px]">
          {row.contact || "—"}
        </span>
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "160px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[150px]">
          {row.remark || "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      width: "80px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(row);
          }}
          className="h-6 px-2 text-[11px] font-semibold border-emerald-600/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
        >
          Edit
        </Button>
      ),
    },
  ];

  const isKuwait = selectedRow?.destinationCountry === "Kuwait";

  return (
    <>
      <OperationalTable
        title="LMIS / Labor Market Information System"
        subtitle="Ministry of Labor quota clearance, COC credentials, and document compliance."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={selectedRow?.applicantId}
        onRowClick={(row) => setSelectedRow(row)}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
      />

      {/* ------------------------------------------------------------- */}
      {/* Right-Side Operational Drawer                                 */}
      {/* ------------------------------------------------------------- */}
      <OperationalDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="LMIS / Ministry of Labor Clearance Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              status === "Issued"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : status === "Rejected"
                ? "bg-rose-600 text-white font-bold text-[10px]"
                : "bg-amber-500 text-white font-bold text-[10px]"
            }
          >
            {status}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        {/* Section 1: Read-Only Candidate Context */}
        <DrawerSection title="Candidate & Contract Context" icon={User}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Job Position" value={selectedRow?.jobApplied} isReadOnly />
          <DrawerField label="Destination" value={selectedRow?.destinationCountry} isReadOnly />
          <DrawerField label="Assigned Contractor" value={selectedRow?.lockedContractor || "—"} isReadOnly />
          <DrawerField label="Medical Fitness" value={selectedRow?.medicalStatus || "Pending"} isReadOnly />
        </DrawerSection>

        {/* Section 2: Editable LMS Clearance Fields */}
        <DrawerSection title="LMS Clearance Processing" icon={FileCheck2}>
          <DrawerField label="LMS Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending</option>
              <option value="Issued">Issued (Approved)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </DrawerField>

          <DrawerField label="Ministry Issued Date" isReadOnly={false}>
            <Input
              type="date"
              value={issuedOn}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setIssuedOn(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <div className="sm:col-span-2">
            <DrawerField label="Labor ID / Ministry Reference No" isReadOnly={false}>
              <Input
                type="text"
                placeholder="e.g. LMS-ET-2026-9912"
                value={laborRefNo}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setLaborRefNo(e.target.value)}
                className="h-9 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
            </DrawerField>
          </div>

          {/* Kuwait Corridor Sub-Flow: Police Ashara */}
          {isKuwait && (
            <>
              <DrawerField label="Police Ashara Certificate №" isReadOnly={false}>
                <Input
                  type="text"
                  placeholder="e.g. POL-KUW-88123"
                  value={policeClearanceNo}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setPoliceClearanceNo(e.target.value)}
                  className="h-9 text-xs font-mono bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </DrawerField>
              <DrawerField label="Police Clearance Status" isReadOnly={false}>
                <select
                  value={policeClearanceStatus}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setPoliceClearanceStatus(e.target.value as any)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md"
                >
                  <option value="Pending">Pending</option>
                  <option value="Cleared">Cleared (Verified)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </DrawerField>
            </>
          )}

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <DrawerField label="Assigned LMIS Officer (Admin Only)" isReadOnly={false}>
                <select
                  value={employee}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setEmployee(e.target.value)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200 font-medium"
                >
                  <option value="">-- Select Handler Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.full_name ? `${emp.full_name} (${emp.name})` : emp.name}
                    </option>
                  ))}
                </select>
              </DrawerField>
            </div>
          )}
        </DrawerSection>

        {/* Section 3: LMIS Credentials, COC & Ministry Compliance */}
        <DrawerSection title="LMIS Credentials, COC & Payments" icon={Award}>
          <DrawerField label="National ID" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. 100029384812"
              value={nationalId}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setNationalId(e.target.value)}
              className="h-9 text-xs font-mono bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Labour ID / Ministry Ref No" isReadOnly={false}>
            <Input
              type="text"
              placeholder="Enter Labour ID (No default)"
              value={laborRefNo}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setLaborRefNo(e.target.value)}
              className="h-9 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="COC Status" isReadOnly={false}>
            <select
              value={cocStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setCocStatus(e.target.value)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200 font-medium"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Training">In Training</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </DrawerField>

          <DrawerField label="Exam Date" isReadOnly={false}>
            <Input
              type="date"
              value={examDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Contact Person Name" isReadOnly={false}>
            <Input
              type="text"
              placeholder="Emergency contact person"
              value={emergencyContactName}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Contact Person Phone" isReadOnly={false}>
            <Input
              type="tel"
              placeholder="+251 9..."
              value={emergencyContactPhone}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="h-9 text-xs font-mono bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Insurance Payment (ETB)" isReadOnly={false}>
            <div className="relative">
              <Input
                type="number"
                placeholder="504"
                value={insurancePayment}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setInsurancePayment(e.target.value)}
                className="h-9 text-xs font-mono pr-12 bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                ETB
              </span>
            </div>
          </DrawerField>

          <DrawerField label="LMIS Payment (ETB)" isReadOnly={false}>
            <div className="relative">
              <Input
                type="number"
                placeholder="510"
                value={lmisPayment}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setLmisPayment(e.target.value)}
                className="h-9 text-xs font-mono pr-12 bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                ETB
              </span>
            </div>
          </DrawerField>
        </DrawerSection>

        {/* Section 4: Stage Fee Required Logging (Routes to Finance) */}
        <StageFeeSection
          placementId={selectedRow?.dsrName}
          stageName="LMIS Clearance"
          defaultDirection="Expense"
        />
      </OperationalDrawer>
    </>
  );
}
