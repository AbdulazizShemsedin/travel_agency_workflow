"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  RotateCcw,
  FileDown,
  Edit3,
  Puzzle,
  Clock,
  Loader2,
} from "lucide-react";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import {
  ExcelTextInput,
  ExcelSelect,
  ExcelDateInput,
} from "../ExcelCellComponents";
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
  completeClearanceStepV2,
  reassignClearanceStepV2,
  reopenClearanceStepV2,
  setTaeshirAppointmentV2,
  setTaeshirStatusV2,
  recordInjazPaymentV2,
  undoForfeitInjazV2,
  forfeitInjazAndRestartV2,
  getInjazPaperV2,
} from "@/lib/api/v2/clearance";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";
import { updateApplicantForLmisV2, getApplicantV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import {
  downloadInjazDocumentPDF,
  InjazCandidateData,
} from "@/lib/pdf/injazDocumentGenerator";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { exportGroupScheduleBioXlsV2 } from "@/lib/api/v2/reports";
import { cn } from "@/lib/utils";

function TableHeaderCheckbox({
  allSelected,
  someSelected,
  onToggleAll,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <div className="flex items-center justify-center p-0.5">
      <input
        ref={ref}
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
        checked={allSelected}
        onChange={onToggleAll}
        onClick={(e) => e.stopPropagation()}
        title={allSelected ? "Deselect all candidates" : "Select all candidates"}
      />
    </div>
  );
}

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
    hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign", "Clearance Officer"]);

  // Edit Modal State (Triggered ONLY via Action 'Edit' button, not row click)
  const [editingRow, setEditingRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Edit Modal (Strictly stripped of fees, receipts, and payment date)
  const [modalStatus, setModalStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [modalAppointmentDate, setModalAppointmentDate] = React.useState("");
  const [modalInjazNumber, setModalInjazNumber] = React.useState("");
  const [modalRemark, setModalRemark] = React.useState("");
  const [modalEmployee, setModalEmployee] = React.useState("");
  const [modalTaeshirStatus, setModalTaeshirStatus] = React.useState("");
  const [modalInjazPaymentStatus, setModalInjazPaymentStatus] = React.useState<"Paid" | "Unpaid" | "Printed">("Unpaid");

  // Reopen Step Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");
  const [reopenTargetStatus, setReopenTargetStatus] = React.useState<
    "In Progress" | "Pending"
  >("In Progress");

  // Missed Appointment Modal state (T1)
  const [missedRow, setMissedRow] = React.useState<WorkspaceApplicantRow | null>(null);
  const [missedReason, setMissedReason] = React.useState("");
  const [missedNewDate, setMissedNewDate] = React.useState("");
  const [missedNewInjazId, setMissedNewInjazId] = React.useState("");
  const [isSubmittingMissed, setIsSubmittingMissed] = React.useState(false);

  const handleConfirmMissed = async () => {
    if (!missedRow) return;
    const stepName = missedRow.clearanceStepName || missedRow.injaz?.name;
    if (!stepName) return;

    setIsSubmittingMissed(true);
    try {
      await forfeitInjazAndRestartV2(
        stepName,
        missedReason.trim() || undefined,
        missedNewDate.trim() || undefined,
        missedNewInjazId.trim() || undefined
      );
      toast.success(`Appointment marked Missed for ${missedRow.fullName}`);
      setMissedRow(null);
      setMissedReason("");
      setMissedNewDate("");
      setMissedNewInjazId("");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark appointment missed");
    } finally {
      setIsSubmittingMissed(false);
    }
  };

  // Sync edit modal state when editingRow changes
  React.useEffect(() => {
    if (!editingRow) return;

    const inj = (editingRow.injaz as any) || {};
    const st = inj?.status;
    setModalStatus(
      st === "Complete" || st === "Completed" || st === "Issued"
        ? "Completed"
        : "Pending"
    );

    setModalInjazNumber(
      inj?.injaz_application_id ||
        (editingRow as any)?.injazApplicationId ||
        inj?.reference_no ||
        inj?.injaz_number ||
        ""
    );

    setModalAppointmentDate(
      inj?.appointment_date ||
        (editingRow.appointmentDate !== "—" ? editingRow.appointmentDate : "") ||
        inj?.date_started ||
        ""
    );

    setModalRemark(editingRow.remark || inj?.notes || inj?.rejection_remark || "");
    setModalEmployee(inj?.assigned_officer || inj?.employee || "");
    setModalTaeshirStatus(inj?.taeshir_status || (editingRow as any)?.taeshir_status || "");

    const rawPayment =
      inj?.injaz_payment_status ||
      (editingRow as any)?.injaz_payment_status ||
      (editingRow.injazPayment === "PAID" ? "Paid" : "Unpaid");
    setModalInjazPaymentStatus(
      rawPayment === "Paid" ? "Paid" : rawPayment === "Printed" ? "Printed" : "Unpaid"
    );
  }, [editingRow]);

  // PDF Generator helper using backend get_injaz_paper values (T10)
  const resolveInjazDataWithFreshPhoto = async (
    row: WorkspaceApplicantRow
  ): Promise<InjazCandidateData> => {
    let paper: any = null;
    const stepOrPlacement = row.clearanceStepName || row.injaz?.name || (row as any).placementName || row.applicantId;
    if (stepOrPlacement) {
      try {
        const res = await getInjazPaperV2(stepOrPlacement);
        paper = (res as any)?.message || res;
      } catch (paperErr) {
        // Fallback to row fields if get_injaz_paper is unavailable
      }
    }

    const injazData: InjazCandidateData = {
      fullName: paper?.full_name || row.fullName || "",
      applicantId: row.applicantId,
      passportNumber: paper?.passport_number || row.passportNumber || "",
      visaNumber: paper?.visa_number || paper?.visa_no || row.visaNumber || (row.applicant as any)?.visa_number || "",
      sponsorName: paper?.sponsor_name || row.sponsorName || (row.applicant as any)?.sponsor_name || "",
      sponsorId: paper?.sponsor_id || row.sponsorId || (row.applicant as any)?.sponsor_id || "",
      sponsorPhone: paper?.sponsor_phone || (row.applicant as any)?.sponsor_phone || "",
      destinationCity: paper?.sponsor_city || paper?.destination_city || (row.applicant as any)?.employer_city || "",
      injazNumber:
        paper?.injaz_number ||
        paper?.injaz_no ||
        (row.injaz as any)?.injaz_application_id ||
        row.injazApplicationId ||
        (row.injaz as any)?.reference_no ||
        (row.injaz as any)?.injaz_number ||
        "",
      targetJob: paper?.profession || paper?.target_job || row.jobApplied || "",
      nationality: paper?.nationality || (row.applicant as any)?.nationality || "",
      photoUrl: paper?.photo || paper?.photo_url || (row.applicant as any)?.photo_passport || (row.applicant as any)?.photograph || "",
      destinationCountry: paper?.destination_country || row.destinationCountry || "",
      motherName: paper?.mother_name || (row.applicant as any)?.mother_name || "",
      placeOfBirth: paper?.place_of_birth || (row.applicant as any)?.place_of_birth || "",
      dateOfBirth: paper?.date_of_birth || (row.applicant as any)?.date_of_birth || "",
      placeOfIssue: paper?.place_of_issue || (row.applicant as any)?.place_of_issue || "",
      passportIssueDate: paper?.issue_date || paper?.passport_issue_date || (row.applicant as any)?.passport_issue_date || "",
      passportExpiry: paper?.expiry_date || paper?.passport_expiry || (row.applicant as any)?.passport_expiry || "",
      maritalStatus: paper?.marital_status || (row.applicant as any)?.marital_status || "",
      religion: paper?.religion || (row.applicant as any)?.religion || "",
      educationLevel: paper?.qualification || paper?.education_level || (row.applicant as any)?.education_level || "",
      city: paper?.city || (row.applicant as any)?.city || "",
      phone: paper?.phone || (row.applicant as any)?.phone || "",
      paymentNo: paper?.payment_no || "",
      appointmentDate: paper?.appointment_date || (row.injaz as any)?.appointment_date || (row.appointmentDate !== "—" ? row.appointmentDate : ""),
      contractorName: paper?.agency_name || paper?.contractor_name || "",
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
    return injazData;
  };

  // In-cell quick update helper: Appointment & Injaz Number
  const handleUpdateInjazAppointment = async (
    row: WorkspaceApplicantRow,
    appointmentDate: string,
    injazNo: string
  ) => {
    const stepName = row.clearanceStepName || row.injaz?.name;
    if (!stepName) {
      toast.error("No active Te'shir clearance step found for candidate.");
      throw new Error("No active Te'shir clearance step found");
    }

    try {
      await setTaeshirAppointmentV2(stepName, appointmentDate, injazNo);
      const candId = row.applicantId || row.applicantName || row.name;
      if (injazNo && candId) {
        try {
          await updateApplicantV2(candId, { application_number: injazNo.trim() });
        } catch (e) {
          console.warn("Failed to sync application_number to applicant:", e);
        }
      }
      toast.success("Te'shir details saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update Te'shir record");
      throw err;
    }
  };

  // In-cell quick update helper: Step Status
  const handleUpdateStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const stepName = row.clearanceStepName || row.injaz?.name;
    if (!stepName) {
      toast.error("No active Te'shir clearance step found for candidate.");
      throw new Error("No active Te'shir clearance step found");
    }

    try {
      if (newStatus === "Completed") {
        const isPaid =
          ((row.injaz as any)?.injaz_payment_status || (row.injazPayment === "PAID" ? "Paid" : ""))
            .toLowerCase() === "paid";
        if (!isPaid) {
          toast.error("Injaz Payment Required", {
            description: "Taeshir cannot be completed until the Injaz payment is marked Paid.",
          });
          return;
        }
        const injazNo =
          (row.injaz as any)?.injaz_application_id ||
          row.injazApplicationId ||
          (row.injaz as any)?.reference_no ||
          (row.injaz as any)?.injaz_number;
        await completeClearanceStepV2(stepName, injazNo || undefined);
      } else {
        await startClearanceStepV2(stepName);
      }
      toast.success(`Te'shir status updated to ${newStatus}`);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
      throw err;
    }
  };

  const handleUpdateTaeshirStatus = async (row: WorkspaceApplicantRow, newStatus: string) => {
    const stepName = row.clearanceStepName || row.injaz?.name;
    if (!stepName) {
      toast.error("No active Te'shir clearance step found.");
      return;
    }
    try {
      await setTaeshirStatusV2(stepName, newStatus);
      toast.success(`Taeshir follow-up status updated to ${newStatus}`);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update follow-up status");
      throw err;
    }
  };

  const handleUpdateInjazPayment = async (
    row: WorkspaceApplicantRow,
    newPayment: "Paid" | "Unpaid" | "Printed"
  ) => {
    const stepName = row.clearanceStepName || row.injaz?.name;
    if (!stepName) {
      toast.error("No active Te'shir clearance step found.");
      return;
    }
    try {
      await recordInjazPaymentV2(stepName, newPayment);
      toast.success(`Injaz payment status updated to ${newPayment}`);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update Injaz payment status");
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

  const [isExportingTaeshir, setIsExportingTaeshir] = React.useState(false);

  // Candidate selection for targeted exports
  const [selectedApplicantIds, setSelectedApplicantIds] = React.useState<Set<string>>(new Set());

  // Clean up selected IDs if data changes or rows are removed
  React.useEffect(() => {
    if (selectedApplicantIds.size === 0) return;
    const validIds = new Set(
      data.map((r) => r.applicantId || (r.applicant as any)?.name).filter(Boolean)
    );
    setSelectedApplicantIds((prev) => {
      let hasOrphan = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          hasOrphan = true;
        }
      }
      return hasOrphan ? next : prev;
    });
  }, [data]);

  const validCandidateIds = React.useMemo(() => {
    return data
      .map((r) => r.applicantId || (r.applicant as any)?.name)
      .filter(Boolean) as string[];
  }, [data]);

  const allSelected =
    validCandidateIds.length > 0 &&
    validCandidateIds.every((id) => selectedApplicantIds.has(id));

  const someSelected =
    validCandidateIds.length > 0 &&
    validCandidateIds.some((id) => selectedApplicantIds.has(id));

  const handleToggleSelectAll = React.useCallback(() => {
    if (allSelected) {
      setSelectedApplicantIds(new Set());
    } else {
      setSelectedApplicantIds(new Set(validCandidateIds));
    }
  }, [allSelected, validCandidateIds]);

  const handleExportTaeshir = async () => {
    try {
      setIsExportingTaeshir(true);
      const selectedIds = Array.from(selectedApplicantIds);
      const isSelective = selectedIds.length > 0;

      const applicantIds = isSelective ? selectedIds : validCandidateIds;

      if (applicantIds.length === 0) {
        toast.error("No candidates in the workspace to export.");
        return;
      }

      toast.info(
        isSelective
          ? `Exporting Taeshir schedule for ${applicantIds.length} selected candidate${applicantIds.length > 1 ? "s" : ""}...`
          : `Exporting Taeshir schedule for all ${applicantIds.length} candidate${applicantIds.length > 1 ? "s" : ""}...`
      );

      const blob = await exportGroupScheduleBioXlsV2(applicantIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fallbackFilename = `Group_Schedule_Bio_Applicants_${new Date().toISOString().split("T")[0]}.xls`;
      a.download = (blob as any).filename || fallbackFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(
        isSelective
          ? `Export for Taeshir (.xls) downloaded successfully for ${applicantIds.length} selected candidate${applicantIds.length > 1 ? "s" : ""}!`
          : "Export for Taeshir (.xls) downloaded successfully!"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Taeshir (.xls) file.");
    } finally {
      setIsExportingTaeshir(false);
    }
  };

  // Modal Save Mutation
  const modalSaveMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.injaz?.name;
      if (!stepName) return;

      const isRowDeparted =
        editingRow.placementStatus === "Departed" ||
        editingRow.ticketStatus === "Departed";
      if (isRowDeparted) {
        throw new Error("Placement is Departed/Cancelled; clearance steps cannot be edited.");
      }

      // Update Appointment & Injaz Number
      if (modalAppointmentDate || modalInjazNumber) {
        await setTaeshirAppointmentV2(
          stepName,
          modalAppointmentDate || "",
          modalInjazNumber || ""
        );
        if (modalInjazNumber && editingRow.applicantId) {
          try {
            await updateApplicantV2(editingRow.applicantId, {
              application_number: modalInjazNumber.trim(),
            });
          } catch (e) {
            console.warn("Failed to sync application_number to applicant:", e);
          }
        }
      }

      // Update Remark on applicant record
      if (modalRemark.trim()) {
        try {
          await updateApplicantV2(editingRow.applicantId, {
            remarks: modalRemark.trim(),
          });
        } catch (err) {
          console.warn("Remark update warning:", err);
        }
      }

      // Update Taeshir follow-up status
      if (modalTaeshirStatus) {
        await setTaeshirStatusV2(stepName, modalTaeshirStatus);
      }

      // Update Injaz Payment Status
      if (modalInjazPaymentStatus) {
        await recordInjazPaymentV2(stepName, modalInjazPaymentStatus);
      }

      // Step Completion / Progression
      if (modalStatus === "Completed") {
        const isPaid =
          modalInjazPaymentStatus === "Paid" ||
          ((editingRow.injaz as any)?.injaz_payment_status ||
            (editingRow.injazPayment === "PAID" ? "Paid" : ""))
            .toLowerCase() === "paid";
        if (
          !isPaid &&
          !["Complete", "Completed", "Issued"].includes(editingRow.injaz?.status || "")
        ) {
          throw new Error("Taeshir cannot be completed until the Injaz payment is marked Paid.");
        }
        await completeClearanceStepV2(stepName, modalInjazNumber || undefined);
      }

      // Reassign officer if modified by Admin
      if (
        isAdmin &&
        modalEmployee &&
        modalEmployee !== (editingRow.injaz?.assigned_officer || editingRow.injaz?.employee)
      ) {
        try {
          await reassignClearanceStepV2(stepName, modalEmployee);
        } catch (err: any) {
          console.warn("reassignClearanceStepV2 warning:", err);
        }
      }
    },
    onSuccess: async () => {
      toast.success(`Te'shir / Injaz for ${editingRow?.fullName} updated successfully!`);
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Te'shir record.");
    },
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const stepName = editingRow.clearanceStepName || editingRow.injaz?.name;
      if (!stepName) return;
      if (!reopenReason.trim()) {
        throw new Error("Reason is required to reopen this clearance step.");
      }
      await reopenClearanceStepV2(stepName, reopenReason.trim(), reopenTargetStatus);
    },
    onSuccess: async () => {
      toast.success("Te'shir clearance step reopened successfully!");
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
      id: "select",
      header: (
        <TableHeaderCheckbox
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleAll={handleToggleSelectAll}
        />
      ),
      width: "38px",
      align: "center",
      sortable: false,
      cell: (row) => {
        const id = row.applicantId || (row.applicant as any)?.name;
        const isChecked = Boolean(id && selectedApplicantIds.has(id));
        return (
          <div
            className="flex items-center justify-center p-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!id) return;
              setSelectedApplicantIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-emerald-800 focus:ring-emerald-700 cursor-pointer pointer-events-none"
              checked={isChecked}
              readOnly
            />
          </div>
        );
      },
    },
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
      id: "index",
      header: "#",
      width: "48px",
      align: "center",
      isReadOnly: true,
      cell: (_, idx) => (
        <span className="text-slate-600 dark:text-zinc-400 font-mono text-xs">
          {(idx ?? 0) + 1}
        </span>
      ),
    },
    {
      id: "candidate",
      header: "CANDIDATE",
      accessorKey: "fullName",
      width: "210px",
      isReadOnly: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white uppercase truncate text-xs">
            {row.fullName}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
              {row.applicantId}
            </span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="font-mono text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">
              {row.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "contract",
      header: "CONTRACT & VISA",
      accessorKey: "contractNumber",
      width: "170px",
      isReadOnly: true,
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-mono text-slate-900 dark:text-white font-semibold">
            {row.contractNumber || (row.applicant as any)?.contract_number || "—"}
          </span>
          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
            Visa: {row.visaNumber || (row.applicant as any)?.visa_number || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "sponsor",
      header: "SPONSOR (KAFEEL)",
      accessorKey: "sponsorName",
      width: "200px",
      isReadOnly: true,
      cell: (row) => (
        <div className="truncate block max-w-[190px]">
          <span className="font-semibold text-slate-900 dark:text-white uppercase block truncate text-xs">
            {row.sponsorName || (row.applicant as any)?.sponsor_name || "—"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-mono">
            ID: {row.sponsorId || (row.applicant as any)?.sponsor_id || "—"}
          </span>
        </div>
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
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
          {row.duration ?? 0} DAYS
        </span>
      ),
    },
    {
      id: "injazNumber",
      header: "E-number (Injaz Application No.)",
      accessorKey: "injaz",
      width: "190px",
      editable: true,
      cell: (row) => {
        const currentInjaz =
          (row.injaz as any)?.injaz_application_id ||
          row.injazApplicationId ||
          (row.injaz as any)?.reference_no ||
          "";
        const currentAppDate =
          (row.injaz as any)?.appointment_date ||
          (row.appointmentDate !== "—" ? row.appointmentDate || "" : "");
        return (
          <ExcelTextInput
            value={currentInjaz}
            disabled={!canEdit}
            placeholder="e.g. E1928471"
            onSave={(val) =>
              handleUpdateInjazAppointment(
                row,
                currentAppDate,
                val
              )
            }
          />
        );
      },
    },
    {
      id: "appointmentDate",
      header: "APPOINTMENT DATE",
      accessorKey: "appointmentDate",
      width: "135px",
      editable: true,
      cell: (row) => {
        const currentAppDate =
          (row.injaz as any)?.appointment_date ||
          (row.appointmentDate !== "—" ? row.appointmentDate || "" : "");
        const currentInjaz =
          (row.injaz as any)?.injaz_application_id ||
          row.injazApplicationId ||
          (row.injaz as any)?.reference_no ||
          "";
        return (
          <ExcelDateInput
            value={currentAppDate}
            disabled={!canEdit}
            onSave={(val) => handleUpdateInjazAppointment(row, val, currentInjaz)}
          />
        );
      },
    },
    {
      id: "taeshir_status",
      header: "TAESHIR STATUS",
      width: "135px",
      align: "center",
      editable: true,
      cell: (row) => {
        const currentStatus =
          (row.injaz as any)?.taeshir_status || (row as any)?.taeshir_status || "";
        return (
          <ExcelSelect
            value={currentStatus || "NONE"}
            disabled={!canEdit}
            options={[
              {
                value: "NONE",
                label: "None",
                badgeClass: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px]",
              },
              {
                value: "INFORMED",
                label: "INFORMED",
                badgeClass: "bg-blue-500 text-white font-semibold text-[10px]",
              },
              {
                value: "RECEIVED",
                label: "RECEIVED",
                badgeClass: "bg-purple-600 text-white font-semibold text-[10px]",
              },
              {
                value: "READY TO EMBASSY",
                label: "READY TO EMBASSY",
                badgeClass: "bg-emerald-600 text-white font-semibold text-[10px]",
              },
            ]}
            onSave={(val) => handleUpdateTaeshirStatus(row, val === "NONE" ? "" : val)}
          />
        );
      },
    },
    {
      id: "injaz_payment",
      header: "INJAZ PAYMENT",
      width: "125px",
      align: "center",
      editable: true,
      cell: (row) => {
        const rawVal =
          (row.injaz as any)?.injaz_payment_status ||
          (row as any)?.injaz_payment_status ||
          (row.injazPayment === "PAID" ? "Paid" : "Unpaid");
        const currentPayment =
          rawVal === "Paid" ? "Paid" : rawVal === "Printed" ? "Printed" : "Unpaid";
        return (
          <ExcelSelect
            value={currentPayment}
            disabled={!canEdit}
            options={[
              {
                value: "Unpaid",
                label: "Unpaid",
                badgeClass: "bg-amber-500 text-white font-semibold text-[10px]",
              },
              {
                value: "Printed",
                label: "Printed",
                badgeClass: "bg-blue-600 text-white font-semibold text-[10px]",
              },
              {
                value: "Paid",
                label: "Paid",
                badgeClass: "bg-emerald-600 text-white font-semibold text-[10px]",
              },
            ]}
            onSave={(val) =>
              handleUpdateInjazPayment(row, val as "Paid" | "Unpaid" | "Printed")
            }
          />
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      width: "125px",
      align: "center",
      editable: true,
      cell: (row) => {
        const isComplete =
          row.injaz?.status === "Complete" ||
          row.injaz?.status === "Completed" ||
          row.injaz?.status === "Issued";
        const isInjazPaid =
          ((row.injaz as any)?.injaz_payment_status ||
            (row as any)?.injaz_payment_status ||
            (row.injazPayment === "PAID" ? "Paid" : ""))
            .toLowerCase() === "paid";
        return (
          <ExcelSelect
            value={isComplete ? "Completed" : "Pending"}
            disabled={!canEdit}
            options={[
              {
                value: "Pending",
                label: "Pending",
                badgeClass: "bg-amber-500 text-white font-semibold text-[10px]",
              },
              {
                value: "Completed",
                label: isComplete || isInjazPaid ? "Completed" : "Completed (Injaz Unpaid)",
                badgeClass: "bg-emerald-600 text-white font-semibold text-[10px]",
                disabled: !isComplete && !isInjazPaid,
              },
            ]}
            onSave={(val) => handleUpdateStatus(row, val)}
          />
        );
      },
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
          onSave={(val) => handleUpdateRemark(row, val)}
        />
      ),
    },
    {
      id: "final_action",
      header: "ACTION",
      width: "160px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Missed Appointment Button (T1) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setMissedRow(row);
              setMissedReason("");
              setMissedNewDate("");
              setMissedNewInjazId("");
            }}
            className="h-7 px-1.5 text-[10px] text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 font-semibold"
            title="Mark appointment as Missed / Forfeited"
          >
            <Clock className="h-3 w-3" />
            <span>Missed</span>
          </Button>

          {/* Undo Missed Button (T1: only when previous outcome is Forfeited or Missed, outcome is Active and payment is Unpaid) */}
          {Boolean(
            ((row.injaz as any)?.injaz_previous_outcome === "Forfeited" ||
              (row.injaz as any)?.injaz_previous_outcome === "Missed") &&
            ((row.injaz as any)?.injaz_outcome === "Active" || !(row.injaz as any)?.injaz_outcome) &&
            ((row.injaz as any)?.injaz_payment_status === "Unpaid" || !(row.injaz as any)?.injaz_payment_status)
          ) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                const stepName = row.clearanceStepName || row.injaz?.name;
                if (!stepName) return;
                try {
                  await undoForfeitInjazV2(stepName);
                  toast.success("Missed appointment status undone successfully!");
                  await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
                  onRefresh();
                } catch (err: any) {
                  toast.error(err?.message || "Failed to undo missed status");
                }
              }}
              className="h-7 px-1.5 text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 font-semibold"
              title="Undo missed appointment status"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo Missed</span>
            </Button>
          )}

          {/* Undo Clearance Step (T2) */}
          {(row.clearanceStepName || row.injaz?.name) && (
            <UndoLastStepButton
              doctype="Clearance Step"
              name={row.clearanceStepName || row.injaz?.name || ""}
              askOnClick
              onSuccess={onRefresh}
              size="sm"
              className="h-7 px-2 text-[11px]"
            />
          )}

          {/* Injaz PDF Download Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                toast.info("Generating Injaz document...");
                const injazData = await resolveInjazDataWithFreshPhoto(row);
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
            title="Load into Chrome Extension for MOFA / Musaned autofill"
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
        title="Te'shir / Injaz / Biometrics Workspace"
        subtitle="Schedule MOFA biometrics appointment and generate official Injaz visa applications."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={editingRow?.applicantId}
        onRowClick={() => {}}
        onRefresh={onRefresh}
        corridorFilter={corridorFilter}
        onCorridorChange={onCorridorChange}
        extraHeaderActions={
          <div className="flex items-center gap-2">
            {selectedApplicantIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplicantIds(new Set())}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Clear ({selectedApplicantIds.size})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportTaeshir}
              disabled={isExportingTaeshir}
              className={cn(
                "h-8 gap-1.5 text-xs font-semibold border-emerald-400/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all",
                selectedApplicantIds.size > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/50"
                  : "text-emerald-800 dark:text-emerald-300"
              )}
              title={
                selectedApplicantIds.size > 0
                  ? `Export ${selectedApplicantIds.size} selected candidate${selectedApplicantIds.size > 1 ? "s" : ""} for Taeshir (.xls)`
                  : "Export all for Taeshir (.xls)"
              }
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>
                {isExportingTaeshir
                  ? "Exporting..."
                  : selectedApplicantIds.size > 0
                  ? `Export for Taeshir (${selectedApplicantIds.size})`
                  : "Export for Taeshir (.xls)"}
              </span>
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* Focused Edit Modal (Opens only when 'Edit' is clicked)         */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Te&apos;shir / Injaz Record
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Applicant: <strong className="uppercase">{editingRow?.fullName}</strong> ({editingRow?.passportNumber})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-number (Injaz Application No.)</Label>
              <Input
                value={modalInjazNumber}
                onChange={(e) => setModalInjazNumber(e.target.value)}
                placeholder="e.g. E1928471"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Biometrics Appointment Date</Label>
              <Input
                type="date"
                value={modalAppointmentDate}
                onChange={(e) => setModalAppointmentDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clearance Status</Label>
              {(() => {
                const isPaid =
                  modalInjazPaymentStatus === "Paid" ||
                  ((editingRow?.injaz as any)?.injaz_payment_status ||
                    (editingRow?.injazPayment === "PAID" ? "Paid" : ""))
                    .toLowerCase() === "paid";
                const isAlreadyCompleted = ["Complete", "Completed", "Issued"].includes(
                  editingRow?.injaz?.status || ""
                );
                return (
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as any)}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option
                      value="Completed"
                      disabled={!isPaid && !isAlreadyCompleted}
                    >
                      Completed (Cleared) {!isPaid && !isAlreadyCompleted ? "— (Requires Injaz Paid)" : ""}
                    </option>
                  </select>
                );
              })()}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Taeshir Follow-up Status</Label>
              <select
                value={modalTaeshirStatus}
                onChange={(e) => setModalTaeshirStatus(e.target.value)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a]"
              >
                <option value="">None</option>
                <option value="INFORMED">INFORMED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="READY TO EMBASSY">READY TO EMBASSY</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Injaz Payment Status</Label>
              <select
                value={modalInjazPaymentStatus}
                onChange={(e) => setModalInjazPaymentStatus(e.target.value as any)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a]"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Printed">Printed (Does not count as paid)</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notes / Remark</Label>
              <Input
                value={modalRemark}
                onChange={(e) => setModalRemark(e.target.value)}
                placeholder="Optional remark..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
            {isAdmin &&
              ["Complete", "Completed", "Issued"].includes(
                editingRow?.injaz?.status || ""
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
            <DialogTitle className="text-base font-bold">
              Reopen Te&apos;shir / Injaz Step
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Provide an authoritative audit reason for resetting this step.
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

      {/* ------------------------------------------------------------- */}
      {/* Missed Appointment Modal (T1)                                 */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!missedRow} onOpenChange={(open) => !open && setMissedRow(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Mark Appointment Missed
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Candidate: <strong className="uppercase">{missedRow?.fullName}</strong> ({missedRow?.passportNumber})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <p className="text-slate-600 dark:text-zinc-400 text-xs">
              This will forfeit or close the current appointment attempt. If paid, the fee is recorded; if unpaid, the attempt is closed as Missed.
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason (Optional)</Label>
              <Input
                placeholder="e.g. Candidate could not travel to appointment"
                value={missedReason}
                onChange={(e) => setMissedReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Appointment Date (Optional)</Label>
                <Input
                  type="date"
                  value={missedNewDate}
                  onChange={(e) => setMissedNewDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">New E-Number (Optional)</Label>
                <Input
                  placeholder="e.g. E408153627"
                  value={missedNewInjazId}
                  onChange={(e) => setMissedNewInjazId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMissedRow(null)}
              disabled={isSubmittingMissed}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmMissed}
              disabled={isSubmittingMissed}
              className="font-semibold text-xs gap-1.5"
            >
              {isSubmittingMissed ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
              <span>Confirm Missed</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
