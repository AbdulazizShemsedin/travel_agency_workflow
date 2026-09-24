"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Save, Shield, Building2, Phone, Mail, CreditCard, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAgencyTrackingSettingsV2,
  updateAgencyTrackingSettingsV2,
  V2AgencyTrackingSettings,
} from "@/lib/api/v2";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<V2AgencyTrackingSettings>({
    queryKey: ["agency_tracking_settings"],
    queryFn: () => getAgencyTrackingSettingsV2(),
  });

  const [formData, setFormData] = React.useState<Partial<V2AgencyTrackingSettings>>({});

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<V2AgencyTrackingSettings>) => updateAgencyTrackingSettingsV2(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency_tracking_settings"] });
      toast.success("Agency Tracking Settings saved successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update settings.");
    },
  });

  const handleChange = (field: keyof V2AgencyTrackingSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            Agency Tracking Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Configure agency details, communication endpoints, official contact email, and banking credentials.
          </p>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={saveMutation.isPending}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs shadow-xs"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: Company & Contact Information */}
        <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Company Details & Official Contacts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Agency identity and contact details printed on Injaz PDFs and biometric exports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="agency_name" className="text-xs font-semibold">
                Agency Legal Name
              </Label>
              <Input
                id="agency_name"
                value={formData.agency_name || ""}
                onChange={(e) => handleChange("agency_name", e.target.value)}
                placeholder="e.g. Al Rawnaq Travel & Recruitment Agency"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agency_phone" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  Agency Phone
                </Label>
                <Input
                  id="agency_phone"
                  value={formData.agency_phone || ""}
                  onChange={(e) => handleChange("agency_phone", e.target.value)}
                  placeholder="+251 911 234567"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agency_email" className="text-xs font-semibold flex items-center gap-1">
                  <Mail className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Agency Email
                </Label>
                <Input
                  id="agency_email"
                  type="email"
                  value={formData.agency_email || ""}
                  onChange={(e) => handleChange("agency_email", e.target.value)}
                  placeholder="rawnasultan03@gmail.com"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              If left blank, the backend defaults to <code>rawnasultan03@gmail.com</code> on Injaz PDFs and Taeshir export sheets.
            </p>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="license_number" className="text-xs font-semibold">
                Recruitment Agency License №
              </Label>
              <Input
                id="license_number"
                value={formData.license_number || ""}
                onChange={(e) => handleChange("license_number", e.target.value)}
                placeholder="e.g. MOL/ET/2026/0412"
                className="h-8 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Banking & Invoicing Credentials */}
        <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Banking Credentials
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Bank settlement accounts printed on batch commission invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-xs font-semibold">
                Designated Bank Name
              </Label>
              <Input
                id="bank_name"
                value={formData.bank_name || ""}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                placeholder="e.g. Commercial Bank of Ethiopia (CBE) / Awash Bank"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bank_account_no" className="text-xs font-semibold">
                Bank Account Number
              </Label>
              <Input
                id="bank_account_no"
                value={formData.bank_account_no || ""}
                onChange={(e) => handleChange("bank_account_no", e.target.value)}
                placeholder="1000293847123"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iban" className="text-xs font-semibold">
                IBAN / SWIFT Code
              </Label>
              <Input
                id="iban"
                value={formData.iban || ""}
                onChange={(e) => handleChange("iban", e.target.value)}
                placeholder="ET12CBET000000000010002938"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Alert & Expiry Thresholds */}
        <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217]">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Aging & Expiry Alert Thresholds
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure alert day buffers for medical and visa expiration tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="urgent_days" className="text-xs font-semibold">
                  Urgent Alert (Days)
                </Label>
                <Input
                  id="urgent_days"
                  type="number"
                  value={formData.urgent_alert_threshold_days ?? 10}
                  onChange={(e) => handleChange("urgent_alert_threshold_days", Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warning_days" className="text-xs font-semibold">
                  Warning Alert (Days)
                </Label>
                <Input
                  id="warning_days"
                  type="number"
                  value={formData.warning_alert_threshold_days ?? 30}
                  onChange={(e) => handleChange("warning_alert_threshold_days", Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
