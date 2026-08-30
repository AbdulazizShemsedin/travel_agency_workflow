"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  FileCheck2,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
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
import {
  updateEmbassyClearanceApi,
  submitDsrStampApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";

interface EmbassyWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function EmbassyWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: EmbassyWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editEmbassy") || can(authUser, "createStamp") || can(authUser, "manageClearances");

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Submitted" | "Approved" | "Rejected">("Pending");
  const [submissionDate, setSubmissionDate] = React.useState("");
  const [approvalDate, setApprovalDate] = React.useState("");
  const [feeStatus, setFeeStatus] = React.useState<"Unpaid" | "Paid">("Unpaid");
  const [feeAmount, setFeeAmount] = React.useState<number>(0);
  const [receiptNo, setReceiptNo] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  const [stampNumber, setStampNumber] = React.useState("");
  const [stampDate, setStampDate] = React.useState("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const emb = selectedRow.embassy;
      const stp = selectedRow.stamp;

      setStatus((emb?.status as any) || (stp?.status === "Completed" ? "Approved" : "Pending"));
      setSubmissionDate(emb?.submission_date || "");
      setApprovalDate(emb?.approval_date || "");
      setFeeStatus((emb?.fee_status as any) || "Unpaid");
      setFeeAmount(emb?.fee_amount || 0);
      setReceiptNo(emb?.receipt_no || "");
      setEmployee(emb?.employee || "");
      setStampNumber(stp?.stamp_number || "");
      setStampDate(stp?.stamp_date || "");
    }
  }, [selectedRow]);

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const targetDoc = selectedRow.embassy?.name || selectedRow.dsrName;

      // 1. Update Embassy Clearance if relevant
      if (targetDoc) {
        await updateEmbassyClearanceApi(targetDoc, {
          status,
          submission_date: submissionDate || undefined,
          approval_date: status === "Approved" ? (approvalDate || new Date().toISOString().split("T")[0]) : undefined,
          fee_status: feeStatus,
          fee_amount: Number(feeAmount) || 0,
          receipt_no: receiptNo || undefined,
          employee: employee || undefined,
          destination_country: selectedRow.destinationCountry,
          dsr: selectedRow.dsrName,
        });
      }

      // 2. If Stamp Number is entered, record DSR Stamp
      if (stampNumber.trim() && selectedRow.dsrName) {
        await submitDsrStampApi({
          dsr: selectedRow.dsrName,
          stamp_number: stampNumber.trim(),
          stamp_date: stampDate || new Date().toISOString().split("T")[0],
          status: "Completed",
        });
      }

      // 3. Trigger backend lifecycle recalculation
      try {
        await recalculateApplicantStateApi(selectedRow.applicantId);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`Embassy & Visa Stamping for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Embassy Clearance record.");
    },
  });

  // Columns definition matching EMBASSY Sheet specifications
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
      width: "220px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
            {row.fullName.substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[200px]">
            {row.fullName}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      accessorKey: "passportNumber",
      width: "130px",
      cell: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
          {row.passportNumber}
        </span>
      ),
    },
    {
      id: "wekala",
      header: "WEKALA",
      accessorKey: "wakalaStatus",
      width: "140px",
      align: "center",
      cell: (row) => {
        const isAuth = (row.wakalaStatus || "").toLowerCase().includes("authorized") || (row.wakalaStatus || "").toLowerCase().includes("completed");
        return (
          <Badge
            className={
              isAuth
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
      id: "embassyStatus",
      header: "EMBASSY STATUS",
      accessorKey: "embassyStatus",
      width: "140px",
      align: "center",
      cell: (row) => {
        const isApproved = row.embassyStatus === "Approved" || row.stamp?.status === "Completed";
        const isSubmitted = row.embassyStatus === "Submitted";
        const isRejected = row.embassyStatus === "Rejected";

        return (
          <Badge
            className={
              isApproved
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : isSubmitted
                ? "bg-blue-600 text-white font-semibold text-[10px]"
                : isRejected
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {row.embassyStatus || "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "180px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[170px]">
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
        title="Embassy Clearance & Visa Stamping"
        subtitle="Physical passport submission to diplomatic missions and visa sticker stamping verification."
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
        title="Embassy Submission & Stamping Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              status === "Approved"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : status === "Submitted"
                ? "bg-blue-600 text-white font-bold text-[10px]"
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
        {/* Section 1: Read-Only Travel Context */}
        <DrawerSection title="Candidate & Visa Dossier" icon={Building2}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Destination Embassy" value={selectedRow?.destinationCountry} isReadOnly />
          <DrawerField label="Sponsor Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="MOFA / Visa Number" value={selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Contract Number" value={selectedRow?.contractNumber || "—"} isReadOnly />
        </DrawerSection>

        {/* Section 2: Editable Embassy Clearance Fields */}
        <DrawerSection title="Embassy Submission Details" icon={FileCheck2}>
          <DrawerField label="Embassy Clearance Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Awaiting Submission)</option>
              <option value="Submitted">Submitted (At Embassy)</option>
              <option value="Approved">Approved (Visa Stamped)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </DrawerField>

          <DrawerField label="Embassy Submission Date" isReadOnly={false}>
            <Input
              type="date"
              value={submissionDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Embassy Fee Status" isReadOnly={false}>
            <select
              value={feeStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setFeeStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200"
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
          </DrawerField>

          <DrawerField label="Fee Receipt №" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. REC-88392"
              value={receiptNo}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <div className="sm:col-span-2">
            <DrawerField label="Assigned Embassy Officer" isReadOnly={false}>
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

        {/* Section 3: Stamped Visa Registration (DSR Stamp) */}
        <DrawerSection title="Visa Stamp Registration (DSR)" icon={ShieldCheck}>
          <DrawerField label="Visa Stamp Number" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. 1908334046"
              value={stampNumber}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStampNumber(e.target.value)}
              className="h-9 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Visa Stamped Date" isReadOnly={false}>
            <Input
              type="date"
              value={stampDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStampDate(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
