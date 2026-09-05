"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  User,
  ShieldCheck,
  Building2,
  FileCheck2,
  Calendar,
  ExternalLink,
  CalendarDays,
  FileText,
  FileDown,
  Printer,
  Loader2,
  Sparkles,
  CheckCircle2,
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
import { cn } from "@/lib/utils";
import {
  startClearanceStepV2,
  completeClearanceStepV2,
  reassignClearanceStepV2,
  setTaeshirAppointmentV2,
  rescheduleTaeshirAppointmentV2,
  recordInjazPaymentV2,
  forfeitInjazAndRestartV2,
  renderInjazPdfV2,
} from "@/lib/api/v2/clearance";
import { logStageExpenseV2 } from "@/lib/api/v2/finance";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  downloadInjazDocumentPDF,
  openInjazDocumentInNewTab,
  InjazCandidateData,
} from "@/lib/pdf/injazDocumentGenerator";
import { sendApplicantToExtension } from "@/lib/extensionBridge";

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
      return norm === "saudi taeshir" || norm === "kuwait telesign" || norm === "clearance officer";
    });
  }, [isAdmin, roles]);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [employee, setEmployee] = React.useState("");
  const [appointmentDate, setAppointmentDate] = React.useState("");
  const [injazNumber, setInjazNumber] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState<"PAID" | "UNPAID">("UNPAID");
  const [paymentNo, setPaymentNo] = React.useState("");
  const [injazFee, setInjazFee] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");
  const [remark, setRemark] = React.useState("");
  const [isGeneratingInjaz, setIsGeneratingInjaz] = React.useState(false);

  // Reschedule Dialog State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = React.useState(false);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleCause, setRescheduleCause] = React.useState("");

  const currentInjazStatus = selectedRow?.injaz?.status;
  const isInjazTerminal = ["Issued", "Complete", "Completed", "Stamped", "Rejected", "Cancelled"].includes(currentInjazStatus || "");
  const [isRescheduling, setIsRescheduling] = React.useState(false);

  // Forfeit and Restart Dialog State
  const [isForfeitModalOpen, setIsForfeitModalOpen] = React.useState(false);
  const [forfeitReason, setForfeitReason] = React.useState("");
  const [forfeitNewDate, setForfeitNewDate] = React.useState("");
  const [forfeitNewInjazId, setForfeitNewInjazId] = React.useState("");
  const [isForfeiting, setIsForfeiting] = React.useState(false);

  // Helper to extract Injaz Candidate Data for PDF generation
  const getInjazDataForRow = (row?: WorkspaceApplicantRow | null): InjazCandidateData => {
    if (!row) return {};
    const app = (row.applicant as any) || {};
    return {
      applicantId: row.applicantId || "",
      fullName: row.fullName || "",
      firstName: app?.first_name || (row.fullName ? row.fullName.split(" ")[0] : ""),
      middleName: app?.middle_name || (row.fullName ? row.fullName.split(" ")[1] : ""),
      lastName: app?.last_name || (row.fullName ? row.fullName.split(" ").slice(2).join(" ") : ""),
      motherName: app?.mother_name || app?.motherName || "",
      passportNumber: row.passportNumber || "",
      passportIssueDate: app?.passport_issue_date || app?.issue_date || "",
      passportExpiry: app?.passport_expiry || app?.expiry_date || "",
      placeOfIssue: app?.place_of_issue || "",
      placeOfBirth: app?.place_of_birth || app?.leaving_town || "",
      dateOfBirth: app?.date_of_birth || "",
      nationality: app?.nationality || "ETHIOPIAN",
      gender: app?.gender || "FEMALE",
      maritalStatus: app?.marital_status || "",
      religion: app?.religion || "",
      targetJob: app?.target_job || app?.job_applied || "",
      educationLevel: app?.education_level || app?.qualification || "",
      phone: row.contact || app?.phone || "",
      city: app?.city || "",
      destinationCountry: row.destinationCountry || "Saudi Arabia",
      sponsorName: row.sponsorName || app?.sponsor_name || "",
      sponsorId: row.sponsorId || app?.sponsor_id || "",
      sponsorPhone: app?.sponsor_phone || "",
      destinationCity: app?.destination_city || "",
      contractorName: app?.contractor_name || "",
      contractNumber: row.contractNumber || app?.contract_number || "",
      visaNumber: row.visaNumber || app?.visa_number || "",
      injazNumber: injazNumber || (row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || "",
      paymentNo: paymentNo || (row.injaz as any)?.payment_no || "",
      appointmentDate: appointmentDate || row.appointmentDate || (row.injaz as any)?.appointment_date || "",
    };
  };

  const handleGenerateInjazDoc = async () => {
    if (!selectedRow) return;
    const stepName = selectedRow.clearanceStepName || selectedRow.injaz?.name;
    try {
      setIsGeneratingInjaz(true);
      // Attempt authoritative backend render_injaz_pdf first
      if (stepName) {
        try {
          setIsGeneratingInjaz(true);
          toast.info("Rendering Injaz PDF...");
          const blob = await renderInjazPdfV2(stepName);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Injaz_${selectedRow.passportNumber || selectedRow.applicantId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success("Official Injaz document downloaded successfully!");
          return;
        } catch (backendErr) {
          console.warn("Backend renderInjazPdfV2 fallback to client generator:", backendErr);
        }
      }

      toast.info("Generating Injaz Document...");
      await downloadInjazDocumentPDF(getInjazDataForRow(selectedRow));
      toast.success("Injaz document downloaded successfully!", {
        description: `Official Visa Application Form for ${selectedRow.fullName}`,
      });
    } catch (err: any) {
      console.error("Injaz generation error:", err);
      toast.error("Failed to generate Injaz document", { description: err?.message || "Generation error" });
    } finally {
      setIsGeneratingInjaz(false);
    }
  };

  const handleOpenInjazDoc = async () => {
    if (!selectedRow) return;
    try {
      setIsGeneratingInjaz(true);
      await openInjazDocumentInNewTab(getInjazDataForRow(selectedRow));
      toast.success("Injaz document opened in new tab!");
    } catch (err: any) {
      console.error("Injaz open error:", err);
      toast.error("Failed to open Injaz document", { description: err?.message || "Open error" });
    } finally {
      setIsGeneratingInjaz(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedRow) return;
    const stepName = selectedRow.clearanceStepName || selectedRow.injaz?.name;
    if (!stepName || !rescheduleDate) {
      toast.error("New appointment date is required.");
      return;
    }
    setIsRescheduling(true);
    try {
      await rescheduleTaeshirAppointmentV2(stepName, rescheduleDate, rescheduleCause || "Applicant requested reschedule");
      toast.success("Taeshir appointment rescheduled successfully!");
      setAppointmentDate(rescheduleDate);
      setIsRescheduleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to reschedule appointment", { description: err?.message });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleForfeitAndRestartInjaz = async () => {
    if (!selectedRow) return;
    const stepName = selectedRow.clearanceStepName || selectedRow.injaz?.name;
    if (!stepName || !forfeitReason || !forfeitNewDate || !forfeitNewInjazId) {
      toast.error("Reason, new appointment date, and new Injaz Application ID are required.");
      return;
    }
    setIsForfeiting(true);
    try {
      await forfeitInjazAndRestartV2(stepName, forfeitReason, forfeitNewDate, forfeitNewInjazId);
      toast.success("Injaz forfeited and restarted with new application!");
      setAppointmentDate(forfeitNewDate);
      setInjazNumber(forfeitNewInjazId);
      setIsForfeitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to forfeit and restart Injaz", { description: err?.message });
    } finally {
      setIsForfeiting(false);
    }
  };

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const injaz = selectedRow.injaz;
      const st = injaz?.status;
      setStatus(st === "Approved" || st === "Completed" || st === "Complete" || st === "Issued" ? "Completed" : "Pending");
      setEmployee(injaz?.assigned_officer || injaz?.employee || "");
      setAppointmentDate(
        selectedRow.appointmentDate && selectedRow.appointmentDate !== "—"
          ? selectedRow.appointmentDate
          : (injaz as any)?.appointment_date || ""
      );
      setInjazNumber(
        injaz?.reference_no ||
        (injaz as any)?.injaz_number ||
        ""
      );
      const isPaid =
        selectedRow.injazPayment === "PAID" ||
        (injaz?.payment_status || "").toLowerCase().includes("paid");
      setPaymentStatus(isPaid ? "PAID" : "UNPAID");
      setPaymentNo((injaz as any)?.payment_no || "");
      setPaymentDate((injaz as any)?.payment_date || "");
      setInjazFee((injaz as any)?.fee ? String((injaz as any).fee) : "");
      setRemark(selectedRow.remark && selectedRow.remark !== "—" ? selectedRow.remark : (injaz as any)?.notes || "");
    }
  }, [selectedRow]);

  // Mutation to persist Te'shir / Injaz changes via V2
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;
      const stepName = selectedRow.clearanceStepName || selectedRow.injaz?.name;

      if (injazFee && Number(injazFee) > 0 && selectedRow.dsrName) {
        try {
          await logStageExpenseV2(
            Number(injazFee),
            "USD",
            "Taeshir / Injaz Fee",
            selectedRow.dsrName,
            "Taeshir"
          );
        } catch (err: any) {
          console.warn("logStageExpenseV2 error:", err);
        }
      }

      if (stepName) {
        // Set Taeshir appointment if details are present
        if (appointmentDate && injazNumber) {
          try {
            await setTaeshirAppointmentV2(stepName, appointmentDate, injazNumber);
          } catch (err: any) {
            console.warn("setTaeshirAppointmentV2 warning:", err);
          }
        }

        // Record Injaz payment if fee entered
        if (paymentStatus === "PAID" || (injazFee && Number(injazFee) > 0 && paymentNo)) {
          try {
            await recordInjazPaymentV2(
              stepName,
              Number(injazFee) || 10.5,
              "USD",
              paymentNo || undefined,
              paymentDate || undefined
            );
          } catch (err: any) {
            console.warn("recordInjazPaymentV2 warning:", err);
          }
        }

        const stepStatus = selectedRow.injaz?.status;
        const isTerminal = ["Issued", "Complete", "Completed", "Stamped", "Rejected", "Cancelled"].includes(stepStatus || "");

        if (!isTerminal) {
          if (status === "Completed" && stepStatus !== "Completed" && stepStatus !== "Complete") {
            await completeClearanceStepV2(stepName, injazNumber);
          } else if (status === "Pending" && stepStatus === "Pending") {
            await startClearanceStepV2(stepName);
          }

          if (isAdmin && employee && employee !== (selectedRow.injaz?.assigned_officer || selectedRow.injaz?.employee)) {
            try {
              await reassignClearanceStepV2(stepName, employee);
            } catch (err: any) {
              console.warn("reassignClearanceStepV2 warning:", err);
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`Te'shir Clearance & Appointment Date for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update Te'shir record.");
    },
  });

  // Columns definition matching TE'SHIR / INJAZ Sheet specifications
  const columns: OperationalColumn<WorkspaceApplicantRow>[] = [
    {
      id: "index",
      header: "#",
      width: "50px",
      align: "center",
      cell: (_, idx) => <span className="text-slate-600 dark:text-zinc-400 font-mono text-xs">{(idx ?? 0) + 1}</span>,
    },
    {
      id: "candidate",
      header: "CANDIDATE",
      accessorKey: "fullName",
      width: "220px",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white uppercase truncate text-xs">{row.fullName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">{row.applicantId}</span>
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
      width: "180px",
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
      width: "220px",
      cell: (row) => (
        <div className="truncate block max-w-[210px]">
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
      id: "injazNumber",
      header: "INJAZ NO",
      accessorKey: "injaz",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-xs text-blue-950 dark:text-blue-300 font-bold">
          {(row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || "—"}
        </span>
      ),
    },
    {
      id: "injazPayment",
      header: "INJAZ PAYMENT",
      accessorKey: "injazPayment",
      width: "120px",
      align: "center",
      cell: (row) => {
        const isPaid = row.injazPayment === "PAID" || (row.injaz as any)?.payment_status === "Paid";
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
      id: "appointmentDate",
      header: "APPOINTMENT DATE",
      accessorKey: "appointmentDate",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 font-medium text-xs">
          {row.appointmentDate || "—"}
        </span>
      ),
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
            className="h-6 px-2 text-[11px] font-semibold border-blue-600/30 text-blue-900 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                toast.info("Generating Injaz document...");
                await downloadInjazDocumentPDF(getInjazDataForRow(row));
                toast.success("Injaz document downloaded!");
              } catch (err: any) {
                toast.error("Failed to generate Injaz document: " + err.message);
              }
            }}
            className="h-6 px-2 text-[11px] font-semibold border-emerald-600/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            title="Download Injaz Document"
          >
            <FileDown className="h-3 w-3 mr-1" />
            Injaz
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <OperationalTable
        title="Te'shir / Injaz MOFA Processing"
        subtitle="Saudi Ministry of Foreign Affairs electronic visa application, fee settlement, and biometric appointment scheduling."
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
        title="Te'shir / MOFA Visa Processing Details"
        applicantName={selectedRow?.fullName || ""}
        applicantId={selectedRow?.applicantId || ""}
        passportNumber={selectedRow?.passportNumber}
        statusBadge={
          <Badge
            className={
              status === "Completed"
                ? "bg-emerald-600 text-white font-bold text-[10px]"
                : "bg-blue-600 text-white font-bold text-[10px]"
            }
          >
            {status}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        {/* Section 1: Read-Only Candidate & Contract Context */}
        <DrawerSection title="Candidate & Contract Dossier Context" icon={User}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField
            label="Contract Number"
            value={selectedRow?.contractNumber || (selectedRow?.applicant as any)?.contract_number || "2005450415"}
            isReadOnly
          />
          <DrawerField
            label="Sponsor / Kafeel Name"
            value={selectedRow?.sponsorName || (selectedRow?.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
            isReadOnly
          />
          <DrawerField
            label="Sponsor National ID"
            value={selectedRow?.sponsorId || (selectedRow?.applicant as any)?.sponsor_id || "1130373143"}
            isReadOnly
          />
          <DrawerField
            label="MOFA Visa Number"
            value={selectedRow?.visaNumber || (selectedRow?.applicant as any)?.visa_number || "1908334046"}
            isReadOnly
          />
          <DrawerField
            label="Saudi Agency (Contractor)"
            value={(selectedRow?.applicant as any)?.contractor_name || selectedRow?.lockedContractor || "—"}
            isReadOnly
          />
        </DrawerSection>

        {/* Section 2: Editable Te'shir & Appointment Processing Fields */}
        <DrawerSection title="Te'shir Appointment & Clearance Actions" icon={CalendarDays}>
          {isInjazTerminal && (
            <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 p-2.5 text-xs text-slate-600 dark:text-zinc-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>This Te'shir clearance step is finalized ({currentInjazStatus}). Status and handler assignments are locked.</span>
            </div>
          )}

          <DrawerField label="Te'shir Appointment Date" isReadOnly={false}>
            <input
              type="date"
              value={appointmentDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            />
          </DrawerField>

          <DrawerField label="Te'shir Clearance Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending || isInjazTerminal}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white disabled:opacity-60"
            >
              <option value="Pending">Pending (Biometrics Scheduled)</option>
              <option value="Completed">Completed (MOFA Biometrics Endorsed)</option>
            </select>
          </DrawerField>

          <DrawerField label="Injaz Application (E-Number)" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. E4982104"
              value={injazNumber}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setInjazNumber(e.target.value)}
              className="h-9 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Injaz Fee Settlement" isReadOnly={false}>
            <select
              value={paymentStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="UNPAID">UNPAID (Pending Payment)</option>
              <option value="PAID">PAID (Settled)</option>
            </select>
          </DrawerField>

          <DrawerField label="Injaz Fee (USD)" isReadOnly={false}>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                placeholder="10.5"
                value={injazFee}
                disabled={!canEdit || mutation.isPending}
                onChange={(e) => setInjazFee(e.target.value)}
                className="h-9 text-xs font-mono pr-12 bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                USD
              </span>
            </div>
          </DrawerField>

          <DrawerField label="Injaz Payment № / Receipt" isReadOnly={false}>
            <Input
              type="text"
              placeholder="Enter receipt number (No default)"
              value={paymentNo}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setPaymentNo(e.target.value)}
              className="h-9 text-xs font-mono bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Injaz Payment Date" isReadOnly={false}>
            <Input
              type="date"
              value={paymentDate}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          <DrawerField label="Processing Remark / Notes" isReadOnly={false}>
            <Input
              type="text"
              placeholder="Enter processing remarks (No default)"
              value={remark}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setRemark(e.target.value)}
              className="h-9 text-xs bg-white dark:bg-[#1a1a20] border-slate-200 dark:border-[#2c2c36]"
            />
          </DrawerField>

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <DrawerField label="Assigned Te'shir Officer (Admin Only)" isReadOnly={false}>
                <select
                  value={employee}
                  disabled={!canEdit || mutation.isPending || isInjazTerminal}
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

        {/* Section 3: Official Injaz Document Generation */}
        <DrawerSection title="Official Injaz Document" icon={FileText}>
          <div className="space-y-2.5">
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Generate the official Saudi Ministry of Foreign Affairs (MOFA) electronic visa application form pre-populated with candidate and sponsor details.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={handleGenerateInjazDoc}
                disabled={isGeneratingInjaz}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs"
              >
                {isGeneratingInjaz ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    Save as PDF
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInjazDoc}
                disabled={isGeneratingInjaz}
                className="text-xs border-slate-300 dark:border-[#2a2a32] font-semibold text-slate-800 dark:text-zinc-200"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
                Print Document
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRescheduleDate(appointmentDate);
                  setRescheduleCause("");
                  setIsRescheduleModalOpen(true);
                }}
                className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Free Reschedule
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForfeitReason("");
                  setForfeitNewDate("");
                  setForfeitNewInjazId("");
                  setIsForfeitModalOpen(true);
                }}
                className="text-xs border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Forfeit &amp; Restart
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!selectedRow) return;
                  try {
                    const res = await sendApplicantToExtension(selectedRow.applicant || (selectedRow as any));
                    if (res.success) {
                      toast.success("Candidate sent to extension for MOFA / Visa autofill!");
                    } else {
                      toast.info("Candidate loaded into browser extension memory.");
                    }
                  } catch (err: any) {
                    toast.error("Failed to bridge candidate to extension: " + err.message);
                  }
                }}
                className="text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Send to Extension (MOFA / Visa)
              </Button>
            </div>
          </div>
        </DrawerSection>

        {/* Stage Fee Required Logging (Routes to Finance) */}
        <StageFeeSection
          placementId={selectedRow?.dsrName}
          stageName="Te'shir / Injaz Clearance"
          defaultDirection="Expense"
        />
      </OperationalDrawer>

      {/* Free Reschedule Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Reschedule Taeshir Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reschedule the visa center slot without forfeiting paid Injaz consular fees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-xs">New Appointment Date *</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-xs">Cause / Justification</Label>
              <Input
                type="text"
                placeholder="e.g. Candidate illness / center slot change"
                value={rescheduleCause}
                onChange={(e) => setRescheduleCause(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isRescheduling || !rescheduleDate}
              onClick={handleRescheduleAppointment}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
            >
              {isRescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forfeit and Restart Injaz Modal */}
      <Dialog open={isForfeitModalOpen} onOpenChange={setIsForfeitModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-rose-600">
              <ShieldCheck className="h-4 w-4" />
              Forfeit Injaz &amp; Restart Application
            </DialogTitle>
            <DialogDescription className="text-xs">
              Closes the current attempt as forfeited and appends a fresh active attempt with a new Injaz Application ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-xs">Forfeiture Reason *</Label>
              <Input
                type="text"
                placeholder="e.g. Missed slot; fee forfeited"
                value={forfeitReason}
                onChange={(e) => setForfeitReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-xs">New Appointment Date *</Label>
              <Input
                type="date"
                value={forfeitNewDate}
                onChange={(e) => setForfeitNewDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-xs">New Injaz Application ID (E-number) *</Label>
              <Input
                type="text"
                placeholder="e.g. E49829911"
                value={forfeitNewInjazId}
                onChange={(e) => setForfeitNewInjazId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsForfeitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isForfeiting || !forfeitReason || !forfeitNewDate || !forfeitNewInjazId}
              onClick={handleForfeitAndRestartInjaz}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
            >
              {isForfeiting ? "Forfeiting & Restarting..." : "Forfeit & Restart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
