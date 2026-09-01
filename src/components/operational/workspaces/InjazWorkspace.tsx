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
  Loader2,
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
import { cn } from "@/lib/utils";
import {
  updateInjazClearanceApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can, isAdminUser } from "@/lib/auth/permissions";
import { demoStore } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/config/env";
import {
  downloadInjazDocumentPDF,
  openInjazDocumentInNewTab,
  InjazCandidateData,
} from "@/lib/pdf/injazDocumentGenerator";

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
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editInjaz") || can(authUser, "manageClearances");
  const isAdmin = isAdminUser(authUser);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [employee, setEmployee] = React.useState("");
  const [appointmentDate, setAppointmentDate] = React.useState("");
  const [injazNumber, setInjazNumber] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState<"PAID" | "UNPAID">("UNPAID");
  const [paymentNo, setPaymentNo] = React.useState("");
  const [remark, setRemark] = React.useState("");
  const [isGeneratingInjaz, setIsGeneratingInjaz] = React.useState(false);

  // Helper to extract Injaz Candidate Data
  const getInjazDataForRow = (row?: WorkspaceApplicantRow | null): InjazCandidateData => {
    if (!row) return {};
    const app = row.applicant as any;
    return {
      applicantId: row.applicantId,
      fullName: row.fullName,
      firstName: app?.first_name || (row.fullName ? row.fullName.split(" ")[0] : ""),
      middleName: app?.middle_name || (row.fullName ? row.fullName.split(" ")[1] : ""),
      lastName: app?.last_name || (row.fullName ? row.fullName.split(" ").slice(2).join(" ") : ""),
      motherName: app?.mother_name || app?.motherName || "AYESHA MOHAMMED",
      passportNumber: row.passportNumber,
      passportIssueDate: app?.passport_issue_date || app?.issue_date || "2024-08-14",
      passportExpiry: app?.passport_expiry || app?.expiry_date || "2029-08-14",
      placeOfIssue: app?.place_of_issue || "ADDIS ABABA",
      placeOfBirth: app?.place_of_birth || app?.leaving_town || "ADDIS ABABA",
      dateOfBirth: app?.date_of_birth || "1997-04-12",
      nationality: app?.nationality || "ETHIOPIAN",
      gender: app?.gender || "FEMALE",
      maritalStatus: app?.marital_status || "SINGLE",
      religion: app?.religion || "MUSLIM",
      targetJob: app?.target_job || app?.job_applied || "HOUSEMAID",
      educationLevel: app?.education_level || app?.qualification || "PRIMARY SCHOOL",
      phone: row.contact || app?.phone || "+251 91 123 4567",
      city: app?.city || "ADDIS ABABA",
      destinationCountry: row.destinationCountry || "Saudi Arabia",
      sponsorName: row.sponsorName || app?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI",
      sponsorId: row.sponsorId || app?.sponsor_id || "1130373143",
      sponsorPhone: app?.sponsor_phone || "966503221802",
      destinationCity: app?.destination_city || "RIYADH",
      contractorName: app?.contractor_name || "Tihamat Asir Recruitment company",
      contractNumber: row.contractNumber || app?.contract_number || "2005450415",
      visaNumber: row.visaNumber || app?.visa_number || "1908334046",
      injazNumber: injazNumber || (row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || `E${row.passportNumber?.replace(/\D/g, "") || "4982104"}`,
      paymentNo: paymentNo || (row.injaz as any)?.payment_no || "99281401",
      appointmentDate: appointmentDate || row.appointmentDate || (row.injaz as any)?.appointment_date || "2026-08-25",
    };
  };

  const handleGenerateInjazDoc = async () => {
    if (!selectedRow) return;
    try {
      setIsGeneratingInjaz(true);
      toast.info("Generating official Injaz Document...");
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

  // Sync drawer form state when row changes
  React.useEffect(() => {
    if (selectedRow) {
      const injaz = selectedRow.injaz;
      setStatus((injaz?.status as any) === "Approved" || (injaz?.status as any) === "Completed" ? "Completed" : "Pending");
      setEmployee(injaz?.employee || (injaz as any)?.assigned_officer || "");
      setAppointmentDate(
        selectedRow.appointmentDate && selectedRow.appointmentDate !== "—"
          ? selectedRow.appointmentDate
          : (injaz as any)?.appointment_date || (injaz as any)?.due_date || "2026-08-25"
      );
      setInjazNumber((injaz as any)?.reference_no || (injaz as any)?.injaz_number || `E${selectedRow.passportNumber?.replace(/\D/g, "") || "4982104"}`);
      const isPaid = selectedRow.injazPayment === "PAID" || (injaz as any)?.payment_status === "Paid";
      setPaymentStatus(isPaid ? "PAID" : "UNPAID");
      setPaymentNo((injaz as any)?.payment_no || "99281401");
      setRemark(selectedRow.remark || (injaz as any)?.notes || "Biometrics Scheduled");
    }
  }, [selectedRow]);

  // Mutation to save Te'shir Appointment Date & Status
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;

      if (isDemoMode()) {
        const stepName = selectedRow.injaz?.name || `STEP-${selectedRow.applicantId}`;
        try {
          demoStore.updateClearanceStep(stepName, {
            status: status === "Completed" ? "Completed" : "In Progress",
            appointment_date: appointmentDate,
            due_date: appointmentDate,
            reference_no: injazNumber,
            payment_status: paymentStatus === "PAID" ? "Paid" : "Unpaid",
            payment_no: paymentNo,
            notes: remark,
            ...(isAdmin && employee ? { assigned_officer: employee } : {}),
          });
        } catch {}

        demoStore.updateApplicant(selectedRow.applicantId, {
          appointment_date: appointmentDate,
        });
        return;
      }

      const targetDoc = selectedRow.injaz?.name || selectedRow.dsrName;
      if (targetDoc) {
        await updateInjazClearanceApi(targetDoc, {
          status: status === "Completed" ? "Approved" : "Pending",
          ...(isAdmin && employee ? { employee } : {}),
          appointment_date: appointmentDate || undefined,
          due_date: appointmentDate || undefined,
          reference_no: injazNumber || undefined,
          payment_status: paymentStatus === "PAID" ? "Paid" : "Unpaid",
          payment_no: paymentNo || undefined,
          notes: remark || undefined,
          dsr: selectedRow.dsrName,
        } as any);
      }

      // Recalculate lifecycle
      try {
        await recalculateApplicantStateApi(selectedRow.applicantId);
      } catch {}
    },
    onSuccess: () => {
      toast.success(`Te'shir Clearance & Appointment Date for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
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
            {row.contractNumber || (row.applicant as any)?.contract_number || "2005450415"}
          </span>
          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
            Visa: {row.visaNumber || (row.applicant as any)?.visa_number || "1908334046"}
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
            {row.sponsorName || (row.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-mono">
            ID: {row.sponsorId || (row.applicant as any)?.sponsor_id || "1130373143"}
          </span>
        </div>
      ),
    },
    {
      id: "injazNumber",
      header: "INJAZ NO",
      accessorKey: "injaz",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-xs text-blue-950 dark:text-blue-300 font-bold">
          {(row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || `E${row.passportNumber?.replace(/\D/g, "") || "4982104"}`}
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
            value={(selectedRow?.applicant as any)?.contractor_name || "Tihamat Asir Recruitment company"}
            isReadOnly
          />
        </DrawerSection>

        {/* Section 2: Editable Te'shir & Appointment Processing Fields */}
        <DrawerSection title="Te'shir Appointment & Clearance Actions" icon={CalendarDays}>
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
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending (Biometrics Scheduled)</option>
              <option value="Completed">Completed (MOFA Biometrics Endorsed)</option>
            </select>
          </DrawerField>

          <DrawerField label="Injaz Application (E-Number)" isReadOnly={false}>
            <input
              type="text"
              placeholder="e.g. E4982104"
              value={injazNumber}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setInjazNumber(e.target.value)}
              className="h-9 w-full px-3 text-xs font-mono font-bold bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
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

          <DrawerField label="Injaz Payment № / Receipt" isReadOnly={false}>
            <input
              type="text"
              placeholder="e.g. 99281401"
              value={paymentNo}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setPaymentNo(e.target.value)}
              className="h-9 w-full px-3 text-xs font-mono bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
            />
          </DrawerField>

          <DrawerField label="Processing Remark / Notes" isReadOnly={false}>
            <input
              type="text"
              placeholder="e.g. Biometrics scheduled at Addis center"
              value={remark}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setRemark(e.target.value)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-900 dark:text-white"
            />
          </DrawerField>

          {/* Assigned Officer Field: Visible ONLY to Admins/Managers */}
          {isAdmin && (
            <div className="sm:col-span-2">
              <DrawerField label="Assigned Te'shir Officer (Admin Only)" isReadOnly={false}>
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
                    Generating Injaz PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    Injaz document
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInjazDoc}
                disabled={isGeneratingInjaz}
                className="text-xs border-slate-300 dark:border-[#2a2a32]"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open Injaz in New Tab
              </Button>
            </div>
          </div>
        </DrawerSection>
      </OperationalDrawer>
    </>
  );
}
