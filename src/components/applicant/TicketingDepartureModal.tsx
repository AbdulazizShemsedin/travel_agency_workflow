"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Ticket,
  Plane,
  HeartPulse,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  recordTicketDetailsV2,
  recordRescheduleV2,
  recordPredepartureMedicalResultV2,
  advancePlacementV2,
  recordFlightOutcomeV2,
  undoFlightOutcomeV2,
  undoRescheduleV2,
  clearPredepartureMedicalResultV2,
  V2PlacementRecord,
} from "@/lib/api/v2/placements";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface TicketingDepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  placement: V2PlacementRecord | null;
  applicantName: string;
  initialTab?: "ticket" | "reschedule" | "medical2" | "departure";
  onSuccess?: () => void;
}

export function TicketingDepartureModal({
  isOpen,
  onClose,
  placement,
  applicantName,
  initialTab = "ticket",
  onSuccess,
}: TicketingDepartureModalProps) {
  const [activeTab, setActiveTab] = React.useState<"ticket" | "reschedule" | "medical2" | "departure">(initialTab);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Ticketing Form State
  const [ticketNumber, setTicketNumber] = React.useState(placement?.ticket_number || "");
  const [flightDate, setFlightDate] = React.useState(placement?.flight_date || "");
  const [flightTime, setFlightTime] = React.useState((placement as any)?.flight_time || "");
  const [ticketCost, setTicketCost] = React.useState<string>(placement?.ticket_cost ? String(placement.ticket_cost) : "");

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("");
  const [rescheduleCause, setRescheduleCause] = React.useState<"Internal" | "Airport">("Internal");
  const [rescheduleCost, setRescheduleCost] = React.useState("");
  const [newTicketNumber, setNewTicketNumber] = React.useState("");

  // Flight Outcome State
  const [outcomeDate, setOutcomeDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [outcomeReason, setOutcomeReason] = React.useState("");

  // Medical 2 State
  const [medical2Status, setMedical2Status] = React.useState<"FIT" | "UNFIT">("FIT");
  const [medical2ExamDate, setMedical2ExamDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [isUnfitConfirmOpen, setIsUnfitConfirmOpen] = React.useState(false);

  if (!placement) return null;

  // 1. Record Ticket Details
  const handleRecordTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim() || !flightDate) {
      toast.error("Required Fields Missing", { description: "Please provide ticket number and flight date." });
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedCost = ticketCost ? parseFloat(ticketCost) : undefined;
      const res = await recordTicketDetailsV2(
        placement.name,
        ticketNumber.trim(),
        flightDate,
        parsedCost,
        flightTime ? flightTime.trim() : undefined
      );
      if (res?.warning) {
        toast.warning("Warning", { description: res.warning });
      }
      toast.success("Ticket Details Recorded", {
        description: res?.message || `Flight details logged for candidate ${applicantName}. Stage moved to Ticketed.`,
      });
      onSuccess?.();
      setActiveTab("medical2");
    } catch (err: any) {
      toast.error("Ticketing Failed", {
        description: err?.message || "Failed to record ticket details. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Record Flight Reschedule
  const handleRecordReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) {
      toast.error("Required Field Missing", { description: "Please specify the new rescheduled flight date." });
      return;
    }

    if (rescheduleCause === "Internal" && (!rescheduleCost || parseFloat(rescheduleCost) <= 0)) {
      toast.error("Cost Required", { description: "Internal reschedule requires a new ticket cost in ETB." });
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedCost = rescheduleCause === "Internal" && rescheduleCost ? parseFloat(rescheduleCost) : undefined;
      const res = await recordRescheduleV2(
        placement.name,
        rescheduleDate,
        rescheduleCause,
        parsedCost,
        rescheduleCause === "Internal" && newTicketNumber.trim() ? newTicketNumber.trim() : undefined,
        undefined,
        rescheduleTime ? rescheduleTime.trim() : undefined
      );
      toast.success("Flight Reschedule Recorded", {
        description: res?.message || `Flight rescheduled to ${rescheduleDate}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Reschedule Failed", {
        description: err?.message || "Failed to record flight reschedule. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo Reschedule (N9)
  const handleUndoReschedule = async () => {
    setIsSubmitting(true);
    try {
      await undoRescheduleV2(placement.name);
      toast.success("Reschedule Undone", { description: "Flight details restored to earlier flight." });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to undo reschedule", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear Pre-departure Medical 2 Result (N9)
  const handleClearMedical2 = async () => {
    setIsSubmitting(true);
    try {
      await clearPredepartureMedicalResultV2(placement.name);
      toast.success("Medical 2 Cleared", { description: "Pre-departure medical screening result reset." });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to clear medical result", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Local Return (N4)
  const handleRecordLocalReturn = async () => {
    setIsSubmitting(true);
    try {
      await recordFlightOutcomeV2(placement.name, "Local return", undefined, outcomeReason || undefined);
      toast.success("Local Return Recorded", {
        description: "Candidate did not board flight. Case remains Ticketed until rescheduled.",
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to record Local return", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record International Return (N4)
  const handleRecordInternationalReturn = async () => {
    if (!outcomeDate) {
      toast.error("Return Date Required", { description: "Please enter the date candidate returned." });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await recordFlightOutcomeV2(
        placement.name,
        "International return",
        outcomeDate,
        outcomeReason || undefined
      );
      toast.success("International Return Recorded", {
        description: res?.replacement_owed
          ? "Candidate returned within 90 days. A replacement is owed."
          : "Candidate returned 90 days or more after departure. No replacement owed.",
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to record International return", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo Flight Outcome (N4)
  const handleUndoFlightOutcome = async () => {
    setIsSubmitting(true);
    try {
      await undoFlightOutcomeV2(placement.name);
      toast.success("Flight Outcome Undone");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to undo flight outcome", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Record Pre-Departure Medical 2
  const executeRecordMedical2 = async () => {
    setIsSubmitting(true);
    try {
      const res = await recordPredepartureMedicalResultV2(placement.name, medical2Status, medical2ExamDate);
      toast.success("Medical 2 Recorded", {
        description: res?.message || `Pre-departure medical status set to ${medical2Status}.`,
      });
      onSuccess?.();
      if (medical2Status === "FIT") {
        setActiveTab("departure");
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error("Medical 2 Failed", {
        description: err?.message || "Failed to record pre-departure medical record. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordMedical2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medical2Status === "UNFIT") {
      setIsUnfitConfirmOpen(true);
      return;
    }
    await executeRecordMedical2();
  };

  // 4. Finalize Departure
  const handleConfirmDeparture = async () => {
    if (placement.status !== "Ticketed") {
      toast.error("Placement Not Ready for Departure", {
        description: `Current placement stage is "${placement.status}". All clearance steps (LMIS, Te'shir, Embassy) must be completed and flight ticket recorded before advancing to Departed.`,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await advancePlacementV2(placement.name, "Departed");
      toast.success("Placement Departed", {
        description: res?.message || `Candidate officially Departed. 90-day free-replacement window anchored.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Departure Clearance Failed", {
        description: err?.message || "Unable to confirm departure. Please verify that Medical 2 is passed (FIT).",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-indigo-600" />
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Ticketing & Departure Workspace
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-800 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300">
              {placement.status || "Ticketing"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Candidate: <strong>{applicantName}</strong> • Current Placement Stage: <strong>{placement.status}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#202028] pb-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ticket")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "ticket"
                ? "bg-indigo-900 text-white dark:bg-indigo-700"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#171720]"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            Flight Ticketing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reschedule")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "reschedule"
                ? "bg-indigo-900 text-white dark:bg-indigo-700"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#171720]"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("medical2")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "medical2"
                ? "bg-indigo-900 text-white dark:bg-indigo-700"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#171720]"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            Medical 2 Check
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("departure")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "departure"
                ? "bg-purple-900 text-white dark:bg-purple-700"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#171720]"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            Final Departure
          </button>
        </div>

        {/* Tab 1: Ticketing Form */}
        {activeTab === "ticket" && (
          <form onSubmit={handleRecordTicket} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ticket / E-Ticket Number *</Label>
                <Input
                  required
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="e.g. ET-07123901"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Flight Departure Date *</Label>
                <Input
                  type="date"
                  required
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Departure Flight Time</Label>
                <Input
                  type="time"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ticket Cost (ETB)</Label>
              <Input
                type="number"
                step="0.01"
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                placeholder="e.g. 45000 (Optional - auto-creates Pending Expense)"
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Supplying cost automatically creates a pending financial disbursement ledger record in ETB.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !ticketNumber.trim() || !flightDate}
                className="bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-xs"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Record Ticket & Advance
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Reschedule Form */}
        {activeTab === "reschedule" && (
          <form onSubmit={handleRecordReschedule} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Flight Date *</Label>
                <Input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Flight Time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reschedule Cause *</Label>
                <select
                  value={rescheduleCause}
                  onChange={(e) => setRescheduleCause(e.target.value as any)}
                  className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100"
                >
                  <option value="Internal">Internal (Agency Responsibility)</option>
                  <option value="Airport">Airport / Airline Cause (Non-Billed)</option>
                </select>
              </div>
            </div>

            {rescheduleCause === "Airport" ? (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-600 dark:text-zinc-400">
                Airport/Airline reschedule: flight date moves automatically. No new ticket purchase required and no fee is charged.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">New Ticket Cost (ETB) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={rescheduleCost}
                    onChange={(e) => setRescheduleCost(e.target.value)}
                    placeholder="e.g. 25000"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Internal reschedule purchases a new ticket and creates an auto-approved expense row.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">New Ticket Number (Optional)</Label>
                  <Input
                    type="text"
                    value={newTicketNumber}
                    onChange={(e) => setNewTicketNumber(e.target.value)}
                    placeholder="e.g. ET-089921"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
              {Boolean((placement as any)?.is_rescheduled) ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleUndoReschedule}
                  disabled={isSubmitting}
                  className="h-8 text-xs font-semibold"
                >
                  Undo Reschedule
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !rescheduleDate}
                  className="bg-indigo-900 hover:bg-indigo-950 text-white font-semibold text-xs"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Confirm Flight Reschedule
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Pre-Departure Medical 2 Form */}
        {activeTab === "medical2" && (
          <form onSubmit={handleRecordMedical2} className="space-y-4 py-2">
            <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-1">
              <div className="font-bold text-indigo-950 dark:text-indigo-300">
                Pre-Departure Medical 2 Screening (~72h before flight)
              </div>
              <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                Final medical fitness screening prior to airport departure. UNFIT status automatically terminates and cancels both the candidate and placement.
              </p>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs font-semibold">Medical Result *</Label>
              <select
                value={medical2Status}
                onChange={(e) => setMedical2Status(e.target.value as "FIT" | "UNFIT")}
                className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100"
              >
                <option value="FIT">FIT — Clear for Travel</option>
                <option value="UNFIT">UNFIT — Failed Screening</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
              {Boolean(placement.medical_2_status || (placement as any)?.medical_2_result) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearMedical2}
                  disabled={isSubmitting}
                  className="h-8 text-xs text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Clear Medical 2 Result
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className={
                    medical2Status === "FIT"
                      ? "bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs"
                      : "bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs"
                  }
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  {medical2Status === "FIT" ? "Record Medical 2 FIT" : "Record Medical 2 UNFIT"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 4: Final Departure Clearance & Outcomes */}
        {activeTab === "departure" && (
          <div className="space-y-4 py-2">
            {placement.status !== "Ticketed" && placement.status !== "Departed" && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  Prerequisites Required: Stage is Currently "{placement.status}"
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  A placement cannot move to <strong>Departed</strong> directly from <strong>{placement.status}</strong>. Please complete the prerequisite steps:
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                  <li>Complete and finalize all 3 clearance steps (LMIS, Te'shir, and Embassy Visa Stamping).</li>
                  <li>Record flight ticket details in the <strong>Flight Ticketing</strong> tab to transition this placement to <strong>Ticketed</strong>.</li>
                  <li>Verify that pre-departure Medical 2 is passed (FIT).</li>
                </ol>
              </div>
            )}

            {placement.status === "Ticketed" && (
              <>
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-purple-950 dark:text-purple-300">
                    <Plane className="h-4 w-4 text-purple-700" />
                    Confirm Flight Boarding & Departure
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Advancing to <strong>Departed</strong> marks the end of the placement clearance pipeline:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400">
                    <li>Records official departure timestamp.</li>
                    <li>Anchors the <strong>90-day free-replacement guarantee window</strong> for Foreign Agency complaints.</li>
                    <li>Finalizes the placement pipeline.</li>
                  </ul>
                  <div className="pt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmDeparture}
                      disabled={isSubmitting}
                      className="bg-purple-900 hover:bg-purple-950 text-white font-semibold text-xs h-8"
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plane className="h-3.5 w-3.5 mr-1.5" />}
                      Confirm Final Departure
                    </Button>
                  </div>
                </div>

                {/* Local Return Outcome Option */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50 dark:bg-[#16161c] space-y-2.5">
                  <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200">
                    Alternative Outcome: Local Return (Did Not Fly)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Worker had a ticket but did not board. Case remains Ticketed until a reschedule is logged.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Reason for Local Return (Optional)</Label>
                    <Input
                      value={outcomeReason}
                      onChange={(e) => setOutcomeReason(e.target.value)}
                      placeholder="e.g. Passenger no-show at airport"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRecordLocalReturn}
                    disabled={isSubmitting}
                    className="h-8 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                  >
                    Record Local Return
                  </Button>
                </div>
              </>
            )}

            {placement.status === "Departed" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      ✓ Placement is Departed
                    </span>
                    {(placement as any)?.flight_outcome && (
                      <Badge className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300">
                        {(placement as any).flight_outcome}
                      </Badge>
                    )}
                  </div>
                  {(placement as any)?.flight_outcome === "International return" && (
                    <p className="mt-2 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                      {(placement as any)?.replacement_owed
                        ? "A free replacement is owed (returned within 90 days)."
                        : "No replacement is owed (returned 90 days or more after departure)."}
                    </p>
                  )}
                </div>

                {/* International Return Form if not already recorded */}
                {!(placement as any)?.flight_outcome ? (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                    <div className="font-semibold text-xs text-rose-950 dark:text-rose-200">
                      Record International Return (Worker Sent Back)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Return Date *</Label>
                        <Input
                          type="date"
                          value={outcomeDate}
                          onChange={(e) => setOutcomeDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Reason for Return (Optional)</Label>
                        <Input
                          value={outcomeReason}
                          onChange={(e) => setOutcomeReason(e.target.value)}
                          placeholder="e.g. Contract terminated by sponsor"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRecordInternationalReturn}
                      disabled={isSubmitting || !outcomeDate}
                      className="h-8 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white"
                    >
                      Record International Return
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndoFlightOutcome}
                    disabled={isSubmitting}
                    className="h-8 text-xs text-slate-600 dark:text-zinc-300"
                  >
                    Undo Flight Outcome
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Close
              </Button>
            </div>
          </div>
        )}    )}
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal for Pre-Departure Medical 2 UNFIT */}
    <ConfirmationModal
      isOpen={isUnfitConfirmOpen}
      onClose={() => setIsUnfitConfirmOpen(false)}
      onConfirm={async () => {
        try {
          await executeRecordMedical2();
          setIsUnfitConfirmOpen(false);
        } catch {
          // Handled in executeRecordMedical2
        }
      }}
      title="Disqualify Candidate (Medical 2 UNFIT)?"
      description={
        <span>
          Warning: Setting Pre-Departure Medical 2 to UNFIT will immediately disqualify{" "}
          <strong>{applicantName}</strong> from traveling and automatically cancel both the candidate and placement record. This action cannot be undone. Are you sure you want to proceed?
        </span>
      }
      confirmLabel="Confirm UNFIT Disqualification"
      cancelLabel="Go Back"
      variant="danger"
      isLoading={isSubmitting}
    />
    </>
  );
}
