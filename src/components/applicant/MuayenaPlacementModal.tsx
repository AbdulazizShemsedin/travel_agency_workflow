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
import { createMuayenaPlacementV2 } from "@/lib/api/v2/placements";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { requestV2 } from "@/lib/api/v2/client";

interface MuayenaPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
  onSuccess?: () => void;
}

export function MuayenaPlacementModal({
  isOpen,
  onClose,
  applicantId,
  applicantName,
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
        description: res?.message || `Placement ${res.name || res.placement_name || ""} generated at Selected stage.`,
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
            Directly bind candidate with contract in hand to an overseas contractor. Enters directly at Selected stage without CV generation or marketplace listing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#171720] text-xs space-y-1">
            <span className="text-slate-500">Candidate:</span>
            <div className="font-bold text-slate-900 dark:text-white">
              {applicantName} ({applicantId})
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Foreign Agency Contractor *</Label>
            {contractors.length > 0 ? (
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="">Select an overseas partner...</option>
                {contractors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.company_name || c.name} ({c.destination_country || c.country || "Overseas"})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                required
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="e.g. CON-00001 or Al-Safwa Agency"
                className="h-9 text-xs"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Signed Contract Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                className="text-xs h-9"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Contract document can also be uploaded later in the Placement Document Center.
            </p>
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
