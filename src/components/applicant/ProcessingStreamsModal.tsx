"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { Applicant } from "@/types/applicant";
import {
  updateLmsClearanceApi,
  updateWakalaClearanceApi,
  updateInjazClearanceApi,
  submitDsrStampApi,
  submitDsrTicketApi,
  submitDsrDepartureApi,
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
import { Select } from "@/components/ui/select";

interface ProcessingStreamsModalProps {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure";
}

export function ProcessingStreamsModal({
  applicant,
  isOpen,
  onClose,
  initialTab = "lms",
}: ProcessingStreamsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"lms" | "injaz" | "wakala" | "stamp" | "ticket" | "departure">(initialTab);

  // LMS form state
  const [lmsStatus, setLmsStatus] = React.useState<"Pending" | "Issued" | "Rejected">(
    (applicant.lms_processing?.status as "Pending" | "Issued" | "Rejected") || "Issued"
  );
  const [lmsEmployee, setLmsEmployee] = React.useState(applicant.lms_processing?.employee || "sara@agency.et");
  const [lmsIssuedOn, setLmsIssuedOn] = React.useState(applicant.lms_processing?.issued_on || new Date().toISOString().split("T")[0]);
  const [ticketPnr, setTicketPnr] = React.useState(applicant.lms_processing?.ticket_pnr || "");
  const [flightNumber, setFlightNumber] = React.useState(applicant.lms_processing?.flight_number || "");
  const [departureDate, setDepartureDate] = React.useState(applicant.lms_processing?.departure_date || "");
  const [destination, setDestination] = React.useState(applicant.lms_processing?.destination || "Riyadh (RUH)");
  const [additionalField1, setAdditionalField1] = React.useState(applicant.lms_processing?.additional_field_1 || "");
  const [additionalField2, setAdditionalField2] = React.useState(applicant.lms_processing?.additional_field_2 || "");
  const [lmsNotes, setLmsNotes] = React.useState(applicant.lms_processing?.notes || "");

  // Injaz form state
  const [injazStatus, setInjazStatus] = React.useState<"Pending" | "Completed">(
    (applicant.injaz_processing?.status as "Pending" | "Completed") || "Completed"
  );
  const [injazEmployee, setInjazEmployee] = React.useState(applicant.injaz_processing?.employee || "dawit@agency.et");
  const [injazAppNo, setInjazAppNo] = React.useState(applicant.injaz_processing?.injaz_app_no || "");
  const [teashirFee, setTeashirFee] = React.useState(applicant.injaz_processing?.teashir_fee ?? 140);
  const [biometricsDate, setBiometricsDate] = React.useState(applicant.injaz_processing?.biometrics_date || "");
  const [biometricsCenter, setBiometricsCenter] = React.useState(applicant.injaz_processing?.biometrics_center || "Teashir VFS Global Addis Ababa");
  const [injazNotes, setInjazNotes] = React.useState(applicant.injaz_processing?.notes || "");

  // Wakala form state
  const [wakalaStatus, setWakalaStatus] = React.useState<"Pending" | "Completed">(
    (applicant.wakala_processing?.status as "Pending" | "Completed") || "Completed"
  );
  const [wakalaEmployee, setWakalaEmployee] = React.useState(applicant.wakala_processing?.employee || "tigist@agency.et");
  const [startedOn, setStartedOn] = React.useState(applicant.wakala_processing?.started_on || new Date().toISOString().split("T")[0]);
  const [completedOn, setCompletedOn] = React.useState(applicant.wakala_processing?.completed_on || "");
  const [requestPayment, setRequestPayment] = React.useState<boolean>(applicant.wakala_processing?.request_payment ?? true);
  const [requestVia, setRequestVia] = React.useState<"WhatsApp" | "Email" | "SMS">(applicant.wakala_processing?.request_via || "WhatsApp");
  const [paymentAmount, setPaymentAmount] = React.useState<number>(applicant.wakala_processing?.payment_amount ?? 500);
  const [wakalaNumber, setWakalaNumber] = React.useState(applicant.wakala_processing?.wakala_number || "");
  const [sponsorAuthCode, setSponsorAuthCode] = React.useState(applicant.wakala_processing?.sponsor_auth_code || "");
  const [foreignAgencyName, setForeignAgencyName] = React.useState(applicant.wakala_processing?.foreign_agency_name || "");
  const [wakalaNotes, setWakalaNotes] = React.useState(applicant.wakala_processing?.notes || "");

  // Visa Stamp state (Stage 7)
  const [visaNumber, setVisaNumber] = React.useState(applicant.dsr_stamp?.visa_number || "KSA-VISA-9921448");
  const [stampedDate, setStampedDate] = React.useState(applicant.dsr_stamp?.stamped_date || new Date().toISOString().split("T")[0]);
  const [embassyReference, setEmbassyReference] = React.useState(applicant.dsr_stamp?.embassy_reference || "EMB-ETH-2026-881");
  const [stampNotes, setStampNotes] = React.useState(applicant.dsr_stamp?.notes || "");

  // Flight Ticket state (Stage 8)
  const [ticketPnrFinal, setTicketPnrFinal] = React.useState(applicant.dsr_ticket?.ticket_pnr || "ET-PNR-88392");
  const [flightNoFinal, setFlightNoFinal] = React.useState(applicant.dsr_ticket?.flight_number || "ET-402");
  const [ticketDepDate, setTicketDepDate] = React.useState(applicant.dsr_ticket?.departure_date || new Date().toISOString().split("T")[0]);
  const [ticketDestination, setTicketDestination] = React.useState(applicant.dsr_ticket?.destination || "Riyadh (RUH)");
  const [ticketNotes, setTicketNotes] = React.useState(applicant.dsr_ticket?.notes || "");

  // Pre-Departure Medical 2 & Departure state (Stage 9)
  const [depFlightNo, setDepFlightNo] = React.useState(applicant.departure_info?.flight_number || "ET-402");
  const [depDate, setDepDate] = React.useState(applicant.departure_info?.departure_date || new Date().toISOString().split("T")[0]);
  const [depTime, setDepTime] = React.useState(applicant.departure_info?.departure_time || "09:30 AM");
  const [depAirport, setDepAirport] = React.useState(applicant.departure_info?.airport || "Bole International Airport (ADD)");
  const [depDestination, setDepDestination] = React.useState(applicant.departure_info?.destination_city || "Riyadh, Saudi Arabia");
  const [medical2Result, setMedical2Result] = React.useState<"Pass" | "Fail">(applicant.departure_info?.medical_2_result || "Pass");
  const [medical2Remarks, setMedical2Remarks] = React.useState(applicant.departure_info?.medical_2_remarks || "");
  const [depNotes, setDepNotes] = React.useState(applicant.departure_info?.notes || "");

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Update LMS Clearance via REST PUT
  const updateLmsMutation = useMutation({
    mutationFn: () =>
      updateLmsClearanceApi(applicant.lms_processing?.name || `LMS-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: lmsStatus,
        employee: lmsEmployee,
        issued_on: lmsStatus === "Issued" ? lmsIssuedOn : undefined,
        ticket_pnr: ticketPnr,
        flight_number: flightNumber,
        departure_date: departureDate,
        destination,
        additional_field_1: additionalField1,
        additional_field_2: additionalField2,
        notes: lmsNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("LMS Clearance Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("LMS Update failed", { description: err.message }),
  });

  // Update Injaz Clearance via REST PUT
  const updateInjazMutation = useMutation({
    mutationFn: () =>
      updateInjazClearanceApi(applicant.injaz_processing?.name || `INJ-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: injazStatus,
        employee: injazEmployee,
        injaz_app_no: injazAppNo,
        teashir_fee: Number(teashirFee),
        biometrics_date: biometricsDate,
        biometrics_center: biometricsCenter,
        notes: injazNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Injaz & Teashir Clearance Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("Injaz Update failed", { description: err.message }),
  });

  // Update Wakala Clearance via REST PUT
  const updateWakalaMutation = useMutation({
    mutationFn: () =>
      updateWakalaClearanceApi(applicant.wakala_processing?.name || `WAK-${applicant.name.replace("APP-", "")}`, {
        applicant: applicant.name,
        status: wakalaStatus,
        employee: wakalaEmployee,
        started_on: startedOn,
        completed_on: wakalaStatus === "Completed" ? (completedOn || new Date().toISOString().split("T")[0]) : completedOn,
        request_payment: requestPayment,
        request_via: requestVia,
        payment_amount: Number(paymentAmount),
        wakala_number: wakalaNumber,
        sponsor_auth_code: sponsorAuthCode,
        foreign_agency_name: foreignAgencyName,
        notes: wakalaNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Wakala Clearance Updated");
      onClose();
    },
    onError: (err: Error) => toast.error("Wakala Update failed", { description: err.message }),
  });

  // Submit Visa Stamp (Stage 7)
  const submitStampMutation = useMutation({
    mutationFn: () =>
      submitDsrStampApi({
        applicant: applicant.name,
        visa_number: visaNumber,
        stamped_date: stampedDate,
        embassy_reference: embassyReference,
        notes: stampNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Visa Stamp Recorded! Candidate transitioned to Stamped.");
      onClose();
    },
    onError: (err: Error) => toast.error("Stamp submission blocked", { description: err.message }),
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
      toast.success("Flight Ticket Issued! Candidate transitioned to Ticketed.");
      onClose();
    },
    onError: (err: Error) => toast.error("Ticketing failed", { description: err.message }),
  });

  // Submit Departure & Pre-Departure Medical 2 (Stage 9)
  const submitDepartureMutation = useMutation({
    mutationFn: () =>
      submitDsrDepartureApi({
        applicant: applicant.name,
        departure_date: depDate,
        departure_time: depTime,
        airport: depAirport,
        destination_city: depDestination,
        medical_2_result: medical2Result,
        medical_2_remarks: medical2Remarks,
        notes: depNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Applicant Marked as Departed! Process Completed 100%.");
      onClose();
    },
    onError: (err: Error) => toast.error("Departure blocked", { description: err.message }),
  });

  const isPending =
    updateLmsMutation.isPending ||
    updateInjazMutation.isPending ||
    updateWakalaMutation.isPending ||
    submitStampMutation.isPending ||
    submitTicketMutation.isPending ||
    submitDepartureMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
        <DialogHeader className="border-b border-slate-200 dark:border-[#222227] pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Operations & Clearances: {applicant.full_name}
            </DialogTitle>
            <Badge variant="default">{applicant.applicant_state}</Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            ID: <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{applicant.name}</span> • Passport:{" "}
            <span className="font-mono">{applicant.passport_number || "N/A"}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#222227] text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("lms")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "lms"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            LMS Clearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("injaz")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "injaz"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            Injaz Clearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wakala")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "wakala"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Wakala Clearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stamp")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "stamp"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Visa Stamp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ticket")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "ticket"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            Flight Ticket
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("departure")}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors shrink-0 ${
              activeTab === "departure"
                ? "border-purple-800 text-purple-900 dark:text-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Medical 2 & Departure
          </button>
        </div>

        {/* Tab 1: LMS Clearance */}
        {activeTab === "lms" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">LMS Clearance Status</Label>
                <select
                  value={lmsStatus}
                  onChange={(e) => setLmsStatus(e.target.value as "Pending" | "Issued" | "Rejected")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5"
                >
                  <option value="Pending">Pending</option>
                  <option value="Issued">Issued</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Assigned Employee (Email)</Label>
                <Input
                  value={lmsEmployee}
                  onChange={(e) => setLmsEmployee(e.target.value)}
                  placeholder="sara@agency.et"
                />
              </div>
              {lmsStatus === "Issued" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="font-semibold text-emerald-800 dark:text-emerald-400">
                    Issued On Date *
                  </Label>
                  <Input
                    type="date"
                    value={lmsIssuedOn}
                    onChange={(e) => setLmsIssuedOn(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateLmsMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs"
              >
                Save LMS Clearance
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Injaz Clearance */}
        {activeTab === "injaz" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Injaz Clearance Status</Label>
                <select
                  value={injazStatus}
                  onChange={(e) => setInjazStatus(e.target.value as "Pending" | "Completed")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Assigned Employee (Email)</Label>
                <Input
                  value={injazEmployee}
                  onChange={(e) => setInjazEmployee(e.target.value)}
                  placeholder="dawit@agency.et"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Injaz Application No</Label>
                <Input
                  value={injazAppNo}
                  onChange={(e) => setInjazAppNo(e.target.value)}
                  placeholder="INJ-7788412"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Teashir Fee ($ USD)</Label>
                <Input
                  type="number"
                  value={teashirFee}
                  onChange={(e) => setTeashirFee(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateInjazMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs"
              >
                Save Injaz Clearance
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Wakala Clearance */}
        {activeTab === "wakala" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Wakala Clearance Status</Label>
                <select
                  value={wakalaStatus}
                  onChange={(e) => setWakalaStatus(e.target.value as "Pending" | "Completed")}
                  className="w-full rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 py-1.5"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Assigned Employee (Email)</Label>
                <Input
                  value={wakalaEmployee}
                  onChange={(e) => setWakalaEmployee(e.target.value)}
                  placeholder="tigist@agency.et"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Started On Date</Label>
                <Input
                  type="date"
                  value={startedOn}
                  onChange={(e) => setStartedOn(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Wakala Number / Code</Label>
                <Input
                  value={wakalaNumber}
                  onChange={(e) => setWakalaNumber(e.target.value)}
                  placeholder="WAK-9921448"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateWakalaMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs"
              >
                Save Wakala Clearance
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: Visa Stamp (Stage 7) */}
        {activeTab === "stamp" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-900 dark:text-emerald-300">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Pre-Departure Guardrail Checked
              </p>
              <p className="text-[11px] mt-0.5">
                Visa stamping requires LMS, Wakala, and Injaz clearances to be complete before submission.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Issued Visa Number *</Label>
                <Input
                  value={visaNumber}
                  onChange={(e) => setVisaNumber(e.target.value)}
                  placeholder="KSA-VISA-9921448"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Stamped Date *</Label>
                <Input
                  type="date"
                  value={stampedDate}
                  onChange={(e) => setStampedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Embassy Reference Code</Label>
                <Input
                  value={embassyReference}
                  onChange={(e) => setEmbassyReference(e.target.value)}
                  placeholder="EMB-ETH-2026-881"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => submitStampMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Confirm Visa Stamp & Advance to Stamped
              </Button>
            </div>
          </div>
        )}

        {/* Tab 5: Flight Ticket (Stage 8) */}
        {activeTab === "ticket" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Airline Ticket PNR *</Label>
                <Input
                  value={ticketPnrFinal}
                  onChange={(e) => setTicketPnrFinal(e.target.value)}
                  placeholder="ET-PNR-88392"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Flight Number *</Label>
                <Input
                  value={flightNoFinal}
                  onChange={(e) => setFlightNoFinal(e.target.value)}
                  placeholder="ET-402"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Date *</Label>
                <Input
                  type="date"
                  value={ticketDepDate}
                  onChange={(e) => setTicketDepDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Destination City *</Label>
                <Input
                  value={ticketDestination}
                  onChange={(e) => setTicketDestination(e.target.value)}
                  placeholder="Riyadh (RUH)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => submitTicketMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Issue Flight Ticket & Advance to Ticketed
              </Button>
            </div>
          </div>
        )}

        {/* Tab 6: Pre-Departure Medical 2 & Departure (Stage 9) */}
        {activeTab === "departure" && (
          <div className="space-y-4 py-2 text-xs">
            {/* Medical 2 Enforced Guardrail */}
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-rose-600" />
                  Pre-Departure Medical 2 Check (Strict Guardrail)
                </span>
                <select
                  value={medical2Result}
                  onChange={(e) => setMedical2Result(e.target.value as "Pass" | "Fail")}
                  className="rounded-md border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#16161b] px-2 py-1 text-xs font-bold text-rose-800 dark:text-rose-300"
                >
                  <option value="Pass">Pass (Cleared for Flight)</option>
                  <option value="Fail">Fail (Departure Blocked)</option>
                </select>
              </div>
              {medical2Result === "Fail" && (
                <div className="space-y-1 pt-1">
                  <Label className="font-semibold text-rose-800 dark:text-rose-300">
                    Mandatory Medical 2 Failure Remarks *
                  </Label>
                  <Input
                    value={medical2Remarks}
                    onChange={(e) => setMedical2Remarks(e.target.value)}
                    placeholder="Provide medical clinical reason for failure..."
                    className="border-rose-400 bg-white dark:bg-[#141418]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Departure Flight Number</Label>
                <Input
                  value={depFlightNo}
                  onChange={(e) => setDepFlightNo(e.target.value)}
                  placeholder="ET-402"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Date</Label>
                <Input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Airport</Label>
                <Input
                  value={depAirport}
                  onChange={(e) => setDepAirport(e.target.value)}
                  placeholder="Bole International Airport (ADD)"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Destination City</Label>
                <Input
                  value={depDestination}
                  onChange={(e) => setDepDestination(e.target.value)}
                  placeholder="Riyadh, Saudi Arabia"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => submitDepartureMutation.mutate()}
                disabled={isPending || medical2Result === "Fail"}
                className="bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-semibold shadow-xs"
              >
                {submitDepartureMutation.isPending ? "Confirming Departure..." : "Verify Medical 2 & Mark Departed"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
