"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Ban,
  AlertTriangle,
  Film,
  Video,
  Eye,
  Briefcase,
  Building2,
} from "lucide-react";
import { getApplicantV2, listPlacementsV2, listMyClearanceStepsV2, V2ApplicantDetails } from "@/lib/api/v2";
import { restartApplicantV2, cancelApplicantV2, getApplicantMediaUrlV2 } from "@/lib/api/v2/applicants";
import { ApplicantRegistrationForm } from "@/components/applicant/ApplicantRegistrationForm";
import { UndoLastStepButton } from "@/components/ui/UndoLastStepButton";
import { MuayenaPlacementModal } from "@/components/applicant/MuayenaPlacementModal";
import { SelectForAgencyModal } from "@/components/applicant/SelectForAgencyModal";
import { MedicalBadge } from "@/components/ui/MedicalBadge";
import { useAuth } from "@/components/providers/AuthProvider";
import { isRoleReadOnly } from "@/lib/auth/v2Roles";
import { extractRoleName } from "@/lib/auth/permissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

const MUAYENA_STAGES = [
  "Draft",
  "Registered",
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
  Processing: "Processing (LMIS and Teashir)",
  Stamped: "Stamped / Embassy",
  Ticketed: "Ticketed",
  Departed: "Departed",
};

const IDENTITY_LOCK_STATUSES = new Set([
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
]);

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";
  const queryClient = useQueryClient();

  const { data: applicant, isLoading, isError, refetch: refetchApplicant } = useQuery<V2ApplicantDetails>({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicantV2(applicantId),
    enabled: !!applicantId,
  });

  const { data: placements = [], refetch: refetchPlacements } = useQuery({
    queryKey: ["placements", applicantId],
    queryFn: () => listPlacementsV2([{ applicant: applicantId }]),
    enabled: !!applicantId,
  });

  const refetchAll = React.useCallback(async () => {
    await Promise.all([
      refetchApplicant(),
      refetchPlacements(),
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
      queryClient.invalidateQueries({ queryKey: ["placements"] }),
    ]);
  }, [refetchApplicant, refetchPlacements, queryClient]);

  const activePlacement = React.useMemo(() => {
    if (!placements || placements.length === 0) return null;
    return placements.find((p: any) => p.status !== "Cancelled") || null;
  }, [placements]);

  const { data: clearanceSteps = [] } = useQuery({
    queryKey: ["clearance_steps_for_applicant", activePlacement?.name],
    queryFn: () => listMyClearanceStepsV2(activePlacement!.name),
    enabled: !!activePlacement?.name,
  });

  const taeshirInjazId = React.useMemo(() => {
    const step = clearanceSteps.find(
      (s: any) =>
        s.step_type === "Injaz" ||
        s.step_type === "Taeshir" ||
        String(s.step_type || "").toLowerCase().includes("injaz") ||
        String(s.step_type || "").toLowerCase().includes("taeshir") ||
        String(s.step_type || "").toLowerCase().includes("ta'shir")
    );
    return (step as any)?.injaz_application_id || (step as any)?.e_number || "";
  }, [clearanceSteps]);

  const isMuayena = React.useMemo(() => {
    return (
      applicant?.entry_track === "Muayena" ||
      (applicant as any)?.applicant_type === "Muayena" ||
      Boolean((applicant as any)?.is_muayena) ||
      Boolean(activePlacement?.is_muayena)
    );
  }, [applicant, activePlacement]);

  const enrichedApplicant = React.useMemo(() => {
    if (!applicant) return applicant;
    const trackValue =
      (applicant as any)?.entry_track === "Muayena" ||
      (applicant as any)?.applicant_type === "Muayena" ||
      Boolean((applicant as any)?.is_muayena)
        ? "Muayena"
        : "Standard";
    return {
      ...applicant,
      entry_track: trackValue,
      applicant_type: trackValue,
      is_muayena: trackValue === "Muayena" ? 1 : 0,
      application_number:
        (applicant as any).application_number ||
        taeshirInjazId ||
        (activePlacement as any)?.injaz_application_id ||
        (activePlacement as any)?.e_number ||
        "",
      visa_number: applicant.visa_number || activePlacement?.visa_number || (activePlacement as any)?.visa_reference_number || "",
      sponsor_name: (applicant as any).sponsor_name || activePlacement?.employer_name || (activePlacement as any)?.sponsor_name || "",
      sponsor_id: (applicant as any).sponsor_id || activePlacement?.employer_national_id || (activePlacement as any)?.sponsor_civil_id || "",
      sponsor_phone: (applicant as any).sponsor_phone || (activePlacement as any)?.employer_phone || (activePlacement as any)?.sponsor_phone || "",
      sponsor_address: (applicant as any).sponsor_address || (activePlacement as any)?.employer_address || (activePlacement as any)?.sponsor_address || "",
      sponsor_arabic: (applicant as any).sponsor_arabic || "",
      sponsor_email: (applicant as any).sponsor_email || (activePlacement as any)?.employer_email || (activePlacement as any)?.sponsor_email || "",
      agent: (applicant as any).agent || activePlacement?.saudi_agency_name || (activePlacement as any)?.kuwait_agency_name || "",
      contract_number: (applicant as any).contract_number || activePlacement?.contract_number || "",
      video_url:
        applicant?.video_url ||
        (applicant as any)?.intro_video ||
        (applicant as any)?.video ||
        (activePlacement as any)?.video_url ||
        "",
      intro_video:
        applicant?.video_url ||
        (applicant as any)?.intro_video ||
        (applicant as any)?.video ||
        (activePlacement as any)?.video_url ||
        "",
      video:
        applicant?.video_url ||
        (applicant as any)?.intro_video ||
        (applicant as any)?.video ||
        (activePlacement as any)?.video_url ||
        "",
      active_placement: activePlacement,
    };
  }, [applicant, activePlacement, taeshirInjazId]);

  const candidateVideoUrl = React.useMemo(() => {
    return (
      applicant?.experience_video ||
      applicant?.video_url ||
      (applicant as any)?.intro_video ||
      (applicant as any)?.video ||
      (activePlacement as any)?.video_url ||
      ""
    );
  }, [applicant, activePlacement]);

  const isIdentityLocked = React.useMemo(() => {
    return activePlacement ? IDENTITY_LOCK_STATUSES.has(activePlacement.status) : false;
  }, [activePlacement]);

  // Authoritative stage machine resolution
  const currentStage = React.useMemo(() => {
    if (!applicant) return "Draft";
    const ownStatus = String(applicant.status || applicant.applicant_state || "Draft");
    if (ownStatus === "Cancelled") return "Cancelled";
    if (activePlacement && activePlacement.status) {
      if (String(activePlacement.status) === "Cancelled") return "Cancelled";
      if (["Selected", "Processing", "Stamped", "Ticketed", "Departed"].includes(String(activePlacement.status))) {
        return String(activePlacement.status);
      }
    }
    return ownStatus;
  }, [applicant, activePlacement]);

  const activeStages = isMuayena ? MUAYENA_STAGES : CANONICAL_STAGES;

  const normalizedStageForProgress = React.useMemo(() => {
    if (!isMuayena) return currentStage;
    if (currentStage === "CV Generated") return "Registered";
    if (currentStage === "Selected") return "Processing";
    return currentStage;
  }, [isMuayena, currentStage]);

  const currentStageIndex = activeStages.indexOf(normalizedStageForProgress);

  // Video Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  const {
    data: mediaUrlData,
    isLoading: isMediaLoading,
    refetch: refetchMediaUrl,
  } = useQuery({
    queryKey: ["applicant-media-url", applicant?.name, "experience_video"],
    queryFn: async () => {
      if (!applicant?.name) return null;
      return await getApplicantMediaUrlV2(applicant.name, "experience_video");
    },
    enabled: Boolean(applicant?.name && candidateVideoUrl),
    staleTime: 1000 * 60 * 90, // 90 min (backend signed URL expires in 2 hours)
  });

  const activeVideoPlayUrl = mediaUrlData?.url || candidateVideoUrl;

  // Restart / Resume Modal State
  const [isRestartModalOpen, setIsRestartModalOpen] = React.useState(false);
  const [restartTargetStatus, setRestartTargetStatus] = React.useState<"Draft" | "Registered">("Registered");

  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!applicant) throw new Error("No applicant record to restart.");
      return await restartApplicantV2(applicant.name, restartTargetStatus);
    },
    onSuccess: (data) => {
      setIsRestartModalOpen(false);
      refetchAll();
      toast.success(data?.message || `Applicant restarted to ${restartTargetStatus}.`);
    },
    onError: (err: any) => {
      toast.error("Restart failed", { description: err?.message || String(err) });
    },
  });

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!applicant) throw new Error("No applicant record to cancel.");
      return await cancelApplicantV2(applicant.name, cancelReason.trim() || "Administrative cancellation");
    },
    onSuccess: (data) => {
      setIsCancelModalOpen(false);
      setCancelReason("");
      refetchAll();
      toast.warning(data?.message || "Applicant process cancelled.");
    },
    onError: (err: any) => {
      toast.error("Cancellation failed", { description: err?.message || String(err) });
    },
  });

  const { authUser, roles, hasRole, isReadOnly } = useAuth();
  const [isMuayenaModalOpen, setIsMuayenaModalOpen] = React.useState(false);
  const [isSelectAgencyModalOpen, setIsSelectAgencyModalOpen] = React.useState(false);

  const isManagerOrAdmin = React.useMemo(() => {
    const r = authUser?.roles || [];
    return r.some((role) =>
      ["Admin", "Manager", "System Manager", "Administrator"].includes(role)
    );
  }, [authUser]);

  const canSelectForAgency = React.useMemo(() => {
    if (!isManagerOrAdmin) return false;
    if (isMuayena) return false;
    if (activePlacement) return false;
    if (currentStage === "Cancelled") return false;
    return currentStage === "CV Generated" || currentStage === "Registered";
  }, [isManagerOrAdmin, isMuayena, activePlacement, currentStage]);

  const canCreateMuayena = React.useMemo(() => {
    if (!authUser && roles.length === 0) return false;
    const isSuper = Boolean(
      hasRole("Admin") ||
      hasRole("Manager") ||
      hasRole("System Manager") ||
      (authUser?.roles || []).some(
        (r) =>
          r.toLowerCase() === "admin" ||
          r.toLowerCase() === "manager" ||
          r.toLowerCase() === "system manager"
      )
    );
    if (isSuper) return true;
    if (hasRole("Registrar") && !isReadOnly("Registrar")) return true;
    if (hasRole("Contract Parser") && !isReadOnly("Contract Parser")) return true;
    return false;
  }, [authUser, roles, hasRole, isReadOnly]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">Loading applicant details...</span>
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Applicant Record Not Found</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The requested applicant record could not be found.
        </p>
        <Link href="/applicants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Applicants Directory
          </Button>
        </Link>
      </div>
    );
  }

  const fullName =
    applicant.full_name ||
    [applicant.first_name, applicant.middle_name, applicant.last_name].filter(Boolean).join(" ") ||
    applicant.name;

  const isInternationalReturn = (applicant as any)?.flight_outcome === "International return";

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/applicants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicants List
        </Link>

        {/* Big Name & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              {fullName}
            </h1>

            {/* Destination, Phone, Passport Details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-zinc-300 mt-2">
              <div>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Destination:</span>{" "}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {applicant.destination_country || "—"}
                </strong>
              </div>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <div>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Phone:</span>{" "}
                <strong className="text-slate-900 dark:text-white font-mono font-semibold">
                  {applicant.phone_number || applicant.phone || "—"}
                </strong>
              </div>
              {applicant.passport_number && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 font-medium">Passport:</span>{" "}
                    <strong className="font-mono text-slate-900 dark:text-white font-semibold">
                      {applicant.passport_number}
                    </strong>
                  </div>
                </>
              )}
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Track:</span>
                {isMuayena ? (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold uppercase tracking-wide">
                    Muayena Track
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 text-[11px] font-semibold uppercase">
                    Standard Track
                  </Badge>
                )}
              </div>
              {isMuayena && applicant.muayena_agency && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-zinc-500 font-medium">Agency:</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {applicant.muayena_agency}
                    </strong>
                  </div>
                </>
              )}
              {currentStage === "Cancelled" && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <Badge variant="destructive" className="text-xs uppercase font-bold">
                    Cancelled
                  </Badge>
                </>
              )}
              {isInternationalReturn && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <Badge variant="outline" className="text-xs uppercase font-bold border-amber-400 text-amber-800 bg-amber-50">
                    Departed · International return
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Action Column: Resume / Cancel / Undo Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Select for an Agency Button (0.-23: Staff direct selection with no request step) */}
            {canSelectForAgency && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsSelectAgencyModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                Select for an Agency
              </Button>
            )}

            {/* Make Case (Muayena) Button */}
            {isMuayena && !activePlacement && canCreateMuayena && currentStage !== "Cancelled" && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsMuayenaModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs gap-1.5"
              >
                <Briefcase className="h-3.5 w-3.5" />
                Make Case (Muayena)
              </Button>
            )}

            {/* Play Interview Video Button (when candidate video exists) */}
            {candidateVideoUrl && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsVideoModalOpen(true)}
                className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold gap-1.5 shadow-2xs"
              >
                <Film className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Play Interview Video</span>
              </Button>
            )}

            {/* Resume / Restart Button for Cancelled applicant */}
            {currentStage === "Cancelled" && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsRestartModalOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Resume / Restart Applicant
              </Button>
            )}

            {/* Send Again button for International return */}
            {isInternationalReturn && currentStage !== "Cancelled" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setRestartTargetStatus("Registered");
                  setIsRestartModalOpen(true);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Send Again (Restart)
              </Button>
            )}

            {/* Undo Applicant Step */}
            <UndoLastStepButton
              doctype="Applicant"
              name={applicant.name}
              label="Undo Applicant Step"
              onSuccess={refetchAll}
            />

            {/* Undo Case Step (Placement) */}
            {activePlacement && (
              <UndoLastStepButton
                doctype="Placement"
                name={activePlacement.name}
                label="Undo Case Step"
                onSuccess={refetchAll}
              />
            )}

            {/* Cancel Applicant button (when not already cancelled) */}
            {currentStage !== "Cancelled" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCancelReason("");
                  setIsCancelModalOpen(true);
                }}
                className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel Applicant
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stage Status Bar */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] p-3 sm:p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] lg:min-w-0 gap-2">
          {activeStages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                      isCurrent
                        ? "bg-emerald-900 dark:bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold"
                        : "bg-slate-100 dark:bg-[#1c1c22] text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-[#26262d]"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold whitespace-nowrap",
                      isCurrent
                        ? "text-emerald-900 dark:text-emerald-400 font-bold"
                        : isCompleted
                        ? "text-slate-700 dark:text-zinc-300"
                        : "text-slate-400 dark:text-zinc-500"
                    )}
                  >
                    {STAGE_DISPLAY_LABELS[stage] || stage}
                  </span>
                </div>
                {idx !== activeStages.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2",
                      idx < currentStageIndex ? "bg-emerald-800 dark:bg-emerald-600" : "bg-slate-200 dark:bg-[#26262d]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Candidate Video Interview Player Card (when candidate video exists) */}
      {candidateVideoUrl && (
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#202028] bg-slate-50/70 dark:bg-[#16161c] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <Film className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Candidate Interview Video</span>
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-0 h-4 px-1.5">
                    Ready to Play
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Recorded skill &amp; language interview demonstration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeVideoPlayUrl || candidateVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>
          <div className="p-4 sm:p-5 flex flex-col items-center justify-center bg-slate-950">
            <div className="w-full max-w-2xl rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-black min-h-[220px] flex items-center justify-center">
              {isMediaLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-xs font-medium text-slate-300">Loading secure video stream...</span>
                </div>
              ) : activeVideoPlayUrl ? (
                <video
                  key={activeVideoPlayUrl}
                  src={activeVideoPlayUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[380px] object-contain bg-black"
                  onError={() => {
                    refetchMediaUrl();
                  }}
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Video file is processing or unavailable.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Multi-step Registration Workflow Form pre-filled with existing data */}
      <ApplicantRegistrationForm
        existingApplicantId={applicant.name}
        initialData={enrichedApplicant as any}
        lockedIdentityFields={isIdentityLocked}
        onSuccessRedirect={(id) => {
          queryClient.invalidateQueries({ queryKey: ["applicants"] });
          queryClient.invalidateQueries({ queryKey: ["applicant", id] });
          if (typeof window !== "undefined") {
            window.location.href = "/applicants";
          } else {
            router.push("/applicants");
          }
        }}
      />

      {/* Restart / Resume Modal */}
      <Dialog open={isRestartModalOpen} onOpenChange={setIsRestartModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <RotateCcw className="h-4 w-4" />
              Resume / Restart Applicant
            </DialogTitle>
            <DialogDescription className="text-xs">
              Restart recruitment process for <strong>{fullName}</strong>.
              This restores the applicant and allows regenerating CV and re-entering the placement pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Target Restart Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRestartTargetStatus("Registered")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                  restartTargetStatus === "Registered"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-400"
                )}
              >
                Registered (Ready for CV)
              </button>
              <button
                type="button"
                onClick={() => setRestartTargetStatus("Draft")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold border transition",
                  restartTargetStatus === "Draft"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white dark:bg-[#1a1a22] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-400"
                )}
              >
                Draft (Editable Intake)
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
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={restartMutation.isPending}
              onClick={() => restartMutation.mutate()}
            >
              {restartMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Resuming...</>
              ) : (
                <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Confirm Resume</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Applicant Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Ban className="h-4 w-4" />
              Cancel Applicant Process
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel recruitment for <strong>{fullName}</strong>?
              This will freeze the applicant, active placement, and all associated clearance steps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Cancellation Reason (Required) *
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Candidate withdrew, failed embassy interview, or administrative hold..."
              className="w-full h-20 text-xs"
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
              disabled={cancelMutation.isPending || !cancelReason.trim()}
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

      {/* Video Player Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-slate-800 text-white">
          <DialogHeader className="p-3 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-emerald-400" />
              <DialogTitle className="font-bold text-sm uppercase text-white">
                {fullName} • Interview Video
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-2 sm:p-4 flex items-center justify-center bg-black min-h-[300px]">
            {isMediaLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="ml-2 text-xs text-slate-300">Loading secure video stream...</span>
              </div>
            ) : activeVideoPlayUrl ? (
              <video
                key={activeVideoPlayUrl}
                src={activeVideoPlayUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => {
                  toast.error("Video stream expired or failed to load. Refreshing authorization...");
                  refetchMediaUrl();
                }}
                className="w-full max-h-[500px] object-contain bg-black rounded-lg"
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No video file is available for this applicant.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Select for an Agency Modal (0.-23) */}
      {isSelectAgencyModalOpen && (
        <SelectForAgencyModal
          isOpen={isSelectAgencyModalOpen}
          onClose={() => setIsSelectAgencyModalOpen(false)}
          applicant={applicant}
          onSuccess={refetchAll}
        />
      )}

      {/* Make Case (Muayena) Modal */}
      {isMuayenaModalOpen && (
        <MuayenaPlacementModal
          isOpen={isMuayenaModalOpen}
          onClose={() => setIsMuayenaModalOpen(false)}
          applicantId={applicant.name}
          applicantName={fullName}
          destinationCountry={applicant.destination_country || ""}
          muayenaAgency={applicant.muayena_agency}
          passportNumber={applicant.passport_number}
          onSuccess={() => {
            refetchAll();
          }}
        />
      )}
    </div>
  );
}

