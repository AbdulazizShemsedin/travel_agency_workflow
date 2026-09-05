"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  FileSearch,
  CheckCircle2,
  XCircle,
  Building2,
  UploadCloud,
  Eye,
  Loader2,
  FileUp,
  FileCheck2,
  RefreshCw,
  Download,
  Printer,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Plane,
  Shield,
  Stamp,
  User,
  HelpCircle,
  FileBadge2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApplicantV2, V2ApplicantDetails } from "@/lib/api/v2/applicants";
import {
  listPlacementsV2,
  uploadContractV2,
  uploadPlacementContractV2,
  uploadVisaV2,
  uploadPlacementVisaV2,
  recordSelectedMedicalResultV2,
  advancePlacementV2,
  V2PlacementRecord,
} from "@/lib/api/v2/placements";
import {
  uploadFileV2,
  parseContractFileV2,
  parseVisaFileV2,
  V2ParsedContractData,
  V2ParsedVisaData,
} from "@/lib/api/v2/documents";
import { cn } from "@/lib/utils";

export default function PlacementDocumentCenterPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";

  // Active Document Tab: "contract" | "visa"
  const [activeTab, setActiveTab] = React.useState<"contract" | "visa">("contract");

  // Contract upload state
  const [contractFile, setContractFile] = React.useState<File | null>(null);
  const [contractPreviewUrl, setContractPreviewUrl] = React.useState<string>("");
  const [isContractUploading, setIsContractUploading] = React.useState(false);
  const [contractParseResult, setContractParseResult] = React.useState<V2ParsedContractData | null>(null);
  const [isApprovingContract, setIsApprovingContract] = React.useState(false);

  // Visa upload state
  const [visaFile, setVisaFile] = React.useState<File | null>(null);
  const [visaPreviewUrl, setVisaPreviewUrl] = React.useState<string>("");
  const [isVisaUploading, setIsVisaUploading] = React.useState(false);
  const [visaParseResult, setVisaParseResult] = React.useState<V2ParsedVisaData | null>(null);

  // Active Preview Target
  const [previewFileUrl, setPreviewFileUrl] = React.useState<string>("");

  // 1. Fetch Applicant Details via V2 API
  const {
    data: applicant,
    isLoading: isApplicantLoading,
    refetch: refetchApplicant,
  } = useQuery<V2ApplicantDetails | null>({
    queryKey: ["v2_applicant_doc_center", applicantId],
    queryFn: () => (applicantId ? getApplicantV2(applicantId) : Promise.resolve(null)),
    enabled: !!applicantId,
    staleTime: 30000,
  });

  // 2. Fetch Placements for this Applicant via V2 API
  const {
    data: placements = [],
    isLoading: isPlacementsLoading,
    refetch: refetchPlacements,
  } = useQuery<V2PlacementRecord[]>({
    queryKey: ["v2_placements_for_doc_center", applicantId],
    queryFn: async () => {
      if (!applicantId) return [];
      const all = await listPlacementsV2();
      return all.filter((p) => p.applicant === applicantId);
    },
    enabled: !!applicantId,
    staleTime: 15000,
  });

  const activePlacement = placements.length > 0 ? placements[0] : null;
  const destinationCountry = activePlacement?.destination_country || applicant?.destination_country || "Saudi Arabia";
  const isKuwait = destinationCountry === "Kuwait";

  // Set default preview from existing placement files
  React.useEffect(() => {
    if (activePlacement?.contract_file && !previewFileUrl) {
      setPreviewFileUrl(activePlacement.contract_file);
    } else if (activePlacement?.visa_file && !previewFileUrl) {
      setPreviewFileUrl(activePlacement.visa_file);
    }
  }, [activePlacement, previewFileUrl]);

  // Upload & Attach Contract Mutation
  const handleUploadContract = async (previewOnly = false) => {
    if (!contractFile) {
      toast.error("No file selected", { description: "Please choose a contract document first." });
      return;
    }
    if (!activePlacement && !previewOnly) {
      toast.error("No Active Placement", {
        description: "Candidate must be Selected with an active Placement record before attaching contracts.",
      });
      return;
    }

    setIsContractUploading(true);
    try {
      // 1. Upload file via /api/method/upload_file
      const uploadRes = await uploadFileV2(
        contractFile,
        false,
        "Placement",
        activePlacement?.name
      );

      const fileUrl = uploadRes.file_url;
      setPreviewFileUrl(fileUrl);

      if (previewOnly) {
        // Run OCR parsing preview only
        const parsed = await parseContractFileV2(fileUrl, destinationCountry);
        setContractParseResult(parsed);
        toast.success("Contract Parsed for Preview", {
          description: "Structured fields extracted from contract file.",
        });
      } else {
        // Authoritative upload_contract attachment to Placement
        const res = await uploadContractV2(activePlacement!.name, fileUrl);
        if (res) {
          setContractParseResult(res as any);
        }
        toast.success("Contract Successfully Attached to Placement", {
          description: `Contract attached to ${activePlacement!.name} with extracted dates and terms.`,
        });
        setContractFile(null);
        queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center", applicantId] });
      }
    } catch (err: any) {
      toast.error("Contract Upload Failed", {
        description: err?.message || "Backend rejected contract file attachment.",
      });
    } finally {
      setIsContractUploading(false);
    }
  };

  // Approve Contract & Advance Placement from Selected -> Processing
  const handleApproveContractAndAdvance = async () => {
    if (!activePlacement) {
      toast.error("No active placement record found.");
      return;
    }

    setIsApprovingContract(true);
    try {
      // 1. Enforce Medical 1 (Selected stage) is recorded as FIT per state machine rule
      if (activePlacement.medical_selected_status !== "FIT") {
        toast.error("Medical 1 FIT Clearance Required", {
          description: "Candidate's Stage 1 Medical examination must be recorded as FIT before approving the contract and advancing to Processing.",
        });
        setIsApprovingContract(false);
        return;
      }

      // 2. Advance Placement to Processing stage
      await advancePlacementV2(activePlacement.name, "Processing");

      toast.success("Contract Approved & Placement Advanced!", {
        description: `Placement ${activePlacement.name} has moved to Processing stage. Clearance corridor steps are now ready.`,
      });

      queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant_v2", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["clearance_queue_workspace"] });
    } catch (err: any) {
      toast.error("Failed to Advance Placement", {
        description: err?.message || "Backend rejected transition to Processing stage.",
      });
    } finally {
      setIsApprovingContract(false);
    }
  };

  // Upload & Attach Kuwait eVisa Mutation
  const handleUploadVisa = async (previewOnly = false) => {
    if (!visaFile) {
      toast.error("No file selected", { description: "Please choose an eVisa document first." });
      return;
    }
    if (!activePlacement && !previewOnly) {
      toast.error("No Active Placement", {
        description: "Candidate must be Selected with an active Placement record before attaching visa documents.",
      });
      return;
    }

    setIsVisaUploading(true);
    try {
      // 1. Upload file via /api/method/upload_file
      const uploadRes = await uploadFileV2(
        visaFile,
        false,
        "Placement",
        activePlacement?.name
      );

      const fileUrl = uploadRes.file_url;
      setPreviewFileUrl(fileUrl);

      if (previewOnly) {
        // Run OCR parsing preview only
        const parsed = await parseVisaFileV2(fileUrl);
        setVisaParseResult(parsed);
        toast.success("eVisa Parsed for Preview", {
          description: "Structured fields extracted from visa file.",
        });
      } else {
        // Authoritative upload_visa attachment to Placement
        const res = await uploadVisaV2(activePlacement!.name, fileUrl);
        toast.success("Kuwait eVisa Successfully Attached to Placement", {
          description: `Visa attached to ${activePlacement!.name}. Parsed reference and sponsor registered.`,
        });
        setVisaFile(null);
        queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center", applicantId] });
      }
    } catch (err: any) {
      toast.error("eVisa Upload Failed", {
        description: err?.message || "Backend rejected visa file attachment.",
      });
    } finally {
      setIsVisaUploading(false);
    }
  };

  if (isApplicantLoading || isPlacementsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-xs text-slate-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span>Loading Placement Document Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Breadcrumb                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/applicants/${encodeURIComponent(applicantId)}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dossier
            </Link>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="text-xs font-mono text-slate-400">
              {applicantId}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Placement Document Center
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            >
              Verified Placement Documents
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Upload, inspect, and parse employment contracts and Kuwait eVisas directly to the active Placement record.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchApplicant();
              refetchPlacements();
            }}
            className="text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Placement & Candidate Context Card                            */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262632] bg-white dark:bg-[#121217] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Candidate Name</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block">
              {applicant?.full_name || "Unknown Candidate"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Passport Number</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
              {applicant?.passport_number || "Not Recorded"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Destination Country</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
              <Plane className="h-3 w-3 text-emerald-600" />
              {destinationCountry}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Active Placement</span>
            {activePlacement ? (
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                {activePlacement.name}
              </span>
            ) : (
              <span className="text-amber-800 dark:text-amber-400 font-semibold">
                No Placement Yet
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Placement Status</span>
            {activePlacement ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50"
              >
                {activePlacement.status}
              </Badge>
            ) : (
              <span className="text-slate-400">N/A</span>
            )}
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Foreign Contractor</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate block">
              {activePlacement?.contractor || activePlacement?.contractor_name || "Unassigned"}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Navigation Tabs (Contract vs Kuwait Visa)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#22222a] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("contract")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
            activeTab === "contract"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Employment Contract
          {activePlacement?.contract_file && (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("visa")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
            activeTab === "visa"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Stamp className="h-3.5 w-3.5" />
          Kuwait eVisa
          {isKuwait && activePlacement?.visa_file && (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
          {!isKuwait && (
            <span className="text-[10px] opacity-60 font-normal">(Kuwait Only)</span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Tab 1: Employment Contract Upload & Parsing                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "contract" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Upload & Actions */}
          <div className="space-y-4">
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-emerald-600" />
                    Attach Signed Contract
                  </span>
                  {activePlacement?.contract_file ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                      Contract Attached
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                      Not Attached
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload signed employment contract. The system automatically parses dates, salary, and sponsor details from the uploaded document.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* File Dropzone */}
                <div className="border-2 border-dashed border-slate-200 dark:border-[#2a2a35] rounded-xl p-6 text-center space-y-2 hover:border-emerald-500 transition-all bg-slate-50/50 dark:bg-[#16161e]">
                  <UploadCloud className="h-8 w-8 mx-auto text-slate-400" />
                  <div className="text-xs">
                    <label className="font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline">
                      Choose Contract Document
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setContractFile(file);
                            setContractPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      PDF, PNG, JPG, or WebP up to 10MB
                    </p>
                  </div>

                  {contractFile && (
                    <div className="pt-2 text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      {contractFile.name} ({(contractFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* Upload Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    disabled={!contractFile || isContractUploading}
                    onClick={() => handleUploadContract(false)}
                    className="flex-1 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-xs"
                  >
                    {isContractUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Attach to Placement
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={!contractFile || isContractUploading}
                    onClick={() => handleUploadContract(true)}
                    className="text-xs h-9"
                    title="Run OCR parsing preview without mutating placement"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview OCR
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Contract Fields Card */}
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Extracted Contract Terms
                </CardTitle>
                <CardDescription className="text-xs">
                  Structured values stored on the candidate placement record.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[10px] text-slate-400 block">Signed Date</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {activePlacement?.contract_signed_date || contractParseResult?.status || "Not Extracted"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[10px] text-slate-400 block">Negotiated Salary</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {activePlacement?.contract_salary_amount
                        ? `${activePlacement.contract_salary_amount} ${activePlacement.contract_salary_currency || "SAR"}`
                        : "Not Set"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[10px] text-slate-400 block">Employer / Sponsor</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block">
                      {activePlacement?.employer_name || contractParseResult?.sponsor_name || "Not Extracted"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[10px] text-slate-400 block">
                      {isKuwait ? "Employment Site" : "Contract Number"}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {isKuwait
                        ? activePlacement?.employment_site || "Kuwait"
                        : activePlacement?.contract_number || contractParseResult?.contract_number || "Pending"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[10px] text-slate-400 block">Visa Number</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {activePlacement?.visa_number || contractParseResult?.visa_number || "Not Extracted"}
                    </span>
                  </div>

                  {!isKuwait && (
                    <>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Employer ID / Iqama</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.employer_national_id || contractParseResult?.sponsor_id || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Saudi Partner Agency</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {activePlacement?.saudi_agency_name || contractParseResult?.contractor_name || "Not Extracted"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {activePlacement?.contract_file && (
                  <div className="pt-2">
                    <a
                      href={activePlacement.contract_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      View Attached Contract File ({activePlacement.contract_file})
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Stage Advancement Action Gate */}
                {activePlacement && (
                  <div className="pt-3 border-t border-slate-100 dark:border-[#222228] space-y-2">
                    {activePlacement.status === "Selected" ? (
                      <>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 p-3 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Contract Uploaded — Ready for Stage Approval
                          </div>
                          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
                            Approving terms verifies the Selected Medical 1 FIT gate and transitions this placement to <strong>Processing (LMIS &amp; Te&apos;shir)</strong>.
                          </p>
                        </div>
                        <Button
                          type="button"
                          disabled={isApprovingContract || !activePlacement.contract_file}
                          onClick={handleApproveContractAndAdvance}
                          className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs h-10 shadow-md flex items-center justify-center gap-2"
                        >
                          {isApprovingContract ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Approving Contract & Advancing Placement...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Approve Contract & Advance to Next Stage (Processing)
                            </>
                          )}
                        </Button>
                      </>
                    ) : activePlacement.status === "Processing" ? (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Placement is active in <strong>Processing</strong> stage.</span>
                        </div>
                        <Link href={`/applicants/${encodeURIComponent(applicantId)}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            View Candidate Dossier
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        Current Placement Status: <strong>{activePlacement.status}</strong>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Embedded Preview */}
          <div>
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-slate-500" />
                    Document Viewer
                  </span>
                  {(contractPreviewUrl || previewFileUrl) && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = contractPreviewUrl || previewFileUrl;
                          const win = window.open(url, "_blank");
                          win?.focus();
                        }}
                        className="h-7 px-2 text-xs border-slate-300 dark:border-[#26262d] font-semibold text-slate-700 dark:text-zinc-300"
                        title="Print Document"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        Print
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const url = contractPreviewUrl || previewFileUrl;
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Contract_${applicantId || "candidate"}.pdf`;
                          a.target = "_blank";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          toast.success("Document downloaded!");
                        }}
                        className="h-7 px-2 text-xs bg-blue-900 hover:bg-blue-950 text-white font-semibold"
                        title="Save as PDF"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Save as PDF
                      </Button>
                    </div>
                  )}
                  {previewFileUrl && !contractPreviewUrl && (
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                      {previewFileUrl}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[420px] p-2 bg-slate-100 dark:bg-[#0d0d11] rounded-xl overflow-hidden flex items-center justify-center">
                {contractPreviewUrl || previewFileUrl ? (
                  <iframe
                    src={contractPreviewUrl || previewFileUrl}
                    title="Contract Document Viewer"
                    className="w-full h-full min-h-[420px] rounded-lg border-0"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-400 space-y-2 p-6">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-300">
                      No document loaded for preview
                    </p>
                    <p className="text-[11px]">
                      Choose a file or select an existing attachment to view here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Tab 2: Kuwait eVisa Upload & Parsing                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "visa" && (
        <>
          {!isKuwait ? (
            <div className="p-6 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 space-y-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-sm font-bold">
                  eVisa Upload Specific to Kuwait Corridor
                </h3>
              </div>
              <p className="leading-relaxed">
                Candidate <strong>{applicant?.full_name}</strong> is designated for <strong>{destinationCountry}</strong>.
                Direct eVisa document upload and parsing is implemented exclusively for the Kuwait corridor.
                For Saudi Arabia, consular visa clearance is coordinated via the <strong>Taeshir</strong> biometric gate and <strong>Saudi Embassy Stamping</strong> clearance steps.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Upload & Actions */}
              <div className="space-y-4">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-emerald-600" />
                        Attach Kuwait eVisa Document
                      </span>
                      {activePlacement?.visa_file ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                          Visa Attached
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                          Not Attached
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Upload Kuwait eVisa document. The backend automatically extracts visa number, validity dates, and sponsor civil ID.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* File Dropzone */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-[#2a2a35] rounded-xl p-6 text-center space-y-2 hover:border-emerald-500 transition-all bg-slate-50/50 dark:bg-[#16161e]">
                      <UploadCloud className="h-8 w-8 mx-auto text-slate-400" />
                      <div className="text-xs">
                        <label className="font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline">
                          Choose Kuwait eVisa Document
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setVisaFile(file);
                                setVisaPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          PDF, PNG, JPG, or WebP up to 10MB
                        </p>
                      </div>

                      {visaFile && (
                        <div className="pt-2 text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          {visaFile.name} ({(visaFile.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </div>

                    {/* Upload Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        disabled={!visaFile || isVisaUploading}
                        onClick={() => handleUploadVisa(false)}
                        className="flex-1 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-xs"
                      >
                        {isVisaUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Attach to Placement
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={!visaFile || isVisaUploading}
                        onClick={() => handleUploadVisa(true)}
                        className="text-xs h-9"
                        title="Run OCR parsing preview without mutating placement"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview OCR
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Extracted Visa Fields Card */}
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Extracted Visa Information
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Structured Kuwait eVisa records registered on the Placement.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Visa Reference / Number</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.visa_reference_number || activePlacement?.visa_number || visaParseResult?.visa_number || "Pending"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Visa Type</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.visa_type || visaParseResult?.visa_type || "Work Visa"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Issue Date</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.visa_issue_date || visaParseResult?.issue_date || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Expiry Date</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.visa_expiry_date || visaParseResult?.expiry_date || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Sponsor Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {activePlacement?.sponsor_name || visaParseResult?.sponsor_name || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[10px] text-slate-400 block">Sponsor Civil ID</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {activePlacement?.sponsor_civil_id || visaParseResult?.sponsor_id || "Not Extracted"}
                        </span>
                      </div>
                    </div>

                    {activePlacement?.visa_file && (
                      <div className="pt-2">
                        <a
                          href={activePlacement.visa_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          View Attached Visa File ({activePlacement.visa_file})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Embedded Preview */}
              <div>
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-slate-500" />
                        Visa Document Viewer
                      </span>
                      {(visaPreviewUrl || previewFileUrl) && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = visaPreviewUrl || previewFileUrl;
                              const win = window.open(url, "_blank");
                              win?.focus();
                            }}
                            className="h-7 px-2 text-xs border-slate-300 dark:border-[#26262d] font-semibold text-slate-700 dark:text-zinc-300"
                            title="Print Visa Document"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            Print
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const url = visaPreviewUrl || previewFileUrl;
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `eVisa_${applicantId || "candidate"}.pdf`;
                              a.target = "_blank";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              toast.success("Visa document downloaded!");
                            }}
                            className="h-7 px-2 text-xs bg-blue-900 hover:bg-blue-950 text-white font-semibold"
                            title="Save as PDF"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Save as PDF
                          </Button>
                        </div>
                      )}
                      {previewFileUrl && !visaPreviewUrl && (
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                          {previewFileUrl}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[420px] p-2 bg-slate-100 dark:bg-[#0d0d11] rounded-xl overflow-hidden flex items-center justify-center">
                    {visaPreviewUrl || previewFileUrl ? (
                      <iframe
                        src={visaPreviewUrl || previewFileUrl}
                        title="Kuwait eVisa Viewer"
                        className="w-full h-full min-h-[420px] rounded-lg border-0"
                      />
                    ) : (
                      <div className="text-center text-xs text-slate-400 space-y-2 p-6">
                        <Stamp className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                        <p className="font-semibold text-slate-600 dark:text-zinc-300">
                          No visa document loaded for preview
                        </p>
                        <p className="text-[11px]">
                          Choose an eVisa document to preview here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
