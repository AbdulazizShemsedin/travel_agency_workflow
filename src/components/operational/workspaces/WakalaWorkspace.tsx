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
  CheckCircle2,
  AlertTriangle,
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
import { triggerWakalaReminderV2 } from "@/lib/api/v2/notifications";
import {
  reassignClearanceStepV2,
  getClearanceStepDocV2,
  recordWakalaPaymentV2,
} from "@/lib/api/v2/clearance";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";

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
  const { authUser, roles } = useAuth();

  const authUserV2 = authUser ? { user: authUser.email, full_name: authUser.full_name || authUser.email, roles: Array.isArray(authUser.roles) ? authUser.roles : [] } : null;
  const isAdmin = hasAnyV2Role(authUserV2, ["Admin", "Manager"] as any) || (authUserV2?.roles || []).some((r) => ["admin", "administrator", "system manager", "manager", "agency admin"].includes(String(r).trim().toLowerCase())) || (authUser?.email || "").toLowerCase() === "administrator";
  const isEmbassyOfficer = hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer", "Embassy Officer"] as any) || (authUserV2?.roles || []).some((r) => String(r).toLowerCase().includes("embassy") || String(r).toLowerCase().includes("clearance"));
  const [employee, setEmployee] = React.useState("");
  const isAssignedOfficer = (authUser?.email || "").toLowerCase() === (employee || "").toLowerCase() || (authUser?.full_name || "").toLowerCase() === (employee || "").toLowerCase();
  const canEdit = isAdmin || isEmbassyOfficer || isAssignedOfficer;

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [wakalaAmount, setWakalaAmount] = React.useState<string>("");
  const [wakalaPaidDate, setWakalaPaidDate] = React.useState<string>("");
  const [wakalaRefNo, setWakalaRefNo] = React.useState("");
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);
  const [isRecordingWakala, setIsRecordingWakala] = React.useState(false);

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (!selectedRow) return;

    let isMounted = true;

    // 1. Initialize synchronously from table row
    const wakala = selectedRow.wakala || selectedRow.embassy;
    const isAuth =
      (selectedRow.wakalaStatus || "").toLowerCase() === "paid" ||
      (selectedRow.wakalaStatus || "").toLowerCase().includes("authorized") ||
      (selectedRow.wakalaStatus || "").toLowerCase().includes("completed");
    setStatus(isAuth ? "Completed" : "Pending");
    setWakalaAmount(selectedRow.wakalaAmount !== undefined ? String(selectedRow.wakalaAmount) : "");
    setWakalaPaidDate(selectedRow.wakalaPaidDate || "");
    setWakalaRefNo((wakala as any)?.wakala_reference_no || (wakala as any)?.reference_no || selectedRow.visaNumber || "");
    setEmployee((wakala as any)?.assigned_officer || (wakala as any)?.employee || "");

    // 2. Fetch fresh clearance step doc in background
    const stepName = selectedRow.clearanceStepName || selectedRow.embassy?.name;
    if (stepName) {
      getClearanceStepDocV2(stepName).then((freshStep) => {
        if (!isMounted || !freshStep) return;
        if (freshStep.wakala_status) {
          const freshAuth =
            freshStep.wakala_status.toLowerCase() === "paid" ||
            freshStep.wakala_status.toLowerCase().includes("authorized") ||
            freshStep.wakala_status.toLowerCase().includes("completed");
          setStatus(freshAuth ? "Completed" : "Pending");
        }
        if (freshStep.wakala_amount !== undefined && freshStep.wakala_amount !== null) {
          setWakalaAmount(String(freshStep.wakala_amount));
        }
        if (freshStep.wakala_paid_date || freshStep.paid_date) {
          setWakalaPaidDate(freshStep.wakala_paid_date || freshStep.paid_date || "");
        }
        if (freshStep.wakala_reference_no || freshStep.reference_no) {
          setWakalaRefNo(freshStep.wakala_reference_no || freshStep.reference_no || "");
        }
        if (freshStep.assigned_officer || freshStep.employee || freshStep.completed_by) {
          setEmployee(freshStep.assigned_officer || freshStep.employee || freshStep.completed_by || "");
        }
      }).catch((err) => {
        console.warn("Could not load fresh Wakala clearance step:", err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedRow]);

  const isPlacementDeparted =
    selectedRow?.placementStatus === "Departed" ||
    selectedRow?.ticketStatus === "Departed" ||
    Boolean((selectedRow as any)?.isDeparted);

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      if (isPlacementDeparted) {
        throw new Error("Placement is Departed/Cancelled; its clearance steps can no longer be edited.");
      }
      const stepName = selectedRow.clearanceStepName || selectedRow.embassy?.name;

      if (stepName && canEdit) {
        const amt = wakalaAmount ? Number(wakalaAmount) : undefined;
        const targetWakalaStatus = status === "Completed" ? "Paid" : "Pending";
        await recordWakalaPaymentV2(
          stepName,
          targetWakalaStatus,
          amt,
          targetWakalaStatus === "Paid" ? (wakalaPaidDate || new Date().toISOString().split("T")[0]) : undefined,
          wakalaRefNo || undefined
        );
      }

      if (stepName && isAdmin && employee && employee !== (selectedRow.embassy?.assigned_officer || selectedRow.embassy?.employee)) {
        await reassignClearanceStepV2(stepName, employee);
      }
    },
    onSuccess: () => {
      toast.success(`Wakala details for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Wakala record.");
    },
  });

  // Handle Musaned Wakala Reminder dispatch via V2 notification API
  const handleSendReminder = async () => {
    const stepName = selectedRow?.clearanceStepName || selectedRow?.embassy?.name;
    if (!stepName) {
      toast.error("No active clearance step found to dispatch Wakala reminder.");
      return;
    }
    setIsSendingReminder(true);
    try {
      const res = await triggerWakalaReminderV2(stepName);
      toast.success(res.message || "Wakala reminder dispatched via WhatsApp & Push!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch Wakala reminder.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Columns definition matching Wakala Sheet specifications (Exact 10 Columns)
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
        <span className="truncate block max-w-[150px] font-medium uppercase text-xs">
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
        <span className="font-mono text-slate-700 dark:text-zinc-300 text-xs">
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
        <span className="font-mono text-slate-700 dark:text-zinc-300 text-xs">
          {row.contractNumber || "—"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "DURATION FROM CONTRACT",
      accessorKey: "duration",
      width: "130px",
      align: "center",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
          {row.duration ?? 0} DAYS
        </span>
      ),
    },
    {
      id: "contractor",
      header: "PARTNER AGENCY",
      accessorKey: "lockedContractor",
      width: "150px",
      cell: (row) => (
        <span className="truncate block max-w-[140px] text-slate-600 dark:text-zinc-400 text-xs">
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
        const isCompleted =
          (row.wakalaStatus || "").toLowerCase().includes("completed") ||
          (row.wakalaStatus || "").toLowerCase().includes("authorized");
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
        <span className="text-slate-700 dark:text-zinc-300 truncate block max-w-[120px] text-xs">
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
        canEdit={canEdit && !isPlacementDeparted}
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
          {/* 1-Click Quick Action Banner */}
          {status !== "Completed" ? (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">Wakala Payment Required</span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Wakala fee is currently Pending. Embassy documents cannot be submitted until marked as Paid.
                  </p>
                </div>
              </div>
              {canEdit && !isPlacementDeparted && (
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
                        wakalaPaidDate || new Date().toISOString().split("T")[0],
                        wakalaRefNo || undefined
                      );
                      setStatus("Completed");
                      toast.success("Wakala fee recorded as Paid!");
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
                  <span className="font-bold">Wakala Fee Verified (Paid)</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Paid on {wakalaPaidDate || "Record"} {wakalaAmount ? `• Amount: ${wakalaAmount} SAR` : ""}. Eligible for embassy submission.
                  </p>
                </div>
              </div>
              {canEdit && !isPlacementDeparted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const stepName = selectedRow?.clearanceStepName || selectedRow?.embassy?.name;
                    if (!stepName) return;
                    try {
                      setIsRecordingWakala(true);
                      await recordWakalaPaymentV2(
                        stepName,
                        "Pending",
                        undefined,
                        undefined,
                        wakalaRefNo || undefined
                      );
                      setStatus("Pending");
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <DrawerField label="Wakala Fee Status" isReadOnly={false}>
              <select
                value={status}
                disabled={!canEdit || mutation.isPending || isRecordingWakala}
                onChange={(e) => setStatus(e.target.value as any)}
                className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white disabled:opacity-60"
              >
                <option value="Pending">Pending (Unpaid)</option>
                <option value="Completed">Paid (Authorized)</option>
              </select>
            </DrawerField>

            <DrawerField label="Wakala Fee Amount (SAR)" isReadOnly={false}>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={wakalaAmount}
                disabled={!canEdit || mutation.isPending || isRecordingWakala}
                onChange={(e) => setWakalaAmount(e.target.value)}
                className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white disabled:opacity-60"
              />
            </DrawerField>

            <DrawerField label="Payment Date" isReadOnly={false}>
              <input
                type="date"
                value={wakalaPaidDate}
                disabled={!canEdit || mutation.isPending || isRecordingWakala || status !== "Completed"}
                onChange={(e) => setWakalaPaidDate(e.target.value)}
                className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white disabled:opacity-50"
              />
            </DrawerField>

            <DrawerField label="Musaned Reference №" isReadOnly={false}>
              <input
                type="text"
                placeholder="e.g. WAK-2026-99201"
                value={wakalaRefNo}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setWakalaRefNo(e.target.value)}
                className="h-9 w-full px-3 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
              />
            </DrawerField>
          </div>

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="pt-2">
              <DrawerField label="Assigned Wakala Officer (Admin Only)" isReadOnly={false}>
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
      </OperationalDrawer>
    </>
  );
}
