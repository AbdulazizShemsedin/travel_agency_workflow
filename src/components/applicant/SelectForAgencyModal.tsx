"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listContractorsV2, V2ContractorRecord } from "@/lib/api/v2/contractors";
import { selectCandidateDirectlyV2 } from "@/lib/api/v2/portal";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";

export interface SelectForAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: {
    name: string;
    full_name?: string;
    passport_number?: string;
    destination_country?: string;
    target_job?: string;
    job_applied?: string;
    medical_status?: string;
  } | null;
  onSuccess?: () => void;
}

export function SelectForAgencyModal({
  isOpen,
  onClose,
  applicant,
  onSuccess,
}: SelectForAgencyModalProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const [selectedContractor, setSelectedContractor] = React.useState<string>("");

  // Role validation: Manager or Admin only
  const isManagerOrAdmin = React.useMemo(() => {
    const roles = authUser?.roles || [];
    return roles.some((r) =>
      ["Admin", "Manager", "System Manager", "Administrator"].includes(r)
    );
  }, [authUser]);

  // Destination country for filtering agencies
  const destinationCountry = applicant?.destination_country || "";

  // Fetch active foreign recruitment agencies (filtered by country if known)
  const {
    data: contractors = [],
    isLoading: isLoadingContractors,
    error: contractorsError,
  } = useQuery<V2ContractorRecord[]>({
    queryKey: ["agencies_for_staff_selection", destinationCountry],
    queryFn: async () => {
      const list = await listContractorsV2(
        destinationCountry ? { country: destinationCountry } : undefined
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: isOpen && !!applicant && isManagerOrAdmin,
    staleTime: 60000,
  });

  // Filter to active contractors
  const activeAgencies = React.useMemo(() => {
    return contractors.filter((c) => c.is_active !== 0 && c.is_active !== false);
  }, [contractors]);

  // Reset selected contractor when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedContractor("");
    }
  }, [isOpen]);

  const selectMutation = useMutation({
    mutationFn: async () => {
      if (!applicant?.name) {
        throw new Error("No applicant selected.");
      }
      if (!selectedContractor) {
        throw new Error("Please select an agency.");
      }
      return await selectCandidateDirectlyV2(applicant.name, selectedContractor);
    },
    onSuccess: (res) => {
      const agencyObj = activeAgencies.find(
        (a) => a.name === selectedContractor || a.contractor_name === selectedContractor
      );
      const agencyLabel = agencyObj?.company_name || agencyObj?.contractor_name || selectedContractor;

      toast.success(
        res?.message ||
          `Candidate selected directly for ${agencyLabel} without request step. Case is now Selected.`
      );

      // Invalidate relevant queries across the app
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["placement"] });
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["operational_workspace_v2"] });
      queryClient.invalidateQueries({ queryKey: ["agency-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["portal-available-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["undoable_step"] });

      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error("Failed to select candidate for agency", {
        description: formatCleanErrorMessage(err),
      });
    },
  });

  if (!isOpen || !applicant) return null;

  const isUnfit = applicant.medical_status === "UNFIT";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-[#111116] border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-zinc-100">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Select Candidate for an Agency
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Authoritative Direct Selection (0.-23): Staff can select a candidate directly for an
            agency with no request step. This immediately creates a Placement in <strong>Selected</strong> state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Candidate Summary Card */}
          <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/60 p-3 border border-slate-100 dark:border-zinc-800 text-xs space-y-1.5">
            <div className="flex justify-between items-center font-semibold text-slate-800 dark:text-zinc-200">
              <span>{applicant.full_name || applicant.name}</span>
              <span className="font-mono text-[11px] text-slate-500">{applicant.passport_number || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-[11px]">
              <span>Country: {destinationCountry || "Not specified"}</span>
              <span>Job: {applicant.target_job || applicant.job_applied || "Housemaid"}</span>
            </div>
          </div>

          {/* Medical Unfit Alert */}
          {isUnfit && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Candidate is Medically UNFIT</p>
                <p className="text-[11px] mt-0.5">
                  This candidate failed medical examination. Selecting them for an agency is not permitted by health regulations.
                </p>
              </div>
            </div>
          )}

          {/* Agency Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="agency-select" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Target Foreign Agency <span className="text-rose-500">*</span>
            </Label>
            {isLoadingContractors ? (
              <div className="flex items-center gap-2 py-2 px-3 text-xs text-slate-500 border rounded-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Loading authorized agencies...
              </div>
            ) : activeAgencies.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                No active agencies found{destinationCountry ? ` for ${destinationCountry}` : ""}.
              </div>
            ) : (
              <select
                id="agency-select"
                value={selectedContractor}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedContractor(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#141418] px-3 py-2 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select an agency...</option>
                {activeAgencies.map((agency) => (
                  <option key={agency.name} value={agency.name}>
                    {agency.company_name || agency.contractor_name || agency.name} ({agency.country || "Overseas"})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Agency will receive full exclusivity on this candidate immediately.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={selectMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              !selectedContractor ||
              isUnfit ||
              selectMutation.isPending ||
              !isManagerOrAdmin
            }
            onClick={() => selectMutation.mutate()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            {selectMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Confirm Direct Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
