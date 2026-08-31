"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  User,
  ShieldCheck,
  Building2,
  FileCheck2,
  Calendar,
  ExternalLink,
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
import { cn } from "@/lib/utils";
import {
  updateInjazClearanceApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";

interface InjazWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function InjazWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: InjazWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editInjaz") || can(authUser, "manageClearances");

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [employee, setEmployee] = React.useState("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const injaz = selectedRow.injaz;
      setStatus((injaz?.status as any) || "Pending");
      setEmployee(injaz?.employee || "");
    }
  }, [selectedRow]);

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const targetDoc = selectedRow.injaz?.name || selectedRow.dsrName;
      if (!targetDoc) {
        throw new Error("No linked Injaz Clearance or DSR record found on backend for this candidate.");
      }

      await updateInjazClearanceApi(targetDoc, {
        status,
        employee: employee || undefined,
        dsr: selectedRow.dsrName,
      });

      // Recalculate lifecycle
      try {
        await recalculateApplicantStateApi(selectedRow.applicantId);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`Injaz Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Injaz Clearance record.");
    },
  });

  // Columns definition matching TE'SHIR / INJAZ Sheet specifications
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
      id: "contract",
      header: "CONTRACT",
      accessorKey: "contractDate",
      width: "110px",
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
        const days = row.medicalRemainingDays ?? (typeof row.medicalRemaining === "string" ? parseInt(row.medicalRemaining, 10) : undefined);
        const isUrgent = (days !== undefined && !isNaN(days) && days <= 15) || text.includes("-");
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
      id: "injazPayment",
      header: "INJAZ PAYMENT",
      accessorKey: "injazPayment",
      width: "120px",
      align: "center",
      cell: (row) => {
        const isPaid = row.injazPayment === "PAID";
        return (
          <Badge
            className={
              isPaid
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {row.injazPayment || "UNPAID"}
          </Badge>
        );
      },
    },
    {
      id: "appointmentDate",
      header: "APPOINTMENT DATE",
      accessorKey: "appointmentDate",
      width: "130px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 font-medium">
          {row.appointmentDate || "—"}
        </span>
      ),
    },
    {
      id: "contact",
      header: "CONTACT",
      accessorKey: "contact",
      width: "160px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 uppercase font-medium truncate block max-w-[150px]">
          {row.contact || "—"}
        </span>
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "150px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[140px]">
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
        title="Te'shir / Injaz MOFA Processing"
        subtitle="Saudi Ministry of Foreign Affairs electronic visa application, fee settlement, and Wafid medical linking."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={selectedRow?.applicantId}
        onRowClick={(row) => setSelectedRow(row)}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
        availableCorridors={["Saudi Arabia"]}
      />

      {/* ------------------------------------------------------------- */}
      {/* Right-Side Operational Drawer                                 */}
      {/* ------------------------------------------------------------- */}
      <OperationalDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Injaz / MOFA Visa Processing Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              status === "Completed"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
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
        {/* Section 1: Read-Only Candidate & Visa Context */}
        <DrawerSection title="Candidate & Visa Dossier Context" icon={User}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Sponsor / Kafeel Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="Sponsor National ID" value={selectedRow?.sponsorId || "—"} isReadOnly />
          <DrawerField label="MOFA Visa Number" value={selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Medical Fitness Status" value={selectedRow?.medicalStatus || "Pending"} isReadOnly />
        </DrawerSection>

        {/* Section 2: Editable Injaz Processing Fields */}
        <DrawerSection title="Injaz Clearance Actions" icon={CreditCard}>
          <DrawerField label="Injaz Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Processing)</option>
              <option value="Completed">Completed (MOFA Cleared)</option>
            </select>
          </DrawerField>

          <DrawerField label="Assigned Injaz Officer" isReadOnly={false}>
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
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
