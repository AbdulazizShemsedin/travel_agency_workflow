"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileCheck2,
  X,
  Loader2,
  Lock,
  User,
  Calendar,
  Phone,
  MapPin,
  ShieldCheck,
  Building2,
  Award,
  IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  updateApplicantForLmisV2,
  V2LmisUpdatePayload,
} from "@/lib/api/v2/applicants";

interface LmisFastPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName?: string;
  initialValues?: {
    national_id?: string;
    labor_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_address?: string;
    coc_status?: string;
    exam_date?: string;
  };
  onSuccess?: () => void;
}

export function LmisFastPathModal({
  isOpen,
  onClose,
  applicantId,
  applicantName,
  initialValues,
  onSuccess,
}: LmisFastPathModalProps) {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];

  // Authorized roles per backend contract: Saudi LMIS, Kuwait LMIS, Manager, Admin
  const isAuthorized = userRoles.some((r) =>
    [
      "Saudi LMIS",
      "Kuwait LMIS",
      "Manager",
      "Admin",
      "Administrator",
      "System Manager",
    ].includes(r)
  );

  const getCleanLaborId = (val?: string) => (val && !val.toUpperCase().startsWith("APP-") ? val : "");
  const [nationalId, setNationalId] = React.useState(initialValues?.national_id || "");
  const [laborId, setLaborId] = React.useState(getCleanLaborId(initialValues?.labor_id));
  const [emergencyName, setEmergencyName] = React.useState(initialValues?.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = React.useState(initialValues?.emergency_contact_phone || "");
  const [emergencyAddress, setEmergencyAddress] = React.useState(initialValues?.emergency_contact_address || "");
  const [cocStatus, setCocStatus] = React.useState(initialValues?.coc_status || "Not Started");
  const [examDate, setExamDate] = React.useState(initialValues?.exam_date || "");

  // Update local state when initialValues change
  React.useEffect(() => {
    if (initialValues) {
      setNationalId(initialValues.national_id || "");
      setLaborId(getCleanLaborId(initialValues.labor_id));
      setEmergencyName(initialValues.emergency_contact_name || "");
      setEmergencyPhone(initialValues.emergency_contact_phone || "");
      setEmergencyAddress(initialValues.emergency_contact_address || "");
      setCocStatus(initialValues.coc_status || "Not Started");
      setExamDate(initialValues.exam_date || "");
    }
  }, [initialValues]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: V2LmisUpdatePayload = {
        applicant_name: applicantId,
        national_id: nationalId.trim() || undefined,
        labor_id: laborId.trim() || undefined,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        emergency_contact_address: emergencyAddress.trim() || undefined,
        coc_status: cocStatus || undefined,
        exam_date: examDate || undefined,
      };

      return await updateApplicantForLmisV2(payload);
    },
    onSuccess: () => {
      toast.success("LMIS Metadata Updated", {
        description: `Successfully updated allowlisted LMIS metadata for ${applicantId}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["v2_applicant_doc_center", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["v2_my_clearance_steps"] });
      queryClient.invalidateQueries({ queryKey: ["v2_all_clearance_steps"] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error("LMIS Update Failed", {
        description: err?.message || "Failed to update LMIS metadata. Please check inputs and try again.",
      });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#15151b] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222227]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  LMIS Fast-Path Intake Editor
                </h3>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                  update_applicant_for_lmis
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                {applicantName || "Candidate"} • {applicantId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security / Role Guard Check */}
        {!isAuthorized ? (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Lock className="h-4 w-4 text-amber-600" />
              Role Authorization Required
            </div>
            <p className="leading-relaxed text-[11px]">
              LMIS data updates are strictly restricted to <strong>Saudi LMIS</strong>, <strong>Kuwait LMIS</strong>, <strong>Manager</strong>, or <strong>Admin</strong> officers. Your active roles do not permit this update.
            </p>
            <div className="pt-2 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-7">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Updates narrow allowlisted fields captured specifically at the LMIS clearance gate.
              Values are validated and stored on the Candidate record without modifying overall applicant lifecycle status.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* National ID */}
              <div className="space-y-1">
                <Label htmlFor="national_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <IdCard className="h-3 w-3 text-slate-400" />
                  National ID
                </Label>
                <Input
                  id="national_id"
                  placeholder="Ethiopian National ID (Fayda)"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Labor ID */}
              <div className="space-y-1">
                <Label htmlFor="labor_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  Ministry Labor ID
                </Label>
                <Input
                  id="labor_id"
                  placeholder="LMIS Labor Reference Number"
                  value={laborId}
                  onChange={(e) => setLaborId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* COC Status */}
              <div className="space-y-1">
                <Label htmlFor="coc_status" className="text-xs font-semibold flex items-center gap-1.5">
                  <Award className="h-3 w-3 text-slate-400" />
                  COC Certificate Status
                </Label>
                <select
                  id="coc_status"
                  value={cocStatus}
                  onChange={(e) => setCocStatus(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs"
                >
                  <option value="Not Started">Not Started (Not Globally Mandatory)</option>
                  <option value="Pending">Pending Evaluation</option>
                  <option value="Issued">Issued / Certified</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Per business rule, COC is tracked here but not mandatory across all corridors.
                </p>
              </div>

              {/* Exam Date */}
              <div className="space-y-1">
                <Label htmlFor="exam_date" className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  LMIS Exam Date
                </Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#222227] space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                Emergency Contact Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emergency_name" className="text-[11px] text-slate-400">
                    Contact Full Name
                  </Label>
                  <Input
                    id="emergency_name"
                    placeholder="Next of kin"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emergency_phone" className="text-[11px] text-slate-400">
                    Contact Phone
                  </Label>
                  <Input
                    id="emergency_phone"
                    placeholder="+251..."
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emergency_address" className="text-[11px] text-slate-400">
                    Contact Address / Kebele
                  </Label>
                  <Input
                    id="emergency_address"
                    placeholder="City / Woreda"
                    value={emergencyAddress}
                    onChange={(e) => setEmergencyAddress(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs h-8 bg-emerald-900 hover:bg-emerald-950 text-white font-semibold shadow-xs"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save LMIS Metadata
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
