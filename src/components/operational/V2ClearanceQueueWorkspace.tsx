"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  Calendar,
  ExternalLink,
  Play,
  CheckCircle2,
  Send,
  Stamp,
  XCircle,
  AlertCircle,
  Clock,
  Lock,
  Loader2,
  ArrowRight,
  Globe2,
  User,
  Filter,
  UserCog,
  BellRing,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { AssignEmployeeModal } from "@/components/applicant/AssignEmployeeModal";
import { LmisFastPathModal } from "@/components/applicant/LmisFastPathModal";
import { OperationalColumn, V2ClearanceQueueRow } from "@/types/workspace";
import { OperationalTable } from "./OperationalTable";
import {
  OperationalDrawer,
  DrawerField,
  DrawerSection,
} from "./OperationalDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listMyClearanceStepsV2,
  startClearanceStepV2,
  completeClearanceStepV2,
  submitEmbassyStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
  V2ClearanceStepItem,
} from "@/lib/api/v2/clearance";
import { getCorridorStepsV2, V2CorridorStepDefinition } from "@/lib/api/v2/corridor";
import { listPlacementsV2, V2PlacementRecord } from "@/lib/api/v2/placements";
import { triggerWakalaReminderV2 } from "@/lib/api/v2/notifications";
import { uploadFileV2, parseInjazFileV2, V2ParsedInjazData } from "@/lib/api/v2/documents";
import { cn } from "@/lib/utils";

// Mapping authoritative clearance roles to step types per clearance_step.py & ROLE-PERMISSIONS-MATRIX.md
const CLEARANCE_ROLE_BY_STEP_TYPE: Record<string, string> = {
  "LMIS Clearance": "Saudi LMIS",
  "Taeshir": "Saudi Taeshir",
  "Embassy": "Saudi Embassy",
  "Kuwait LMIS": "Kuwait LMIS",
  "Telesign": "Kuwait Telesign",
  "Kuwait Embassy": "Kuwait Embassy",
};

export function V2ClearanceQueueWorkspace() {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  const [corridorFilter, setCorridorFilter] = React.useState<string>("All");
  const [selectedStepTypeFilter, setSelectedStepTypeFilter] = React.useState<string>("All");
  const [activeSheetTab, setActiveSheetTab] = React.useState<"all" | "lmis" | "taeshir" | "embassy">("all");
  const [selectedRow, setSelectedRow] = React.useState<V2ClearanceQueueRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = React.useState(false);
  const [isLmisModalOpen, setIsLmisModalOpen] = React.useState(false);

  // Form states for drawer actions
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [rejectionRemark, setRejectionRemark] = React.useState<string>("");

  // Wakala reminder & Injaz OCR state
  const [isWakalaReminding, setIsWakalaReminding] = React.useState(false);
  const [isInjazParsing, setIsInjazParsing] = React.useState(false);
  const [parsedInjaz, setParsedInjaz] = React.useState<V2ParsedInjazData | null>(null);
  const injazFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleInjazFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsInjazParsing(true);
    setParsedInjaz(null);
    try {
      const uploadRes = await uploadFileV2(file, false);
      const res = await parseInjazFileV2(uploadRes.file_url);
      setParsedInjaz(res);
      toast.success("Injaz Document Parsed", {
        description: `Extracted App #${res.injaz_application_number || "—"} and MOFA barcode.`,
      });
      if (res.injaz_application_number && !referenceNo) {
        setReferenceNo(res.injaz_application_number);
      }
    } catch (err: any) {
      toast.error("Injaz Parsing Failed", {
        description: err?.message || "Could not extract data from document.",
      });
    } finally {
      setIsInjazParsing(false);
      if (e.target) e.target.value = "";
    }
  };

  // Determine if user has administrative or manager role
  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "manager" ||
        norm === "agency admin"
      );
    });
  }, [authUser, roles]);

  // 1. Fetch Dynamic Corridor Steps for Saudi Arabia and Kuwait
  const { data: saudiCorridorSteps = [] } = useQuery<V2CorridorStepDefinition[]>({
    queryKey: ["corridor_steps", "Saudi Arabia"],
    queryFn: () => getCorridorStepsV2("Saudi Arabia"),
    enabled: Boolean(authUser),
    staleTime: 60000,
  });

  const { data: kuwaitCorridorSteps = [] } = useQuery<V2CorridorStepDefinition[]>({
    queryKey: ["corridor_steps", "Kuwait"],
    queryFn: () => getCorridorStepsV2("Kuwait"),
    enabled: Boolean(authUser),
    staleTime: 60000,
  });

  // 2. Fetch User's Role-Scoped Clearance Steps Queue
  const {
    data: rawClearanceSteps = [],
    isLoading: isQueueLoading,
    isRefetching: isQueueRefetching,
    refetch: refetchQueue,
  } = useQuery<V2ClearanceStepItem[]>({
    queryKey: ["v2_clearance_steps_queue"],
    queryFn: () => listMyClearanceStepsV2(),
    enabled: Boolean(authUser),
    staleTime: 10000,
  });

  // 3. Fetch Placements context to enrich applicant details
  const { data: rawPlacements = [] } = useQuery<V2PlacementRecord[]>({
    queryKey: ["v2_placements_for_clearance"],
    queryFn: () => listPlacementsV2(),
    enabled: Boolean(authUser),
    staleTime: 20000,
  });

  // Map placements by name for fast O(1) enrichment
  const placementMap = React.useMemo(() => {
    const map = new Map<string, V2PlacementRecord>();
    (rawPlacements || []).forEach((p) => {
      if (p.name) map.set(p.name, p);
    });
    return map;
  }, [rawPlacements]);

  // Build Enriched Clearance Rows
  const enrichedRows = React.useMemo<V2ClearanceQueueRow[]>(() => {
    return (rawClearanceSteps || []).map((step) => {
      const plc = step.placement ? placementMap.get(step.placement) : undefined;
      const destCountry =
        step.destination_country ||
        plc?.destination_country ||
        (step.step_type?.toLowerCase().includes("kuwait") || step.step_type?.toLowerCase().includes("telesign")
          ? "Kuwait"
          : "Saudi Arabia");

      return {
        name: step.name,
        step_type: step.step_type || step.step_name || "Clearance Step",
        sequence_order: step.sequence_order || 1,
        is_mandatory: step.is_mandatory !== undefined ? Number(step.is_mandatory) : 1,
        status: step.status || "Pending",
        date_started: step.date_started,
        date_completed: step.date_completed,
        completed_by: step.completed_by,
        reference_no: step.reference_no,
        amount: step.amount,
        payment_status: step.payment_status,
        rejection_remark: step.rejection_remark,

        // Placement context
        placement: step.placement || plc?.name || "—",
        destination_country: destCountry,
        contractor: step.contractor || plc?.contractor,
        contractor_name: step.contractor_name || plc?.contractor_name || "—",

        // Applicant context
        applicant: step.applicant || plc?.applicant,
        full_name: step.full_name || step.applicant_name || plc?.full_name || plc?.applicant_name || "Candidate",
        first_name: step.first_name || plc?.first_name,
        last_name: step.last_name || plc?.last_name,
        passport_number: step.passport_number || plc?.passport_number || "—",
        phone: step.phone || plc?.phone,
        gender: step.gender || plc?.gender,
      };
    });
  }, [rawClearanceSteps, placementMap]);

  // Filter rows by corridor and step type
  const filteredRows = React.useMemo<V2ClearanceQueueRow[]>(() => {
    return enrichedRows.filter((row) => {
      if (corridorFilter !== "All" && row.destination_country !== corridorFilter) {
        return false;
      }
      if (selectedStepTypeFilter !== "All" && row.step_type !== selectedStepTypeFilter) {
        return false;
      }
      // Sheet-tab filter
      if (activeSheetTab === "lmis") {
        const st = row.step_type.toLowerCase();
        if (!st.includes("lmis")) return false;
      } else if (activeSheetTab === "taeshir") {
        const st = row.step_type.toLowerCase();
        if (!st.includes("taeshir") && !st.includes("telesign")) return false;
      } else if (activeSheetTab === "embassy") {
        const st = row.step_type.toLowerCase();
        if (!st.includes("embassy")) return false;
      }
      return true;
    });
  }, [enrichedRows, corridorFilter, selectedStepTypeFilter, activeSheetTab]);

  // Dynamic Step Types available in current view
  const availableStepTypes = React.useMemo<string[]>(() => {
    const types = new Set<string>();
    if (corridorFilter === "All" || corridorFilter === "Saudi Arabia") {
      saudiCorridorSteps.forEach((s) => types.add(s.step_type));
    }
    if (corridorFilter === "All" || corridorFilter === "Kuwait") {
      kuwaitCorridorSteps.forEach((s) => types.add(s.step_type));
    }
    enrichedRows.forEach((r) => {
      if (r.step_type) types.add(r.step_type);
    });
    return Array.from(types).filter(Boolean);
  }, [corridorFilter, saudiCorridorSteps, kuwaitCorridorSteps, enrichedRows]);

  // Check if current user has permission to operate the selected step
  const canOperateSelectedStep = React.useMemo<boolean>(() => {
    if (!selectedRow) return false;
    if (isManagerOrAdmin) return true;

    const requiredRole = CLEARANCE_ROLE_BY_STEP_TYPE[selectedRow.step_type];
    if (!requiredRole) return false;

    const userRoles = Array.isArray(roles) ? roles.map((r) => String(r).trim().toLowerCase()) : [];
    return userRoles.includes(requiredRole.toLowerCase()) || userRoles.includes("clearance officer");
  }, [selectedRow, isManagerOrAdmin, roles]);

  // Action Mutations
  const startMutation = useMutation({
    mutationFn: (stepName: string) => startClearanceStepV2(stepName),
    onSuccess: () => {
      toast.success("Clearance step marked In Progress");
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to start clearance step");
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ stepName, refNo, amt }: { stepName: string; refNo?: string; amt?: number }) =>
      completeClearanceStepV2(stepName, refNo, amt),
    onSuccess: () => {
      toast.success("Clearance step completed successfully");
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to complete clearance step");
    },
  });

  const submitEmbassyMutation = useMutation({
    mutationFn: (stepName: string) => submitEmbassyStepV2(stepName),
    onSuccess: () => {
      toast.success("Embassy dossier submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit embassy dossier");
    },
  });

  const stampEmbassyMutation = useMutation({
    mutationFn: ({ stepName, refNo }: { stepName: string; refNo?: string }) =>
      stampEmbassyStepV2(stepName, refNo),
    onSuccess: () => {
      toast.success("Embassy visa stamped successfully");
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record visa stamp");
    },
  });

  const rejectEmbassyMutation = useMutation({
    mutationFn: ({ stepName, remark }: { stepName: string; remark: string }) =>
      rejectEmbassyStepV2(stepName, remark),
    onSuccess: () => {
      toast.error("Embassy visa rejected and recorded");
      queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
      setIsDrawerOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record embassy rejection");
    },
  });

  const isSaving =
    startMutation.isPending ||
    completeMutation.isPending ||
    submitEmbassyMutation.isPending ||
    stampEmbassyMutation.isPending ||
    rejectEmbassyMutation.isPending;

  const handleRowClick = (row: V2ClearanceQueueRow) => {
    setSelectedRow(row);
    setReferenceNo(row.reference_no || "");
    setAmount(row.amount ? String(row.amount) : "");
    setRejectionRemark(row.rejection_remark || "");
    setIsDrawerOpen(true);
  };

  const isEmbassyStep = React.useMemo<boolean>(() => {
    if (!selectedRow) return false;
    const st = selectedRow.step_type.toLowerCase();
    return st.includes("embassy");
  }, [selectedRow]);

  const isTerminalStatus = React.useMemo<boolean>(() => {
    if (!selectedRow) return false;
    const s = selectedRow.status.toLowerCase();
    return (
      s === "issued" ||
      s === "complete" ||
      s === "completed" ||
      s === "stamped" ||
      s === "rejected" ||
      s === "cancelled"
    );
  }, [selectedRow]);

  // Helper status badge renderer
  const renderStatusBadge = (status: string) => {
    const s = (status || "").trim().toLowerCase();
    if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    if (s === "in progress") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          In Progress
        </span>
      );
    }
    if (s === "submitted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
          <Send className="h-3 w-3" />
          Submitted to Embassy
        </span>
      );
    }
    if (s === "issued" || s === "complete" || s === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="h-3 w-3" />
          {status === "Issued" ? "Issued (LMIS)" : "Completed"}
        </span>
      );
    }
    if (s === "stamped") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <Stamp className="h-3 w-3" />
          Visa Stamped
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {status}
      </span>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LMIS Sheet columns (matching physical LMIS tracking sheet)
  // ──────────────────────────────────────────────────────────────────────────
  const lmisColumns: OperationalColumn<V2ClearanceQueueRow>[] = [
    {
      id: "no",
      header: "NO",
      width: "50px",
      align: "center",
      sortable: false,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-xs">{index ?? 1}</span>
      ),
    },
    {
      id: "name",
      header: "NAME",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/40 uppercase">
            {(row.full_name || "?").substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[180px] text-xs">
            {row.full_name || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      width: "120px",
      cell: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-zinc-300 text-xs">{row.passport_number || "—"}</span>
      ),
    },
    {
      id: "laborId",
      header: "LABOR ID",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-600 dark:text-zinc-400 font-medium text-xs">{row.reference_no || row.labor_id || "—"}</span>
      ),
    },
    {
      id: "destination",
      header: "DESTINATION",
      width: "110px",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-sm">{row.destination_country === "Kuwait" ? "🇰🇼" : "🇸🇦"}</span>
          <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{row.destination_country || "—"}</span>
        </div>
      ),
    },
    {
      id: "contractor",
      header: "CONTRACTOR",
      width: "140px",
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-zinc-300 uppercase truncate block max-w-[130px] font-medium">{row.contractor_name || "—"}</span>
      ),
    },
    {
      id: "duration",
      header: "DURATION FROM CONTRACT",
      width: "130px",
      align: "center",
      cell: (row) => {
        const contractDate = (row as any).contract_date || (row as any).contract_signed_date || (row as any).creation;
        const days = contractDate ? Math.max(0, Math.floor((Date.now() - new Date(contractDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
        return (
          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">
            {days} DAYS
          </span>
        );
      },
    },
    {
      id: "medical",
      header: "MEDICAL",
      width: "90px",
      align: "center",
      cell: (row) => {
        const isFit = (row.medical_status || "").toUpperCase().includes("FIT");
        return (
          <Badge className={isFit ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-rose-600 text-white font-bold text-[10px]"}>
            {isFit ? "FIT" : row.medical_status || "?"}
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      width: "110px",
      align: "center",
      cell: (row) => {
        const st = row.status || "Pending";
        return (
          <Badge
            className={
              st === "Issued" || st === "Complete" || st === "Completed"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "Rejected" || st === "Cancelled"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : st === "In Progress"
                ? "bg-blue-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {st}
          </Badge>
        );
      },
    },
    {
      id: "issueDate",
      header: "ISSUE DATE",
      width: "110px",
      cell: (row) => (
        <span className="text-slate-600 dark:text-zinc-400 font-medium text-xs">{row.date_completed || "—"}</span>
      ),
    },
    {
      id: "contact",
      header: "CONTACT",
      width: "130px",
      cell: (row) => (
        <span className="text-slate-800 dark:text-zinc-200 font-medium text-xs truncate block max-w-[120px]">{row.phone || "—"}</span>
      ),
    },
    {
      id: "remark",
      header: "REMARK",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[130px] text-xs">{row.rejection_remark || "—"}</span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      width: "80px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
          className="h-7 px-2.5 text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          Open
        </Button>
      ),
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Te'shir (Taeshir / Telesign) Sheet columns
  // ──────────────────────────────────────────────────────────────────────────
  const taeshirColumns: OperationalColumn<V2ClearanceQueueRow>[] = [
    {
      id: "no",
      header: "#",
      width: "50px",
      align: "center",
      sortable: false,
      cell: (_row, index) => (
        <span className="text-slate-600 dark:text-zinc-400 font-mono text-xs">{(index ?? 0) + 1}</span>
      ),
    },
    {
      id: "candidate",
      header: "CANDIDATE",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-[10px] border border-blue-300/40 uppercase">
            {(row.full_name || "?").substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white uppercase truncate text-xs max-w-[160px]">{row.full_name || "—"}</span>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">{row.passport_number || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "destination",
      header: "DESTINATION",
      width: "110px",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-sm">{row.destination_country === "Kuwait" ? "🇰🇼" : "🇸🇦"}</span>
          <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{row.destination_country || "—"}</span>
        </div>
      ),
    },
    {
      id: "contractor",
      header: "CONTRACTOR",
      width: "140px",
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-zinc-300 uppercase truncate block max-w-[130px] font-medium">{row.contractor_name || "—"}</span>
      ),
    },
    {
      id: "injazNo",
      header: "INJAZ / REF NO",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 font-medium text-xs">{row.reference_no || "—"}</span>
      ),
    },
    {
      id: "appointmentDate",
      header: "APPOINTMENT DATE",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-700 dark:text-zinc-300 font-medium text-xs">{row.date_started || "—"}</span>
      ),
    },
    {
      id: "paymentStatus",
      header: "INJAZ PAYMENT",
      width: "120px",
      align: "center",
      cell: (row) => {
        const isPaid = (row.payment_status || "").toLowerCase().includes("paid");
        return (
          <Badge className={isPaid ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-slate-400 text-white font-bold text-[10px]"}>
            {isPaid ? "PAID" : "UNPAID"}
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      width: "110px",
      align: "center",
      cell: (row) => {
        const st = row.status || "Pending";
        return (
          <Badge
            className={
              st === "Issued" || st === "Complete" || st === "Completed"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "Rejected" || st === "Cancelled"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : st === "In Progress"
                ? "bg-blue-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {st}
          </Badge>
        );
      },
    },
    {
      id: "remark",
      header: "REMARK",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[130px] text-xs">{row.rejection_remark || "—"}</span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      width: "80px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
          className="h-7 px-2.5 text-xs font-semibold border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
        >
          Open
        </Button>
      ),
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Embassy Sheet columns (matching physical Embassy tracking sheet)
  // ──────────────────────────────────────────────────────────────────────────
  const embassyColumns: OperationalColumn<V2ClearanceQueueRow>[] = [
    {
      id: "no",
      header: "NO",
      width: "50px",
      align: "center",
      sortable: false,
      cell: (_row, index) => (
        <span className="font-semibold text-slate-500 dark:text-zinc-400 font-mono text-xs">{index ?? 1}</span>
      ),
    },
    {
      id: "name",
      header: "NAME",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-bold text-[10px] border border-purple-300/40 uppercase">
            {(row.full_name || "?").substring(0, 2)}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[180px] text-xs">
            {row.full_name || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "passport",
      header: "PASSPORT",
      width: "120px",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 text-xs">{row.passport_number || "—"}</span>
      ),
    },
    {
      id: "embassy",
      header: "DESTINATION EMBASSY",
      width: "160px",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{row.destination_country === "Kuwait" ? "🇰🇼" : "🇸🇦"}</span>
          <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{row.destination_country || "Saudi Arabia"} Embassy</span>
        </div>
      ),
    },
    {
      id: "contractor",
      header: "CONTRACTOR",
      width: "140px",
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-zinc-300 uppercase truncate block max-w-[130px] font-medium">{row.contractor_name || "—"}</span>
      ),
    },
    {
      id: "refNo",
      header: "REF / VISA NO",
      width: "130px",
      cell: (row) => (
        <span className="font-mono text-slate-700 dark:text-zinc-300 font-medium text-xs">{row.reference_no || "—"}</span>
      ),
    },
    {
      id: "submissionDate",
      header: "SUBMISSION DATE",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-600 dark:text-zinc-400 font-medium text-xs">{row.date_started || "—"}</span>
      ),
    },
    {
      id: "feeStatus",
      header: "FEE STATUS",
      width: "110px",
      align: "center",
      cell: (row) => {
        const isPaid = (row.payment_status || "").toLowerCase().includes("paid");
        return (
          <Badge className={isPaid ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-rose-500 text-white font-bold text-[10px]"}>
            {isPaid ? "PAID" : "UNPAID"}
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      width: "120px",
      align: "center",
      cell: (row) => {
        const st = row.status || "Pending";
        return (
          <Badge
            className={
              st === "Stamped" || st === "Issued" || st === "Complete" || st === "Completed"
                ? "bg-emerald-600 text-white font-semibold text-[10px]"
                : st === "Rejected" || st === "Cancelled"
                ? "bg-rose-600 text-white font-semibold text-[10px]"
                : st === "Submitted"
                ? "bg-purple-600 text-white font-semibold text-[10px]"
                : st === "In Progress"
                ? "bg-blue-600 text-white font-semibold text-[10px]"
                : "bg-amber-500 text-white font-semibold text-[10px]"
            }
          >
            {st === "Stamped" ? "Visa Stamped" : st}
          </Badge>
        );
      },
    },
    {
      id: "remark",
      header: "REMARK",
      width: "140px",
      cell: (row) => (
        <span className="text-slate-500 dark:text-zinc-400 truncate block max-w-[130px] text-xs">{row.rejection_remark || "—"}</span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      width: "80px",
      align: "center",
      sortable: false,
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
          className="h-7 px-2.5 text-xs font-semibold border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
        >
          Open
        </Button>
      ),
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Operational Table Columns — All view (generic)
  // ──────────────────────────────────────────────────────────────────────────
  const allColumns: OperationalColumn<V2ClearanceQueueRow>[] = [
    {
      id: "step_info",
      header: "Clearance Step",
      width: "170px",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {row.name}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-slate-300 dark:border-zinc-700 font-semibold text-slate-600 dark:text-zinc-300"
            >
              Seq {row.sequence_order}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {row.is_mandatory ? (
              <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                Mandatory
              </span>
            ) : (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Optional
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "step_type",
      header: "Step Type",
      width: "180px",
      cell: (row) => {
        const isSaudi = row.destination_country === "Saudi Arabia";
        return (
          <div className="flex items-center gap-2">
            <span className="text-base" title={row.destination_country}>
              {isSaudi ? "🇸🇦" : "🇰🇼"}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                {row.step_type}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                {row.destination_country}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "candidate",
      header: "Candidate",
      width: "220px",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#1f1f26] border border-slate-200 dark:border-[#2a2a35] flex items-center justify-center shrink-0 text-slate-700 dark:text-zinc-300 text-xs font-bold">
            {(row.full_name || "C")
              .trim()
              .split(/\s+/)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {row.full_name}
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              {row.passport_number || "No Passport"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "placement",
      header: "Placement",
      width: "160px",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-slate-800 dark:text-zinc-200">
            {row.placement}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
            {row.contractor_name || "Agency"}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "160px",
      cell: (row) => renderStatusBadge(row.status),
    },
    {
      id: "actions",
      header: "Actions",
      width: "120px",
      align: "right",
      cell: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row);
          }}
          className="h-7 px-2.5 text-xs font-semibold border-slate-300 dark:border-[#2e2e38] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1d1d24]"
        >
          Inspect
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
  ];

  // Select active column set based on sheet tab
  const columns = React.useMemo(() => {
    if (activeSheetTab === "lmis") return lmisColumns;
    if (activeSheetTab === "taeshir") return taeshirColumns;
    if (activeSheetTab === "embassy") return embassyColumns;
    return allColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheetTab, handleRowClick]);

  // Active corridor definition for visual corridor tracker
  const activeCorridorSteps = React.useMemo<V2CorridorStepDefinition[]>(() => {
    if (selectedRow?.destination_country === "Kuwait") {
      return kuwaitCorridorSteps;
    }
    return saudiCorridorSteps;
  }, [selectedRow, saudiCorridorSteps, kuwaitCorridorSteps]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* Dynamic Corridor Architecture Banner                          */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#121216] p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                V2 Clearance Step Pipeline
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
              >
                Dynamic Corridor Config
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Corridor stages are dynamically configured. Sequence orders and mandatory gates are strictly enforced.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Filter Corridor:</span>
            {["All", "Saudi Arabia", "Kuwait"].map((corridor) => {
              const active = corridorFilter === corridor;
              return (
                <button
                  key={corridor}
                  type="button"
                  onClick={() => {
                    setCorridorFilter(corridor);
                    setSelectedStepTypeFilter("All");
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border",
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                      : "bg-slate-100 dark:bg-[#181820] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#262630] hover:bg-slate-200 dark:hover:bg-[#20202a]"
                  )}
                >
                  {corridor === "Saudi Arabia" ? "🇸🇦 Saudi Arabia" : corridor === "Kuwait" ? "🇰🇼 Kuwait" : "🌍 All Corridors"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Corridor Stages Visualization */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1d1d25] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Saudi Stages */}
          <div className={cn("p-2.5 rounded-lg border text-xs", corridorFilter === "Kuwait" ? "opacity-40" : "bg-slate-50/50 dark:bg-[#16161c] border-slate-200 dark:border-[#262630]")}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🇸🇦</span> Saudi Arabia Dynamic Corridor
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">{saudiCorridorSteps.length} Stages</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {saudiCorridorSteps.map((step, idx) => (
                <React.Fragment key={step.step_type}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-[#1d1d25] border border-slate-200 dark:border-[#2d2d38] text-slate-800 dark:text-zinc-200">
                    <span className="text-slate-400 font-mono text-[10px]">{step.sequence_order || idx + 1}.</span>
                    {step.step_type}
                    {step.is_mandatory ? "" : " (Opt)"}
                  </span>
                  {idx < saudiCorridorSteps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Kuwait Stages */}
          <div className={cn("p-2.5 rounded-lg border text-xs", corridorFilter === "Saudi Arabia" ? "opacity-40" : "bg-slate-50/50 dark:bg-[#16161c] border-slate-200 dark:border-[#262630]")}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🇰🇼</span> Kuwait Dynamic Corridor
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">{kuwaitCorridorSteps.length} Stages</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {kuwaitCorridorSteps.map((step, idx) => (
                <React.Fragment key={step.step_type}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-[#1d1d25] border border-slate-200 dark:border-[#2d2d38] text-slate-800 dark:text-zinc-200">
                    <span className="text-slate-400 font-mono text-[10px]">{step.sequence_order || idx + 1}.</span>
                    {step.step_type}
                    {step.is_mandatory ? "" : " (Opt)"}
                  </span>
                  {idx < kuwaitCorridorSteps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Sheet-Style Section Tab Bar                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-slate-200 dark:border-[#272730] pb-0 scrollbar-none">
        {(
          [
            { id: "all",      label: "All Steps",  emoji: "📋", accentClass: "border-slate-700 dark:border-white text-slate-900 dark:text-white bg-slate-50/60 dark:bg-[#1a1a20]" },
            { id: "lmis",     label: "LMIS",       emoji: "🟢", accentClass: "border-emerald-700 dark:border-emerald-500 text-emerald-900 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30" },
            { id: "taeshir",  label: "Te'shir",    emoji: "🔵", accentClass: "border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30" },
            { id: "embassy",  label: "Embassy",    emoji: "🟣", accentClass: "border-purple-700 dark:border-purple-500 text-purple-900 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-950/30" },
          ] as const
        ).map((tab) => {
          const isActive = activeSheetTab === tab.id;
          const count =
            tab.id === "all"
              ? enrichedRows.length
              : enrichedRows.filter((r) => {
                  const st = r.step_type.toLowerCase();
                  if (tab.id === "lmis") return st.includes("lmis");
                  if (tab.id === "taeshir") return st.includes("taeshir") || st.includes("telesign");
                  if (tab.id === "embassy") return st.includes("embassy");
                  return false;
                }).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveSheetTab(tab.id);
                setSelectedStepTypeFilter("All");
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? tab.accentClass
                  : "border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#181820]"
              )}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0 rounded-full",
                  isActive
                    ? "bg-slate-900/10 dark:bg-white/10"
                    : "bg-slate-200 dark:bg-[#252530] text-slate-600 dark:text-zinc-400"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Operational Clearance Table                                   */}
      {/* ------------------------------------------------------------- */}
      <OperationalTable<V2ClearanceQueueRow>
        title={
          activeSheetTab === "lmis"
            ? "LMIS / Labor Market Information System"
            : activeSheetTab === "taeshir"
            ? "Te'shir — Injaz Biometrics & Appointment Tracking"
            : activeSheetTab === "embassy"
            ? "Embassy — Visa Submission & Diplomatic Clearance"
            : "Clearance Queue"
        }
        subtitle={
          activeSheetTab === "lmis"
            ? "Ministry of Labor quota clearance and labor permit issuance."
            : activeSheetTab === "taeshir"
            ? "Saudi / Kuwait Te'shir appointments, Injaz reference numbers, and biometrics payment tracking."
            : activeSheetTab === "embassy"
            ? "Saudi / Kuwait Embassy dossier submission, visa fee status, and stamp recording."
            : "Role-scoped clearance pipeline for candidates in Processing stage"
        }
        columns={columns}
        data={filteredRows}
        isLoading={isQueueLoading || isQueueRefetching}
        selectedRowId={selectedRow?.name}
        onRowClick={handleRowClick}
        onRefresh={refetchQueue}
        corridorFilter={corridorFilter}
        onCorridorChange={setCorridorFilter}
        availableCorridors={["All", "Saudi Arabia", "Kuwait"]}
        extraHeaderActions={
          <div className="flex items-center gap-2">
            {activeSheetTab === "all" && availableStepTypes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">Step:</span>
                <select
                  aria-label="Filter by step type"
                  value={selectedStepTypeFilter}
                  onChange={(e) => setSelectedStepTypeFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
                >
                  <option value="All">All Step Types</option>
                  {availableStepTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* Operational Drawer for Selected Clearance Step                */}
      {/* ------------------------------------------------------------- */}
      <OperationalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Clearance Step Inspection"
        applicantName={selectedRow?.full_name || "Candidate"}
        applicantId={selectedRow?.name || ""}
        passportNumber={selectedRow?.passport_number || undefined}
        statusBadge={selectedRow ? renderStatusBadge(selectedRow.status) : undefined}
      >
        {selectedRow && (
          <div className="space-y-6">
            {/* Section 1: Step Overview */}
            <DrawerSection title="Clearance Step Metadata" icon={ShieldCheck}>
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Step ID" value={selectedRow.name} isReadOnly />
                <DrawerField label="Step Type" value={selectedRow.step_type} isReadOnly />
                <DrawerField label="Sequence Order" value={`Stage ${selectedRow.sequence_order}`} isReadOnly />
                <DrawerField
                  label="Requirement"
                  value={selectedRow.is_mandatory ? "Mandatory Gate" : "Optional Stage"}
                  isReadOnly
                />
                <DrawerField label="Date Started" value={selectedRow.date_started || "Not started"} isReadOnly />
                <DrawerField label="Date Completed" value={selectedRow.date_completed || "Not completed"} isReadOnly />
                <DrawerField label="Completed By" value={selectedRow.completed_by || "Pending completion"} isReadOnly />
                <DrawerField label="Payment Status" value={selectedRow.payment_status || "Not Applicable"} isReadOnly />

                {isManagerOrAdmin && (
                  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-[#1e1e24] flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Manager Assignment Control:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsReassignModalOpen(true)}
                      className="h-7 text-xs border-slate-300 dark:border-[#2a2a35] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1f1f28]"
                    >
                      <UserCog className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Reassign Officer
                    </Button>
                  </div>
                )}
              </div>
            </DrawerSection>

            {/* Section 2: Placement & Corridor Context */}
            <DrawerSection title="Placement & Corridor Context" icon={Building2}>
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Placement ID" value={selectedRow.placement} isReadOnly />
                <DrawerField label="Destination Country" value={selectedRow.destination_country} isReadOnly />
                <DrawerField label="Contractor / Agency" value={selectedRow.contractor_name} isReadOnly />
                <DrawerField label="Passport Number" value={selectedRow.passport_number} isReadOnly />
              </div>

              {selectedRow.applicant && (
                <div className="mt-3 pt-2 flex items-center justify-between">
                  <Link
                    href={`/applicants/${selectedRow.applicant}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    <User className="h-3.5 w-3.5" />
                    Open Candidate Dossier
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLmisModalOpen(true)}
                    className="h-7 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                    LMIS Fast-Path Editor
                  </Button>
                </div>
              )}
            </DrawerSection>

            {/* Section 3: Dynamic Corridor Progression */}
            <DrawerSection title="Corridor Sequence Position" icon={Globe2}>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                Dynamic pipeline defined for {selectedRow.destination_country}:
              </p>
              <div className="space-y-2">
                {activeCorridorSteps.map((step, idx) => {
                  const isCurrent = step.step_type === selectedRow.step_type;
                  return (
                    <div
                      key={step.step_type}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all",
                        isCurrent
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 font-bold"
                          : "bg-slate-50/50 dark:bg-[#181820] border-slate-200 dark:border-[#262630] text-slate-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px]",
                            isCurrent
                              ? "bg-emerald-800 text-white dark:bg-emerald-600"
                              : "bg-slate-200 dark:bg-[#252530] text-slate-600 dark:text-zinc-400"
                          )}
                        >
                          {step.sequence_order || idx + 1}
                        </span>
                        <span>{step.step_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge className="text-[10px] px-2 py-0 bg-emerald-800 dark:bg-emerald-600 text-white font-semibold">
                            Current Inspecting Step
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {step.is_mandatory ? "Mandatory" : "Optional"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DrawerSection>

            {/* Section 4: Authoritative Operational Actions */}
            <DrawerSection title="Clearance Action Controls" icon={FileCheck2}>
              {/* Role Permission Check Warning */}
              {!canOperateSelectedStep && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Action Restricted: </span>
                    Operating this step requires the{" "}
                    <strong>{CLEARANCE_ROLE_BY_STEP_TYPE[selectedRow.step_type] || "Clearance Officer"}</strong>{" "}
                    or <strong>Manager / Admin</strong> role. Your assigned roles are view-only for this step type.
                  </div>
                </div>
              )}

              {/* Terminal State Banner */}
              {isTerminalStatus && (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#181820] border border-slate-200 dark:border-[#272730] text-xs text-slate-700 dark:text-zinc-300 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Terminal State Reached ({selectedRow.status})
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    This clearance step is locked and cannot be mutated further. Backend state transitions are authoritative.
                  </p>
                  {selectedRow.reference_no && (
                    <div className="font-mono text-xs text-slate-800 dark:text-zinc-200">
                      Reference No: <strong>{selectedRow.reference_no}</strong>
                    </div>
                  )}
                  {selectedRow.rejection_remark && (
                    <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                      Rejection Remark: {selectedRow.rejection_remark}
                    </div>
                  )}
                </div>
              )}

              {/* Action: Pending -> In Progress */}
              {!isTerminalStatus && selectedRow.status === "Pending" && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-[#272730] bg-slate-50/50 dark:bg-[#181820] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <Play className="h-4 w-4 text-blue-600" />
                    Begin Clearance Processing
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Advance this step to <strong>In Progress</strong> to claim it and begin ministry/mission coordination.
                  </p>
                  <Button
                    type="button"
                    disabled={!canOperateSelectedStep || isSaving}
                    onClick={() => startMutation.mutate(selectedRow.name)}
                    className="w-full bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold h-9"
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Play className="h-4 w-4 mr-1.5" />
                    )}
                    Start Clearance Step
                  </Button>
                </div>
              )}

              {/* Action: In Progress & NOT Embassy -> Complete Step */}
              {!isTerminalStatus && selectedRow.status === "In Progress" && !isEmbassyStep && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-[#272730] bg-slate-50/50 dark:bg-[#181820] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Complete Clearance Step
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Completing this step marks it <strong>{selectedRow.step_type.includes("LMIS") ? "Issued" : "Complete"}</strong>.
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Reference Number (e.g. Labor ID / Permit / MOFA No)
                      </label>
                      <Input
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="e.g. REF-2026-91823"
                        disabled={!canOperateSelectedStep || isSaving}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Clearance Fee / Amount (Optional)
                      </label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={!canOperateSelectedStep || isSaving}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={!canOperateSelectedStep || isSaving}
                    onClick={() =>
                      completeMutation.mutate({
                        stepName: selectedRow.name,
                        refNo: referenceNo.trim() || undefined,
                        amt: amount ? Number(amount) : undefined,
                      })
                    }
                    className="w-full bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold h-9"
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    Mark Step Complete
                  </Button>
                </div>
              )}

              {/* Action: In Progress & IS Embassy -> Submit to Embassy */}
              {!isTerminalStatus && selectedRow.status === "In Progress" && isEmbassyStep && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-[#272730] bg-slate-50/50 dark:bg-[#181820] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <Send className="h-4 w-4 text-purple-600" />
                    Submit Dossier to Embassy
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Submitting the candidate passport and dossier to the diplomatic mission moves status to <strong>Submitted</strong>.
                  </p>
                  <Button
                    type="button"
                    disabled={!canOperateSelectedStep || isSaving}
                    onClick={() => submitEmbassyMutation.mutate(selectedRow.name)}
                    className="w-full bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-semibold h-9"
                  >
                    {submitEmbassyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Send className="h-4 w-4 mr-1.5" />
                    )}
                    Submit Embassy Step
                  </Button>
                </div>
              )}

              {/* Action: Submitted (Embassy) -> Stamp OR Reject */}
              {!isTerminalStatus && selectedRow.status === "Submitted" && isEmbassyStep && (
                <div className="space-y-3">
                  {/* Outcome 1: Stamp */}
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      <Stamp className="h-4 w-4 text-emerald-600" />
                      Diplomatic Mission Visa Stamped
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Visa Sticker / Reference Number
                      </label>
                      <Input
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="e.g. VISA-13091823"
                        disabled={!canOperateSelectedStep || isSaving}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={!canOperateSelectedStep || isSaving}
                      onClick={() =>
                        stampEmbassyMutation.mutate({
                          stepName: selectedRow.name,
                          refNo: referenceNo.trim() || undefined,
                        })
                      }
                      className="w-full bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold h-9"
                    >
                      {stampEmbassyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Stamp className="h-4 w-4 mr-1.5" />
                      )}
                      Record Visa Stamp (Approved)
                    </Button>
                  </div>

                  {/* Outcome 2: Reject */}
                  <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-900 dark:text-rose-300">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      Embassy Visa Rejection
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-rose-900 dark:text-rose-300">
                        Rejection Remark (Required)
                      </label>
                      <Textarea
                        rows={2}
                        value={rejectionRemark}
                        onChange={(e) => setRejectionRemark(e.target.value)}
                        placeholder="Specify embassy refusal ground or missing document..."
                        disabled={!canOperateSelectedStep || isSaving}
                        className="text-xs mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!canOperateSelectedStep || !rejectionRemark.trim() || isSaving}
                      onClick={() =>
                        rejectEmbassyMutation.mutate({
                          stepName: selectedRow.name,
                          remark: rejectionRemark.trim(),
                        })
                      }
                      className="w-full text-xs font-semibold h-9"
                    >
                      {rejectEmbassyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1.5" />
                      )}
                      Record Rejection
                    </Button>
                  </div>
                </div>
              )}
              {/* Wakala Payment Reminder Manual Trigger (Saudi Embassy) */}
              {isEmbassyStep && !isTerminalStatus && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <BellRing className="h-4 w-4 text-amber-600" />
                      Wakala Payment Reminder
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                      Monday Gate
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Wakala must be paid by the contractor before Monday embassy submission. Manually dispatch a push/WhatsApp alert:
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        setIsWakalaReminding(true);
                        const res = await triggerWakalaReminderV2(selectedRow.name);
                        toast.success("Wakala Reminder Sent", {
                          description: res?.message || `Wakala payment reminder dispatched for ${selectedRow.name}`,
                        });
                      } catch (err: any) {
                        toast.error("Reminder Failed", {
                          description: err?.message || "Could not dispatch Wakala reminder",
                        });
                      } finally {
                        setIsWakalaReminding(false);
                      }
                    }}
                    disabled={isWakalaReminding}
                    className="w-full text-xs font-semibold h-8 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                  >
                    {isWakalaReminding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <BellRing className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Send Wakala Reminder
                  </Button>
                </div>
              )}

              {/* Saudi Injaz Paper OCR Parser */}
              {(isEmbassyStep || selectedRow.step_type.includes("Taeshir") || selectedRow.destination_country === "Saudi Arabia") && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-[#222227] bg-slate-50/50 dark:bg-[#15151c] space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" /> Saudi Injaz Document OCR
                    </span>
                    <Badge variant="outline" className="text-[10px] border-slate-300">
                      parse_injaz_file
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Upload Injaz paper to extract Application Number, MOFA Barcode, and Applicant Name.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={injazFileInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleInjazFileUpload}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isInjazParsing}
                      onClick={() => injazFileInputRef.current?.click()}
                      className="text-xs border-slate-300 dark:border-[#2a2a35] h-8 flex-1"
                    >
                      {isInjazParsing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isInjazParsing ? "Extracting MOFA Data..." : "Upload & Parse Injaz Paper"}
                    </Button>
                  </div>
                  {parsedInjaz && (
                    <div className="rounded border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 text-[11px] space-y-1">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Injaz Data Extracted:
                      </div>
                      <div>App #: <span className="font-mono font-bold">{parsedInjaz.injaz_application_number || "—"}</span></div>
                      <div>MOFA Barcode: <span className="font-mono font-bold">{parsedInjaz.mofa_barcode || "—"}</span></div>
                      <div>Candidate: <span className="font-semibold">{parsedInjaz.full_name || "—"}</span></div>
                    </div>
                  )}
                </div>
              )}
            </DrawerSection>
          </div>
        )}
      </OperationalDrawer>

      {/* Reassign Employee Modal */}
      {selectedRow && (
        <AssignEmployeeModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          clearanceStepName={selectedRow.name}
          stepType={selectedRow.step_type}
          currentAssignee={selectedRow.completed_by || undefined}
          placementName={selectedRow.placement}
          applicantName={selectedRow.full_name}
          destinationCountry={selectedRow.destination_country}
          onSuccess={() => {
            refetchQueue();
          }}
        />
      )}

      {/* LMIS Fast-Path Intake Modal */}
      {selectedRow && (
        <LmisFastPathModal
          isOpen={isLmisModalOpen}
          onClose={() => setIsLmisModalOpen(false)}
          applicantId={selectedRow.applicant || selectedRow.name}
          applicantName={selectedRow.full_name || selectedRow.name}
          onSuccess={() => {
            refetchQueue();
          }}
        />
      )}
    </div>
  );
}
