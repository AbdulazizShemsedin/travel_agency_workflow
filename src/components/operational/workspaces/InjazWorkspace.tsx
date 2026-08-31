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
  CalendarDays,
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
import { demoStore } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/config/env";

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
  const [appointmentDate, setAppointmentDate] = React.useState("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const injaz = selectedRow.injaz;
      setStatus((injaz?.status as any) || "Pending");
      setEmployee(injaz?.employee || (injaz as any)?.assigned_officer || "");
      setAppointmentDate(
        selectedRow.appointmentDate && selectedRow.appointmentDate !== "—"
          ? selectedRow.appointmentDate
          : (injaz as any)?.appointment_date || (injaz as any)?.due_date || "2026-08-25"
      );
    }
  }, [selectedRow]);

  // Mutation to save Te'shir Appointment Date & Status
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;

      if (isDemoMode()) {
        const stepName = selectedRow.injaz?.name || `STEP-${selectedRow.applicantId}`;
        try {
          demoStore.updateClearanceStep(stepName, {
            status: status === "Completed" ? "Completed" : "In Progress",
            appointment_date: appointmentDate,
            due_date: appointmentDate,
            assigned_officer: employee || undefined,
          });
        } catch {}

        demoStore.updateApplicant(selectedRow.applicantId, {
          appointment_date: appointmentDate,
        });
        return;
      }

      const targetDoc = selectedRow.injaz?.name || selectedRow.dsrName;
      if (targetDoc) {
        await updateInjazClearanceApi(targetDoc, {
          status,
          employee: employee || undefined,
          appointment_date: appointmentDate || undefined,
          due_date: appointmentDate || undefined,
          dsr: selectedRow.dsrName,
        } as any);
      }

      // Recalculate lifecycle
      try {
        await recalculateApplicantStateApi(selectedRow.applicantId);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`Te'shir Clearance & Appointment Date for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Te'shir record.");
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
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold text-[10px] border border-blue-300/40 uppercase">
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
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
          {row.passportNumber}
        </span>
      ),
    },
    {
      id: "laborId",
      header: "LABOR ID / NID",
      accessorKey: "laborId",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-600 dark:text-zinc-400 text-xs">
          {row.laborId || (row.applicant as any)?.national_id || "1130373143"}
        </span>
      ),
    },
    {
      id: "contractNumber",
      header: "CONTRACT NO",
      accessorKey: "contractNumber",
      width: "130px",
      cell: (row) => (
        <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 text-xs">
          {row.contractNumber || (row.applicant as any)?.contract_number || "2005450415"}
        </span>
      ),
    },
    {
      id: "visaNumber",
      header: "VISA NUMBER",
      accessorKey: "visaNumber",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 font-medium text-xs">
          {row.visaNumber || (row.applicant as any)?.visa_number || "1908334046"}
        </span>
      ),
    },
    {
      id: "sponsor",
      header: "SPONSOR (KAFEEL)",
      accessorKey: "sponsorName",
      width: "220px",
      cell: (row) => (
        <div className="truncate block max-w-[210px]">
          <span className="font-semibold text-slate-900 dark:text-white uppercase block truncate text-xs">
            {row.sponsorName || (row.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-mono">
            ID: {row.sponsorId || (row.applicant as any)?.sponsor_id || "1130373143"}
          </span>
        </div>
      ),
    },
    {
      id: "injazNumber",
      header: "INJAZ NO",
      accessorKey: "injaz",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-xs text-blue-950 dark:text-blue-300 font-bold">
          {(row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || "TSH-2026-449102"}
        </span>
      ),
    },
    {
      id: "injazPayment",
      header: "INJAZ PAYMENT",
      accessorKey: "injazPayment",
      width: "120px",
      align: "center",
      cell: (row) => {
        const isPaid = row.injazPayment === "PAID" || (row.injaz as any)?.payment_status === "Paid";
        return (
          <Badge
            className={
              isPaid
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {isPaid ? "PAID" : "UNPAID"}
          </Badge>
        );
      },
    },
    {
      id: "appointmentDate",
      header: "APPOINTMENT DATE",
      accessorKey: "appointmentDate",
      width: "150px",
      cell: (row) => {
        const dateVal =
          row.appointmentDate && row.appointmentDate !== "—"
            ? row.appointmentDate
            : (row.injaz as any)?.appointment_date || "2026-08-25";

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRow(row);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 hover:border-blue-400 transition shadow-2xs"
            title="Click to edit appointment date"
          >
            <CalendarDays className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>{dateVal}</span>
          </button>
        );
      },
    },
    {
      id: "contact",
      header: "CONTACT",
      accessorKey: "contact",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 uppercase font-medium truncate block max-w-[130px] text-xs">
          {row.contact || (row.applicant as any)?.phone || "966503221802"}
        </span>
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[130px] text-xs">
          {row.remark || "Biometrics Scheduled"}
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
          className="h-6 px-2 text-[11px] font-semibold border-blue-600/30 text-blue-900 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
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
        subtitle="Saudi Ministry of Foreign Affairs electronic visa application, fee settlement, and biometric appointment scheduling."
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
        title="Te'shir / MOFA Visa Processing Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              status === "Completed"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : "bg-blue-600 text-white font-bold text-[10px]"
            }
          >
            {status}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        {/* Section 1: Read-Only Candidate & Contract Context */}
        <DrawerSection title="Candidate & Contract Dossier Context" icon={User}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField
            label="Contract Number"
            value={selectedRow?.contractNumber || (selectedRow?.applicant as any)?.contract_number || "2005450415"}
            isReadOnly
          />
          <DrawerField
            label="Sponsor / Kafeel Name"
            value={selectedRow?.sponsorName || (selectedRow?.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
            isReadOnly
          />
          <DrawerField
            label="Sponsor National ID"
            value={selectedRow?.sponsorId || (selectedRow?.applicant as any)?.sponsor_id || "1130373143"}
            isReadOnly
          />
          <DrawerField
            label="MOFA Visa Number"
            value={selectedRow?.visaNumber || (selectedRow?.applicant as any)?.visa_number || "1908334046"}
            isReadOnly
          />
          <DrawerField
            label="Saudi Agency (Contractor)"
            value={(selectedRow?.applicant as any)?.contractor_name || "Tihamat Asir Recruitment company"}
            isReadOnly
          />
          <DrawerField
            label="Monthly Wage"
            value="1,000 SAR"
            isReadOnly
          />
        </DrawerSection>

        {/* Section 2: Editable Te'shir & Appointment Processing Fields */}
        <DrawerSection title="Te'shir Appointment & Clearance Actions" icon={CalendarDays}>
          <DrawerField label="Te'shir Appointment Date" isReadOnly={false}>
            <input
              type="date"
              value={appointmentDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            />
          </DrawerField>

          <DrawerField label="Te'shir Clearance Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Biometrics Scheduled)</option>
              <option value="Completed">Completed (MOFA Biometrics Endorsed)</option>
            </select>
          </DrawerField>

          <DrawerField label="Assigned Te'shir Officer" isReadOnly={false}>
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
