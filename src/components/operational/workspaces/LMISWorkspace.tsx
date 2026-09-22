"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldAlert,
  RotateCcw,
  Edit3,
  FileDown,
  Puzzle,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import {
  ExcelTextInput,
  ExcelSelect,
  ExcelDateInput,
} from "../ExcelCellComponents";
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
import { cn } from "@/lib/utils";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import {
  startClearanceStepV2,
  completeClearanceStepV2,
  rejectClearanceStepV2,
  reassignClearanceStepV2,
  recordPoliceAsharaV2,
  reopenClearanceStepV2,
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import { renderCvPdfV2 } from "@/lib/api/v2/cv";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
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
    hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS", "Clearance Officer"]);

  const isKuwait = Boolean(
    corridorFilter.toLowerCase() === "kuwait" ||
      corridorFilter.toLowerCase().includes("kuwait")
  );

  // Edit Modal State (Triggered ONLY via Action 'Edit' button, not row click)
  const [editingRow, setEditingRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Edit Modal
  const [modalStatus, setModalStatus] = React.useState<
    "Pending" | "In Progress" | "Issued" | "Rejected"
  >("Pending");
  const [modalRejectionRemark, setModalRejectionRemark] = React.useState("");
  const [modalIssuedOn, setModalIssuedOn] = React.useState("");
  const [modalLaborRefNo, setModalLaborRefNo] = React.useState("");
  const [modalNationalId, setModalNationalId] = React.useState("");
  const [modalEmergencyName, setModalEmergencyName] = React.useState("");
  const [modalEmergencyPhone, setModalEmergencyPhone] = React.useState("");
  const [modalCocStatus, setModalCocStatus] = React.useState("Not Started");
  const [modalEmployee, setModalEmployee] = React.useState("");

  // Kuwait Police Ashara fields
  const [policeAsharaDate, setPoliceAsharaDate] = React.useState("");
  const [policeAsharaStatus, setPoliceAsharaStatus] = React.useState<string>("Pending");
  const [policeAsharaRemark, setPoliceAsharaRemark] = React.useState("");

  // Reopen Step Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");
  const [reopenTargetStatus, setReopenTargetStatus] = React.useState<
    "In Progress" | "Pending"
  >("In Progress");

  // Sync edit modal state when editingRow changes
  React.useEffect(() => {
    if (!editingRow) return;

    const lms = (editingRow.lms as any) || {};
    const st = lms?.status;
    if (st === "Issued" || st === "Approved" || st === "Completed" || st === "Complete") {
      setModalStatus("Issued");
    } else if (st === "Rejected") {
      setModalStatus("Rejected");
    } else if (st === "In Progress") {
      setModalStatus("In Progress");
    } else {
      setModalStatus("Pending");
    }

    setModalRejectionRemark(lms?.rejection_remark || "");
    setModalIssuedOn(
      lms?.date_completed ||
        lms?.issued_on ||
        editingRow.issueDate ||
        ""
    );
    setModalLaborRefNo(editingRow.laborId || "");
    setModalNationalId(editingRow.nationalId || (editingRow.applicant as any)?.national_id || "");
    setModalEmergencyName(
      editingRow.emergencyContactName ||
        (editingRow.applicant as any)?.emergency_contact_name ||
        ""
    );
    setModalEmergencyPhone(
      editingRow.emergencyContactPhone ||
        (editingRow.applicant as any)?.emergency_contact_phone ||
        ""
    );
    setModalCocStatus(
      editingRow.cocStatus || (editingRow.applicant as any)?.coc_status || "Not Started"
    );
    setModalEmployee(lms?.assigned_officer || lms?.employee || "");
  }, [editingRow]);

  // In-cell quick update helper: Applicant fields (Labor ID, National ID, Emergency Contacts, COC)
  const handleUpdateApplicantField = async (
    applicantId: string,
    fieldUpdate: Record<string, any>
  ) => {
    try {
      await updateApplicantForLmisV2({
        applicant_name: applicantId,
        ...fieldUpdate,
      });
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update record");
      throw err;
    }
  };

  // In-cell quick update helper: Remark (Applicant.remarks)
  const handleUpdateRemark = async (applicantId: string, remark: string) => {
    try {
      await updateApplicantV2(applicantId, {
        remarks: remark,
      });
      toast.success("Remark saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update remark");
      throw err;
    }
  };

  // In-cell quick update helper: LMIS clearance step status
  const handleUpdateStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const stepName = row.clearanceStepName || row.lms?.name;
    if (!stepName) {
      toast.error("No active LMIS clearance step found for candidate.");
      throw new Error("No active LMIS clearance step found");
    }

    try {
      if (newStatus === "Issued") {
        await completeClearanceStepV2(stepName, row.laborId || undefined);
      } else if (newStatus === "Rejected") {
        await rejectClearanceStepV2(stepName, "Rejected in LMIS clearance");
      } else if (newStatus === "In Progress") {
        await startClearanceStepV2(stepName);
      }
      toast.success(`LMIS status updated to ${newStatus}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] }),
      ]);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update clearance status");
      throw err;
    }
  };

  // In-cell quick update helper: Issue Date
  const handleUpdateIssueDate = async (row: WorkspaceApplicantRow, newDate: string) => {
    const stepName = row.clearanceStepName || row.lms?.name;
    if (!stepName) {
      toast.error("No active LMIS clearance step found for candidate.");
      throw new Error("No active LMIS clearance step found");
    }

    try {
      await completeClearanceStepV2(
        stepName,
        row.laborId || undefined,
        undefined,
        newDate || undefined
      );
      toast.success("Issued date updated");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update issue date");
      throw err;
    }
  };

  // Modal Save Mutation
  const modalSaveMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.lms?.name;
      const stepStatus = editingRow.lms?.status;
      const isRowDeparted =
        editingRow.placementStatus === "Departed" ||
        editingRow.ticketStatus === "Departed";
      const isStepTerminal =
        ["Issued", "Complete", "Completed", "Stamped", "Rejected", "Cancelled"].includes(
          stepStatus || ""
        ) || isRowDeparted;

      // 1. Scoped narrow LMIS fields (strictly no insurance/lmis payment/coc exam date)
      const cleanCoc =
        modalCocStatus === "Passed"
          ? "Issued"
          : ["Pending", "Issued", "Not Started"].includes(modalCocStatus)
          ? modalCocStatus
          : "Not Started";
      const cleanLabor = modalLaborRefNo.trim();
      const safeLabor =
        cleanLabor && !cleanLabor.toUpperCase().startsWith("APP-")
          ? cleanLabor
          : undefined;

      await updateApplicantForLmisV2({
        applicant_name: editingRow.applicantId,
        labor_id: safeLabor,
        national_id: modalNationalId.trim() || undefined,
        emergency_contact_name: modalEmergencyName.trim() || undefined,
        emergency_contact_phone: modalEmergencyPhone.trim() || undefined,
        coc_status: cleanCoc,
      });

      // 2. Kuwait Police Ashara if applicable
      if (isKuwait && stepName) {
        if (policeAsharaStatus === "Failed" && !policeAsharaRemark.trim()) {
          throw new Error("A remark is required when Police Ashara status is Failed.");
        }
        await recordPoliceAsharaV2(stepName, {
          police_ashara_appointment_date: policeAsharaDate || undefined,
          police_ashara_status: policeAsharaStatus,
          police_ashara_remark: policeAsharaRemark.trim() || undefined,
        });
      }

      // 3. Step status update
      if (stepName && !isRowDeparted) {
        if (isStepTerminal) {
          await completeClearanceStepV2(
            stepName,
            safeLabor,
            undefined,
            modalIssuedOn || undefined
          );
          if (
            isAdmin &&
            modalEmployee &&
            modalEmployee !== (editingRow.lms?.assigned_officer || editingRow.lms?.employee)
          ) {
            try {
              await reassignClearanceStepV2(stepName, modalEmployee);
            } catch (err: any) {
              console.warn("reassignClearanceStepV2 warning:", err);
            }
          }
        } else if (modalStatus === "Issued") {
          await completeClearanceStepV2(
            stepName,
            safeLabor,
            undefined,
            modalIssuedOn || undefined
          );
        } else if (modalStatus === "Rejected") {
          if (!modalRejectionRemark.trim()) {
            throw new Error("A rejection reason is required to reject LMIS clearance.");
          }
          await rejectClearanceStepV2(stepName, modalRejectionRemark.trim());
        } else if (modalStatus === "In Progress" && stepStatus === "Pending") {
          await startClearanceStepV2(stepName);
        }
      }
    },
    onSuccess: async () => {
      toast.success(`LMIS Clearance for ${editingRow?.fullName} updated successfully!`);
      setEditingRow(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] }),
        queryClient.invalidateQueries({ queryKey: ["applicants"] }),
      ]);
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update LMIS record.");
    },
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.lms?.name;
      if (!stepName) return;
      if (!reopenReason.trim()) {
        throw new Error("Reason is required to reopen this clearance step.");
      }
      await reopenClearanceStepV2(stepName, reopenReason.trim(), reopenTargetStatus);
    },
    onSuccess: async () => {
      toast.success("LMIS clearance step reopened successfully!");
      setIsReopenModalOpen(false);
      setReopenReason("");
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reopen clearance step.");
    },
  });

  // Columns definition with Direct Excel-like In-Cell Editing
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "action",
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
      width: "190px",
      isReadOnly: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
            {row.fullName.substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[170px]">
            {row.fullName}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      accessorKey: "passportNumber",
      width: "115px",
      isReadOnly: true,
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
      width: "135px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.laborId}
          disabled={!canEdit}
          placeholder="Enter Labor ID"
          onSave={(val) => handleUpdateApplicantField(row.applicantId, { labor_id: val })}
        />
      ),
    },
    {
      id: "nationalId",
      header: "NATIONAL ID",
      accessorKey: "nationalId",
      width: "135px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.nationalId || (row.applicant as any)?.national_id}
          disabled={!canEdit}
          placeholder="National ID"
          onSave={(val) => handleUpdateApplicantField(row.applicantId, { national_id: val })}
        />
      ),
    },
    {
      id: "emergencyContact",
      header: "EMERGENCY CONTACT",
      accessorKey: "emergencyContactName",
      width: "150px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.emergencyContactName || (row.applicant as any)?.emergency_contact_name}
          disabled={!canEdit}
          uppercase
          placeholder="Contact Name"
          onSave={(val) =>
            handleUpdateApplicantField(row.applicantId, { emergency_contact_name: val })
          }
        />
      ),
    },
    {
      id: "emergencyPhone",
      header: "EMERGENCY PHONE",
      accessorKey: "emergencyContactPhone",
      width: "135px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.emergencyContactPhone || (row.applicant as any)?.emergency_contact_phone}
          disabled={!canEdit}
          placeholder="Phone Number"
          onSave={(val) =>
            handleUpdateApplicantField(row.applicantId, { emergency_contact_phone: val })
          }
        />
      ),
    },
    {
      id: "cocStatus",
      header: "COC STATUS",
      accessorKey: "cocStatus",
      width: "120px",
      align: "center",
      editable: true,
      cell: (row) => (
        <ExcelSelect
          value={row.cocStatus || (row.applicant as any)?.coc_status || "Not Started"}
          disabled={!canEdit}
          options={[
            {
              value: "Not Started",
              label: "Not Started",
              badgeClass: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
            },
            {
              value: "Pending",
              label: "Pending",
              badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            },
            {
              value: "Issued",
              label: "Issued",
              badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            },
          ]}
          onSave={(val) => handleUpdateApplicantField(row.applicantId, { coc_status: val })}
        />
      ),
    },
    {
      id: "contractDate",
      header: "CONTRACT DATE",
      accessorKey: "contractDate",
      width: "115px",
      isReadOnly: true,
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
      width: "100px",
      align: "center",
      isReadOnly: true,
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
      isReadOnly: true,
      cell: (row) => {
        const raw = (row.medicalStatus || "").toUpperCase().trim();
        const isFit =
          raw === "FIT" ||
          raw === "PASSED" ||
          (raw.includes("FIT") && !raw.includes("UNFIT"));
        const isUnfit = raw === "UNFIT" || raw === "FAILED";

        if (isFit) {
          return (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[10px]">
              FIT
            </Badge>
          );
        }
        if (isUnfit) {
          return (
            <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-bold text-[10px]">
              UNFIT
            </Badge>
          );
        }
        return (
          <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-700">
            Pending
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      accessorKey: "lmisStatus",
      width: "125px",
      align: "center",
      editable: true,
      cell: (row) => (
        <ExcelSelect
          value={row.lmisStatus || "Pending"}
          disabled={!canEdit}
          options={[
            {
              value: "Pending",
              label: "Pending",
              badgeClass: "bg-amber-500 text-white font-semibold text-[10px]",
            },
            {
              value: "In Progress",
              label: "In Progress",
              badgeClass: "bg-blue-600 text-white font-semibold text-[10px]",
            },
            {
              value: "Issued",
              label: "Issued",
              badgeClass: "bg-emerald-600 text-white font-semibold text-[10px]",
            },
            {
              value: "Rejected",
              label: "Rejected",
              badgeClass: "bg-rose-600 text-white font-semibold text-[10px]",
            },
          ]}
          onSave={(val) => handleUpdateStatus(row, val)}
        />
      ),
    },
    {
      id: "issueDate",
      header: "ISSUE DATE",
      accessorKey: "issueDate",
      width: "125px",
      editable: true,
      cell: (row) => (
        <ExcelDateInput
          value={row.issueDate}
          disabled={!canEdit}
          onSave={(val) => handleUpdateIssueDate(row, val)}
        />
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      accessorKey: "remark",
      width: "150px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.remark}
          disabled={!canEdit}
          placeholder="Add remark..."
          onSave={(val) => handleUpdateRemark(row.applicantId, val)}
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
          {/* CV / Dossier PDF Download */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                toast.info("Preparing candidate CV PDF...");
                const blob = await renderCvPdfV2(row.applicantId);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `CV_${row.passportNumber || row.applicantId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success("CV downloaded successfully!");
              } catch {
                window.open(`/applicants/${row.applicantId}/cv`, "_blank");
              }
            }}
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-emerald-800 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
            title="Download Candidate CV / Dossier"
          >
            <FileDown className="h-3 w-3" />
            <span>CV</span>
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
            title="Load into Chrome Extension for LMIS / Ministry autofill"
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
        title="LMIS / Labor Market Information System"
        subtitle="Ministry of Labor quota clearance, COC credentials, and document compliance."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={editingRow?.applicantId}
        onRowClick={() => {}}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
      />

      {/* ------------------------------------------------------------- */}
      {/* Focused Edit Modal (Opens only when 'Edit' is clicked)         */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Edit LMIS Clearance Record
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Applicant: <strong className="uppercase">{editingRow?.fullName}</strong> ({editingRow?.passportNumber})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Labor ID</Label>
                <Input
                  value={modalLaborRefNo}
                  onChange={(e) => setModalLaborRefNo(e.target.value)}
                  placeholder="e.g. 10048291"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">National ID</Label>
                <Input
                  value={modalNationalId}
                  onChange={(e) => setModalNationalId(e.target.value)}
                  placeholder="e.g. ET1293847"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Emergency Contact Name</Label>
                <Input
                  value={modalEmergencyName}
                  onChange={(e) => setModalEmergencyName(e.target.value.toUpperCase())}
                  placeholder="Contact Name"
                  className="h-8 text-xs uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Emergency Contact Phone</Label>
                <Input
                  value={modalEmergencyPhone}
                  onChange={(e) => setModalEmergencyPhone(e.target.value)}
                  placeholder="+251..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">COC Status</Label>
                <select
                  value={modalCocStatus}
                  onChange={(e) => setModalCocStatus(e.target.value)}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-medium"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Pending">Pending</option>
                  <option value="Issued">Issued</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">LMIS Status</Label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Issued">Issued (Approved)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Ministry Issued Date</Label>
                <Input
                  type="date"
                  value={modalIssuedOn}
                  onChange={(e) => setModalIssuedOn(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {modalStatus === "Rejected" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-rose-700">
                    Rejection Reason *
                  </Label>
                  <Input
                    value={modalRejectionRemark}
                    onChange={(e) => setModalRejectionRemark(e.target.value)}
                    placeholder="Provide reason for rejection..."
                    className="h-8 text-xs border-rose-300 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Kuwait Police Ashara if applicable */}
            {isKuwait && (
              <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Kuwait Clearance — Police Ashara (CID)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Ashara Date</Label>
                    <Input
                      type="date"
                      value={policeAsharaDate}
                      onChange={(e) => setPoliceAsharaDate(e.target.value)}
                      className="h-7 text-xs bg-white dark:bg-[#15151a]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Ashara Status</Label>
                    <select
                      value={policeAsharaStatus}
                      onChange={(e) => setPoliceAsharaStatus(e.target.value)}
                      className="w-full h-7 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Failed">Failed (Disqualified)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
            {isAdmin &&
              ["Issued", "Rejected", "Complete", "Completed"].includes(
                editingRow?.lms?.status || ""
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReopenModalOpen(true)}
                  className="h-8 px-2.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reopen Step
                </Button>
              )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingRow(null)}
                className="h-8 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={modalSaveMutation.isPending}
                onClick={() => modalSaveMutation.mutate()}
                className="h-8 px-4 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
              >
                {modalSaveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Modal */}
      <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Reopen LMIS Clearance Step</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Provide an authoritative audit reason for resetting this step to an active status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Status</Label>
              <select
                value={reopenTargetStatus}
                onChange={(e) => setReopenTargetStatus(e.target.value as any)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a]"
              >
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Audit Reason *</Label>
              <Input
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Why is this step being reopened?"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReopenModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reopenMutation.isPending || !reopenReason.trim()}
              onClick={() => reopenMutation.mutate()}
              className="h-8 text-xs bg-amber-700 hover:bg-amber-800 text-white"
            >
              {reopenMutation.isPending ? "Reopening..." : "Confirm Reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
