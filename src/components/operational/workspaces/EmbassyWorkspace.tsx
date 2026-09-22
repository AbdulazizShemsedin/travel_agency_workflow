"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  FileCheck2,
  Calendar,
  User,
  FileText,
  Loader2,
  Puzzle,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Edit3,
  FileDown,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelTextInput, ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  reopenClearanceStepV2,
  recordWakalaPaymentV2,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2, updateApplicantV2, getApplicantV2 } from "@/lib/api/v2/applicants";
import { updatePlacementParsedFieldsV2 } from "@/lib/api/v2/placements";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { downloadInjazDocumentPDF, InjazCandidateData } from "@/lib/pdf/injazDocumentGenerator";

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

  const authUserV2 = authUser
    ? {
        user: authUser.email,
        full_name: authUser.full_name || authUser.email,
        roles: Array.isArray(authUser.roles) ? authUser.roles : [],
      }
    : null;
  const isStrictAdmin = Boolean(
    (authUser?.email || "").toLowerCase() === "administrator" ||
      (authUser?.email || "").toLowerCase() === "admin" ||
      (roles || []).some((r: any) =>
        ["admin", "administrator", "system manager"].includes(
          String(r).trim().toLowerCase()
        )
      ) ||
      (authUserV2?.roles || []).some((r: any) =>
        ["admin", "administrator", "system manager"].includes(
          String(r).trim().toLowerCase()
        )
      )
  );
  const isAdmin =
    isStrictAdmin ||
    (authUserV2?.roles || []).some((r: any) =>
      ["manager", "agency admin"].includes(String(r).trim().toLowerCase())
    );
  const canEdit =
    isAdmin ||
    hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer"]);

  // Edit Modal State (Triggered ONLY via Action 'Edit' button, not row click)
  const [editingRow, setEditingRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Edit Modal (Wakala fee amount and fee date removed as requested)
  const [modalStatus, setModalStatus] = React.useState<
    "Pending" | "Submitted" | "Approved" | "Rejected"
  >("Pending");
  const [modalSubmissionDate, setModalSubmissionDate] = React.useState("");
  const [modalStampNumber, setModalStampNumber] = React.useState("");
  const [modalStampDate, setModalStampDate] = React.useState("");
  const [modalRejectionRemark, setModalRejectionRemark] = React.useState("");
  const [modalEmployee, setModalEmployee] = React.useState("");
  const [modalWakalaStatus, setModalWakalaStatus] = React.useState<"Pending" | "Paid">("Pending");
  const [confirmUnpaidWakala, setConfirmUnpaidWakala] = React.useState(false);
  const [wakalaOverrideReason, setWakalaOverrideReason] = React.useState("");
  const [isRecordingWakala, setIsRecordingWakala] = React.useState(false);

  // Reopen Step Modal State & Mutation
  const [isReopenModalOpen, setIsReopenModalOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");
  const [reopenTargetStatus, setReopenTargetStatus] = React.useState<
    "In Progress" | "Pending" | "Submitted"
  >("In Progress");

  // Sync edit modal state when editingRow changes
  React.useEffect(() => {
    if (!editingRow) return;

    setConfirmUnpaidWakala(false);
    const embassy = editingRow.embassy;
    const st = embassy?.status;
    if (st === "Approved" || st === "Stamped" || editingRow.embassyStatus === "Approved") {
      setModalStatus("Approved");
    } else if (st === "Submitted") {
      setModalStatus("Submitted");
    } else if (st === "Rejected") {
      setModalStatus("Rejected");
    } else {
      setModalStatus("Pending");
    }

    setModalSubmissionDate(embassy?.date_started || embassy?.submission_date || "");
    setModalEmployee(embassy?.assigned_officer || embassy?.employee || "");
    setModalStampNumber(editingRow.visaNumber || (editingRow.applicant as any)?.visa_number || "");
    setModalStampDate(editingRow.appointmentDate || (editingRow.applicant as any)?.stamp_date || "");
    setModalRejectionRemark(embassy?.rejection_remark || (embassy as any)?.notes || editingRow.remark || "");

    const isWakalaPaid = (editingRow.wakalaStatus || "").toLowerCase() === "paid";
    setModalWakalaStatus(isWakalaPaid ? "Paid" : "Pending");
    setWakalaOverrideReason("");
  }, [editingRow]);

  const isEmbassyTerminal = (status?: string) =>
    ["Issued", "Complete", "Completed", "Stamped", "Approved", "Rejected", "Cancelled"].includes(
      status || ""
    );

  // In-cell quick update helper: Visa Number / Stamp Number (Placement.visa_number)
  const handleUpdateVisaNumber = async (row: WorkspaceApplicantRow, visaNo: string) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) {
      toast.error("No linked placement found for candidate.");
      throw new Error("No linked placement found");
    }

    try {
      await updatePlacementParsedFieldsV2(placementName, {
        visa_number: visaNo.trim(),
      });
      toast.success("Visa Number saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["placements"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save visa number");
      throw err;
    }
  };

  // In-cell quick update helper: Status change
  const handleUpdateStatus = async (
    row: WorkspaceApplicantRow,
    newStatus: "Pending" | "Submitted" | "Approved" | "Rejected"
  ) => {
    const stepName = row.clearanceStepName || row.embassy?.name;
    if (!stepName) {
      toast.error("No active Embassy clearance step found for candidate.");
      throw new Error("No active Embassy clearance step found");
    }

    const isRowDeparted =
      row.placementStatus === "Departed" || row.ticketStatus === "Departed";
    if (isRowDeparted) {
      toast.error("Placement is Departed/Cancelled; clearance steps cannot be modified.");
      return;
    }

    try {
      if (newStatus === "Approved") {
        const isSaudi = row.destinationCountry?.toLowerCase().includes("saudi");
        if (isSaudi && (row.wakalaStatus || "").toLowerCase() !== "paid") {
          toast.error("Wakala must be Paid before Embassy documents can be Stamped. Open Edit dialog to apply manager override.");
          return;
        }
        await stampEmbassyStepV2(stepName, row.visaNumber || undefined);
        toast.success(`Embassy visa stamped for ${row.fullName}!`);
      } else if (newStatus === "Submitted") {
        const isSaudi = row.destinationCountry?.toLowerCase().includes("saudi");
        if (isSaudi && (row.wakalaStatus || "").toLowerCase() !== "paid") {
          toast.error("Wakala must be Paid before Embassy documents can be Submitted.");
          return;
        }
        await submitEmbassyStepV2(stepName);
        toast.success(`Embassy documents submitted for ${row.fullName}`);
      } else if (newStatus === "Rejected") {
        await rejectEmbassyStepV2(stepName, "Embassy visa rejected");
        toast.info(`Embassy step marked Rejected for ${row.fullName}`);
      } else if (newStatus === "Pending") {
        await startClearanceStepV2(stepName);
        toast.info(`Embassy step set to Pending for ${row.fullName}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update embassy status");
      throw err;
    }
  };

  // In-cell quick update helper: Remark (Applicant.remarks)
  const handleUpdateRemark = async (row: WorkspaceApplicantRow, remark: string) => {
    try {
      await updateApplicantV2(row.applicantId, {
        remarks: remark,
      });
      toast.success("Remark saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save remark");
      throw err;
    }
  };

  // Modal Save Mutation
  const modalSaveMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.embassy?.name;

      const isRowDeparted =
        editingRow.placementStatus === "Departed" || editingRow.ticketStatus === "Departed";
      if (isRowDeparted) {
        throw new Error("Placement is Departed/Cancelled; clearance steps cannot be edited.");
      }

      if (stepName) {
        const stepStatus = editingRow.embassy?.status;
        const isSaudi = editingRow.destinationCountry?.toLowerCase().includes("saudi");
        const isTaeshirDone =
          editingRow.injaz?.status === "Completed" ||
          editingRow.injaz?.status === "Complete" ||
          editingRow.injaz?.status === "Issued" ||
          editingRow.injaz?.status === "Approved";

        if (modalStatus === "Approved") {
          if (!isEmbassyTerminal(stepStatus) && isSaudi && !isTaeshirDone) {
            throw new Error(
              "Cannot stamp Embassy step: Taeshir clearance must be completed first on the Saudi Arabia corridor."
            );
          }
          if (isSaudi && modalWakalaStatus !== "Paid") {
            if (isAdmin && confirmUnpaidWakala) {
              await stampEmbassyStepV2(
                stepName,
                modalStampNumber || editingRow.visaNumber || undefined,
                wakalaOverrideReason.trim() || "Manager manual override for unpaid Wakala"
              );
            } else {
              throw new Error(
                "Wakala must be Paid before Embassy documents can be Stamped. Please record Wakala payment or provide an authorized manager override."
              );
            }
          } else {
            await stampEmbassyStepV2(
              stepName,
              modalStampNumber || editingRow.visaNumber || undefined
            );
          }
        } else if (
          modalStatus === "Submitted" &&
          stepStatus !== "Submitted" &&
          !isEmbassyTerminal(stepStatus)
        ) {
          if (isSaudi && modalWakalaStatus !== "Paid") {
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
        } else if (modalStatus === "Rejected") {
          if (!modalRejectionRemark.trim()) {
            throw new Error("Rejection remark is required when rejecting Embassy step.");
          }
          await rejectEmbassyStepV2(stepName, modalRejectionRemark.trim());
        } else if (
          modalStatus === "Pending" &&
          stepStatus === "Pending" &&
          !isEmbassyTerminal(stepStatus)
        ) {
          await startClearanceStepV2(stepName);
        }

        // Wakala Status toggle (without fee amount or payment date)
        if (isSaudi) {
          const origWakalaStatus =
            (editingRow.wakalaStatus || "").toLowerCase() === "paid" ? "Paid" : "Pending";
          if (modalWakalaStatus !== origWakalaStatus) {
            try {
              await recordWakalaPaymentV2(stepName, modalWakalaStatus);
            } catch (wErr: any) {
              console.warn("recordWakalaPaymentV2 notice during save:", wErr);
            }
          }
        }

        // Admin reassign officer
        if (
          isAdmin &&
          modalEmployee &&
          modalEmployee !== (editingRow.embassy?.assigned_officer || editingRow.embassy?.employee)
        ) {
          try {
            await reassignClearanceStepV2(stepName, modalEmployee);
          } catch (err: any) {
            console.warn("reassignClearanceStepV2 warning:", err);
          }
        }
      }

      // Update visa number on placement if provided
      const plcName = editingRow.placementId || editingRow.dsrName;
      if (modalStampNumber.trim() && plcName) {
        try {
          await updatePlacementParsedFieldsV2(plcName, {
            visa_number: modalStampNumber.trim(),
          });
        } catch (err) {
          console.warn("Placement visa_number update warning:", err);
        }
      }

      // Update remark on applicant record
      if (modalRejectionRemark.trim()) {
        try {
          await updateApplicantV2(editingRow.applicantId, {
            remarks: modalRejectionRemark.trim(),
          });
        } catch (err) {
          console.warn("Applicant doc update warning:", err);
        }
      }
    },
    onSuccess: async () => {
      toast.success(`Embassy Clearance for ${editingRow?.fullName} updated successfully!`);
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.embassy?.name;
      if (!stepName) return;
      if (!reopenReason.trim()) {
        throw new Error("Reason is required to reopen this clearance step.");
      }
      await reopenClearanceStepV2(stepName, reopenReason.trim(), reopenTargetStatus);
    },
    onSuccess: async () => {
      toast.success("Embassy clearance step reopened successfully!");
      setIsReopenModalOpen(false);
      setReopenReason("");
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  // Excel-like Columns definition with in-cell editing and elevated fields
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "edit",
      header: "EDIT",
      width: "48px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditingRow(row);
          }}
          className="p-1 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
          title="Edit Candidate Record"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      ),
    },
    {
      id: "no",
      header: "NO",
      width: "48px",
      align: "center",
      sortable: false,
      isReadOnly: true,
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
      isReadOnly: true,
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
      isReadOnly: true,
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
      isReadOnly: true,
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-zinc-300">
          {row.destinationCountry || "Saudi Arabia"}
        </span>
      ),
    },
    {
      id: "visaNumber",
      header: "VISA NO",
      accessorKey: "visaNumber",
      width: "150px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.visaNumber || (row.applicant as any)?.visa_number || ""}
          placeholder="Visa #"
          disabled={!canEdit}
          onSave={(val) => handleUpdateVisaNumber(row, val)}
          className="font-mono font-bold text-blue-900 dark:text-blue-300"
        />
      ),
    },
    {
      id: "wakalaStatus",
      header: "WAKALA STATUS",
      width: "130px",
      align: "center",
      isReadOnly: true,
      cell: (row) => {
        const isPaid = (row.wakalaStatus || "").toLowerCase() === "paid";
        return (
          <Badge
            className={`font-semibold text-[10px] ${
              isPaid
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
            }`}
          >
            {isPaid ? "Paid ✓" : "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "submissionDate",
      header: "SUBMISSION DATE",
      width: "140px",
      editable: true,
      cell: (row) => {
        const subDate = row.embassy?.date_started || row.embassy?.submission_date || "";
        return (
          <ExcelDateInput
            value={subDate}
            disabled={!canEdit}
            onSave={async (val) => {
              const stepName = row.clearanceStepName || row.embassy?.name;
              if (stepName && val) {
                await submitEmbassyStepV2(stepName);
                toast.success("Submission date updated");
                onRefresh();
              }
            }}
          />
        );
      },
    },
    {
      id: "sponsor",
      header: "SPONSOR",
      accessorKey: "sponsorName",
      width: "180px",
      isReadOnly: true,
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
      isReadOnly: true,
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
      width: "140px",
      align: "center",
      editable: true,
      cell: (row) => {
        const currentSt = row.embassyStatus || "Pending";
        const normalizedVal =
          currentSt === "Approved" || currentSt === "Stamped" ? "Approved" : currentSt;

        return (
          <ExcelSelect
            value={normalizedVal}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Submitted", label: "Submitted" },
              { value: "Approved", label: "Stamped" },
              { value: "Rejected", label: "Rejected" },
            ]}
            disabled={!canEdit}
            onSave={(val) => handleUpdateStatus(row, val as any)}
            className={
              normalizedVal === "Approved"
                ? "font-bold text-emerald-700 dark:text-emerald-400"
                : normalizedVal === "Submitted"
                ? "font-bold text-blue-700 dark:text-blue-400"
                : normalizedVal === "Rejected"
                ? "font-bold text-rose-700 dark:text-rose-400"
                : "font-semibold text-amber-700 dark:text-amber-400"
            }
          />
        );
      },
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "170px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.remark || row.embassy?.rejection_remark || (row.embassy as any)?.notes || ""}
          placeholder="Remark / Note"
          disabled={!canEdit}
          onSave={(val) => handleUpdateRemark(row, val)}
          className="text-xs"
        />
      ),
    },
    {
      id: "final_action",
      header: "ACTION",
      width: "135px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Injaz PDF Download Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                toast.info("Generating Injaz document...");
                const injazData: InjazCandidateData = {
                  fullName: row.fullName,
                  applicantId: row.applicantId,
                  passportNumber: row.passportNumber,
                  visaNumber: row.visaNumber || (row.applicant as any)?.visa_number || "",
                  sponsorName: row.sponsorName || (row.applicant as any)?.sponsor_name || "",
                  sponsorId: row.sponsorId || (row.applicant as any)?.sponsor_id || "",
                  injazNumber:
                    (row.injaz as any)?.injaz_application_id ||
                    (row as any).injazApplicationId ||
                    (row.injaz as any)?.reference_no ||
                    (row.injaz as any)?.injaz_number ||
                    "",
                  targetJob: row.jobApplied || "House worker",
                  nationality: (row.applicant as any)?.nationality || "Ethiopian",
                  photoUrl: (row.applicant as any)?.photo_passport || (row.applicant as any)?.photograph || "",
                  destinationCountry: row.destinationCountry || "Saudi Arabia",
                };

                if (!injazData.photoUrl && row.applicantId) {
                  try {
                    const freshApp = await getApplicantV2(row.applicantId);
                    const photo =
                      freshApp?.photo_passport ||
                      freshApp?.photograph ||
                      freshApp?.profile_photo_url ||
                      freshApp?.photo_full_body ||
                      "";
                    if (photo) injazData.photoUrl = photo;
                  } catch (appErr) {
                    console.warn("Could not fetch fresh applicant record for photo:", appErr);
                  }
                }

                await downloadInjazDocumentPDF(injazData);
                toast.success("Injaz document downloaded!");
              } catch (err: any) {
                toast.error("Failed to generate Injaz document", {
                  description: formatCleanErrorMessage(err),
                });
              }
            }}
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-emerald-800 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
            title="Download Official Injaz PDF"
          >
            <FileDown className="h-3 w-3" />
            <span>PDF</span>
          </Button>

          {/* Send to Browser Extension Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await sendApplicantToExtension(row.applicant || (row as any));
                if (res.success) {
                  toast.success(`${row.fullName} loaded into Extension!`);
                } else {
                  toast.info(`Candidate dispatched to Extension (${row.applicantId})`);
                }
              } catch (err: any) {
                toast.error("Failed to send candidate to extension", {
                  description: formatCleanErrorMessage(err),
                });
              }
            }}
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
            title="Load into Chrome Extension for MOFA / Visa Platform autofill"
          >
            <Puzzle className="h-3 w-3 text-indigo-500" />
            <span>Extension</span>
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
        selectedRowId={editingRow?.applicantId}
        onRowClick={() => {
          // Explicitly do not open modal on row click as requested
        }}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
      />

      {/* ------------------------------------------------------------- */}
      {/* Edit Modal Dialog (Replaces Side Drawer)                     */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121216] border-slate-200 dark:border-[#2a2a35] p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="uppercase">{editingRow?.fullName}</span>
                    <Badge
                      className={
                        modalStatus === "Approved"
                          ? "bg-emerald-600 text-white font-bold text-[10px]"
                          : modalStatus === "Submitted"
                          ? "bg-blue-600 text-white font-bold text-[10px]"
                          : modalStatus === "Rejected"
                          ? "bg-rose-600 text-white font-bold text-[10px]"
                          : "bg-amber-500 text-white font-bold text-[10px]"
                      }
                    >
                      {modalStatus === "Approved" ? "Stamped" : modalStatus}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                    Passport: <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{editingRow?.passportNumber}</span> | Country: {editingRow?.destinationCountry || "Saudi Arabia"}
                  </DialogDescription>
                </div>
              </div>
              {isEmbassyTerminal(editingRow?.embassy?.status) && isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReopenReason("");
                    setReopenTargetStatus("In Progress");
                    setIsReopenModalOpen(true);
                  }}
                  className="text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reopen Step
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Candidate & Sponsor Dossier Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181f] border border-slate-200 dark:border-[#262632]">
              <div>
                <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Destination Embassy</Label>
                <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                  {editingRow?.destinationCountry || "Saudi Arabia"}
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Sponsor Name</Label>
                <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 uppercase">
                  {editingRow?.sponsorName || "—"}
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Contract Number</Label>
                <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                  {editingRow?.contractNumber || "—"}
                </div>
              </div>
            </div>

            {/* Wakala Section: Fee amount and payment date strictly removed */}
            {editingRow?.destinationCountry?.toLowerCase().includes("saudi") && (
              <div className="rounded-xl border border-slate-200 dark:border-[#2c2c36] p-4 bg-white dark:bg-[#16161c] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span>Wakala Authorization Status</span>
                  </div>
                  <Badge
                    className={
                      modalWakalaStatus === "Paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300"
                    }
                  >
                    Wakala: {modalWakalaStatus}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="w-1/2">
                    <Label className="text-[11px] font-semibold">Wakala Status</Label>
                    <select
                      value={modalWakalaStatus}
                      disabled={!canEdit || isRecordingWakala}
                      onChange={(e) => setModalWakalaStatus(e.target.value as "Pending" | "Paid")}
                      className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      <option value="Pending">Pending (Unpaid)</option>
                      <option value="Paid">Paid (Authorized)</option>
                    </select>
                  </div>

                  {canEdit && (
                    <div className="flex items-end h-9 mt-4">
                      {modalWakalaStatus !== "Paid" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isRecordingWakala}
                          onClick={async () => {
                            const stepName = editingRow?.clearanceStepName || editingRow?.embassy?.name;
                            if (!stepName) return;
                            try {
                              setIsRecordingWakala(true);
                              await recordWakalaPaymentV2(stepName, "Paid");
                              setModalWakalaStatus("Paid");
                              toast.success("Wakala recorded as Paid!");
                              onRefresh();
                            } catch (e: any) {
                              toast.error(e?.message || "Failed to update Wakala status.");
                            } finally {
                              setIsRecordingWakala(false);
                            }
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9"
                        >
                          {isRecordingWakala ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                          Mark Wakala Paid
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRecordingWakala}
                          onClick={async () => {
                            const stepName = editingRow?.clearanceStepName || editingRow?.embassy?.name;
                            if (!stepName) return;
                            try {
                              setIsRecordingWakala(true);
                              await recordWakalaPaymentV2(stepName, "Pending");
                              setModalWakalaStatus("Pending");
                              toast.info("Wakala reverted to Pending.");
                              onRefresh();
                            } catch (e: any) {
                              toast.error(e?.message || "Failed to revert Wakala status.");
                            } finally {
                              setIsRecordingWakala(false);
                            }
                          }}
                          className="text-xs h-9"
                        >
                          Revert to Pending
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Manager Written Override if submitting or stamping unpaid Wakala */}
                {(modalStatus === "Submitted" || modalStatus === "Approved") && modalWakalaStatus !== "Paid" && isAdmin && (
                  <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-2 mt-2">
                    <label className="flex items-start gap-2 cursor-pointer font-semibold text-amber-900 dark:text-amber-200">
                      <input
                        type="checkbox"
                        checked={confirmUnpaidWakala}
                        onChange={(e) => setConfirmUnpaidWakala(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        Manager Override: Proceed with Embassy {modalStatus === "Approved" ? "Stamping" : "Submission"} despite Unpaid Wakala.
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
            )}

            {/* Embassy Stamping & Submission Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Embassy Clearance Status
                </Label>
                <select
                  value={modalStatus}
                  disabled={!canEdit || modalSaveMutation.isPending}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Pending">Pending (Awaiting Submission)</option>
                  <option value="Submitted">Submitted (At Embassy)</option>
                  <option value="Approved">Approved (Visa Stamped)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Embassy Submission Date
                </Label>
                <Input
                  type="date"
                  value={modalSubmissionDate}
                  disabled={!canEdit || modalSaveMutation.isPending}
                  onChange={(e) => setModalSubmissionDate(e.target.value)}
                  className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Visa Stamp Number
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 1908334046"
                  value={modalStampNumber}
                  disabled={!canEdit || modalSaveMutation.isPending}
                  onChange={(e) => setModalStampNumber(e.target.value)}
                  className="h-9 mt-1 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Visa Stamped Date
                </Label>
                <Input
                  type="date"
                  value={modalStampDate}
                  disabled={!canEdit || modalSaveMutation.isPending}
                  onChange={(e) => setModalStampDate(e.target.value)}
                  className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  {modalStatus === "Rejected" ? "Rejection Cause / Remark *" : "Notes & Remarks"}
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Approved by mission / Stamped successfully"
                  value={modalRejectionRemark}
                  disabled={!canEdit || modalSaveMutation.isPending}
                  onChange={(e) => setModalRejectionRemark(e.target.value)}
                  className={`h-9 mt-1 text-xs ${
                    modalStatus === "Rejected"
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30"
                      : "bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  }`}
                />
              </div>

              {/* Handler Employee: Admin only */}
              {isStrictAdmin && (
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Assigned Embassy Officer (Admin Only)
                  </Label>
                  <select
                    value={modalEmployee}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalEmployee(e.target.value)}
                    className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200 font-medium"
                  >
                    <option value="">-- Select Handler Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.name} value={emp.name}>
                        {emp.full_name ? `${emp.full_name} (${emp.name})` : emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Browser Extension Autofill Action */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Puzzle className="h-4 w-4" />
                  Browser Extension Autofill
                </div>
                <div className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                  Load this candidate into the extension for 1-click filling into MOFA / Visa Platform.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!editingRow) return;
                  try {
                    const res = await sendApplicantToExtension(
                      editingRow.applicant || (editingRow as any)
                    );
                    if (res.success) {
                      toast.success("Candidate loaded into Browser Extension!");
                    } else {
                      toast.info("Candidate sent to browser extension.");
                    }
                  } catch (err: any) {
                    toast.error("Failed to send candidate to extension", {
                      description: formatCleanErrorMessage(err),
                    });
                  }
                }}
                className="text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950"
              >
                Send to Extension
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={modalSaveMutation.isPending}
              onClick={() => setEditingRow(null)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={modalSaveMutation.isPending}
              onClick={() => modalSaveMutation.mutate()}
              className="text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
            >
              {modalSaveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reopen Clearance Step */}
      <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#15151b] border-slate-200 dark:border-[#2a2a35]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <RotateCcw className="h-4.5 w-4.5 text-amber-600" />
              Reopen Embassy Clearance Step
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Reversing this step will reset its terminal outcome. A written audit reason is mandatory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Target Status
              </label>
              <select
                value={reopenTargetStatus}
                onChange={(e) => setReopenTargetStatus(e.target.value as any)}
                className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
              >
                <option value="In Progress">In Progress (Default)</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted (At Embassy)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Reason for Reopening <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                placeholder="Explain why this Embassy clearance step needs to be reopened..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reopenMutation.isPending}
              onClick={() => setIsReopenModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reopenMutation.isPending || !reopenReason.trim()}
              onClick={() => reopenMutation.mutate()}
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {reopenMutation.isPending ? "Reopening..." : "Confirm Reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
