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
} from "@/lib/api/v2/clearance";
import { updateApplicantForLmisV2, getApplicantV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import {
  downloadInjazDocumentPDF,
  InjazCandidateData,
} from "@/lib/pdf/injazDocumentGenerator";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

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

  // Reopen Step Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");
  const [reopenTargetStatus, setReopenTargetStatus] = React.useState<
    "In Progress" | "Pending"
  >("In Progress");

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
  }, [editingRow]);

  // PDF Generator helper
  const resolveInjazDataWithFreshPhoto = async (
    row: WorkspaceApplicantRow
  ): Promise<InjazCandidateData> => {
    const injazData: InjazCandidateData = {
      fullName: row.fullName,
      applicantId: row.applicantId,
      passportNumber: row.passportNumber,
      visaNumber: row.visaNumber || (row.applicant as any)?.visa_number || "",
      sponsorName: row.sponsorName || (row.applicant as any)?.sponsor_name || "",
      sponsorId: row.sponsorId || (row.applicant as any)?.sponsor_id || "",
      injazNumber:
        (row.injaz as any)?.injaz_application_id ||
        row.injazApplicationId ||
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

      // Step Completion / Progression
      if (modalStatus === "Completed") {
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
      header: "Application number (E-no)",
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
                label: "Completed",
                badgeClass: "bg-emerald-600 text-white font-semibold text-[10px]",
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
              <Label className="text-xs font-semibold">Application number (E-no)</Label>
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
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as any)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed (Cleared)</option>
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
    </>
  );
}
