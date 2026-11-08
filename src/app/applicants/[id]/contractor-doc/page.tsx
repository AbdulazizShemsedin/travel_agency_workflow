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
  Plane,
  Shield,
  Stamp,
  User,
  HelpCircle,
  FileBadge2,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PremiumDropzone } from "@/components/ui/PremiumDropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getApplicantV2, updateApplicantV2, V2ApplicantDetails } from "@/lib/api/v2/applicants";
import {
  getPlacementV2,
  listPlacementsV2,
  listMyPlacementsV2,
  uploadContractV2,
  uploadPlacementContractV2,
  uploadVisaV2,
  uploadPlacementVisaV2,
  recordSelectedMedicalResultV2,
  advancePlacementV2,
  updatePlacementParsedFieldsV2,
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

/**
 * Extracts only valid, non-null, non-empty, non-zero values from a source object,
 * stripping internal DocType metadata so unpopulated placement fields do not clobber
 * extracted document data.
 */
export function extractValidContractFields(source: any): Record<string, any> {
  if (!source || typeof source !== "object") return {};
  const cleaned: Record<string, any> = {};
  const ignoredKeys = new Set([
    "name", "doctype", "owner", "creation", "modified", "modified_by",
    "idx", "docstatus", "_user_tags", "_comments", "_assign", "_liked_by",
    "status", "message", "success"
  ]);

  for (const [key, value] of Object.entries(source)) {
    if (ignoredKeys.has(key)) continue;
    if (value !== null && value !== undefined && value !== "" && value !== 0 && value !== "0") {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Counts meaningful extracted contract fields to accurately discriminate
 * between full extraction, partial extraction, and extraction failure.
 */
export function countExtractedContractFields(parsed: Record<string, any>): number {
  if (!parsed || typeof parsed !== "object") return 0;
  let count = 0;
  if (parsed.contract_signed_date || parsed.contract_date) count++;
  if (parsed.contract_number) count++;
  if (parsed.employer_name || parsed.sponsor_name) count++;
  if (parsed.employer_national_id || parsed.sponsor_id) count++;
  if (parsed.salary_amount || parsed.contract_salary_amount || parsed.salary) count++;
  if (parsed.saudi_agency_name || parsed.kuwait_agency_name || parsed.contractor_name) count++;
  if (parsed.visa_number) count++;
  if (parsed.employment_site || parsed.work_site) count++;
  if (parsed.contract_duration || parsed.duration || parsed.contract_period) count++;
  return count;
}

/**
 * Counts meaningful extracted visa fields.
 */
export function countExtractedVisaFields(parsed: Record<string, any>): number {
  if (!parsed || typeof parsed !== "object") return 0;
  let count = 0;
  if (parsed.visa_number) count++;
  if (parsed.visa_type) count++;
  if (parsed.visa_issue_date || parsed.issue_date) count++;
  if (parsed.visa_expiry_date || parsed.expiry_date) count++;
  if (parsed.sponsor_name || parsed.employer_name) count++;
  if (parsed.sponsor_id || parsed.civil_id || parsed.employer_national_id) count++;
  return count;
}

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
  const [isRetryingExtraction, setIsRetryingExtraction] = React.useState(false);
  const [contractParseResult, setContractParseResult] = React.useState<V2ParsedContractData | null>(null);
  const [isApprovingContract, setIsApprovingContract] = React.useState(false);
  const [isContractApproved, setIsContractApproved] = React.useState(false);

  // Visa upload state
  const [visaFile, setVisaFile] = React.useState<File | null>(null);
  const [visaPreviewUrl, setVisaPreviewUrl] = React.useState<string>("");
  const [isVisaUploading, setIsVisaUploading] = React.useState(false);
  const [isRetryingVisaExtraction, setIsRetryingVisaExtraction] = React.useState(false);
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
    queryKey: ["v2_placements_for_doc_center", applicantId, applicant?.active_placement],
    queryFn: async () => {
      if (!applicantId) return [];

      const cleanApplicantId = applicantId.trim();
      const lowerApplicantId = cleanApplicantId.toLowerCase();

      // Priority 1: If applicant document already has active_placement linked, fetch directly
      const linkedPlacementName = typeof applicant?.active_placement === "string"
        ? applicant.active_placement.trim()
        : (applicant?.active_placement as any)?.name?.trim();

      if (linkedPlacementName) {
        try {
          const direct = await getPlacementV2(linkedPlacementName);
          if (direct && direct.name) {
            return [direct];
          }
        } catch {
          // Fall through
        }
      }

      // Priority 2: If applicantId is itself a Placement name (e.g. PLM-XXXXX), fetch directly
      if (cleanApplicantId.toUpperCase().startsWith("PLM-")) {
        try {
          const direct = await getPlacementV2(cleanApplicantId);
          if (direct && direct.name) {
            return [direct];
          }
        } catch {
          // Fall through
        }
      }

      // Priority 3: Server-side filtered query via listPlacementsV2
      try {
        const filtered = await listPlacementsV2([{ applicant: cleanApplicantId }]);
        if (Array.isArray(filtered) && filtered.length > 0) {
          return filtered;
        }
      } catch {
        // Fall through
      }

      // Priority 4: Direct list_placements with { applicant: cleanApplicantId } object filter
      try {
        const filtered = await listPlacementsV2({ applicant: cleanApplicantId });
        if (Array.isArray(filtered) && filtered.length > 0) {
          return filtered;
        }
      } catch {
        // Fall through
      }

      // Priority 5: Fallback to listMyPlacementsV2 for Foreign Agency
      try {
        const myPlacements = await listMyPlacementsV2();
        const matched = myPlacements.filter(
          (p) =>
            (p.applicant && p.applicant.toLowerCase().trim() === lowerApplicantId) ||
            (p.name && p.name.toLowerCase().trim() === lowerApplicantId)
        );
        if (matched.length > 0) return matched;
      } catch {
        // Fall through
      }

      // Priority 6: Unfiltered listPlacementsV2 with case-insensitive match
      try {
        const all = await listPlacementsV2(undefined, 250);
        const matched = all.filter(
          (p) =>
            (p.applicant && p.applicant.toLowerCase().trim() === lowerApplicantId) ||
            (p.name && p.name.toLowerCase().trim() === lowerApplicantId)
        );
        if (matched.length > 0) return matched;
      } catch {
        // Fall through
      }

      return [];
    },
    enabled: !!applicantId,
    staleTime: 15000,
  });

  const activePlacement = React.useMemo(() => {
    if (!placements || placements.length === 0) return null;
    const linkedName = typeof applicant?.active_placement === "string"
      ? applicant.active_placement.trim().toLowerCase()
      : (applicant?.active_placement as any)?.name?.trim()?.toLowerCase();
    if (linkedName) {
      const matchedLinked = placements.find((p) => p.name?.toLowerCase().trim() === linkedName);
      if (matchedLinked) return matchedLinked;
    }
    const nonCancelled = placements.find((p) => p.status !== "Cancelled");
    if (nonCancelled) return nonCancelled;
    return placements[0];
  }, [placements, applicant?.active_placement]);
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

  // Helper to extract clean file extension from filename or URL
  const getFileExtension = React.useCallback((nameOrUrl: string, fallback = "pdf") => {
    if (!nameOrUrl) return fallback;
    const clean = nameOrUrl.split("?")[0].split("#")[0];
    const lastDot = clean.lastIndexOf(".");
    if (lastDot !== -1 && lastDot < clean.length - 1) {
      const ext = clean.substring(lastDot + 1).toLowerCase();
      if (ext.length <= 5) return ext;
    }
    return fallback;
  }, []);

  const currentContractUrl = contractPreviewUrl || previewFileUrl;
  const currentContractName = (
    contractFile?.name ||
    activePlacement?.contract_file?.split("/").pop()?.split("?")[0]?.split("#")[0] ||
    previewFileUrl.split("/").pop()?.split("?")[0]?.split("#")[0] ||
    ""
  ).toLowerCase();

  const isWordContract = React.useMemo(() => {
    return (
      currentContractName.endsWith(".docx") ||
      currentContractName.endsWith(".doc") ||
      currentContractName.endsWith(".odt") ||
      currentContractName.endsWith(".rtf") ||
      currentContractName.endsWith(".txt") ||
      (contractFile?.type?.includes("wordprocessingml") ?? false) ||
      (contractFile?.type?.includes("msword") ?? false) ||
      (contractFile?.type?.includes("opendocument.text") ?? false) ||
      (contractFile?.type?.includes("rtf") ?? false) ||
      (contractFile?.type?.includes("text/plain") ?? false)
    );
  }, [currentContractName, contractFile]);

  const contractDownloadExt = React.useMemo(() => {
    if (contractFile?.name) {
      return getFileExtension(contractFile.name, isWordContract ? "docx" : "pdf");
    }
    if (currentContractUrl) {
      return getFileExtension(currentContractUrl, isWordContract ? "docx" : "pdf");
    }
    return isWordContract ? "docx" : "pdf";
  }, [contractFile, currentContractUrl, isWordContract, getFileExtension]);

  const handleDownloadContract = React.useCallback(() => {
    const url = contractPreviewUrl || previewFileUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `Contract_${applicantId || "candidate"}.${contractDownloadExt}`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Document downloaded!");
  }, [contractPreviewUrl, previewFileUrl, applicantId, contractDownloadExt]);

  // Dynamic resolver for target placement ensuring resilience across race conditions,
  // multi-role access (Registrar/Parser/Foreign Agency), and direct placement linking
  const resolveTargetPlacement = React.useCallback(async (): Promise<V2PlacementRecord | null> => {
    // 1. If activePlacement is already set in component state, use it
    if (activePlacement) return activePlacement;

    const cleanApplicantId = (applicantId || "").trim();
    const lowerApplicantId = cleanApplicantId.toLowerCase();

    // 2. Check if applicant document has active_placement linked
    let pName = typeof applicant?.active_placement === "string"
      ? applicant.active_placement.trim()
      : (applicant?.active_placement as any)?.name?.trim();

    // 3. If not yet loaded on local applicant, fetch fresh applicant doc
    if (!pName && cleanApplicantId) {
      try {
        const freshApp = await getApplicantV2(cleanApplicantId);
        pName = typeof freshApp?.active_placement === "string"
          ? freshApp.active_placement.trim()
          : (freshApp?.active_placement as any)?.name?.trim();
      } catch {
        // Fall through
      }
    }

    // 4. If we have a linked placement name, fetch via getPlacementV2
    if (pName) {
      try {
        const direct = await getPlacementV2(pName);
        if (direct && direct.name) return direct;
      } catch {
        // Fall through
      }
    }

    // 5. If applicantId is itself a Placement name (e.g. PLM-XXXXX), fetch directly
    if (cleanApplicantId.toUpperCase().startsWith("PLM-")) {
      try {
        const direct = await getPlacementV2(cleanApplicantId);
        if (direct && direct.name) return direct;
      } catch {
        // Fall through
      }
    }

    // 6. Server-side filtered query via listPlacementsV2
    try {
      const filtered = await listPlacementsV2([{ applicant: cleanApplicantId }]);
      if (Array.isArray(filtered) && filtered.length > 0) {
        return filtered.find((p) => p.status !== "Cancelled") || filtered[0];
      }
    } catch {
      // Fall through
    }

    // 7. Server-side filtered query via listPlacementsV2 with object
    try {
      const filtered = await listPlacementsV2({ applicant: cleanApplicantId });
      if (Array.isArray(filtered) && filtered.length > 0) {
        return filtered.find((p) => p.status !== "Cancelled") || filtered[0];
      }
    } catch {
      // Fall through
    }

    // 8. Foreign Agency listMyPlacementsV2
    try {
      const myPlacements = await listMyPlacementsV2();
      const matched = myPlacements.filter(
        (p) =>
          (p.applicant && p.applicant.toLowerCase().trim() === lowerApplicantId) ||
          (p.name && p.name.toLowerCase().trim() === lowerApplicantId)
      );
      if (matched.length > 0) {
        return matched.find((p) => p.status !== "Cancelled") || matched[0];
      }
    } catch {
      // Fall through
    }

    // 9. Unfiltered listPlacementsV2 fallback
    try {
      const all = await listPlacementsV2(undefined, 250);
      const matched = all.filter(
        (p) =>
          (p.applicant && p.applicant.toLowerCase().trim() === lowerApplicantId) ||
          (p.name && p.name.toLowerCase().trim() === lowerApplicantId)
      );
      if (matched.length > 0) {
        return matched.find((p) => p.status !== "Cancelled") || matched[0];
      }
    } catch {
      // Fall through
    }

    return null;
  }, [activePlacement, applicant, applicantId]);

  // Upload & Attach Contract Mutation
  const handleUploadContract = async (previewOnly = false) => {
    if (!contractFile) {
      toast.error("No file selected", { description: "Please choose a contract document first." });
      return;
    }

    setIsContractUploading(true);
    try {
      // Authoritatively resolve target placement before validating status
      let targetPlacement = activePlacement;
      if (!targetPlacement && !previewOnly) {
        targetPlacement = await resolveTargetPlacement();
      }

      if (targetPlacement?.status === "Requested") {
        toast.error("Awaiting Internal Confirmation", {
          description: "Your selection request is awaiting review by the agency office. Contracts cannot be uploaded until approved.",
        });
        return;
      }
      if ((targetPlacement as any)?.request_denied === 1) {
        toast.error("Candidate Unavailable", {
          description: "This candidate is unavailable. Please select another candidate.",
        });
        return;
      }
      if (!targetPlacement && !previewOnly) {
        toast.error("No Active Placement", {
          description: "Candidate must be Selected with an active Placement record before attaching contracts.",
        });
        return;
      }
      if (targetPlacement && targetPlacement.status === "Cancelled" && !previewOnly) {
        toast.error("Placement Cancelled", {
          description: "This placement case has been cancelled. Contracts cannot be attached to cancelled placements.",
        });
        return;
      }

      // 1. Upload file via /api/method/upload_file
      const uploadRes = await uploadFileV2(
        contractFile,
        false,
        "Placement",
        targetPlacement?.name
      );

      const fileUrl = uploadRes.file_url;
      setPreviewFileUrl(fileUrl);
      setContractPreviewUrl(fileUrl);

      if (previewOnly) {
        // Run OCR parsing preview only (does not attach to placement)
        try {
          const parsed = await parseContractFileV2(fileUrl, destinationCountry);
          const validParsed = extractValidContractFields(parsed);
          setContractParseResult(validParsed);
          const count = countExtractedContractFields(validParsed);
          if (count >= 4) {
            toast.success("Contract Parsed for Preview", {
              description: "Structured fields extracted from contract file. Review and then attach.",
            });
          } else if (count > 0) {
            toast.info("Partial Terms Extracted for Preview", {
              description: "Some fields extracted. Review and then attach to placement.",
            });
          } else {
            toast.warning("Extraction Incomplete", {
              description: "Could not extract structured fields. You can still attach and edit terms manually.",
            });
          }
        } catch (e: any) {
          toast.error("Contract Preview Extraction Failed", {
            description: e?.message || "Failed to extract terms from preview document.",
          });
        }
      } else {
        // Authoritative upload_contract attachment to Placement
        const uploadContractRes = await uploadContractV2(targetPlacement!.name, fileUrl);

        // Also run OCR extraction immediately so extracted fields populate
        let parsed: any = null;
        let parseError: any = null;
        try {
          parsed = await parseContractFileV2(fileUrl, destinationCountry);
        } catch (e: any) {
          parseError = e;
          console.warn("[Contract Doc] OCR parsing error:", e);
        }

        const validPlacement = extractValidContractFields(uploadContractRes);
        const validParsed = parsed ? extractValidContractFields(parsed) : {};
        // validParsed takes precedence over validPlacement; neither has null or empty values
        const combined = {
          ...validPlacement,
          ...validParsed,
        };
        if (Object.keys(combined).length > 0) {
          setContractParseResult((prev: any) => ({
            ...(prev ? extractValidContractFields(prev) : {}),
            ...combined,
          }));
        }

        const extractedCount = countExtractedContractFields(validParsed);

        if (!parseError && extractedCount >= 4) {
          // Outcome A: Attachment + Extraction successful
          toast.success("Contract Attached & Info Extracted", {
            description: `Contract attached to ${targetPlacement!.name}. Review extracted info below and approve to save.`,
          });
        } else if (!parseError && extractedCount > 0) {
          // Outcome E: Partial extraction
          toast.info("Contract Attached — Partial Info Extracted", {
            description: `Contract attached to ${targetPlacement!.name}. Some terms were extracted. Review and complete the remaining fields below.`,
          });
        } else {
          // Outcome B: Attachment successful but extraction failed/empty
          toast.warning("Contract Attached — Extraction Incomplete", {
            description: "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually.",
          });
        }

        setContractFile(null);
        queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center"] });
        refetchPlacements();
        refetchApplicant();
      }
    } catch (err: any) {
      toast.error("Contract Upload Failed", {
        description: err?.message || "Failed to attach contract file. Please try again.",
      });
    } finally {
      setIsContractUploading(false);
    }
  };

  // One-click Retry Extraction for Attached Contract
  const handleRetryContractExtraction = async () => {
    const targetFileUrl = previewFileUrl || contractPreviewUrl || activePlacement?.contract_file;
    if (!targetFileUrl) {
      toast.error("No Contract Document", {
        description: "Please attach a contract document before retrying extraction.",
      });
      return;
    }

    setIsRetryingExtraction(true);
    try {
      const parsed = await parseContractFileV2(targetFileUrl, destinationCountry);
      const validParsed = extractValidContractFields(parsed);
      const validPlacement = extractValidContractFields(activePlacement);
      const combined = {
        ...validPlacement,
        ...validParsed,
      };
      setContractParseResult((prev: any) => ({
        ...(prev ? extractValidContractFields(prev) : {}),
        ...combined,
      }));

      const count = countExtractedContractFields(validParsed);
      if (count >= 4) {
        toast.success("Contract Info Extracted", {
          description: "Contract document parsed successfully. Review extracted terms below and approve to save.",
        });
      } else if (count > 0) {
        toast.info("Contract Terms Partially Extracted", {
          description: "Some terms were extracted. Review and complete the remaining terms manually.",
        });
      } else {
        toast.warning("Contract Extraction Incomplete", {
          description: "Could not extract structured information from this document. Please review and enter terms manually using Edit Terms.",
        });
      }
    } catch (err: any) {
      toast.error("Contract Extraction Failed", {
        description: err?.message || "Failed to extract terms from contract document. Please review manually.",
      });
    } finally {
      setIsRetryingExtraction(false);
    }
  };

  // Approve Extracted Contract Data (Verifies & saves extracted contract fields without advancing placement stage)
  const handleApproveContractData = async () => {
    let targetPlacement = activePlacement;
    if (!targetPlacement) {
      targetPlacement = await resolveTargetPlacement();
    }
    if (!targetPlacement) {
      toast.error("No active placement record found.");
      return;
    }

    const hasContract = Boolean(
      targetPlacement.contract_file ||
      targetPlacement.contract_number ||
      contractParseResult?.contract_number ||
      (applicant as any)?.contract_file ||
      (applicant as any)?.contract_number
    );
    if (!hasContract) {
      toast.error("Signed Contract Required", {
        description: "Please upload and attach the signed contract document before approving contract data.",
      });
      return;
    }

    setIsApprovingContract(true);
    try {
      // 1. Optionally sync medical status if recorded
      const isFit = targetPlacement.medical_selected_status === "FIT" || applicant?.medical_status === "FIT";
      const medDate = targetPlacement.medical_selected_examination_date || applicant?.medical_issue_date;
      if (isFit && medDate && targetPlacement.medical_selected_status !== "FIT") {
        await recordSelectedMedicalResultV2(
          targetPlacement.name,
          "FIT",
          medDate,
          targetPlacement.medical_selected_expiry_date || applicant?.medical_expiry_date || undefined
        );
      }

      // 2. Save and approve the extracted contract fields on the placement
      const payloadToUpdate: Record<string, any> = {};
      const employerName = contractParseResult?.employer_name || contractParseResult?.sponsor_name;
      const employerId = contractParseResult?.employer_national_id || contractParseResult?.sponsor_id;
      const agencyName = contractParseResult?.saudi_agency_name || contractParseResult?.contractor_name;
      const contractDate = contractParseResult?.contract_signed_date || contractParseResult?.contract_date;
      const employerAddress = (contractParseResult as any)?.employer_address || (contractParseResult as any)?.sponsor_address;
      const salaryAmount = (contractParseResult as any)?.contract_salary_amount || (contractParseResult as any)?.salary_amount;
      const salaryCurrency = (contractParseResult as any)?.contract_salary_currency || (contractParseResult as any)?.salary_currency;
      const employmentSite = (contractParseResult as any)?.employment_site;
      const contractDuration = (contractParseResult as any)?.contract_duration;
      const kuwaitAgencyName = (contractParseResult as any)?.kuwait_agency_name;
      const kuwaitAgencyLicense = (contractParseResult as any)?.kuwait_agency_license;
      const saudiAgencyLicense = (contractParseResult as any)?.saudi_agency_license;

      if (contractParseResult?.contract_number) payloadToUpdate.contract_number = contractParseResult.contract_number;
      if (contractParseResult?.visa_number) payloadToUpdate.visa_number = contractParseResult.visa_number;
      if (employerName) payloadToUpdate.employer_name = employerName;
      if (employerId) payloadToUpdate.employer_national_id = employerId;
      if (agencyName) payloadToUpdate.saudi_agency_name = agencyName;
      if (saudiAgencyLicense) payloadToUpdate.saudi_agency_license = saudiAgencyLicense;
      if (contractDate) payloadToUpdate.contract_signed_date = contractDate;
      if (employerAddress) payloadToUpdate.employer_address = employerAddress;
      if (salaryAmount) payloadToUpdate.contract_salary_amount = salaryAmount;
      if (salaryCurrency) payloadToUpdate.contract_salary_currency = salaryCurrency;
      if (employmentSite) payloadToUpdate.employment_site = employmentSite;
      if (contractDuration) payloadToUpdate.contract_duration = contractDuration;
      if (kuwaitAgencyName) payloadToUpdate.kuwait_agency_name = kuwaitAgencyName;
      if (kuwaitAgencyLicense) payloadToUpdate.kuwait_agency_license = kuwaitAgencyLicense;

      if (Object.keys(payloadToUpdate).length > 0) {
        await updatePlacementParsedFieldsV2(targetPlacement.name, payloadToUpdate);
      }

      // 3. Synchronize extracted sponsor & visa details directly to the Applicant document
      const applicantUpdatePayload: Record<string, any> = {};
      const visaNum = contractParseResult?.visa_number || targetPlacement.visa_number;
      const sponsorName = employerName || targetPlacement.employer_name;
      const sponsorId = employerId || targetPlacement.employer_national_id;
      const contractNum = contractParseResult?.contract_number || targetPlacement.contract_number;
      const agency = agencyName || targetPlacement.saudi_agency_name;
      const sponsorPhone = (contractParseResult as any)?.sponsor_phone || (contractParseResult as any)?.employer_phone || (targetPlacement as any)?.employer_phone;
      const sponsorAddress = employerAddress || (targetPlacement as any)?.employer_address;
      const sponsorEmail = (contractParseResult as any)?.sponsor_email || (contractParseResult as any)?.employer_email || (targetPlacement as any)?.employer_email;

      if (visaNum) applicantUpdatePayload.visa_number = visaNum;
      if (sponsorName) applicantUpdatePayload.sponsor_name = sponsorName;
      if (sponsorId) applicantUpdatePayload.sponsor_id = sponsorId;
      if (contractNum) applicantUpdatePayload.contract_number = contractNum;
      if (agency) applicantUpdatePayload.agent = agency;
      if (sponsorPhone) applicantUpdatePayload.sponsor_phone = sponsorPhone;
      if (sponsorAddress) applicantUpdatePayload.sponsor_address = sponsorAddress;
      if (sponsorEmail) applicantUpdatePayload.sponsor_email = sponsorEmail;

      if (Object.keys(applicantUpdatePayload).length > 0 && applicantId) {
        try {
          await updateApplicantV2(applicantId, applicantUpdatePayload);
        } catch (applicantErr) {
          console.warn("[handleApproveContractData] Failed to update applicant fields:", applicantErr);
        }
      }

      setIsContractApproved(true);
      toast.success("Contract Approved Successfully!", {
        description: `Contract details saved. Redirecting to candidate profile...`,
      });

      queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant_v2", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicant-placements", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["clearance_queue_workspace"] });

      setTimeout(() => {
        router.push(`/applicants/${encodeURIComponent(applicantId)}`);
      }, 1200);
    } catch (err: any) {
      toast.error("Failed to Approve Contract", {
        description: err?.message || "Failed to save and approve extracted contract details.",
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

    setIsVisaUploading(true);
    try {
      let targetPlacement = activePlacement;
      if (!targetPlacement && !previewOnly) {
        targetPlacement = await resolveTargetPlacement();
      }

      if (!targetPlacement && !previewOnly) {
        toast.error("No Active Placement", {
          description: "Candidate must be Selected with an active Placement record before attaching visa documents.",
        });
        return;
      }
      if (targetPlacement && targetPlacement.status === "Cancelled" && !previewOnly) {
        toast.error("Placement Cancelled", {
          description: "This placement case has been cancelled. Visa documents cannot be attached to cancelled placements.",
        });
        return;
      }

      // 1. Upload file via /api/method/upload_file
      const uploadRes = await uploadFileV2(
        visaFile,
        false,
        "Placement",
        targetPlacement?.name
      );

      const fileUrl = uploadRes.file_url;
      setPreviewFileUrl(fileUrl);
      setVisaPreviewUrl(fileUrl);

      if (previewOnly) {
        // Run OCR parsing preview only
        try {
          const parsed = await parseVisaFileV2(fileUrl);
          const validParsed = extractValidContractFields(parsed);
          setVisaParseResult(validParsed);
          const count = countExtractedVisaFields(validParsed);
          if (count >= 3) {
            toast.success("eVisa Parsed for Preview", {
              description: "Structured fields extracted from visa file.",
            });
          } else if (count > 0) {
            toast.info("Partial eVisa Extracted for Preview", {
              description: "Some visa details extracted. Review and then attach.",
            });
          } else {
            toast.warning("eVisa Extraction Incomplete", {
              description: "Could not extract visa details. You can still attach and edit fields manually.",
            });
          }
        } catch (e: any) {
          toast.error("eVisa Preview Extraction Failed", {
            description: e?.message || "Failed to extract visa details from preview file.",
          });
        }
      } else {
        // Authoritative upload_visa attachment to Placement
        const res = await uploadVisaV2(targetPlacement!.name, fileUrl);
        // Also run OCR extraction immediately so extracted fields populate
        let parsed: any = null;
        let parseError: any = null;
        try {
          parsed = await parseVisaFileV2(fileUrl);
        } catch (e: any) {
          parseError = e;
          console.warn("[Visa Doc] OCR parsing error:", e);
        }

        const validPlacement = extractValidContractFields(res);
        const validParsed = parsed ? extractValidContractFields(parsed) : {};
        const combined = {
          ...validPlacement,
          ...validParsed,
        };
        if (Object.keys(combined).length > 0) {
          setVisaParseResult((prev: any) => ({
            ...(prev ? extractValidContractFields(prev) : {}),
            ...combined,
          }));
        }

        const extractedCount = countExtractedVisaFields(validParsed);

        if (!parseError && extractedCount >= 3) {
          // Outcome A
          toast.success("Kuwait eVisa Attached & Info Extracted", {
            description: `Visa attached to ${targetPlacement!.name}. Review extracted visa details below.`,
          });
        } else if (!parseError && extractedCount > 0) {
          // Outcome E
          toast.info("Kuwait eVisa Attached — Partial Info Extracted", {
            description: `Visa attached to ${targetPlacement!.name}. Some visa details were extracted. Review and complete any missing terms.`,
          });
        } else {
          // Outcome B
          toast.warning("eVisa Attached — Extraction Incomplete", {
            description: "Visa attached successfully, but information could not be extracted. Please retry extraction or review the visa manually.",
          });
        }

        setVisaFile(null);
        queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center"] });
        refetchPlacements();
        refetchApplicant();
      }
    } catch (err: any) {
      toast.error("eVisa Upload Failed", {
        description: err?.message || "Failed to attach visa file. Please try again.",
      });
    } finally {
      setIsVisaUploading(false);
    }
  };

  // One-click Retry Extraction for Kuwait eVisa
  const handleRetryVisaExtraction = async () => {
    const targetFileUrl = previewFileUrl || visaPreviewUrl || activePlacement?.visa_file;
    if (!targetFileUrl) {
      toast.error("No eVisa Document", {
        description: "Please attach an eVisa document before retrying extraction.",
      });
      return;
    }

    setIsRetryingVisaExtraction(true);
    try {
      const parsed = await parseVisaFileV2(targetFileUrl);
      const validParsed = extractValidContractFields(parsed);
      const validPlacement = extractValidContractFields(activePlacement);
      const combined = {
        ...validPlacement,
        ...validParsed,
      };
      setVisaParseResult((prev: any) => ({
        ...(prev ? extractValidContractFields(prev) : {}),
        ...combined,
      }));

      const count = countExtractedVisaFields(validParsed);
      if (count >= 3) {
        toast.success("eVisa Info Extracted", {
          description: "Visa document parsed successfully. Review extracted details below.",
        });
      } else if (count > 0) {
        toast.info("Partial eVisa Extracted", {
          description: "Some details were extracted. Review and complete the remaining details manually.",
        });
      } else {
        toast.warning("eVisa Extraction Incomplete", {
          description: "Could not extract structured information from this visa document. Please review and enter details manually.",
        });
      }
    } catch (err: any) {
      toast.error("eVisa Extraction Failed", {
        description: err?.message || "Failed to extract details from visa document. Please review manually.",
      });
    } finally {
      setIsRetryingVisaExtraction(false);
    }
  };

  // Edit Parsed Fields Dialog State (Contract Parser)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editFields, setEditFields] = React.useState({
    contract_number: "",
    contract_signed_date: "",
    contract_duration: "",
    contract_salary_amount: "",
    contract_salary_currency: "",
    visa_number: "",
    visa_type: "",
    visa_issue_date: "",
    visa_expiry_date: "",
    visa_reference_number: "",
    employer_name: "",
    employer_national_id: "",
    employer_address: "",
    saudi_agency_name: "",
    saudi_agency_license: "",
    kuwait_agency_name: "",
    kuwait_agency_license: "",
    employment_site: "",
  });
  const [isSavingParsedFields, setIsSavingParsedFields] = React.useState(false);

  const handleOpenEditModal = () => {
    if (!activePlacement) return;
    setEditFields({
      contract_number: activePlacement.contract_number || contractParseResult?.contract_number || "",
      contract_signed_date: activePlacement.contract_signed_date || contractParseResult?.contract_signed_date || contractParseResult?.contract_date || "",
      contract_duration: (activePlacement as any).contract_duration || (contractParseResult as any)?.contract_duration || "",
      contract_salary_amount: String((activePlacement as any).contract_salary_amount || (contractParseResult as any)?.contract_salary_amount || (contractParseResult as any)?.salary_amount || ""),
      contract_salary_currency: (activePlacement as any).contract_salary_currency || (contractParseResult as any)?.contract_salary_currency || (contractParseResult as any)?.salary_currency || (isKuwait ? "KWD" : "SAR"),
      visa_number: activePlacement.visa_number || contractParseResult?.visa_number || visaParseResult?.visa_number || "",
      visa_type: (activePlacement as any).visa_type || (contractParseResult as any)?.visa_type || (visaParseResult as any)?.visa_type || "",
      visa_issue_date: (activePlacement as any).visa_issue_date || (visaParseResult as any)?.visa_issue_date || "",
      visa_expiry_date: (activePlacement as any).visa_expiry_date || (visaParseResult as any)?.visa_expiry_date || "",
      visa_reference_number: (activePlacement as any).visa_reference_number || (visaParseResult as any)?.visa_reference_number || "",
      employer_name: activePlacement.employer_name || contractParseResult?.employer_name || contractParseResult?.sponsor_name || "",
      employer_national_id: activePlacement.employer_national_id || contractParseResult?.employer_national_id || contractParseResult?.sponsor_id || "",
      employer_address: (activePlacement as any).employer_address || (contractParseResult as any)?.employer_address || (contractParseResult as any)?.sponsor_address || "",
      saudi_agency_name: (activePlacement as any).saudi_agency_name || contractParseResult?.saudi_agency_name || contractParseResult?.contractor_name || "",
      saudi_agency_license: (activePlacement as any).saudi_agency_license || (contractParseResult as any)?.saudi_agency_license || "",
      kuwait_agency_name: (activePlacement as any).kuwait_agency_name || (contractParseResult as any)?.kuwait_agency_name || (contractParseResult as any)?.contractor_name || "",
      kuwait_agency_license: (activePlacement as any).kuwait_agency_license || (contractParseResult as any)?.kuwait_agency_license || "",
      employment_site: activePlacement.employment_site || (contractParseResult as any)?.employment_site || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveParsedFields = async () => {
    if (!activePlacement) return;
    setIsSavingParsedFields(true);
    try {
      await updatePlacementParsedFieldsV2(activePlacement.name, editFields);
      // Synchronously propagate edits into local parse result so UI cards update immediately
      setContractParseResult((prev: any) => ({
        ...prev,
        ...editFields,
      }));
      toast.success("Placement Parsed Fields Updated", {
        description: "Permitted contract and visa terms updated successfully.",
      });
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["v2_placements_for_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_doc_center", applicantId] });
    } catch (err: any) {
      toast.error("Failed to Update Parsed Fields", {
        description: err?.message || "Failed to update placement fields. Please try again.",
      });
    } finally {
      setIsSavingParsedFields(false);
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
    <div className="h-full max-h-full overflow-y-auto overflow-x-hidden space-y-2.5 pr-1 pb-4">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Breadcrumb                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
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
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Placement Document Center
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 py-0"
          >
            Verified Placement Documents
          </Badge>
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
            className="text-xs h-7 px-2.5"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Placement & Candidate Context Strip (Compact 1-Row Bar)      */}
      {/* ------------------------------------------------------------- */}
      <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#262632] bg-white dark:bg-[#121217] shadow-xs flex items-center justify-between flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Candidate:</span>
          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
            {applicant?.full_name || "Unknown Candidate"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Passport:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
            {applicant?.passport_number || "Not Recorded"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Destination:</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
            <Plane className="h-3 w-3 text-emerald-600" />
            {destinationCountry}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Placement:</span>
          {activePlacement ? (
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {activePlacement.name}
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-semibold">
              No Placement Yet
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
          {activePlacement ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50"
            >
              {activePlacement.status}
            </Badge>
          ) : (
            <span className="text-slate-400">N/A</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Contractor:</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[140px]">
            {activePlacement?.contractor || activePlacement?.contractor_name || "Unassigned"}
          </span>
        </div>
      </div>

      {activePlacement?.status === "Requested" && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Selection Request Under Review</h4>
            <p className="text-amber-800 dark:text-amber-300">
              This candidate was requested for selection and is awaiting review and confirmation by internal agency office staff.
              Employment contracts and eVisa documents cannot be uploaded until the selection request has been approved.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Navigation Tabs (Contract vs Kuwait Visa)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#22222a] pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("contract")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === "contract"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <FileText className="h-3 w-3" />
          Employment Contract
          {activePlacement?.contract_file && (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("visa")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === "visa"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Stamp className="h-3 w-3" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start">
          {/* Left Column: Document Viewer */}
          <div>
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] flex flex-col">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
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
                        className="h-6 px-2 text-[11px] border-slate-300 dark:border-[#26262d] font-semibold text-slate-700 dark:text-zinc-300"
                        title="Print / Open Document"
                      >
                        <Printer className="h-3 w-3 mr-1 text-slate-500" />
                        Print / Open
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleDownloadContract}
                        className="h-6 px-2 text-[11px] bg-blue-900 hover:bg-blue-950 text-white font-semibold"
                        title={`Download (${contractDownloadExt.toUpperCase()})`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download ({contractDownloadExt.toUpperCase()})
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
              <CardContent className="p-1.5 bg-slate-100 dark:bg-[#0d0d11] rounded-b-xl overflow-hidden flex items-center justify-center h-[420px] lg:h-[480px]">
                {isWordContract ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 h-full w-full bg-white dark:bg-[#121216] rounded-lg border border-slate-200 dark:border-[#222228]">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-xs">
                      <FileText className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate px-2">
                        {contractFile?.name || (currentContractUrl ? currentContractUrl.split("/").pop()?.split("?")[0] : "Word Contract Document")}
                      </p>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30">
                        Microsoft Word Document ({contractDownloadExt.toUpperCase()})
                      </Badge>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                        Contract data was automatically extracted by the server parser. Review the extracted fields in the panel on the right.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadContract}
                        className="text-xs h-7.5 px-3 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download {contractDownloadExt.toUpperCase()}
                      </Button>
                      {currentContractUrl && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            window.open(currentContractUrl, "_blank");
                          }}
                          className="text-xs h-7.5 px-3 bg-blue-900 hover:bg-blue-950 text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Open Document
                        </Button>
                      )}
                    </div>
                  </div>
                ) : contractPreviewUrl || previewFileUrl ? (
                  <iframe
                    src={contractPreviewUrl || previewFileUrl}
                    title="Contract Document Viewer"
                    className="w-full h-full rounded-lg border-0"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-400 space-y-2 p-6">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-300">
                      No document loaded for preview
                    </p>
                    <p className="text-[11px]">
                      Upload a contract to preview it here. The document will appear automatically after upload.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Upload & Extracted Fields */}
          <div className="space-y-2.5">
            {/* Card 1: Compact Attach Signed Contract */}
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileUp className="h-3.5 w-3.5 text-emerald-600" />
                    Attach Signed Contract
                  </span>
                  {activePlacement?.contract_file ? (
                    <Badge variant="outline" className="text-[9.5px] py-0 border-emerald-300 text-emerald-800 bg-emerald-50">
                      Contract Attached
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9.5px] py-0 border-slate-300 text-slate-500">
                      Not Attached
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-3 pb-2.5 pt-0 space-y-2">
                {(activePlacement as any)?.request_denied === 1 ? (
                  <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-800 dark:text-rose-300">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      Unavailable. Please select another candidate.
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                      This selection request was not confirmed. Please return to the candidate pool to select another candidate.
                    </p>
                    <Link href="/agent">
                      <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs h-7.5 px-3 font-semibold">
                        Return to Candidate Pool
                      </Button>
                    </Link>
                  </div>
                ) : activePlacement?.status === "Requested" ? (
                  <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Awaiting Internal Confirmation
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                      Your request is awaiting review by the agency office. Contract uploading and processing are unavailable until the selection request is approved by internal staff.
                    </p>
                  </div>
                ) : (
                  <>
                    <PremiumDropzone
                      id="contract-doc-dropzone"
                      variant="compact"
                      accept=".pdf, .docx, .doc, .odt, .rtf, .txt, image/png, image/jpeg, image/jpg, image/webp, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/vnd.oasis.opendocument.text, application/rtf, text/rtf, text/plain"
                      value={contractFile || contractPreviewUrl}
                      fileName={contractFile?.name}
                      fileSize={contractFile?.size}
                      isLoading={isContractUploading}
                      loadingText="Uploading & extracting contract info..."
                      label="Employment Contract Document"
                      description="PDF, Word (.docx, .doc), or image (up to 20MB)"
                      onFileSelect={(file) => {
                        setContractFile(file);
                        setContractPreviewUrl(URL.createObjectURL(file));
                      }}
                      onRemove={() => {
                        setContractFile(null);
                        setContractPreviewUrl("");
                      }}
                    />

                    {contractFile && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          type="button"
                          disabled={!contractFile || isContractUploading || (isPlacementsLoading && !activePlacement)}
                          onClick={() => handleUploadContract(false)}
                          className="flex-1 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-7.5 shadow-xs"
                        >
                          {isContractUploading || (isPlacementsLoading && !activePlacement) ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <FileCheck2 className="h-3 w-3 mr-1.5" />
                          )}
                          {isPlacementsLoading && !activePlacement ? "Verifying placement..." : "Extract contract info"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Extracted Contract Terms & Approve Action */}
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Extracted Contract Terms
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(activePlacement?.contract_file || previewFileUrl || contractPreviewUrl) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRetryingExtraction || isContractUploading}
                        onClick={handleRetryContractExtraction}
                        className="text-[11px] h-6 px-2 gap-1 border-emerald-500/40 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        {isRetryingExtraction ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-2.5 w-2.5" />
                        )}
                        Retry Extraction
                      </Button>
                    )}
                    {activePlacement && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenEditModal}
                        className="text-[11px] h-6 px-2 gap-1 border-amber-500/40 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        Edit Terms
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-3 pb-3 pt-0 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Signed Date</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                      {activePlacement?.contract_signed_date || contractParseResult?.contract_signed_date || contractParseResult?.contract_date || "Not Extracted"}
                    </span>
                  </div>

                  <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Salary</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                      {(activePlacement?.contract_salary_amount || contractParseResult?.contract_salary_amount || contractParseResult?.salary_amount)
                        ? `${activePlacement?.contract_salary_amount || contractParseResult?.contract_salary_amount || contractParseResult?.salary_amount} ${activePlacement?.contract_salary_currency || contractParseResult?.contract_salary_currency || contractParseResult?.salary_currency || (isKuwait ? "KWD" : "SAR")}`
                        : "Not Set"}
                    </span>
                  </div>

                  <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Employer / Sponsor</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                      {activePlacement?.employer_name || contractParseResult?.employer_name || contractParseResult?.sponsor_name || "Not Extracted"}
                    </span>
                  </div>

                  <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">
                      {isKuwait ? "Employment Site" : "Contract Number"}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                      {isKuwait
                        ? activePlacement?.employment_site || contractParseResult?.employment_site || "Kuwait"
                        : activePlacement?.contract_number || contractParseResult?.contract_number || "Pending"}
                    </span>
                  </div>

                  <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                    <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Visa Number</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                      {activePlacement?.visa_number || contractParseResult?.visa_number || visaParseResult?.visa_number || "Not Extracted"}
                    </span>
                  </div>

                  {!isKuwait ? (
                    <>
                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Employer ID</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.employer_national_id || contractParseResult?.employer_national_id || contractParseResult?.sponsor_id || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Saudi Partner Agency</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.saudi_agency_name || contractParseResult?.saudi_agency_name || contractParseResult?.contractor_name || "Not Extracted"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Contract Duration</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.contract_duration || contractParseResult?.contract_duration || "2 Years"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Kuwait Partner Agency</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.kuwait_agency_name || contractParseResult?.kuwait_agency_name || contractParseResult?.contractor_name || "Not Extracted"}
                        </span>
                      </div>
                    </>
                  )}

                  {activePlacement?.contract_file && (
                    <div className="p-1.5 px-2 rounded-md bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center">
                      <a
                        href={activePlacement.contract_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline truncate"
                        title={activePlacement.contract_file}
                      >
                        <Download className="h-3 w-3 shrink-0" />
                        <span className="truncate">View File</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Stage Advancement Action Gate */}
                {activePlacement && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#222228] space-y-1.5">
                    {activePlacement.status === "Selected" ? (
                      <>
                        {Boolean(activePlacement.contract_file || activePlacement.contract_number) ? (
                          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2.5 py-1.5 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-2">
                            <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Contract Attached — Ready for Verification</span>
                            </div>
                            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 hidden sm:inline">
                              Approving terms saves extracted details to placement
                            </span>
                          </div>
                        ) : (
                          <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 px-2.5 py-1.5 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-[11px] font-semibold">Signed Contract Document Required before approving</span>
                          </div>
                        )}
                        {isContractApproved ? (
                          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-2 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Contract Approved Successfully! Returning...</span>
                            </div>
                            <Link href={`/applicants/${encodeURIComponent(applicantId)}`}>
                              <Button size="sm" variant="outline" className="text-xs h-6.5 px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                                Return to Dossier Now
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            disabled={isApprovingContract || !Boolean(activePlacement.contract_file || activePlacement.contract_number)}
                            onClick={handleApproveContractData}
                            className={cn(
                              "w-full font-bold text-xs h-8.5 shadow-sm flex items-center justify-center gap-2",
                              Boolean(activePlacement.contract_file || activePlacement.contract_number)
                                ? "bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer"
                                : "bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed"
                            )}
                          >
                            {isApprovingContract ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Approving Contract...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve Contract
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    ) : activePlacement.status === "Processing" ? (
                      <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1.5 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-[11px]">Placement is active in <strong>Processing</strong> stage.</span>
                        </div>
                        <Link href={`/applicants/${encodeURIComponent(applicantId)}`}>
                          <Button variant="outline" size="sm" className="text-xs h-6 px-2">
                            View Candidate Dossier
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">
                        Current Placement Status: <strong>{activePlacement.status}</strong>
                      </div>
                    )}
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
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold">
                  eVisa Upload Specific to Kuwait Corridor
                </h3>
              </div>
              <p className="leading-relaxed text-[11px]">
                Candidate <strong>{applicant?.full_name}</strong> is designated for <strong>{destinationCountry}</strong>.
                Direct eVisa document upload and parsing is implemented exclusively for the Kuwait corridor.
                For Saudi Arabia, consular visa clearance is coordinated via the <strong>Taeshir</strong> biometric gate and <strong>Saudi Embassy Stamping</strong> clearance steps.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start">
              {/* Left Column: Upload & Actions */}
              <div className="space-y-2.5">
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Stamp className="h-3.5 w-3.5 text-emerald-600" />
                        Attach Kuwait eVisa Document
                      </span>
                      {activePlacement?.visa_file ? (
                        <Badge variant="outline" className="text-[9.5px] py-0 border-emerald-300 text-emerald-800 bg-emerald-50">
                          Visa Attached
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9.5px] py-0 border-slate-300 text-slate-500">
                          Not Attached
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-3 pb-2.5 pt-0 space-y-2">
                    <PremiumDropzone
                      id="visa-doc-dropzone"
                      variant="compact"
                      value={visaFile || visaPreviewUrl}
                      fileName={visaFile?.name}
                      fileSize={visaFile?.size}
                      isLoading={isVisaUploading}
                      loadingText="Processing and parsing Kuwait eVisa..."
                      label="Kuwait eVisa Document"
                      description="PDF or image"
                      onFileSelect={(file) => {
                        setVisaFile(file);
                        setVisaPreviewUrl(URL.createObjectURL(file));
                      }}
                      onRemove={() => {
                        setVisaFile(null);
                        setVisaPreviewUrl("");
                      }}
                    />

                    {visaFile && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          type="button"
                          disabled={!visaFile || isVisaUploading}
                          onClick={() => handleUploadVisa(false)}
                          className="flex-1 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs font-semibold h-7.5 shadow-xs"
                        >
                          {isVisaUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <FileCheck2 className="h-3 w-3 mr-1.5" />
                          )}
                          Attach to Placement
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={!visaFile || isVisaUploading}
                          onClick={() => handleUploadVisa(true)}
                          className="text-xs h-7.5 px-2.5"
                          title="Run OCR parsing preview without mutating placement"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview OCR
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Extracted Visa Fields Card */}
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Extracted Visa Information
                      </CardTitle>
                      {(activePlacement?.visa_file || previewFileUrl || visaPreviewUrl) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRetryingVisaExtraction || isVisaUploading}
                          onClick={handleRetryVisaExtraction}
                          className="text-[11px] h-6 px-2 gap-1 border-emerald-500/40 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          {isRetryingVisaExtraction ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-2.5 w-2.5" />
                          )}
                          Retry Extraction
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="px-3 pb-3 pt-0 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Visa Ref / Number</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.visa_reference_number || activePlacement?.visa_number || visaParseResult?.visa_number || "Pending"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Visa Type</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.visa_type || visaParseResult?.visa_type || "Work Visa"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Issue Date</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.visa_issue_date || visaParseResult?.issue_date || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Expiry Date</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.visa_expiry_date || visaParseResult?.expiry_date || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Sponsor Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.employer_name || activePlacement?.sponsor_name || visaParseResult?.sponsor_name || "Not Extracted"}
                        </span>
                      </div>

                      <div className="p-1.5 px-2 rounded-md bg-slate-50 dark:bg-[#181820] border border-slate-100 dark:border-[#22222a]">
                        <span className="text-[9.5px] uppercase font-semibold text-slate-400 block leading-tight">Sponsor Civil ID</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate block text-[11px]">
                          {activePlacement?.employer_national_id || activePlacement?.sponsor_civil_id || visaParseResult?.sponsor_id || "Not Extracted"}
                        </span>
                      </div>
                    </div>

                    {activePlacement?.visa_file && (
                      <div className="pt-1">
                        <a
                          href={activePlacement.visa_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          View Attached Visa File ({activePlacement.visa_file})
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Embedded Preview */}
              <div>
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] flex flex-col">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
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
                            className="h-6 px-2 text-[11px] border-slate-300 dark:border-[#26262d] font-semibold text-slate-700 dark:text-zinc-300"
                            title="Print Visa Document"
                          >
                            <Printer className="h-3 w-3 mr-1 text-slate-500" />
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
                            className="h-6 px-2 text-[11px] bg-blue-900 hover:bg-blue-950 text-white font-semibold"
                            title="Save as PDF"
                          >
                            <Download className="h-3 w-3 mr-1" />
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
                  <CardContent className="p-1.5 bg-slate-100 dark:bg-[#0d0d11] rounded-b-xl overflow-hidden flex items-center justify-center h-[420px] lg:h-[480px]">
                    {visaPreviewUrl || previewFileUrl ? (
                      <iframe
                        src={visaPreviewUrl || previewFileUrl}
                        title="Kuwait eVisa Viewer"
                        className="w-full h-full rounded-lg border-0"
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

      {/* Edit Parsed Terms Modal (Contract Parser Permitted Fields Only) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-emerald-600" />
              Edit Placement Parsed Terms
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update extracted contract and visa parameters for Placement <strong>{activePlacement?.name}</strong>.
              <span className="block text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Note: Only contract and visa terms may be modified here. Stage progression is managed automatically through the operational workflow.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Contract Number</label>
              <Input
                value={editFields.contract_number}
                onChange={(e) => setEditFields({ ...editFields, contract_number: e.target.value })}
                placeholder="e.g. CON-2026-001"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Contract Signed Date</label>
              <Input
                type="date"
                value={editFields.contract_signed_date}
                onChange={(e) => setEditFields({ ...editFields, contract_signed_date: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Contract Duration</label>
              <Input
                value={editFields.contract_duration}
                onChange={(e) => setEditFields({ ...editFields, contract_duration: e.target.value })}
                placeholder="e.g. 2 Years"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Salary Amount</label>
              <Input
                type="number"
                value={editFields.contract_salary_amount}
                onChange={(e) => setEditFields({ ...editFields, contract_salary_amount: e.target.value })}
                placeholder="e.g. 1500"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Salary Currency</label>
              <Input
                value={editFields.contract_salary_currency}
                onChange={(e) => setEditFields({ ...editFields, contract_salary_currency: e.target.value.toUpperCase() })}
                placeholder={isKuwait ? "KWD" : "SAR"}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Visa Number</label>
              <Input
                value={editFields.visa_number}
                onChange={(e) => setEditFields({ ...editFields, visa_number: e.target.value })}
                placeholder="e.g. 1908334046"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Visa Type</label>
              <Input
                value={editFields.visa_type}
                onChange={(e) => setEditFields({ ...editFields, visa_type: e.target.value })}
                placeholder="Work / Employment"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Visa Reference Number</label>
              <Input
                value={editFields.visa_reference_number}
                onChange={(e) => setEditFields({ ...editFields, visa_reference_number: e.target.value })}
                placeholder="e.g. REF-KUW-881"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Visa Issue Date</label>
              <Input
                type="date"
                value={editFields.visa_issue_date}
                onChange={(e) => setEditFields({ ...editFields, visa_issue_date: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Visa Expiry Date</label>
              <Input
                type="date"
                value={editFields.visa_expiry_date}
                onChange={(e) => setEditFields({ ...editFields, visa_expiry_date: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Employer / Sponsor Name</label>
              <Input
                value={editFields.employer_name}
                onChange={(e) => setEditFields({ ...editFields, employer_name: e.target.value })}
                placeholder="e.g. Mohammed Al-Otaibi"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Employer National ID / Iqama</label>
              <Input
                value={editFields.employer_national_id}
                onChange={(e) => setEditFields({ ...editFields, employer_national_id: e.target.value })}
                placeholder="e.g. 1098234710"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Employment Site / City</label>
              <Input
                value={editFields.employment_site}
                onChange={(e) => setEditFields({ ...editFields, employment_site: e.target.value })}
                placeholder="e.g. Riyadh / Kuwait City"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Employer Address</label>
              <Input
                value={editFields.employer_address}
                onChange={(e) => setEditFields({ ...editFields, employer_address: e.target.value })}
                placeholder="Full address in host country"
                className="h-8 text-xs"
              />
            </div>

            {!isKuwait ? (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Saudi Agency Partner Name</label>
                  <Input
                    value={editFields.saudi_agency_name}
                    onChange={(e) => setEditFields({ ...editFields, saudi_agency_name: e.target.value })}
                    placeholder="Partner agency name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Saudi Agency License №</label>
                  <Input
                    value={editFields.saudi_agency_license}
                    onChange={(e) => setEditFields({ ...editFields, saudi_agency_license: e.target.value })}
                    placeholder="e.g. LIC-KSA-991"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Kuwait Agency Partner Name</label>
                  <Input
                    value={editFields.kuwait_agency_name}
                    onChange={(e) => setEditFields({ ...editFields, kuwait_agency_name: e.target.value })}
                    placeholder="Kuwait partner agency"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Kuwait Agency License №</label>
                  <Input
                    value={editFields.kuwait_agency_license}
                    onChange={(e) => setEditFields({ ...editFields, kuwait_agency_license: e.target.value })}
                    placeholder="e.g. LIC-KUW-882"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingParsedFields}
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSavingParsedFields}
              onClick={handleSaveParsedFields}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5"
            >
              {isSavingParsedFields && <Loader2 className="h-3 w-3 animate-spin" />}
              Save Parsed Terms
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
