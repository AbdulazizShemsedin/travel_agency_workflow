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
  DollarSign,
  AlertTriangle,
  Play,
  Share2,
  ShieldCheck,
  Ticket,
  HeartPulse,
  Lock,
  ArrowRight,
  User,
  Calendar,
  FileText,
  FileCheck2,
  Receipt,
} from "lucide-react";
import { Applicant } from "@/types/applicant";
import {
  updateLmsClearanceApi,
  updateWakalaClearanceApi,
  updateInjazClearanceApi,
  submitDsrStampApi,
  submitDsrTicketApi,
  submitDsrDepartureApi,
  recordAccountingTransactionApi,
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
import { Switch } from "@/components/ui/switch";

interface ProcessingStreamsModalProps {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure";
}

interface FeeState {
  required: boolean;
  type: "Registration Fee" | "Processing Fee" | "Visa Fee" | "Other";
  amount: number;
  direction: "Income" | "Expense";
  status: "Pending" | "Paid" | "Expired" | "Refunded";
  paymentDate: string;
  expiryDate: string;
  notes: string;
}

export function ProcessingStreamsModal({
  applicant,
  isOpen,
  onClose,
  initialTab = "lms",
}: ProcessingStreamsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure">(initialTab);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesList,
  });

  const getEmpLabel = (emp: any) =>
    emp.employee_name ? `${emp.employee_name} (${emp.email || emp.name})` : emp.name;

  // Default fallback from applicant or first employee
  const defaultEmp =
    applicant.assigned_employee_id ||
    (employees.length > 0 ? getEmpLabel(employees[0]) : "");

  // LMS form state
  const [lmsStatus, setLmsStatus] = React.useState<"Pending" | "Issued" | "Rejected">(
    (applicant.lms_processing?.status as "Pending" | "Issued" | "Rejected") || "Issued"
  );
  const [lmsEmployee, setLmsEmployee] = React.useState(
    applicant.lms_processing?.employee || defaultEmp
  );
  const [lmsIssuedOn, setLmsIssuedOn] = React.useState(applicant.lms_processing?.issued_on || new Date().toISOString().split("T")[0]);
  const [ticketPnr, setTicketPnr] = React.useState(applicant.lms_processing?.ticket_pnr || "");
  const [flightNumber, setFlightNumber] = React.useState(applicant.lms_processing?.flight_number || "");
  const [departureDate, setDepartureDate] = React.useState(applicant.lms_processing?.departure_date || "");
  const [destination, setDestination] = React.useState(applicant.lms_processing?.destination || "Riyadh (RUH)");
  const [additionalField1, setAdditionalField1] = React.useState(applicant.lms_processing?.additional_field_1 || "");
  const [additionalField2, setAdditionalField2] = React.useState(applicant.lms_processing?.additional_field_2 || "");
  const [lmsNotes, setLmsNotes] = React.useState(applicant.lms_processing?.notes || "");
  const [lmsFee, setLmsFee] = React.useState<FeeState>({
    required: false,
    type: "Processing Fee",
    amount: 100,
    direction: "Expense",
    status: "Paid",
    paymentDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "Ministry LMS document processing fee",
  });

  // Injaz form state
  const [injazStatus, setInjazStatus] = React.useState<"Pending" | "Completed">(
    (applicant.injaz_processing?.status as "Pending" | "Completed") || "Completed"
  );
  const [injazEmployee, setInjazEmployee] = React.useState(
    applicant.injaz_processing?.employee || defaultEmp
  );
  const [injazAppNo, setInjazAppNo] = React.useState(applicant.injaz_processing?.injaz_app_no || "E-9918241");
  const [teashirFee, setTeashirFee] = React.useState(applicant.injaz_processing?.teashir_fee ?? 140);
  const [biometricsDate, setBiometricsDate] = React.useState(applicant.injaz_processing?.biometrics_date || new Date().toISOString().split("T")[0]);
  const [biometricsCenter, setBiometricsCenter] = React.useState(applicant.injaz_processing?.biometrics_center || "Teashir VFS Global Addis Ababa");
  const [injazNotes, setInjazNotes] = React.useState(applicant.injaz_processing?.notes || "");
  const [injazFee, setInjazFee] = React.useState<FeeState>({
    required: true,
    type: "Processing Fee",
    amount: 140,
    direction: "Expense",
    status: "Paid",
    paymentDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "Teashir VFS biometrics enrollment fee",
  });

  // Wakala form state
  const [wakalaStatus, setWakalaStatus] = React.useState<"Pending" | "Completed">(
    (applicant.wakala_processing?.status as "Pending" | "Completed") || "Completed"
  );
  const [wakalaEmployee, setWakalaEmployee] = React.useState(
    applicant.wakala_processing?.employee || defaultEmp
  );
  const [startedOn, setStartedOn] = React.useState(applicant.wakala_processing?.started_on || new Date().toISOString().split("T")[0]);
  const [completedOn, setCompletedOn] = React.useState(applicant.wakala_processing?.completed_on || new Date().toISOString().split("T")[0]);
  const [requestPayment, setRequestPayment] = React.useState<boolean>(applicant.wakala_processing?.request_payment ?? true);
  const [requestVia, setRequestVia] = React.useState<"WhatsApp" | "Email" | "SMS">(applicant.wakala_processing?.request_via || "WhatsApp");
  const [paymentAmount, setPaymentAmount] = React.useState<number>(applicant.wakala_processing?.payment_amount ?? 500);
  const [wakalaNumber, setWakalaNumber] = React.useState(applicant.wakala_processing?.wakala_number || "WAK-9921448");
  const [sponsorAuthCode, setSponsorAuthCode] = React.useState(applicant.wakala_processing?.sponsor_auth_code || "SP-99182");
  const [foreignAgencyName, setForeignAgencyName] = React.useState(applicant.wakala_processing?.foreign_agency_name || "Al-Qureshi Recruitment Agency");
  const [wakalaNotes, setWakalaNotes] = React.useState(applicant.wakala_processing?.notes || "");
  const [wakalaFee, setWakalaFee] = React.useState<FeeState>({
    required: true,
    type: "Processing Fee",
    amount: 500,
    direction: "Income",
    status: "Paid",
    paymentDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "Wakala Power of Attorney authorization payment",
  });

  // Visa Stamp state (Stage 7)
  const [visaNumber, setVisaNumber] = React.useState(applicant.dsr_stamp?.visa_number || "VISA-ETH-9921448");
  const [stampedDate, setStampedDate] = React.useState(applicant.dsr_stamp?.stamped_date || new Date().toISOString().split("T")[0]);
  const [embassyReference, setEmbassyReference] = React.useState(applicant.dsr_stamp?.embassy_reference || "EMB-ETH-2026-881");
  const [stampNotes, setStampNotes] = React.useState(applicant.dsr_stamp?.notes || "");
  const [stampFee, setStampFee] = React.useState<FeeState>({
    required: false,
    type: "Visa Fee",
    amount: 250,
    direction: "Expense",
    status: "Paid",
    paymentDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "Embassy Visa endorsement stamping fee",
  });

  // Flight Ticket state (Stage 8)
  const [ticketPnrFinal, setTicketPnrFinal] = React.useState(applicant.dsr_ticket?.ticket_pnr || "ET-TKT-88392");
  const [flightNoFinal, setFlightNoFinal] = React.useState(applicant.dsr_ticket?.flight_number || "ET604");
  const [ticketDepDate, setTicketDepDate] = React.useState(applicant.dsr_ticket?.departure_date || new Date().toISOString().split("T")[0]);
  const [ticketDestination, setTicketDestination] = React.useState(applicant.dsr_ticket?.destination || "Riyadh (RUH)");
  const [ticketNotes, setTicketNotes] = React.useState(applicant.dsr_ticket?.notes || "");

  // Pre-Departure Medical 2 & Departure state (Stage 9)
  const [depFlightNo, setDepFlightNo] = React.useState(applicant.departure_info?.flight_number || "ET604");
  const [depDate, setDepDate] = React.useState(applicant.departure_info?.departure_date || new Date().toISOString().split("T")[0]);
  const [depTime, setDepTime] = React.useState(applicant.departure_info?.departure_time || "22:30:00");
  const [depAirport, setDepAirport] = React.useState(applicant.departure_info?.airport || "Bole International Airport (ADD)");
  const [depDestination, setDepDestination] = React.useState(applicant.departure_info?.destination_city || "Riyadh, Saudi Arabia");
  const [medical2Result, setMedical2Result] = React.useState<"Pass" | "Fail">(applicant.departure_info?.medical_2_result || "Pass");
  const [medical2Remarks, setMedical2Remarks] = React.useState(applicant.departure_info?.medical_2_remarks || "Candidate cleared fit for flight");
  const [depNotes, setDepNotes] = React.useState(applicant.departure_info?.notes || "");
  const [departureFee, setDepartureFee] = React.useState<FeeState>({
    required: false,
    type: "Other",
    amount: 75,
    direction: "Expense",
    status: "Paid",
    paymentDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "Airport clearance and ground logistics expense",
  });

  React.useEffect(() => {
    setActiveTab(initialTab);
    const assigned = applicant.assigned_employee_id || (employees.length > 0 ? getEmpLabel(employees[0]) : "");
    if (assigned) {
      setLmsEmployee(applicant.lms_processing?.employee || assigned);
      setInjazEmployee(applicant.injaz_processing?.employee || assigned);
      setWakalaEmployee(applicant.wakala_processing?.employee || assigned);
    }
  }, [initialTab, applicant, isOpen, employees]);

  // Clearance completion evaluation
  const isLmsComplete = lmsStatus === "Issued" || applicant.lms_processing?.status === "Issued";
  const isInjazComplete = injazStatus === "Completed" || applicant.injaz_processing?.status === "Completed";
  const isWakalaComplete = wakalaStatus === "Completed" || applicant.wakala_processing?.status === "Completed";
  const isProcessingCompleted = (isLmsComplete && isInjazComplete && isWakalaComplete) || ["Stamped", "Ticketed", "Departed"].includes(applicant.applicant_state || "");
  const isStamped = ["Stamped", "Ticketed", "Departed"].includes(applicant.applicant_state || "");
  const isTicketed = ["Ticketed", "Departed"].includes(applicant.applicant_state || "");

  const cleanEmp = (emp: string) => {
    if (!emp) return emp;
    const match = emp.match(/\(([^)]+@[^)]+)\)/);
    if (match) return match[1].trim();
    const emailMatch = emp.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) return emailMatch[0].trim();
    return emp.trim();
  };

  // Update LMS Clearance via REST PUT
  const updateLmsMutation = useMutation({
    mutationFn: async () => {
      const financialsPayload =
        lmsFee.required && lmsFee.amount > 0
          ? [
              {
                transaction_type: lmsFee.direction,
                amount: Number(lmsFee.amount),
                date: lmsFee.paymentDate || new Date().toISOString().split("T")[0],
                description: `${lmsFee.type} (LMS) - ${applicant.full_name} (${applicant.name})`,
                source_doctype: "LMS Clearance",
              },
            ]
          : undefined;

      const res = await updateLmsClearanceApi(applicant.lms_processing?.name || `LMS-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: lmsStatus,
        employee: cleanEmp(lmsEmployee),
        issued_on: lmsStatus === "Issued" ? lmsIssuedOn : undefined,
        ticket_pnr: ticketPnr,
        flight_number: flightNumber,
        departure_date: departureDate,
        destination,
        additional_field_1: additionalField1,
        additional_field_2: additionalField2,
        notes: lmsNotes,
        financials: financialsPayload,
      });

      if (lmsFee.required && lmsFee.amount > 0) {
        await recordAccountingTransactionApi({
          transaction_type: lmsFee.direction,
          amount: Number(lmsFee.amount),
          description: `${lmsFee.type} (LMS) - ${applicant.full_name} (${applicant.name})`,
          applicant: applicant.name,
          date: lmsFee.paymentDate,
          source_doctype: "LMS Clearance",
        });
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("LMS Clearance & Fee Record Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("LMS Update failed", { description: err.message }),
  });

  // Update Injaz Clearance via REST PUT
  const updateInjazMutation = useMutation({
    mutationFn: async () => {
      const financialsPayload =
        injazFee.required && injazFee.amount > 0
          ? [
              {
                transaction_type: injazFee.direction,
                amount: Number(injazFee.amount),
                date: injazFee.paymentDate || new Date().toISOString().split("T")[0],
                description: `${injazFee.type} (Injaz/Teashir) - ${applicant.full_name} (${applicant.name})`,
                source_doctype: "Injaz Clearance",
              },
            ]
          : undefined;

      const res = await updateInjazClearanceApi(applicant.injaz_processing?.name || `INJ-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: injazStatus,
        employee: cleanEmp(injazEmployee),
        injaz_app_no: injazAppNo,
        teashir_fee: Number(teashirFee),
        biometrics_date: biometricsDate,
        biometrics_center: biometricsCenter,
        notes: injazNotes,
        financials: financialsPayload,
      });

      if (injazFee.required && injazFee.amount > 0) {
        await recordAccountingTransactionApi({
          transaction_type: injazFee.direction,
          amount: Number(injazFee.amount),
          description: `${injazFee.type} (Injaz/Teashir) - ${applicant.full_name} (${applicant.name})`,
          applicant: applicant.name,
          date: injazFee.paymentDate,
          source_doctype: "Injaz Clearance",
        });
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("Injaz & Biometrics Clearance Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("Injaz Update failed", { description: err.message }),
  });

  // Update Wakala Clearance via REST PUT
  const updateWakalaMutation = useMutation({
    mutationFn: async () => {
      const financialsPayload =
        wakalaFee.required && wakalaFee.amount > 0
          ? [
              {
                transaction_type: wakalaFee.direction,
                amount: Number(wakalaFee.amount),
                date: wakalaFee.paymentDate || new Date().toISOString().split("T")[0],
                description: `${wakalaFee.type} (Wakala Payment) - ${applicant.full_name} (${applicant.name})`,
                source_doctype: "Wakala Clearance",
              },
            ]
          : undefined;

      const res = await updateWakalaClearanceApi(applicant.wakala_processing?.name || `WAK-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: wakalaStatus,
        employee: cleanEmp(wakalaEmployee),
        started_on: startedOn,
        completed_on: wakalaStatus === "Completed" ? (completedOn || new Date().toISOString().split("T")[0]) : completedOn,
        request_payment: requestPayment,
        request_via: requestVia,
        payment_amount: Number(paymentAmount),
        wakala_number: wakalaNumber,
        sponsor_auth_code: sponsorAuthCode,
        foreign_agency_name: foreignAgencyName,
        notes: wakalaNotes,
        financials: financialsPayload,
      });

      if (wakalaFee.required && wakalaFee.amount > 0) {
        await recordAccountingTransactionApi({
          transaction_type: wakalaFee.direction,
          amount: Number(wakalaFee.amount),
          description: `${wakalaFee.type} (Wakala Payment) - ${applicant.full_name} (${applicant.name})`,
          applicant: applicant.name,
          date: wakalaFee.paymentDate,
          source_doctype: "Wakala Clearance",
        });
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("Wakala Authorization Clearance Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("Wakala Update failed", { description: err.message }),
  });

  // Submit Visa Stamp (Stage 7)
  const submitStampMutation = useMutation({
    mutationFn: async () => {
      const financialsPayload =
        stampFee.required && stampFee.amount > 0
          ? [
              {
                transaction_type: stampFee.direction,
                amount: Number(stampFee.amount),
                date: stampFee.paymentDate || new Date().toISOString().split("T")[0],
                description: `${stampFee.type} (Embassy Visa) - ${applicant.full_name} (${applicant.name})`,
                source_doctype: "DSR Stamp",
              },
            ]
          : undefined;

      const res = await submitDsrStampApi({
        applicant: applicant.name,
        visa_number: visaNumber,
        stamped_date: stampedDate,
        embassy_reference: embassyReference,
        notes: stampNotes,
        financials: financialsPayload,
      });

      if (stampFee.required && stampFee.amount > 0) {
        await recordAccountingTransactionApi({
          transaction_type: stampFee.direction,
          amount: Number(stampFee.amount),
          description: `${stampFee.type} (Embassy Visa) - ${applicant.full_name} (${applicant.name})`,
          applicant: applicant.name,
          date: stampFee.paymentDate,
          source_doctype: "DSR Stamp",
        });
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("Visa Stamp Confirmed! Candidate transitioned to Stamped.");
      onClose();
    },
    onError: (err: Error) => toast.error("Stamp submission failed", { description: err.message }),
  });

  // Submit Flight Ticket (Stage 8)
  const submitTicketMutation = useMutation({
    mutationFn: () =>
      submitDsrTicketApi({
        applicant: applicant.name,
        ticket_pnr: ticketPnrFinal,
        flight_number: flightNoFinal,
        departure_date: ticketDepDate,
        destination: ticketDestination,
        notes: ticketNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("Flight Ticket Issued! Candidate transitioned to Ticketed.");
      onClose();
    },
    onError: (err: Error) => toast.error("Ticketing failed", { description: err.message }),
  });

  // Submit Departure & Pre-Departure Medical 2 (Stage 9)
  const submitDepartureMutation = useMutation({
    mutationFn: async () => {
      const financialsPayload =
        departureFee.required && departureFee.amount > 0
          ? [
              {
                transaction_type: departureFee.direction,
                amount: Number(departureFee.amount),
                date: departureFee.paymentDate || new Date().toISOString().split("T")[0],
                description: `${departureFee.type} (Departure Logistics) - ${applicant.full_name} (${applicant.name})`,
                source_doctype: "DSR Departure",
              },
            ]
          : undefined;

      const res = await submitDsrDepartureApi({
        applicant: applicant.name,
        departure_date: depDate,
        departure_time: depTime,
        airport: depAirport,
        destination_city: depDestination,
        medical_2_result: medical2Result,
        medical_2_remarks: medical2Remarks,
        notes: depNotes,
        financials: financialsPayload,
      });

      if (departureFee.required && departureFee.amount > 0) {
        await recordAccountingTransactionApi({
          transaction_type: departureFee.direction,
          amount: Number(departureFee.amount),
          description: `${departureFee.type} (Departure Logistics) - ${applicant.full_name} (${applicant.name})`,
          applicant: applicant.name,
          date: departureFee.paymentDate,
          source_doctype: "DSR Departure",
        });
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_summary"] });
      toast.success("Departure Clearance Confirmed! Candidate 100% Completed.");
      onClose();
    },
    onError: (err: Error) => toast.error("Departure failed", { description: err.message }),
  });

  const isPending =
    updateLmsMutation.isPending ||
    updateInjazMutation.isPending ||
    updateWakalaMutation.isPending ||
    submitStampMutation.isPending ||
    submitTicketMutation.isPending ||
    submitDepartureMutation.isPending;

  // Reusable Fee Section Renderer for Frappe "Applicant Fee" DocType
  const renderApplicantFeeSection = (
    state: FeeState,
    setState: React.Dispatch<React.SetStateAction<FeeState>>,
    stageLabel: string
  ) => {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
              {stageLabel} Fee Required?
            </Label>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Record fee into accounting cashflow for this stage
            </p>
          </div>
          <Switch
            checked={state.required}
            onCheckedChange={(checked) => setState((prev) => ({ ...prev, required: checked }))}
          />
        </div>

        {state.required && (
          <div className="pt-2 border-t border-slate-200 dark:border-[#26262d] space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Fee Type</Label>
                <select
                  value={state.type}
                  onChange={(e) => setState((prev) => ({ ...prev, type: e.target.value as any }))}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215] px-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Registration Fee">Registration Fee</option>
                  <option value="Processing Fee">Processing Fee</option>
                  <option value="Visa Fee">Visa Fee</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Amount ($ USD) *</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={state.amount}
                    onChange={(e) => setState((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                    className="h-8 pl-7 text-xs bg-white dark:bg-[#121215]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Direction</Label>
                <select
                  value={state.direction}
                  onChange={(e) => setState((prev) => ({ ...prev, direction: e.target.value as any }))}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215] px-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Expense">Expense (Agency Paid)</option>
                  <option value="Income">Income (Agency Received)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Payment Status</Label>
                <select
                  value={state.status}
                  onChange={(e) => setState((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215] px-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Expired">Expired</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Payment Date</Label>
                <Input
                  type="date"
                  value={state.paymentDate}
                  onChange={(e) => setState((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="h-8 text-xs bg-white dark:bg-[#121215]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Fee Notes & Remarks</Label>
              <Input
                value={state.notes}
                onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Reference # or receipt details..."
                className="h-8 text-xs bg-white dark:bg-[#121215]"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
        <DialogHeader className="border-b border-slate-100 dark:border-[#222227] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Clearance & Placement Portal
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  {applicant.name} — {applicant.full_name} ({applicant.applicant_state || "Processing"})
                </DialogDescription>
              </div>
            </div>
            <Badge variant="success">{applicant.applicant_state || "Processing"}</Badge>
          </div>

          {/* Sequential Workflow Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {/* 1. LMS Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("lms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "lms"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              LMS
              {isLmsComplete && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* 2. Injaz Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("injaz")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "injaz"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              Injaz
              {isInjazComplete && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* 3. Wakala Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("wakala")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "wakala"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Wakala
              {isWakalaComplete && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* 4. Visa Stamp Tab (Strictly after Processing) */}
            <button
              type="button"
              onClick={() => setActiveTab("stamp")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "stamp"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              {!isProcessingCompleted ? (
                <Lock className="h-3 w-3 text-slate-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Visa Stamp
              {isStamped && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* 5. Flight Ticket Tab (Strictly after Stamped) */}
            <button
              type="button"
              onClick={() => setActiveTab("ticket")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ticket"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              {!isStamped ? (
                <Lock className="h-3 w-3 text-slate-400" />
              ) : (
                <Ticket className="h-3.5 w-3.5" />
              )}
              Flight Ticket
              {isTicketed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* 6. Pre-Departure Tab (Strictly after Ticketed) */}
            <button
              type="button"
              onClick={() => setActiveTab("departure")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "departure"
                  ? "bg-emerald-900 text-white"
                  : "bg-slate-100 dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#26262d]"
              }`}
            >
              {!isTicketed ? (
                <Lock className="h-3 w-3 text-slate-400" />
              ) : (
                <HeartPulse className="h-3.5 w-3.5" />
              )}
              Pre-Departure
            </button>
          </div>
        </DialogHeader>

        {/* Tab 1: LMS Clearance */}
        {activeTab === "lms" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">LMS Clearance Status</Label>
                <select
                  value={lmsStatus}
                  onChange={(e) => setLmsStatus(e.target.value as "Pending" | "Issued" | "Rejected")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Issued">Issued (Labor Ministry Approved)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Assigned Clearance Staff</Label>
                {employees.length > 0 ? (
                  <select
                    value={lmsEmployee}
                    onChange={(e) => setLmsEmployee(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {employees.map((emp) => {
                      const val = getEmpLabel(emp);
                      return (
                        <option key={emp.name} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input
                    value={lmsEmployee}
                    onChange={(e) => setLmsEmployee(e.target.value)}
                    placeholder="Assigned staff..."
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">LMS Issued Date</Label>
                <Input
                  type="date"
                  value={lmsIssuedOn}
                  onChange={(e) => setLmsIssuedOn(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Labor Permit / Document No</Label>
                <Input
                  value={additionalField1}
                  onChange={(e) => setAdditionalField1(e.target.value)}
                  placeholder="LMS-PERMIT-88912"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">LMS Processing Notes</Label>
              <Textarea
                rows={2}
                value={lmsNotes}
                onChange={(e) => setLmsNotes(e.target.value)}
                placeholder="Notes on Ministry approval..."
              />
            </div>

            {/* Applicant Fee for LMS */}
            {renderApplicantFeeSection(lmsFee, setLmsFee, "LMS Processing")}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222227]">
              {isLmsComplete && isInjazComplete && isWakalaComplete && !isStamped ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All clearances ready for Visa Stamp
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">Save changes to update record</span>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => updateLmsMutation.mutate()}
                  disabled={isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
                >
                  Save LMS Clearance
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Injaz & Biometrics */}
        {activeTab === "injaz" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Injaz Clearance Status</Label>
                <select
                  value={injazStatus}
                  onChange={(e) => setInjazStatus(e.target.value as "Pending" | "Completed")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed (Biometrics Passed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Assigned Clearance Staff</Label>
                {employees.length > 0 ? (
                  <select
                    value={injazEmployee}
                    onChange={(e) => setInjazEmployee(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {employees.map((emp) => {
                      const val = getEmpLabel(emp);
                      return (
                        <option key={emp.name} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input
                    value={injazEmployee}
                    onChange={(e) => setInjazEmployee(e.target.value)}
                    placeholder="Assigned staff..."
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Injaz Application No (E-Number)</Label>
                <Input
                  value={injazAppNo}
                  onChange={(e) => setInjazAppNo(e.target.value)}
                  placeholder="E-9918241"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Teashir Biometrics Date</Label>
                <Input
                  type="date"
                  value={biometricsDate}
                  onChange={(e) => setBiometricsDate(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Biometrics Center</Label>
                <Input
                  value={biometricsCenter}
                  onChange={(e) => setBiometricsCenter(e.target.value)}
                  placeholder="Teashir VFS Global Addis Ababa"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Injaz Processing Notes</Label>
              <Textarea
                rows={2}
                value={injazNotes}
                onChange={(e) => setInjazNotes(e.target.value)}
                placeholder="Biometrics verification remarks..."
              />
            </div>

            {/* Applicant Fee for Injaz / Teashir */}
            {renderApplicantFeeSection(injazFee, setInjazFee, "Injaz & Biometrics")}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222227]">
              <span className="text-slate-400 text-[11px]">Save changes to update record</span>
              <Button
                type="button"
                onClick={() => updateInjazMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                Save Injaz Clearance
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Wakala Authorization */}
        {activeTab === "wakala" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Wakala Clearance Status</Label>
                <select
                  value={wakalaStatus}
                  onChange={(e) => setWakalaStatus(e.target.value as "Pending" | "Completed")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed (Authorization Confirmed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Assigned Clearance Staff</Label>
                {employees.length > 0 ? (
                  <select
                    value={wakalaEmployee}
                    onChange={(e) => setWakalaEmployee(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {employees.map((emp) => {
                      const val = getEmpLabel(emp);
                      return (
                        <option key={emp.name} value={val}>
                          {val}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input
                    value={wakalaEmployee}
                    onChange={(e) => setWakalaEmployee(e.target.value)}
                    placeholder="Assigned staff..."
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Wakala Number / Code</Label>
                <Input
                  value={wakalaNumber}
                  onChange={(e) => setWakalaNumber(e.target.value)}
                  placeholder="WAK-9921448"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Sponsor Auth Code</Label>
                <Input
                  value={sponsorAuthCode}
                  onChange={(e) => setSponsorAuthCode(e.target.value)}
                  placeholder="SP-99182"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Foreign Partner Agency</Label>
                <Input
                  value={foreignAgencyName}
                  onChange={(e) => setForeignAgencyName(e.target.value)}
                  placeholder="Al-Qureshi Recruitment Agency"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Wakala Notes</Label>
              <Textarea
                rows={2}
                value={wakalaNotes}
                onChange={(e) => setWakalaNotes(e.target.value)}
                placeholder="Power of attorney details..."
              />
            </div>

            {/* Applicant Fee for Wakala */}
            {renderApplicantFeeSection(wakalaFee, setWakalaFee, "Wakala Power of Attorney")}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222227]">
              <span className="text-slate-400 text-[11px]">Save changes to update record</span>
              <Button
                type="button"
                onClick={() => updateWakalaMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                Save Wakala Clearance
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: Visa Stamp (Stage 7 - Guardrail Enforced) */}
        {activeTab === "stamp" && (
          <div className="space-y-4 py-2 text-xs">
            {!isProcessingCompleted ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" /> Clearance Stage In Progress
                </p>
                <p className="text-[11px]">
                  Visa Stamping is strictly allowed only after LMS, Injaz, and Wakala clearances have all been completed and approved.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-900 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Clearances Verified
                </p>
                <p className="text-[11px] mt-0.5">
                  LMS, Wakala, and Injaz are confirmed. Enter the issued visa details below to advance candidate to Stamped.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Issued Visa Number *</Label>
                <Input
                  value={visaNumber}
                  onChange={(e) => setVisaNumber(e.target.value)}
                  placeholder="VISA-ETH-9921448"
                  disabled={!isProcessingCompleted}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Stamped Date *</Label>
                <Input
                  type="date"
                  value={stampedDate}
                  onChange={(e) => setStampedDate(e.target.value)}
                  disabled={!isProcessingCompleted}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Embassy Reference Code</Label>
                <Input
                  value={embassyReference}
                  onChange={(e) => setEmbassyReference(e.target.value)}
                  placeholder="EMB-ETH-2026-881"
                  disabled={!isProcessingCompleted}
                />
              </div>
            </div>

            {/* Applicant Fee for Visa / Embassy */}
            {renderApplicantFeeSection(stampFee, setStampFee, "Embassy Visa Stamping")}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
              <Button
                type="button"
                onClick={() => submitStampMutation.mutate()}
                disabled={isPending || !isProcessingCompleted}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Confirm Visa Stamp & Advance to Stamped
              </Button>
            </div>
          </div>
        )}

        {/* Tab 5: Flight Ticket (Stage 8 - Guardrail Enforced) */}
        {activeTab === "ticket" && (
          <div className="space-y-4 py-2 text-xs">
            {!isStamped ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" /> Visa Stamping Required
                </p>
                <p className="text-[11px]">
                  Flight Ticket booking is strictly allowed only after the Visa Stamp has been confirmed.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-900 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Visa Stamp Verified
                </p>
                <p className="text-[11px] mt-0.5">
                  Visa is endorsed. Enter flight reservation and airline e-ticket details below.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Airline Ticket Number / PNR *</Label>
                <Input
                  value={ticketPnrFinal}
                  onChange={(e) => setTicketPnrFinal(e.target.value)}
                  placeholder="ET-TKT-88392"
                  disabled={!isStamped}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Flight Number *</Label>
                <Input
                  value={flightNoFinal}
                  onChange={(e) => setFlightNoFinal(e.target.value)}
                  placeholder="ET604"
                  disabled={!isStamped}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Date *</Label>
                <Input
                  type="date"
                  value={ticketDepDate}
                  onChange={(e) => setTicketDepDate(e.target.value)}
                  disabled={!isStamped}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Destination City *</Label>
                <Input
                  value={ticketDestination}
                  onChange={(e) => setTicketDestination(e.target.value)}
                  placeholder="Riyadh (RUH)"
                  disabled={!isStamped}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
              <Button
                type="button"
                onClick={() => submitTicketMutation.mutate()}
                disabled={isPending || !isStamped}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Issue Flight Ticket & Advance to Ticketed
              </Button>
            </div>
          </div>
        )}

        {/* Tab 6: Pre-Departure Medical 2 & Final Departure (Stage 9 - Guardrail Enforced) */}
        {activeTab === "departure" && (
          <div className="space-y-4 py-2 text-xs">
            {!isTicketed ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" /> Flight Ticket Required
                </p>
                <p className="text-[11px]">
                  Departure clearance is strictly allowed only after the Flight Ticket has been issued.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    Pre-Departure Medical 2 Check (Strict Guardrail)
                  </span>
                  <select
                    value={medical2Result}
                    onChange={(e) => setMedical2Result(e.target.value as "Pass" | "Fail")}
                    className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#16161b] px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                  >
                    <option value="Pass">Pass (Cleared for Flight)</option>
                    <option value="Fail">Fail (Departure Blocked)</option>
                  </select>
                </div>
                <Input
                  value={medical2Remarks}
                  onChange={(e) => setMedical2Remarks(e.target.value)}
                  placeholder="Final medical examination remarks..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Departure Date</Label>
                <Input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                  disabled={!isTicketed}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Time</Label>
                <Input
                  value={depTime}
                  onChange={(e) => setDepTime(e.target.value)}
                  placeholder="22:30:00"
                  disabled={!isTicketed}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Airport</Label>
                <Input
                  value={depAirport}
                  onChange={(e) => setDepAirport(e.target.value)}
                  disabled={!isTicketed}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Destination City</Label>
                <Input
                  value={depDestination}
                  onChange={(e) => setDepDestination(e.target.value)}
                  disabled={!isTicketed}
                />
              </div>
            </div>

            {/* Applicant Fee for Departure */}
            {renderApplicantFeeSection(departureFee, setDepartureFee, "Pre-Departure Logistics")}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
              <Button
                type="button"
                onClick={() => submitDepartureMutation.mutate()}
                disabled={isPending || !isTicketed || medical2Result === "Fail"}
                className="bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-semibold"
              >
                Finalize Departure Clearance (100% Complete)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
