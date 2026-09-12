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
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  startClearanceStepV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
  reassignClearanceStepV2,
  getClearanceStepDocV2,
  recordWakalaPaymentV2,
} from "@/lib/api/v2/clearance";
import { getApplicantV2 } from "@/lib/api/v2/applicants";
import { logStageExpenseV2 } from "@/lib/api/v2/finance";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
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

  const authUserV2 = authUser ? { user: authUser.email, full_name: authUser.full_name || authUser.email, roles: Array.isArray(authUser.roles) ? authUser.roles : [] } : null;
  const isAdmin = hasAnyV2Role(authUserV2, ["Admin"] as any) || (authUserV2?.roles || []).some((r) => ["admin", "administrator", "system manager", "manager", "agency admin"].includes(String(r).trim().toLowerCase())) || (authUser?.email || "").toLowerCase() === "administrator";
  const canEdit = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer"]);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Submitted" | "Approved" | "Rejected">("Pending");
  const [submissionDate, setSubmissionDate] = React.useState("");
  const [feeStatus, setFeeStatus] = React.useState<"Unpaid" | "Paid">("Unpaid");
  const [embassyFee, setEmbassyFee] = React.useState("");
  const [receiptNo, setReceiptNo] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  const [stampNumber, setStampNumber] = React.useState("");
  const [stampDate, setStampDate] = React.useState("");
  const [rejectionRemark, setRejectionRemark] = React.useState("");
  const [confirmUnpaidWakala, setConfirmUnpaidWakala] = React.useState(false);
  const [wakalaStatus, setWakalaStatus] = React.useState<"Pending" | "Paid">("Pending");
  const [wakalaAmount, setWakalaAmount] = React.useState("");
  const [wakalaPaidDate, setWakalaPaidDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [wakalaOverrideReason, setWakalaOverrideReason] = React.useState("");
  const [isRecordingWakala, setIsRecordingWakala] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const isEmbassyOfficer =
    hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer", "Embassy Officer"] as any) ||
    roles.some((r) => ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer", "Embassy Officer", "Embassy"].includes(r));
  const isAssignedOfficer = Boolean(
    authUser?.email &&
      (selectedRow?.embassy?.assigned_officer === authUser.email || (selectedRow as any)?.assigned_officer === authUser.email)
  );
  const canUpdateWakala = isAdmin || isEmbassyOfficer || isAssignedOfficer;

  const currentEmbassyStatus = selectedRow?.embassy?.status;
  const isEmbassyTerminal = ["Issued", "Complete", "Completed", "Stamped", "Rejected", "Cancelled"].includes(currentEmbassyStatus || "");

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (!selectedRow) return;

    let isMounted = true;

    // 1. Initialize synchronously from table row
    setConfirmUnpaidWakala(false);
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
    setEmbassyFee((embassy as any)?.fee ? String((embassy as any).fee) : (embassy as any)?.amount ? String((embassy as any).amount) : "");
    setReceiptNo(embassy?.reference_no || embassy?.receipt_no || "");
    setEmployee(embassy?.assigned_officer || embassy?.employee || "");
    setStampNumber(selectedRow.visaNumber || (selectedRow.applicant as any)?.visa_number || "");
    setStampDate(selectedRow.appointmentDate || (selectedRow.applicant as any)?.stamp_date || "");
    setRejectionRemark(embassy?.rejection_remark || (embassy as any)?.notes || "");

    const isWakalaPaid = (selectedRow.wakalaStatus || "").toLowerCase() === "paid";
    setWakalaStatus(isWakalaPaid ? "Paid" : "Pending");
    setWakalaAmount(selectedRow.wakalaAmount ? String(selectedRow.wakalaAmount) : "");
    setWakalaPaidDate(selectedRow.wakalaPaidDate || new Date().toISOString().split("T")[0]);
    setWakalaOverrideReason("");

    // 2. Fetch fresh clearance step doc and fresh applicant in background
    const stepName = selectedRow.clearanceStepName || selectedRow.embassy?.name;
    Promise.all([
      stepName ? getClearanceStepDocV2(stepName).catch(() => null) : null,
      getApplicantV2(selectedRow.applicantId).catch(() => null),
    ]).then(([freshStep, freshApp]) => {
      if (!isMounted) return;
      if (freshStep) {
        if (freshStep.status === "Approved" || freshStep.status === "Stamped") {
          setStatus("Approved");
        } else if (freshStep.status === "Submitted") {
          setStatus("Submitted");
        } else if (freshStep.status === "Rejected") {
          setStatus("Rejected");
        }
        if (freshStep.date_started) setSubmissionDate(freshStep.date_started);
        const fPaid = (freshStep.payment_status || "").toLowerCase().includes("paid");
        setFeeStatus(fPaid ? "Paid" : "Unpaid");
        if (freshStep.amount || (freshStep as any).fee) {
          setEmbassyFee(String(freshStep.amount || (freshStep as any).fee));
        }
        if (freshStep.reference_no) setReceiptNo(freshStep.reference_no);
        if (freshStep.assigned_officer || freshStep.employee || freshStep.completed_by) {
          setEmployee(freshStep.assigned_officer || freshStep.employee || freshStep.completed_by);
        }
        if (freshStep.rejection_remark || freshStep.notes) {
          setRejectionRemark(freshStep.rejection_remark || freshStep.notes || "");
        }
        if (freshStep.wakala_status) {
          setWakalaStatus(freshStep.wakala_status === "Paid" ? "Paid" : "Pending");
        }
        if (freshStep.wakala_amount) {
          setWakalaAmount(String(freshStep.wakala_amount));
        }
        if ((freshStep as any).paid_date || (freshStep as any).wakala_paid_date) {
          setWakalaPaidDate((freshStep as any).paid_date || (freshStep as any).wakala_paid_date);
        }
      }
      if (freshApp) {
        if (freshApp.visa_number) setStampNumber(freshApp.visa_number);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedRow]);

  // Mutation to persist Embassy Clearance via V2 endpoints
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const stepName = selectedRow.clearanceStepName || selectedRow.embassy?.name;

      if (embassyFee && Number(embassyFee) > 0 && selectedRow.dsrName) {
        try {
          await logStageExpenseV2(
            Number(embassyFee),
            "USD",
            "Embassy Visa Stamping Fee",
            selectedRow.dsrName,
            "Embassy"
          );
        } catch (err: any) {
          console.warn("logStageExpenseV2 embassy fee error:", err);
        }
      }

      if (stepName && !isEmbassyTerminal) {
        const stepStatus = selectedRow.embassy?.status;
        const isSaudi = selectedRow.destinationCountry?.toLowerCase().includes("saudi");
        const isTaeshirDone =
          selectedRow.injaz?.status === "Completed" ||
          selectedRow.injaz?.status === "Complete" ||
          selectedRow.injaz?.status === "Issued" ||
          selectedRow.injaz?.status === "Approved";

        if (status === "Approved" && stepStatus !== "Approved" && stepStatus !== "Stamped") {
          if (isSaudi && !isTaeshirDone) {
            throw new Error(
              "Cannot stamp Embassy step: Taeshir clearance must be completed first on the Saudi Arabia corridor."
            );
          }
          await stampEmbassyStepV2(stepName, stampNumber || selectedRow.visaNumber || undefined);
        } else if (status === "Submitted" && stepStatus !== "Submitted") {
          if (isSaudi && wakalaStatus !== "Paid") {
            if (isAdmin && confirmUnpaidWakala) {
              await submitEmbassyStepV2(
                stepName,
                wakalaOverrideReason.trim() || "Manager manual override for unpaid Wakala"
              );
            } else {
              throw new Error(
                "Wakala must be Paid before Embassy documents can be Submitted. Please record Wakala payment or provide an authorized manager override."
              );
            }
          } else {
            await submitEmbassyStepV2(stepName);
          }
        } else if (status === "Rejected" && stepStatus !== "Rejected") {
          if (!rejectionRemark.trim()) {
            throw new Error("Rejection remark is required when rejecting Embassy step.");
          }
          await rejectEmbassyStepV2(stepName, rejectionRemark.trim());
        } else if (status === "Pending" && stepStatus === "Pending") {
          await startClearanceStepV2(stepName);
        }

        // Also persist Wakala payment updates if modified by authorized embassy officer/admin
        if (isSaudi && canUpdateWakala) {
          const origWakalaStatus = (selectedRow.wakalaStatus || "").toLowerCase() === "paid" ? "Paid" : "Pending";
          if (wakalaStatus !== origWakalaStatus || wakalaAmount) {
            try {
              const amt = wakalaAmount ? Number(wakalaAmount) : undefined;
              await recordWakalaPaymentV2(
                stepName,
                wakalaStatus,
                amt,
                wakalaStatus === "Paid" ? (wakalaPaidDate || new Date().toISOString().split("T")[0]) : undefined
              );
            } catch (wErr: any) {
              console.warn("recordWakalaPaymentV2 notice during save:", wErr);
            }
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
      const isStampedNow = status === "Approved";
      if (isStampedNow) {
        toast.success(
          `Embassy visa stamped for ${selectedRow?.fullName}! Placement auto-advanced to Stamped stage.`
        );
      } else {
        toast.success(`Embassy Clearance for ${selectedRow?.fullName} updated successfully!`);
      }
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });
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
      width: "170px",
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-blue-900 dark:text-blue-300 font-bold">
            {row.visaNumber || (row.applicant as any)?.visa_number || "—"}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                row.wakalaStatus === "Paid"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              }`}
            >
              Wakala: {row.wakalaStatus || "Pending"}
            </span>
            {row.wakalaAmount ? (
              <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-zinc-400">
                ${row.wakalaAmount}
              </span>
            ) : null}
          </div>
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
          {row.sponsorName || (row.applicant as any)?.sponsor_name || "—"}
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
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
          {row.duration ?? 0} DAYS
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
        onSave={() => {
          if (isEmbassyTerminal) {
            toast.error(
              `This Embassy step is already finalized (${currentEmbassyStatus}) — status and handler assignments are locked.`
            );
            return;
          }
          setIsConfirmOpen(true);
        }}
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
          {selectedRow?.destinationCountry?.toLowerCase().includes("saudi") && selectedRow?.wakalaStatus !== "Paid" && (
            <div className="sm:col-span-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Wakala Unpaid — Embassy submission should not proceed</span>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  Wakala authorization status is currently {selectedRow?.wakalaStatus || "Pending"}. Embassy submission requires verified Wakala payment.
                </p>
              </div>
            </div>
          )}
          <DrawerField label="Wakala Authorization Status" value={selectedRow?.wakalaStatus || "Pending"} isReadOnly />
          <DrawerField label="Wakala Fee Amount" value={selectedRow?.wakalaAmount ? `$${selectedRow.wakalaAmount}` : "—"} isReadOnly />
          <DrawerField label="Wakala Paid Date" value={selectedRow?.wakalaPaidDate || "—"} isReadOnly />
          <DrawerField label="Contract Attestation №" value={selectedRow?.contractNumber || "—"} isReadOnly />
          <DrawerField label="Foreign Agency Partner" value={selectedRow?.company || selectedRow?.lockedContractor || "—"} isReadOnly />
        </DrawerSection>

        <DrawerSection title="Embassy Submission Details" icon={FileCheck2}>
          {isEmbassyTerminal && (
            <div className="sm:col-span-2 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/60 p-3.5 shadow-xs text-amber-950 dark:text-amber-100 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 mt-0.5">
                <ShieldAlert className="h-4.5 w-4.5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Clearance Step Finalized & Locked
                </p>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
                  This Embassy clearance step is finalized (<span className="font-bold underline">{currentEmbassyStatus}</span>). Status, visa stamp details, and handler assignments are locked by the backend state machine and cannot be modified.
                </p>
              </div>
            </div>
          )}

          {selectedRow?.destinationCountry?.toLowerCase().includes("saudi") &&
            !(
              selectedRow?.injaz?.status === "Completed" ||
              selectedRow?.injaz?.status === "Complete" ||
              selectedRow?.injaz?.status === "Issued" ||
              selectedRow?.injaz?.status === "Approved"
            ) && (
              <div className="sm:col-span-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Taeshir Pending — Stamping Gated on Saudi Corridor</span>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                    Taeshir clearance step is currently {selectedRow?.injaz?.status || "Pending"}. On the Saudi Arabia corridor, Embassy visa stamping requires Taeshir to be completed first.
                  </p>
                </div>
              </div>
            )}

        {/* Saudi Corridor: Wakala Payment & Authorization Management (2026-09-11) */}
        {selectedRow?.destinationCountry?.toLowerCase().includes("saudi") && (
          <DrawerSection title="Wakala Payment & Authorization (Saudi Arabia)" icon={CreditCard}>
            <div className="sm:col-span-2 space-y-3">
              {wakalaStatus !== "Paid" ? (
                <div className="rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Wakala Payment Required for Embassy Submission</span>
                      <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">
                        Wakala is currently <strong>{wakalaStatus}</strong>. Submission to the Saudi Embassy is gated until the Wakala fee is marked as Paid.
                      </p>
                    </div>
                  </div>
                  {canUpdateWakala && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const stepName = selectedRow?.clearanceStepName || selectedRow?.embassy?.name;
                        if (!stepName) return;
                        try {
                          setIsRecordingWakala(true);
                          const amt = wakalaAmount ? Number(wakalaAmount) : undefined;
                          await recordWakalaPaymentV2(
                            stepName,
                            "Paid",
                            amt,
                            wakalaPaidDate || new Date().toISOString().split("T")[0]
                          );
                          setWakalaStatus("Paid");
                          setConfirmUnpaidWakala(false);
                          toast.success("Wakala fee recorded as Paid! Embassy documents can now be submitted.");
                          queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
                          queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
                          onRefresh();
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to record Wakala payment.");
                        } finally {
                          setIsRecordingWakala(false);
                        }
                      }}
                      disabled={isRecordingWakala}
                      className="shrink-0 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
                    >
                      {isRecordingWakala ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3 w-3" />}
                      Mark Wakala Paid
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold">Wakala Payment Verified (Paid)</span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Paid on {wakalaPaidDate || "Record"} {wakalaAmount ? `• Amount: ${wakalaAmount} SAR` : ""}. Embassy documents are eligible for submission.
                      </p>
                    </div>
                  </div>
                  {canUpdateWakala && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const stepName = selectedRow?.clearanceStepName || selectedRow?.embassy?.name;
                        if (!stepName) return;
                        try {
                          setIsRecordingWakala(true);
                          await recordWakalaPaymentV2(stepName, "Pending");
                          setWakalaStatus("Pending");
                          toast.info("Wakala fee reverted to Pending.");
                          queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
                          queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
                          onRefresh();
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to revert Wakala status.");
                        } finally {
                          setIsRecordingWakala(false);
                        }
                      }}
                      disabled={isRecordingWakala}
                      className="shrink-0 text-xs border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100"
                    >
                      Revert to Pending
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold">Wakala Fee Status</Label>
                  <select
                    value={wakalaStatus}
                    disabled={!canUpdateWakala || isRecordingWakala}
                    onChange={(e) => setWakalaStatus(e.target.value as "Pending" | "Paid")}
                    className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="Pending">Pending (Unpaid)</option>
                    <option value="Paid">Paid (Authorized)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Wakala Fee Amount (SAR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2000"
                    value={wakalaAmount}
                    disabled={!canUpdateWakala || isRecordingWakala}
                    onChange={(e) => setWakalaAmount(e.target.value)}
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Payment Date</Label>
                  <Input
                    type="date"
                    value={wakalaPaidDate}
                    disabled={!canUpdateWakala || isRecordingWakala || wakalaStatus !== "Paid"}
                    onChange={(e) => setWakalaPaidDate(e.target.value)}
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Manager Written Override Input if Submitting Unpaid Wakala */}
              {status === "Submitted" && wakalaStatus !== "Paid" && isAdmin && (
                <div className="mt-2 p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer font-semibold text-amber-900 dark:text-amber-200">
                    <input
                      type="checkbox"
                      checked={confirmUnpaidWakala}
                      onChange={(e) => setConfirmUnpaidWakala(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      Manager Override: Proceed with Embassy Submission despite Unpaid Wakala.
                    </span>
                  </label>
                  {confirmUnpaidWakala && (
                    <div>
                      <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Manager Written Override Reason *
                      </Label>
                      <Input
                        type="text"
                        placeholder="e.g. Approved by Operations Manager / Foreign agency verified offline"
                        value={wakalaOverrideReason}
                        onChange={(e) => setWakalaOverrideReason(e.target.value)}
                        className="h-8 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-amber-300 dark:border-amber-800"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </DrawerSection>
        )}

          <DrawerField label="Embassy Clearance Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending || isEmbassyTerminal}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white disabled:opacity-60"
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
                  disabled={!canEdit || mutation.isPending || isEmbassyTerminal}
                  onChange={(e) => setEmployee(e.target.value)}
                  className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200 font-medium disabled:opacity-60"
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

        {/* Stage Fee Required Logging (Routes to Finance) */}
        <StageFeeSection
          placementId={selectedRow?.dsrName}
          stageName="Embassy Clearance"
          defaultDirection="Expense"
        />
      </OperationalDrawer>

      {/* ------------------------------------------------------------- */}
      {/* Finalize / Save Confirmation Dialog                           */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md border-amber-200 dark:border-amber-800 bg-white dark:bg-[#121216]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {status === "Approved" ? "Confirm Embassy Visa Stamping" : "Confirm Save Changes"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Review your changes before submitting to the live database.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Eye-catching yellow warning box */}
            <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/60 p-3.5 text-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100 mb-0.5">
                    Permanent Action Warning
                  </p>
                  <p>
                    {status === "Approved" ? (
                      <>
                        Setting this clearance step to <strong className="underline">Approved (Stamped)</strong> will permanently finalize it. Once saved, the <strong>backend state machine strictly locks this step</strong> and any further changes or status reversals are <strong>not allowed</strong>.
                      </>
                    ) : status === "Rejected" ? (
                      <>
                        Rejecting this embassy clearance step will mark it as terminal. Once saved, this action cannot be undone on the live database without administrator intervention.
                      </>
                    ) : (
                      <>
                        Once submitted, embassy clearance updates are recorded on the live server. Please verify all information is accurate before confirming.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Candidate & Field Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-[#26262f] bg-slate-50/60 dark:bg-[#16161c] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Candidate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRow?.fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Embassy Status to Apply:</span>
                <Badge
                  className={
                    status === "Approved"
                      ? "bg-emerald-600 text-white font-bold text-[10px]"
                      : status === "Rejected"
                      ? "bg-rose-600 text-white font-bold text-[10px]"
                      : status === "Submitted"
                      ? "bg-blue-600 text-white font-bold text-[10px]"
                      : "bg-amber-500 text-white font-bold text-[10px]"
                  }
                >
                  {status === "Approved" ? "Stamped" : status}
                </Badge>
              </div>
              {stampNumber && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Visa / Stamp №:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{stampNumber}</span>
                </div>
              )}
              {submissionDate && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Submission Date:</span>
                  <span className="text-slate-800 dark:text-zinc-200">{submissionDate}</span>
                </div>
              )}
              {receiptNo && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Receipt / Ref №:</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200">{receiptNo}</span>
                </div>
              )}
              {embassyFee && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-zinc-400">Embassy Fee:</span>
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    ${embassyFee} USD
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => setIsConfirmOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel / Review
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => {
                setIsConfirmOpen(false);
                mutation.mutate();
              }}
              className="text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
            >
              {mutation.isPending ? "Submitting..." : "Yes, Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
