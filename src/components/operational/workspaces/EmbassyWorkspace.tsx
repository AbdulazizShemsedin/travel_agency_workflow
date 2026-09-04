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
  FileText,
  Loader2,
  Sparkles,
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
  startClearanceStepV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
  reassignClearanceStepV2,
} from "@/lib/api/v2/clearance";
import { useAuth } from "@/components/providers/AuthProvider";
import { sendApplicantToExtension } from "@/lib/extensionBridge";

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
      return norm === "saudi embassy" || norm === "kuwait embassy" || norm === "clearance officer";
    });
  }, [isAdmin, roles]);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Submitted" | "Approved" | "Rejected">("Pending");
  const [submissionDate, setSubmissionDate] = React.useState("");
  const [feeStatus, setFeeStatus] = React.useState<"Unpaid" | "Paid">("Unpaid");
  const [receiptNo, setReceiptNo] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  const [stampNumber, setStampNumber] = React.useState("");
  const [stampDate, setStampDate] = React.useState("");
  const [rejectionRemark, setRejectionRemark] = React.useState("");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const embassy = selectedRow.embassy;
      const st = embassy?.status;
      if (st === "Approved" || st === "Stamped" || selectedRow.embassyStatus === "Approved") {
        setStatus("Approved");
      } else if (st === "Submitted") {
        setStatus("Submitted");
      } else if (st === "Rejected") {
        setStatus("Rejected");
      } else {
        setStatus("Pending");
      }

      setSubmissionDate(embassy?.date_started || embassy?.submission_date || "");
      const isPaid = (embassy?.payment_status || "").toLowerCase().includes("paid");
      setFeeStatus(isPaid ? "Paid" : "Unpaid");
      setReceiptNo(embassy?.reference_no || embassy?.receipt_no || "");
      setEmployee(embassy?.assigned_officer || embassy?.employee || "");
      setStampNumber(selectedRow.visaNumber || (selectedRow.applicant as any)?.visa_number || "1908334046");
      setStampDate(selectedRow.appointmentDate || (selectedRow.applicant as any)?.creation || new Date().toISOString().split("T")[0]);
      setRejectionRemark(embassy?.rejection_remark || (embassy as any)?.notes || "");
    }
  }, [selectedRow]);

  // Mutation to persist Embassy Clearance via V2 endpoints
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const stepName = selectedRow.clearanceStepName || selectedRow.embassy?.name;

      if (stepName) {
        if (status === "Submitted") {
          await submitEmbassyStepV2(stepName);
        } else if (status === "Approved") {
          await stampEmbassyStepV2(stepName, stampNumber || receiptNo);
        } else if (status === "Rejected") {
          await rejectEmbassyStepV2(stepName, rejectionRemark || "Passport issue / photo mismatch");
        } else if (status === "Pending") {
          if (selectedRow.embassy?.status === "Pending") {
            await startClearanceStepV2(stepName);
          }
        }

        if (isAdmin && employee && employee !== (selectedRow.embassy?.assigned_officer || selectedRow.embassy?.employee)) {
          try {
            await reassignClearanceStepV2(stepName, employee);
          } catch (err: any) {
            console.warn("reassignClearanceStepV2 warning:", err);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`Embassy Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Embassy record.");
    },
  });

  // Columns definition matching EMBASSY Sheet specifications (Exact 9 Columns)
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
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
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
      id: "embassyName",
      header: "DESTINATION EMBASSY",
      accessorKey: "destinationCountry",
      width: "160px",
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-zinc-300">
          {row.destinationCountry || "Saudi Arabia"}
        </span>
      ),
    },
    {
      id: "visaNumber",
      header: "WAKALA & VISA NO",
      accessorKey: "visaNumber",
      width: "160px",
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-blue-900 dark:text-blue-300 font-bold">
            {row.visaNumber || (row.applicant as any)?.visa_number || "1908334046"}
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Wakala: {row.wakalaStatus || "Authorized"}
          </span>
        </div>
      ),
    },
    {
      id: "sponsor",
      header: "SPONSOR",
      accessorKey: "sponsorName",
      width: "180px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 uppercase font-medium truncate block max-w-[170px]">
          {row.sponsorName || (row.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS",
      accessorKey: "embassyStatus",
      width: "130px",
      align: "center",
      cell: (row) => {
        const s = row.embassyStatus || "Pending";
        let colorClass = "bg-amber-500 text-white";
        if (s === "Approved" || s === "Stamped") colorClass = "bg-emerald-600 text-white";
        if (s === "Submitted") colorClass = "bg-blue-600 text-white";
        if (s === "Rejected") colorClass = "bg-rose-600 text-white";

        return (
          <Badge className={`font-semibold text-[10px] ${colorClass}`}>
            {s === "Approved" ? "Stamped" : s}
          </Badge>
        );
      },
    },
    {
      id: "feeStatus",
      header: "EMBASSY FEE",
      width: "110px",
      align: "center",
      cell: (row) => {
        const isPaid = (row.embassy?.payment_status || "").toLowerCase().includes("paid");
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
      id: "action",
      header: "ACTION",
      width: "140px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5">
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
        </div>
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
            {status === "Approved" ? "Stamped" : status}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        <DrawerSection title="Candidate & Visa Dossier" icon={Building2}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Destination Embassy" value={selectedRow?.destinationCountry} isReadOnly />
          <DrawerField label="Sponsor Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="MOFA / Visa Number" value={selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Contract Number" value={selectedRow?.contractNumber || "—"} isReadOnly />
        </DrawerSection>

        <DrawerSection title="Wakala & Attestation" icon={FileText}>
          <DrawerField label="Wakala Authorization Status" value={selectedRow?.wakalaStatus || "Authorized"} isReadOnly />
          <DrawerField label="Contract Attestation №" value={selectedRow?.contractNumber || "2005450415"} isReadOnly />
          <DrawerField label="Foreign Agency Partner" value={selectedRow?.company || selectedRow?.lockedContractor || "Tihamat Asir Recruitment company"} isReadOnly />
        </DrawerSection>

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

          {status === "Rejected" && (
            <div className="sm:col-span-2">
              <DrawerField label="Rejection Cause / Remark" isReadOnly={false}>
                <Input
                  type="text"
                  placeholder="e.g. Passport damage / photo mismatch"
                  value={rejectionRemark}
                  disabled={!canEdit || mutation.isPending}
                  onChange={(e) => setRejectionRemark(e.target.value)}
                  className="h-9 text-xs border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30"
                />
              </DrawerField>
            </div>
          )}

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <DrawerField label="Assigned Embassy Officer (Admin Only)" isReadOnly={false}>
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

        <DrawerSection title="Visa Stamp Registration" icon={ShieldCheck}>
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

        <DrawerSection title="Browser Extension Autofill" icon={Sparkles}>
          <div className="space-y-2 text-xs">
            <p className="text-slate-500 dark:text-zinc-400">
              Load this candidate into the Travel Agency browser extension for instant 1-click autofill into MOFA, Enjaz, or the Embassy Visa Platform.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!selectedRow) return;
                try {
                  const res = await sendApplicantToExtension(selectedRow.applicant || (selectedRow as any));
                  if (res.success) {
                    toast.success("Candidate loaded into Browser Extension for Visa Platform autofill!");
                  } else {
                    toast.info("Candidate ready in browser extension storage.");
                  }
                } catch (err: any) {
                  toast.error("Failed to bridge candidate: " + err.message);
                }
              }}
              className="text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Send to Extension (MOFA / Visa Platform)
            </Button>
          </div>
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
