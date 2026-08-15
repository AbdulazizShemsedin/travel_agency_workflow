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
  Sparkles,
} from "lucide-react";
import { Applicant } from "@/types/applicant";
import {
  getContractorsList,
  sendContractRequestApi,
  batchSendContractRequestsApi,
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
  const [selectedContractor, setSelectedContractor] = React.useState<string>("Al Qurashi Recruitment Office");
  const [sentWhatsappUrl, setSentWhatsappUrl] = React.useState<string | null>(null);

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: getContractorsList,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const crName = `CR-${applicant.name.replace("APP-", "")}`;
      return await sendContractRequestApi(crName);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicant.name] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });

      if (data.message.whatsapp_url) {
        setSentWhatsappUrl(data.message.whatsapp_url);
      }

      toast.success("Contract Request Sent to Contractor!", {
        description: "Candidate transitioned to Request Pending stage.",
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to send Contract Request", { description: err.message });
    },
  });

  const handleOpenWhatsappWeb = () => {
    if (sentWhatsappUrl) {
      window.open(sentWhatsappUrl, "_blank");
    } else {
      const defaultUrl = `https://api.whatsapp.com/send?phone=966501234567&text=Hello%2C%20please%20review%20candidate%20CV%20for%20${encodeURIComponent(applicant.full_name)}%20(ID:%20${applicant.name})`;
      window.open(defaultUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <MessageSquare className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            Send Contract Request via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Dispatch candidate CV record to overseas partner agency via Meta WhatsApp Cloud API and generate instant WhatsApp Web deep link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Candidate Summary Card */}
          <div className="rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#16161b] p-3.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Candidate:</span>
              <span className="font-bold text-slate-900 dark:text-white">{applicant.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Passport:</span>
              <span className="font-mono text-slate-800 dark:text-zinc-200">{applicant.passport_number || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">CV Record:</span>
              <span className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">{applicant.cv_record || "CV Generated"}</span>
            </div>
          </div>

          {/* Contractor Selector */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-800 dark:text-zinc-200">
              Select Overseas Agency / Contractor
            </Label>
            <Select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
            >
              {contractors.length > 0 ? (
                contractors.map((c) => (
                  <option key={c.name} value={c.company_name}>
                    {c.company_name} ({c.country || "KSA"})
                  </option>
                ))
              ) : (
                <>
                  <option value="Al Qurashi Recruitment Office">Al Qurashi Recruitment Office (KSA)</option>
                  <option value="Al-Khaleej International Manpower Co.">Al-Khaleej International Manpower Co. (Riyadh)</option>
                  <option value="Gulf Horizons Agency">Gulf Horizons Agency (UAE)</option>
                </>
              )}
            </Select>
          </div>

          {/* WhatsApp Preview Notification */}
          {sentWhatsappUrl ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-950 dark:text-emerald-200 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                WhatsApp Cloud API Dispatched
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Contract request successfully broadcast to {selectedContractor}. You can also open the WhatsApp Web chat thread directly.
              </p>
              <Button
                type="button"
                onClick={handleOpenWhatsappWeb}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold h-8"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open WhatsApp Web Thread
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215] p-3 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                Automated Meta Cloud Dispatch
              </span>
              <p>
                Sending will automatically attach the bilateral 2-page recruitment CV PDF and notify the foreign agency.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {!sentWhatsappUrl && (
            <Button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Sending via WhatsApp...
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
