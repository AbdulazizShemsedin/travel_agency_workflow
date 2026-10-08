"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HeartPulse,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Clock,
  UserCheck,
  Building2,
  Globe,
} from "lucide-react";
import { listPlacementsV2, V2PlacementRecord, recordSelectedMedicalResultV2, recordPredepartureMedicalResultV2 } from "@/lib/api/v2/placements";
import { listApplicantsV2, V2ApplicantDetails } from "@/lib/api/v2/applicants";
import { LoadError } from "@/components/ui/LoadError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MedicalWorkspaceProps {
  corridorFilter?: string;
  onCorridorChange?: (corridor: string) => void;
}

interface MergedMedicalRecord {
  placementName: string;
  applicantId: string;
  fullName: string;
  passportNumber: string;
  destinationCountry: string;
  agencyName: string;
  targetJob: string;
  placementStatus: string;
  // Medical 1 (Stage 1 / Selected)
  medicalSelectedStatus?: string;
  medicalSelectedExamDate?: string;
  medicalSelectedExpiryDate?: string;
  // Medical 2 (Stage 2 / Ticketed)
  medical2Status?: string;
  // Registration Medical
  registrationMedicalStatus?: string;
  registrationMedicalExpiry?: string;
  isCoveredByRegistrationMedical: boolean;
}

export function MedicalWorkspace({
  corridorFilter = "All",
  onCorridorChange,
}: MedicalWorkspaceProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<
    "all" | "medical_1" | "medical_2" | "fit" | "unfit"
  >("medical_1");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog State: Medical 1 (Selected Stage)
  const [selectedRecordForMed1, setSelectedRecordForMed1] = React.useState<MergedMedicalRecord | null>(null);
  const [med1Status, setMed1Status] = React.useState<"FIT" | "UNFIT">("FIT");
  const [med1ExamDate, setMed1ExamDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [med1ExpiryDate, setMed1ExpiryDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  });

  // Dialog State: Medical 2 (Pre-Departure)
  const [selectedRecordForMed2, setSelectedRecordForMed2] = React.useState<MergedMedicalRecord | null>(null);
  const [med2Status, setMed2Status] = React.useState<"FIT" | "UNFIT">("FIT");

  // Query: Placements
  const {
    data: placements = [],
    isLoading: isPlcLoading,
    error: plcError,
    refetch: refetchPlacements,
  } = useQuery({
    queryKey: ["v2_medical_placements"],
    queryFn: () => listPlacementsV2(),
    staleTime: 15000,
  });

  // Query: Applicants
  const {
    data: applicants = [],
    isLoading: isAppLoading,
    error: appError,
    refetch: refetchApplicants,
  } = useQuery({
    queryKey: ["v2_medical_applicants"],
    queryFn: () => listApplicantsV2(),
    staleTime: 15000,
  });

  const handleRefreshAll = () => {
    refetchPlacements();
    refetchApplicants();
  };

  // Merge placements with applicant details
  const mergedRecords: MergedMedicalRecord[] = React.useMemo(() => {
    const appMap = new Map<string, V2ApplicantDetails>();
    for (const app of applicants) {
      if (app.name) appMap.set(app.name.toLowerCase().trim(), app);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const records: MergedMedicalRecord[] = [];
    for (const plc of placements) {
      if (plc.status === "Cancelled") continue;

      const app = plc.applicant ? appMap.get(plc.applicant.toLowerCase().trim()) : undefined;
      const fullName = (
        app?.full_name ||
        plc.full_name ||
        plc.applicant_name ||
        (app ? `${app.first_name || ""} ${app.last_name || ""}`.trim() : "") ||
        "Unknown Candidate"
      ).toUpperCase();

      const passportNumber = app?.passport_number || "—";
      const destinationCountry = plc.destination_country || app?.destination_country || "—";
      const agencyName = plc.contractor_name || plc.contractor || (app as any)?.contractor_name || "—";
      const targetJob = plc.target_job || app?.target_job || "Housemaid";

      const regStatus = (app?.medical_status || "").toUpperCase().trim();
      const regExpiry = app?.medical_expiry_date || undefined;
      const isCovered = Boolean(
        regStatus === "FIT" &&
        regExpiry &&
        regExpiry >= todayStr
      );

      records.push({
        placementName: plc.name,
        applicantId: plc.applicant || "",
        fullName,
        passportNumber,
        destinationCountry,
        agencyName,
        targetJob,
        placementStatus: plc.status,
        medicalSelectedStatus: (plc.medical_selected_status || "").toUpperCase().trim() || undefined,
        medicalSelectedExamDate: plc.medical_selected_examination_date || undefined,
        medicalSelectedExpiryDate: plc.medical_selected_expiry_date || undefined,
        medical2Status: (plc.medical_2_status || "").toUpperCase().trim() || undefined,
        registrationMedicalStatus: regStatus || undefined,
        registrationMedicalExpiry: regExpiry,
        isCoveredByRegistrationMedical: isCovered,
      });
    }

    return records;
  }, [placements, applicants]);

  // Filter records
  const filteredRecords = React.useMemo(() => {
    return mergedRecords.filter((rec) => {
      // Corridor filter
      if (corridorFilter && corridorFilter !== "All") {
        if (rec.destinationCountry.toLowerCase() !== corridorFilter.toLowerCase()) {
          return false;
        }
      }

      // Tab filter
      if (activeTab === "medical_1") {
        // Selected stage awaiting medical 1
        if (rec.placementStatus !== "Selected") return false;
      } else if (activeTab === "medical_2") {
        // Ticketed stage awaiting pre-departure medical
        if (rec.placementStatus !== "Ticketed") return false;
      } else if (activeTab === "fit") {
        const isMed1Fit = rec.medicalSelectedStatus === "FIT" || rec.isCoveredByRegistrationMedical;
        const isMed2Fit = rec.medical2Status === "FIT";
        if (!isMed1Fit && !isMed2Fit) return false;
      } else if (activeTab === "unfit") {
        const isMed1Unfit = rec.medicalSelectedStatus === "UNFIT";
        const isMed2Unfit = rec.medical2Status === "UNFIT";
        if (!isMed1Unfit && !isMed2Unfit) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rec.fullName.toLowerCase().includes(q);
        const matchPassport = rec.passportNumber.toLowerCase().includes(q);
        const matchAgency = rec.agencyName.toLowerCase().includes(q);
        const matchCountry = rec.destinationCountry.toLowerCase().includes(q);
        if (!matchName && !matchPassport && !matchAgency && !matchCountry) {
          return false;
        }
      }

      return true;
    });
  }, [mergedRecords, activeTab, corridorFilter, searchQuery]);

  // Mutation: Record Medical 1 (Selected Stage)
  const med1Mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecordForMed1) return;
      await recordSelectedMedicalResultV2(
        selectedRecordForMed1.placementName,
        med1Status,
        med1ExamDate || undefined,
        med1Status === "FIT" ? med1ExpiryDate || undefined : undefined
      );
    },
    onSuccess: async () => {
      toast.success(
        `Medical 1 result (${med1Status}) recorded for ${selectedRecordForMed1?.fullName}`
      );
      setSelectedRecordForMed1(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v2_medical_placements"] }),
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["applicants"] }),
      ]);
      handleRefreshAll();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record Medical 1 result");
    },
  });

  // Mutation: Record Medical 2 (Pre-Departure)
  const med2Mutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecordForMed2) return;
      await recordPredepartureMedicalResultV2(
        selectedRecordForMed2.placementName,
        med2Status
      );
    },
    onSuccess: async () => {
      toast.success(
        `Pre-departure medical (${med2Status}) recorded for ${selectedRecordForMed2?.fullName}`
      );
      setSelectedRecordForMed2(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v2_medical_placements"] }),
        queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] }),
        queryClient.invalidateQueries({ queryKey: ["applicants"] }),
      ]);
      handleRefreshAll();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record pre-departure medical");
    },
  });

  if (plcError || appError) {
    return (
      <LoadError
        title="Failed to Load Medical Examination Records"
        error={plcError || appError}
        onRetry={handleRefreshAll}
      />
    );
  }

  const isLoading = isPlcLoading || isAppLoading;

  // Counters for tabs
  const countMed1 = mergedRecords.filter((r) => r.placementStatus === "Selected").length;
  const countMed2 = mergedRecords.filter((r) => r.placementStatus === "Ticketed").length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#121217] p-4 rounded-2xl border border-slate-200 dark:border-[#222228] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Medical Examination Workspace
              </h2>
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase border-emerald-300 text-emerald-800 dark:text-emerald-300">
                Medical Officer Desk
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Record Stage 1 (Selected) and Stage 2 (Pre-departure ~72h) medical fitness determinations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCorridorChange && (
            <select
              value={corridorFilter}
              onChange={(e) => onCorridorChange(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-slate-50 dark:bg-[#16161d] font-semibold text-slate-700 dark:text-zinc-200"
            >
              <option value="All">All Corridors</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="Kuwait">Kuwait</option>
            </select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "medical_1" ? "default" : "outline"}
            onClick={() => setActiveTab("medical_1")}
            className={cn(
              "h-8 text-xs font-semibold gap-1.5",
              activeTab === "medical_1" && "bg-emerald-800 hover:bg-emerald-900 text-white"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Stage 1: Selected</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {countMed1}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "medical_2" ? "default" : "outline"}
            onClick={() => setActiveTab("medical_2")}
            className={cn(
              "h-8 text-xs font-semibold gap-1.5",
              activeTab === "medical_2" && "bg-emerald-800 hover:bg-emerald-900 text-white"
            )}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Stage 2: Pre-Departure</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {countMed2}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            className={cn(
              "h-8 text-xs font-semibold",
              activeTab === "all" && "bg-emerald-800 hover:bg-emerald-900 text-white"
            )}
          >
            All Candidates ({mergedRecords.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "fit" ? "default" : "outline"}
            onClick={() => setActiveTab("fit")}
            className={cn(
              "h-8 text-xs font-semibold gap-1 text-emerald-700 dark:text-emerald-400",
              activeTab === "fit" && "bg-emerald-800 hover:bg-emerald-900 text-white"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>FIT</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "unfit" ? "default" : "outline"}
            onClick={() => setActiveTab("unfit")}
            className={cn(
              "h-8 text-xs font-semibold gap-1 text-rose-700 dark:text-rose-400",
              activeTab === "unfit" && "bg-rose-800 hover:bg-rose-900 text-white"
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>UNFIT</span>
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Search candidate, passport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-[#121217]"
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121217] overflow-x-auto shadow-xs">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <HeartPulse className="h-6 w-6 animate-pulse text-emerald-600" />
            <span className="text-xs font-semibold">Loading medical examination records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No candidates matching the current filter criteria.
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#16161d] border-b border-slate-200 dark:border-[#222228] text-slate-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-2.5 px-3 whitespace-nowrap w-10 text-center">#</th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Candidate</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Passport</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Destination</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Agency / Job</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Placement Stage</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Registration Medical</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Stage Medical Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Exam / Expiry Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d1d24]">
              {filteredRecords.map((row, idx) => {
                const isSelectedStage = row.placementStatus === "Selected";
                const isTicketedStage = row.placementStatus === "Ticketed";

                return (
                  <tr
                    key={row.placementName}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#16161d] transition-colors"
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Candidate */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase">
                          {row.fullName.substring(0, 2)}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white uppercase truncate block max-w-[170px]">
                          {row.fullName}
                        </span>
                      </div>
                    </td>

                    {/* Passport */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-medium text-slate-700 dark:text-zinc-300">
                      {row.passportNumber}
                    </td>

                    {/* Destination */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-zinc-200">
                        <Globe className="h-3 w-3 text-slate-400" />
                        {row.destinationCountry}
                      </span>
                    </td>

                    {/* Agency / Job */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-zinc-200 font-medium truncate max-w-[140px]">
                          {row.agencyName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {row.targetJob}
                        </span>
                      </div>
                    </td>

                    {/* Placement Stage */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold uppercase py-0 px-2",
                          row.placementStatus === "Selected" && "border-blue-400 text-blue-700 bg-blue-50/50 dark:bg-blue-950/40 dark:text-blue-300",
                          row.placementStatus === "Ticketed" && "border-indigo-400 text-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/40 dark:text-indigo-300",
                          row.placementStatus === "Processing" && "border-amber-400 text-amber-700 bg-amber-50/50 dark:bg-amber-950/40 dark:text-amber-300",
                          row.placementStatus === "Stamped" && "border-emerald-400 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40 dark:text-emerald-300",
                          row.placementStatus === "Departed" && "border-slate-400 text-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-slate-300"
                        )}
                      >
                        {row.placementStatus}
                      </Badge>
                    </td>

                    {/* Registration Medical */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {row.isCoveredByRegistrationMedical ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 text-[10px] font-bold">
                            Covered (FIT)
                          </Badge>
                          {row.registrationMedicalExpiry && (
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Expires {row.registrationMedicalExpiry}
                            </span>
                          )}
                        </div>
                      ) : row.registrationMedicalStatus === "FIT" ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                            FIT (Expired)
                          </Badge>
                          {row.registrationMedicalExpiry && (
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Expired {row.registrationMedicalExpiry}
                            </span>
                          )}
                        </div>
                      ) : row.registrationMedicalStatus === "UNFIT" ? (
                        <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                          UNFIT
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Stage Medical Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {isSelectedStage ? (
                        row.medicalSelectedStatus === "FIT" || row.isCoveredByRegistrationMedical ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            FIT (Stage 1)
                          </Badge>
                        ) : row.medicalSelectedStatus === "UNFIT" ? (
                          <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                            UNFIT (Stage 1)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 text-[10px]">
                            Awaiting Medical 1
                          </Badge>
                        )
                      ) : isTicketedStage ? (
                        row.medical2Status === "FIT" ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            FIT (Pre-Departure)
                          </Badge>
                        ) : row.medical2Status === "UNFIT" ? (
                          <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                            UNFIT (Pre-Departure)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 text-[10px]">
                            Awaiting Medical 2
                          </Badge>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {row.medicalSelectedStatus || row.medical2Status || "—"}
                        </span>
                      )}
                    </td>

                    {/* Exam / Expiry Date (Stage 1 only, Stage 2 date is hidden as per specs) */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {isSelectedStage ? (
                        <div className="flex flex-col items-center text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                          <span>Exam: {row.medicalSelectedExamDate || "—"}</span>
                          <span>Exp: {row.medicalSelectedExpiryDate || "—"}</span>
                        </div>
                      ) : isTicketedStage ? (
                        <span className="text-[10px] text-slate-400 italic">
                          72h verification
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      {isSelectedStage ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedRecordForMed1(row);
                              setMed1Status("FIT");
                              setMed1ExamDate(new Date().toISOString().split("T")[0]);
                              const d = new Date();
                              d.setDate(d.getDate() + 90);
                              setMed1ExpiryDate(d.toISOString().split("T")[0]);
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            FIT
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRecordForMed1(row);
                              setMed1Status("UNFIT");
                              setMed1ExamDate(new Date().toISOString().split("T")[0]);
                            }}
                            className="h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            UNFIT
                          </Button>
                        </div>
                      ) : isTicketedStage ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedRecordForMed2(row);
                              setMed2Status("FIT");
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            FIT (M2)
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRecordForMed2(row);
                              setMed2Status("UNFIT");
                            }}
                            className="h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            UNFIT
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog: Record Medical 1 (Selected Stage) */}
      <Dialog
        open={Boolean(selectedRecordForMed1)}
        onOpenChange={(open) => !open && setSelectedRecordForMed1(null)}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-[#121217]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Stage 1 Medical Check (Post-Selection)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Applicant: <strong className="uppercase">{selectedRecordForMed1?.fullName}</strong> ({selectedRecordForMed1?.passportNumber})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Medical Result Determination *</Label>
              <select
                value={med1Status}
                onChange={(e) => setMed1Status(e.target.value as "FIT" | "UNFIT")}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
              >
                <option value="FIT">FIT (Passes Medical Examination)</option>
                <option value="UNFIT">UNFIT (Failed Medical Examination)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Examination Date *</Label>
              <Input
                type="date"
                value={med1ExamDate}
                onChange={(e) => setMed1ExamDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {med1Status === "FIT" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Medical Expiry Date (typically 90 days) *</Label>
                <Input
                  type="date"
                  value={med1ExpiryDate}
                  onChange={(e) => setMed1ExpiryDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {med1Status === "UNFIT" && (
              <div className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="text-[11px]">
                  Marking UNFIT will disqualify candidate and notify the agency.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRecordForMed1(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={med1Mutation.isPending || !med1ExamDate}
              onClick={() => med1Mutation.mutate()}
              className={cn(
                "h-8 text-xs font-semibold text-white",
                med1Status === "FIT"
                  ? "bg-emerald-800 hover:bg-emerald-900"
                  : "bg-rose-700 hover:bg-rose-800"
              )}
            >
              {med1Mutation.isPending ? "Recording..." : `Confirm ${med1Status}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Record Medical 2 (Pre-Departure) */}
      <Dialog
        open={Boolean(selectedRecordForMed2)}
        onOpenChange={(open) => !open && setSelectedRecordForMed2(null)}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-[#121217]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Pre-Departure Medical 2 Verification (~72h)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Applicant: <strong className="uppercase">{selectedRecordForMed2?.fullName}</strong> ({selectedRecordForMed2?.passportNumber})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pre-Departure Determination *</Label>
              <select
                value={med2Status}
                onChange={(e) => setMed2Status(e.target.value as "FIT" | "UNFIT")}
                className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-[#15151a] font-bold"
              >
                <option value="FIT">FIT (Cleared to Board Flight)</option>
                <option value="UNFIT">UNFIT (Cancel Flight & Cancel Placement)</option>
              </select>
            </div>

            {med2Status === "UNFIT" && (
              <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Permanent Disqualification Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Marking UNFIT at this stage will automatically trigger backend cancellation of both Applicant and Placement records.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRecordForMed2(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={med2Mutation.isPending}
              onClick={() => med2Mutation.mutate()}
              className={cn(
                "h-8 text-xs font-semibold text-white",
                med2Status === "FIT"
                  ? "bg-emerald-800 hover:bg-emerald-900"
                  : "bg-rose-700 hover:bg-rose-800"
              )}
            >
              {med2Mutation.isPending ? "Recording..." : `Confirm ${med2Status}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
