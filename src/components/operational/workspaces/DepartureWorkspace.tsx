"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plane,
  Ticket,
  HeartPulse,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileDown,
  Puzzle,
} from "lucide-react";
import { OperationalColumn, WorkspaceApplicantRow } from "@/types/workspace";
import { OperationalTable } from "../OperationalTable";
import { ExcelTextInput, ExcelSelect, ExcelDateInput } from "../ExcelCellComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  recordTicketDetailsV2,
  recordRescheduleV2,
  recordPredepartureMedicalResultV2,
  advancePlacementV2,
  getPlacementV2,
} from "@/lib/api/v2/placements";
import { updateApplicantForLmisV2, updateApplicantV2 } from "@/lib/api/v2/applicants";
import { renderCvPdfV2 } from "@/lib/api/v2/cv";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

interface DepartureWorkspaceProps {
  data: WorkspaceApplicantRow[];
  isLoading: boolean;
  onRefresh: () => void;
  employees: { name: string; full_name?: string; email?: string }[];
  corridorFilter: string;
  onCorridorChange: (corridor: string) => void;
}

export function DepartureWorkspace({
  data,
  isLoading,
  onRefresh,
  employees,
  corridorFilter,
  onCorridorChange,
}: DepartureWorkspaceProps) {
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
    hasAnyV2Role(authUserV2, ["Ticketer"] as any) ||
    (authUserV2?.roles || []).some((r) =>
      [
        "ticketing officer",
        "departure officer",
        "logistics officer",
        "medical officer",
      ].includes(String(r).trim().toLowerCase())
    );

  // Edit Modal State (Triggered ONLY via Action 'Edit' button, not row click)
  const [editingRow, setEditingRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Edit Modal (Airlines and Medical Exam Date removed as requested)
  const [modalTicketStatus, setModalTicketStatus] = React.useState<
    "Pending" | "Booked" | "Cancelled"
  >("Pending");
  const [modalTicketNumber, setModalTicketNumber] = React.useState("");
  const [modalFlightDate, setModalFlightDate] = React.useState("");
  const [modalFlightTime, setModalFlightTime] = React.useState("");
  const [modalTicketCost, setModalTicketCost] = React.useState<number | "">("");
  const [modalTicketCurrency, setModalTicketCurrency] = React.useState("USD");
  const [modalTicketDetails, setModalTicketDetails] = React.useState("");
  const [modalEmployee, setModalEmployee] = React.useState("");

  // Medical 2: only include result (Pass or Failed)
  const [modalMedical2Result, setModalMedical2Result] = React.useState<"Pass" | "Failed">("Pass");
  const [modalMedical2Remark, setModalMedical2Remark] = React.useState("");

  // Departure fields
  const [modalDepartureStatus, setModalDepartureStatus] = React.useState<
    "Pending" | "Departed" | "Rescheduled" | "Cancelled"
  >("Pending");
  const [modalRescheduleDate, setModalRescheduleDate] = React.useState("");
  const [modalRescheduleCause, setModalRescheduleCause] = React.useState<"Internal" | "Airport">(
    "Airport"
  );
  const [modalRescheduleCost, setModalRescheduleCost] = React.useState<number | "">("");

  // Sync edit modal state when editingRow changes
  React.useEffect(() => {
    if (!editingRow) return;

    const tkt = editingRow.ticket;
    const dep = editingRow.departure;

    setModalTicketStatus(editingRow.ticketStatus === "Booked" ? "Booked" : "Pending");
    setModalTicketNumber(
      editingRow.ticketNumber && editingRow.ticketNumber !== "—"
        ? editingRow.ticketNumber
        : tkt?.ticket_number || ""
    );
    setModalFlightDate(tkt?.flight_date || "");
    setModalFlightTime((tkt as any)?.flight_time || (dep as any)?.flight_time || "");
    setModalTicketCost((tkt as any)?.ticket_cost || "");
    setModalTicketCurrency((tkt as any)?.currency || "USD");
    setModalTicketDetails((tkt as any)?.ticket_details || "");
    setModalEmployee((tkt as any)?.employee || (dep as any)?.employee || "");

    const med2Val = (dep as any)?.medical_2_result || (dep as any)?.medical_2_status;
    setModalMedical2Result(
      med2Val === "UNFIT" || med2Val === "Fail" || med2Val === "Failed" ? "Failed" : "Pass"
    );
    setModalMedical2Remark((dep as any)?.medical_2_remark || "");

    const isDep = Boolean(dep?.departed_on);
    setModalDepartureStatus(isDep ? "Departed" : "Pending");
    setModalRescheduleDate((dep as any)?.reschedule_date || "");
    setModalRescheduleCause(
      (dep as any)?.reschedule_cause === "Internal" ? "Internal" : "Airport"
    );
    setModalRescheduleCost((dep as any)?.reschedule_cost || "");

    // Fetch latest placement details
    const placementName = editingRow.placementId || editingRow.dsrName;
    if (placementName) {
      getPlacementV2(placementName)
        .then((freshPlc) => {
          if (!freshPlc) return;
          if (freshPlc.ticket_number) setModalTicketNumber(freshPlc.ticket_number);
          if (freshPlc.status === "Ticketed" || freshPlc.status === "Departed" || freshPlc.ticket_number) {
            setModalTicketStatus("Booked");
          }
          if (freshPlc.flight_date) {
            const parts = freshPlc.flight_date.split(" ");
            setModalFlightDate(parts[0]);
            if (parts[1]) setModalFlightTime(parts[1]);
          }
          if (freshPlc.flight_time) setModalFlightTime(freshPlc.flight_time);
          if (freshPlc.ticket_cost !== undefined && freshPlc.ticket_cost !== null) {
            setModalTicketCost(freshPlc.ticket_cost);
          }
          const freshMed2 = freshPlc.medical_2_result || freshPlc.medical_2_status;
          if (freshMed2) {
            setModalMedical2Result(
              freshMed2 === "UNFIT" || freshMed2 === "Fail" || freshMed2 === "Failed"
                ? "Failed"
                : "Pass"
            );
          }
          if (freshPlc.status === "Departed" || freshPlc.departed_on) {
            setModalDepartureStatus("Departed");
          }
        })
        .catch(() => {});
    }
  }, [editingRow]);

  // In-cell quick update helpers
  const handleUpdateTicketNumber = async (row: WorkspaceApplicantRow, ticketNo: string) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) {
      toast.error("No linked placement found");
      throw new Error("No linked placement found");
    }
    try {
      const flightDate =
        row.flightDate ||
        (row.ticket as any)?.flight_date ||
        new Date().toISOString().split("T")[0];
      await recordTicketDetailsV2(placementName, ticketNo.trim(), flightDate);

      // Only advance to Ticketed if currently Stamped (conforming to state machine gate)
      if (ticketNo.trim() && row.placementStatus === "Stamped") {
        try {
          await advancePlacementV2(placementName, "Ticketed");
        } catch (advErr: any) {
          console.warn("Could not auto-advance placement to Ticketed:", advErr);
        }
      }
      toast.success("Ticket Number saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["placements"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save ticket number");
      throw err;
    }
  };

  const handleUpdateFlightDate = async (row: WorkspaceApplicantRow, flightDate: string) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) {
      toast.error("No linked placement found");
      throw new Error("No linked placement found");
    }
    try {
      const tktNo =
        (row.ticketNumber && row.ticketNumber !== "—"
          ? row.ticketNumber
          : (row.ticket as any)?.ticket_number) || "TKT-PENDING";
      const fTime = row.flightTime || (row.ticket as any)?.flight_time || "";
      const combined = fTime.trim() ? `${flightDate.trim()} ${fTime.trim()}` : flightDate.trim();
      await recordTicketDetailsV2(placementName, tktNo, combined);
      toast.success("Flight date saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["placements"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save flight date");
      throw err;
    }
  };

  const handleUpdateFlightTime = async (row: WorkspaceApplicantRow, flightTime: string) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) {
      toast.error("No linked placement found");
      throw new Error("No linked placement found");
    }
    try {
      const tktNo =
        (row.ticketNumber && row.ticketNumber !== "—"
          ? row.ticketNumber
          : (row.ticket as any)?.ticket_number) || "TKT-PENDING";
      const fDate =
        row.flightDate ||
        (row.ticket as any)?.flight_date ||
        new Date().toISOString().split("T")[0];
      const combined = flightTime.trim() ? `${fDate.trim()} ${flightTime.trim()}` : fDate.trim();
      await recordTicketDetailsV2(placementName, tktNo, combined);
      toast.success("Flight time saved");
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      await queryClient.invalidateQueries({ queryKey: ["placements"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save flight time");
      throw err;
    }
  };

  const handleUpdateMedical2 = async (
    row: WorkspaceApplicantRow,
    result: "Pass" | "Failed"
  ) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) return;
    try {
      await recordPredepartureMedicalResultV2(
        placementName,
        result === "Pass" ? "FIT" : "UNFIT"
      );
      toast.success(`Medical 2 recorded as ${result}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Medical 2 result");
      throw err;
    }
  };

  const handleUpdateDepartureStatus = async (
    row: WorkspaceApplicantRow,
    status: "Pending" | "Departed" | "Rescheduled" | "Cancelled"
  ) => {
    const placementName = row.placementId || row.dsrName;
    if (!placementName) return;
    try {
      if (status === "Departed") {
        const med2 =
          (row.departure as any)?.medical_2_result ||
          (row.departure as any)?.medical_2_status;
        if (med2 === "UNFIT" || med2 === "Fail" || med2 === "Failed") {
          toast.error("Cannot mark Departed: Pre-departure Medical 2 is UNFIT/Failed.");
          return;
        }
        await advancePlacementV2(placementName, "Departed");
        toast.success(`Placement marked Departed for ${row.fullName}!`);
      }
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update departure status");
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
      const placementName = editingRow.placementId || editingRow.dsrName;
      if (!placementName) {
        throw new Error("No linked active placement found for this candidate.");
      }

      // 1. Record Ticket Details (no airline!)
      if (modalTicketNumber.trim()) {
        const fullFlightDate = modalFlightDate
          ? modalFlightTime
            ? `${modalFlightDate} ${modalFlightTime}`
            : modalFlightDate
          : new Date().toISOString().split("T")[0];

        await recordTicketDetailsV2(
          placementName,
          modalTicketNumber.trim(),
          fullFlightDate,
          typeof modalTicketCost === "number" ? modalTicketCost : undefined
        );

        if (modalTicketStatus === "Booked") {
          await advancePlacementV2(placementName, "Ticketed");
        }
      }

      // 2. Record Pre-departure Medical 2 Check (Pass or Failed only, no exam date!)
      await recordPredepartureMedicalResultV2(
        placementName,
        modalMedical2Result === "Pass" ? "FIT" : "UNFIT"
      );

      // Save remark or notes if present
      if (modalMedical2Remark.trim() || modalTicketDetails.trim()) {
        try {
          await updateApplicantForLmisV2({
            applicant_name: editingRow.applicantId,
            remarks: modalMedical2Remark.trim() || modalTicketDetails.trim(),
          });
        } catch (rErr) {
          console.warn("Remark save warning:", rErr);
        }
      }

      // 3. Record Reschedule if applicable
      if (modalDepartureStatus === "Rescheduled" && modalRescheduleDate) {
        await recordRescheduleV2(
          placementName,
          modalRescheduleDate,
          modalRescheduleCause,
          typeof modalRescheduleCost === "number" ? modalRescheduleCost : undefined,
          modalTicketCurrency
        );
      }

      // 4. Record Departure Gate
      if (modalDepartureStatus === "Departed") {
        if (modalMedical2Result !== "Pass") {
          throw new Error(
            "Cannot complete Departure: Pre-departure Medical 2 check must be recorded and passed (Pass)."
          );
        }
        await advancePlacementV2(placementName, "Departed");
      }
    },
    onSuccess: async () => {
      toast.success(
        `Flight & Departure details for ${editingRow?.fullName} updated successfully!`
      );
      setEditingRow(null);
      await queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(formatCleanErrorMessage(err));
    },
  });

  // Columns definition: Direct in-cell editing, elevated drawer fields, airline & exam date removed
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
      isReadOnly: true,
      cell: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
          {row.passportNumber}
        </span>
      ),
    },
    {
      id: "ticketNumber",
      header: "TICKET NUMBER",
      width: "150px",
      editable: true,
      cell: (row) => {
        const val =
          row.ticketNumber && row.ticketNumber !== "—"
            ? row.ticketNumber
            : (row.ticket as any)?.ticket_number || "";
        return (
          <ExcelTextInput
            value={val}
            placeholder="Ticket #"
            disabled={!canEdit}
            onSave={(val) => handleUpdateTicketNumber(row, val)}
            className="font-mono font-bold text-blue-900 dark:text-blue-300"
          />
        );
      },
    },
    {
      id: "flightDate",
      header: "FLIGHT DATE",
      width: "140px",
      editable: true,
      cell: (row) => {
        const fDate = row.flightDate || (row.ticket as any)?.flight_date || "";
        return (
          <ExcelDateInput
            value={fDate}
            disabled={!canEdit}
            onSave={(val) => handleUpdateFlightDate(row, val)}
          />
        );
      },
    },
    {
      id: "flightTime",
      header: "FLIGHT TIME",
      width: "110px",
      editable: true,
      cell: (row) => {
        const fTime =
          row.flightTime ||
          (row.ticket as any)?.flight_time ||
          (row.departure as any)?.flight_time ||
          "";
        return (
          <ExcelTextInput
            value={fTime}
            placeholder="e.g. 14:30"
            disabled={!canEdit}
            onSave={(val) => handleUpdateFlightTime(row, val)}
            className="font-mono"
          />
        );
      },
    },
    {
      id: "medical2",
      header: "MEDICAL 2 RESULT",
      width: "130px",
      align: "center",
      editable: true,
      cell: (row) => {
        const med2 =
          (row.departure as any)?.medical_2_result ||
          (row.departure as any)?.medical_2_status;
        const normalized =
          med2 === "UNFIT" || med2 === "Fail" || med2 === "Failed" ? "Failed" : "Pass";

        return (
          <ExcelSelect
            value={normalized}
            options={[
              { value: "Pass", label: "Pass (Default)" },
              { value: "Failed", label: "Failed" },
            ]}
            disabled={!canEdit}
            onSave={(val) => handleUpdateMedical2(row, val as any)}
            className={
              normalized === "Pass"
                ? "font-bold text-emerald-700 dark:text-emerald-400"
                : "font-bold text-rose-700 dark:text-rose-400"
            }
          />
        );
      },
    },
    {
      id: "status",
      header: "DEPARTURE STATUS",
      width: "140px",
      align: "center",
      editable: true,
      cell: (row) => {
        const isDep = Boolean((row.departure as any)?.departed_on);
        const currentVal = isDep ? "Departed" : "Pending";

        return (
          <ExcelSelect
            value={currentVal}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Departed", label: "Departed" },
              { value: "Rescheduled", label: "Rescheduled" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
            disabled={!canEdit}
            onSave={(val) => handleUpdateDepartureStatus(row, val as any)}
            className={
              currentVal === "Departed"
                ? "font-bold text-emerald-700 dark:text-emerald-400"
                : "font-semibold text-amber-700 dark:text-amber-400"
            }
          />
        );
      },
    },
    {
      id: "sponsorName",
      header: "SPONSOR NAME",
      accessorKey: "sponsorName",
      width: "160px",
      isReadOnly: true,
      cell: (row) => (
        <span className="text-slate-900 dark:text-white uppercase font-semibold truncate block max-w-[150px]">
          {row.sponsorName || "—"}
        </span>
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      width: "160px",
      editable: true,
      cell: (row) => (
        <ExcelTextInput
          value={row.remark || ""}
          placeholder="Add remark..."
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
          {/* Candidate Dossier / CV PDF */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                toast.info("Preparing candidate dossier...");
                const blob = await renderCvPdfV2(row.applicantId);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Candidate_${row.passportNumber || row.applicantId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success("Dossier downloaded successfully!");
              } catch {
                window.open(`/applicants/${row.applicantId}/cv`, "_blank");
              }
            }}
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-emerald-800 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
            title="Download Candidate Dossier / CV"
          >
            <FileDown className="h-3 w-3" />
            <span>Doc</span>
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
            title="Load into Chrome Extension for flight manifest & eVisa checks"
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
        title="Flight Ticketing & Airport Departure"
        subtitle="Airline booking, flight scheduling, pre-departure medical fitness, and Bole Airport dispatch."
        columns={columns}
        data={data}
        isLoading={isLoading}
        selectedRowId={editingRow?.applicantId}
        onRowClick={() => {
          // Explicitly do not open drawer or modal on row click
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
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                <Plane className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="uppercase">{editingRow?.fullName}</span>
                  <Badge
                    className={
                      modalDepartureStatus === "Departed"
                        ? "bg-emerald-600 text-white font-bold text-[10px]"
                        : "bg-amber-500 text-white font-bold text-[10px]"
                    }
                  >
                    {modalDepartureStatus}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  Passport: <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{editingRow?.passportNumber}</span> | Country: {editingRow?.destinationCountry || "Saudi Arabia"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Dossier Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181f] border border-slate-200 dark:border-[#262632]">
              <div>
                <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Destination</Label>
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
                <Label className="text-[11px] text-slate-500 dark:text-zinc-400">Visa Number</Label>
                <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                  {editingRow?.visaNumber || "—"}
                </div>
              </div>
            </div>

            {/* Ticket Booking Fields (Airline removed as requested) */}
            <div className="rounded-xl border border-slate-200 dark:border-[#2c2c36] p-4 bg-white dark:bg-[#16161c] space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                <Ticket className="h-4 w-4 text-blue-600" />
                <span>Flight Ticket Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Ticket Status
                  </Label>
                  <select
                    value={modalTicketStatus}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalTicketStatus(e.target.value as any)}
                    className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pending">Pending (Not Booked)</option>
                    <option value="Booked">Booked (Ticket Issued)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Ticket / PNR Number
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. 071-2394829103"
                    value={modalTicketNumber}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalTicketNumber(e.target.value)}
                    className="h-9 mt-1 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Flight Date
                  </Label>
                  <Input
                    type="date"
                    value={modalFlightDate}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalFlightDate(e.target.value)}
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Flight Time
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. 14:30"
                    value={modalFlightTime}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalFlightTime(e.target.value)}
                    className="h-9 mt-1 text-xs font-mono bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Ticket Cost (USD)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 450"
                    value={modalTicketCost}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) =>
                      setModalTicketCost(e.target.value ? Number(e.target.value) : "")
                    }
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Ticket Notes
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Direct flight via Bole Airport"
                    value={modalTicketDetails}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalTicketDetails(e.target.value)}
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>
              </div>
            </div>

            {/* Medical 2 Section: Only include result (Pass or Failed), exam date removed */}
            <div className="rounded-xl border border-slate-200 dark:border-[#2c2c36] p-4 bg-white dark:bg-[#16161c] space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                <HeartPulse className="h-4 w-4 text-emerald-600" />
                <span>Medical 2 (Pre-departure Fitness)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Medical 2 Result (Default: Pass)
                  </Label>
                  <select
                    value={modalMedical2Result}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalMedical2Result(e.target.value as any)}
                    className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pass">Pass (FIT)</option>
                    <option value="Failed">Failed (UNFIT)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Medical 2 Remark
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Normal repeat checkup"
                    value={modalMedical2Remark}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalMedical2Remark(e.target.value)}
                    className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                  />
                </div>
              </div>
            </div>

            {/* Bole Airport Departure Confirmation */}
            <div className="rounded-xl border border-slate-200 dark:border-[#2c2c36] p-4 bg-white dark:bg-[#16161c] space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                <Plane className="h-4 w-4 text-emerald-600" />
                <span>Bole Airport Dispatch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Departure Status
                  </Label>
                  <select
                    value={modalDepartureStatus}
                    disabled={!canEdit || modalSaveMutation.isPending}
                    onChange={(e) => setModalDepartureStatus(e.target.value as any)}
                    className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Pending">Pending (Not Dispatched)</option>
                    <option value="Departed">Departed (Successfully Boarded)</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {modalDepartureStatus === "Rescheduled" && (
                  <>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        New Reschedule Date
                      </Label>
                      <Input
                        type="date"
                        value={modalRescheduleDate}
                        disabled={!canEdit || modalSaveMutation.isPending}
                        onChange={(e) => setModalRescheduleDate(e.target.value)}
                        className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Reschedule Cause
                      </Label>
                      <select
                        value={modalRescheduleCause}
                        disabled={!canEdit || modalSaveMutation.isPending}
                        onChange={(e) => setModalRescheduleCause(e.target.value as any)}
                        className="h-9 w-full mt-1 px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
                      >
                        <option value="Airport">Airport / Flight Delay</option>
                        <option value="Internal">Agency Internal Cause</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Reschedule Penalty Cost (USD)
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 50"
                        value={modalRescheduleCost}
                        disabled={!canEdit || modalSaveMutation.isPending}
                        onChange={(e) =>
                          setModalRescheduleCost(e.target.value ? Number(e.target.value) : "")
                        }
                        className="h-9 mt-1 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
                      />
                    </div>
                  </>
                )}
              </div>
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
    </>
  );
}
