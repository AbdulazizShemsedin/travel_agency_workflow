"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Loader2, Upload, UserCheck, ShieldCheck } from "lucide-react";
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
import { PremiumDropzone } from "@/components/ui/PremiumDropzone";
import { createMuayenaPlacementV2 } from "@/lib/api/v2/placements";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { requestV2 } from "@/lib/api/v2/client";

interface MuayenaPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
  destinationCountry?: string;
  onSuccess?: () => void;
}

export function MuayenaPlacementModal({
  isOpen,
  onClose,
  applicantId,
  applicantName,
  destinationCountry,
  onSuccess,
}: MuayenaPlacementModalProps) {
  const [contractorName, setContractorName] = React.useState<string>("");
  const [contractFile, setContractFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch available contractors for selection
  const { data: contractors = [] } = useQuery<any[]>({
    queryKey: ["contractors_list_for_muayena"],
    queryFn: async () => {
      try {
        const res = await requestV2<any[] | { contractors?: any[] }>(
          "/api/method/agency_tracking.contractor_api.list_contractors",
          { method: "POST" }
        );
        if (Array.isArray(res)) return res;
        if (res && Array.isArray((res as any).contractors)) return (res as any).contractors;
        return [];
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  // Filter contractors strictly by applicant's destination country
  const filteredContractors = React.useMemo(() => {
    if (!destinationCountry || !destinationCountry.trim()) return contractors;
    const destNorm = destinationCountry.trim().toLowerCase();
    return contractors.filter((c) => {
      const cCountry = (c.destination_country || c.country || "").trim().toLowerCase();
      return cCountry === destNorm;
    });
  }, [contractors, destinationCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorName.trim()) {
      toast.error("Contractor Required", { description: "Please select or specify the foreign agency contractor." });
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl: string | undefined = undefined;
      if (contractFile) {
        const uploadRes = await uploadFileV2(contractFile, false);
        fileUrl = uploadRes.file_url;
      }

      const res = await createMuayenaPlacementV2(applicantId, contractorName.trim(), fileUrl);
      toast.success("Muayena Placement Created", {
        description: res?.message || "Placement generated at Selected stage.",
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Placement Creation Failed", {
        description: err?.message || "Failed to create Muayena placement. Please check inputs and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#121216] border-slate-200 dark:border-[#222228]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Create Muayena Placement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Bind candidate directly to an authorized foreign recruitment agency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#171720] text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Candidate:</span>
              {destinationCountry && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {destinationCountry}
                </span>
              )}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {applicantName}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Foreign Agency Contractor *</Label>
              {destinationCountry && (
                <span className="text-[10px] text-slate-400">
                  Showing {destinationCountry} agencies only
                </span>
              )}
            </div>

            {filteredContractors.length > 0 ? (
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                required
                className="select-styled flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 shadow-xs"
              >
                <option value="">Select an international partner...</option>
                {filteredContractors.map((c) => {
                  const label = c.company_name || c.contractor_name || c.name;
                  const countryLabel = c.destination_country || c.country || "International";
                  return (
                    <option key={c.name} value={c.name}>
                      {label} ({countryLabel})
                    </option>
                  );
                })}
              </select>
            ) : destinationCountry ? (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300">
                No foreign agencies registered for <strong>{destinationCountry}</strong>. A Muayena placement requires an agency registered under this destination country.
              </div>
            ) : (
              <Input
                required
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="e.g. Al-Safwa Recruitment Agency"
                className="h-9 text-xs"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Signed Contract Document (Optional)</Label>
            <PremiumDropzone
              id="muayena-contract-dropzone"
              variant="compact"
              value={contractFile}
              fileName={contractFile?.name}
              fileSize={contractFile?.size}
              label="Contract Document"
              description="PDF or image"
              onFileSelect={(file) => setContractFile(file)}
              onRemove={() => setContractFile(null)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              disabled={isSubmitting || !contractorName.trim()}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating Placement...
                </>
              ) : (
                "Create Placement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
