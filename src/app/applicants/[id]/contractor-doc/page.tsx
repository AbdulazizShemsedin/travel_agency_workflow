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
  Trash2,
  Download,
  AlertCircle,
  ExternalLink,
  Edit3,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  getApplicant,
  parseDossierFileApi,
  approveDossierAndSelectApplicant,
  uploadFileApi,
} from "@/lib/api/applicantApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ExtractedDossierData {
  contractor_name: string;
  contract_number: string;
  visa_number: string;
  sponsor_name: string;
  sponsor_id: string;
  sponsor_phone: string;
  destination_city: string;
  destination_country: string;
  job_title: string;
  salary: number;
  currency: string;
  contract_period: string;
  candidate_name: string;
  passport_number: string;
  selection_status: "Selected" | "Not Selected" | string;
  raw_backend_message?: string;
}

// Sanitizer to guarantee that visa number is ONLY the actual number/identifier and never confirmation text
function cleanVisaNumber(val: any): string {
  if (!val || (typeof val !== "string" && typeof val !== "number")) return "";
  const str = String(val).trim();
  const confirmationKeywords = [
    "verified",
    "confirm",
    "confirmed",
    "valid",
    "validated",
    "approved",
    "true",
    "yes",
    "selected",
    "passed",
    "complete",
    "completed",
    "n/a",
    "none",
    "null",
    "undefined",
  ];
  if (confirmationKeywords.includes(str.toLowerCase())) {
    return "";
  }
  return str;
}

// Parser to extract key-value fields from backend response text message if returned as string
function parseBackendString(msg: string): Partial<ExtractedDossierData> {
  const result: Partial<ExtractedDossierData> = {};
  if (!msg || typeof msg !== "string") return result;

  const visaMatch = msg.match(/(?:visa(?:\s*number|\s*no|\s*#)?[:\s]+)([A-Za-z0-9\-_]+)/i);
  if (visaMatch && cleanVisaNumber(visaMatch[1])) {
    result.visa_number = cleanVisaNumber(visaMatch[1]);
  }

  const sponsorMatch = msg.match(/(?:sponsor(?:\s*name)?[:\s]+)([^,\n.]+)/i);
  if (sponsorMatch && sponsorMatch[1]?.trim()) {
    result.sponsor_name = sponsorMatch[1].trim();
  }

  const idMatch = msg.match(/(?:sponsor\s*id|national\s*id|civil\s*id|iqama)[:\s]+([0-9]+)/i);
  if (idMatch && idMatch[1]?.trim()) {
    result.sponsor_id = idMatch[1].trim();
  }

  const salaryMatch = msg.match(/(?:salary[:\s]+)([0-9]+(?:\.[0-9]+)?)/i);
  if (salaryMatch) {
    result.salary = Number(salaryMatch[1]);
  }

  const currencyMatch = msg.match(/(?:currency[:\s]+([A-Z]{3})|\b([A-Z]{3})\s*(?:salary|\b))/i);
  if (currencyMatch) {
    result.currency = (currencyMatch[1] || currencyMatch[2])?.toUpperCase();
  }

  const contractMatch = msg.match(/(?:contract(?:\s*number|\s*no|\s*#)?[:\s]+)([A-Za-z0-9\-_]+)/i);
  if (contractMatch) {
    result.contract_number = contractMatch[1].trim();
  }

  return result;
}

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
    fileObject?: File;
  } | null>(null);

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [hasExtracted, setHasExtracted] = React.useState(false);

  // Editable Form Data State for all extracted and editable fields
  const [formData, setFormData] = React.useState<ExtractedDossierData>({
    contractor_name: "",
    contract_number: "",
    visa_number: "",
    sponsor_name: "",
    sponsor_id: "",
    sponsor_phone: "",
    destination_city: "",
    destination_country: "",
    job_title: "",
    salary: 0,
    currency: "SAR",
    contract_period: "",
    candidate_name: "",
    passport_number: "",
    selection_status: "Selected",
  });

  const { data: applicant, isLoading } = useQuery({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicant(applicantId),
    enabled: !!applicantId,
  });

  // Initialize or sync form fields with baseline applicant and dossier data
  React.useEffect(() => {
    if (applicant) {
      if (applicant.contractor_doc?.file_name && !uploadedFile?.fileObject) {
        const docAttachment =
          applicant.contractor_doc.file_attachment ||
          applicant.contractor_doc.attached_file ||
          "";
        const isPdf =
          applicant.contractor_doc.file_name.toLowerCase().endsWith(".pdf") ||
          docAttachment.toLowerCase().includes(".pdf");

        setUploadedFile((prev) => {
          if (prev?.fileObject) return prev;
          return {
            name: applicant.contractor_doc!.file_name || "Contractor_Demand_Dossier.pdf",
            size: 245000,
            type: isPdf ? "application/pdf" : "image/jpeg",
            previewUrl: docAttachment,
          };
        });
      }

      const vNo = cleanVisaNumber(
        applicant.contractor_doc?.visa_number || (applicant as any).visa_number || ""
      );

      setFormData((prev) => {
        // If user already entered custom values or already extracted in this session, don't wipe them
        if (hasExtracted && prev.visa_number) return prev;

        return {
          contractor_name:
            prev.contractor_name ||
            applicant.contractor_doc?.contractor_name ||
            applicant.locked_contractor ||
            (applicant as any).contractor ||
            "",
          contract_number:
            prev.contract_number ||
            applicant.contractor_doc?.contract_number ||
            (applicant as any).contract_number ||
            applicant.contractor_doc?.contract_request ||
            "",
          visa_number: prev.visa_number || vNo,
          sponsor_name:
            prev.sponsor_name ||
            applicant.contractor_doc?.sponsor_name ||
            (applicant as any).sponsor_name ||
            "",
          sponsor_id:
            prev.sponsor_id ||
            applicant.contractor_doc?.sponsor_id ||
            (applicant as any).sponsor_id ||
            "",
          sponsor_phone:
            prev.sponsor_phone ||
            applicant.contractor_doc?.sponsor_phone ||
            (applicant as any).sponsor_phone ||
            "",
          destination_city:
            prev.destination_city ||
            applicant.contractor_doc?.destination_city ||
            applicant.city ||
            "Riyadh",
          destination_country:
            prev.destination_country ||
            applicant.contractor_doc?.destination_country ||
            applicant.destination_country ||
            "Saudi Arabia",
          job_title:
            prev.job_title ||
            applicant.contractor_doc?.job_title ||
            applicant.job_applied ||
            "Housemaid",
          salary:
            prev.salary > 0
              ? prev.salary
              : Number(
                  applicant.contractor_doc?.salary ||
                  applicant.monthly_salary ||
                  1200
                ),
          currency: prev.currency || applicant.contractor_doc?.currency || "SAR",
          contract_period:
            prev.contract_period ||
            applicant.contractor_doc?.contract_period ||
            "2 Years (Renewable)",
          candidate_name:
            prev.candidate_name || applicant.full_name || "",
          passport_number:
            prev.passport_number || applicant.passport_number || "",
          selection_status:
            (applicant.contractor_doc?.selection_status as any) || "Selected",
          raw_backend_message: applicant.contractor_doc?.parsed_at
            ? `Synced from Dossier record (${applicant.contractor_doc.name})`
            : prev.raw_backend_message,
        };
      });
    }
  }, [applicant, applicantId, hasExtracted, uploadedFile?.fileObject]);

  // Handle local PC file selection
  const processFile = (file: File) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
      toast.error("Invalid File Type", {
        description: "Please upload a PDF document or image file (PDF, PNG, JPG, WebP).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultUrl = reader.result as string;
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        previewUrl: resultUrl,
        fileObject: file,
      });
      toast.success("Document Loaded Successfully", {
        description: `${file.name} (${(file.size / 1024).toFixed(1)} KB) is ready for viewing and extraction.`,
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

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Uploaded document cleared.");
  };

  // Trigger OCR extraction on the uploaded file via real parse_dossier_file RPC
  const handleExtractInfo = async () => {
    if (!uploadedFile) {
      toast.error("No Document Available", {
        description: "Please upload a contractor document from your PC.",
      });
      return;
    }

    setIsExtracting(true);
    try {
      // 1. Upload file attachment first to Frappe /files
      let fileUrl =
        uploadedFile.previewUrl && uploadedFile.previewUrl.startsWith("/files/")
          ? uploadedFile.previewUrl
          : "";

      if (uploadedFile.fileObject) {
        try {
          const uploadRes = await uploadFileApi(uploadedFile.fileObject);
          fileUrl =
            (uploadRes as any)?.file_url ||
            (uploadRes as any)?.message?.file_url ||
            "";
        } catch (uploadErr) {
          console.warn("File upload warning:", uploadErr);
        }
      }

      // 2. Resolve or create Applicant Dossier in Frappe
      let dossierName = applicant?.contractor_doc?.name || "";

      const checkDos = await fetch(
        `/api/resource/Applicant%20Dossier?filters=[["applicant","=","${encodeURIComponent(
          applicantId
        )}"]]&fields=["*"]`
      );
      const checkDosJson = await checkDos.json();
      const existingDos = checkDosJson.data?.[0];

      if (existingDos) {
        dossierName = existingDos.name;
        if (fileUrl) {
          await fetch(`/api/resource/Applicant%20Dossier/${encodeURIComponent(existingDos.name)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attached_file: fileUrl,
              file_attachment: fileUrl,
              file_name: uploadedFile.name,
              approval_status: "Pending",
            }),
          });
        }
      } else {
        // Resolve or create Contract Request foreign link if needed
        let crName = applicant?.contract_request?.name || "";
        const contractorName =
          formData.contractor_name ||
          applicant?.locked_contractor ||
          (applicant as any)?.contractor_name ||
          "Al-Amal Recruitment Riyadh";

        if (!crName) {
          try {
            const crRes = await fetch(
              `/api/resource/Contract%20Request?filters=[["applicant","=","${encodeURIComponent(
                applicantId
              )}"]]&fields=["*"]`
            );
            const crJson = await crRes.json();
            crName = crJson.data?.[0]?.name || "";

            if (!crName) {
              const newCrRes = await fetch("/api/resource/Contract Request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  applicant: applicantId,
                  contractor: contractorName,
                  cv_reference:
                    applicant?.cv_record || `CV-${applicantId.replace("APP-", "")}`,
                  status: "Sent",
                  created_date: new Date().toISOString().slice(0, 19).replace("T", " "),
                }),
              });
              if (newCrRes.ok) {
                const newCrJson = await newCrRes.json();
                crName = newCrJson.data?.name || "";
              }
            }
          } catch {}
        }

        const createDosRes = await fetch("/api/resource/Applicant Dossier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant: applicantId,
            contract_request: crName || undefined,
            contractor: contractorName,
            contractor_name: contractorName,
            attached_file: fileUrl || undefined,
            file_attachment: fileUrl || undefined,
            file_name: uploadedFile.name,
            approval_status: "Pending",
            is_parsed: 0,
          }),
        });

        if (createDosRes.ok) {
          const createDosJson = await createDosRes.json();
          dossierName = createDosJson.data?.name || "";
        } else {
          const errText = await createDosRes.text();
          console.warn("Applicant Dossier POST response:", errText);
        }
      }

      if (!dossierName) {
        throw new Error(
          "Could not initialize Applicant Dossier record in Frappe. Please verify contract file and candidate selection."
        );
      }

      // 3. Invoke real backend parse_dossier_file RPC
      const res = await parseDossierFileApi(dossierName);

      // 4. Fetch refreshed dossier data from backend
      const refreshedDos = await fetch(
        `/api/resource/Applicant%20Dossier/${encodeURIComponent(dossierName)}`
      );
      const refreshedDosJson = await refreshedDos.json();
      const docData = refreshedDosJson?.data || {};

      const rawMsg = typeof res?.message === "string" ? res.message : "";
      const stringParsed = rawMsg ? parseBackendString(rawMsg) : {};

      const extData =
        typeof res?.message === "object"
          ? (res?.message as any)?.extracted_data || (res?.message as any)?.data || res?.message
          : null;

      // Extract real visa number without confirmation text
      const extractedVisa = cleanVisaNumber(
        extData?.visa_number ||
        extData?.visa_no ||
        extData?.visa_num ||
        extData?.musaned_visa_number ||
        docData.visa_number ||
        docData.visa_no ||
        docData.musaned_visa_number ||
        stringParsed.visa_number ||
        (applicant as any)?.visa_number ||
        formData.visa_number ||
        ""
      );

      // Populate form data with extracted fields while keeping any user entered non-empty values as fallback
      setFormData((prev) => ({
        contractor_name:
          extData?.contractor_name ||
          docData.contractor_name ||
          docData.contractor ||
          prev.contractor_name ||
          applicant?.locked_contractor ||
          (applicant as any)?.contractor ||
          "",
        contract_number:
          extData?.contract_number ||
          extData?.contract_no ||
          docData.contract_number ||
          docData.contract_no ||
          stringParsed.contract_number ||
          docData.contract_request ||
          prev.contract_number ||
          "",
        visa_number: extractedVisa || prev.visa_number || "",
        sponsor_name:
          extData?.sponsor_name ||
          docData.sponsor_name ||
          stringParsed.sponsor_name ||
          prev.sponsor_name ||
          (applicant as any)?.sponsor_name ||
          "",
        sponsor_id:
          extData?.sponsor_id ||
          extData?.sponsor_nid ||
          docData.sponsor_id ||
          stringParsed.sponsor_id ||
          prev.sponsor_id ||
          (applicant as any)?.sponsor_id ||
          "",
        sponsor_phone:
          extData?.sponsor_phone ||
          docData.sponsor_phone ||
          prev.sponsor_phone ||
          (applicant as any)?.sponsor_phone ||
          "",
        destination_city:
          extData?.destination_city ||
          extData?.city ||
          docData.destination_city ||
          docData.city ||
          prev.destination_city ||
          applicant?.city ||
          "",
        destination_country:
          extData?.destination_country ||
          extData?.country ||
          docData.destination_country ||
          docData.country ||
          prev.destination_country ||
          applicant?.destination_country ||
          "",
        job_title:
          extData?.job_title ||
          extData?.profession ||
          docData.job_title ||
          prev.job_title ||
          applicant?.job_applied ||
          "",
        salary:
          Number(extData?.salary) ||
          Number(docData.salary) ||
          Number(docData.amount_detail) ||
          Number(stringParsed.salary) ||
          prev.salary ||
          Number(applicant?.monthly_salary) ||
          0,
        currency:
          extData?.currency ||
          docData.currency ||
          stringParsed.currency ||
          prev.currency ||
          "SAR",
        contract_period:
          extData?.contract_period ||
          extData?.duration ||
          docData.contract_period ||
          prev.contract_period ||
          "",
        candidate_name:
          extData?.candidate_name ||
          extData?.full_name ||
          docData.candidate_name ||
          prev.candidate_name ||
          applicant?.full_name ||
          "",
        passport_number:
          extData?.passport_number ||
          docData.passport_number ||
          prev.passport_number ||
          applicant?.passport_number ||
          "",
        selection_status:
          (docData.selection_status as any) ||
          prev.selection_status ||
          "Selected",
        raw_backend_message:
          typeof res?.message === "string"
            ? res.message
            : (res as any)?.message?.message ||
              (res as any)?.message?.status ||
              "Document fields parsed into form below. You can edit any field before confirming approval.",
      }));

      setHasExtracted(true);

      // Keep local preview URL intact
      if (fileUrl && (!uploadedFile.previewUrl || !uploadedFile.previewUrl.startsWith("data:"))) {
        setUploadedFile((prev) => (prev ? { ...prev, previewUrl: fileUrl } : null));
      }

      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });

      toast.success("Document Extracted Successfully!", {
        description: "Review and edit the fields below before approving.",
      });
    } catch (err: any) {
      console.error("Dossier parsing error:", err);
      toast.error("Extraction Failed", {
        description:
          err.message ||
          "Failed to parse dossier document. You can still manually enter the details below.",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Approval Mutation using user-edited form fields
  const approveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      if (approved) {
        return await approveDossierAndSelectApplicant(applicantId, {
          sponsor_name: formData.sponsor_name || undefined,
          sponsor_id: formData.sponsor_id || undefined,
          sponsor_phone: formData.sponsor_phone || undefined,
          contract_number: formData.contract_number || undefined,
          visa_number: formData.visa_number || undefined,
          contractor_name: formData.contractor_name || undefined,
          salary: formData.salary || undefined,
          currency: formData.currency || undefined,
          job_title: formData.job_title || undefined,
          destination_city: formData.destination_city || undefined,
          destination_country: formData.destination_country || undefined,
          contract_period: formData.contract_period || undefined,
        });
      } else {
        return null;
      }
    },
    onSuccess: (data, approved) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      if (approved) {
        toast.success("Document & Contract Approved! Candidate is now in Selected stage.", {
          description: "Contract and visa details saved. You can now manage processing clearances.",
        });
        router.push(`/applicants/${encodeURIComponent(applicantId)}`);
      } else {
        toast.warning("Extracted information rejected.", {
          description: "Candidate remains in current stage.",
        });
      }
    },
    onError: (err: Error) => toast.error("Action failed", { description: err.message }),
  });

  const handleResetFields = () => {
    if (applicant) {
      setFormData({
        contractor_name: applicant.locked_contractor || (applicant as any).contractor || "",
        contract_number: "",
        visa_number: "",
        sponsor_name: "",
        sponsor_id: "",
        sponsor_phone: "",
        destination_city: applicant.city || "Riyadh",
        destination_country: applicant.destination_country || "Saudi Arabia",
        job_title: applicant.job_applied || "Housemaid",
        salary: Number(applicant.monthly_salary || 1200),
        currency: "SAR",
        contract_period: "2 Years (Renewable)",
        candidate_name: applicant.full_name || "",
        passport_number: applicant.passport_number || "",
        selection_status: "Selected",
        raw_backend_message: undefined,
      });
      setHasExtracted(false);
      toast.info("Fields reset to applicant defaults.");
    }
  };

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

  const isImageDocument =
    uploadedFile &&
    (uploadedFile.type.startsWith("image/") ||
      (!uploadedFile.type.includes("pdf") && uploadedFile.name.match(/\.(png|jpe?g|webp|gif)$/i)));

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
        </div>
      </div>

      {/* Side-by-Side Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Real Document Dropzone & Document Viewer */}
        <div className="lg:col-span-6 space-y-4">
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
                    {uploadedFile.previewUrl && (
                      <a
                        href={uploadedFile.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                        title="Open Document in New Tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
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
            <CardContent className="p-3 bg-slate-100 dark:bg-[#0d0d10] min-h-[620px] flex items-center justify-center">
              {uploadedFile && (uploadedFile.previewUrl || uploadedFile.fileObject) ? (
                isImageDocument ? (
                  // Image Document Viewer
                  <div className="w-full flex flex-col items-center justify-center p-3 bg-white dark:bg-[#121215] rounded-lg border border-slate-300 dark:border-[#26262d] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedFile.previewUrl}
                      alt={uploadedFile.name}
                      className="max-h-[620px] w-auto object-contain rounded"
                    />
                  </div>
                ) : (
                  // PDF / Document Viewer
                  <div className="w-full h-full min-h-[600px] flex flex-col bg-white dark:bg-[#121215] rounded-lg border border-slate-300 dark:border-[#26262d] shadow-sm overflow-hidden">
                    {uploadedFile.previewUrl ? (
                      <div className="w-full flex flex-col h-full">
                        {/* Top bar inside PDF viewer for direct opening */}
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#16161b] border-b border-slate-200 dark:border-[#26262d] text-xs">
                          <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate max-w-xs">
                            {uploadedFile.name}
                          </span>
                          <a
                            href={uploadedFile.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open in New Tab</span>
                          </a>
                        </div>
                        <object
                          data={uploadedFile.previewUrl}
                          type="application/pdf"
                          className="w-full h-[600px]"
                        >
                          <iframe
                            src={uploadedFile.previewUrl}
                            className="w-full h-[600px] border-0"
                            title={uploadedFile.name}
                          />
                        </object>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[500px]">
                        <FileText className="h-16 w-16 text-emerald-800 dark:text-emerald-400" />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{uploadedFile.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">Ready for backend OCR parsing</p>
                        </div>
                      </div>
                    )}
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
                    <span>PDF, PNG, JPG, WebP up to 10MB</span>
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

        {/* Right Side: Editable Form Fields & AI OCR Extraction Controls */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200/90 dark:border-[#222227] shadow-sm bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Contract & Visa Allocation Details
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasExtracted ? "success" : "info"}>
                    {hasExtracted ? "Extracted & Editable" : "Editable Form"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFields}
                    className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    title="Reset to applicant defaults"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                You can extract data automatically from the document or directly add and edit fields below.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-5">
              {/* Extract Info Trigger Button */}
              <div className="space-y-2">
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
                      Extract Info from Document (PyMuPDF)
                    </>
                  )}
                </Button>

                {!uploadedFile && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Upload a document from your PC to enable automatic OCR extraction, or fill in the fields below manually.
                  </p>
                )}

                {/* Backend Engine Response Feedback */}
                {formData.raw_backend_message && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-[11px] text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 animate-in fade-in">
                    <FileCheck2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                    <div>
                      <span className="font-bold block">Backend Parser Feedback:</span>
                      <span>{formData.raw_backend_message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 1: Contract & Visa Identifiers */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-slate-50/50 dark:bg-[#16161b]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#26262d] pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    1. Contract & Authorization Details
                  </span>
                  <span className="text-[10px] text-slate-400">Editable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Contract Number
                    </Label>
                    <Input
                      value={formData.contract_number}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contract_number: e.target.value }))
                      }
                      placeholder="e.g. CONT-2026-0045"
                      className="h-8 text-xs font-mono bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
                      Visa Number (Digits only) *
                    </Label>
                    <Input
                      value={formData.visa_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visa_number: cleanVisaNumber(e.target.value),
                        }))
                      }
                      placeholder="e.g. 1304958201"
                      className="h-8 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 bg-white dark:bg-[#121215] border-emerald-300 dark:border-emerald-800 focus-visible:ring-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Foreign Contractor / Agency
                    </Label>
                    <Input
                      value={formData.contractor_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contractor_name: e.target.value }))
                      }
                      placeholder="e.g. Al-Amal Recruitment Agency"
                      className="h-8 text-xs bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Contract Period / Duration
                    </Label>
                    <Input
                      value={formData.contract_period}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contract_period: e.target.value }))
                      }
                      placeholder="e.g. 2 Years (Renewable)"
                      className="h-8 text-xs bg-white dark:bg-[#121215]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Sponsor & Employer Details */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-slate-50/50 dark:bg-[#16161b]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#26262d] pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    2. Sponsor & Employer Details
                  </span>
                  <span className="text-[10px] text-slate-400">Editable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Sponsor Full Name
                    </Label>
                    <Input
                      value={formData.sponsor_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sponsor_name: e.target.value }))
                      }
                      placeholder="e.g. Mohammed Al-Harbi"
                      className="h-8 text-xs bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      National / Civil ID (Iqama)
                    </Label>
                    <Input
                      value={formData.sponsor_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sponsor_id: e.target.value }))
                      }
                      placeholder="e.g. 1092837465"
                      className="h-8 text-xs font-mono bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Sponsor Contact Phone
                    </Label>
                    <Input
                      value={formData.sponsor_phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sponsor_phone: e.target.value }))
                      }
                      placeholder="e.g. +966 50 123 4567"
                      className="h-8 text-xs font-mono bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Destination City & Country
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={formData.destination_city}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, destination_city: e.target.value }))
                        }
                        placeholder="City (e.g. Riyadh)"
                        className="h-8 text-xs bg-white dark:bg-[#121215]"
                      />
                      <Input
                        value={formData.destination_country}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, destination_country: e.target.value }))
                        }
                        placeholder="Country"
                        className="h-8 text-xs bg-white dark:bg-[#121215]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Job & Compensation */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-slate-50/50 dark:bg-[#16161b]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#26262d] pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    3. Job & Compensation
                  </span>
                  <span className="text-[10px] text-slate-400">Editable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Profession / Role
                    </Label>
                    <Input
                      value={formData.job_title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, job_title: e.target.value }))
                      }
                      placeholder="e.g. Housemaid"
                      className="h-8 text-xs bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Monthly Salary
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.salary || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          salary: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="e.g. 1200"
                      className="h-8 text-xs font-bold font-mono bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Currency
                    </Label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currency: e.target.value }))
                      }
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#121215] px-2 text-xs font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      <option value="SAR">SAR (Saudi Riyal)</option>
                      <option value="USD">USD ($)</option>
                      <option value="ETB">ETB (Ethiopian Birr)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                      <option value="KWD">KWD (Kuwaiti Dinar)</option>
                      <option value="QAR">QAR (Qatari Riyal)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Candidate Confirmation */}
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-slate-50/50 dark:bg-[#16161b]/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#26262d] pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    4. Candidate Allocation Confirmation
                  </span>
                  <Badge variant="success">✓ {formData.selection_status}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Candidate Name
                    </Label>
                    <Input
                      value={formData.candidate_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, candidate_name: e.target.value }))
                      }
                      placeholder="Candidate Full Name"
                      className="h-8 text-xs bg-white dark:bg-[#121215]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                      Passport Number
                    </Label>
                    <Input
                      value={formData.passport_number}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, passport_number: e.target.value }))
                      }
                      placeholder="Passport Number"
                      className="h-8 text-xs font-mono bg-white dark:bg-[#121215]"
                    />
                  </div>
                </div>
              </div>

              {/* Approval Decision Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#222227] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => approveMutation.mutate(false)}
                    disabled={approveMutation.isPending}
                    className="border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Reject Extracted
                  </Button>
                  <Button
                    type="button"
                    onClick={() => approveMutation.mutate(true)}
                    disabled={approveMutation.isPending}
                    className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving & Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve Document & Save Details
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 text-center">
                  Approving will update the candidate allocation with the fields above and transition stage to <strong>Selected</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
