"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  MessageSquare,
  Building2,
  FileText,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Phone,
  User,
  Mail,
  ShieldCheck,
  Globe,
  Sparkles,
} from "lucide-react";
import { Applicant, Contractor } from "@/types/applicant";
import {
  getContractorsList,
  sendContractRequestApi,
} from "@/lib/api/applicantApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ContractRequestModalProps {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
}

export function ContractRequestModal({
  applicant,
  isOpen,
  onClose,
}: ContractRequestModalProps) {
  const queryClient = useQueryClient();
  const [selectedContractor, setSelectedContractor] = React.useState<string>("");
  const [sentWhatsappUrl, setSentWhatsappUrl] = React.useState<string | null>(null);
  const [apiResponseDetails, setApiResponseDetails] = React.useState<{
    whatsapp_api_sent?: boolean;
    whatsapp_api_message?: string;
    contractor_name?: string;
    whatsapp_number?: string;
  } | null>(null);

  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery({
    queryKey: ["contractors"],
    queryFn: getContractorsList,
  });

  // Auto-select first contractor when contractors list loads
  React.useEffect(() => {
    if (contractors.length > 0 && !selectedContractor) {
      setSelectedContractor(contractors[0].name);
    }
  }, [contractors, selectedContractor]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSentWhatsappUrl(null);
      setApiResponseDetails(null);
      if (contractors.length > 0 && !selectedContractor) {
        setSelectedContractor(contractors[0].name);
      }
    }
  }, [isOpen, contractors]);

  const activeContractor: Contractor | undefined = contractors.find(
    (c) => c.name === selectedContractor || c.company_name === selectedContractor
  ) || contractors[0];

  const sendMutation = useMutation({
    mutationFn: async () => {
      const contractorKey = activeContractor?.name || selectedContractor || "tutu";
      return await sendContractRequestApi(applicant.name, contractorKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });

      if (data.message.whatsapp_url) {
        setSentWhatsappUrl(data.message.whatsapp_url);
      }

      setApiResponseDetails({
        whatsapp_api_sent: data.message.whatsapp_api_sent,
        whatsapp_api_message: data.message.whatsapp_api_message,
        contractor_name: data.message.contractor_name || activeContractor?.company_name || activeContractor?.name,
        whatsapp_number: data.message.whatsapp_number || activeContractor?.whatsapp || activeContractor?.phone,
      });

      toast.success("Contract Request Dispatched Successfully!", {
        description: data.message.whatsapp_api_sent
          ? "CV PDF and demand request sent via Meta WhatsApp Cloud API."
          : (data.message.message || "Contract Request dispatched to contractor."),
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to send Contract Request", { description: err.message });
    },
  });

  const handleOpenWhatsappWeb = () => {
    if (sentWhatsappUrl) {
      window.open(sentWhatsappUrl, "_blank", "noopener,noreferrer");
    } else {
      const phone = (activeContractor?.whatsapp || activeContractor?.phone || "+251940107716").replace(/[^0-9]/g, "");
      const msg = `Hello ${activeContractor?.contact_person || "Partner"},\n\nA new Contract Request has been prepared for Applicant *${applicant.full_name || applicant.first_name}* (ID: ${applicant.name}).\nPlease review CV and confirm.`;
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  };

  const appName = applicant.name || (applicant as any)?.applicant_id || "Applicant";
  const applicantDisplayName = applicant.full_name || `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || appName;
  const cvRecordName = applicant.cv_record || applicant.cv_record_data?.name || `CV-${String(appName).replace("APP-", "")}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-white text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="h-4 w-4" />
            </div>
            Send Contract Request & CV via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Transmit candidate CV record and formal recruitment dispatch to overseas contractor agency via WhatsApp Cloud API & WhatsApp Web.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Candidate Summary Card */}
          <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#16161b] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-[#26262d] pb-2">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Candidate Profile:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{applicantDisplayName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-zinc-300">
              <div>
                <span className="text-slate-400 text-[11px] block">Passport Number</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                  {applicant.passport_number || "Verified"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Job Category</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {applicant.job_applied || "House Maid"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">CV Record Reference</span>
                <span className="font-mono text-emerald-800 dark:text-emerald-400 font-bold">
                  {cvRecordName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Current Stage</span>
                <Badge variant="default" className="text-[10px] h-5 py-0 px-2">
                  {applicant.applicant_state || "CV Generated"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contractor Selector */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
              <span>Select Foreign Agency / Contractor</span>
              {activeContractor && (
                <span className="text-[11px] font-normal text-emerald-800 dark:text-emerald-400">
                  Active Partner
                </span>
              )}
            </Label>
            <Select
              value={selectedContractor || activeContractor?.name || ""}
              onChange={(e) => setSelectedContractor(e.target.value)}
              disabled={sendMutation.isPending || !!sentWhatsappUrl}
              className="w-full text-xs font-medium"
            >
              {contractors.length > 0 ? (
                contractors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.company_name || c.name} — {c.contact_person ? `${c.contact_person} • ` : ""}{c.whatsapp || c.phone || c.country || "Agency"}
                  </option>
                ))
              ) : (
                <>
                  <option value="tutu">tutu (Hamza Adil — +251940107716)</option>
                  <option value="Al-Umal">Al-Umal (Hamza — +251988776655)</option>
                </>
              )}
            </Select>
          </div>

          {/* Selected Contractor Details Preview */}
          {activeContractor && (
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                <span className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <Building2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                  {activeContractor.company_name || activeContractor.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {activeContractor.country || "Saudi Arabia"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                {activeContractor.contact_person && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{activeContractor.contact_person}</span>
                  </div>
                )}
                {(activeContractor.whatsapp || activeContractor.phone) && (
                  <div className="flex items-center gap-1 font-mono text-emerald-900 dark:text-emerald-300 font-semibold">
                    <Phone className="h-3 w-3" />
                    <span>{activeContractor.whatsapp || activeContractor.phone}</span>
                  </div>
                )}
                {activeContractor.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{activeContractor.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp Status Banner (After Send) */}
          {sentWhatsappUrl ? (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                {apiResponseDetails?.whatsapp_api_sent
                  ? "Meta WhatsApp Cloud API Dispatched"
                  : "Contract Request Ready for WhatsApp"}
              </div>

              <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                {apiResponseDetails?.whatsapp_api_message ||
                  `Contract Request dispatched for ${applicantDisplayName} to ${activeContractor?.company_name || activeContractor?.name}. Candidate CV record linked.`}
              </p>

              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleOpenWhatsappWeb}
                  className="flex-1 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold h-9 shadow-xs"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open WhatsApp Web Chat Thread
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#16161b] p-3 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                <Send className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                Automated Recruitment Workflow
              </span>
              <p>
                Sending will automatically attach candidate CV record <strong>{cvRecordName}</strong>, record the dispatch in Frappe database, notify partner agency, and generate a verified WhatsApp direct link.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-[#222227]">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            {sentWhatsappUrl ? "Done / Close" : "Cancel"}
          </Button>
          {!sentWhatsappUrl && (
            <Button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || isLoadingContractors}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs h-9 px-4 shadow-sm"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Dispatching to WhatsApp...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send Contract Request
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
