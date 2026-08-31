"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Loader2,
  User,
  Calendar,
  Lock,
} from "lucide-react";
import { updateMusanedStatusApi } from "@/lib/api/applicantApi";
import { Applicant } from "@/types/applicant";
import { useAuth } from "@/components/providers/AuthProvider";
import { isPureForeignAgency } from "@/lib/auth/permissions";
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
import { Select } from "@/components/ui/select";

interface MusanedVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  onSuccess?: () => void;
}

type MusanedStatusType = "Not Registered" | "Pending Verification" | "Registered" | "Rejected";

export function MusanedVerificationModal({
  isOpen,
  onClose,
  applicant,
  onSuccess,
}: MusanedVerificationModalProps) {
  const queryClient = useQueryClient();
  const { authUser } = useAuth();
  const isForeignAgency = isPureForeignAgency(authUser);
  const canEditMusaned = !isForeignAgency;

  const currentStatus: MusanedStatusType =
    (applicant.musaned_status as MusanedStatusType) ||
    (applicant.is_uploaded_to_musaned ? "Registered" : "Not Registered");

  const [referenceNo, setReferenceNo] = React.useState(applicant.musaned_reference_no || "");
  const [status, setStatus] = React.useState<MusanedStatusType>(currentStatus);

  React.useEffect(() => {
    if (isOpen) {
      setReferenceNo(applicant.musaned_reference_no || "");
      setStatus(
        (applicant.musaned_status as MusanedStatusType) ||
          (applicant.is_uploaded_to_musaned ? "Registered" : "Not Registered")
      );
    }
  }, [isOpen, applicant]);

  // RBAC: Check if user is allowed to edit Musaned status
  // Allowed: System Manager, Administrator, Agency Admin, Recruiter, Intake Officer, Clearance Officer, Wakala Officer, Desk User
  // Denied: Foreign Agency / Agent

  const updateMutation = useMutation({
    mutationFn: async () => {
      const isUploaded = status === "Registered" ? 1 : 0;
      return await updateMusanedStatusApi({
        applicant: applicant.name,
        is_uploaded_to_musaned: isUploaded,
        musaned_reference_no: referenceNo.trim(),
        musaned_status: status,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Applicant>(["applicant", applicant.name], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          musaned_status: status,
          is_uploaded_to_musaned: status === "Registered" ? 1 : 0,
          musaned_reference_no: referenceNo.trim(),
          musaned_uploaded_at: data.musaned_uploaded_at || new Date().toISOString(),
          musaned_registered_by: data.musaned_registered_by || authUser?.full_name || authUser?.email || "Operations Staff",
        };
      });
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Musaned pre-registration updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Failed to update Musaned status", {
        description: err.message,
      });
    },
  });

  const getStatusBadge = (s: MusanedStatusType) => {
    switch (s) {
      case "Registered":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Registered
          </Badge>
        );
      case "Pending Verification":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending Verification
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 dark:text-zinc-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Not Registered
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Confirm Musaned Registration
              </DialogTitle>
              <DialogDescription className="text-xs">
                Confirm or update candidate pre-registration on Musaned to enable CV generation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informational Disclaimer */}
        <div className="rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-zinc-900/60 p-3 text-xs text-slate-600 dark:text-zinc-300 space-y-1.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white">Manual Portal Registration:</strong>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Staff manually register the domestic worker directly on the{" "}
                <a
                  href="https://musaned.com.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-800 dark:text-emerald-400 underline inline-flex items-center gap-0.5 font-medium"
                >
                  Musaned Portal <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                and confirm the registration status below.
              </p>
            </div>
          </div>
        </div>

        {/* Current Applicant & Record Details */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="rounded-lg border border-slate-100 dark:border-[#222227] bg-white dark:bg-[#16161a] p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Candidate</span>
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {applicant.full_name || `${applicant.first_name} ${applicant.last_name}`}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              {applicant.name} • {applicant.passport_number || "Passport Verified"}
            </span>
          </div>

          <div className="rounded-lg border border-slate-100 dark:border-[#222227] bg-white dark:bg-[#16161a] p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Destination</span>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {applicant.destination_country || "Saudi Arabia"}
            </p>
            <div className="mt-1">{getStatusBadge(currentStatus)}</div>
          </div>
        </div>

        {/* Backend Recorded Metadata (if available) */}
        {(applicant.musaned_uploaded_at || applicant.musaned_registered_by) && (
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-[#141417] px-3 py-2 rounded-md">
            {applicant.musaned_uploaded_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" /> Recorded:{" "}
                <strong className="text-slate-700 dark:text-zinc-200">
                  {new Date(applicant.musaned_uploaded_at).toLocaleString()}
                </strong>
              </span>
            )}
            {applicant.musaned_registered_by && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" /> Recorded By:{" "}
                <strong className="text-slate-700 dark:text-zinc-200">
                  {applicant.musaned_registered_by}
                </strong>
              </span>
            )}
          </div>
        )}

        {/* Form Inputs */}
        {canEditMusaned ? (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="musaned_status" className="text-xs font-semibold">
                Musaned Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                id="musaned_status"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as MusanedStatusType)}
              >
                <option value="Registered">
                  Completed / Registered (Verified on Musaned — Ready for CV)
                </option>
                <option value="Pending Verification">
                  In Progress / Pending Verification (Submitted on Musaned)
                </option>
                <option value="Not Registered">
                  Not Registered (Pending Upload)
                </option>
                <option value="Rejected">
                  Rejected / Returned by Portal
                </option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="musaned_reference_no" className="text-xs font-semibold">
                Musaned Reference Number <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="musaned_reference_no"
                placeholder="e.g. MUS-2026-987654 or Portal Contract Ref (Optional)"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Optional tracking code or electronic contract reference from the Musaned system.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Foreign agency accounts cannot modify Musaned pre-registration. Please contact internal operations staff for Musaned registration updates.
            </span>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
          {canEditMusaned && (
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm Musaned Registration
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
