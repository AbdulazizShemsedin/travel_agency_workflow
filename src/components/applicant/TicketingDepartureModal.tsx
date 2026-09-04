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
  V2PlacementRecord,
} from "@/lib/api/v2/placements";
import { StageFeeSection } from "@/components/operational/StageFeeSection";

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
  const [ticketCost, setTicketCost] = React.useState<string>(placement?.ticket_cost ? String(placement.ticket_cost) : "");

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleCause, setRescheduleCause] = React.useState<"Internal" | "Airport">("Internal");
  const [rescheduleCost, setRescheduleCost] = React.useState("");

  // Medical 2 State
  const [medical2Status, setMedical2Status] = React.useState<"FIT" | "UNFIT">("FIT");
  const [medical2ExamDate, setMedical2ExamDate] = React.useState(new Date().toISOString().split("T")[0]);

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
      const res = await recordTicketDetailsV2(placement.name, ticketNumber.trim(), flightDate, parsedCost);
      toast.success("Ticket Details Recorded", {
        description: res?.message || `Flight details logged for placement ${placement.name}. Stage moved to Ticketed.`,
      });
      onSuccess?.();
      setActiveTab("medical2");
    } catch (err: any) {
      toast.error("Ticketing Failed", {
        description: err?.message || "Backend rejected ticket recording.",
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

    setIsSubmitting(true);
    try {
      const parsedCost = rescheduleCost ? parseFloat(rescheduleCost) : undefined;
      const res = await recordRescheduleV2(
        placement.name,
        rescheduleDate,
        rescheduleCause,
        parsedCost
      );
      toast.success("Flight Reschedule Recorded", {
        description: res?.message || `Placement flight rescheduled to ${rescheduleDate}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Reschedule Failed", {
        description: err?.message || "Backend rejected reschedule request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Record Pre-Departure Medical 2
  const handleRecordMedical2 = async (e: React.FormEvent) => {
    e.preventDefault();
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
        description: err?.message || "Backend rejected pre-departure medical record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Finalize Departure
  const handleConfirmDeparture = async () => {
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
        description: err?.message || "Backend rejected departure transition (Medical 2 FIT required).",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            <Badge variant="outline" className="text-[10px] font-mono border-indigo-300 text-indigo-800 bg-indigo-50">
              {placement.name}
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ticket Cost (Birr / ETB)</Label>
              <Input
                type="number"
                step="0.01"
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                placeholder="e.g. 45000 (Optional - auto-creates Pending Expense)"
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Supplying cost automatically creates a pending financial disbursement ledger record.
              </p>
            </div>

            <StageFeeSection
              placementId={placement?.name}
              stageName="Ticketing"
              defaultDirection="Expense"
            />

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
            <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reschedule Fee / Cost (ETB)</Label>
              <Input
                type="number"
                step="0.01"
                value={rescheduleCost}
                onChange={(e) => setRescheduleCost(e.target.value)}
                placeholder="e.g. 5000"
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Reschedule fee is only billed/logged as an internal expense when cause is Internal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
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
          </form>
        )}

        {/* Tab 3: Pre-Departure Medical 2 Form */}
        {activeTab === "medical2" && (
          <form onSubmit={handleRecordMedical2} className="space-y-4 py-2">
            <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs space-y-1">
              <div className="font-bold text-indigo-950 dark:text-indigo-300">
                Pre-Departure Medical 2 Examination (~72h before flight)
              </div>
              <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                Final medical fitness screening prior to airport departure. UNFIT status automatically terminates and cancels both the candidate and placement.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Examination Date *</Label>
                <Input
                  type="date"
                  required
                  value={medical2ExamDate}
                  onChange={(e) => setMedical2ExamDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
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
          </form>
        )}

        {/* Tab 4: Final Departure Clearance */}
        {activeTab === "departure" && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-purple-950 dark:text-purple-300">
                <Plane className="h-4 w-4 text-purple-700" />
                Confirm Flight Boarding & Departure
              </div>
              <p className="text-slate-600 dark:text-zinc-400">
                Advancing to <strong>Departed</strong> marks the end of the placement clearance pipeline:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400">
                <li>Stamps authoritative <code>departed_on</code> timestamp on backend.</li>
                <li>Anchors the <strong>90-day free-replacement guarantee window</strong> for Foreign Agency complaints.</li>
                <li>Locks placement into permanent terminal state.</li>
              </ul>
            </div>

            <StageFeeSection
              placementId={placement?.name}
              stageName="Departure"
              defaultDirection="Expense"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#202028]">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDeparture}
                disabled={isSubmitting}
                className="bg-purple-900 hover:bg-purple-950 text-white font-semibold text-xs h-9"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plane className="h-3.5 w-3.5 mr-1.5" />}
                Confirm Final Departure
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
