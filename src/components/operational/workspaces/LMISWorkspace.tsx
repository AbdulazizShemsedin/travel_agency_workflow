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
  setLmisStatusV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import {
  updateApplicantForLmisV2,
  updateApplicantV2,
  toClientCocStatus,
  toBackendCocStatus,
  CLIENT_COC_STATUS_OPTIONS,
} from "@/lib/api/v2/applicants";
import { updatePlacementForLmisV2 } from "@/lib/api/v2/placements";
import { renderCvPdfV2 } from "@/lib/api/v2/cv";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";
import { MedicalBadge } from "@/components/ui/MedicalBadge";

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
  const [modalStatus, setModalStatus] = React.useState<string>("Pending");
  const [modalRejectionReasons, setModalRejectionReasons] = React.useState<string[]>([]);
  const [modalRejectionRemark, setModalRejectionRemark] = React.useState("");
  const [modalIssuedOn, setModalIssuedOn] = React.useState("");
  const [modalLaborRefNo, setModalLaborRefNo] = React.useState("");
  const [modalNationalId, setModalNationalId] = React.useState("");
  const [modalEmergencyName, setModalEmergencyName] = React.useState("");
  const [modalEmergencyPhone, setModalEmergencyPhone] = React.useState("");
  const [modalCocStatus, setModalCocStatus] = React.useState("No COC");
  const [modalEmployee, setModalEmployee] = React.useState("");
  const [modalOtherStatus, setModalOtherStatus] = React.useState("");
  const [modalTakenByAgency, setModalTakenByAgency] = React.useState("");
  const [modalTakenByPhone, setModalTakenByPhone] = React.useState("");

  // Rejection Modal State (for in-cell or column selection of REJECTED)
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
  const [rejectionRow, setRejectionRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = React.useState<string[]>([]);
  const [isSavingRejection, setIsSavingRejection] = React.useState(false);

  // OTHER Modal State (for in-cell selection of OTHER)
  const [isOtherModalOpen, setIsOtherModalOpen] = React.useState(false);
  const [otherRow, setOtherRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [otherStatusText, setOtherStatusText] = React.useState("");
  const [isSavingOther, setIsSavingOther] = React.useState(false);

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

  // Placement Contract Fields (N8)
  const [modalEmployerCity, setModalEmployerCity] = React.useState("");
  const [modalEmployerHouseNo, setModalEmployerHouseNo] = React.useState("00");
  const [modalEmployerPhone, setModalEmployerPhone] = React.useState("");
  const [modalEmployerAltPhone, setModalEmployerAltPhone] = React.useState("");
  const [modalContractStartDate, setModalContractStartDate] = React.useState("");
  const [modalContractEndDate, setModalContractEndDate] = React.useState("");

  // Sync edit modal state when editingRow changes
  React.useEffect(() => {
    if (!editingRow) return;

    const lms = (editingRow.lms as any) || {};
    const st = editingRow.lmisStatus || lms?.lmis_status || lms?.status;
    if (st === "Issued" || st === "Approved" || st === "Completed" || st === "Complete" || st === "ISSUED") {
      setModalStatus("ISSUED");
    } else if (st === "Rejected" || st === "REJECTED") {
      setModalStatus("REJECTED");
    } else if (LMIS_WORKING_STATUSES.includes(st as any)) {
      setModalStatus(st);
    } else {
      setModalStatus("Pending");
    }

    const reasons = (editingRow.lmisRejectionReasons || lms?.lmis_rejection_reasons || "")
      .split(/[\n,]/)
      .map((r: string) => r.trim())
      .filter((r: string) => LMIS_REJECTION_REASONS.includes(r as any));
    setModalRejectionReasons(reasons);

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
      toClientCocStatus(editingRow.cocStatus || (editingRow.applicant as any)?.coc_status) || "No COC"
    );
    setModalEmployee(lms?.assigned_officer || lms?.employee || "");
    setModalOtherStatus(lms?.lmis_other_status || "");
    setModalTakenByAgency(lms?.lmis_taken_by_agency || "");
    setModalTakenByPhone(lms?.lmis_taken_by_phone || "");

    // Populate contract fields
    const plm = (editingRow.placement as any) || {};
    setModalEmployerCity(plm?.employer_city || "");
    setModalEmployerHouseNo(plm?.employer_house_number || "00");
    setModalEmployerPhone(plm?.employer_phone || "");
    setModalEmployerAltPhone(plm?.employer_alt_phone || "");
    setModalContractStartDate(plm?.contract_start_date || new Date().toISOString().split("T")[0]);
    setModalContractEndDate(plm?.contract_end_date || "");
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
    if (row.lmisStatus === "ISSUED") {
      toast.error("An issued step cannot be relabelled.");
      return;
    }
    const stepName = row.clearanceStepName || row.lms?.name;
    if (!stepName) {
      toast.error("No active LMIS clearance step found for candidate.");
      throw new Error("No active LMIS clearance step found");
    }

    if (newStatus === "REJECTED") {
      // Open rejection reasons modal
      const existingReasons = (row.lmisRejectionReasons || (row.lms as any)?.lmis_rejection_reasons || "")
        .split(/[\n,]/)
        .map((r: string) => r.trim())
        .filter((r: string) => LMIS_REJECTION_REASONS.includes(r as any));
      setSelectedRejectionReasons(existingReasons);
      setRejectionRow(row);
      setIsRejectionModalOpen(true);
      return;
    }

    if (newStatus === "OTHER") {
      setOtherRow(row);
      setOtherStatusText((row.lms as any)?.lmis_other_status || "");
      setIsOtherModalOpen(true);
      return;
    }

    try {
      await setLmisStatusV2(stepName, newStatus, undefined, row.laborId || undefined);
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

  const handleConfirmOther = async () => {
    if (!otherRow) return;
    if (!otherStatusText.trim()) {
      toast.error("Please enter a custom status description.");
      return;
    }
    const stepName = otherRow.clearanceStepName || otherRow.lms?.name;
    if (!stepName) return;

    try {
      setIsSavingOther(true);
      await setLmisStatusV2(
        stepName,
        "OTHER",
        undefined,
        otherRow.laborId || undefined,
        undefined,
        otherStatusText.trim().slice(0, 140)
      );
      toast.success("LMIS status updated to OTHER");
      setIsOtherModalOpen(false);
      setOtherRow(null);
      setOtherStatusText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] }),
      ]);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setIsSavingOther(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectionRow) return;
    if (selectedRejectionReasons.length === 0) {
      toast.error("Please select at least one rejection reason.");
      return;
    }
    const stepName = rejectionRow.clearanceStepName || rejectionRow.lms?.name;
    if (!stepName) return;

    try {
      setIsSavingRejection(true);
      await setLmisStatusV2(
        stepName,
        "REJECTED",
        selectedRejectionReasons,
        rejectionRow.laborId || undefined
      );
      toast.success("LMIS status updated to REJECTED with specified reasons");
      setIsRejectionModalOpen(false);
      setRejectionRow(null);
      setSelectedRejectionReasons([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] }),
      ]);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record rejection reasons");
    } finally {
      setIsSavingRejection(false);
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
      const cleanCoc = toBackendCocStatus(modalCocStatus);
      const cleanLabor = modalLaborRefNo.trim();
      const safeLabor =
        cleanLabor && !cleanLabor.toUpperCase().startsWith("APP-")
          ? cleanLabor
          : undefined;

      await updateApplicantForLmisV2({
        applicant_name: editingRow.applicantId,
        labor_id: safeLabor,
        coc_status: cleanCoc,
      });

      // Save placement contract fields if linked placement exists (N8)
      const placementName = editingRow.placementId || editingRow.dsrName;
      if (placementName) {
        try {
          await updatePlacementForLmisV2(placementName, {
            employer_city: modalEmployerCity.trim() || undefined,
            employer_house_number: modalEmployerHouseNo.trim() || undefined,
            employer_phone: modalEmployerPhone.trim() || undefined,
            employer_alt_phone: modalEmployerAltPhone.trim() || undefined,
            contract_start_date: modalContractStartDate || undefined,
            contract_end_date: modalContractEndDate || undefined,
          });
        } catch (e) {
          console.warn("Could not save placement contract fields:", e);
        }
      }

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
        if (editingRow.lmisStatus === "ISSUED") {
          // Terminal Issued step: data corrections only
          await completeClearanceStepV2(
            stepName,
            safeLabor,
            undefined,
            modalIssuedOn || undefined
          );
        } else if (modalStatus === "REJECTED") {
          if (modalRejectionReasons.length === 0) {
            throw new Error("At least one rejection reason is required when LMIS status is REJECTED.");
          }
          await setLmisStatusV2(
            stepName,
            "REJECTED",
            modalRejectionReasons,
            safeLabor,
            modalIssuedOn || undefined
          );
        } else if (modalStatus === "OTHER") {
          if (!modalOtherStatus.trim()) {
            throw new Error("Status description is required when LMIS status is OTHER.");
          }
          await setLmisStatusV2(
            stepName,
            "OTHER",
            undefined,
            safeLabor,
            modalIssuedOn || undefined,
            modalOtherStatus.trim().slice(0, 140),
            modalTakenByAgency.trim() || undefined,
            modalTakenByPhone.trim() || undefined
          );
        } else if (modalStatus === "ISSUED") {
          await setLmisStatusV2(
            stepName,
            "ISSUED",
            undefined,
            safeLabor,
            modalIssuedOn || undefined,
            undefined,
            modalTakenByAgency.trim() || undefined,
            modalTakenByPhone.trim() || undefined
          );
        } else if (modalStatus && modalStatus !== "Pending") {
          await setLmisStatusV2(
            stepName,
            modalStatus,
            undefined,
            safeLabor,
            modalIssuedOn || undefined,
            undefined,
            modalTakenByAgency.trim() || undefined,
            modalTakenByPhone.trim() || undefined
          );
        }

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
      isReadOnly: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-zinc-300">
          {row.nationalId || (row.applicant as any)?.national_id || "—"}
        </span>
      ),
    },
    {
      id: "emergencyContact",
      header: "EMERGENCY CONTACT",
      accessorKey: "emergencyContactName",
      width: "150px",
      isReadOnly: true,
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-zinc-300 truncate block">
          {row.emergencyContactName || (row.applicant as any)?.emergency_contact_name || "—"}
        </span>
      ),
    },
    {
      id: "emergencyPhone",
      header: "EMERGENCY PHONE",
      accessorKey: "emergencyContactPhone",
      width: "135px",
      isReadOnly: true,
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-zinc-300">
          {row.emergencyContactPhone || (row.applicant as any)?.emergency_contact_phone || "—"}
        </span>
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
          value={toClientCocStatus(row.cocStatus || (row.applicant as any)?.coc_status) || "No COC"}
          disabled={!canEdit}
          options={[
            {
              value: "No COC",
              label: "No COC",
              badgeClass: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
            },
            {
              value: "On process",
              label: "On process",
              badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            },
            {
              value: "Have COC",
              label: "Have COC",
              badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            },
          ]}
          onSave={(val) => handleUpdateApplicantField(row.applicantId, { coc_status: toBackendCocStatus(val) })}
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
      cell: (row) => (
        <MedicalBadge
          medicalCurrent={row.medicalCurrent}
          fallbackStatus={row.medicalStatus}
          size="sm"
        />
      ),
    },
    {
      id: "status",
      header: "STATUS",
      accessorKey: "lmisStatus",
      width: "170px",
      align: "center",
      editable: true,
      cell: (row) => {
        const isIssued = (row.lmisStatus || "").toUpperCase() === "ISSUED";
        const isPending = !row.lmisStatus || row.lmisStatus === "Pending";
        const options = [
          ...(isPending || !LMIS_WORKING_STATUSES.includes(row.lmisStatus as any)
            ? [
                {
                  value: "Pending",
                  label: "Pending",
                  badgeClass: "bg-amber-500 text-white font-semibold text-[10px]",
                },
              ]
            : []),
          ...LMIS_WORKING_STATUSES.map((st) => ({
            value: st,
            label: st,
            badgeClass:
              st === "ISSUED"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "REJECTED"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : "bg-slate-700 text-white font-semibold text-[10px]",
          })),
        ];

        return (
          <ExcelSelect
            value={row.lmisStatus || "Pending"}
            disabled={!canEdit || isIssued}
            options={options}
            onSave={(val) => handleUpdateStatus(row, val)}
          />
        );
      },
    },
    {
      id: "rejectionReasons",
      header: "REJECTED FOR",
      accessorKey: "lmisRejectionReasons",
      width: "160px",
      cell: (row) => {
        const isRejected = (row.lmisStatus || "").toUpperCase() === "REJECTED";
        if (!isRejected) {
          return <span className="text-slate-400 text-xs">—</span>;
        }
        const reasons = (row.lmisRejectionReasons || (row.lms as any)?.lmis_rejection_reasons || "")
          .split(/[\n,]/)
          .map((r: string) => r.trim())
          .filter(Boolean);

        return (
          <div
            className={cn(
              "flex flex-wrap gap-1 items-center",
              canEdit && "cursor-pointer group"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!canEdit) return;
              setSelectedRejectionReasons(reasons);
              setRejectionRow(row);
              setIsRejectionModalOpen(true);
            }}
            title={canEdit ? "Click to edit rejection reasons" : undefined}
          >
            {reasons.length > 0 ? (
              reasons.map((r: string, i: number) => (
                <Badge
                  key={i}
                  className="bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 text-[10px] font-semibold py-0 px-1.5"
                >
                  {r}
                </Badge>
              ))
            ) : (
              <Badge className="bg-rose-50 text-rose-700 border-dashed border-rose-300 text-[10px] hover:bg-rose-100">
                + Select reasons
              </Badge>
            )}
          </div>
        );
      },
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
      width: "185px",
      align: "center",
      sortable: false,
      cell: (row) => {
        const isStepPending = (!row.lmisStatus || row.lmisStatus === "Pending") && (!(row.lms as any)?.status || (row.lms as any)?.status === "Pending");
        const placementTarget = row.placementId || (typeof row.placement === "string" ? row.placement : (row.placement as any)?.name) || row.dsrName || "";
        const stepTarget = row.clearanceStepName || (row.lms as any)?.name || "";
        const undoDoctype = isStepPending ? "Placement" : "Clearance Step";
        const undoName = isStepPending ? placementTarget : stepTarget;

        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Undo LMIS / Placement Step */}
            {undoName && (
              <UndoLastStepButton
                doctype={undoDoctype}
                name={undoName}
                askOnClick
                onSuccess={onRefresh}
              />
            )}

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
        );
      },
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
                <Label className="text-xs font-semibold text-slate-500">National ID (Read-only)</Label>
                <Input
                  value={modalNationalId || "—"}
                  disabled
                  placeholder="e.g. ET1293847"
                  className="h-8 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Emergency Contact Name (Read-only)</Label>
                <Input
                  value={modalEmergencyName || "—"}
                  disabled
                  placeholder="Contact Name"
                  className="h-8 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-500 cursor-not-allowed uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Emergency Contact Phone (Read-only)</Label>
                <Input
                  value={modalEmergencyPhone || "—"}
                  disabled
                  placeholder="+251..."
                  className="h-8 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">COC Status</Label>
                <select
                  value={toClientCocStatus(modalCocStatus) || "No COC"}
                  onChange={(e) => setModalCocStatus(e.target.value)}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-medium"
                >
                  {CLIENT_COC_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">LMIS Working Status</Label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  disabled={editingRow?.lmisStatus === "ISSUED"}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
                >
                  <option value="Pending">Pending</option>
                  {LMIS_WORKING_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {editingRow?.lmisStatus === "ISSUED" && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    An issued step cannot be relabelled.
                  </p>
                )}
              </div>

              {modalStatus === "OTHER" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-violet-700">
                    Custom Status Description * (up to 140 characters)
                  </Label>
                  <Input
                    maxLength={140}
                    value={modalOtherStatus}
                    onChange={(e) => setModalOtherStatus(e.target.value)}
                    placeholder="Enter custom working status..."
                    className="h-8 text-xs border-violet-300 focus:border-violet-600"
                  />
                </div>
              )}

              {["NO FILE & TAKEN", "HAVE FILE & TAKEN", "TAKEN"].includes(modalStatus) && (
                <div className="grid grid-cols-2 gap-2 sm:col-span-2 p-2.5 rounded-lg border border-slate-200 dark:border-[#26262f] bg-slate-50/50 dark:bg-[#15151a]">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Taken By Agency (Optional)</Label>
                    <Input
                      value={modalTakenByAgency}
                      onChange={(e) => setModalTakenByAgency(e.target.value)}
                      placeholder="Agency name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Taken By Phone (Optional)</Label>
                    <Input
                      value={modalTakenByPhone}
                      onChange={(e) => setModalTakenByPhone(e.target.value)}
                      placeholder="Phone number"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Contract Terms & Employer Info (N8) */}
              <div className="sm:col-span-2 p-3 rounded-xl border border-slate-200 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#15151c] space-y-2.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  LMIS Contract Terms & Employer Info
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Employer City</Label>
                    <Input
                      value={modalEmployerCity}
                      onChange={(e) => setModalEmployerCity(e.target.value)}
                      placeholder="e.g. Riyadh"
                      className="h-7 text-xs bg-white dark:bg-[#101014]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Employer House No.</Label>
                    <Input
                      value={modalEmployerHouseNo}
                      onChange={(e) => setModalEmployerHouseNo(e.target.value)}
                      placeholder="00"
                      className="h-7 text-xs font-mono bg-white dark:bg-[#101014]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Employer Phone</Label>
                    <Input
                      value={modalEmployerPhone}
                      onChange={(e) => setModalEmployerPhone(e.target.value)}
                      placeholder="+966 5..."
                      className="h-7 text-xs font-mono bg-white dark:bg-[#101014]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Employer Alt Phone</Label>
                    <Input
                      value={modalEmployerAltPhone}
                      onChange={(e) => setModalEmployerAltPhone(e.target.value)}
                      placeholder="Alt phone"
                      className="h-7 text-xs font-mono bg-white dark:bg-[#101014]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Contract Begins</Label>
                    <Input
                      type="date"
                      value={modalContractStartDate}
                      onChange={(e) => setModalContractStartDate(e.target.value)}
                      className="h-7 text-xs bg-white dark:bg-[#101014]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Contract Ends</Label>
                    <Input
                      type="date"
                      value={modalContractEndDate}
                      onChange={(e) => setModalContractEndDate(e.target.value)}
                      className="h-7 text-xs bg-white dark:bg-[#101014]"
                    />
                  </div>
                </div>
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

              {modalStatus === "REJECTED" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-rose-700">
                    Rejection Reasons * (Select one or more)
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                    {LMIS_REJECTION_REASONS.map((reason) => {
                      const checked = modalRejectionReasons.includes(reason);
                      return (
                        <label
                          key={reason}
                          className="flex items-center gap-2 text-xs cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setModalRejectionReasons((prev) =>
                                prev.includes(reason)
                                  ? prev.filter((r) => r !== reason)
                                  : [...prev, reason]
                              );
                            }}
                            className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                          />
                          <span
                            className={cn(
                              "text-[11px]",
                              checked
                                ? "font-bold text-rose-800 dark:text-rose-300"
                                : "text-slate-700 dark:text-zinc-300"
                            )}
                          >
                            {reason}
                          </span>
                        </label>
                      );
                    })}
                  </div>
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

      {/* LMIS Rejection Reasons Modal */}
      <Dialog
        open={isRejectionModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsRejectionModalOpen(false);
            setRejectionRow(null);
            setSelectedRejectionReasons([]);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-[#121217] border border-slate-200 dark:border-[#222228]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  LMIS Rejection Reasons
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Select non-compliance reasons for <strong className="uppercase">{rejectionRow?.fullName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Reasons for Rejection * (Select one or more)
            </Label>
            <div className="space-y-1.5 border rounded-xl p-3 bg-slate-50 dark:bg-[#15151c] border-slate-200 dark:border-[#26262e]">
              {LMIS_REJECTION_REASONS.map((reason) => {
                const checked = selectedRejectionReasons.includes(reason);
                return (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 text-xs cursor-pointer select-none py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedRejectionReasons((prev) =>
                          prev.includes(reason)
                            ? prev.filter((r) => r !== reason)
                            : [...prev, reason]
                        );
                      }}
                      className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 border-slate-300 dark:border-zinc-700"
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        checked
                          ? "text-rose-700 dark:text-rose-300 font-semibold"
                          : "text-slate-700 dark:text-zinc-300"
                      )}
                    >
                      {reason}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRejectionModalOpen(false);
                setRejectionRow(null);
                setSelectedRejectionReasons([]);
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSavingRejection || selectedRejectionReasons.length === 0}
              onClick={handleConfirmRejection}
              className="h-8 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-xs"
            >
              {isSavingRejection ? "Saving..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LMIS OTHER Custom Status Modal */}
      <Dialog
        open={isOtherModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsOtherModalOpen(false);
            setOtherRow(null);
            setOtherStatusText("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-[#121217] border border-slate-200 dark:border-[#222228]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Custom LMIS Status
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Enter the office working status for <strong className="uppercase">{otherRow?.fullName}</strong> (up to 140 characters).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Custom Status Description *
            </Label>
            <Input
              maxLength={140}
              value={otherStatusText}
              onChange={(e) => setOtherStatusText(e.target.value)}
              placeholder="e.g. Waiting for ministry re-submission..."
              className="h-8 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOtherModalOpen(false);
                setOtherRow(null);
                setOtherStatusText("");
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSavingOther || !otherStatusText.trim()}
              onClick={handleConfirmOther}
              className="h-8 text-xs font-semibold bg-violet-700 hover:bg-violet-800 text-white shadow-xs"
            >
              {isSavingOther ? "Saving..." : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
