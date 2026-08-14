"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plane,
  Building2,
  Fingerprint,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  DollarSign,
  Ticket,
} from "lucide-react";
import { Applicant, LMSProcessing, InjazProcessing, WakalaProcessing, DepartureInfo } from "@/types/applicant";
import {
  updateLmsStreamApi,
  updateInjazStreamApi,
  updateWakalaStreamApi,
  markDepartedApi,
} from "@/lib/api/applicantApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ProcessingStreamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  initialTab?: "lms" | "injaz" | "wakala" | "departure";
}

export function ProcessingStreamsModal({
  isOpen,
  onClose,
  applicant,
  initialTab = "lms",
}: ProcessingStreamsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"lms" | "injaz" | "wakala" | "departure">(initialTab);

  // LMS form state
  const [lmsStatus, setLmsStatus] = React.useState<"Pending" | "In Progress" | "Completed">(
    (applicant.lms_processing?.status as "Pending" | "In Progress" | "Completed") || "In Progress"
  );
  const [ticketPnr, setTicketPnr] = React.useState(applicant.lms_processing?.ticket_pnr || "");
  const [flightNumber, setFlightNumber] = React.useState(applicant.lms_processing?.flight_number || "");
  const [departureDate, setDepartureDate] = React.useState(applicant.lms_processing?.departure_date || "");
  const [destination, setDestination] = React.useState(applicant.lms_processing?.destination || "Riyadh (RUH)");
  const [additionalField1, setAdditionalField1] = React.useState(applicant.lms_processing?.additional_field_1 || "");
  const [additionalField2, setAdditionalField2] = React.useState(applicant.lms_processing?.additional_field_2 || "");
  const [lmsNotes, setLmsNotes] = React.useState(applicant.lms_processing?.notes || "");

  // Injaz form state
  const [injazStatus, setInjazStatus] = React.useState<"Pending" | "In Progress" | "Completed">(
    (applicant.injaz_processing?.status as "Pending" | "In Progress" | "Completed") || "In Progress"
  );
  const [injazAppNo, setInjazAppNo] = React.useState(applicant.injaz_processing?.injaz_app_no || "");
  const [teashirFee, setTeashirFee] = React.useState(applicant.injaz_processing?.teashir_fee ?? 140);
  const [biometricsDate, setBiometricsDate] = React.useState(applicant.injaz_processing?.biometrics_date || "");
  const [biometricsCenter, setBiometricsCenter] = React.useState(applicant.injaz_processing?.biometrics_center || "Teashir VFS Global Addis Ababa");
  const [injazNotes, setInjazNotes] = React.useState(applicant.injaz_processing?.notes || "");

  // Wakala form state
  const [wakalaStatus, setWakalaStatus] = React.useState<"Pending" | "In Progress" | "Completed">(
    (applicant.wakala_processing?.status as "Pending" | "In Progress" | "Completed") || "In Progress"
  );
  const [wakalaNumber, setWakalaNumber] = React.useState(applicant.wakala_processing?.wakala_number || "");
  const [sponsorAuthCode, setSponsorAuthCode] = React.useState(applicant.wakala_processing?.sponsor_auth_code || "");
  const [foreignAgencyName, setForeignAgencyName] = React.useState(applicant.wakala_processing?.foreign_agency_name || "");
  const [wakalaNotes, setWakalaNotes] = React.useState(applicant.wakala_processing?.notes || "");

  // Departure form state
  const [depFlightNo, setDepFlightNo] = React.useState(applicant.departure_info?.flight_number || applicant.lms_processing?.flight_number || "ET-402");
  const [depDate, setDepDate] = React.useState(applicant.departure_info?.departure_date || applicant.lms_processing?.departure_date || new Date().toISOString().split("T")[0]);
  const [depTime, setDepTime] = React.useState(applicant.departure_info?.departure_time || "09:30 AM");
  const [depAirport, setDepAirport] = React.useState(applicant.departure_info?.airport || "Bole International Airport (ADD)");
  const [depDestination, setDepDestination] = React.useState(applicant.departure_info?.destination_city || applicant.lms_processing?.destination || "Riyadh");
  const [depNotes, setDepNotes] = React.useState(applicant.departure_info?.notes || "");

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const updateLmsMutation = useMutation({
    mutationFn: () =>
      updateLmsStreamApi(applicant.name, {
        status: lmsStatus,
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
      toast.success("LMS Stream Updated Successfully");
      onClose();
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });

  const updateInjazMutation = useMutation({
    mutationFn: () =>
      updateInjazStreamApi(applicant.name, {
        status: injazStatus,
        injaz_app_no: injazAppNo,
        teashir_fee: Number(teashirFee),
        biometrics_date: biometricsDate,
        biometrics_center: biometricsCenter,
        notes: injazNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Injaz & Teashir Stream Updated Successfully");
      onClose();
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });

  const updateWakalaMutation = useMutation({
    mutationFn: () =>
      updateWakalaStreamApi(applicant.name, {
        status: wakalaStatus,
        wakala_number: wakalaNumber,
        sponsor_auth_code: sponsorAuthCode,
        foreign_agency_name: foreignAgencyName,
        notes: wakalaNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Wakala Stream Updated Successfully");
      onClose();
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });

  const markDepartedMutation = useMutation({
    mutationFn: () =>
      markDepartedApi(applicant.name, {
        flight_number: depFlightNo,
        departure_date: depDate,
        departure_time: depTime,
        airport: depAirport,
        destination_city: depDestination,
        notes: depNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Applicant marked as Departed!", {
        description: `Deployment confirmed for ${applicant.full_name} to ${depDestination}.`,
      });
      onClose();
    },
    onError: (err: Error) => toast.error("Action failed", { description: err.message }),
  });

  const isPending =
    updateLmsMutation.isPending ||
    updateInjazMutation.isPending ||
    updateWakalaMutation.isPending ||
    markDepartedMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Employee Processing Portal: {applicant.full_name}
            </DialogTitle>
            <Badge variant="default">{applicant.applicant_state}</Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            ID: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{applicant.name}</span> • Passport:{" "}
            <span className="font-mono">{applicant.passport_number || "N/A"}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("lms")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === "lms"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            <Plane className="h-4 w-4" />
            LMS & Ticket Processing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("injaz")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === "injaz"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            <Fingerprint className="h-4 w-4" />
            Injaz & Teashir Biometrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wakala")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === "wakala"
                ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Wakala Authorization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("departure")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === "departure"
                ? "border-purple-800 text-purple-900 dark:text-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            <Send className="h-4 w-4" />
            Final Departure
          </button>
        </div>

        {/* Tab 1: LMS Stream */}
        {activeTab === "lms" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800">
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-200">Labour Management System (LMS)</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                  Input airline ticket reservation, additional clearance codes, and mark stream completion.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Status:</Label>
                <select
                  value={lmsStatus}
                  onChange={(e) => setLmsStatus(e.target.value as "Pending" | "In Progress" | "Completed")}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Ticket PNR / Booking Ref</Label>
                <Input
                  placeholder="e.g. ET-8839201"
                  value={ticketPnr}
                  onChange={(e) => setTicketPnr(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Flight Number</Label>
                <Input
                  placeholder="e.g. ET-402"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Target Departure Date</Label>
                <Input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Destination City / Airport</Label>
                <Input
                  placeholder="e.g. Riyadh (RUH) or Jeddah (JED)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Additional Field 1 (Labor Ministry Clearance Ref)</Label>
                <Input
                  placeholder="e.g. MOL-CLEARANCE-9941"
                  value={additionalField1}
                  onChange={(e) => setAdditionalField1(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Additional Field 2 (Overseas Insurance Ref)</Label>
                <Input
                  placeholder="e.g. INS-MED-2026-441"
                  value={additionalField2}
                  onChange={(e) => setAdditionalField2(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">LMS Processing Notes</Label>
              <Textarea
                placeholder="Candidate flight confirmed and insurance logged..."
                value={lmsNotes}
                onChange={(e) => setLmsNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateLmsMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                {updateLmsMutation.isPending ? "Saving..." : "Save LMS Stream Data"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Injaz & Teashir */}
        {activeTab === "injaz" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-800">
              <div>
                <p className="font-semibold text-blue-950 dark:text-blue-200">Injaz Visa Platform & Teashir Biometrics</p>
                <p className="text-[11px] text-blue-800 dark:text-blue-400">
                  Manage fingerprint biometrics appointment and record the Teashir processing fee.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Status:</Label>
                <select
                  value={injazStatus}
                  onChange={(e) => setInjazStatus(e.target.value as "Pending" | "In Progress" | "Completed")}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Injaz Application Number</Label>
                <Input
                  placeholder="e.g. INJ-7788412"
                  value={injazAppNo}
                  onChange={(e) => setInjazAppNo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">
                  Teashir (Fingerprint Processing) Fee ($ USD) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="140"
                  value={teashirFee}
                  onChange={(e) => setTeashirFee(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Biometrics Appointment Date</Label>
                <Input
                  type="date"
                  value={biometricsDate}
                  onChange={(e) => setBiometricsDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Biometrics Center Location</Label>
                <Input
                  placeholder="Teashir VFS Global Addis Ababa"
                  value={biometricsCenter}
                  onChange={(e) => setBiometricsCenter(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Injaz / Biometrics Notes</Label>
              <Textarea
                placeholder="Fingerprints submitted, awaiting electronic visa approval..."
                value={injazNotes}
                onChange={(e) => setInjazNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateInjazMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                {updateInjazMutation.isPending ? "Saving..." : "Save Injaz & Teashir Data"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Wakala */}
        {activeTab === "wakala" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800">
              <div>
                <p className="font-semibold text-amber-950 dark:text-amber-200">Wakala Power of Attorney Authorization</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400">
                  Electronic agency power of attorney from foreign recruitment agency and sponsor.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Status:</Label>
                <select
                  value={wakalaStatus}
                  onChange={(e) => setWakalaStatus(e.target.value as "Pending" | "In Progress" | "Completed")}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Wakala Number</Label>
                <Input
                  placeholder="e.g. WAK-9921448"
                  value={wakalaNumber}
                  onChange={(e) => setWakalaNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Sponsor Electronic Auth Code</Label>
                <Input
                  placeholder="e.g. ENJAZ-SA-8812"
                  value={sponsorAuthCode}
                  onChange={(e) => setSponsorAuthCode(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Foreign Agency / Sponsor Organization Name</Label>
                <Input
                  placeholder="e.g. Al-Baraka Recruitment Agency (Riyadh)"
                  value={foreignAgencyName}
                  onChange={(e) => setForeignAgencyName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Wakala Verification Notes</Label>
              <Textarea
                placeholder="Wakala verified on Musaned/foreign ministry portal..."
                value={wakalaNotes}
                onChange={(e) => setWakalaNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => updateWakalaMutation.mutate()}
                disabled={isPending}
                className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs"
              >
                {updateWakalaMutation.isPending ? "Saving..." : "Save Wakala Data"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: Final Departure */}
        {activeTab === "departure" && (
          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-950/40 p-3 border border-purple-200 dark:border-purple-800">
              <div>
                <p className="font-semibold text-purple-950 dark:text-purple-200">Final Candidate Overseas Departure</p>
                <p className="text-[11px] text-purple-800 dark:text-purple-400">
                  LMS & Operations staff confirm candidate departure and log final flight records.
                </p>
              </div>
              <Badge variant={applicant.applicant_state === "Departed" ? "success" : "purple"}>
                {applicant.applicant_state === "Departed" ? "Departed" : "Ready for Departure"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Confirmed Flight Number</Label>
                <Input
                  value={depFlightNo}
                  onChange={(e) => setDepFlightNo(e.target.value)}
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
                <Label className="font-semibold">Departure Time</Label>
                <Input
                  value={depTime}
                  onChange={(e) => setDepTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Departure Airport</Label>
                <Input
                  value={depAirport}
                  onChange={(e) => setDepAirport(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="font-semibold">Destination City / Country</Label>
                <Input
                  value={depDestination}
                  onChange={(e) => setDepDestination(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Departure Notes / Confirmation</Label>
              <Textarea
                placeholder="Candidate accompanied to Bole terminal, checked in baggage and through immigration..."
                value={depNotes}
                onChange={(e) => setDepNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => markDepartedMutation.mutate()}
                disabled={isPending}
                className="bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold"
              >
                {markDepartedMutation.isPending ? "Confirming Departure..." : "Confirm & Mark as Departed"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close Portal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
