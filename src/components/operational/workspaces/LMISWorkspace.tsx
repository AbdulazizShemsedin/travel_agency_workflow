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
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import {
  OperationalDrawer,
  DrawerField,
  DrawerSection,
} from "../OperationalDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  updateLmsClearanceApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";

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
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editLms") || can(authUser, "manageClearances");

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Issued" | "Rejected">("Pending");
  const [issuedOn, setIssuedOn] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  const [missingDataRequested, setMissingDataRequested] = React.useState(false);
  const [missingDataType, setMissingDataType] = React.useState("GAMCA Medical");
  const [missingDataStatus, setMissingDataStatus] = React.useState<"Pending" | "Received">("Pending");
  const [missingDataNotes, setMissingDataNotes] = React.useState("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const lms = selectedRow.lms;
      setStatus((lms?.status as any) || "Pending");
      setIssuedOn(lms?.issued_on || "");
      setEmployee(lms?.employee || "");
      setMissingDataRequested(Boolean(lms?.missing_data_requested));
      setMissingDataType(lms?.missing_data_type || "GAMCA Medical");
      setMissingDataStatus((lms?.missing_data_status as any) || "Pending");
      setMissingDataNotes(lms?.missing_data_notes || "");
    }
  }, [selectedRow]);

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const targetDoc = selectedRow.lms?.name || selectedRow.dsrName;
      if (!targetDoc) {
        throw new Error("No linked LMS Clearance or DSR record found on backend for this candidate.");
      }

      await updateLmsClearanceApi(targetDoc, {
        status,
        issued_on: status === "Issued" ? (issuedOn || new Date().toISOString().split("T")[0]) : undefined,
        employee: employee || undefined,
        missing_data_requested: missingDataRequested ? 1 : 0,
        missing_data_type: missingDataType || undefined,
        missing_data_status: missingDataStatus,
        missing_data_notes: missingDataNotes || undefined,
        dsr: selectedRow.dsrName,
      });

      // Recalculate lifecycle
      try {
        await recalculateApplicantStateApi(selectedRow.applicantId);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`LMS Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update LMS Clearance record.");
    },
  });

  // Columns definition matching LMIS Sheet specifications
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
      header: "DURATION",
      accessorKey: "duration",
      width: "90px",
      align: "center",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
          {row.duration ?? 0}
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
        const isFit = (row.medicalStatus || "").toUpperCase().includes("FIT") || row.medicalStatus === "Passed";
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
        const isNegative = text.includes("-");
        return (
          <span
            className={cn(
              "font-mono font-semibold text-xs",
              isNegative
                ? "text-rose-600 dark:text-rose-400"
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
              st === "Issued" || st === "Approved"
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
            <DrawerField label="Assigned Officer" isReadOnly={false}>
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
        </DrawerSection>

        {/* Section 3: Missing Data Request Hub */}
        <DrawerSection title="Missing Data Request Management" icon={AlertTriangle}>
          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[#272730] bg-slate-50/70 dark:bg-[#16161c]">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Flag Missing Information
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Notify intake team that the Ministry requires additional documents.
              </span>
            </div>
            <Switch
              checked={missingDataRequested}
              disabled={!canEdit || mutation.isPending}
              onCheckedChange={setMissingDataRequested}
            />
          </div>

          {missingDataRequested && (
            <>
              <DrawerField label="Missing Document Type" isReadOnly={false}>
                <select
                  value={missingDataType}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setMissingDataType(e.target.value)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200"
                >
                  <option value="GAMCA Medical">GAMCA Medical</option>
                  <option value="Police Clearance">Police Clearance</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="COC Certificate">COC Certificate</option>
                  <option value="Passport Copy">Passport Copy</option>
                  <option value="Yellow Card">Yellow Card</option>
                </select>
              </DrawerField>

              <DrawerField label="Missing Data Status" isReadOnly={false}>
                <select
                  value={missingDataStatus}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setMissingDataStatus(e.target.value as any)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200"
                >
                  <option value="Pending">Pending (Awaiting Document)</option>
                  <option value="Received">Received (Resolved)</option>
                </select>
              </DrawerField>

              <div className="sm:col-span-2">
                <DrawerField label="Operational Notes / Ministry Remarks" isReadOnly={false}>
                  <Textarea
                    placeholder="Enter details on why the ministry rejected or requested extra documentation..."
                    value={missingDataNotes}
                    disabled={!canEdit || mutation.isPending}
                    onChange={(e) => setMissingDataNotes(e.target.value)}
                    className="min-h-[70px] text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </DrawerField>
              </div>
            </>
          )}
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
