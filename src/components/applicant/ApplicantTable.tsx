"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Eye,
  UserCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  HeartPulse,
  Clock,
  CheckCircle2,
  Ticket,
  RotateCcw,
  FileSpreadsheet,
  MoreVertical,
  Send,
  Ban,
} from "lucide-react";
import { V2ApplicantDetails, listApplicantsV2, listPlacementsV2, listMyClearanceStepsV2, registerApplicantV2 } from "@/lib/api/v2";
import { cancelApplicantV2, restartApplicantV2 } from "@/lib/api/v2/applicants";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { generateCvV2 } from "@/lib/api/v2/cv";
import { recordSelectedMedicalResultV2, advancePlacementV2 } from "@/lib/api/v2/placements";
import { TicketingDepartureModal } from "@/components/applicant/TicketingDepartureModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AssignEmployeeModal } from "./AssignEmployeeModal";
import { SimpleSelect } from "@/components/ui/select";
import { useAuth } from "@/components/providers/AuthProvider";
import { extractRoleName } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

// Live backend truth: the Applicant's own `status` stays at the intake lifecycle stop
// (Draft / Registered / CV Generated / Cancelled) even after a Placement exists — the
// pipeline stage lives on the Placement (`Selected`/`Processing`/`Stamped`/`Ticketed`/
// `Departed`). The Directory must therefore resolve the Current Stage from the active
// placement when present, never from the applicant row alone.
function resolveApplicantStage(app: any, plc: any): string {
  const ownStatus = String(app.status || app.applicant_state || "Draft");
  if (ownStatus === "Cancelled") return "Cancelled";
  if (plc && plc.status) {
    if (String(plc.status) === "Cancelled") return "Cancelled";
    if (["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(String(plc.status))) {
      return String(plc.status);
    }
  }
  return ownStatus;
}

function getStageBadgeVariant(stage: string): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" | "purple";
  dotColor: string;
  className?: string;
} {
  switch (stage) {
    case "Registered":
      return { variant: "success", dotColor: "bg-emerald-600" };
    case "CV Generated":
    case "Waiting to be Selected":
      return {
        variant: "purple",
        dotColor: "bg-purple-600",
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      };
    case "Selected":
      return { variant: "info", dotColor: "bg-blue-600" };
    case "Processing":
      return { variant: "warning", dotColor: "bg-amber-600" };
    case "Stamped":
      return {
        variant: "neutral",
        dotColor: "bg-teal-600",
        className: "bg-teal-50 text-teal-700 border-teal-200",
      };
    case "Ticketed":
      return {
        variant: "neutral",
        dotColor: "bg-cyan-600",
        className: "bg-cyan-50 text-cyan-700 border-cyan-200",
      };
    case "Departed":
      return {
        variant: "neutral",
        dotColor: "bg-lime-600",
        className: "bg-lime-50 text-lime-700 border-lime-200",
      };
    case "Draft":
      return { variant: "neutral", dotColor: "bg-slate-500" };
    case "Cancelled":
      return { variant: "destructive", dotColor: "bg-rose-600" };
    default:
      return { variant: "neutral", dotColor: "bg-slate-500" };
  }
}

/** Returns a compact clearance-step status badge string for display in the table */
function stepStatusLabel(status?: string | null): string {
  if (!status) return "—";
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed" || s === "issued" || s === "stamped") return status;
  if (s === "in progress") return "In Progress";
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
  if (s === "cancelled") return "Cancelled";
  return status;
}

/** Colour class for clearance step status cells */
function stepStatusClass(status?: string | null): string {
  if (!status) return "text-slate-400";
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed" || s === "issued" || s === "stamped")
    return "text-emerald-700 dark:text-emerald-400 font-semibold";
  if (s === "in progress") return "text-amber-700 dark:text-amber-400 font-semibold";
  if (s === "rejected" || s === "cancelled") return "text-rose-600 dark:text-rose-400";
  if (s === "pending") return "text-slate-500 dark:text-slate-400";
  return "text-slate-600 dark:text-slate-300";
}

/** Days remaining from today to a target date (positive = future, negative = past) */
function daysRemaining(targetDate?: string | null): string {
  if (!targetDate) return "—";
  const diff = Math.floor((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "TODAY";
  if (diff > 0) return `${diff} DAYS LEFT`;
  return `${Math.abs(diff)} DAYS AGO`;
}

/** Days since a source date from today */
function daysSince(sourceDate?: string | null): string {
  if (!sourceDate) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(sourceDate).getTime()) / (1000 * 60 * 60 * 24)));
  return `${diff} DAYS`;
}

export function ApplicantTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const urlFilter = searchParams?.get("status") || searchParams?.get("stage") || searchParams?.get("filter") || "";

  const { authUser, can } = useAuth();

  // Derive corridor restriction from user roles
  const corridorRestriction = React.useMemo(() => {
    if (!authUser?.roles) return null;
    const roleNames = authUser.roles.map(extractRoleName);
    const adminRoles = ["admin", "manager", "system manager", "administrator", "registrar", "clearance officer", "ticketer", "complaint manager", "finance manager", "communication manager", "contract parser"];
    if (roleNames.some((r) => adminRoles.includes(r))) return null;
    const isSaudiRole = roleNames.some((r) => r.startsWith("saudi"));
    const isKuwaitRole = roleNames.some((r) => r.startsWith("kuwait"));
    if (isSaudiRole && !isKuwaitRole) return "saudi";
    if (isKuwaitRole && !isSaudiRole) return "kuwait";
    return null;
  }, [authUser]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStage, setSelectedStage] = React.useState<string>(() => {
    if (urlFilter) return urlFilter.trim();
    return "All";
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

  // Track which applicant's CV is being generated (for per-row loading state)
  const [generatingCvFor, setGeneratingCvFor] = React.useState<string | null>(null);

  // Optimistic set: applicants whose CV was just generated this session.
  // This makes "View CV" appear immediately after generation before the query refetch completes.
  const [cvGeneratedSet, setCvGeneratedSet] = React.useState<Set<string>>(new Set());

  // ── Medical Screening Inline Modal State ──────────────────────────────────
  // Triggered from the table's action column for a Selected-stage applicant.
  const [isMedicalModalOpen, setIsMedicalModalOpen] = React.useState(false);
  const [medicalTargetPlacementName, setMedicalTargetPlacementName] = React.useState<string>("");
  const [medicalTargetApplicantName, setMedicalTargetApplicantName] = React.useState<string>("");
  const [med1Status, setMed1Status] = React.useState<"FIT" | "UNFIT">("FIT");
  const [med1Date, setMed1Date] = React.useState("");
  const [med1Expiry, setMed1Expiry] = React.useState("");

  // ── Ticketing & Departure Modal State ──────────────────────────────────────
  const [isTicketingModalOpen, setIsTicketingModalOpen] = React.useState(false);
  const [ticketingTargetPlacement, setTicketingTargetPlacement] = React.useState<any>(null);
  const [ticketingTargetApplicantName, setTicketingTargetApplicantName] = React.useState<string>("");
  const [ticketingInitialTab, setTicketingInitialTab] = React.useState<"ticket" | "reschedule" | "medical2">("ticket");

  // Sync stage filter if URL parameter changes
  React.useEffect(() => {
    if (urlFilter) {
      setSelectedStage(urlFilter.trim());
      setCurrentPage(1);
    }
  }, [urlFilter]);

  // Modal State for Assign Employee
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [assignTargetIds, setAssignTargetIds] = React.useState<string[]>([]);
  const [assignTargetNames, setAssignTargetNames] = React.useState<string[]>([]);

  const { data: applicants = [], isLoading } = useQuery<V2ApplicantDetails[]>({
    queryKey: ["applicants"],
    queryFn: () => listApplicantsV2(),
    enabled: Boolean(authUser),
  });

  // Join active-placement derived fields onto each applicant row.
  const { data: placementsData = [] } = useQuery({
    queryKey: ["applicants-placement-join"],
    queryFn: () => listPlacementsV2(),
    enabled: Boolean(authUser),
    staleTime: 30000,
    retry: false,
  });

  const { data: clearanceStepsData = [] } = useQuery({
    queryKey: ["dashboard-clearance-steps"],
    queryFn: () => listMyClearanceStepsV2(),
    enabled: Boolean(authUser),
    staleTime: 30000,
    retry: false,
  });

  // Inline CV generation mutation — called per-row from action button
  const generateCvMutation = useMutation({
    mutationFn: (applicantName: string) => {
      setGeneratingCvFor(applicantName);
      return generateCvV2(applicantName);
    },
    onSuccess: (data, applicantName) => {
      // Optimistically mark this applicant as CV-generated so "View CV" appears immediately
      setCvGeneratedSet((prev) => new Set(prev).add(applicantName));
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      toast.success("CV Generated Successfully", {
        description: data?.message || "Official bilateral CV compiled and generated successfully.",
      });
      setGeneratingCvFor(null);
    },
    onError: (err: Error) => {
      toast.error("CV Generation Failed", {
        description: err.message || "Could not generate CV. Please try again.",
      });
      setGeneratingCvFor(null);
    },
  });

  // Inline Register Applicant mutation (Draft -> Registered)
  const [registeringApplicant, setRegisteringApplicant] = React.useState<string | null>(null);
  const registerApplicantMutation = useMutation({
    mutationFn: async (applicantName: string) => {
      setRegisteringApplicant(applicantName);
      return registerApplicantV2(applicantName);
    },
    onSuccess: (data, applicantName) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      toast.success("Applicant Registered Successfully", {
        description: data?.message || `${applicantName} has been transitioned to Registered.`,
      });
      setRegisteringApplicant(null);
    },
    onError: (err: Error) => {
      toast.error("Registration Failed", {
        description: err.message || "Could not register applicant.",
      });
      setRegisteringApplicant(null);
    },
  });

  // Inline Medical Screening mutation — records medical result on the active placement
  const recordMedicalMutation = useMutation({
    mutationFn: async () => {
      if (!med1Status) throw new Error("Medical fitness status is required.");
      if (!med1Date) throw new Error("Date of medical examination is required.");
      if (!medicalTargetPlacementName) throw new Error("No active placement found.");
      await recordSelectedMedicalResultV2(
        medicalTargetPlacementName,
        med1Status,
        med1Date,
        med1Expiry || undefined
      );
    },
    onSuccess: () => {
      setIsMedicalModalOpen(false);
      setMed1Date("");
      setMed1Expiry("");
      setMed1Status("FIT");
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(`Medical screening recorded as ${med1Status} for ${medicalTargetApplicantName}.`);
    },
    onError: (err: Error) => {
      toast.error("Failed to Record Medical Result", { description: err.message });
    },
  });

  // Inline Advance to Processing mutation
  const advanceToProcessingMutation = useMutation({
    mutationFn: async (placementName: string) => {
      return advancePlacementV2(placementName, "Processing");
    },
    onSuccess: (_data, placementName) => {
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Placement advanced to Processing.", {
        description: `Placement ${placementName} is now in the Processing stage.`,
      });
    },
    onError: (err: Error) => {
      toast.error("Advance to Processing Failed", { description: err.message });
    },
  });

  // Cancel Applicant modal & mutation
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelTargetApplicant, setCancelTargetApplicant] = React.useState<any | null>(null);
  const [cancelRemarks, setCancelRemarks] = React.useState("");
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelTargetApplicant) throw new Error("No applicant selected");
      return cancelApplicantV2(cancelTargetApplicant.name, cancelRemarks || "Administrative cancellation");
    },
    onSuccess: (data) => {
      setIsCancelModalOpen(false);
      setCancelRemarks("");
      setCancelTargetApplicant(null);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      toast.warning(data?.message || "Applicant process cancelled.");
    },
    onError: (err: Error) => toast.error("Cancellation failed", { description: err.message }),
  });

  // Restart Applicant modal & mutation
  const [isRestartModalOpen, setIsRestartModalOpen] = React.useState(false);
  const [restartTargetApplicant, setRestartTargetApplicant] = React.useState<any | null>(null);
  const [restartTargetStatus, setRestartTargetStatus] = React.useState<"Draft" | "Registered">("Draft");
  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!restartTargetApplicant) throw new Error("No applicant selected");
      return restartApplicantV2(restartTargetApplicant.name, restartTargetStatus);
    },
    onSuccess: (data) => {
      setIsRestartModalOpen(false);
      setRestartTargetApplicant(null);
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
      toast.success(data?.message || `Applicant restarted to ${restartTargetStatus}.`);
    },
    onError: (err: Error) => toast.error("Restart failed", { description: err.message }),
  });

  // Build per-placement clearance step map:
  // placementName → { teshir, injaz, wakala, embassy }
  const clearanceByPlacement = React.useMemo(() => {
    const map = new Map<string, {
      teshir?: any;
      injaz?: any;
      wakala?: any;
      embassy?: any;
    }>();

    for (const step of clearanceStepsData) {
      if (!step.placement) continue;
      const plcKey = String(step.placement).toLowerCase().trim();
      if (!map.has(plcKey)) map.set(plcKey, {});
      const entry = map.get(plcKey)!;
      const type = String(step.step_type || step.step_name || "").toLowerCase();

      if (type.includes("teshir") || type.includes("te'shir") || type.includes("te shir")) {
        entry.teshir = step;
      } else if (type.includes("injaz")) {
        entry.injaz = step;
      } else if (type.includes("wakala") || type.includes("wokala") || type.includes("wakeel")) {
        entry.wakala = step;
      } else if (type.includes("embassy") || type.includes("sefareta")) {
        entry.embassy = step;
      }
    }
    return map;
  }, [clearanceStepsData]);

  const clearedPlacementNames = React.useMemo(() => {
    const doneStatuses = new Set(["complete", "issued", "stamped"]);
    const stepsByPlc = new Map<string, Array<any>>();
    for (const s of clearanceStepsData) {
      if (!s.placement) continue;
      if (!stepsByPlc.has(s.placement)) stepsByPlc.set(s.placement, []);
      stepsByPlc.get(s.placement)!.push(s);
    }
    const set = new Set<string>();
    for (const [plcName, steps] of stepsByPlc.entries()) {
      if (steps.length > 0 && steps.every((s) => doneStatuses.has(String(s.status || "").toLowerCase()))) {
        set.add(plcName);
      }
    }
    return set;
  }, [clearanceStepsData]);

  // Build placement map for quick lookup in row rendering (name → placement record)
  const placementByName = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of placementsData) {
      if (p.name) m.set(String(p.name).toLowerCase().trim(), p);
    }
    return m;
  }, [placementsData]);

  const applicantRows = React.useMemo(() => {
    if (placementsData.length === 0) return applicants;
    const byApplicant = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const p of placementsData) {
      if (String(p.status) === "Cancelled") continue;
      if (p.applicant) byApplicant.set(String(p.applicant).toLowerCase().trim(), p);
      if (p.name) byName.set(String(p.name).toLowerCase().trim(), p);
    }
    return applicants.map((applicant) => {
      let plc =
        byApplicant.get(String(applicant.name || "").toLowerCase().trim()) ||
        byApplicant.get(String((applicant as any).active_placement || "").toLowerCase().trim()) ||
        byName.get(String((applicant as any).active_placement || "").toLowerCase().trim());
      if (plc && (applicant as any).active_placement) {
        const preferred = byName.get(String((applicant as any).active_placement).toLowerCase().trim());
        if (preferred) plc = preferred;
      }
      if (!plc) return applicant;
      const copy = { ...applicant } as any;
      const mergeKeys = [
        ["visa_number", "visa_number"],
        ["contract_number", "contract_number"],
        ["contract_signed_date", "contract_signed_date"],
        ["employer_name", "employer_name"],
        ["employer_national_id", "employer_national_id"],
        ["sponsor_name", "sponsor_name"],
        ["sponsor_civil_id", "sponsor_civil_id"],
        ["medical_selected_status", "medical_selected_status"],
        ["medical_selected_examination_date", "medical_selected_examination_date"],
        ["medical_selected_expiry_date", "medical_selected_expiry_date"],
        ["contract_file_url", "contract_file_url"],
      ] as const;
      for (const [src, dst] of mergeKeys) {
        if ((plc as any)[src] && !(copy as any)[dst]) (copy as any)[dst] = (plc as any)[src];
      }
      if (!copy.sponsor_name && (copy.employer_name || plc.employer_name)) {
        copy.sponsor_name = copy.employer_name || plc.employer_name;
      }
      if (!copy.employer_name && (copy.sponsor_name || plc.sponsor_name)) {
        copy.employer_name = copy.sponsor_name || plc.sponsor_name;
      }
      if (!copy.contract_number && (plc.contract_number || plc.contract_no)) {
        copy.contract_number = plc.contract_number || plc.contract_no;
      }
      if (!copy.visa_number && (plc.visa_number || plc.visa_no)) {
        copy.visa_number = plc.visa_number || plc.visa_no;
      }
      const derivedStage = resolveApplicantStage(applicant, plc);
      copy.status = derivedStage;
      copy.applicant_state = derivedStage;
      copy.is_cleared = clearedPlacementNames.has(plc.name);
      // Store the active placement name so we can look up clearance steps per row
      copy._activePlacementName = plc.name;
      return copy;
    });
  }, [applicants, placementsData, clearedPlacementNames]);

  // Filtered & searched data
  const filteredApplicants = React.useMemo(() => {
    return applicantRows.filter((applicant) => {
      const currentStatus = applicant.status || applicant.applicant_state || "Draft";
      let matchesStage = false;
      const stageNorm = selectedStage.trim().toLowerCase();

      if (corridorRestriction) {
        const dest = (applicant.destination_country || "").toLowerCase();
        if (corridorRestriction === "saudi" && !dest.includes("saudi") && !dest.includes("ksa")) return false;
        if (corridorRestriction === "kuwait" && !dest.includes("kuwait")) return false;
      }

      if (stageNorm === "all" || !stageNorm) {
        matchesStage = true;
      } else if (stageNorm === "in progress") {
        matchesStage =
          currentStatus !== "Draft" &&
          currentStatus !== "Departed" &&
          currentStatus !== "Cancelled";
      } else if (
        stageNorm === "completed" ||
        stageNorm === "completed / cleared" ||
        stageNorm === "completed (but not departed)"
      ) {
        matchesStage =
          currentStatus !== "Departed" &&
          currentStatus !== "Cancelled" &&
          (currentStatus === "Stamped" ||
            currentStatus === "Ticketed" ||
            Boolean((applicant as any).ticket_number) ||
            Boolean((applicant as any).is_cleared));
      } else if (
        stageNorm === "cv ready" ||
        stageNorm === "cv generated" ||
        stageNorm === "waiting to be selected"
      ) {
        matchesStage =
          currentStatus === "CV Generated" ||
          currentStatus === "Registered" ||
          currentStatus === "Waiting to be Selected";
      } else if (stageNorm === "parallel streams" || stageNorm === "processing") {
        matchesStage = currentStatus === "Processing";
      } else if (stageNorm === "visa issued" || stageNorm === "stamped") {
        matchesStage = currentStatus === "Stamped";
      } else if (stageNorm === "flight ticket" || stageNorm === "ticketed") {
        matchesStage = currentStatus === "Ticketed";
      } else if (stageNorm === "deployed" || stageNorm === "departed") {
        matchesStage = currentStatus === "Departed";
      } else {
        matchesStage = currentStatus.toLowerCase() === stageNorm;
      }

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        applicant.name?.toLowerCase().includes(query) ||
        applicant.full_name?.toLowerCase().includes(query) ||
        applicant.passport_number?.toLowerCase().includes(query) ||
        applicant.phone_number?.toLowerCase().includes(query) ||
        applicant.city?.toLowerCase().includes(query);

      return matchesStage && matchesSearch;
    });
  }, [applicantRows, selectedStage, searchQuery, corridorRestriction]);

  // Dynamic live stage count summary for filter dropdown
  const stageCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      All: applicantRows.length,
      Draft: 0,
      Registered: 0,
      "CV Generated": 0,
      Selected: 0,
      Processing: 0,
      Stamped: 0,
      Ticketed: 0,
      Departed: 0,
      InProgress: 0,
      Completed: 0,
      Cancelled: 0,
    };

    for (const a of applicantRows) {
      const s = String(a.status || a.applicant_state || "Draft");
      if (counts[s] !== undefined) counts[s]++;
      if (s !== "Draft" && s !== "Departed" && s !== "Cancelled") counts.InProgress++;
      if (
        s !== "Departed" &&
        s !== "Cancelled" &&
        (s === "Stamped" || s === "Ticketed" || Boolean((a as any).is_cleared))
      ) {
        counts.Completed++;
      }
    }

    return counts;
  }, [applicantRows]);

  // Paginated slice
  const totalPages = Math.ceil(filteredApplicants.length / pageSize) || 1;
  const paginatedApplicants = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplicants.slice(start, start + pageSize);
  }, [filteredApplicants, currentPage, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(paginatedApplicants.map((a) => a.name)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleToggleRow = (name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(selectedRows);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedRows(next);
  };

  const handleRowClick = (name: string) => {
    router.push(`/applicants/${encodeURIComponent(name)}`);
  };

  const handleBatchAssign = () => {
    const ids = Array.from(selectedRows);
    const selectedApplicants = applicantRows.filter((a) => ids.includes(a.name));

    const nonSelectedCandidates = selectedApplicants.filter(
      (a) => (a.status || a.applicant_state) !== "Selected"
    );

    if (nonSelectedCandidates.length > 0) {
      const invalidNames = nonSelectedCandidates
        .map((a) => `${a.full_name || a.name} (${a.status || a.applicant_state || "Draft"})`)
        .slice(0, 3)
        .join(", ");

      toast.error("Cannot Assign Employee: Stage Ineligible", {
        description: `Of the applicants selected, one or more have not reached the 'Selected' stage (${invalidNames}). Only candidates on 'Selected' stage can be assigned processing staff.`,
        duration: 6000,
      });
      return;
    }

    const names = selectedApplicants.map((a) => a.full_name || a.name);
    setAssignTargetIds(ids);
    setAssignTargetNames(names);
    setIsAssignModalOpen(true);
  };

  const handleSingleAssign = (applicant: V2ApplicantDetails, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentStatus = applicant.status || applicant.applicant_state;
    if (currentStatus !== "Selected") {
      toast.error("Cannot Assign Employee", {
        description: `Applicant is currently in '${currentStatus}' stage. Assignment is only available in 'Selected' stage.`,
      });
      return;
    }
    setAssignTargetIds([applicant.name]);
    setAssignTargetNames([applicant.full_name || applicant.name]);
    setIsAssignModalOpen(true);
  };

  // Selected counts breakdown
  const selectedApplicantsList = applicantRows.filter((a) => selectedRows.has(a.name));
  const selectedStageCount = selectedApplicantsList.filter((a) => a.applicant_state === "Selected").length;
  const hasIneligibleSelected = selectedRows.size > 0 && selectedStageCount < selectedRows.size;

  // Global offset for row number column (accounts for pagination)
  const rowOffset = (currentPage - 1) * pageSize;

  return (
    <div className="space-y-4">
      {/* Floating Batch Action Banner when items are selected */}
      {selectedRows.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-900 dark:bg-emerald-950 text-white p-3.5 shadow-md border border-emerald-800 dark:border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950">
              {selectedRows.size}
            </span>
            <div>
              <p className="text-xs font-semibold">
                {selectedRows.size} applicant{selectedRows.size > 1 ? "s" : ""} selected
              </p>
              <p className="text-[11px] text-emerald-200">
                {selectedStageCount} in &quot;Selected&quot; stage •{" "}
                {selectedRows.size - selectedStageCount} in other stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              variant="outline"
              className="text-xs border-emerald-700 text-emerald-100 hover:bg-emerald-800 bg-emerald-900/40"
            >
              Clear Selection
            </Button>
            {can("manageUsers") && (
              <Button
                size="sm"
                onClick={handleBatchAssign}
                className={`text-xs font-bold shadow-xs cursor-pointer ${
                  hasIneligibleSelected
                    ? "bg-amber-500 hover:bg-amber-400 text-amber-950"
                    : "bg-emerald-400 hover:bg-emerald-300 text-emerald-950"
                }`}
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Assign Staff ({selectedRows.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header Controls: Search, Stage Filter */}
      <div data-tour="applicants-filter-bar" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applicant, passport, phone, city..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="w-48 sm:w-56">
            <SimpleSelect
              value={selectedStage}
              onValueChange={(val) => {
                setSelectedStage(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: `All Stages (${stageCounts.All})` },
                { value: "Draft", label: `Draft (${stageCounts.Draft})` },
                { value: "Registered", label: `Registered (${stageCounts.Registered})` },
                { value: "CV Generated", label: `CV Generated (${stageCounts["CV Generated"]})` },
                { value: "Selected", label: `Selected (${stageCounts.Selected})` },
                { value: "Processing", label: `Processing (${stageCounts.Processing})` },
                { value: "Stamped", label: `Stamped (${stageCounts.Stamped})` },
                { value: "Ticketed", label: `Ticketed (${stageCounts.Ticketed})` },
                { value: "Departed", label: `Departed (${stageCounts.Departed})` },
                { value: "In Progress", label: `In Progress (${stageCounts.InProgress})` },
                { value: "Completed", label: `Completed (but not departed) (${stageCounts.Completed})` },
                { value: "Cancelled", label: `Cancelled (${stageCounts.Cancelled})` },
              ]}
              triggerClassName="h-9.5 rounded-lg border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] text-xs font-semibold"
              aria-label="Filter by Stage"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div data-tour="applicants-table" className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
        <div className="w-full max-w-full min-w-0 overflow-x-auto md:overflow-x-clip overflow-y-auto max-h-[calc(100vh-270px)] min-h-[320px] touch-pan-x">
          {/*
            Column order:
            ✓ (checkbox) | No | Name (sticky) | Passport | Stage Status | Contract Date | Contract No |
            Medical Status | Exam Date | Exam Remaining | Te'shir | Injaz | Wokala Status |
            Embassy | Embassy Expire Date | Actions
            Total: 16 columns
          */}
          <table className="w-full min-w-[960px] md:min-w-0 text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30 border-b border-slate-200 dark:border-[#272730] bg-slate-100 dark:bg-[#181820] text-slate-700 dark:text-zinc-300 uppercase tracking-wider font-bold text-[10px] xl:text-[11px] leading-tight">
              <tr>
                {/* Col 1: Checkbox only — no header text */}
                <th className="px-2 py-1.5 w-7 bg-slate-100 dark:bg-[#181820] text-center border-r border-slate-200 dark:border-[#272730]">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                    checked={
                      paginatedApplicants.length > 0 &&
                      paginatedApplicants.every((a) => selectedRows.has(a.name))
                    }
                    onChange={handleSelectAll}
                  />
                </th>

                {/* Col 2: Row number */}
                <th className="px-1.5 py-1.5 w-9 text-center bg-slate-100 dark:bg-[#181820] border-r border-slate-200 dark:border-[#272730]">No</th>

                {/* Col 3: Name — STICKY LEFT-0 ON DESKTOP ONLY */}
                <th className="px-2 py-1.5 md:sticky md:left-0 md:z-30 bg-slate-100 dark:bg-[#181820] text-slate-700 dark:text-zinc-300 font-bold md:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)] border-r border-slate-300 dark:border-[#272730] whitespace-nowrap">
                  Full Name
                </th>

                {/* Col 4: Passport */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Passport No.</th>

                {/* Col 5: Stage Status */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Stage Status</th>

                {/* Col 6: Contract Date */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Contract Date</th>

                {/* Col 7: Contract No */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Contract No.</th>

                {/* Col 8: Medical Status */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Medical Status</th>

                {/* Col 9: Exam Date */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Exam Date</th>

                {/* Col 10: Exam Remaining */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Exam Remaining</th>

                {/* Col 11: Te'shir */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Te&apos;shir</th>

                {/* Col 12: Injaz */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Injaz</th>

                {/* Col 13: Wokala Status */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Wokala Status</th>

                {/* Col 14: Embassy */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Embassy</th>

                {/* Col 15: Embassy Expire Date */}
                <th className="px-1.5 py-1.5 whitespace-normal break-words border-r border-slate-200 dark:border-[#272730]">Embassy Exp. Date</th>

                {/* Col 16: Actions */}
                <th className="px-2 py-1.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    Loading applicants...
                  </td>
                </tr>
              ) : paginatedApplicants.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    No applicants found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedApplicants.map((applicant, idx) => {
                  const stage = applicant.status || applicant.applicant_state || "Draft";
                  const badge = getStageBadgeVariant(stage);
                  const isSelected = selectedRows.has(applicant.name);
                  const isGeneratingCv = generatingCvFor === applicant.name;

                  // Placement-merged fields
                  const contractDate =
                    (applicant as any).contract_signed_date ||
                    (applicant as any).contract_date ||
                    null;
                  const contractNo =
                    (applicant as any).contract_number ||
                    (applicant as any).contract_no ||
                    null;
                  const contractFileUrl =
                    (applicant as any).contract_file_url ||
                    (applicant as any).contract_doc_url ||
                    null;
                  const hasContract = Boolean(contractNo || contractFileUrl);

                  const medicalStatus = (applicant as any).medical_selected_status || null;
                  const examDate = (applicant as any).medical_selected_examination_date || null;
                  const examExpiry = (applicant as any).medical_selected_expiry_date || null;

                  // Clearance steps for this applicant's active placement
                  const plcName = String(
                    (applicant as any)._activePlacementName ||
                    (applicant as any).active_placement ||
                    ""
                  ).toLowerCase().trim();
                  const clrSteps = plcName ? (clearanceByPlacement.get(plcName) || {}) : {};

                  const teshirStatus = (clrSteps as any).teshir?.status || null;
                  const injazStatus = (clrSteps as any).injaz?.status || null;
                  const wakalaStatus =
                    (clrSteps as any).wakala?.wakala_status ||
                    (clrSteps as any).wakala?.status ||
                    null;
                  const embassyStatus = (clrSteps as any).embassy?.status || null;
                  const embassyExpiry =
                    (clrSteps as any).embassy?.date_completed ||
                    (clrSteps as any).embassy?.appointment_date ||
                    null;

                  // Medical status colour
                  const medicalClass =
                    medicalStatus === "FIT"
                      ? "text-emerald-700 dark:text-emerald-400 font-bold"
                      : medicalStatus === "UNFIT"
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : "text-slate-400";

                  return (
                    <tr
                      key={applicant.name}
                      onClick={() => handleRowClick(applicant.name)}
                      className={cn(
                        "group cursor-pointer transition-colors border-b border-slate-100 dark:border-[#1e1e26] hover:bg-slate-50 dark:hover:bg-[#16161c]",
                        isSelected ? "bg-emerald-50 dark:bg-[#183428]" : "even:bg-slate-50/40 dark:even:bg-[#131317]"
                      )}
                      title="Click to view applicant details"
                    >
                      {/* Col 1: Checkbox — separate from No, stops row-click propagation */}
                      <td
                        className="px-2.5 py-2.5 text-center border-r border-slate-100 dark:border-[#1e1e26]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleRow(applicant.name, e as unknown as React.MouseEvent)}
                        />
                      </td>

                      {/* Col 2: Row number */}
                      <td className="px-2 py-2.5 text-center font-mono font-semibold text-slate-500 dark:text-slate-400 text-[11px] border-r border-slate-100 dark:border-[#1e1e26]">
                        {rowOffset + idx + 1}
                      </td>

                      {/* Col 3: Name — STICKY LEFT-0 ON DESKTOP ONLY */}
                      <td
                        className={cn(
                          "px-2 py-1.5 md:sticky md:left-0 md:z-10 md:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.18)] border-r border-slate-300 dark:border-[#272730] whitespace-nowrap",
                          isSelected
                            ? "!bg-emerald-100 dark:!bg-[#183428]"
                            : "bg-white group-even:bg-slate-50 dark:bg-[#121216] dark:group-even:bg-[#16161c] group-hover:!bg-slate-100 dark:group-hover:!bg-[#1c2433]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {applicant.first_name?.[0] || "A"}
                          </div>
                          <div className="min-w-0 flex items-center">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase truncate max-w-[180px]">
                              {applicant.full_name ||
                                `${applicant.first_name} ${applicant.last_name}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Col 4: Passport No */}
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        {applicant.passport_number || "—"}
                      </td>

                      {/* Col 5: Stage Status */}
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 dark:border-[#1e1e26]">
                        <Badge variant={badge.variant} dotColor={badge.dotColor} className={cn("py-0.5 px-1.5 text-[10px]", badge.className)}>
                          {stage}
                        </Badge>
                      </td>

                      {/* Contract Date */}
                      <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        {contractDate ? (
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {new Date(contractDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contract No */}
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        {contractNo ? (
                          <span className="font-semibold text-emerald-900 dark:text-emerald-400">
                            {contractNo}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Medical Status */}
                      <td className="px-2 py-1.5 whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        <span className={medicalClass}>
                          {medicalStatus || "—"}
                        </span>
                      </td>

                      {/* Exam Date */}
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        {examDate
                          ? new Date(examDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Exam Remaining */}
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap text-xs border-r border-slate-100 dark:border-[#1e1e26]">
                        {examExpiry ? (
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              new Date(examExpiry) > new Date()
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {daysRemaining(examExpiry)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Te'shir */}
                      <td className={cn("px-2 py-1.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-[#1e1e26]", stepStatusClass(teshirStatus))}>
                        {stepStatusLabel(teshirStatus)}
                      </td>

                      {/* Injaz */}
                      <td className={cn("px-2 py-1.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-[#1e1e26]", stepStatusClass(injazStatus))}>
                        {stepStatusLabel(injazStatus)}
                      </td>

                      {/* Wokala Status */}
                      <td className={cn("px-2 py-1.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-[#1e1e26]", stepStatusClass(wakalaStatus))}>
                        {stepStatusLabel(wakalaStatus)}
                      </td>

                      {/* Embassy */}
                      <td className={cn("px-2 py-1.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-[#1e1e26]", stepStatusClass(embassyStatus))}>
                        {stepStatusLabel(embassyStatus)}
                      </td>

                      {/* Embassy Expire Date */}
                      <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-[#1e1e26]">
                        {embassyExpiry
                          ? new Date(embassyExpiry).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-2 py-1.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 flex-nowrap">
                          {/* Stage: Draft — Register Applicant */}
                          {stage === "Draft" && (
                            <button
                              type="button"
                              disabled={registerApplicantMutation.isPending && registeringApplicant === applicant.name}
                              onClick={() => registerApplicantMutation.mutate(applicant.name)}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Register this applicant"
                            >
                              {registerApplicantMutation.isPending && registeringApplicant === applicant.name ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                              )}
                              <span>Register</span>
                            </button>
                          )}

                          {/* Generate CV — shown for Registered stage while CV not yet generated */}
                          {stage === "Registered" && !cvGeneratedSet.has(applicant.name) && can("generateCv") && (
                            <button
                              type="button"
                              disabled={isGeneratingCv || generateCvMutation.isPending || applicant.medical_status === "UNFIT"}
                              onClick={() => {
                                if (applicant.medical_status === "UNFIT") {
                                  toast.error("Medically UNFIT", {
                                    description: `${applicant.full_name || applicant.name} is medically UNFIT -- a CV cannot be generated.`,
                                  });
                                  return;
                                }
                                generateCvMutation.mutate(applicant.name);
                              }}
                              className={
                                applicant.medical_status === "UNFIT"
                                  ? "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-slate-400 dark:text-zinc-600 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-not-allowed"
                                  : "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                              }
                              title={applicant.medical_status === "UNFIT" ? "Medically UNFIT -- cannot generate CV" : "Generate bilateral recruitment CV"}
                            >
                              {isGeneratingCv ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
                              ) : (
                                <FileText className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                              )}
                              <span>{isGeneratingCv ? "Generating..." : applicant.medical_status === "UNFIT" ? "UNFIT" : "Generate CV"}</span>
                            </button>
                          )}

                          {/* Record Medical — Selected stage, opens inline modal */}
                          {stage === "Selected" && (applicant as any)._activePlacementName && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMedicalTargetPlacementName((applicant as any)._activePlacementName);
                                setMedicalTargetApplicantName(applicant.full_name || applicant.name);
                                setMed1Status(
                                  (medicalStatus === "FIT" || medicalStatus === "UNFIT") ? medicalStatus : "FIT"
                                );
                                setMed1Date(examDate || "");
                                setMed1Expiry("");
                                setIsMedicalModalOpen(true);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold border transition cursor-pointer shadow-2xs",
                                medicalStatus === "FIT"
                                  ? "text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700"
                                  : "text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border-rose-300 dark:border-rose-700"
                              )}
                              title={`Medical status: ${medicalStatus || "Not recorded — click to record"}`}
                            >
                              <HeartPulse className={cn("h-3 w-3", medicalStatus === "FIT" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")} />
                              <span>{medicalStatus || "Medical"}</span>
                            </button>
                          )}

                          {/* Advance to Processing — Selected stage with contract + FIT medical */}
                          {stage === "Selected" && (applicant as any)._activePlacementName && hasContract && medicalStatus === "FIT" && (
                            <button
                              type="button"
                              disabled={advanceToProcessingMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                advanceToProcessingMutation.mutate((applicant as any)._activePlacementName);
                              }}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-blue-950 dark:text-blue-200 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-700 transition cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Advance this placement to Processing stage"
                            >
                              {advanceToProcessingMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                              ) : (
                                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              )}
                              <span>Processing</span>
                            </button>
                          )}

                          {/* Stage 7: Stamped — Book Flight Ticket */}
                          {stage === "Stamped" && (applicant as any)._activePlacementName && (
                            <button
                              type="button"
                              onClick={() => {
                                const plc = (applicant as any)._activePlacementName
                                  ? placementByName.get(String((applicant as any)._activePlacementName).toLowerCase().trim())
                                  : null;
                                setTicketingTargetPlacement(plc || null);
                                setTicketingTargetApplicantName(applicant.full_name || applicant.name);
                                setTicketingInitialTab("ticket");
                                setIsTicketingModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-teal-950 dark:text-teal-200 bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/80 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-700 transition cursor-pointer shadow-2xs"
                              title="Book Flight Ticket"
                            >
                              <Ticket className="h-3 w-3 text-teal-700 dark:text-teal-400" />
                              <span>Book Ticket</span>
                            </button>
                          )}

                          {/* Stage 8: Ticketed — Medical 2 & Depart */}
                          {stage === "Ticketed" && (applicant as any)._activePlacementName && (
                            <button
                              type="button"
                              onClick={() => {
                                const plc = (applicant as any)._activePlacementName
                                  ? placementByName.get(String((applicant as any)._activePlacementName).toLowerCase().trim())
                                  : null;
                                setTicketingTargetPlacement(plc || null);
                                setTicketingTargetApplicantName(applicant.full_name || applicant.name);
                                setTicketingInitialTab("medical2");
                                setIsTicketingModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-bold text-purple-950 dark:text-purple-200 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-700 transition cursor-pointer shadow-2xs"
                              title="Verify Pre-Departure Medical 2 and finalize departure"
                            >
                              <HeartPulse className="h-3 w-3 text-purple-700 dark:text-purple-400" />
                              <span>Depart</span>
                            </button>
                          )}

                          {/* Three Vertical Dots Action Menu */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center h-6 w-6 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252530] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
                                title="More actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161c] rounded-lg z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-0.5 text-xs">
                                {/* View CV */}
                                {(cvGeneratedSet.has(applicant.name) || !["Draft", "Registered", "Cancelled"].includes(stage) || applicant.cv_attachment || applicant.cv_file) && (
                                  <Link
                                    href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 transition"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                    <span>View CV</span>
                                  </Link>
                                )}

                                {/* View Contract / Contract Doc */}
                                {["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(stage) && (
                                  <Link
                                    href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>{hasContract ? "View Contract" : "Contract Doc"}</span>
                                  </Link>
                                )}

                                {/* Assign Staff */}
                                {can("manageUsers") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSingleAssign(applicant, e);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition"
                                  >
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Assign Staff</span>
                                  </button>
                                )}

                                {/* Reschedule Flight */}
                                {stage === "Ticketed" && (applicant as any)._activePlacementName && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const plc = (applicant as any)._activePlacementName
                                        ? placementByName.get(String((applicant as any)._activePlacementName).toLowerCase().trim())
                                        : null;
                                      setTicketingTargetPlacement(plc || null);
                                      setTicketingTargetApplicantName(applicant.full_name || applicant.name);
                                      setTicketingInitialTab("reschedule");
                                      setIsTicketingModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 transition"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
                                    <span>Reschedule Flight</span>
                                  </button>
                                )}

                                {/* Send to Extension */}
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await sendApplicantToExtension(applicant as any);
                                      if (res.success) {
                                        toast.success(`Candidate ${applicant.name} sent to extension!`);
                                      } else {
                                        toast.error(res.error || "Extension communication failed.");
                                      }
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to communicate with extension.");
                                    }
                                  }}
                                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition"
                                >
                                  <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Send to Extension</span>
                                </button>

                                <div className="h-px bg-slate-100 dark:bg-[#252530] my-1" />

                                {/* Cancel Process / Restore Applicant */}
                                {applicant.applicant_state === "Cancelled" || stage === "Cancelled" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRestartTargetApplicant(applicant);
                                      setRestartTargetStatus("Draft");
                                      setIsRestartModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Restore Applicant</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancelTargetApplicant(applicant);
                                      setCancelRemarks("");
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  >
                                    <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                    <span>Cancel Process</span>
                                  </button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {filteredApplicants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, filteredApplicants.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-900 dark:text-white">{filteredApplicants.length}</span> entries
            </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mr-1">
              Show:
            </span>
            {[10, 25, 50, 100].map((size) => {
              const isCurrent = pageSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-6 px-2 text-xs font-bold rounded transition-all border",
                    isCurrent
                      ? "bg-emerald-900 dark:bg-emerald-700 text-white border-emerald-900 dark:border-emerald-700 shadow-xs"
                      : "bg-white dark:bg-[#1a1a20] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#25252e]"
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2 text-xs border-slate-200 dark:border-slate-700"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Assign Employee Modal */}
      <AssignEmployeeModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        applicantIds={assignTargetIds}
        applicantNames={assignTargetNames}
        destinationCountry={
          assignTargetIds.length === 1
            ? applicants.find((a) => a.name === assignTargetIds[0])?.destination_country
            : undefined
        }
        onSuccess={() => {
          setSelectedRows(new Set());
        }}
      />

      {/* ───────────────────────────────────────────────────── */}
      {/* Medical Screening Inline Modal                                  */}
      {/* Opened from the applicant table action column (Selected stage)  */}
      {/* ───────────────────────────────────────────────────── */}
      <Dialog open={isMedicalModalOpen} onOpenChange={(open) => { if (!open) setIsMedicalModalOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              Record Medical Screening
            </DialogTitle>
            <DialogDescription className="text-xs">
              {medicalTargetApplicantName} — Placement: {medicalTargetPlacementName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fitness Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Medical Fitness</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMed1Status("FIT")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                    med1Status === "FIT"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-400"
                  )}
                >
                  FIT
                </button>
                <button
                  type="button"
                  onClick={() => setMed1Status("UNFIT")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                    med1Status === "UNFIT"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-rose-400"
                  )}
                >
                  UNFIT
                </button>
              </div>
            </div>

            {/* Exam Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Examination Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={med1Date}
                onChange={(e) => setMed1Date(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a22] text-xs text-slate-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Expiry Date (optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Medical Certificate Expiry <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={med1Expiry}
                onChange={(e) => setMed1Expiry(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a22] text-xs text-slate-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setIsMedicalModalOpen(false)}
              disabled={recordMedicalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
              disabled={recordMedicalMutation.isPending || !med1Date}
              onClick={() => recordMedicalMutation.mutate()}
            >
              {recordMedicalMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving...</>
              ) : (
                <><HeartPulse className="h-3.5 w-3.5 mr-1.5" />Save Result</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticketing & Departure Modal */}
      <TicketingDepartureModal
        isOpen={isTicketingModalOpen}
        onClose={() => setIsTicketingModalOpen(false)}
        placement={ticketingTargetPlacement}
        applicantName={ticketingTargetApplicantName}
        initialTab={ticketingInitialTab}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["applicants"] });
          queryClient.invalidateQueries({ queryKey: ["applicants-placement-join"] });
        }}
      />

      {/* Cancel Process Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={(open) => { if (!open) setIsCancelModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="h-4 w-4" />
              Cancel Applicant Process
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel the recruitment process for <strong>{cancelTargetApplicant?.full_name || cancelTargetApplicant?.name}</strong>?
              This will freeze active placements and linked clearance steps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cancellation Reason
            </label>
            <textarea
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="Enter cancellation reason (e.g. Applicant requested withdrawal, Medically unfit, etc.)"
              className="w-full h-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a22] text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Cancelling...</>
              ) : (
                <><Ban className="h-3.5 w-3.5 mr-1.5" />Confirm Cancel</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restart / Restore Applicant Modal */}
      <Dialog open={isRestartModalOpen} onOpenChange={(open) => { if (!open) setIsRestartModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <RotateCcw className="h-4 w-4" />
              Restore Cancelled Applicant
            </DialogTitle>
            <DialogDescription className="text-xs">
              Restart recruitment process for <strong>{restartTargetApplicant?.full_name || restartTargetApplicant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Restart Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRestartTargetStatus("Draft")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                  restartTargetStatus === "Draft"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-400"
                )}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setRestartTargetStatus("Registered")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                  restartTargetStatus === "Registered"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-400"
                )}
              >
                Registered
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRestartModalOpen(false)}
              disabled={restartMutation.isPending}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={restartMutation.isPending}
              onClick={() => restartMutation.mutate()}
            >
              {restartMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Restoring...</>
              ) : (
                <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Confirm Restore</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
