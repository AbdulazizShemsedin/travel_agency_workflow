"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  History,
  Plus,
  Calendar,
  User,
  Plane,
  Briefcase,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Info,
  Check,
  Building2,
  FileText,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";
import {
  getPastRecordFormV2,
  createPastRecordV2,
  listPastRecordsV2,
  undoPastRecordV2,
  V2PastRecordFormConfig,
  V2PastRecordCreatePayload,
  V2PastRecordItem,
  V2PastRecordStepPayload,
  V2PastRecordFeePayload,
} from "@/lib/api/v2";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdminUser } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LoadError } from "@/components/ui/LoadError";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { cn } from "@/lib/utils";

const ALL_STAGES = [
  "Registered",
  "CV Generated",
  "Selected",
  "Processing",
  "Stamped",
  "Ticketed",
  "Departed",
];

export default function PastRecordsPage() {
  const queryClient = useQueryClient();
  const { user, authUser, roles = [], isReadOnly } = useAuth();

  const [activeTab, setActiveTab] = React.useState<"form" | "history">("form");

  // Auth / Permissions
  const isAdmin = Boolean(
    isAdminUser(authUser) ||
    user === "Administrator" ||
    roles.some((r: any) => {
      const s = String(r?.role || r?.name || r).toLowerCase().trim();
      return s === "admin" || s === "administrator" || s === "system manager";
    })
  );

  const isManager = Boolean(
    roles.some((r: any) => {
      const s = String(r?.role || r?.name || r).toLowerCase().trim();
      return s === "manager";
    })
  );

  const isRegistrar = Boolean(
    roles.some((r: any) => {
      const s = String(r?.role || r?.name || r).toLowerCase().trim();
      return s === "registrar";
    })
  );

  const isReadOnlyUser = isReadOnly() || (!isAdmin && !isManager && !isRegistrar);

  // Fetch Form Config
  const {
    data: formConfig,
    isLoading: isLoadingConfig,
    isError: isConfigError,
    error: configError,
    refetch: refetchConfig,
  } = useQuery<V2PastRecordFormConfig>({
    queryKey: ["v2_past_record_form_config"],
    queryFn: () => getPastRecordFormV2(),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch History List
  const {
    data: historyRecords = [],
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<V2PastRecordItem[]>({
    queryKey: ["v2_past_records_list"],
    queryFn: () => listPastRecordsV2(),
    enabled: activeTab === "history",
  });

  // Form State
  const [selectedStage, setSelectedStage] = React.useState<string>("Departed");
  const [entryTrack, setEntryTrack] = React.useState<"Standard" | "Muayena">("Standard");
  const [destCountry, setDestCountry] = React.useState<string>("Saudi Arabia");

  // Worker Data
  const [workerFullName, setWorkerFullName] = React.useState("");
  const [workerPassportNumber, setWorkerPassportNumber] = React.useState("");
  const [workerGender, setWorkerGender] = React.useState<"Female" | "Male">("Female");
  const [workerDob, setWorkerDob] = React.useState("");
  const [workerPob, setWorkerPob] = React.useState("");
  const [workerPassportIssue, setWorkerPassportIssue] = React.useState("");
  const [workerPassportExpiry, setWorkerPassportExpiry] = React.useState("");
  const [workerPlaceOfIssue, setWorkerPlaceOfIssue] = React.useState("");
  const [workerNationalId, setWorkerNationalId] = React.useState("");
  const [workerLabourId, setWorkerLabourId] = React.useState("");
  const [workerPhone, setWorkerPhone] = React.useState("");

  // Timeline Dates
  const [registeredOn, setRegisteredOn] = React.useState("");
  const [cvGeneratedOn, setCvGeneratedOn] = React.useState("");
  const [selectedOn, setSelectedOn] = React.useState("");
  const [processingStartedOn, setProcessingStartedOn] = React.useState("");
  const [stampedOn, setStampedOn] = React.useState("");
  const [ticketedOn, setTicketedOn] = React.useState("");
  const [departedOn, setDepartedOn] = React.useState("");

  // Placement / Case Data
  const [contractor, setContractor] = React.useState("");
  const [contractNumber, setContractNumber] = React.useState("");
  const [contractDate, setContractDate] = React.useState("");
  const [visaNumber, setVisaNumber] = React.useState("");
  const [visaDate, setVisaDate] = React.useState("");
  const [sponsorName, setSponsorName] = React.useState("");
  const [sponsorId, setSponsorId] = React.useState("");
  const [sponsorPhone, setSponsorPhone] = React.useState("");
  const [medicalResult, setMedicalResult] = React.useState("FIT");
  const [medicalDate, setMedicalDate] = React.useState("");
  const [medical2Result, setMedical2Result] = React.useState("FIT");
  const [medical2Date, setMedical2Date] = React.useState("");
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [flightDate, setFlightDate] = React.useState("");
  const [flightTime, setFlightTime] = React.useState("");
  const [airline, setAirline] = React.useState("");
  const [ticketingRemarks, setTicketingRemarks] = React.useState("");

  // Clearance Steps
  const [corridorSteps, setCorridorSteps] = React.useState<V2PastRecordStepPayload[]>([]);

  // Historical Fees
  const [fees, setFees] = React.useState<V2PastRecordFeePayload[]>([]);

  // Commission (Departed only)
  const [hasCommission, setHasCommission] = React.useState(false);
  const [commissionAmount, setCommissionAmount] = React.useState<number | "">("");
  const [commissionCurrency, setCommissionCurrency] = React.useState("SAR");
  const [commissionNotes, setCommissionNotes] = React.useState("");

  // Validation & Submission States
  const [formValidationError, setFormValidationError] = React.useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = React.useState<string | null>(null);

  // Undo Dialog State
  const [undoTargetRecord, setUndoTargetRecord] = React.useState<V2PastRecordItem | null>(null);
  const [undoReason, setUndoReason] = React.useState("");
  const [undoError, setUndoError] = React.useState<string | null>(null);

  // Synchronize available stages based on entry track (Muayena has no CV Generated)
  const availableStages = React.useMemo(() => {
    const rawStages = formConfig?.stages && formConfig.stages.length > 0 ? formConfig.stages : ALL_STAGES;
    if (entryTrack === "Muayena") {
      return rawStages.filter((s) => s !== "CV Generated");
    }
    return rawStages;
  }, [formConfig, entryTrack]);

  // Determine stage rank for progressive field disclosure
  const stageIndex = React.useMemo(() => {
    return availableStages.indexOf(selectedStage);
  }, [availableStages, selectedStage]);

  const hasReached = (stageName: string) => {
    const idx = availableStages.indexOf(stageName);
    return idx !== -1 && idx <= stageIndex;
  };

  // Sync corridor steps when destination country or formConfig changes
  React.useEffect(() => {
    if (!formConfig?.corridors) return;
    const matchingCorridor = formConfig.corridors.find(
      (c) => c.destination_country?.toLowerCase() === destCountry.toLowerCase()
    );

    if (matchingCorridor?.steps && matchingCorridor.steps.length > 0) {
      const defaultStatus = (selectedStage === "Stamped" || selectedStage === "Ticketed" || selectedStage === "Departed")
        ? "Completed"
        : "Pending";

      setCorridorSteps(
        matchingCorridor.steps.map((st: any) => ({
          step_type: st.step_type || st.title || "Step",
          status: defaultStatus,
          date_started: "",
          date_completed: "",
          reference_no: "",
          remarks: "",
        }))
      );
    } else {
      setCorridorSteps([]);
    }
  }, [destCountry, formConfig, selectedStage]);

  // Set default agency if agencies load and none selected
  React.useEffect(() => {
    if (!contractor && formConfig?.agencies && formConfig.agencies.length > 0) {
      setContractor(formConfig.agencies[0].name || formConfig.agencies[0].contractor_name);
    }
  }, [formConfig, contractor]);

  // Reset form
  const handleResetForm = () => {
    setWorkerFullName("");
    setWorkerPassportNumber("");
    setWorkerDob("");
    setWorkerPob("");
    setWorkerPassportIssue("");
    setWorkerPassportExpiry("");
    setWorkerPlaceOfIssue("");
    setWorkerNationalId("");
    setWorkerLabourId("");
    setWorkerPhone("");
    setRegisteredOn("");
    setCvGeneratedOn("");
    setSelectedOn("");
    setProcessingStartedOn("");
    setStampedOn("");
    setTicketedOn("");
    setDepartedOn("");
    setContractNumber("");
    setContractDate("");
    setVisaNumber("");
    setVisaDate("");
    setSponsorName("");
    setSponsorId("");
    setSponsorPhone("");
    setTicketNumber("");
    setFlightDate("");
    setFlightTime("");
    setAirline("");
    setTicketingRemarks("");
    setFees([]);
    setHasCommission(false);
    setCommissionAmount("");
    setCommissionNotes("");
    setFormValidationError(null);
  };

  // Create Past Record Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: V2PastRecordCreatePayload) => {
      return await createPastRecordV2(payload);
    },
    onSuccess: (data) => {
      setSubmitSuccessMessage(
        `Past record for ${workerFullName} (${workerPassportNumber}) successfully created and registered into the system!`
      );
      handleResetForm();
      queryClient.invalidateQueries({ queryKey: ["v2_past_records_list"] });
    },
    onError: (err: any) => {
      const msg = formatCleanErrorMessage(err);
      setFormValidationError(msg);
    },
  });

  // Undo Past Record Mutation
  const undoMutation = useMutation({
    mutationFn: async ({ recordName, reason }: { recordName: string; reason: string }) => {
      return await undoPastRecordV2(recordName, reason);
    },
    onSuccess: () => {
      setUndoTargetRecord(null);
      setUndoReason("");
      setUndoError(null);
      queryClient.invalidateQueries({ queryKey: ["v2_past_records_list"] });
    },
    onError: (err: any) => {
      const msg = formatCleanErrorMessage(err);
      setUndoError(msg);
    },
  });

  // Submission handler with atomic timeline validations
  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);
    setSubmitSuccessMessage(null);

    if (isReadOnlyUser) {
      setFormValidationError("You have read-only access. You are not authorized to save historical records.");
      return;
    }

    if (!workerFullName.trim()) {
      setFormValidationError("Worker full name is required.");
      return;
    }
    if (!workerPassportNumber.trim()) {
      setFormValidationError("Passport number is required.");
      return;
    }
    if (!registeredOn) {
      setFormValidationError("Registration date is required for all historical records.");
      return;
    }
    if (selectedStage === "Departed" && !departedOn) {
      setFormValidationError("Departure date is required when the selected stage is Departed.");
      return;
    }
    if (hasReached("Selected") && !contractor) {
      setFormValidationError("Foreign Agency/Contractor is required from Selected stage onward.");
      return;
    }

    // Timeline Nondecreasing Check
    const datePairs: Array<{ name: string; val: string }> = [
      { name: "Registration", val: registeredOn },
      { name: "CV Generated", val: cvGeneratedOn },
      { name: "Selected", val: selectedOn },
      { name: "Processing Started", val: processingStartedOn },
      { name: "Stamped", val: stampedOn },
      { name: "Ticketed", val: ticketedOn },
      { name: "Departed", val: departedOn },
    ].filter((p) => p.val && p.val.trim());

    for (let i = 0; i < datePairs.length - 1; i++) {
      if (datePairs[i].val > datePairs[i + 1].val) {
        setFormValidationError(
          `Historical timeline dates must be non-decreasing: ${datePairs[i].name} (${datePairs[i].val}) cannot be after ${datePairs[i + 1].name} (${datePairs[i + 1].val}).`
        );
        return;
      }
    }

    const payload: V2PastRecordCreatePayload = {
      worker: {
        full_name: workerFullName.trim().toUpperCase(),
        passport_number: workerPassportNumber.trim().toUpperCase(),
        gender: workerGender,
        entry_track: entryTrack,
        destination_country: destCountry,
        date_of_birth: workerDob || undefined,
        place_of_birth: workerPob.trim().toUpperCase() || undefined,
        passport_issue_date: workerPassportIssue || undefined,
        passport_expiry_date: workerPassportExpiry || undefined,
        place_of_issue: workerPlaceOfIssue.trim().toUpperCase() || undefined,
        national_id: workerNationalId.trim() || undefined,
        labour_id: workerLabourId.trim() || undefined,
        phone: workerPhone.trim() || undefined,
        nationality: "Ethiopia",
      },
      stage: selectedStage,
      dates: {
        registered_on: registeredOn,
        cv_generated_on: cvGeneratedOn || undefined,
        selected_on: selectedOn || undefined,
        processing_started_on: processingStartedOn || undefined,
        stamped_on: stampedOn || undefined,
        ticketed_on: ticketedOn || undefined,
        departed_on: departedOn || undefined,
      },
      ...(hasReached("Selected")
        ? {
            case: {
              contractor,
              contract_number: contractNumber || undefined,
              contract_date: contractDate || undefined,
              visa_number: visaNumber || undefined,
              visa_date: visaDate || undefined,
              sponsor_name: sponsorName || undefined,
              sponsor_id: sponsorId || undefined,
              sponsor_phone: sponsorPhone || undefined,
              ticket_number: ticketNumber || undefined,
              flight_date: flightDate || undefined,
              flight_time: flightTime || undefined,
              airline: airline || undefined,
              ticketing_remarks: ticketingRemarks || undefined,
              medical_result: medicalResult || undefined,
              medical_date: medicalDate || undefined,
              medical_2_result: medical2Result || undefined,
              medical_2_date: medical2Date || undefined,
            },
          }
        : {}),
      ...(hasReached("Processing") && corridorSteps.length > 0
        ? {
            steps: corridorSteps.map((st) => ({
              step_type: st.step_type,
              status: st.status || "Completed",
              date_started: st.date_started || undefined,
              date_completed: st.date_completed || undefined,
              reference_no: st.reference_no || undefined,
              remarks: st.remarks || undefined,
            })),
          }
        : {}),
      ...(fees.length > 0 ? { fees } : {}),
      ...(selectedStage === "Departed" && hasCommission && commissionAmount !== ""
        ? {
            commission: {
              contractor,
              amount: Number(commissionAmount) || 0,
              currency: commissionCurrency,
              notes: commissionNotes || undefined,
            },
          }
        : {}),
    };

    createMutation.mutate(payload);
  };

  // Fee management helpers
  const handleAddFeeRow = () => {
    setFees((prev) => [
      ...prev,
      {
        fee_type: formConfig?.fee_types?.[0] || "Agency Fee",
        amount: 0,
        currency: "ETB",
        paid_on: registeredOn || "",
        description: "",
      },
    ]);
  };

  const handleUpdateFeeRow = (idx: number, updates: Partial<V2PastRecordFeePayload>) => {
    setFees((prev) => prev.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const handleRemoveFeeRow = (idx: number) => {
    setFees((prev) => prev.filter((_, i) => i !== idx));
  };

  // Permissions for Undo
  const canUndoRecord = (record: V2PastRecordItem) => {
    if (isReadOnlyUser) return false;
    if (isAdmin || isManager) return true;
    if (isRegistrar && record.entered_by === user) return true;
    return false;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Past Records
              </h1>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Manually record historical workers, timeline milestones, historical fee entries, and historical commissions.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/60 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5",
              activeTab === "form"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Enter Historical Worker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5",
              activeTab === "history"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Past Records History
          </button>
        </div>
      </div>

      {/* READ ONLY BANNER */}
      {isReadOnlyUser && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-medium">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            You have read-only privileges. You can view the form schema and historical entries, but you cannot save new records or perform undo operations.
          </span>
        </div>
      )}

      {/* TAB 1: HISTORICAL ENTRY FORM */}
      {activeTab === "form" && (
        <>
          {isLoadingConfig ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-500 font-medium">Loading historical form configuration & corridor schema...</p>
            </div>
          ) : isConfigError ? (
            <LoadError
              title="Failed to Load Past Record Configuration"
              error={configError}
              onRetry={() => refetchConfig()}
            />
          ) : (
            <form onSubmit={handleSubmitRecord} className="space-y-6">
              {/* Alert Feedback Messages */}
              {submitSuccessMessage && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{submitSuccessMessage}</span>
                </div>
              )}

              {formValidationError && (
                <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-lg text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formValidationError}</span>
                </div>
              )}

              {/* STAGE SELECTOR BANNER */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Plane className="h-4 w-4 text-emerald-600" />
                    Target Historical Stage Reached
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Select how far this worker advanced historically. Sections will expand to match the requirements of this stage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {availableStages.map((stg, i) => {
                      const isCurrent = stg === selectedStage;
                      const isPast = availableStages.indexOf(stg) < stageIndex;
                      return (
                        <button
                          key={stg}
                          type="button"
                          onClick={() => setSelectedStage(stg)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border",
                            isCurrent
                              ? "bg-emerald-900 text-white border-emerald-900 shadow-sm"
                              : isPast
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-50 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-slate-300"
                          )}
                        >
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/20">
                            {i + 1}
                          </span>
                          {stg}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 1: WORKER DETAILS */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <User className="h-4 w-4 text-blue-600" />
                    1. Worker Identity & Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      required
                      placeholder="e.g. ABEBECH KEBEDE DEMISSIE"
                      value={workerFullName}
                      onChange={(e) => setWorkerFullName(e.target.value.toUpperCase())}
                      className="h-8 text-xs font-semibold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Passport Number *</Label>
                    <Input
                      required
                      placeholder="e.g. EP1234567"
                      value={workerPassportNumber}
                      onChange={(e) => setWorkerPassportNumber(e.target.value.toUpperCase().trim())}
                      className="h-8 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Gender *</Label>
                    <select
                      value={workerGender}
                      onChange={(e) => setWorkerGender(e.target.value as any)}
                      className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Entry Track *</Label>
                    <select
                      value={entryTrack}
                      onChange={(e) => setEntryTrack(e.target.value as any)}
                      className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Muayena">Muayena</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Destination Country *</Label>
                    <select
                      value={destCountry}
                      onChange={(e) => setDestCountry(e.target.value)}
                      className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                    >
                      {formConfig?.corridors?.map((c) => (
                        <option key={c.destination_country} value={c.destination_country}>
                          {c.destination_country}
                        </option>
                      )) || (
                        <>
                          <option value="Saudi Arabia">Saudi Arabia</option>
                          <option value="Kuwait">Kuwait</option>
                          <option value="United Arab Emirates">United Arab Emirates</option>
                          <option value="Qatar">Qatar</option>
                          <option value="Jordan">Jordan</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      type="date"
                      value={workerDob}
                      onChange={(e) => setWorkerDob(e.target.value)}
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Place of Birth</Label>
                    <Input
                      placeholder="e.g. ADAMA"
                      value={workerPob}
                      onChange={(e) => setWorkerPob(e.target.value.toUpperCase())}
                      className="h-8 text-xs uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Passport Issue Date</Label>
                    <Input
                      type="date"
                      value={workerPassportIssue}
                      onChange={(e) => setWorkerPassportIssue(e.target.value)}
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Passport Expiry Date</Label>
                    <Input
                      type="date"
                      value={workerPassportExpiry}
                      onChange={(e) => setWorkerPassportExpiry(e.target.value)}
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Place of Issue</Label>
                    <Input
                      placeholder="e.g. ADDIS ABABA"
                      value={workerPlaceOfIssue}
                      onChange={(e) => setWorkerPlaceOfIssue(e.target.value.toUpperCase())}
                      className="h-8 text-xs uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">National ID (FIN)</Label>
                    <Input
                      placeholder="e.g. 1234567890"
                      value={workerNationalId}
                      onChange={(e) => setWorkerNationalId(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Labour ID</Label>
                    <Input
                      placeholder="e.g. ETH-12345"
                      value={workerLabourId}
                      onChange={(e) => setWorkerLabourId(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 2: HISTORICAL TIMELINE DATES */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    2. Historical Milestone Dates
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Enter the dates when each milestone occurred. Dates must be non-decreasing across the timeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Registration Date *
                    </Label>
                    <Input
                      type="date"
                      required
                      value={registeredOn}
                      onChange={(e) => setRegisteredOn(e.target.value)}
                      className="h-8 text-xs font-medium border-emerald-300 dark:border-emerald-800"
                    />
                  </div>

                  {hasReached("CV Generated") && entryTrack !== "Muayena" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">CV Generated Date</Label>
                      <Input
                        type="date"
                        value={cvGeneratedOn}
                        onChange={(e) => setCvGeneratedOn(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  )}

                  {hasReached("Selected") && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Selection Date</Label>
                      <Input
                        type="date"
                        value={selectedOn}
                        onChange={(e) => setSelectedOn(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  )}

                  {hasReached("Processing") && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Clearance Processing Started</Label>
                      <Input
                        type="date"
                        value={processingStartedOn}
                        onChange={(e) => setProcessingStartedOn(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  )}

                  {hasReached("Stamped") && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Visa Stamped Date</Label>
                      <Input
                        type="date"
                        value={stampedOn}
                        onChange={(e) => setStampedOn(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  )}

                  {hasReached("Ticketed") && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Ticketed Date</Label>
                      <Input
                        type="date"
                        value={ticketedOn}
                        onChange={(e) => setTicketedOn(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  )}

                  {hasReached("Departed") && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Departure Date *
                      </Label>
                      <Input
                        type="date"
                        required
                        value={departedOn}
                        onChange={(e) => setDepartedOn(e.target.value)}
                        className="h-8 text-xs font-medium border-emerald-300 dark:border-emerald-800"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECTION 3: PLACEMENT & CASE INFORMATION (Selected onward) */}
              {hasReached("Selected") && (
                <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Briefcase className="h-4 w-4 text-amber-600" />
                      3. Placement & Contract Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Foreign Agency / Contractor *
                      </Label>
                      <select
                        required
                        value={contractor}
                        onChange={(e) => setContractor(e.target.value)}
                        className="w-full h-8 text-xs border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 rounded-md px-2 font-semibold"
                      >
                        <option value="">Select an agency...</option>
                        {formConfig?.agencies?.map((ag) => (
                          <option key={ag.name || ag.contractor_name} value={ag.name || ag.contractor_name}>
                            {ag.contractor_name || ag.name} ({ag.country || destCountry})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Contract Number</Label>
                      <Input
                        placeholder="e.g. CNT-8871"
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Contract Date</Label>
                      <Input
                        type="date"
                        value={contractDate}
                        onChange={(e) => setContractDate(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Visa Number</Label>
                      <Input
                        placeholder="e.g. 1300998822"
                        value={visaNumber}
                        onChange={(e) => setVisaNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Visa Issue Date</Label>
                      <Input
                        type="date"
                        value={visaDate}
                        onChange={(e) => setVisaDate(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Sponsor Name</Label>
                      <Input
                        placeholder="e.g. Mohammed Al-Otaibi"
                        value={sponsorName}
                        onChange={(e) => setSponsorName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Medical 1 Result</Label>
                      <select
                        value={medicalResult}
                        onChange={(e) => setMedicalResult(e.target.value)}
                        className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                      >
                        <option value="FIT">FIT</option>
                        <option value="UNFIT">UNFIT</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Medical 1 Date</Label>
                      <Input
                        type="date"
                        value={medicalDate}
                        onChange={(e) => setMedicalDate(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    {hasReached("Ticketed") && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Ticket Number</Label>
                          <Input
                            placeholder="e.g. ET-071-998822"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Flight Date</Label>
                          <Input
                            type="date"
                            value={flightDate}
                            onChange={(e) => setFlightDate(e.target.value)}
                            className="h-8 text-xs font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Airline</Label>
                          <Input
                            placeholder="e.g. Ethiopian Airlines"
                            value={airline}
                            onChange={(e) => setAirline(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Medical 2 Result</Label>
                          <select
                            value={medical2Result}
                            onChange={(e) => setMedical2Result(e.target.value)}
                            className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                          >
                            <option value="FIT">FIT</option>
                            <option value="UNFIT">UNFIT</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* SECTION 4: CLEARANCE STEPS (Processing onward) */}
              {hasReached("Processing") && corridorSteps.length > 0 && (
                <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <FileText className="h-4 w-4 text-purple-600" />
                      4. Corridor Clearance Steps ({destCountry})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Corridor steps configured for {destCountry}. On Stamped/Ticketed/Departed, omitted steps default to Completed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-zinc-800/60 font-semibold text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Step Type</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Date Completed</th>
                            <th className="py-2 px-3">Reference No</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {corridorSteps.map((st, idx) => (
                            <tr key={st.step_type || idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{st.step_type}</td>
                              <td className="py-2 px-3">
                                <select
                                  value={st.status}
                                  onChange={(e) => {
                                    const nextStatus = e.target.value;
                                    setCorridorSteps((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, status: nextStatus } : item))
                                    );
                                  }}
                                  className="h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5"
                                >
                                  <option value="Completed">Completed</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="date"
                                  value={st.date_completed || ""}
                                  onChange={(e) => {
                                    const nextDate = e.target.value;
                                    setCorridorSteps((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, date_completed: nextDate } : item))
                                    );
                                  }}
                                  className="h-7 text-xs w-36"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  placeholder="Ref / Receipt #"
                                  value={st.reference_no || ""}
                                  onChange={(e) => {
                                    const nextRef = e.target.value;
                                    setCorridorSteps((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, reference_no: nextRef } : item))
                                    );
                                  }}
                                  className="h-7 text-xs w-36"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SECTION 5: HISTORICAL FEES (Optional) */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        5. Historical Fees (Optional)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Historical fees entered here create immediate Approved Income without Finance Manager sign-off.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFeeRow}
                      className="h-7 text-xs border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Fee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {fees.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No historical fees recorded. Click &ldquo;Add Fee&rdquo; if payments were collected historically for this worker.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {fees.map((fee, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <div className="w-40">
                            <select
                              value={fee.fee_type}
                              onChange={(e) => handleUpdateFeeRow(idx, { fee_type: e.target.value })}
                              className="w-full h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5"
                            >
                              {formConfig?.fee_types?.map((ft) => (
                                <option key={ft} value={ft}>
                                  {ft}
                                </option>
                              )) || (
                                <>
                                  <option value="Registration Fee">Registration Fee</option>
                                  <option value="Medical Fee">Medical Fee</option>
                                  <option value="Visa Processing Fee">Visa Processing Fee</option>
                                  <option value="Agency Service Fee">Agency Service Fee</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div className="w-28">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={fee.amount || ""}
                              onChange={(e) => handleUpdateFeeRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs font-bold"
                            />
                          </div>

                          <div className="w-20">
                            <select
                              value={fee.currency}
                              onChange={(e) => handleUpdateFeeRow(idx, { currency: e.target.value })}
                              className="w-full h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5"
                            >
                              <option value="ETB">ETB</option>
                              <option value="SAR">SAR</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>

                          <div className="w-32">
                            <Input
                              type="date"
                              value={fee.paid_on || registeredOn}
                              onChange={(e) => handleUpdateFeeRow(idx, { paid_on: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>

                          <div className="flex-1 min-w-[150px]">
                            <Input
                              placeholder="Description / receipt note"
                              value={fee.description || ""}
                              onChange={(e) => handleUpdateFeeRow(idx, { description: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFeeRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECTION 6: HISTORICAL COMMISSION (Departed stage only) */}
              {selectedStage === "Departed" ? (
                <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        6. Historical Agency Commission (Departed Worker)
                      </CardTitle>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasCommission}
                          onChange={(e) => setHasCommission(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-900 focus:ring-emerald-800"
                        />
                        Record Commission
                      </label>
                    </div>
                  </CardHeader>
                  {hasCommission && (
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Commission Amount</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 5000"
                          value={commissionAmount}
                          onChange={(e) => setCommissionAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Currency</Label>
                        <select
                          value={commissionCurrency}
                          onChange={(e) => setCommissionCurrency(e.target.value)}
                          className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                        >
                          <option value="SAR">SAR</option>
                          <option value="KWD">KWD</option>
                          <option value="USD">USD</option>
                          <option value="AED">AED</option>
                          <option value="QAR">QAR</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Commission Notes</Label>
                        <Input
                          placeholder="Historical commission agreement note"
                          value={commissionNotes}
                          onChange={(e) => setCommissionNotes(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    Historical commission can only be recorded when the selected target stage is <strong>Departed</strong>.
                  </span>
                </div>
              )}

              {/* REVIEW & SUBMIT BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Review Summary Before Save
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {workerFullName || "Unnamed Worker"} ({workerPassportNumber || "No Passport"}) — Stage: <strong>{selectedStage}</strong>, Track: {entryTrack}, Destination: {destCountry}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetForm}
                    disabled={createMutation.isPending}
                    className="h-8 text-xs"
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createMutation.isPending || isReadOnlyUser}
                    title={isReadOnlyUser ? "You have read-only permissions." : undefined}
                    className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold disabled:opacity-50"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Saving Historical Record...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Save Past Record
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </>
      )}

      {/* TAB 2: HISTORY LIST & UNDO */}
      {activeTab === "history" && (
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <History className="h-4 w-4 text-emerald-600" />
                  Historical Worker Entries History
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Audit trail of all entered historical records. Undo is irreversible and reserved for authorized staff.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                disabled={isLoadingHistory}
                className="h-7 text-xs"
              >
                <RotateCcw className={cn("h-3 w-3 mr-1", isLoadingHistory && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center p-8 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-xs text-slate-500 font-medium ml-2">Loading historical records...</span>
              </div>
            ) : isHistoryError ? (
              <LoadError
                title="Failed to Load History"
                error={historyError}
                onRetry={() => refetchHistory()}
              />
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <History className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">No Past Records Found</p>
                <p className="text-[11px] text-slate-400">Use the &ldquo;Enter Historical Worker&rdquo; tab to register past workers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 font-semibold text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Worker Name</th>
                      <th className="py-2.5 px-3">Passport Number</th>
                      <th className="py-2.5 px-3">Stage Reached</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Entered By / Date</th>
                      <th className="py-2.5 px-3">Undo Audit</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {historyRecords.map((rec) => {
                      const isUndone = rec.status === "Undone";
                      const canUndo = canUndoRecord(rec);

                      return (
                        <tr key={rec.name} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {rec.worker_name || rec.full_name || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {rec.passport_number || "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 dark:text-emerald-300">
                              {rec.stage_reached || "Departed"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                isUndone
                                  ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              )}
                            >
                              {rec.status || "Saved"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">
                            <div className="font-medium">{rec.entered_by || "Staff"}</div>
                            <div className="text-[10px] text-slate-400">{rec.entered_on || rec.creation || "—"}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {isUndone ? (
                              <div>
                                <span className="font-medium text-rose-700 dark:text-rose-400">
                                  {rec.undone_by || "Staff"}
                                </span>
                                <div className="text-[10px] italic text-slate-400">{rec.undo_reason || "Reversed"}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isUndone && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canUndo}
                                title={!canUndo ? "You do not have permission to undo this record." : undefined}
                                onClick={() => {
                                  setUndoTargetRecord(rec);
                                  setUndoReason("");
                                  setUndoError(null);
                                }}
                                className="h-6 px-2 text-[11px] border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Undo
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UNDO CONFIRMATION DIALOG */}
      <Dialog open={Boolean(undoTargetRecord)} onOpenChange={(open) => !open && setUndoTargetRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              Undo Historical Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is <strong>irreversible</strong>. Undoing this past record will permanently remove the associated historical registration, placement, and transactions.
            </DialogDescription>
          </DialogHeader>

          {undoError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-lg text-xs font-semibold">
              {undoError}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              <div>Worker: <strong>{undoTargetRecord?.worker_name || undoTargetRecord?.full_name}</strong></div>
              <div>Passport: <strong>{undoTargetRecord?.passport_number}</strong></div>
              <div>Stage: <strong>{undoTargetRecord?.stage_reached}</strong></div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Undo *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Explain why this historical worker record is being undone..."
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={undoMutation.isPending}
              onClick={() => setUndoTargetRecord(null)}
              className="text-xs"
            >
              Keep Record
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={undoMutation.isPending || !undoReason.trim()}
              onClick={() => {
                if (undoTargetRecord) {
                  undoMutation.mutate({
                    recordName: undoTargetRecord.name,
                    reason: undoReason.trim(),
                  });
                }
              }}
              className="text-xs font-semibold bg-rose-700 hover:bg-rose-800"
            >
              {undoMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Undoing...
                </>
              ) : (
                "Confirm Undo Removal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
