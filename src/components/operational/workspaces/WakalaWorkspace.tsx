"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  User,
  ShieldCheck,
  Building2,
  PhoneCall,
  Send,
  Loader2,
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
import {
  updateWakalaClearanceApi,
  dispatchWakalaReminderApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";

interface WakalaWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function WakalaWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: WakalaWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editWakala") || can(authUser, "manageClearances");

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [employee, setEmployee] = React.useState("");
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const wakala = selectedRow.wakala;
      setStatus((wakala?.status as any) || "Pending");
      setEmployee(wakala?.employee || "");
    }
  }, [selectedRow]);

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const targetDoc = selectedRow.wakala?.name || selectedRow.dsrName;
      if (!targetDoc) {
        throw new Error("No linked Wakala Clearance or DSR record found on backend for this candidate.");
      }

      await updateWakalaClearanceApi(targetDoc, {
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
      toast.success(`Wakala Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Wakala Clearance record.");
    },
  });

  // Handle manual Musaned Wakala Reminder dispatch
  const handleSendReminder = async () => {
    if (!selectedRow?.dsrName) {
      toast.error("No linked DSR found to dispatch Wakala payment reminder.");
      return;
    }
    setIsSendingReminder(true);
    try {
      const res = await dispatchWakalaReminderApi(selectedRow.dsrName, "both");
      toast.success(res.message?.message || "Wakala reminder dispatched via WhatsApp & Push!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch Wakala reminder.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Columns definition matching Wakala Sheet specifications
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
      id: "sponsor",
      header: "SPONSOR NAME",
      accessorKey: "sponsorName",
      width: "160px",
      cell: (row) => (
        <span className="truncate block max-w-[150px] font-medium uppercase">
          {row.sponsorName || "—"}
        </span>
      ),
    },
    {
      id: "visa",
      header: "VISA #",
      accessorKey: "visaNumber",
      width: "120px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300">
          {row.visaNumber || "—"}
        </span>
      ),
    },
    {
      id: "contract",
      header: "CONTRACT #",
      accessorKey: "contractNumber",
      width: "120px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300">
          {row.contractNumber || "—"}
        </span>
      ),
    },
    {
      id: "contractor",
      header: "PARTNER AGENCY",
      accessorKey: "lockedContractor",
      width: "150px",
      cell: (row) => (
        <span className="truncate block max-w-[140px] text-slate-600 dark:text-zinc-400">
          {row.lockedContractor || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "WAKALA STATUS",
      accessorKey: "wakalaStatus",
      width: "130px",
      align: "center",
      cell: (row) => {
        const isCompleted = (row.wakalaStatus || "").toLowerCase().includes("completed") || (row.wakalaStatus || "").toLowerCase().includes("authorized");
        return (
          <Badge
            className={
              isCompleted
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {row.wakalaStatus || "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "employee",
      header: "CONTACT",
      accessorKey: "contact",
      width: "130px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 truncate block max-w-[120px]">
          {row.contact || "Unassigned"}
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
        title="Wakala / Musaned Electronic Authorization"
        subtitle="Verification of employer electronic power of attorney issued via Musaned Saudi portal."
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
        title="Wakala / Musaned Power of Attorney Details"
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
        leftAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendReminder}
            disabled={isSendingReminder}
            className="h-9 px-3 text-xs font-semibold gap-1.5 border-emerald-600/40 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            {isSendingReminder ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Send Musaned Reminder</span>
          </Button>
        }
      >
        {/* Section 1: Read-Only Sponsor & Contract Context */}
        <DrawerSection title="Sponsor & Contract Authorization" icon={Building2}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Sponsor Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="Sponsor ID" value={selectedRow?.sponsorId || "—"} isReadOnly />
          <DrawerField label="Visa Number" value={selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Contract Number" value={selectedRow?.contractNumber || "—"} isReadOnly />
          <div className="sm:col-span-2">
            <DrawerField label="Partner Recruitment Agency" value={selectedRow?.lockedContractor || "—"} isReadOnly />
          </div>
        </DrawerSection>

        {/* Section 2: Editable Wakala Clearance Fields */}
        <DrawerSection title="Wakala Verification Actions" icon={FileText}>
          <DrawerField label="Wakala Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Awaiting Musaned Verification)</option>
              <option value="Completed">Completed (Wakala Authorized)</option>
            </select>
          </DrawerField>

          <DrawerField label="Assigned Wakala Officer" isReadOnly={false}>
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
