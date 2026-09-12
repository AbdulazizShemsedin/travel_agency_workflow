"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Award,
  HeartPulse,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Loader2,
  Building2,
  UserCheck,
  UploadCloud,
  FileCheck2,
  FileUp,
  Plane,
  Fingerprint,
  Send,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Ban,
  RotateCcw,
  Plus,
  Ticket,
  XCircle,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import {
  getApplicantV2,
  updateApplicantV2,
  registerApplicantV2,
  generateCvV2,
  cancelApplicantV2,
  restartApplicantV2,
  logApplicantFeeV2,
  logStageExpenseV2,
  logStageIncomeV2,
  V2SupportedCurrency,
  listCountryBansV2,
  setCountryBanV2,
  removeCountryBanV2,
  listPlacementsV2,
  listMyClearanceStepsV2,
  listEmployeesV2,
  getPlacementOfficersV2,
  resolveDefaultEmployeeForRole,
  mapStepToRole,
  V2ClearanceStepItem,
  recordSelectedMedicalResultV2,
  advancePlacementV2,
  autoAssignPlacementCorridorSteps,
  triggerEarlyCommissionAccrualV2,
  V2ApplicantDetails,
} from "@/lib/api/v2";
import {
  calculateRemainingDays,
  getExpiryBadgeStatus,
} from "@/lib/validations/applicant.schema";
import { sendApplicantToExtension } from "@/lib/extensionBridge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignEmployeeModal } from "@/components/applicant/AssignEmployeeModal";
import { MusanedVerificationModal } from "@/components/applicant/MusanedVerificationModal";
import { MuayenaPlacementModal } from "@/components/applicant/MuayenaPlacementModal";
import { TicketingDepartureModal } from "@/components/applicant/TicketingDepartureModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";

const CANONICAL_STAGES = [
  "Draft",
  "Registered",
  "CV Generated",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
];

const STAGE_DISPLAY_LABELS: Record<string, string> = {
  Draft: "Draft",
  Registered: "Registered",
  "CV Generated": "CV Generated",
  Selected: "Selected",
  Processing: "Processing(LMIS and Te'shir)",
  Stamped: "Embassy",
  Ticketed: "Ticketed",
  Departed: "Departed",
};

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const isAdminOrOps = roles.some(
    (r) =>
      r === "Administrator" ||
      r === "System Manager" ||
      r === "Admin" ||
      r === "Operations Manager"
  );

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isRestartModalOpen, setIsRestartModalOpen] = React.useState(false);
  const [restartTargetStatus, setRestartTargetStatus] = React.useState<"Draft" | "Registered">("Draft");
  const [isMusanedModalOpen, setIsMusanedModalOpen] = React.useState(false);
  const [isMuayenaModalOpen, setIsMuayenaModalOpen] = React.useState(false);
  const [isTicketingModalOpen, setIsTicketingModalOpen] = React.useState(false);
  const [ticketingInitialTab, setTicketingInitialTab] = React.useState<"ticket" | "reschedule" | "medical2" | "departure">("ticket");
  const [isMedical1ModalOpen, setIsMedical1ModalOpen] = React.useState(false);
  const [med1Status, setMed1Status] = React.useState<"FIT" | "UNFIT">("FIT");
  const [med1Date, setMed1Date] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [med1Expiry, setMed1Expiry] = React.useState("");
  const [cancelRemarks, setCancelRemarks] = React.useState("");

  // Country Ban (Ashara Teyezuwal) state
  const [isCountryBanModalOpen, setIsCountryBanModalOpen] = React.useState(false);
  const [banCountry, setBanCountry] = React.useState("Kuwait");
  const [banReason, setBanReason] = React.useState("");
  const [isLiftBanModalOpen, setIsLiftBanModalOpen] = React.useState(false);
  const [banToLift, setBanToLift] = React.useState<any>(null);
  const [liftBanReason, setLiftBanReason] = React.useState("");

  const canSetBan = roles.some((r) =>
    ["Registrar", "Complaint Manager", "Manager", "Admin", "System Manager", "Administrator"].includes(r)
  );
  const canLiftBan = roles.some((r) =>
    ["Manager", "Admin", "System Manager", "Administrator", "General Manager", "Operations Manager"].includes(r)
  );

  // Multiple Fee & Expense logging state for candidate profile
  const [isLogFeeModalOpen, setIsLogFeeModalOpen] = React.useState(false);
  const [profileFees, setProfileFees] = React.useState<
    Array<{
      id: string;
      direction: "Expense" | "Income";
      amount: string;
      currency: V2SupportedCurrency;
      description: string;
      stage: string;
    }>
  >([
    {
      id: "fee-init-1",
      direction: "Income",
      amount: "",
      currency: "ETB",
      description: "",
      stage: "Intake",
    },
  ]);
  const [isSubmittingProfileFees, setIsSubmittingProfileFees] = React.useState(false);

  const handleAddProfileFeeRow = () => {
    setProfileFees((prev) => [
      ...prev,
      {
        id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        direction: "Expense",
        amount: "",
        currency: "ETB",
        description: "",
        stage: "Processing",
      },
    ]);
  };

  const handleRemoveProfileFeeRow = (id: string) => {
    setProfileFees((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: `fee-${Date.now()}`,
            direction: "Income",
            amount: "",
            currency: "ETB",
            description: "",
            stage: "Intake",
          },
        ];
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUpdateProfileFeeRow = (
    id: string,
    updates: Partial<{
      direction: "Expense" | "Income";
      amount: string;
      currency: V2SupportedCurrency;
      description: string;
      stage: string;
    }>
  ) => {
    setProfileFees((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleSubmitProfileFees = async () => {
    const validFees = profileFees.filter((f) => parseFloat(f.amount) > 0);
    if (validFees.length === 0) {
      toast.error("Please enter a valid amount greater than 0 for at least one fee entry.");
      return;
    }

    try {
      setIsSubmittingProfileFees(true);
      let successCount = 0;
      for (const item of validFees) {
        const amt = parseFloat(item.amount);
        const desc = item.description.trim() || `Candidate ${item.direction} fee (${item.stage || "General"})`;
        if (item.direction === "Expense") {
          await logStageExpenseV2(amt, item.currency, desc, activePlacement?.name, item.stage);
        } else {
          await logStageIncomeV2(amt, item.currency, desc, activePlacement?.name, item.stage);
        }
        successCount++;
      }

      toast.success(`Logged ${successCount} fee ${successCount === 1 ? "entry" : "entries"} to Finance!`, {
        description: "Transactions submitted to Finance approval queue.",
      });
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace"] });
      setIsLogFeeModalOpen(false);
      setProfileFees([
        {
          id: `fee-${Date.now()}`,
          direction: "Income",
          amount: "",
          currency: "ETB",
          description: "",
          stage: "Intake",
        },
      ]);
    } catch (err: any) {
      toast.error("Failed to log fee entries", { description: err?.message });
    } finally {
      setIsSubmittingProfileFees(false);
    }
  };

  const {
    data: applicant,
    isLoading,
    isError,
    refetch,
  } = useQuery<V2ApplicantDetails>({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicantV2(applicantId),
    enabled: !!applicantId,
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["applicant-placements", applicantId],
    queryFn: () => listPlacementsV2({ applicant: applicantId }),
    enabled: !!applicantId,
  });

  const { data: clearanceSteps = [] } = useQuery({
    queryKey: ["my-clearance-steps"],
    queryFn: () => listMyClearanceStepsV2(),
  });

  const activePlacement = placements[0] || null;
  const hasUploadedContract = Boolean(
    activePlacement?.contract_file ||
    activePlacement?.contract_number ||
    (applicant as any)?.contract_file ||
    (applicant as any)?.contract_number
  );

  React.useEffect(() => {
    if (activePlacement?.medical_selected_status === "FIT" || activePlacement?.medical_selected_status === "UNFIT") {
      setMed1Status(activePlacement.medical_selected_status);
    } else if (applicant?.medical_status === "FIT" || applicant?.medical_status === "UNFIT") {
      setMed1Status(applicant.medical_status as "FIT" | "UNFIT");
    }
    const initialDate = activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date;
    if (initialDate) {
      setMed1Date(initialDate);
    }
    const initialExpiry = activePlacement?.medical_selected_expiry_date || applicant?.medical_expiry_date;
    if (initialExpiry) {
      setMed1Expiry(initialExpiry);
    }
  }, [
    activePlacement?.medical_selected_status,
    activePlacement?.medical_selected_examination_date,
    activePlacement?.medical_selected_expiry_date,
    applicant?.medical_status,
    applicant?.medical_issue_date,
    applicant?.medical_expiry_date,
  ]);

  const applicantClearanceSteps = React.useMemo(() => {
    return clearanceSteps.filter(
      (s) =>
        (activePlacement?.name && s.placement === activePlacement.name) ||
        s.applicant === applicantId ||
        s.applicant === applicant?.name ||
        s.applicant_name === applicantId ||
        s.applicant_name === applicant?.name
    );
  }, [clearanceSteps, activePlacement?.name, applicantId, applicant?.name]);

  // Query assigned placement officers via chat_engine
  const { data: placementOfficers = [] } = useQuery({
    queryKey: ["placement_officers", activePlacement?.name],
    queryFn: () => (activePlacement?.name ? getPlacementOfficersV2(activePlacement.name) : Promise.resolve([])),
    enabled: Boolean(activePlacement?.name),
  });

  // Query all employees to resolve names and default specialists
  const { data: employees = [] } = useQuery({
    queryKey: ["v2_employees_for_assign"],
    queryFn: () => listEmployeesV2(),
    staleTime: 30000,
  });

  const corridorCountry = activePlacement?.destination_country || applicant?.destination_country || "Saudi Arabia";

  // Corridor clearance steps for the Processing Stage (strictly LMIS and Te'shir / Telesign)
  const processingClearanceSteps = React.useMemo(() => {
    return applicantClearanceSteps.filter((s) => {
      const norm = (s.step_type || "").toLowerCase().trim();
      return (
        !norm.includes("ticket") &&
        !norm.includes("departure") &&
        !norm.includes("embassy") &&
        !norm.includes("stamp")
      );
    });
  }, [applicantClearanceSteps]);

  // Embassy Clearance Step for Stamped Stage
  const embassyClearanceStep = React.useMemo(() => {
    return applicantClearanceSteps.find((s) => {
      const norm = (s.step_type || "").toLowerCase().trim();
      return norm.includes("embassy") || norm.includes("stamping");
    });
  }, [applicantClearanceSteps]);

  // Resolve officer name from placement officers or configured default specialists
  const getStepOfficerName = React.useCallback(
    (step: V2ClearanceStepItem) => {
      if (step.assigned_officer) return step.assigned_officer;

      // Match against placement officers returned by backend chat_engine
      const stepRole = mapStepToRole(step.step_type || step.name, corridorCountry);
      const officerMatch = placementOfficers.find(
        (o) =>
          o.step_type?.toLowerCase().trim() === step.step_type?.toLowerCase().trim() ||
          mapStepToRole(o.step_type, corridorCountry) === stepRole
      );
      if (officerMatch?.full_name) return officerMatch.full_name;
      if (officerMatch?.user) {
        const emp = employees.find((e) => e.name === officerMatch.user || e.email === officerMatch.user);
        return emp?.full_name || officerMatch.user;
      }

      // Fallback to configured or corridor default employee
      const defaultEmp = resolveDefaultEmployeeForRole(stepRole, employees);
      if (defaultEmp?.full_name || defaultEmp?.name) {
        return defaultEmp.full_name || defaultEmp.name;
      }

      return "Unassigned";
    },
    [placementOfficers, employees, corridorCountry]
  );

  const { data: countryBans = [], refetch: refetchCountryBans } = useQuery({
    queryKey: ["country-bans", applicantId],
    queryFn: () => listCountryBansV2(applicantId),
    enabled: !!applicantId,
  });

  const generateCvMutation = useMutation({
    mutationFn: () => generateCvV2(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("CV Generated Successfully", {
        description: data.message || "Official bilateral CV compiled. Opening preview...",
      });
      router.push(`/applicants/${encodeURIComponent(applicantId)}/cv`);
    },
    onError: (err: Error) => {
      // Backend PDF generation can take up to 2 minutes and may crash with a non-JSON body.
      // Translate the generic proxy error into a user-friendly message.
      const rawMsg = err.message || "";
      const isRenderCrash =
        rawMsg.includes("Non-JSON response") ||
        rawMsg.includes("non-JSON") ||
        rawMsg.includes("HTTP 500");
      const description = isRenderCrash
        ? "The server encountered an error while rendering the CV PDF. This may be due to missing print template configuration or a temporary rendering engine issue. Please check that the Print Format is enabled on the backend and try again."
        : rawMsg;
      toast.error("CV Generation Failed", { description });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      // Ensure field-floor requirements for Standard track are satisfied
      if (
        applicant &&
        applicant.entry_track !== "Muayena" &&
        (!applicant.target_job ||
          !applicant.education ||
          !applicant.salary_amount ||
          Number(applicant.salary_amount) <= 0 ||
          !applicant.salary_currency ||
          !applicant.photograph)
      ) {
        await updateApplicantV2(applicantId, {
          target_job: applicant.target_job || (applicant as any).job_applied || "House worker",
          education: applicant.education || (applicant as any).highest_education || "High School",
          salary_amount: Number(applicant.salary_amount) > 0 ? Number(applicant.salary_amount) : 1000,
          salary_currency: applicant.salary_currency || "SAR",
          photograph:
            applicant.photograph ||
            (applicant as any).photo_passport ||
            (applicant as any).profile_photo_url ||
            (applicant as any).photo_full_body ||
            "",
        });
      }
      return registerApplicantV2(applicantId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Applicant successfully registered!");
    },
    onError: (err: Error) => {
      toast.error("Registration validation failed", { description: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelApplicantV2(applicantId, cancelRemarks || "Administrative cancellation"),
    onSuccess: (data) => {
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.warning(data.message || "Applicant process cancelled.");
    },
    onError: (err: Error) => toast.error("Cancellation failed", { description: err.message }),
  });

  const restartMutation = useMutation({
    mutationFn: (targetStatus?: "Draft" | "Registered") => restartApplicantV2(applicantId, targetStatus || restartTargetStatus || "Draft"),
    onSuccess: (data) => {
      setIsRestartModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || `Applicant restarted to ${restartTargetStatus}.`);
    },
    onError: (err: Error) => toast.error("Restart failed", { description: err.message }),
  });

  const logFeeMutation = useMutation({
    mutationFn: () => logApplicantFeeV2(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      toast.success(data.message || "Registration fee logged to finance ledger!");
    },
    onError: (err: Error) => toast.error("Failed to log fee", { description: err.message }),
  });

  const recordMedical1Mutation = useMutation({
    mutationFn: async () => {
      if (!med1Status) throw new Error("Medical fitness status is required");
      if (!med1Date) throw new Error("Date of medical examination is required");

      // 1. Update applicant record with medical fitness and exam date
      if (applicant?.name) {
        await updateApplicantV2(applicant.name, {
          medical_status: med1Status,
          medical_issue_date: med1Date,
          medical_expiry_date: med1Expiry || undefined,
        });
      }

      // 2. If active placement exists, record selected medical result on placement
      if (activePlacement?.name) {
        await recordSelectedMedicalResultV2(
          activePlacement.name,
          med1Status,
          med1Date,
          med1Expiry || undefined
        );
      }
    },
    onSuccess: () => {
      setIsMedical1ModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      toast.success(`Medical examination recorded as ${med1Status}`);
    },
    onError: (err: any) => {
      toast.error("Failed to record Medical result", { description: err.message });
    },
  });

  const setCountryBanMutation = useMutation({
    mutationFn: async () => {
      if (!banReason.trim()) throw new Error("A written reason is required when setting a Country Ban.");
      return await setCountryBanV2(applicantId, banCountry, banReason.trim());
    },
    onSuccess: () => {
      toast.success(`Country ban (Ashara Teyezuwal) set for ${banCountry}.`);
      setIsCountryBanModalOpen(false);
      setBanReason("");
      refetchCountryBans();
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to set country ban.");
    },
  });

  const removeCountryBanMutation = useMutation({
    mutationFn: async () => {
      if (!banToLift?.name) return;
      return await removeCountryBanV2(banToLift.name);
    },
    onSuccess: () => {
      toast.success("Country ban lifted successfully by Manager Override.");
      setIsLiftBanModalOpen(false);
      setBanToLift(null);
      setLiftBanReason("");
      refetchCountryBans();
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to lift country ban.");
    },
  });

  const advanceToProcessingMutation = useMutation({
    mutationFn: async () => {
      if (!activePlacement) throw new Error("No active placement found");
      const hasContract = Boolean(
        activePlacement.contract_file ||
        activePlacement.contract_number ||
        (applicant as any)?.contract_file ||
        (applicant as any)?.contract_number
      );
      if (!hasContract) {
        throw new Error("Signed employment contract must be uploaded on the system before advancing to Processing stage.");
      }
      const isFit = activePlacement.medical_selected_status === "FIT" || applicant?.medical_status === "FIT";
      const medDate = activePlacement.medical_selected_examination_date || applicant?.medical_issue_date;
      if (!isFit) {
        throw new Error("Medical status must be set to FIT before advancing to Processing.");
      }
      if (!medDate) {
        throw new Error("Date of medical examination must be entered before advancing to Processing.");
      }
      if (activePlacement.medical_selected_status !== "FIT") {
        await recordSelectedMedicalResultV2(
          activePlacement.name,
          "FIT",
          medDate,
          activePlacement.medical_selected_expiry_date || applicant?.medical_expiry_date || undefined
        );
      }
      return advancePlacementV2(activePlacement.name, "Processing");
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      toast.success("Placement advanced to Processing");

      // Auto-assign corridor steps using default roles
      if (activePlacement?.name) {
        try {
          const [steps, emps] = await Promise.all([
            listMyClearanceStepsV2().catch(() => []),
            listEmployeesV2().catch(() => []),
          ]);
          if (steps.length > 0 && emps.length > 0) {
            const result = await autoAssignPlacementCorridorSteps(
              activePlacement.name,
              activePlacement.destination_country || (applicant as any)?.destination_country || "Saudi Arabia",
              steps,
              emps
            );
            if (result.assignedCount > 0) {
              toast.info(`Default staff assigned to ${result.assignedCount} clearance steps.`);
              queryClient.invalidateQueries({ queryKey: ["v2_clearance_steps_queue"] });
              queryClient.invalidateQueries({ queryKey: ["placement_officers"] });
            }
          }
        } catch (e) {
          console.warn("Corridor auto-assignment notice:", e);
        }
      }
    },
    onError: (err: any) => {
      toast.error("Failed to advance placement", { description: err.message });
    },
  });

  const triggerEarlyCommissionMutation = useMutation({
    mutationFn: () => {
      if (!activePlacement) throw new Error("No active placement found");
      return triggerEarlyCommissionAccrualV2(activePlacement.name);
    },
    onSuccess: (res) => {
      toast.success("Early Commission Accrued", { description: res.message || "Commission record created." });
    },
    onError: (err: any) => {
      toast.error("Failed to accrue commission", { description: err.message });
    },
  });

  // Unified Financial & Fee Records derivation (including intake registration fee)
  const allApplicantFees = React.useMemo(() => {
    if (!applicant) return [];
    const list: any[] = [];

    // 1. Initial Registration Fee entered during applicant intake
    const regFeeAmount = Number(applicant.registration_fee_amount);
    if (applicant.fee_required || (regFeeAmount && regFeeAmount > 0)) {
      list.push({
        description: `${applicant.fee_type || "Registration Fee"}${applicant.fee_status ? ` (${applicant.fee_status})` : ""}${applicant.fee_notes ? ` - ${applicant.fee_notes}` : ""}`,
        source_doctype: "Applicant Registration",
        transaction_type: applicant.fee_direction || "Income",
        amount: regFeeAmount || 0,
        date: applicant.fee_payment_date || (applicant.creation ? String(applicant.creation).slice(0, 10) : "At Registration"),
        status: applicant.fee_status || "Pending",
        notes: applicant.fee_notes || "",
        currency: applicant.fee_currency || "ETB",
      });
    }

    // 2. Child fee logs (if any on the Applicant document)
    if (Array.isArray(applicant.fee_log)) {
      applicant.fee_log.forEach((f: any) => {
        list.push({
          description: f.fee_type || f.description || "Fee Log Entry",
          source_doctype: f.source_doctype || "Fee Log",
          transaction_type: f.direction || f.transaction_type || "Income",
          amount: Number(f.amount) || 0,
          date: f.date || (f.creation ? String(f.creation).slice(0, 10) : ""),
          status: f.status || "Paid",
          notes: f.notes || "",
          currency: f.currency || applicant.fee_currency || "ETB",
        });
      });
    }

    // 3. Any additional clearance / stage income_expense_logs
    if (Array.isArray(applicant.income_expense_logs)) {
      applicant.income_expense_logs.forEach((f: any) => {
        list.push({
          ...f,
          amount: Number(f.amount) || 0,
        });
      });
    }

    return list;
  }, [applicant]);

  const totalCandidateIncome = React.useMemo(() => {
    return allApplicantFees
      .filter((f) => f.transaction_type === "Income")
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [allApplicantFees]);

  const totalCandidateExpense = React.useMemo(() => {
    return allApplicantFees
      .filter((f) => f.transaction_type === "Expense")
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [allApplicantFees]);

  const netCandidateFinancials = totalCandidateIncome - totalCandidateExpense;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">Loading Applicant Details...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800 dark:text-rose-300">Applicant Record Not Found</h3>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          The requested applicant profile could not be loaded from the server.
        </p>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  const examDays = calculateRemainingDays(applicant.exam_date);
  const examStatus = getExpiryBadgeStatus(examDays);

  const medDays = calculateRemainingDays(applicant.medical_expiry_date);
  const medStatus = getExpiryBadgeStatus(medDays);

  const passDays = calculateRemainingDays(applicant.passport_expiry);
  const passStatus = getExpiryBadgeStatus(passDays);

  // Authoritative State Machine Resolution
  const rawStage =
    activePlacement?.status ||
    applicant.status ||
    applicant.applicant_state ||
    "Draft";

  // If local processing steps (LMIS & Te'shir) are all complete, advance active stage to Stamped (Embassy)
  const allProcessingStepsCompleted =
    processingClearanceSteps.length > 0 &&
    processingClearanceSteps.every((s) => s.status === "Complete" || s.status === "Issued");

  const currentStage =
    rawStage === "Processing" && allProcessingStepsCompleted
      ? "Stamped"
      : rawStage;
  const currentStageIndex = CANONICAL_STAGES.indexOf(currentStage);

  const destination = (applicant.destination_country || "").trim().toLowerCase();
  const isKuwaitApplicant = destination === "kuwait";
  const isSaudiApplicant =
    destination === "saudi arabia" ||
    destination === "saudi" ||
    destination === "ksa" ||
    (!destination && !isKuwaitApplicant);

  const isMuayenaApplicant =
    String(applicant.entry_track || "").trim().toLowerCase() === "muayena" ||
    String((applicant as any).applicant_type || "").trim().toLowerCase() === "muayena" ||
    Boolean((applicant as any).is_muayena) ||
    Boolean(activePlacement?.is_muayena);

  const isPostCvStage = [
    "CV Generated",
    "Request Pending",
    "Selected",
    "Processing",
    "Stamped",
    "Ticketed",
    "Departed",
  ].includes(currentStage);

  const isMusanedReady =
    !isSaudiApplicant ||
    isPostCvStage ||
    applicant.is_uploaded_to_musaned === 1 ||
    applicant.is_uploaded_to_musaned === true ||
    applicant.musaned_status === "Registered" ||
    Boolean(applicant.musaned_reference_no && applicant.musaned_reference_no.trim() !== "");

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <Link
            href="/applicants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicants Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {applicant.full_name || [applicant.first_name, applicant.middle_name, applicant.last_name].filter(Boolean).join(" ") || applicant.name}
            </h1>
            <Badge variant="default" className="text-xs bg-blue-900 font-bold text-white">
              {STAGE_DISPLAY_LABELS[currentStage] || currentStage}
            </Badge>
            {applicant.applicant_state === "Cancelled" && (
              <Badge variant="destructive">Cancelled</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {applicant.passport_number && (
              <span className="flex items-center gap-1 font-medium">
                <span className="text-slate-400 dark:text-zinc-500">Passport:</span>
                <strong className="font-mono font-bold text-slate-800 dark:text-zinc-200">{applicant.passport_number}</strong>
              </span>
            )}
            {applicant.destination_country && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="text-slate-400 dark:text-zinc-500">Destination:</span>
                  <strong className="text-slate-800 dark:text-zinc-200">{applicant.destination_country}</strong>
                </span>
              </>
            )}
            {(applicant.phone_number || applicant.phone) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="text-slate-400 dark:text-zinc-500">Phone:</span>
                  <strong className="text-slate-800 dark:text-zinc-200">{applicant.phone_number || applicant.phone}</strong>
                </span>
              </>
            )}
            {(applicant.target_job || applicant.job_applied) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="text-slate-400 dark:text-zinc-500">Role:</span>
                  <strong className="text-slate-800 dark:text-zinc-200">{applicant.target_job || applicant.job_applied}</strong>
                </span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400 dark:text-zinc-500">Registered:</span>
              <span className="text-slate-700 dark:text-zinc-300">{applicant.registration_date || applicant.creation?.split(" ")[0] || "Draft"}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-600">
              ({applicant.name})
            </span>
          </div>
        </div>

        {/* Top Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {applicant.applicant_state === "Cancelled" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRestartModalOpen(true)}
              disabled={restartMutation.isPending}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore Applicant
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel Process
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await sendApplicantToExtension(applicant as any);
                if (res.success) {
                  toast.success(`Candidate ${applicant.name} sent to Travel Agency Assistant extension!`);
                } else {
                  toast.error(res.error || "Could not send to extension. Make sure extension is installed.");
                }
              } catch (err: any) {
                toast.error(err?.message || "Failed to communicate with extension.");
              }
            }}
            className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/60 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30"
            title="Send candidate profile into browser extension memory"
          >
            <Send className="mr-1.5 h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            Send to Extension
          </Button>

          <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
            <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Contract Document (PDF)
            </Button>
          </Link>

          {/* Muayena Track Direct Placement Creator (Muayena applicants only) */}
          {!activePlacement && isMuayenaApplicant && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMuayenaModalOpen(true)}
              className="text-xs border-indigo-300 text-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
              title="Create Muayena Placement directly with contract in hand"
            >
              <Building2 className="mr-1.5 h-3.5 w-3.5 text-indigo-700 dark:text-indigo-400" />
              Muayena Intake
            </Button>
          )}

          <Link href={`/applicants/${encodeURIComponent(applicant.name)}/edit`}>
            <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </Link>

          {canSetBan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCountryBanModalOpen(true)}
              className="text-xs border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="Set permanent country ban (Ashara Teyezuwal)"
            >
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              Country Ban (Ashara)
            </Button>
          )}
        </div>
      </div>

      {/* Active Country Ban (Ashara Teyezuwal) Alert Banner */}
      {countryBans.length > 0 && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  Permanent Country Ban Active (Ashara Teyezuwal)
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                    Blacklisted
                  </Badge>
                </h4>
                <div className="mt-1 space-y-1">
                  {countryBans.map((ban) => (
                    <p key={ban.name} className="text-xs text-rose-800 dark:text-rose-300">
                      • <strong>{ban.country}</strong> — Reason: <em>{ban.reason || "No reason recorded"}</em> (Set by {ban.set_by || "Staff"} on {ban.set_on || "Record"})
                    </p>
                  ))}
                </div>
              </div>
            </div>
            {canLiftBan && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBanToLift(countryBans[0]);
                  setIsLiftBanModalOpen(true);
                }}
                className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/60 shrink-0"
              >
                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                Manager Override (Lift Ban)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Canonical 9-Stage Stepper Ribbon */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] gap-2">
          {CANONICAL_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-emerald-900 dark:bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-[#1c1c22] text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-[#26262d]"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      isCurrent
                        ? "text-emerald-900 dark:text-emerald-400 font-bold"
                        : isCompleted
                        ? "text-slate-700 dark:text-zinc-300"
                        : "text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    {STAGE_DISPLAY_LABELS[stage] || stage}
                  </span>
                </div>
                {idx !== CANONICAL_STAGES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      idx < currentStageIndex ? "bg-emerald-800 dark:bg-emerald-600" : "bg-slate-200 dark:bg-[#26262d]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stage Action Controls Banner */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
        {/* Stage 1: Draft */}
        {currentStage === "Draft" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stage: Draft (Incomplete Registration)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Complete Stage 2 KYC/Medical requirements, or click Register Applicant if requirements are already met.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Register Applicant
                  </>
                )}
              </Button>
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/edit`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Registration Form
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stage 2: Registered */}
        {currentStage === "Registered" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Stage: Registered (Ready for CV Generation)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                All Stage 2 KYC and Medical requirements are verified for {applicant.destination_country || "the corridor"}. Generate the recruitment CV.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => generateCvMutation.mutate()}
                disabled={generateCvMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
                title="Generate bilateral recruitment CV"
              >
                {generateCvMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating CV...
                  </>
                ) : (
                  <>
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Generate CV & Dossier
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Stage 3: CV Generated */}
        {currentStage === "CV Generated" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Stage: CV Generated (Available in Agent Portal)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                {isSaudiApplicant ? (
                  <>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                      Musaned verified before CV generation
                    </span>
                    {applicant.musaned_reference_no ? (
                      <>
                        {" "}• Ref: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.musaned_reference_no}</strong>
                      </>
                    ) : null}
                    . Candidate is published and eligible for international Agent Portal discovery and selection.
                  </>
                ) : (
                  <>
                    Candidate CV record is created and published for {applicant.destination_country || "Kuwait"}. International partner agencies can discover, select, and reserve this candidate via the Agent Portal.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSaudiApplicant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMusanedModalOpen(true)}
                  className="text-xs border-slate-300 dark:border-[#26262d]"
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  View Musaned Record
                </Button>
              )}
              {activePlacement && (
                <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                  <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold">
                    <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload & Parse Musaned Contract
                  </Button>
                </Link>
              )}
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/cv`}>
                <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-[#26262d]">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View Official CV
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stage 4: Selected */}
        {currentStage === "Selected" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Stage: Selected (Placement Created — Corridor Clearance Setup)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Placement is active for {applicant.destination_country || "Saudi Arabia"} corridor. Upload the signed employment contract and confirm medical fitness to advance to Processing.
              </p>
              {!hasUploadedContract && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/60 w-fit mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Contract upload required before advancing to the next stage</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`}>
                <Button
                  variant={hasUploadedContract ? "outline" : "default"}
                  size="sm"
                  className={
                    hasUploadedContract
                      ? "text-xs border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/30"
                      : "text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                  }
                >
                  {hasUploadedContract ? (
                    <>
                      <FileCheck2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Contract Attached
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                      Upload Contract (Required)
                    </>
                  )}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMedical1ModalOpen(true)}
                className={`text-xs ${
                  (activePlacement?.medical_selected_status === "FIT" || applicant?.medical_status === "FIT") && (activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date)
                    ? "border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/50"
                    : "border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-400 hover:bg-amber-50"
                }`}
              >
                <HeartPulse className="mr-1.5 h-3.5 w-3.5" />
                Medical Screening: {(activePlacement?.medical_selected_status === "FIT" || applicant?.medical_status === "FIT") ? "FIT" : (activePlacement?.medical_selected_status || applicant?.medical_status || "Pending")}
                {(activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date) ? ` (${activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date})` : ""}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!hasUploadedContract) {
                    toast.error("Signed Contract Required", {
                      description: "Signed contract must be uploaded on the system before this selected candidate can proceed to Processing.",
                      action: {
                        label: "Upload Contract",
                        onClick: () => router.push(`/applicants/${encodeURIComponent(applicant.name)}/contractor-doc`),
                      },
                    });
                    return;
                  }
                  const isFit = activePlacement?.medical_selected_status === "FIT" || applicant?.medical_status === "FIT";
                  const medDate = activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date;
                  if (!isFit || !medDate) {
                    toast.error("Medical FIT & Examination Date Required", {
                      description: "Candidate's medical status must be entered as FIT and examination date provided before advancing to Processing.",
                    });
                    setIsMedical1ModalOpen(true);
                    return;
                  }
                  advanceToProcessingMutation.mutate();
                }}
                disabled={advanceToProcessingMutation.isPending || !hasUploadedContract}
                className={
                  hasUploadedContract &&
                  (activePlacement?.medical_selected_status === "FIT" || applicant?.medical_status === "FIT") &&
                  (activePlacement?.medical_selected_examination_date || applicant?.medical_issue_date)
                    ? "bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold"
                    : "bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed text-xs font-semibold"
                }
                title={
                  !hasUploadedContract
                    ? "Upload signed contract first to enable advancing to Processing"
                    : undefined
                }
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" /> Advance to Processing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerEarlyCommissionMutation.mutate()}
                disabled={triggerEarlyCommissionMutation.isPending}
                className="text-xs border-slate-300 dark:border-[#26262d]"
              >
                <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Accrue Early Commission
              </Button>
              <Button
                onClick={() => setIsAssignModalOpen(true)}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Edit Staff
              </Button>
            </div>
          </div>
        )}

        {/* Stage 6: Processing (V2 Placement & Dynamic Clearance Steps) */}
        {(currentStage === "Processing" || currentStage === "Selected" || Boolean(activePlacement)) && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  Stage: Processing(LMIS and Te'shir) ({isKuwaitApplicant ? "Kuwait Corridor Clearances" : "Saudi Corridor Clearances"})
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  {activePlacement ? (
                    <>
                      Active Placement: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{activePlacement.name}</strong> • Contractor: <strong>{activePlacement.contractor || "Direct"}</strong> • Visa: <strong>{activePlacement.visa_number || "Pending"}</strong>
                    </>
                  ) : (
                    "Candidate is allocated for placement processing. Clearance steps will dynamically execute per corridor."
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs border-slate-300 dark:border-[#26262d] shrink-0"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Edit Staff
              </Button>
            </div>

            {/* Dynamic Clearance Steps Grid: Processing Stage contains LMIS and Te'shir clearance steps (Embassy is handled in Embassy stage) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {processingClearanceSteps.length > 0 ? (
                processingClearanceSteps.map((step) => {
                  return (
                    <div key={step.name} className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileCheck2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> {step.step_type}
                        </span>
                        <Badge variant={step.status === "Issued" || step.status === "Complete" ? "success" : step.status === "Rejected" ? "destructive" : "warning"}>
                          {step.status || "Pending"}
                        </Badge>
                      </div>
                      <p className="text-slate-500 dark:text-zinc-400">
                        Officer: <strong className="text-slate-800 dark:text-zinc-200 font-semibold">{getStepOfficerName(step)}</strong>
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-300">
                          Step #{step.sequence_order || 1}
                        </span>
                        {step.date_started && <span>• Started: {step.date_started}</span>}
                        {step.date_completed && <span>• Completed: {step.date_completed}</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 text-center text-xs text-slate-500">
                  No active clearance steps currently queued for this candidate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 7: Stamped (Embassy) */}
        {currentStage === "Stamped" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
                  Stage: Embassy (Visa Endorsed / Stamped)
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Visa stamp confirmed on passport. Proceed to book flight ticket reservation (Stage 8: Ticketed).
                </p>
              </div>
              <Button
                onClick={() => {
                  setTicketingInitialTab("ticket");
                  setIsTicketingModalOpen(true);
                }}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                <Ticket className="mr-1.5 h-3.5 w-3.5" /> Book Flight Ticket
              </Button>
            </div>

            {isAdminOrOps && isSaudiApplicant && (activePlacement as any)?.wakala_payment_status !== "Paid" && (activePlacement as any)?.wakala_payment_status !== "Authorized" && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Administrative Notice: Musaned Wakala Authorization Requirement</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  Wakala authorization status is currently <strong>{(activePlacement as any)?.wakala_payment_status || "Pending"}</strong>. For Saudi Arabia corridor placements, verified Wakala authorization from the Foreign Agency via the Musaned portal is required before Embassy visa stamping can proceed.
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  As an Administrator / Operations Manager, you can review authorization, confirm foreign agency payment, or manage operational step clearances in the Wakala Workspace.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link href="/operational-workspace?tab=wakala">
                    <Button size="sm" variant="outline" className="text-xs border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                      Open Wakala Workspace
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMusanedModalOpen(true)}
                    className="text-xs border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Verify Musaned Contract
                  </Button>
                </div>
              </div>
            )}

            {embassyClearanceStep && (
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-4 space-y-2 text-xs max-w-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> {embassyClearanceStep.step_type}
                  </span>
                  <Badge variant={embassyClearanceStep.status === "Stamped" || embassyClearanceStep.status === "Complete" ? "success" : "warning"}>
                    {embassyClearanceStep.status || "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-zinc-400">
                  Officer: <strong className="text-slate-800 dark:text-zinc-200 font-semibold">{getStepOfficerName(embassyClearanceStep)}</strong>
                </p>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-300">
                    Step #{embassyClearanceStep.sequence_order || 1}
                  </span>
                  {embassyClearanceStep.date_started && <span>• Started: {embassyClearanceStep.date_started}</span>}
                  {embassyClearanceStep.date_completed && <span>• Completed: {embassyClearanceStep.date_completed}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 8: Ticketed */}
        {currentStage === "Ticketed" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                Stage: Ticketed (Flight Ticket Issued)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Ticket confirmed. Perform Pre-Departure Medical 2 check and finalize flight departure clearance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTicketingInitialTab("reschedule");
                  setIsTicketingModalOpen(true);
                }}
                className="text-xs border-slate-300 dark:border-[#26262d]"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reschedule Flight
              </Button>
              <Button
                onClick={() => {
                  setTicketingInitialTab("medical2");
                  setIsTicketingModalOpen(true);
                }}
                className="bg-purple-900 hover:bg-purple-950 dark:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-semibold"
              >
                <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> Verify Medical 2 & Depart
              </Button>
            </div>
          </div>
        )}

        {/* Stage 9: Departed */}
        {currentStage === "Departed" && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <Plane className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                Stage: Departed (Placement Abroad Complete 100%)
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-300">
                Candidate flight departure finalized. Pre-Departure Medical 2 passed.
              </p>
            </div>
            <Badge variant="purple">Completed</Badge>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Personal, Education & Identification Details */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Personal & Contact */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Personal & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">First Name</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.first_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Middle / Father</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.middle_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Last Name / Grandfather</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.last_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Gender</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.gender || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Religion</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.religion || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Marital Status</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.marital_status || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Children Count</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.children ?? 0}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Primary Phone</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.phone_number || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">City / Country</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.city ? `${applicant.city}, ${applicant.country || "Ethiopia"}` : (applicant.country || "Ethiopia")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Travel & Identification */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Travel & Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Number</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{applicant.passport_number || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Place of Issue</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.place_of_issue || "Addis Ababa"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Issue Date</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.passport_issue_date || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Passport Expiry</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.passport_expiry || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Date of Birth</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">National / Fayda ID</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.national_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Labour ID</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">{applicant.labour_id || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Job Applied</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.job_applied || "House Maid / General"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Destination</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.destination_country || "Saudi Arabia"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Skills, Education & Experience */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Skills, Education & Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Highest Education</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{applicant.highest_education || applicant.education || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">English Level</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{applicant.english_level || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Arabic Level</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{applicant.arabic_level || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Work Abroad</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{applicant.experience_country ? `${applicant.experience_country} (${applicant.experience_period || "1"} yrs)` : "None / First Timer"}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-[#222227] pt-3">
                <span className="text-slate-500 dark:text-zinc-400 block mb-1.5 font-semibold">Practical Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Cooking", val: applicant.skill_cooking },
                    { label: "Cleaning", val: applicant.skill_cleaning },
                    { label: "Washing", val: applicant.skill_washing },
                    { label: "Ironing", val: applicant.skill_ironing },
                    { label: "Baby Sitting", val: applicant.skill_baby_sitting },
                    { label: "Children Care", val: applicant.skill_children_care },
                    { label: "Arabic Cooking", val: applicant.skill_arabic_cooking },
                    { label: "Sewing", val: applicant.skill_sewing },
                    { label: "Elderly Care", val: applicant.skill_elderly_care },
                  ].filter(s => s.val === 1 || s.val === "1" || s.val === "YES" || s.val === true).length > 0 ? (
                    [
                      { label: "Cooking", val: applicant.skill_cooking },
                      { label: "Cleaning", val: applicant.skill_cleaning },
                      { label: "Washing", val: applicant.skill_washing },
                      { label: "Ironing", val: applicant.skill_ironing },
                      { label: "Baby Sitting", val: applicant.skill_baby_sitting },
                      { label: "Children Care", val: applicant.skill_children_care },
                      { label: "Arabic Cooking", val: applicant.skill_arabic_cooking },
                      { label: "Sewing", val: applicant.skill_sewing },
                      { label: "Elderly Care", val: applicant.skill_elderly_care },
                    ]
                      .filter(s => s.val === 1 || s.val === "1" || s.val === "YES" || s.val === true)
                      .map(s => (
                        <span key={s.label} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ {s.label}
                        </span>
                      ))
                  ) : (
                    <span className="text-slate-400 italic">No skills registered</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Emergency Contacts & Family Member */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Emergency Reference & Family Member
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Contact Person</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_name || applicant.emergency_contact_name || applicant.next_of_kin_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Phone Number</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_phone || applicant.emergency_contact_phone || applicant.next_of_kin_contact || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400">Relationship</span>
                <p className="font-semibold text-slate-900 dark:text-white">{applicant.contact_person_relation || applicant.emergency_relationship || applicant.next_of_kin_relationship || "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Embedded Financial Sub-Table (IncomeExpenseLog) */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" /> Embedded Financial Ledger (Income & Expense)
              </CardTitle>
              <div className="text-right text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Net: </span>
                <strong className={`font-mono ${netCandidateFinancials >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {netCandidateFinancials >= 0 ? "+" : "-"}${Math.abs(netCandidateFinancials).toLocaleString()}
                </strong>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-[#222227] text-xs">
                {allApplicantFees.length > 0 ? (
                  allApplicantFees.map((log: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <div>
                        <span className={`font-bold mr-2 ${log.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          [{log.transaction_type}]
                        </span>
                        <span className="text-slate-800 dark:text-zinc-200">{log.description || "Fee deposit"}</span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className={log.transaction_type === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {log.transaction_type === "Income" ? "+" : "-"}${Number(log.amount).toLocaleString()}
                        </strong>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">{log.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">No transaction logs recorded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Medical Watchdog Badges & Compliance Summary */}
        <div className="space-y-6 lg:col-span-4">

          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                Medical & Compliance Expiry Monitor
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMedical1ModalOpen(true)}
                className="text-[11px] h-7 px-2 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50"
              >
                <Edit className="h-3 w-3 mr-1" /> Enter Medical
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Medical Status</span>
                <Badge variant={(applicant?.medical_status === "FIT" || activePlacement?.medical_selected_status === "FIT") ? "success" : "destructive"}>
                  {applicant?.medical_status === "FIT" || activePlacement?.medical_selected_status === "FIT" ? "FIT" : (applicant?.medical_status || activePlacement?.medical_selected_status || "Pending")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Medical Exam Date</span>
                <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                  {applicant?.medical_issue_date || activePlacement?.medical_selected_examination_date || "Not Set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Medical Expiry</span>
                <Badge variant={medStatus.variant} className={medStatus.isPulsing ? "animate-pulse" : ""}>
                  {medStatus.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">COC Status</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">{applicant.coc_status || "Pending"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Passport Expiry</span>
                <Badge variant={passStatus.variant}>{passStatus.label}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Fees & Financials Ledger */}
          <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  Candidate Fees & Expenses
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLogFeeModalOpen(true)}
                    className="h-6 px-2 text-[11px] font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Log Fee
                  </Button>
                  <Badge variant={totalCandidateExpense > 0 || totalCandidateIncome > 0 ? "success" : "neutral"}>
                    {allApplicantFees.length} Record{allApplicantFees.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#16161b] border border-slate-200/60 dark:border-[#26262d]">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">Total Income</span>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    +${totalCandidateIncome.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">Total Expense</span>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                    -${totalCandidateExpense.toLocaleString()}
                  </p>
                </div>
              </div>

              {allApplicantFees.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic py-1 text-center">
                  No fees or clearance expenses recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allApplicantFees.map((fee: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-100 dark:border-[#222227] bg-white dark:bg-[#121215]"
                    >
                      <div className="space-y-0.5 max-w-[70%]">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                          {fee.description || fee.source_doctype || "Clearance Fee"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {fee.date || "Today"} • {fee.source_doctype || "Clearance"}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          fee.transaction_type === "Income"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {fee.transaction_type === "Income" ? "+" : "-"}${Number(fee.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Employee Modal */}
      {applicant && (
        <AssignEmployeeModal
          applicantId={applicant.name || applicantId}
          applicantName={applicant.full_name || applicant.first_name || "Applicant"}
          applicantIds={[applicant.name || applicantId]}
          applicantNames={[applicant.full_name || applicant.first_name || "Applicant"]}
          placementName={activePlacement?.name}
          destinationCountry={activePlacement?.destination_country || applicant.destination_country}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["my-clearance-steps"] });
            queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
          }}
        />
      )}


      {/* Cancel Process Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Ban className="h-5 w-5" /> Cancel Applicant Process
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Are you sure you want to cancel the process for {applicant.full_name}? Please provide mandatory cancellation remarks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <Label className="font-semibold">Cancellation Remarks *</Label>
            <Input
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="e.g., Candidate withdrew application / Medical unfitness"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || !cancelRemarks.trim()}
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Musaned Pre-Registration Modal */}
      {isSaudiApplicant && (
        <MusanedVerificationModal
          applicant={applicant}
          isOpen={isMusanedModalOpen}
          onClose={() => setIsMusanedModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Muayena Direct Placement Modal */}
      <MuayenaPlacementModal
        isOpen={isMuayenaModalOpen}
        onClose={() => setIsMuayenaModalOpen(false)}
        applicantId={applicant.name}
        applicantName={applicant.full_name || applicant.name}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
        }}
      />

      {/* Ticketing & Departure Workspace Modal */}
      <TicketingDepartureModal
        isOpen={isTicketingModalOpen}
        onClose={() => setIsTicketingModalOpen(false)}
        placement={activePlacement || null}
        applicantName={applicant.full_name || applicant.name}
        initialTab={ticketingInitialTab}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
        }}
      />

      {/* Stage 1 Medical Gate Dialog */}
      <Dialog open={isMedical1ModalOpen} onOpenChange={setIsMedical1ModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <HeartPulse className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Record / Update Medical Result
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selected to Processing Gate: Enter medical screening fitness result (must be FIT) and examination date for candidate to proceed to Processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="font-semibold">Medical Result *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={med1Status === "FIT" ? "default" : "outline"}
                  onClick={() => setMed1Status("FIT")}
                  className={med1Status === "FIT" ? "bg-emerald-900 hover:bg-emerald-950 text-white" : "border-slate-300"}
                >
                  FIT (Passed)
                </Button>
                <Button
                  type="button"
                  variant={med1Status === "UNFIT" ? "destructive" : "outline"}
                  onClick={() => setMed1Status("UNFIT")}
                  className={med1Status === "UNFIT" ? "bg-rose-700 hover:bg-rose-800 text-white" : "border-slate-300"}
                >
                  UNFIT (Failed)
                </Button>
              </div>
            </div>

            <div>
              <Label className="font-semibold">Examination Date *</Label>
              <Input
                type="date"
                value={med1Date}
                onChange={(e) => setMed1Date(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold">Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={med1Expiry}
                onChange={(e) => setMed1Expiry(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsMedical1ModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordMedical1Mutation.mutate()}
              disabled={recordMedical1Mutation.isPending || !med1Date}
              className="bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
            >
              {recordMedical1Mutation.isPending ? "Recording..." : "Save Medical Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Multiple Candidate Fees / Expenses Dialog */}
      <Dialog open={isLogFeeModalOpen} onOpenChange={setIsLogFeeModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <DollarSign className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Log Candidate Fees &amp; Clearance Expenses
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record multiple income entries or operational clearance expenses for candidate {applicant?.full_name || applicantId}. Entries are forwarded directly to the Finance ledger approval queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {profileFees.map((entry, idx) => (
              <div
                key={entry.id}
                className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-[#2b2b35] bg-slate-50/60 dark:bg-[#17171e]"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-[#25252e]">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Fee Item #{idx + 1}
                  </span>
                  {profileFees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProfileFeeRow(entry.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Direction</Label>
                    <select
                      value={entry.direction}
                      onChange={(e) =>
                        handleUpdateProfileFeeRow(entry.id, {
                          direction: e.target.value as "Expense" | "Income",
                        })
                      }
                      className="h-8 w-full mt-1 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2 text-xs"
                    >
                      <option value="Expense">Expense (Agency Paid)</option>
                      <option value="Income">Income (Candidate Paid)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Amount *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={entry.amount}
                      onChange={(e) => handleUpdateProfileFeeRow(entry.id, { amount: e.target.value })}
                      className="h-8 mt-1 text-xs bg-white dark:bg-[#1a1a20]"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Currency</Label>
                    <select
                      value={entry.currency}
                      onChange={(e) =>
                        handleUpdateProfileFeeRow(entry.id, {
                          currency: e.target.value as V2SupportedCurrency,
                        })
                      }
                      className="h-8 w-full mt-1 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2 text-xs"
                    >
                      <option value="ETB">ETB</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Stage / Category</Label>
                    <select
                      value={entry.stage}
                      onChange={(e) => handleUpdateProfileFeeRow(entry.id, { stage: e.target.value })}
                      className="h-8 w-full mt-1 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-2 text-xs"
                    >
                      <option value="Registration">Registration</option>
                      <option value="Selected">Selected / Contract</option>
                      <option value="LMIS Clearance">LMIS Clearance</option>
                      <option value="Taeshir / Biometrics">Taeshir / Injaz</option>
                      <option value="Embassy Clearance">Embassy Clearance</option>
                      <option value="Departure">Departure / Ticketing</option>
                      <option value="General">General Administrative</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Description / Receipt Note</Label>
                  <Input
                    placeholder="e.g. GAMCA medical screening fee, Biometrics appointment receipt"
                    value={entry.description}
                    onChange={(e) => handleUpdateProfileFeeRow(entry.id, { description: e.target.value })}
                    className="h-8 mt-1 text-xs bg-white dark:bg-[#1a1a20]"
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddProfileFeeRow}
              className="h-7 text-xs border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Another Fee Entry
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsLogFeeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProfileFees}
              disabled={isSubmittingProfileFees}
              className="bg-emerald-900 hover:bg-emerald-950 text-white font-semibold text-xs"
            >
              {isSubmittingProfileFees ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                `Submit ${profileFees.filter((f) => parseFloat(f.amount) > 0).length || profileFees.length} Fee Entry to Finance`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Country Ban (Ashara Teyezuwal) Dialog */}
      <Dialog open={isCountryBanModalOpen} onOpenChange={setIsCountryBanModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Set Country Ban (Ashara Teyezuwal)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Establish a permanent per-applicant country blacklist. This candidate will be restricted from placement in the specified corridor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Target Destination Country *</Label>
              <select
                value={banCountry}
                onChange={(e) => setBanCountry(e.target.value)}
                className="h-9 w-full mt-1 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-3 text-xs font-semibold"
              >
                <option value="Kuwait">Kuwait</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Qatar">Qatar</option>
                <option value="Jordan">Jordan</option>
                <option value="Oman">Oman</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Written Reason / Justification *</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Police CID finger-print match / previous deportation / medical disqualification"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1 text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                A written reason is required and will be permanently recorded in the Process Event audit trail.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCountryBanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => setCountryBanMutation.mutate()}
              disabled={setCountryBanMutation.isPending || !banReason.trim()}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
            >
              {setCountryBanMutation.isPending ? "Setting Ban..." : "Confirm Country Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Country Ban (Manager Override) Dialog */}
      <Dialog open={isLiftBanModalOpen} onOpenChange={setIsLiftBanModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Unlock className="h-5 w-5 text-emerald-600" />
              Manager Override — Lift Country Ban
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Only authorized management accounts can remove a permanent blacklist entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {banToLift && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-zinc-200">
                  Target Ban: {banToLift.country} ({banToLift.name})
                </p>
                <p className="text-slate-600 dark:text-zinc-400 text-[11px]">
                  Original Reason: {banToLift.reason || "—"}
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Manager Written Override Reason *</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Cleared by embassy appeal / diplomatic clearance certificate provided"
                value={liftBanReason}
                onChange={(e) => setLiftBanReason(e.target.value)}
                className="mt-1 text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                This override will be logged in the immutable Process Event history.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsLiftBanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => removeCountryBanMutation.mutate()}
              disabled={removeCountryBanMutation.isPending || !liftBanReason.trim()}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs"
            >
              {removeCountryBanMutation.isPending ? "Lifting Ban..." : "Lift Ban with Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Applicant Dialog */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700 dark:text-rose-400">
              <Ban className="h-5 w-5 text-rose-600" />
              Cancel Applicant Process
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Cancelling this applicant will freeze any active placement and linked clearance steps to Cancelled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Cancellation Reason / Remarks *</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Candidate withdrew consent / Medical disqualification / Family emergency"
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
                className="mt-1 text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                A written justification is mandatory and permanently logged in the audit trail.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              Keep Active
            </Button>
            <Button
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || !cancelRemarks.trim()}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Applicant Dialog */}
      <Dialog open={isRestartModalOpen} onOpenChange={setIsRestartModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#222227]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-400">
              <RotateCcw className="h-5 w-5 text-emerald-700" />
              Restart Applicant Case
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Restarting returns this cancelled candidate to the pipeline, automatically incrementing the cycle count.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Target Restart Status *</Label>
              <select
                value={restartTargetStatus}
                onChange={(e) => setRestartTargetStatus(e.target.value as "Draft" | "Registered")}
                className="h-9 w-full mt-1 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#1a1a20] px-3 text-xs font-semibold"
              >
                <option value="Draft">Draft (Full re-editing allowed)</option>
                <option value="Registered">Registered (Directly validated for selection)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Selecting Registered will automatically validate that all track-specific field-floor requirements are satisfied.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsRestartModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => restartMutation.mutate(restartTargetStatus)}
              disabled={restartMutation.isPending}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs"
            >
              {restartMutation.isPending ? "Restarting..." : `Restart to ${restartTargetStatus}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
