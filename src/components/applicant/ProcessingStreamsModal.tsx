"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plane,
  Building2,
  Fingerprint,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Ticket,
  HeartPulse,
  Lock,
  User,
  Calendar,
  FileText,
  FileCheck2,
  PhoneCall,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Applicant } from "@/types/applicant";
import {
  ProcessingData,
  ProcessingStream,
  LMSClearanceRecord,
  InjazClearanceRecord,
  WakalaClearanceRecord,
  EmbassyClearanceRecord,
  TelesignClearanceRecord,
  DSRStampRecord,
  DSRTicketRecord,
  DSRDepartureRecord,
} from "@/types/processing";
import {
  fetchProcessingData,
  updateLmsClearanceApi,
  updateWakalaClearanceApi,
  updateInjazClearanceApi,
  updateEmbassyClearanceApi,
  updateTelesignClearanceApi,
  submitDsrStampApi,
  submitDsrTicketApi,
  submitDsrDepartureApi,
  getEmployeesList,
} from "@/lib/api/applicantApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/AuthProvider";
import { can } from "@/lib/auth/permissions";

interface ProcessingStreamsModalProps {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ProcessingStream;
}

export function ProcessingStreamsModal({
  applicant,
  isOpen,
  onClose,
  initialTab = "lms",
}: ProcessingStreamsModalProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = React.useState<ProcessingStream>(initialTab);

  // Sync initial tab when changed
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fetch processing hierarchy: Applicant -> Dossier -> DSR -> Clearances
  const {
    data: processingData,
    isLoading: isProcessingLoading,
    refetch: refetchProcessing,
  } = useQuery<ProcessingData>({
    queryKey: ["processing", applicant.name],
    queryFn: () => fetchProcessingData(applicant.name),
    enabled: isOpen && !!applicant.name,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesList,
  });

  // Permission evaluation based on canonical RBAC
  const canEditLms = can(authUser, "editLms");
  const canEditInjaz = can(authUser, "editInjaz");
  const canEditWakala = can(authUser, "editWakala");
  const canEditEmbassy = can(authUser, "editEmbassy");
  const canEditTelesign = can(authUser, "editTelesign");
  const canEditStamp = can(authUser, "createStamp");
  const canEditTicket = can(authUser, "createTicket");
  const canEditDeparture = can(authUser, "createDeparture");

  // Invalidate queries helper
  const handleMutationSuccess = (msg: string) => {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: ["processing", applicant.name] });
    queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
    queryClient.invalidateQueries({ queryKey: ["applicants"] });
  };

  // ---------------------------------------------------------------------------
  // 1. LMS Stream State & Mutation
  // ---------------------------------------------------------------------------
  const [lmsStatus, setLmsStatus] = React.useState<"Pending" | "Issued" | "Rejected">("Pending");
  const [lmsEmployee, setLmsEmployee] = React.useState("");
  const [lmsIssuedOn, setLmsIssuedOn] = React.useState("");
  const [missingDataRequested, setMissingDataRequested] = React.useState(false);
  const [missingDataType, setMissingDataType] = React.useState("");
  const [missingDataStatus, setMissingDataStatus] = React.useState<"Pending" | "Received">("Pending");
  const [missingDataNotes, setMissingDataNotes] = React.useState("");

  React.useEffect(() => {
    if (processingData?.lms) {
      setLmsStatus(processingData.lms.status || "Pending");
      setLmsEmployee(processingData.lms.employee || "");
      setLmsIssuedOn(processingData.lms.issued_on || "");
      setMissingDataRequested(Boolean(processingData.lms.missing_data_requested));
      setMissingDataType(processingData.lms.missing_data_type || "");
      setMissingDataStatus(processingData.lms.missing_data_status || "Pending");
      setMissingDataNotes(processingData.lms.missing_data_notes || "");
    }
  }, [processingData?.lms]);

  const lmsMutation = useMutation({
    mutationFn: async () => {
      const docName = processingData?.lms?.name || processingData?.dsr?.name;
      if (!docName) {
        throw new Error("DSR record does not exist on backend for this candidate.");
      }
      return updateLmsClearanceApi(docName, {
        status: lmsStatus,
        employee: lmsEmployee || undefined,
        issued_on: lmsStatus === "Issued" ? lmsIssuedOn || new Date().toISOString().split("T")[0] : undefined,
        missing_data_requested: missingDataRequested ? 1 : 0,
        missing_data_type: missingDataType || undefined,
        missing_data_status: missingDataStatus,
        missing_data_notes: missingDataNotes || undefined,
        dsr: processingData?.dsr?.name,
      });
    },
    onSuccess: () => handleMutationSuccess("LMS Clearance updated successfully."),
    onError: (err: any) => toast.error(err.message || "Failed to update LMS Clearance."),
  });

  // ---------------------------------------------------------------------------
  // 2. Injaz Stream State & Mutation
  // ---------------------------------------------------------------------------
  const [injazStatus, setInjazStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [injazEmployee, setInjazEmployee] = React.useState("");

  React.useEffect(() => {
    if (processingData?.injaz) {
      setInjazStatus(processingData.injaz.status || "Pending");
      setInjazEmployee(processingData.injaz.employee || "");
    }
  }, [processingData?.injaz]);

  const injazMutation = useMutation({
    mutationFn: async () => {
      const docName = processingData?.injaz?.name || processingData?.dsr?.name;
      if (!docName) {
        throw new Error("DSR record does not exist on backend for this candidate.");
      }
      return updateInjazClearanceApi(docName, {
        status: injazStatus,
        employee: injazEmployee || undefined,
        dsr: processingData?.dsr?.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Injaz Clearance updated successfully."),
    onError: (err: any) => toast.error(err.message || "Failed to update Injaz Clearance."),
  });

  // ---------------------------------------------------------------------------
  // 3. Wakala Stream State & Mutation
  // ---------------------------------------------------------------------------
  const [wakalaStatus, setWakalaStatus] = React.useState<"Pending" | "Completed">("Pending");
  const [wakalaEmployee, setWakalaEmployee] = React.useState("");

  React.useEffect(() => {
    if (processingData?.wakala) {
      setWakalaStatus(processingData.wakala.status || "Pending");
      setWakalaEmployee(processingData.wakala.employee || "");
    }
  }, [processingData?.wakala]);

  const wakalaMutation = useMutation({
    mutationFn: async () => {
      const docName = processingData?.wakala?.name || processingData?.dsr?.name;
      if (!docName) {
        throw new Error("DSR record does not exist on backend for this candidate.");
      }
      return updateWakalaClearanceApi(docName, {
        status: wakalaStatus,
        employee: wakalaEmployee || undefined,
        dsr: processingData?.dsr?.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Wakala Clearance updated successfully."),
    onError: (err: any) => toast.error(err.message || "Failed to update Wakala Clearance."),
  });

  // ---------------------------------------------------------------------------
  // 4. Embassy Stream State & Mutation
  // ---------------------------------------------------------------------------
  const [embassyStatus, setEmbassyStatus] = React.useState<"Pending" | "Submitted" | "Approved" | "Rejected">("Pending");
  const [embassyEmployee, setEmbassyEmployee] = React.useState("");
  const [embassySubDate, setEmbassySubDate] = React.useState("");
  const [embassyAppDate, setEmbassyAppDate] = React.useState("");
  const [feeStatus, setFeeStatus] = React.useState<"Unpaid" | "Paid">("Unpaid");
  const [feeAmount, setFeeAmount] = React.useState<number>(0);
  const [feeCurrency, setFeeCurrency] = React.useState("KWD");
  const [receiptNo, setReceiptNo] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");
  const [embassyRemarks, setEmbassyRemarks] = React.useState("");

  React.useEffect(() => {
    if (processingData?.embassy) {
      setEmbassyStatus(processingData.embassy.status || "Pending");
      setEmbassyEmployee(processingData.embassy.employee || "");
      setEmbassySubDate(processingData.embassy.submission_date || "");
      setEmbassyAppDate(processingData.embassy.approval_date || "");
      setFeeStatus(processingData.embassy.fee_status || "Unpaid");
      setFeeAmount(processingData.embassy.fee_amount || 0);
      setFeeCurrency(processingData.embassy.fee_currency || "KWD");
      setReceiptNo(processingData.embassy.receipt_no || "");
      setPaymentDate(processingData.embassy.payment_date || "");
      setEmbassyRemarks(processingData.embassy.remarks || "");
    }
  }, [processingData?.embassy]);

  const embassyMutation = useMutation({
    mutationFn: async () => {
      const docName = processingData?.embassy?.name || processingData?.dsr?.name;
      if (!docName) {
        throw new Error("DSR record does not exist on backend for this candidate.");
      }
      return updateEmbassyClearanceApi(docName, {
        status: embassyStatus,
        employee: embassyEmployee || undefined,
        submission_date: embassySubDate || undefined,
        approval_date: embassyAppDate || undefined,
        fee_status: feeStatus,
        fee_amount: feeAmount,
        fee_currency: feeCurrency,
        receipt_no: receiptNo || undefined,
        payment_date: paymentDate || undefined,
        remarks: embassyRemarks || undefined,
        dsr: processingData?.dsr?.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Embassy Clearance updated successfully."),
    onError: (err: any) => toast.error(err.message || "Failed to update Embassy Clearance."),
  });

  // ---------------------------------------------------------------------------
  // 5. Telesign Stream State & Mutation
  // ---------------------------------------------------------------------------
  const [telesignStatus, setTelesignStatus] = React.useState<"Pending" | "In Progress" | "Authenticated" | "Completed" | "Failed">("Pending");
  const [telesignEmployee, setTelesignEmployee] = React.useState("");

  React.useEffect(() => {
    if (processingData?.telesign) {
      setTelesignStatus(processingData.telesign.status || "Pending");
      setTelesignEmployee(processingData.telesign.employee || "");
    }
  }, [processingData?.telesign]);

  const telesignMutation = useMutation({
    mutationFn: async () => {
      const docName = processingData?.telesign?.name || processingData?.dsr?.name;
      if (!docName) {
        throw new Error("DSR record does not exist on backend for this candidate.");
      }
      return updateTelesignClearanceApi(docName, {
        status: telesignStatus,
        employee: telesignEmployee || undefined,
        dsr: processingData?.dsr?.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Telesign Clearance updated successfully."),
    onError: (err: any) => toast.error(err.message || "Failed to update Telesign Clearance."),
  });

  // ---------------------------------------------------------------------------
  // 6. DSR Stamp State & Mutation
  // ---------------------------------------------------------------------------
  const [stampNumber, setStampNumber] = React.useState("");
  const [stampDate, setStampDate] = React.useState("");
  const [stampStatus, setStampStatus] = React.useState<"Pending" | "Completed">("Completed");

  React.useEffect(() => {
    if (processingData?.stamp) {
      setStampNumber(processingData.stamp.stamp_number || "");
      setStampDate(processingData.stamp.stamp_date || "");
      setStampStatus(processingData.stamp.status || "Completed");
    } else {
      setStampNumber(processingData?.dossier?.visa_number || "");
      setStampDate(new Date().toISOString().split("T")[0]);
      setStampStatus("Completed");
    }
  }, [processingData?.stamp, processingData?.dossier]);

  const stampMutation = useMutation({
    mutationFn: async () => {
      if (!processingData?.dsr?.name) {
        throw new Error("DSR record does not exist for this candidate.");
      }
      if (!stampNumber.trim()) {
        throw new Error("Visa stamp number is required.");
      }
      return submitDsrStampApi({
        dsr: processingData.dsr.name,
        stamp_number: stampNumber.trim(),
        stamp_date: stampDate || new Date().toISOString().split("T")[0],
        status: stampStatus,
        applicantId: applicant.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Visa Stamp record submitted."),
    onError: (err: any) => toast.error(err.message || "Failed to submit Visa Stamp."),
  });

  // ---------------------------------------------------------------------------
  // 7. DSR Ticket State & Mutation
  // ---------------------------------------------------------------------------
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [ticketDetails, setTicketDetails] = React.useState("");
  const [ticketStatus, setTicketStatus] = React.useState<"Pending" | "Booked" | "Cancelled">("Booked");

  React.useEffect(() => {
    if (processingData?.ticket) {
      setTicketNumber(processingData.ticket.ticket_number || "");
      setTicketDetails(processingData.ticket.ticket_details || "");
      setTicketStatus(processingData.ticket.status || "Booked");
    } else {
      setTicketNumber("");
      setTicketDetails(`Flight to ${processingData?.dsr?.destination_country || applicant.destination_country || "Saudi Arabia"}`);
      setTicketStatus("Booked");
    }
  }, [processingData?.ticket, processingData?.dsr, applicant.destination_country]);

  const ticketMutation = useMutation({
    mutationFn: async () => {
      if (!processingData?.dsr?.name) {
        throw new Error("DSR record does not exist for this candidate.");
      }
      if (!ticketNumber.trim()) {
        throw new Error("Ticket PNR / number is required.");
      }
      return submitDsrTicketApi({
        dsr: processingData.dsr.name,
        ticket_number: ticketNumber.trim(),
        ticket_details: ticketDetails,
        status: ticketStatus,
        applicantId: applicant.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Flight Ticket record submitted."),
    onError: (err: any) => toast.error(err.message || "Failed to submit Flight Ticket."),
  });

  // ---------------------------------------------------------------------------
  // 8. DSR Departure State & Mutation
  // ---------------------------------------------------------------------------
  const [departureTime, setDepartureTime] = React.useState("");
  const [medical2Result, setMedical2Result] = React.useState<"Pass" | "Fail" | "">("Pass");
  const [medical2Date, setMedical2Date] = React.useState("");
  const [medical2Remark, setMedical2Remark] = React.useState("");
  const [departureStatus, setDepartureStatus] = React.useState<"Pending" | "Departed" | "Cancelled">("Departed");

  React.useEffect(() => {
    if (processingData?.departure) {
      setDepartureTime(processingData.departure.departure_time || "");
      setMedical2Result(processingData.departure.medical_2_result || "Pass");
      setMedical2Date(processingData.departure.medical_2_date || "");
      setMedical2Remark(processingData.departure.medical_2_remark || "");
      setDepartureStatus(processingData.departure.status || "Departed");
    } else {
      setDepartureTime(new Date().toISOString().slice(0, 16));
      setMedical2Result("Pass");
      setMedical2Date(new Date().toISOString().split("T")[0]);
      setDepartureStatus("Departed");
    }
  }, [processingData?.departure]);

  const departureMutation = useMutation({
    mutationFn: async () => {
      if (!processingData?.dsr?.name) {
        throw new Error("DSR record does not exist for this candidate.");
      }
      if (!departureTime) {
        throw new Error("Departure date and time is required.");
      }
      return submitDsrDepartureApi({
        dsr: processingData.dsr.name,
        departure_time: departureTime.includes(":") && departureTime.length === 16 ? `${departureTime}:00` : departureTime,
        medical_2_result: medical2Result,
        medical_2_date: medical2Date || new Date().toISOString().split("T")[0],
        medical_2_remark: medical2Remark,
        status: departureStatus,
        applicantId: applicant.name,
      });
    },
    onSuccess: () => handleMutationSuccess("Departure confirmation submitted. Candidate marked 100% completed."),
    onError: (err: any) => toast.error(err.message || "Failed to submit Departure record."),
  });

  // Helpers
  const getStatusBadge = (status?: string) => {
    const s = (status || "Pending").toLowerCase();
    if (["completed", "issued", "approved", "booked", "departed", "authenticated"].includes(s)) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    }
    if (["rejected", "failed", "cancelled"].includes(s)) {
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">{status}</Badge>;
    }
    if (["submitted", "in progress"].includes(s)) {
      return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">{status}</Badge>;
    }
    return <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">{status || "Pending"}</Badge>;
  };

  const tabs: { key: ProcessingStream; label: string; icon: React.ReactNode; recordStatus?: string; isEditable: boolean }[] = [
    {
      key: "lms",
      label: "LMS Labor",
      icon: <Building2 className="w-4 h-4" />,
      recordStatus: processingData?.lms?.status,
      isEditable: canEditLms,
    },
    {
      key: "injaz",
      label: "Injaz Biometrics",
      icon: <Fingerprint className="w-4 h-4" />,
      recordStatus: processingData?.injaz?.status,
      isEditable: canEditInjaz,
    },
    {
      key: "wakala",
      label: "Wakala Sponsor",
      icon: <Send className="w-4 h-4" />,
      recordStatus: processingData?.wakala?.status,
      isEditable: canEditWakala,
    },
    {
      key: "embassy",
      label: "Embassy Consular",
      icon: <ShieldCheck className="w-4 h-4" />,
      recordStatus: processingData?.embassy?.status,
      isEditable: canEditEmbassy,
    },
    {
      key: "telesign",
      label: "Telesign Calling",
      icon: <PhoneCall className="w-4 h-4" />,
      recordStatus: processingData?.telesign?.status,
      isEditable: canEditTelesign,
    },
    {
      key: "stamp",
      label: "Visa Stamping",
      icon: <FileCheck2 className="w-4 h-4" />,
      recordStatus: processingData?.stamp?.status,
      isEditable: canEditStamp,
    },
    {
      key: "ticket",
      label: "Flight Ticket",
      icon: <Ticket className="w-4 h-4" />,
      recordStatus: processingData?.ticket?.status,
      isEditable: canEditTicket,
    },
    {
      key: "departure",
      label: "Pre-Departure",
      icon: <Plane className="w-4 h-4" />,
      recordStatus: processingData?.departure?.status,
      isEditable: canEditDeparture,
    },
  ];

  const hasDsr = Boolean(processingData?.dsr);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2.5">
                <Plane className="w-5 h-5 text-primary" />
                Processing Streams & Deployments
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Manage parallel clearance streams (LMS, Injaz, Wakala, Embassy, Telesign) and deployment guardrails for{" "}
                <span className="font-semibold text-foreground">{applicant.full_name}</span> ({applicant.name})
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchProcessing()}
              disabled={isProcessingLoading}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessingLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* DSR Status Indicator Bar */}
          <div className="mt-4 p-3 rounded-lg border bg-card/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Dossier:</span>
              <span className="font-mono font-medium">{processingData?.dossier?.name || "None"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">DSR:</span>
              <span className="font-mono font-medium">{processingData?.dsr?.name || "Not initialized"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Pipeline State:</span>
              <Badge variant="info" className="font-semibold">
                {applicant.applicant_state}
              </Badge>
            </div>
          </div>
        </div>

        {/* Missing DSR Alert */}
        {!hasDsr && !isProcessingLoading && (
          <div className="mx-6 mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold text-amber-700 dark:text-amber-300">DSR Record Not Found</h4>
              <p className="text-amber-600/90 dark:text-amber-400/90 text-xs mt-1">
                Processing streams are automatically initialized once an Applicant Dossier is confirmed for a candidate in the <strong>Selected</strong> stage. You can still view current configuration below.
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-border/40 overflow-x-auto flex gap-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary bg-primary/5 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.recordStatus && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ["completed", "issued", "approved", "booked", "departed"].includes(tab.recordStatus.toLowerCase())
                        ? "bg-emerald-500"
                        : ["rejected", "failed", "cancelled"].includes(tab.recordStatus.toLowerCase())
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {isProcessingLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Fetching authoritative clearance records from backend...</p>
            </div>
          ) : (
            <>
              {/* Read-Only Banner for Unprivileged Users */}
              {!tabs.find((t) => t.key === activeTab)?.isEditable && (
                <div className="mb-4 p-2.5 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>You have read-only access to this clearance stream.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Read Only</Badge>
                </div>
              )}

              {/* 1. LMS CLEARANCE TAB */}
              {activeTab === "lms" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">LMS Labor Clearance</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.lms?.name || "Not created"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.lms?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="lms-status" className="text-xs font-medium">Clearance Status</Label>
                      <select
                        id="lms-status"
                        value={lmsStatus}
                        onChange={(e) => setLmsStatus(e.target.value as any)}
                        disabled={!canEditLms || lmsMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Issued">Issued</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lms-employee" className="text-xs font-medium">Assigned Officer</Label>
                      <select
                        id="lms-employee"
                        value={lmsEmployee}
                        onChange={(e) => setLmsEmployee(e.target.value)}
                        disabled={!canEditLms || lmsMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map((emp: any) => (
                          <option key={emp.name} value={emp.name}>
                            {emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lms-issued-on" className="text-xs font-medium">Issued On Date</Label>
                      <Input
                        id="lms-issued-on"
                        type="date"
                        value={lmsIssuedOn}
                        onChange={(e) => setLmsIssuedOn(e.target.value)}
                        disabled={!canEditLms || lmsMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Missing Data Request Section */}
                  <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="missing-data-toggle" className="text-xs font-semibold">
                        Request Missing Document / Medical Data
                      </Label>
                      <input
                        id="missing-data-toggle"
                        type="checkbox"
                        checked={missingDataRequested}
                        onChange={(e) => setMissingDataRequested(e.target.checked)}
                        disabled={!canEditLms || lmsMutation.isPending}
                        className="w-4 h-4 rounded text-primary"
                      />
                    </div>

                    {missingDataRequested && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Missing Data Type</Label>
                          <Input
                            placeholder="e.g. Passport Photo, Blood Test"
                            value={missingDataType}
                            onChange={(e) => setMissingDataType(e.target.value)}
                            disabled={!canEditLms || lmsMutation.isPending}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Missing Data Status</Label>
                          <select
                            value={missingDataStatus}
                            onChange={(e) => setMissingDataStatus(e.target.value as any)}
                            disabled={!canEditLms || lmsMutation.isPending}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Received">Received</option>
                          </select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Notes / Requirements</Label>
                          <Textarea
                            placeholder="Provide details for recruiter..."
                            value={missingDataNotes}
                            onChange={(e) => setMissingDataNotes(e.target.value)}
                            disabled={!canEditLms || lmsMutation.isPending}
                            className="text-xs min-h-[60px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {canEditLms && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => lmsMutation.mutate()}
                        disabled={lmsMutation.isPending || (!processingData?.lms?.name && !processingData?.dsr?.name)}
                        className="gap-2"
                      >
                        {lmsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save LMS Clearance
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. INJAZ CLEARANCE TAB */}
              {activeTab === "injaz" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Injaz Biometrics Clearance</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.injaz?.name || "Not created"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.injaz?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="injaz-status" className="text-xs font-medium">Injaz Status</Label>
                      <select
                        id="injaz-status"
                        value={injazStatus}
                        onChange={(e) => setInjazStatus(e.target.value as any)}
                        disabled={!canEditInjaz || injazMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="injaz-employee" className="text-xs font-medium">Assigned Injaz Officer</Label>
                      <select
                        id="injaz-employee"
                        value={injazEmployee}
                        onChange={(e) => setInjazEmployee(e.target.value)}
                        disabled={!canEditInjaz || injazMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map((emp: any) => (
                          <option key={emp.name} value={emp.name}>
                            {emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {canEditInjaz && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => injazMutation.mutate()}
                        disabled={injazMutation.isPending || (!processingData?.injaz?.name && !processingData?.dsr?.name)}
                        className="gap-2"
                      >
                        {injazMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Injaz Clearance
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. WAKALA CLEARANCE TAB */}
              {activeTab === "wakala" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Send className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Wakala Sponsor Clearance</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.wakala?.name || "Not created"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.wakala?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="wakala-status" className="text-xs font-medium">Wakala Status</Label>
                      <select
                        id="wakala-status"
                        value={wakalaStatus}
                        onChange={(e) => setWakalaStatus(e.target.value as any)}
                        disabled={!canEditWakala || wakalaMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="wakala-employee" className="text-xs font-medium">Assigned Wakala Officer</Label>
                      <select
                        id="wakala-employee"
                        value={wakalaEmployee}
                        onChange={(e) => setWakalaEmployee(e.target.value)}
                        disabled={!canEditWakala || wakalaMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map((emp: any) => (
                          <option key={emp.name} value={emp.name}>
                            {emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {canEditWakala && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => wakalaMutation.mutate()}
                        disabled={wakalaMutation.isPending || (!processingData?.wakala?.name && !processingData?.dsr?.name)}
                        className="gap-2"
                      >
                        {wakalaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Wakala Clearance
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. EMBASSY CLEARANCE TAB */}
              {activeTab === "embassy" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Embassy Clearance</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.embassy?.name || "Not created"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.embassy?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="embassy-status" className="text-xs font-medium">Embassy Status</Label>
                      <select
                        id="embassy-status"
                        value={embassyStatus}
                        onChange={(e) => setEmbassyStatus(e.target.value as any)}
                        disabled={!canEditEmbassy || embassyMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="embassy-employee" className="text-xs font-medium">Assigned Officer</Label>
                      <select
                        id="embassy-employee"
                        value={embassyEmployee}
                        onChange={(e) => setEmbassyEmployee(e.target.value)}
                        disabled={!canEditEmbassy || embassyMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map((emp: any) => (
                          <option key={emp.name} value={emp.name}>
                            {emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="embassy-sub-date" className="text-xs font-medium">Submission Date</Label>
                      <Input
                        id="embassy-sub-date"
                        type="date"
                        value={embassySubDate}
                        onChange={(e) => setEmbassySubDate(e.target.value)}
                        disabled={!canEditEmbassy || embassyMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="embassy-app-date" className="text-xs font-medium">Approval Date</Label>
                      <Input
                        id="embassy-app-date"
                        type="date"
                        value={embassyAppDate}
                        onChange={(e) => setEmbassyAppDate(e.target.value)}
                        disabled={!canEditEmbassy || embassyMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Consular Fees */}
                  <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
                    <div className="text-xs font-semibold">Consular Fees & Payment</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fee Status</Label>
                        <select
                          value={feeStatus}
                          onChange={(e) => setFeeStatus(e.target.value as any)}
                          disabled={!canEditEmbassy || embassyMutation.isPending}
                          className="w-full h-8 rounded border bg-background px-2 text-xs"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Fee Amount</Label>
                        <Input
                          type="number"
                          value={feeAmount}
                          onChange={(e) => setFeeAmount(Number(e.target.value))}
                          disabled={!canEditEmbassy || embassyMutation.isPending}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Currency</Label>
                        <select
                          value={feeCurrency}
                          onChange={(e) => setFeeCurrency(e.target.value)}
                          disabled={!canEditEmbassy || embassyMutation.isPending}
                          className="w-full h-8 rounded border bg-background px-2 text-xs"
                        >
                          <option value="KWD">KWD</option>
                          <option value="SAR">SAR</option>
                          <option value="USD">USD</option>
                          <option value="ETB">ETB</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {canEditEmbassy && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => embassyMutation.mutate()}
                        disabled={embassyMutation.isPending || (!processingData?.embassy?.name && !processingData?.dsr?.name)}
                        className="gap-2"
                      >
                        {embassyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Embassy Clearance
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 5. TELESIGN CLEARANCE TAB */}
              {activeTab === "telesign" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <PhoneCall className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Telesign Calling Clearance</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.telesign?.name || "Not created"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.telesign?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="telesign-status" className="text-xs font-medium">Telesign Status</Label>
                      <select
                        id="telesign-status"
                        value={telesignStatus}
                        onChange={(e) => setTelesignStatus(e.target.value as any)}
                        disabled={!canEditTelesign || telesignMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Authenticated">Authenticated</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="telesign-employee" className="text-xs font-medium">Assigned Telesign Officer</Label>
                      <select
                        id="telesign-employee"
                        value={telesignEmployee}
                        onChange={(e) => setTelesignEmployee(e.target.value)}
                        disabled={!canEditTelesign || telesignMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map((emp: any) => (
                          <option key={emp.name} value={emp.name}>
                            {emp.employee_name ? `${emp.employee_name} (${emp.name})` : emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {canEditTelesign && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => telesignMutation.mutate()}
                        disabled={telesignMutation.isPending || (!processingData?.telesign?.name && !processingData?.dsr?.name)}
                        className="gap-2"
                      >
                        {telesignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Telesign Clearance
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 6. VISA STAMPING TAB */}
              {activeTab === "stamp" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Visa Stamping (Stage 7)</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.stamp?.name || "Not submitted"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.stamp?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="stamp-number" className="text-xs font-medium">Visa Stamp Number</Label>
                      <Input
                        id="stamp-number"
                        placeholder="e.g. VISA-ETH-991823"
                        value={stampNumber}
                        onChange={(e) => setStampNumber(e.target.value)}
                        disabled={!canEditStamp || stampMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="stamp-date" className="text-xs font-medium">Stamped Date</Label>
                      <Input
                        id="stamp-date"
                        type="date"
                        value={stampDate}
                        onChange={(e) => setStampDate(e.target.value)}
                        disabled={!canEditStamp || stampMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {canEditStamp && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => stampMutation.mutate()}
                        disabled={stampMutation.isPending || !hasDsr}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {stampMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Submit Visa Stamp
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 7. FLIGHT TICKET TAB */}
              {activeTab === "ticket" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Flight Ticket Booking (Stage 8)</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.ticket?.name || "Not submitted"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.ticket?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-number" className="text-xs font-medium">Ticket / PNR Number</Label>
                      <Input
                        id="ticket-number"
                        placeholder="e.g. ET-TKT-8849102"
                        value={ticketNumber}
                        onChange={(e) => setTicketNumber(e.target.value)}
                        disabled={!canEditTicket || ticketMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-details" className="text-xs font-medium">Ticket / Flight Details</Label>
                      <Input
                        id="ticket-details"
                        placeholder="e.g. Flight ET604 to Riyadh"
                        value={ticketDetails}
                        onChange={(e) => setTicketDetails(e.target.value)}
                        disabled={!canEditTicket || ticketMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {canEditTicket && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => ticketMutation.mutate()}
                        disabled={ticketMutation.isPending || !hasDsr}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {ticketMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Submit Flight Ticket
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 8. DEPARTURE TAB */}
              {activeTab === "departure" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Plane className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">Pre-Departure & Departure (Stage 9 - 100%)</div>
                        <div className="text-xs text-muted-foreground">Doc: {processingData?.departure?.name || "Not submitted"}</div>
                      </div>
                    </div>
                    {getStatusBadge(processingData?.departure?.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="departure-time" className="text-xs font-medium">Departure Date & Time</Label>
                      <Input
                        id="departure-time"
                        type="datetime-local"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        disabled={!canEditDeparture || departureMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="med2-result" className="text-xs font-medium">Pre-Departure Medical (Medical 2)</Label>
                      <select
                        id="med2-result"
                        value={medical2Result}
                        onChange={(e) => setMedical2Result(e.target.value as any)}
                        disabled={!canEditDeparture || departureMutation.isPending}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="Pass">Pass (FIT)</option>
                        <option value="Fail">Fail (UNFIT)</option>
                        <option value="">Pending</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="med2-date" className="text-xs font-medium">Medical 2 Date</Label>
                      <Input
                        id="med2-date"
                        type="date"
                        value={medical2Date}
                        onChange={(e) => setMedical2Date(e.target.value)}
                        disabled={!canEditDeparture || departureMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="med2-remark" className="text-xs font-medium">Medical Remarks</Label>
                      <Input
                        id="med2-remark"
                        placeholder="e.g. Fit for travel"
                        value={medical2Remark}
                        onChange={(e) => setMedical2Remark(e.target.value)}
                        disabled={!canEditDeparture || departureMutation.isPending}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {canEditDeparture && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => departureMutation.mutate()}
                        disabled={departureMutation.isPending || !hasDsr}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                      >
                        {departureMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Final Departure (100% Complete)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
