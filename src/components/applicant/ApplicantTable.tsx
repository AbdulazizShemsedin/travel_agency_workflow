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
} from "lucide-react";
import { V2ApplicantDetails, listApplicantsV2, listPlacementsV2, listMyClearanceStepsV2 } from "@/lib/api/v2";
import { generateCvV2 } from "@/lib/api/v2/cv";
import { recordSelectedMedicalResultV2, advancePlacementV2 } from "@/lib/api/v2/placements";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
        <div className="w-full max-w-full min-w-0 overflow-x-auto touch-pan-x">
          {/*
            Column order:
            ✓ (checkbox) | No | Name (sticky) | Passport | Stage Status | Contract Date | Contract No |
            Medical Status | Exam Date | Exam Remaining | Te'shir | Injaz | Wokala Status |
            Embassy | Embassy Expire Date | Actions
            Total: 16 columns
          */}
          <table className="w-full min-w-[1700px] text-left text-xs border-collapse">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                {/* Col 1: Checkbox only — no header text */}
                <th className="px-3 py-3.5 w-8 bg-slate-50/70 dark:bg-slate-800/60">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                    checked={
                      paginatedApplicants.length > 0 &&
                      paginatedApplicants.every((a) => selectedRows.has(a.name))
                    }
                    onChange={handleSelectAll}
                  />
                </th>

                {/* Col 2: Row number */}
                <th className="px-2 py-3.5 w-10 text-center bg-slate-50/70 dark:bg-slate-800/60">No</th>

                {/* Col 3: Name — STICKY */}
                <th className="px-4 py-3.5 sticky left-0 z-20 bg-slate-50/70 dark:bg-slate-800/60 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                  Full Name
                </th>

                {/* Col 4: Passport */}
                <th className="px-4 py-3.5 whitespace-nowrap">Passport No.</th>

                {/* Col 5: Stage Status */}
                <th className="px-4 py-3.5 whitespace-nowrap">Stage Status</th>

                {/* Col 6: Contract Date */}
                <th className="px-4 py-3.5 whitespace-nowrap">Contract Date</th>

                {/* Col 7: Contract No */}
                <th className="px-4 py-3.5 whitespace-nowrap">Contract No.</th>

                {/* Col 8: Medical Status */}
                <th className="px-4 py-3.5 whitespace-nowrap">Medical Status</th>

                {/* Col 9: Exam Date */}
                <th className="px-4 py-3.5 whitespace-nowrap">Exam Date</th>

                {/* Col 10: Exam Remaining */}
                <th className="px-4 py-3.5 whitespace-nowrap">Exam Remaining</th>

                {/* Col 11: Te'shir */}
                <th className="px-4 py-3.5 whitespace-nowrap">Te&apos;shir</th>

                {/* Col 12: Injaz */}
                <th className="px-4 py-3.5 whitespace-nowrap">Injaz</th>

                {/* Col 13: Wokala Status */}
                <th className="px-4 py-3.5 whitespace-nowrap">Wokala Status</th>

                {/* Col 14: Embassy */}
                <th className="px-4 py-3.5 whitespace-nowrap">Embassy</th>

                {/* Col 15: Embassy Expire Date */}
                <th className="px-4 py-3.5 whitespace-nowrap">Embassy Expire Date</th>

                {/* Col 16: Actions */}
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
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
                      className={`cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/70 transition-colors ${
                        isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                      }`}
                      title="Click to view applicant details"
                    >
                      {/* Col 1: Checkbox — separate from No, stops row-click propagation */}
                      <td
                        className="px-3 py-3 text-center"
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
                      <td className="px-2 py-3 text-center font-mono font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                        {rowOffset + idx + 1}
                      </td>

                      {/* Col 3: Name — STICKY */}
                      <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-[#0f172a] shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {applicant.first_name?.[0] || "A"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-slate-900 dark:text-slate-100 block uppercase truncate max-w-[160px]">
                              {applicant.full_name ||
                                `${applicant.first_name} ${applicant.last_name}`}
                            </span>
                            {applicant.phone_number ? (
                              <span className="text-[11px] text-slate-400 block">
                                {applicant.phone_number}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Col 4: Passport No */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {applicant.passport_number || "—"}
                      </td>

                      {/* Col 5: Stage Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={badge.variant} dotColor={badge.dotColor} className={badge.className}>
                          {stage}
                        </Badge>
                      </td>

                      {/* Contract Date */}
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
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
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        {contractNo ? (
                          <span className="font-semibold text-emerald-900 dark:text-emerald-400">
                            {contractNo}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Medical Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={medicalClass}>
                          {medicalStatus || "—"}
                        </span>
                      </td>

                      {/* Exam Date */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {examDate
                          ? new Date(examDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Exam Remaining */}
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        {examExpiry ? (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
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
                      <td className={cn("px-4 py-3 whitespace-nowrap text-[11px]", stepStatusClass(teshirStatus))}>
                        {stepStatusLabel(teshirStatus)}
                      </td>

                      {/* Injaz */}
                      <td className={cn("px-4 py-3 whitespace-nowrap text-[11px]", stepStatusClass(injazStatus))}>
                        {stepStatusLabel(injazStatus)}
                      </td>

                      {/* Wokala Status */}
                      <td className={cn("px-4 py-3 whitespace-nowrap text-[11px]", stepStatusClass(wakalaStatus))}>
                        {stepStatusLabel(wakalaStatus)}
                      </td>

                      {/* Embassy */}
                      <td className={cn("px-4 py-3 whitespace-nowrap text-[11px]", stepStatusClass(embassyStatus))}>
                        {stepStatusLabel(embassyStatus)}
                      </td>

                      {/* Embassy Expire Date */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
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
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View Detail */}
                          <Link
                            href={`/applicants/${encodeURIComponent(applicant.name)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-[#1a1a22] hover:bg-slate-200 dark:hover:bg-[#252530] border border-slate-200 dark:border-[#2a2a35] transition"
                            title="View Applicant Details"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>View</span>
                          </Link>

                          {/* Generate CV — shown for Registered stage while CV not yet generated */}
                          {stage === "Registered" && !cvGeneratedSet.has(applicant.name) && can("generateCv") && (
                            <button
                              type="button"
                              disabled={isGeneratingCv || generateCvMutation.isPending}
                              onClick={() => generateCvMutation.mutate(applicant.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Generate bilateral recruitment CV"
                            >
                              {isGeneratingCv ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
                              ) : (
                                <FileText className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                              )}
                              <span>{isGeneratingCv ? "Generating..." : "Generate CV"}</span>
                            </button>
                          )}

                          {/* View CV — shown once CV has been generated (stage past Registered, or optimistic after generation) */}
                          {(cvGeneratedSet.has(applicant.name) || !["Draft", "Registered", "Cancelled"].includes(stage)) && (
                            <Link
                              href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition"
                              title="View CV"
                            >
                              <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              <span>View CV</span>
                            </Link>
                          )}

                          {/* Assign Processing Employee — Selected stage */}
                          {stage === "Selected" && can("manageUsers") && (
                            <button
                              type="button"
                              onClick={(e) => handleSingleAssign(applicant, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-2xs"
                              title="Assign Staff"
                            >
                              <UserCheck className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                              <span>Assign</span>
                            </button>
                          )}

                          {/* Extract Contract Doc — Selected stage, no contract yet */}
                          {["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(stage) && !hasContract && (
                            <Link
                              href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-orange-950 dark:text-orange-200 bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/80 dark:hover:bg-orange-900 border border-orange-300 dark:border-orange-700 transition shadow-2xs"
                              title="Extract Contract Document"
                            >
                              <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                              <span>Extract Contract Doc</span>
                            </Link>
                          )}

                          {/* Contract Doc — has contract uploaded */}
                          {["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(stage) && hasContract && (
                            <Link
                              href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition"
                              title="View Contract Document"
                            >
                              <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span>Contract Doc</span>
                            </Link>
                          )}

                          {/* Record Medical — Selected stage, opens inline modal */}
                          {stage === "Selected" && (applicant as any)._activePlacementName && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMedicalTargetPlacementName((applicant as any)._activePlacementName);
                                setMedicalTargetApplicantName(applicant.full_name || applicant.name);
                                // Pre-fill from existing data if available
                                setMed1Status(
                                  (medicalStatus === "FIT" || medicalStatus === "UNFIT") ? medicalStatus : "FIT"
                                );
                                setMed1Date(examDate || "");
                                setMed1Expiry("");
                                setIsMedicalModalOpen(true);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer shadow-2xs",
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-blue-950 dark:text-blue-200 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-700 transition cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  );
}
