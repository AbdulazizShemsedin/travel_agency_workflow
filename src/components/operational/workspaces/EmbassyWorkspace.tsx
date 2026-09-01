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
  ShieldCheck,
  FileText,
  FileDown,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import {
  updateEmbassyClearanceApi,
  submitDsrStampApi,
  recalculateApplicantStateApi,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { can, isAdminUser } from "@/lib/auth/permissions";
import {
  downloadInjazDocumentPDF,
  openInjazDocumentInNewTab,
  InjazCandidateData,
} from "@/lib/pdf/injazDocumentGenerator";

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
  const { authUser } = useAuth();
  const canEdit = can(authUser, "editEmbassy") || can(authUser, "manageClearances");
  const isAdmin = isAdminUser(authUser);

  const [selectedRow, setSelectedRow] = React.useState<WorkspaceApplicantRow | null>(null);

  // Form State for Drawer
  const [status, setStatus] = React.useState<"Pending" | "Submitted" | "Approved" | "Rejected">("Pending");
  const [submissionDate, setSubmissionDate] = React.useState("");
  const [feeStatus, setFeeStatus] = React.useState<"Unpaid" | "Paid">("Unpaid");
  const [receiptNo, setReceiptNo] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  const [stampNumber, setStampNumber] = React.useState("");
  const [stampDate, setStampDate] = React.useState("");
  const [rejectionRemark, setRejectionRemark] = React.useState("");
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
      injazNumber: (row.injaz as any)?.reference_no || (row.injaz as any)?.injaz_number || `E${row.passportNumber?.replace(/\D/g, "") || "4982104"}`,
      paymentNo: (row.injaz as any)?.payment_no || "99281401",
      appointmentDate: row.appointmentDate || (row.injaz as any)?.appointment_date || "2026-08-25",
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
      const embassy = selectedRow.embassy;
      setStatus((embassy?.status as any) || "Pending");
      setSubmissionDate(embassy?.submission_date || "");
      setFeeStatus((embassy?.fee_status as any) || "Unpaid");
      setReceiptNo(embassy?.receipt_no || "");
      setEmployee(embassy?.employee || (embassy as any)?.assigned_officer || "");
      setStampNumber(selectedRow.visaNumber || (selectedRow.applicant as any)?.visa_number || "1908334046");
      setStampDate(selectedRow.appointmentDate || (selectedRow.applicant as any)?.creation || new Date().toISOString().split("T")[0]);
      setRejectionRemark((embassy as any)?.rejection_remark || (embassy as any)?.notes || "");
    }
  }, [selectedRow]);

  // Mutation to save Embassy Clearance & Optional Visa Stamp
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) return;

      const targetDoc = selectedRow.embassy?.name || selectedRow.dsrName || selectedRow.applicantId;
      if (targetDoc) {
        await updateEmbassyClearanceApi(targetDoc, {
          status,
          submission_date: submissionDate,
          fee_status: feeStatus,
          receipt_no: receiptNo,
          ...(isAdmin && employee ? { employee } : {}),
          rejection_remark: status === "Rejected" ? rejectionRemark : undefined,
        } as any);
      }

      // If stamped / approved, record DSR stamp number
      if (status === "Approved" && stampNumber) {
        await submitDsrStampApi({
          dsr: selectedRow.dsrName || targetDoc,
          stamp_number: stampNumber,
          stamp_date: stampDate || new Date().toISOString().split("T")[0],
          status: "Completed",
        });
      }

      await recalculateApplicantStateApi(selectedRow.applicantId);
    },
    onSuccess: () => {
      toast.success(`Embassy Clearance for ${selectedRow?.fullName} updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      onRefresh();
      setSelectedRow(null);
    },
    onError: (err: any) => {
      toast.error("Failed to update Embassy record: " + err.message);
    },
  });

  // Columns definition matching EMBASSY Sheet specifications
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
      width: "160px",
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-blue-900 dark:text-blue-300 font-bold">
            {row.visaNumber || (row.applicant as any)?.visa_number || "1908334046"}
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Wakala: {row.wakalaStatus || "Authorized"}
          </span>
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
          {row.sponsorName || (row.applicant as any)?.sponsor_name || "ABDULLAH AMER MUGHABBIRI ALBARIQI"}
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
        if (s === "Approved") colorClass = "bg-emerald-600 text-white";
        if (s === "Submitted") colorClass = "bg-blue-600 text-white";
        if (s === "Rejected") colorClass = "bg-rose-600 text-white";

        return (
          <Badge className={`font-semibold text-[10px] ${colorClass}`}>
            {s}
          </Badge>
        );
      },
    },
    {
      id: "feeStatus",
      header: "EMBASSY FEE",
      width: "110px",
      align: "center",
      cell: (row) => {
        const isPaid = (row.embassy as any)?.fee_status === "Paid";
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
            className="h-6 px-2 text-[11px] font-semibold border-emerald-600/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
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
            className="h-6 px-2 text-[11px] font-semibold border-blue-600/30 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
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
            {status}
          </Badge>
        }
        canEdit={canEdit}
        isSaving={mutation.isPending}
        onSave={() => mutation.mutate()}
      >
        <DrawerSection title="Candidate & Visa Dossier" icon={Building2}>
          <DrawerField label="Full Name" value={selectedRow?.fullName} isReadOnly />
          <DrawerField label="Passport Number" value={selectedRow?.passportNumber} isReadOnly />
          <DrawerField label="Destination Embassy" value={selectedRow?.destinationCountry} isReadOnly />
          <DrawerField label="Sponsor Name" value={selectedRow?.sponsorName || "—"} isReadOnly />
          <DrawerField label="MOFA / Visa Number" value={selectedRow?.visaNumber || "—"} isReadOnly />
          <DrawerField label="Contract Number" value={selectedRow?.contractNumber || "—"} isReadOnly />
        </DrawerSection>

        <DrawerSection title="Musaned Wakala & Attestation" icon={FileText}>
          <DrawerField label="Wakala Authorization Status" value={selectedRow?.wakalaStatus || "Authorized"} isReadOnly />
          <DrawerField label="Contract Attestation №" value={selectedRow?.contractNumber || "2005450415"} isReadOnly />
          <DrawerField label="Foreign Agency Partner" value={selectedRow?.company || selectedRow?.lockedContractor || "Tihamat Asir Recruitment company"} isReadOnly />
        </DrawerSection>

        <DrawerSection title="Embassy Submission Details" icon={FileCheck2}>
          <DrawerField label="Embassy Clearance Status" isReadOnly={false}>
            <select
              value={status}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md font-semibold text-slate-900 dark:text-white"
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

          <DrawerField label="Embassy Fee Status" isReadOnly={false}>
            <select
              value={feeStatus}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setFeeStatus(e.target.value as any)}
              className="h-9 w-full px-3 text-xs bg-white dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2c2c36] rounded-md text-slate-800 dark:text-zinc-200"
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
          </DrawerField>

          <DrawerField label="Fee Receipt №" isReadOnly={false}>
            <Input
              type="text"
              placeholder="e.g. REC-88392"
              value={receiptNo}
              disabled={!canEdit || mutation.isPending}
              onChange={(e) => setReceiptNo(e.target.value)}
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

        <DrawerSection title="Visa Stamp Registration (DSR)" icon={ShieldCheck}>
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

        <DrawerSection title="Official Injaz Document" icon={FileText}>
          <div className="space-y-2.5">
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Generate and download the official pre-populated Saudi MOFA Injaz visa application form for embassy submission.
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
