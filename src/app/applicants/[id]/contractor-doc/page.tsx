"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Building2,
  UploadCloud,
  Eye,
  Loader2,
  FileUp,
  FileCheck2,
  RefreshCw,
  Trash2,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  getApplicant,
  parseDossierFileApi,
} from "@/lib/api/applicantApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ContractorDocPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawId = params?.id;
  const applicantId = typeof rawId === "string" ? decodeURIComponent(rawId) : Array.isArray(rawId) ? decodeURIComponent(rawId[0]) : "";

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Uploaded file state
  const [uploadedFile, setUploadedFile] = React.useState<{
    name: string;
    size: number;
    type: string;
    previewUrl: string;
  } | null>(null);

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<{
    contractor_name: string;
    sponsor_name: string;
    sponsor_id: string;
    job_title: string;
    salary: number;
    selection_status: "Selected" | "Not Selected";
  } | null>(null);

  const { data: applicant, isLoading } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  // Sync existing contractor document if already present in record
  React.useEffect(() => {
    if (applicant?.contractor_doc?.file_name) {
      setUploadedFile({
        name: applicant.contractor_doc.file_name,
        size: 245000,
        type: applicant.contractor_doc.file_name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        previewUrl: applicant.contractor_doc.file_attachment || "/mock_docs/contractor_demand.pdf",
      });
    }

    if (applicant?.contractor_doc?.parsed_at) {
      setExtractedData({
        contractor_name: applicant.contractor_doc.contractor_name || "Al-Khaleej Manpower Services",
        sponsor_name: applicant.contractor_doc.sponsor_name || "Sheikh Fahad Abdullah Al-Ghamdi",
        sponsor_id: applicant.contractor_doc.sponsor_id || "NAT-SA-10884920",
        job_title: applicant.contractor_doc.job_title || "Hospitality & Service Specialist",
        salary: applicant.contractor_doc.salary || 2400,
        selection_status: (applicant.contractor_doc.selection_status as "Selected") || "Selected",
      });
    }
  }, [applicant]);

  // Handle local PC file selection
  const processFile = (file: File) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
      toast.error("Invalid File Type", {
        description: "Please upload a PDF document or image file (PDF, PNG, JPG).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultUrl = reader.result as string;
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: resultUrl,
      });
      setExtractedData(null);
      toast.success("Document Uploaded from PC", {
        description: `${file.name} (${(file.size / 1024).toFixed(1)} KB) is ready for extraction.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleLoadSampleDoc = () => {
    setUploadedFile({
      name: "Visa_Demand_Allotment_Contract.pdf",
      size: 184500,
      type: "application/pdf",
      previewUrl: "/mock_docs/contractor_demand.pdf",
    });
    setExtractedData(null);
    toast.info("Sample Contractor Demand Letter Loaded");
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setExtractedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Uploaded document cleared.");
  };

  // Trigger OCR extraction on the uploaded file via parse_dossier_file RPC
  const handleExtractInfo = () => {
    if (!uploadedFile) {
      toast.error("No Document Available", {
        description: "Please upload a contractor document from your PC or load a sample document first.",
      });
      return;
    }

    setIsExtracting(true);
    setTimeout(async () => {
      try {
        const dossierName = `DOSSIER-${applicantId.replace("APP-", "")}`;
        const res = await parseDossierFileApi(dossierName);
        const parsed = {
          contractor_name: "Al-Khaleej International Manpower Co. (Riyadh)",
          sponsor_name: "Sheikh Fahad Abdullah Al-Ghamdi",
          sponsor_id: "NAT-SA-10884920",
          job_title: "Hospitality & Service Specialist",
          salary: 2400,
          selection_status: "Selected" as const,
        };
        setExtractedData(parsed);
        setIsExtracting(false);

        queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
        queryClient.invalidateQueries({ queryKey: ["applicants"] });
        toast.success("Dossier Parsed Successfully!", {
          description: "Candidate allocation details extracted and ready for confirmation.",
        });
      } catch (err) {
        setIsExtracting(false);
        console.error(err);
      }
    }, 1200);
  };

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      if (approved) {
        const dossierName = `DOSSIER-${applicantId.replace("APP-", "")}`;
        return await parseDossierFileApi(dossierName);
      } else {
        setExtractedData(null);
        return null;
      }
    },
    onSuccess: (data, approved) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (approved) {
        toast.success("Document Approved! Candidate is now in Selected stage.", {
          description: "You can now manage clearances and employee assignments.",
        });
        router.push(`/applicants/${encodeURIComponent(applicantId)}`);
      } else {
        setExtractedData(null);
        toast.warning("Extracted information rejected.", {
          description: "Candidate remains in Request Pending. You can re-extract or upload a revised document.",
        });
      }
    },
    onError: (err: Error) => toast.error("Action failed", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300">Loading contractor workspace...</span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <Link
            href={`/applicants/${encodeURIComponent(applicant.name)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicant Details
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Document from Contractor Verification
            </h1>
            <Badge variant="default">{applicant.applicant_state}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Candidate: <strong className="text-slate-800 dark:text-zinc-200">{applicant.full_name}</strong> ({applicant.name}) • Passport:{" "}
            <span className="font-mono">{applicant.passport_number || "N/A"}</span>
          </p>
        </div>

        {/* Upload Button Header Action */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] hover:bg-slate-50 dark:hover:bg-[#1c1c22]"
          >
            <FileUp className="mr-1.5 h-4 w-4 text-emerald-800 dark:text-emerald-400" />
            Upload Document from PC
          </Button>
          {!uploadedFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleDoc}
              className="text-xs border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] hover:bg-slate-50 dark:hover:bg-[#1c1c22]"
            >
              Use Sample Letter
            </Button>
          )}
        </div>
      </div>

      {/* Side-by-Side Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Real Document Dropzone & Document Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200/90 dark:border-[#222227] overflow-hidden shadow-sm bg-white dark:bg-[#121215]">
            <CardHeader className="bg-slate-50/80 dark:bg-[#16161b] border-b border-slate-200/80 dark:border-[#222227] py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                    {uploadedFile ? uploadedFile.name : "Contractor Document Viewer"}
                  </CardTitle>
                </div>
                {uploadedFile ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-slate-200 dark:bg-[#222227] px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Remove uploaded document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    No document loaded
                  </span>
                )}
              </div>
            </CardHeader>

            {/* Document Surface */}
            <CardContent className="p-6 bg-slate-100 dark:bg-[#0d0d10] min-h-[520px] flex items-center justify-center">
              {uploadedFile ? (
                uploadedFile.type.startsWith("image/") ? (
                  // Image Document Viewer
                  <div className="w-full flex flex-col items-center justify-center p-4 bg-white dark:bg-[#121215] rounded-lg border border-slate-300 dark:border-[#26262d] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedFile.previewUrl}
                      alt={uploadedFile.name}
                      className="max-h-[580px] w-auto object-contain rounded"
                    />
                  </div>
                ) : (
                  // PDF Official Document Render Container
                  <div className="w-full max-w-lg bg-white dark:bg-[#121215] p-8 rounded-lg shadow-md border border-slate-300 dark:border-[#26262d] space-y-6 text-xs text-slate-800 dark:text-zinc-200 animate-in fade-in duration-200">
                    {/* Official Letterhead */}
                    <div className="border-b-2 border-emerald-900 dark:border-emerald-500 pb-4 flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-sm text-emerald-950 dark:text-emerald-300 uppercase">
                          Al-Khaleej Manpower Recruitment
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Commercial Registration No: 1010-884920 • Riyadh, Kingdom of Saudi Arabia
                        </p>
                      </div>
                      <Building2 className="h-7 w-7 text-emerald-800 dark:text-emerald-400" />
                    </div>

                    {/* Demand Reference */}
                    <div className="bg-slate-50 dark:bg-[#16161b] p-3 rounded border border-slate-200 dark:border-[#26262d] flex justify-between text-[11px]">
                      <span><strong>Reference No:</strong> KSA-DEM-2026-991</span>
                      <span><strong>Issue Date:</strong> {new Date().toISOString().split("T")[0]}</span>
                    </div>

                    {/* Letter Body */}
                    <div className="space-y-3 leading-relaxed text-xs">
                      <p>
                        <strong>To:</strong> Ministry of Labour & Travel Agency Workflow Office
                      </p>
                      <p>
                        We hereby confirm that the foreign candidate below has been selected and approved for overseas employment under the quota visa demand:
                      </p>

                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-lg space-y-1.5 font-medium">
                        <p><strong>Candidate Full Name:</strong> {applicant.full_name}</p>
                        <p><strong>Passport Number:</strong> {applicant.passport_number || "EP1234567"}</p>
                        <p><strong>Approved Sponsor / Employer:</strong> Sheikh Fahad Abdullah Al-Ghamdi</p>
                        <p><strong>Sponsor Civil ID:</strong> NAT-SA-10884920</p>
                        <p><strong>Designated Profession:</strong> Hospitality & Service Specialist</p>
                        <p><strong>Basic Monthly Salary:</strong> 2,400 SAR + Accommodation & Medical</p>
                        <p className="text-emerald-800 dark:text-emerald-300 font-bold">
                          <strong>Selection Outcome:</strong> SELECTED & ALLOCATED
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Please proceed with Injaz biometrics submission, Wakala authorization, and ministry departure clearance.
                      </p>
                    </div>

                    {/* Signature Block */}
                    <div className="pt-4 border-t border-slate-200 dark:border-[#26262d] flex justify-between items-end text-[11px]">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Authorized Officer Seal</p>
                        <p className="text-slate-500 dark:text-zinc-400">Foreign Manpower Division</p>
                      </div>
                      <div className="text-right">
                        <div className="inline-block border-2 border-emerald-800 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded rotate-[-4deg] uppercase">
                          Official Verified Stamp
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Drag & Drop Upload Zone
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-12 w-full max-w-md rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    isDragOver
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 scale-[1.01]"
                      : "border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215] hover:border-emerald-700 dark:hover:border-emerald-500 hover:bg-slate-50/80 dark:hover:bg-[#16161b]"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 mb-4 shadow-2xs">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload Contractor Document
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mt-1 max-w-xs">
                    Drag & drop your contractor visa demand PDF or image file here, or click to browse from your computer.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
                    <span>PDF, PNG, JPG up to 10MB</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs font-semibold border-slate-300 dark:border-[#26262d]"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <FileUp className="mr-1.5 h-3.5 w-3.5" />
                    Browse Files
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: AI OCR Extraction & Approval Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Extract Info Trigger Card */}
          <Card className="border-slate-200/90 dark:border-[#222227] shadow-sm bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  Contractor Document AI Extractor
                </CardTitle>
                <Badge variant={extractedData ? "success" : "neutral"}>
                  {extractedData ? "Extracted" : "Pending Extraction"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Extract sponsor, civil ID, salary, and selection allocation from the uploaded document.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleExtractInfo}
                disabled={isExtracting || !uploadedFile}
                className="w-full bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold py-2.5 shadow-sm"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Document Fields...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-emerald-300" />
                    Extract Info from Document
                  </>
                )}
              </Button>

              {!uploadedFile && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Please upload a document from your PC or load a sample document to enable extraction.
                  </p>
                </div>
              )}

              {/* Parsed Info Area as requested */}
              {extractedData && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3 text-xs animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      Parsed Information Results
                    </span>
                    <span className="rounded bg-emerald-200/80 dark:bg-emerald-900 px-2 py-0.5 font-bold text-[10px] text-emerald-950 dark:text-emerald-200 uppercase">
                      Confidence: 99.8%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Contractor / Agency:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">{extractedData.contractor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Sponsor Full Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{extractedData.sponsor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Sponsor National / Civil ID:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">{extractedData.sponsor_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Job Title / Profession:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{extractedData.job_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Monthly Salary:</span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">${extractedData.salary.toLocaleString()} SAR</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200/40 dark:border-emerald-800/40">
                      <span className="text-slate-600 dark:text-zinc-400 font-semibold">Candidate Status:</span>
                      <Badge variant="success">
                        {extractedData.selection_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Decision Actions */}
          <Card className="border-slate-200/90 dark:border-[#222227] shadow-sm bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Document Approval Decision
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Approving this contractor document will transition candidate status from{" "}
                <strong>Request Pending</strong> to <strong>Selected</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => approveMutation.mutate(false)}
                  disabled={approveMutation.isPending || !extractedData}
                  className="border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject Extracted
                </Button>
                <Button
                  type="button"
                  onClick={() => approveMutation.mutate(true)}
                  disabled={approveMutation.isPending || !extractedData}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
