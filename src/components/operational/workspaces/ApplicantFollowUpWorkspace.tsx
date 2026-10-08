"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  User,
  FileCheck2,
  CreditCard,
  Building2,
  HeartPulse,
  Plane,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ShieldCheck,
  FileDown,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Globe,
  Phone,
  Briefcase,
  ExternalLink,
  ChevronRight,
  MapPin,
  FileText,
  DollarSign,
  Send,
  Ticket,
} from "lucide-react";
import { WorkspaceApplicantRow } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasAnyV2Role } from "@/lib/auth/v2Roles";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import {
  startClearanceStepV2,
  completeClearanceStepV2,
  rejectClearanceStepV2,
  reopenClearanceStepV2,
  setLmisStatusV2,
  setTaeshirAppointmentV2,
  rescheduleTaeshirAppointmentV2,
  recordWakalaPaymentV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
  recordPoliceAsharaV2,
  LMIS_WORKING_STATUSES,
  LMIS_REJECTION_REASONS,
} from "@/lib/api/v2/clearance";
import {
  recordPredepartureMedicalResultV2,
  recordTicketDetailsV2,
  recordRescheduleV2,
  advancePlacementV2,
  uploadPlacementVisaV2,
} from "@/lib/api/v2/placements";
import { downloadInjazDocumentPDF, InjazCandidateData } from "@/lib/pdf/injazDocumentGenerator";

interface ApplicantFollowUpWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  row: WorkspaceApplicantRow | null;
  onRefresh: () => void;
  employees?: { name: string; full_name?: string; email?: string }[];
}

type StageTabId = "summary" | "lmis" | "taeshir" | "embassy" | "medical" | "departure";

export function ApplicantFollowUpWorkspace({
  isOpen,
  onClose,
  row,
  onRefresh,
  employees = [],
}: ApplicantFollowUpWorkspaceProps) {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  const [activeTab, setActiveTab] = React.useState<StageTabId>("summary");

  // Local state copy of current applicant row for instant feedback
  const [currentRow, setCurrentRow] = React.useState<WorkspaceApplicantRow | null>(row);

  React.useEffect(() => {
    setCurrentRow(row);
  }, [row]);

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Role permissions checking
  const authUserV2 = React.useMemo(() => {
    return authUser
      ? {
          user: authUser.email,
          full_name: authUser.full_name || authUser.email,
          roles: Array.isArray(authUser.roles) ? authUser.roles : [],
        }
      : null;
  }, [authUser]);

  const isAdmin = React.useMemo(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator") return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin" ||
        norm === "admin"
      );
    });
  }, [authUser, roles]);

  const hasRoleKeyword = React.useCallback(
    (keywords: string[]) => {
      const r = (roles || []).map((x) => String(x).toLowerCase().trim());
      return r.some((roleName) => keywords.some((k) => roleName.includes(k)));
    },
    [roles]
  );

  const canEditLmis = isAdmin || hasAnyV2Role(authUserV2, ["Saudi LMIS", "Kuwait LMIS", "Clearance Officer"]) || hasRoleKeyword(["lms", "lmis"]);
  const canEditTaeshir = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Taeshir", "Kuwait Telesign", "Clearance Officer"]) || hasRoleKeyword(["taeshir", "teshir", "injaz", "telesign"]);
  const canEditEmbassy = isAdmin || hasAnyV2Role(authUserV2, ["Saudi Embassy", "Kuwait Embassy", "Clearance Officer"]) || hasRoleKeyword(["embassy"]);
  const canEditMedical = isAdmin || hasRoleKeyword(["medical"]) || hasAnyV2Role(authUserV2, ["Clearance Officer"]);
  const canEditDeparture = isAdmin || hasAnyV2Role(authUserV2, ["Ticketer"]) || hasRoleKeyword(["ticket"]);

  // --- DIALOG STATES ---
  // LMIS Rejection Dialog
  const [isLmisRejectOpen, setIsLmisRejectOpen] = React.useState(false);
  const [selectedLmisReasons, setSelectedLmisReasons] = React.useState<string[]>([]);
  const [lmisRejectRemark, setLmisRejectRemark] = React.useState("");

  // Taeshir Reschedule Dialog
  const [isTaeshirRescheduleOpen, setIsTaeshirRescheduleOpen] = React.useState(false);
  const [newTaeshirDate, setNewTaeshirDate] = React.useState("");
  const [taeshirRescheduleReason, setTaeshirRescheduleReason] = React.useState("");

  // Taeshir Direct Appointment & Injaz ID Form
  const [isTaeshirApptOpen, setIsTaeshirApptOpen] = React.useState(false);
  const [directApptDate, setDirectApptDate] = React.useState("");
  const [directInjazId, setDirectInjazId] = React.useState("");

  // Embassy Stamping Dialog
  const [isEmbassyStampOpen, setIsEmbassyStampOpen] = React.useState(false);
  const [embassyVisaNumber, setEmbassyVisaNumber] = React.useState("");
  const [embassyVisaIssueDate, setEmbassyVisaIssueDate] = React.useState("");
  const [embassyVisaExpiryDate, setEmbassyVisaExpiryDate] = React.useState("");

  // Wakala Payment Dialog
  const [isWakalaPayOpen, setIsWakalaPayOpen] = React.useState(false);
  const [wakalaAmount, setWakalaAmount] = React.useState<number>(2000);
  const [wakalaPaidDate, setWakalaPaidDate] = React.useState(new Date().toISOString().split("T")[0]);

  // Ticketing Form Dialog
  const [isTicketFormOpen, setIsTicketFormOpen] = React.useState(false);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [airline, setAirline] = React.useState("Ethiopian Airlines");
  const [flightDate, setFlightDate] = React.useState("");
  const [flightTime, setFlightTime] = React.useState("10:00");

  // Flight Reschedule Dialog
  const [isFlightRescheduleOpen, setIsFlightRescheduleOpen] = React.useState(false);
  const [newFlightDate, setNewFlightDate] = React.useState("");
  const [newFlightTime, setNewFlightTime] = React.useState("");
  const [flightRescheduleReason, setFlightRescheduleReason] = React.useState("");

  // Departure Confirm Dialog
  const [isConfirmDepartOpen, setIsConfirmDepartOpen] = React.useState(false);

  // Invalidate queries & sync state
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_queue"] }),
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
    ]);
    onRefresh();
  };

  if (!isOpen || !currentRow) return null;

  const placementName = currentRow.placementName || currentRow.placementId;
  const destinationCountry = currentRow.destinationCountry || "Saudi Arabia";
  const isKuwait = destinationCountry.toLowerCase().includes("kuwait");

  // Step identifiers
  const lmsStepName = currentRow.lms?.name || currentRow.clearanceStepName;
  const injazStepName = currentRow.injaz?.name;
  const embassyStepName = currentRow.embassy?.name;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div className="w-screen max-w-3xl bg-white dark:bg-[#121217] shadow-2xl border-l border-slate-200 dark:border-[#272730] flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right">
          
          {/* ------------------------------------------------------------- */}
          {/* HEADER: Candidate Identity & Stage Status                      */}
          {/* ------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#16161c]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-base border border-emerald-300/40 uppercase shadow-xs">
                  {currentRow.fullName?.substring(0, 2) || "AP"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase truncate">
                      {currentRow.fullName}
                    </h2>
                    <Badge variant="outline" className="text-[11px] font-mono border-slate-300 dark:border-zinc-700">
                      {currentRow.passportNumber || "NO PASSPORT"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      {destinationCountry}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">
                      Agency: <strong className="text-slate-800 dark:text-zinc-200">{currentRow.agencyName || currentRow.company || "—"}</strong>
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">
                      Sponsor: <strong className="text-slate-800 dark:text-zinc-200">{currentRow.sponsorName || "—"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase px-2.5 py-0.5 shadow-2xs">
                  {currentRow.stageStatus || "Active"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                  title="Close Workspace (ESC)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stage Navigation Segmented Control */}
            <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-1 border-t border-slate-200/60 dark:border-[#222228] pb-1">
              {[
                { id: "summary", label: "Summary", icon: User },
                { id: "lmis", label: "LMIS", icon: FileCheck2 },
                { id: "taeshir", label: "Taeshir", icon: CreditCard },
                { id: "embassy", label: "Embassy / Wakala", icon: Building2 },
                { id: "medical", label: "Medical 2", icon: HeartPulse },
                { id: "departure", label: "Ticket / Departure", icon: Plane },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as StageTabId)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none",
                      isActive
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "bg-white/80 dark:bg-[#1a1a22] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#20202a] border border-slate-200 dark:border-[#272730]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BODY: Detailed Stage Panels                                   */}
          {/* ------------------------------------------------------------- */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* TAB 1: APPLICANT SUMMARY */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#15151a] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Candidate Identity & Context
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Full Name</span>
                      <strong className="text-slate-800 dark:text-zinc-100 uppercase">{currentRow.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Passport Number</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.passportNumber || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Destination Country</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{destinationCountry}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Foreign Agency</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{currentRow.agencyName || currentRow.company || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Sponsor / Employer</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{currentRow.sponsorName || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Sponsor ID</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.sponsorId || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Target Job</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{currentRow.jobApplied || "Housemaid"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone Contact</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.telephone || currentRow.contact || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Labor ID / Office Ref</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.laborId || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Visa Number</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.visaNumber || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contract Days / Duration</span>
                      <strong className="font-mono text-slate-800 dark:text-zinc-100">{currentRow.contractDays || (currentRow.duration ? `${currentRow.duration} days` : "—")}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Current Stage</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{currentRow.stageStatus || "Draft"}</strong>
                    </div>
                  </div>
                </div>

                {/* Later Stage Milestone Overview */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Later-Stage Milestone Snapshot
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">COC Status</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.cocStatus || "Not Started"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">LMIS Status</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.lmisStatus || "Pending"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Taeshir Status</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.teshirStatus || "Pending"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Wakala Status</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.wakalaStatus || "Pending"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Embassy / Visa</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.embassyStatus || "Pending"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pre-Departure (M2)</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentRow.medical2Status || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LMIS CLEARANCE */}
            {activeTab === "lmis" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      LMIS Ministry Clearance & Labor Office Processing
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-blue-300 text-blue-800 dark:text-blue-300">
                    Step: {currentRow.lms?.status || "Pending"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    LMIS Operational Fields
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-500">Working LMIS Status</Label>
                      {canEditLmis && lmsStepName ? (
                        <select
                          value={currentRow.lmisStatus || ""}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val === "REJECTED") {
                              setSelectedLmisReasons([]);
                              setIsLmisRejectOpen(true);
                              return;
                            }
                            try {
                              await setLmisStatusV2(lmsStepName, val);
                              toast.success(`LMIS status updated to ${val}`);
                              setCurrentRow((prev) => prev ? { ...prev, lmisStatus: val } : null);
                              refreshAll();
                            } catch (err) {
                              toast.error(formatCleanErrorMessage(err));
                            }
                          }}
                          className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#16161d] font-bold mt-1"
                        >
                          <option value="">Select status...</option>
                          {LMIS_WORKING_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-1 flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                          <span>{currentRow.lmisStatus || "Pending"}</span>
                          {!canEditLmis && <Lock className="h-3 w-3 text-slate-400" />}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Labor ID (Office Reference)</Label>
                      <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.laborId || "—"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">COC Status</Label>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.cocStatus || "Not Started"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Completion / Issue Date</Label>
                      <div className="font-mono text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.issueDate || currentRow.lms?.date_completed || "—"}
                      </div>
                    </div>

                    {currentRow.lmisRejectionReasons && (
                      <div className="sm:col-span-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                        <span className="font-bold text-[11px] block">Rejection Reason(s):</span>
                        <span className="text-xs">{currentRow.lmisRejectionReasons}</span>
                      </div>
                    )}

                    {/* Kuwait LMIS Police Ashara */}
                    {isKuwait && (
                      <div className="sm:col-span-2 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 mt-2">
                        <span className="font-bold text-xs text-amber-900 dark:text-amber-300 block">
                          Kuwait Police Ashara Sub-check
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ashara Appointment</span>
                            <span className="font-mono font-semibold">{currentRow.lms?.police_ashara_appointment_date || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ashara Reference</span>
                            <span className="font-mono font-semibold">{currentRow.lms?.police_ashara_reference_no || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ashara Status</span>
                            <span className="font-semibold">{currentRow.lms?.police_ashara_status || "Pending"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ashara Payment</span>
                            <span className="font-semibold">{currentRow.lms?.police_ashara_payment_status || "Unpaid"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LMIS Action Bar */}
                  <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      {canEditLmis ? "Authorized for LMIS operations" : "Read-only: requires LMIS Officer or Admin role"}
                    </span>
                    <div className="flex items-center gap-2">
                      {canEditLmis && lmsStepName && (
                        <>
                          {currentRow.lms?.status === "Pending" && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await startClearanceStepV2(lmsStepName);
                                  toast.success("LMIS clearance started");
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className="h-7 text-xs bg-blue-700 hover:bg-blue-800 text-white"
                            >
                              Start LMIS
                            </Button>
                          )}
                          {currentRow.lms?.status === "In Progress" && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await completeClearanceStepV2(lmsStepName);
                                  toast.success("LMIS clearance completed");
                                  refreshAll();
                                } catch (err) {
                                  toast.error(formatCleanErrorMessage(err));
                                }
                              }}
                              className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                              Complete LMIS
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TAESHIR / INJAZ */}
            {activeTab === "taeshir" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                      VFS Taeshir Biometrics & MOFA Injaz Fees
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-indigo-300 text-indigo-800 dark:text-indigo-300">
                    Step: {currentRow.teshirStatus || "Pending"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Taeshir Operational Fields
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-500">Injaz Application ID (E-number)</Label>
                      <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.injazApplicationId || (currentRow.injaz as any)?.injaz_application_id || "—"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Appointment Date</Label>
                      <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.appointmentDate || "—"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Injaz Payment Status</Label>
                      <div className="mt-1">
                        <Badge
                          variant={currentRow.injazPayment === "PAID" ? "success" : "warning"}
                          className="text-[11px] font-bold"
                        >
                          {currentRow.injazPayment || "UNPAID"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Payment Amount / Reference</Label>
                      <div className="font-mono text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.injaz?.amount ? `$${currentRow.injaz.amount}` : "—"} {currentRow.injaz?.reference_no ? `(${currentRow.injaz.reference_no})` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Taeshir Action Bar */}
                  <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      {canEditTaeshir ? "Authorized for Taeshir operations" : "Read-only: requires Taeshir Officer or Admin role"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const candidateData: InjazCandidateData = {
                            fullName: currentRow.fullName,
                            passportNumber: currentRow.passportNumber,
                            visaNumber: currentRow.visaNumber,
                            sponsorName: currentRow.sponsorName,
                            sponsorId: currentRow.sponsorId,
                            injazNumber: currentRow.injazApplicationId || "",
                            targetJob: currentRow.jobApplied || "House worker",
                            nationality: (currentRow.applicant as any)?.nationality || "Ethiopian",
                            photoUrl: (currentRow.applicant as any)?.photo_passport || "",
                            destinationCountry: destinationCountry,
                          };
                          await downloadInjazDocumentPDF(candidateData);
                        }}
                        className="h-7 text-xs gap-1 border-slate-300 dark:border-zinc-700"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Download Injaz PDF
                      </Button>

                      {canEditTaeshir && injazStepName && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDirectApptDate(currentRow.appointmentDate || new Date().toISOString().split("T")[0]);
                              setDirectInjazId(currentRow.injazApplicationId || "");
                              setIsTaeshirApptOpen(true);
                            }}
                            className="h-7 text-xs bg-indigo-700 hover:bg-indigo-800 text-white"
                          >
                            Set Appointment & Injaz ID
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewTaeshirDate("");
                              setTaeshirRescheduleReason("");
                              setIsTaeshirRescheduleOpen(true);
                            }}
                            className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          >
                            Reschedule
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EMBASSY / WAKALA */}
            {activeTab === "embassy" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <span className="font-semibold text-teal-900 dark:text-teal-300">
                      Foreign Embassy Visa Issuance & Wakala Authorization
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-teal-300 text-teal-800 dark:text-teal-300">
                    Step: {currentRow.embassyStatus || "Pending"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Embassy & Wakala Fields
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-500">Wakala Fee Status</Label>
                      <div className="mt-1">
                        <Badge
                          variant={currentRow.wakalaStatus?.toLowerCase() === "authorized" || currentRow.wakalaStatus?.toLowerCase() === "paid" ? "success" : "warning"}
                          className="text-[11px] font-bold"
                        >
                          {currentRow.wakalaStatus || "Pending"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Wakala Fee Amount / Paid Date</Label>
                      <div className="font-mono text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.wakalaAmount ? `${currentRow.wakalaAmount} SAR` : "—"} {currentRow.wakalaPaidDate ? `(${currentRow.wakalaPaidDate})` : ""}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Visa Number</Label>
                      <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.visaNumber || "—"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Embassy Step Status</Label>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.embassyStatus || "Pending"}
                      </div>
                    </div>
                  </div>

                  {/* Embassy Action Bar */}
                  <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      {canEditEmbassy ? "Authorized for Embassy operations" : "Read-only: requires Embassy Officer or Admin role"}
                    </span>
                    <div className="flex items-center gap-2">
                      {canEditEmbassy && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setWakalaAmount(2000);
                              setWakalaPaidDate(new Date().toISOString().split("T")[0]);
                              setIsWakalaPayOpen(true);
                            }}
                            className="h-7 text-xs border-slate-300 dark:border-zinc-700"
                          >
                            Record Wakala Fee
                          </Button>

                          {embassyStepName && (
                            <>
                              {currentRow.embassyStatus !== "Submitted" && currentRow.embassyStatus !== "Stamped" && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await submitEmbassyStepV2(embassyStepName);
                                      toast.success("Submitted to Embassy");
                                      refreshAll();
                                    } catch (err) {
                                      toast.error(formatCleanErrorMessage(err));
                                    }
                                  }}
                                  className="h-7 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                                >
                                  Submit to Embassy
                                </Button>
                              )}

                              {currentRow.embassyStatus !== "Stamped" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEmbassyVisaNumber(currentRow.visaNumber || "");
                                    setEmbassyVisaIssueDate(new Date().toISOString().split("T")[0]);
                                    const exp = new Date();
                                    exp.setDate(exp.getDate() + 90);
                                    setEmbassyVisaExpiryDate(exp.toISOString().split("T")[0]);
                                    setIsEmbassyStampOpen(true);
                                  }}
                                  className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                >
                                  Stamp Visa
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MEDICAL 2 */}
            {activeTab === "medical" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-600" />
                    <span className="font-semibold text-rose-900 dark:text-rose-300">
                      Medical Fitness Clearance (Stage 1 & Pre-Departure Stage 2)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-rose-300 text-rose-800 dark:text-rose-300">
                    M2 Status: {currentRow.medical2Status || "—"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Medical Fitness History & Gate Checks
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b] space-y-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Medical</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{currentRow.medicalStatus || (currentRow.applicant as any)?.medical_status || "—"}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Exp: {currentRow.medicalExpiryDate || (currentRow.applicant as any)?.medical_expiry_date || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b] space-y-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Stage 1 Selected Medical</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{(currentRow.plc as any)?.medical_selected_status || "—"}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Exp: {(currentRow.plc as any)?.medical_selected_expiry_date || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-3 rounded-lg border border-slate-100 dark:border-[#1e1e26] bg-slate-50/40 dark:bg-[#15151b] space-y-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pre-Departure Medical 2 (~72h)</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {currentRow.medical2Status === "FIT" ? (
                            <span className="text-emerald-600 dark:text-emerald-400">FIT (Cleared for Flight)</span>
                          ) : currentRow.medical2Status === "UNFIT" ? (
                            <span className="text-rose-600 dark:text-rose-400">UNFIT (Disqualified)</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Awaiting Pre-departure Check</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Medical Action Bar */}
                  <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      {canEditMedical ? "Authorized for Medical determinations" : "Read-only: requires Medical Officer or Admin role"}
                    </span>
                    <div className="flex items-center gap-2">
                      {canEditMedical && placementName && (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await recordPredepartureMedicalResultV2(placementName, "FIT");
                                toast.success("Pre-departure medical recorded: FIT");
                                setCurrentRow((prev) => prev ? { ...prev, medical2Status: "FIT" } : null);
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark FIT (M2)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await recordPredepartureMedicalResultV2(placementName, "UNFIT");
                                toast.success("Pre-departure medical recorded: UNFIT");
                                setCurrentRow((prev) => prev ? { ...prev, medical2Status: "UNFIT" } : null);
                                refreshAll();
                              } catch (err) {
                                toast.error(formatCleanErrorMessage(err));
                              }
                            }}
                            className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 gap-1"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Mark UNFIT (M2)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: TICKET & DEPARTURE */}
            {activeTab === "departure" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/50 dark:bg-cyan-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-cyan-600" />
                    <span className="font-semibold text-cyan-900 dark:text-cyan-300">
                      Flight Ticketing & Final Departure Execution
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-cyan-300 text-cyan-800 dark:text-cyan-300">
                    Departure: {currentRow.departureStatus || "Pending"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Flight & Ticketing Operational Fields
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-500">Ticket Number</Label>
                      <div className="font-mono font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.ticketNumber || (currentRow.plc as any)?.ticket_number || "—"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Carrier / Airline</Label>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {(currentRow.plc as any)?.airline || "Ethiopian Airlines"}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Flight Date & Time</Label>
                      <div className="font-mono text-slate-800 dark:text-zinc-200 mt-1 p-1.5 rounded bg-slate-50 dark:bg-[#16161d]">
                        {currentRow.flightDate || (currentRow.plc as any)?.flight_date || "—"} {currentRow.flightTime ? `@ ${currentRow.flightTime}` : ""}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-500">Departure Status</Label>
                      <div className="mt-1">
                        <Badge
                          variant={currentRow.departureStatus === "Departed" ? "success" : "warning"}
                          className="text-[11px] font-bold"
                        >
                          {currentRow.departureStatus || "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Ticketing Action Bar */}
                  <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      {canEditDeparture ? "Authorized for Ticketing operations" : "Read-only: requires Ticketer or Admin role"}
                    </span>
                    <div className="flex items-center gap-2">
                      {canEditDeparture && placementName && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setTicketNumber(currentRow.ticketNumber || "");
                              setAirline((currentRow.plc as any)?.airline || "Ethiopian Airlines");
                              setFlightDate(currentRow.flightDate || new Date().toISOString().split("T")[0]);
                              setFlightTime(currentRow.flightTime || "10:00");
                              setIsTicketFormOpen(true);
                            }}
                            className="h-7 text-xs bg-cyan-700 hover:bg-cyan-800 text-white gap-1"
                          >
                            <Ticket className="h-3.5 w-3.5" />
                            Book / Record Ticket
                          </Button>

                          {currentRow.ticketNumber && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewFlightDate("");
                                setNewFlightTime("10:00");
                                setFlightRescheduleReason("");
                                setIsFlightRescheduleOpen(true);
                              }}
                              className="h-7 text-xs border-slate-300 dark:border-zinc-700"
                            >
                              Reschedule Flight
                            </Button>
                          )}

                          {currentRow.stageStatus === "Ticketed" && currentRow.medical2Status === "FIT" && (
                            <Button
                              size="sm"
                              onClick={() => setIsConfirmDepartOpen(true)}
                              className="h-7 text-xs bg-purple-700 hover:bg-purple-800 text-white gap-1"
                            >
                              <Plane className="h-3.5 w-3.5" />
                              Confirm Departure
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* FOOTER: Quick Dismissal                                       */}
          {/* ------------------------------------------------------------- */}
          <div className="p-3 sm:px-6 border-t border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#15151a] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Changes save directly to authoritative backend records.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 border-slate-300 dark:border-zinc-700"
            >
              Done / Return to Table
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODALS & DIALOGS                                              */}
      {/* ------------------------------------------------------------- */}

      {/* LMIS Rejection Reasons Dialog */}
      <Dialog open={isLmisRejectOpen} onOpenChange={setIsLmisRejectOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 dark:text-rose-400">
              Select LMIS Rejection Reason(s)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Backend state machine requires at least one official reason when setting LMIS status to REJECTED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-2">
              {LMIS_REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-[#1a1a22] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLmisReasons.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLmisReasons((prev) => [...prev, reason]);
                      } else {
                        setSelectedLmisReasons((prev) => prev.filter((r) => r !== reason));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-zinc-200">{reason}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsLmisRejectOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedLmisReasons.length === 0}
              onClick={async () => {
                if (!lmsStepName) return;
                try {
                  await setLmisStatusV2(lmsStepName, "REJECTED", selectedLmisReasons);
                  toast.success("LMIS status set to REJECTED");
                  setIsLmisRejectOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, lmisStatus: "REJECTED", lmisRejectionReasons: selectedLmisReasons.join(", ") } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taeshir Direct Appointment & Injaz ID Dialog */}
      <Dialog open={isTaeshirApptOpen} onOpenChange={setIsTaeshirApptOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Set Taeshir Appointment & Injaz ID
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registers biometric appointment date and Injaz application E-number on the clearance step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Appointment Date *</Label>
              <Input
                type="date"
                value={directApptDate}
                onChange={(e) => setDirectApptDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Injaz Application ID (E-number) *</Label>
              <Input
                type="text"
                value={directInjazId}
                onChange={(e) => setDirectInjazId(e.target.value)}
                placeholder="e.g. E12345678"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTaeshirApptOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!directApptDate}
              onClick={async () => {
                if (!injazStepName) return;
                try {
                  await setTaeshirAppointmentV2(injazStepName, directApptDate, directInjazId);
                  toast.success("Taeshir appointment saved");
                  setIsTaeshirApptOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, appointmentDate: directApptDate, injazApplicationId: directInjazId } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taeshir Reschedule Dialog */}
      <Dialog open={isTaeshirRescheduleOpen} onOpenChange={setIsTaeshirRescheduleOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reschedule Taeshir Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reschedules the biometric appointment without forfeiting existing Injaz payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">New Appointment Date *</Label>
              <Input
                type="date"
                value={newTaeshirDate}
                onChange={(e) => setNewTaeshirDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reschedule Reason</Label>
              <Input
                type="text"
                value={taeshirRescheduleReason}
                onChange={(e) => setTaeshirRescheduleReason(e.target.value)}
                placeholder="e.g. Candidate medical delay"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTaeshirRescheduleOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newTaeshirDate}
              onClick={async () => {
                if (!injazStepName) return;
                try {
                  await rescheduleTaeshirAppointmentV2(injazStepName, newTaeshirDate, taeshirRescheduleReason);
                  toast.success("Appointment rescheduled");
                  setIsTaeshirRescheduleOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, appointmentDate: newTaeshirDate } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embassy Stamp Visa Dialog */}
      <Dialog open={isEmbassyStampOpen} onOpenChange={setIsEmbassyStampOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-teal-700 dark:text-teal-400">
              Stamp Embassy Visa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Marks visa as officially stamped and records issuance and expiry dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Visa Number *</Label>
              <Input
                type="text"
                value={embassyVisaNumber}
                onChange={(e) => setEmbassyVisaNumber(e.target.value)}
                placeholder="e.g. 1300892341"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Issue Date *</Label>
                <Input
                  type="date"
                  value={embassyVisaIssueDate}
                  onChange={(e) => setEmbassyVisaIssueDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expiry Date *</Label>
                <Input
                  type="date"
                  value={embassyVisaExpiryDate}
                  onChange={(e) => setEmbassyVisaExpiryDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEmbassyStampOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!embassyVisaNumber}
              onClick={async () => {
                if (!embassyStepName) return;
                try {
                  await stampEmbassyStepV2(embassyStepName, embassyVisaNumber);
                  if (placementName) {
                    await uploadPlacementVisaV2(placementName, "", embassyVisaNumber, embassyVisaIssueDate, embassyVisaExpiryDate);
                  }
                  toast.success("Embassy visa stamped successfully");
                  setIsEmbassyStampOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, embassyStatus: "Stamped", visaNumber: embassyVisaNumber } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-teal-700 hover:bg-teal-800 text-white"
            >
              Confirm Stamped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wakala Payment Dialog */}
      <Dialog open={isWakalaPayOpen} onOpenChange={setIsWakalaPayOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Record Wakala Fee Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Records Wakala authorization fee and date for Saudi embassy submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Amount (SAR) *</Label>
              <Input
                type="number"
                value={wakalaAmount}
                onChange={(e) => setWakalaAmount(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Paid Date *</Label>
              <Input
                type="date"
                value={wakalaPaidDate}
                onChange={(e) => setWakalaPaidDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsWakalaPayOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!wakalaAmount}
              onClick={async () => {
                if (!embassyStepName) return;
                try {
                  await recordWakalaPaymentV2(embassyStepName, "Paid", wakalaAmount, wakalaPaidDate);
                  toast.success("Wakala fee recorded");
                  setIsWakalaPayOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, wakalaStatus: "Authorized", wakalaAmount, wakalaPaidDate } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-slate-800 hover:bg-slate-900 text-white"
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticketing Form Dialog */}
      <Dialog open={isTicketFormOpen} onOpenChange={setIsTicketFormOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-cyan-700 dark:text-cyan-400">
              Record Flight Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Issues flight booking details, transitioning candidate to Ticketed stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ticket Number *</Label>
              <Input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="e.g. ET-998231"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Airline Carrier *</Label>
              <Input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="e.g. Ethiopian Airlines"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Flight Date *</Label>
                <Input
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Departure Time</Label>
                <Input
                  type="time"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTicketFormOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!ticketNumber || !flightDate}
              onClick={async () => {
                if (!placementName) return;
                try {
                  await recordTicketDetailsV2(placementName, ticketNumber, flightDate);
                  toast.success("Flight ticket recorded successfully");
                  setIsTicketFormOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, ticketNumber, flightDate, flightTime, stageStatus: "Ticketed", departureStatus: "Ticketed" } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-cyan-700 hover:bg-cyan-800 text-white"
            >
              Issue Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flight Reschedule Dialog */}
      <Dialog open={isFlightRescheduleOpen} onOpenChange={setIsFlightRescheduleOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reschedule Flight
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Updates departure date and time for an already ticketed candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Flight Date *</Label>
                <Input
                  type="date"
                  value={newFlightDate}
                  onChange={(e) => setNewFlightDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Flight Time</Label>
                <Input
                  type="time"
                  value={newFlightTime}
                  onChange={(e) => setNewFlightTime(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reschedule Reason</Label>
              <Input
                type="text"
                value={flightRescheduleReason}
                onChange={(e) => setFlightRescheduleReason(e.target.value)}
                placeholder="e.g. Airline schedule adjustment"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsFlightRescheduleOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newFlightDate}
              onClick={async () => {
                if (!placementName) return;
                try {
                  await recordRescheduleV2(placementName, newFlightDate, "Airport");
                  toast.success("Flight rescheduled successfully");
                  setIsFlightRescheduleOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, flightDate: newFlightDate, flightTime: newFlightTime } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-cyan-700 hover:bg-cyan-800 text-white"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Departure Dialog */}
      <Dialog open={isConfirmDepartOpen} onOpenChange={setIsConfirmDepartOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#141419]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-700 dark:text-purple-400">
              Confirm Final Candidate Departure
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Advances candidate lifecycle to Departed. This completes the recruitment workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 text-xs text-purple-900 dark:text-purple-200 space-y-1">
            <span className="font-bold">Candidate: {currentRow.fullName}</span>
            <p>Flight Date: {currentRow.flightDate} @ {currentRow.flightTime || "10:00"}</p>
            <p>Pre-departure Medical 2: {currentRow.medical2Status} (Checked)</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmDepartOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!placementName) return;
                try {
                  await advancePlacementV2(placementName, "Departed");
                  toast.success(`Candidate ${currentRow.fullName} marked as Departed!`);
                  setIsConfirmDepartOpen(false);
                  setCurrentRow((prev) => prev ? { ...prev, stageStatus: "Departed", departureStatus: "Departed" } : null);
                  refreshAll();
                } catch (err) {
                  toast.error(formatCleanErrorMessage(err));
                }
              }}
              className="text-xs h-8 bg-purple-700 hover:bg-purple-800 text-white"
            >
              Confirm Departure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
