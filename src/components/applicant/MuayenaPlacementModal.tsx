"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Globe2,
  UploadCloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createMuayenaPlacementV2, updatePlacementParsedFieldsV2 } from "@/lib/api/v2/placements";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { listContractorsV2, V2ContractorRecord } from "@/lib/api/v2/contractors";
import { formatApiError } from "@/lib/utils/error-formatter";

export interface MuayenaPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
  destinationCountry?: string;
  muayenaAgency?: string;
  initialAgency?: string;
  passportNumber?: string;
  onSuccess?: (createdPlacement?: any) => void;
}

export function MuayenaPlacementModal({
  isOpen,
  onClose,
  applicantId,
  applicantName,
  destinationCountry,
  muayenaAgency,
  initialAgency,
  passportNumber,
  onSuccess,
}: MuayenaPlacementModalProps) {
  const [contractorName, setContractorName] = React.useState<string>("");
  const [contractFile, setContractFile] = React.useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = React.useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Review step after case creation
  const [createdPlacement, setCreatedPlacement] = React.useState<any | null>(null);
  const [isUpdatingParsed, setIsUpdatingParsed] = React.useState(false);
  const [parsedForm, setParsedForm] = React.useState({
    visa_number: "",
    visa_type: "Work",
    visa_issue_date: "",
    visa_expiry_date: "",
    visa_reference_number: "",
    contract_number: "",
    contract_signed_date: "",
    employer_name: "",
    employer_national_id: "",
    employer_address: "",
    saudi_agency_name: "",
    kuwait_agency_name: "",
    salary_amount: "",
  });

  const destCountry = destinationCountry || "Saudi Arabia";

  // List agencies of this applicant's destination country
  const { data: contractors = [], isLoading: isLoadingAgencies } = useQuery({
    queryKey: ["contractors_list_for_muayena", destCountry],
    queryFn: () => listContractorsV2(destCountry ? { country: destCountry } : undefined),
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Sync initial agency
  React.useEffect(() => {
    if (isOpen) {
      const agencyToPrefill = muayenaAgency || initialAgency || "";
      setContractorName(agencyToPrefill);
      setContractFile(null);
      setUploadedFileUrl("");
      setErrorMsg(null);
      setCreatedPlacement(null);
    }
  }, [isOpen, muayenaAgency, initialAgency]);

  // Handle direct contract upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Please select a document under 20 MB.");
      return;
    }

    setContractFile(file);
    setIsUploadingFile(true);
    setErrorMsg(null);

    try {
      // Direct upload to storage (private)
      const res = await uploadFileV2(file, true, "Placement");
      const url = res.file_url || (res as any)?.url || (res as any)?.message?.file_url;
      if (!url) {
        throw new Error("Upload did not return a valid file URL.");
      }
      setUploadedFileUrl(url);
      toast.success("Contract file uploaded to storage.");
    } catch (err: any) {
      const msg = formatApiError(err) || "Failed to upload contract file.";
      setErrorMsg(msg);
      toast.error(msg);
      setContractFile(null);
      setUploadedFileUrl("");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createMuayenaPlacementV2(
        applicantId,
        contractorName.trim() || undefined,
        uploadedFileUrl || undefined
      );

      const placementObj = (res as any)?.placement || (res as any)?.message || res;
      setCreatedPlacement(placementObj);

      // Pre-fill parsed fields form from backend extraction
      setParsedForm({
        visa_number: placementObj.visa_number || "",
        visa_type: placementObj.visa_type || "Work",
        visa_issue_date: placementObj.visa_issue_date || "",
        visa_expiry_date: placementObj.visa_expiry_date || "",
        visa_reference_number: placementObj.visa_reference_number || "",
        contract_number: placementObj.contract_number || "",
        contract_signed_date: placementObj.contract_signed_date || "",
        employer_name: placementObj.employer_name || "",
        employer_national_id: placementObj.employer_national_id || placementObj.sponsor_id || "",
        employer_address: placementObj.employer_address || "",
        saudi_agency_name: placementObj.saudi_agency_name || contractorName || "",
        kuwait_agency_name: placementObj.kuwait_agency_name || "",
        salary_amount: placementObj.salary_amount ? String(placementObj.salary_amount) : "",
      });

      toast.success("Muayena placement case created at Selected stage.");
      onSuccess?.(placementObj);
    } catch (err: any) {
      const msg = formatApiError(err) || "Failed to create Muayena placement.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save reviewed parsed contract fields
  const handleSaveParsedFields = async () => {
    if (!createdPlacement?.name && !createdPlacement?.placement_name) {
      onClose();
      return;
    }

    const pName = createdPlacement.name || createdPlacement.placement_name;
    setIsUpdatingParsed(true);

    try {
      const payload: Record<string, any> = {};
      Object.entries(parsedForm).forEach(([k, v]) => {
        if (v && String(v).trim()) {
          payload[k] = String(v).trim();
        }
      });

      if (parsedForm.salary_amount && !isNaN(Number(parsedForm.salary_amount))) {
        payload.salary_amount = Number(parsedForm.salary_amount);
      }

      await updatePlacementParsedFieldsV2(pName, payload);
      toast.success("Contract fields verified and updated.");
      onClose();
    } catch (err: any) {
      const msg = formatApiError(err) || "Failed to update parsed contract fields.";
      toast.error(msg);
    } finally {
      setIsUpdatingParsed(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228] p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-[#222228]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <DialogTitle className="text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                {createdPlacement ? "Review Parsed Contract Fields" : "Make Case (Muayena Track)"}
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 font-mono text-[11px]">
              Muayena
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            {createdPlacement
              ? "The contract has been parsed. Verify the extracted fields below and correct any values if necessary."
              : `Create case and bind candidate to partner agency in ${destCountry}.`}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-3.5 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error</span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {!createdPlacement ? (
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Candidate Summary Card */}
            <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#1a1a22] p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {applicantName}
                </p>
                {passportNumber && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                    Passport: {passportNumber}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  <Globe2 className="h-3.5 w-3.5 text-emerald-700" />
                  {destCountry}
                </span>
                <p className="text-[10px] text-slate-400">Destination Corridor</p>
              </div>
            </div>

            {/* Foreign Agency Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-700" />
                Allocated Partner Agency ({destCountry}) <span className="text-rose-500">*</span>
              </Label>
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                disabled={isSubmitting || isLoadingAgencies}
                className="select-styled w-full h-9 rounded-md border border-slate-300 dark:border-[#2b2b35] bg-white dark:bg-[#121215] px-3 py-1 text-xs text-slate-900 dark:text-zinc-200"
              >
                <option value="">Select Agency...</option>
                {contractors.map((c: V2ContractorRecord) => (
                  <option key={c.name} value={c.name}>
                    {c.company_name || c.name} {c.country ? `(${c.country})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Prefilled with the worker&apos;s registered agency. You may switch to another partner agency in {destCountry} if reallocating.
              </p>
            </div>

            {/* Direct Contract File Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-emerald-700" />
                Upload Official Contract File
              </Label>
              <div className="border-2 border-dashed border-slate-300 dark:border-[#2b2b35] rounded-xl p-5 text-center bg-slate-50/50 dark:bg-[#141418] hover:bg-slate-50 dark:hover:bg-[#181820] transition-colors">
                <input
                  type="file"
                  id="muayena_placement_contract_file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploadingFile || isSubmitting}
                  className="hidden"
                />
                <label
                  htmlFor="muayena_placement_contract_file"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="h-7 w-7 text-emerald-700 animate-spin" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Uploading contract to secure storage...
                      </span>
                    </>
                  ) : contractFile ? (
                    <>
                      <FileCheck2 className="h-7 w-7 text-emerald-700" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {contractFile.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          ✓ File ready ({Math.round(contractFile.size / 1024)} KB)
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500 hover:underline">
                        Click to choose a different file
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-7 w-7 text-slate-400" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Click to select contract document
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        PDF, JPG, PNG or WEBP up to 20 MB (Direct Cloud Storage)
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-[#222228]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || isUploadingFile}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Reading Contract...
                  </>
                ) : (
                  "Make Case (Muayena)"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Step 2: Review and Correct Parsed Fields */
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Case Initialized at Selected Stage
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                Verify parsed values before moving forward
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label htmlFor="parsed_visa_no" className="text-xs font-semibold">Visa Number</Label>
                <Input
                  id="parsed_visa_no"
                  value={parsedForm.visa_number}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, visa_number: e.target.value }))}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g., 1302849182"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_contract_no" className="text-xs font-semibold">Contract Number</Label>
                <Input
                  id="parsed_contract_no"
                  value={parsedForm.contract_number}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, contract_number: e.target.value }))}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g., CNT-99482"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_employer_name" className="text-xs font-semibold">Employer / Sponsor Name</Label>
                <Input
                  id="parsed_employer_name"
                  value={parsedForm.employer_name}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, employer_name: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g., MOHAMMED ABDULAZIZ"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_sponsor_id" className="text-xs font-semibold">Sponsor Civil / National ID</Label>
                <Input
                  id="parsed_sponsor_id"
                  value={parsedForm.employer_national_id}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, employer_national_id: e.target.value }))}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g., 1084920194"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_visa_issue" className="text-xs font-semibold">Visa Issue Date</Label>
                <Input
                  id="parsed_visa_issue"
                  type="date"
                  value={parsedForm.visa_issue_date}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, visa_issue_date: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_visa_expiry" className="text-xs font-semibold">Visa Expiry Date</Label>
                <Input
                  id="parsed_visa_expiry"
                  type="date"
                  value={parsedForm.visa_expiry_date}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, visa_expiry_date: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_salary" className="text-xs font-semibold">Monthly Salary</Label>
                <Input
                  id="parsed_salary"
                  value={parsedForm.salary_amount}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, salary_amount: e.target.value }))}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g., 1000"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="parsed_employer_address" className="text-xs font-semibold">Employer City / Address</Label>
                <Input
                  id="parsed_employer_address"
                  value={parsedForm.employer_address}
                  onChange={(e) => setParsedForm((prev) => ({ ...prev, employer_address: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g., RIYADH"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100 dark:border-[#222228]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUpdatingParsed}
                className="text-xs"
              >
                Skip & Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveParsedFields}
                disabled={isUpdatingParsed}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold min-w-[140px]"
              >
                {isUpdatingParsed ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Finish"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
