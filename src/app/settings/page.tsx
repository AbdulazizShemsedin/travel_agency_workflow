"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Clock,
  Loader2,
  Upload,
  Trash2,
  Image as ImageIcon,
  ShieldAlert,
  Globe,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getCompanySettingsV2,
  updateCompanySettingsV2,
  setCompanyImageV2,
  getTimeZoneV2,
  setTimeZoneV2,
} from "@/lib/api/v2/finance";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = [
  { value: "Africa/Addis_Ababa", label: "Africa/Addis_Ababa (EAT, UTC+3)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST, UTC+3)" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait (AST, UTC+3)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAdmin = userRoles.some((r) =>
    ["Admin", "Administrator", "System Manager"].includes(r)
  ) || (authUser?.email || "").toLowerCase() === "administrator";
  const isFinanceManager = userRoles.some((r) => ["Finance Manager"].includes(r));
  const canManageCompany = isAdmin || isFinanceManager;

  // 1. Company & Bank Settings Query (Admin & Finance Manager only)
  const {
    data: companySettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ["company_settings"],
    queryFn: () => getCompanySettingsV2(),
    enabled: canManageCompany,
    retry: false,
  });

  // 2. Timezone Query (All staff can read; Admin can edit)
  const {
    data: timeZoneData,
    isLoading: isLoadingTz,
  } = useQuery({
    queryKey: ["server_time_zone"],
    queryFn: () => getTimeZoneV2(),
    retry: false,
  });

  const [companyForm, setCompanyForm] = React.useState<Record<string, any>>({});
  const [selectedTimeZone, setSelectedTimeZone] = React.useState<string>("");
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [stampUploading, setStampUploading] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<"company" | "banking" | "branding" | "timezone">("company");

  React.useEffect(() => {
    if (companySettings) {
      setCompanyForm(companySettings);
    }
  }, [companySettings]);

  React.useEffect(() => {
    if (timeZoneData?.time_zone) {
      setSelectedTimeZone(timeZoneData.time_zone);
    }
  }, [timeZoneData]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return await updateCompanySettingsV2(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success("Settings Saved", {
        description: "Company identity and banking details updated successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Save Failed", {
        description: formatCleanErrorMessage(err) || "Failed to update company settings.",
      });
    },
  });

  // Save Timezone Mutation
  const tzMutation = useMutation({
    mutationFn: async (tz: string) => {
      return await setTimeZoneV2(tz);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server_time_zone"] });
      toast.success("Time Zone Updated", {
        description: "Server operating time zone saved.",
      });
    },
    onError: (err: any) => {
      toast.error("Time Zone Update Failed", {
        description: formatCleanErrorMessage(err) || "Failed to set server time zone.",
      });
    },
  });

  const handleFieldChange = (field: string, val: string) => {
    setCompanyForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveCompanyAndBank = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(companyForm);
  };

  // Image upload handler (logo / stamp)
  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "stamp"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File Too Large", {
        description: "Images must be 20 MB or smaller.",
      });
      return;
    }

    if (kind === "logo") setLogoUploading(true);
    else setStampUploading(true);

    try {
      const res = await setCompanyImageV2(file, kind);
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success(`${kind === "logo" ? "Logo" : "Stamp"} Uploaded`, {
        description: `Official ${kind} updated for printed invoices and reports.`,
      });
    } catch (err: any) {
      toast.error("Upload Failed", {
        description: formatCleanErrorMessage(err) || `Failed to upload ${kind}.`,
      });
    } finally {
      if (kind === "logo") setLogoUploading(false);
      else setStampUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (kind: "logo" | "stamp") => {
    try {
      if (kind === "logo") {
        await updateCompanySettingsV2({ logo: "" });
      } else {
        await updateCompanySettingsV2({ stamp_image: "" });
      }
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success(`${kind === "logo" ? "Logo" : "Stamp"} Removed`);
    } catch (err: any) {
      toast.error("Removal Failed", {
        description: formatCleanErrorMessage(err) || `Failed to remove ${kind}.`,
      });
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-[#222228] pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            System & Agency Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage agency invoice identity, banking credentials, seal stamp, and operational parameters.
          </p>
        </div>

        {canManageCompany && (settingsTab === "company" || settingsTab === "banking") && (
          <Button
            type="button"
            onClick={handleSaveCompanyAndBank}
            disabled={saveMutation.isPending}
            size="sm"
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs shadow-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save All Settings
          </Button>
        )}
      </div>

      {/* Settings Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#15151a] border border-slate-200/80 dark:border-[#222227] w-fit overflow-x-auto">
        {canManageCompany && (
          <>
            <button
              type="button"
              onClick={() => setSettingsTab("company")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                settingsTab === "company"
                  ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Company Identity</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("banking")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                settingsTab === "banking"
                  ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <span>Bank Details</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("branding")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                settingsTab === "branding"
                  ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span>Logo & Stamps</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setSettingsTab("timezone")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
            settingsTab === "timezone"
              ? "bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-white shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          )}
        >
          <Globe className="h-3.5 w-3.5 text-emerald-600" />
          <span>Operating Timezone</span>
        </button>
      </div>

      {/* Non-Admin / Non-Finance Notice */}
      {!canManageCompany && settingsTab !== "timezone" && (
        <Card className="border-slate-200 dark:border-[#222228] bg-slate-50/50 dark:bg-[#121217]">
          <CardContent className="p-6 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              Settings Restricted
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              Company legal identity, banking details, and invoice graphics are managed exclusively by System Administrators and Finance Managers.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Company & Bank Settings Section (Admin & Finance Manager) */}
      {canManageCompany && settingsTab !== "timezone" && (
        <>
          {isLoadingSettings ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="max-w-4xl">
              {settingsTab === "company" && (
                <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217] shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                    Company Identity
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Our agency name, address, and contacts printed on all batch commission invoices and Excel exports.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 pt-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="agency_name" className="text-xs font-semibold">
                      Agency Name (Printed on Invoices) *
                    </Label>
                    <Input
                      id="agency_name"
                      value={companyForm.agency_name || ""}
                      onChange={(e) => handleFieldChange("agency_name", e.target.value)}
                      placeholder="e.g. Al Rawnaq Recruitment Agency"
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="agency_address" className="text-xs font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      Physical Address
                    </Label>
                    <Input
                      id="agency_address"
                      value={companyForm.agency_address || ""}
                      onChange={(e) => handleFieldChange("agency_address", e.target.value)}
                      placeholder="Bole Sub-City, Addis Ababa, Ethiopia"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="agency_phone" className="text-xs font-semibold flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        Phone Number
                      </Label>
                      <Input
                        id="agency_phone"
                        value={companyForm.agency_phone || ""}
                        onChange={(e) => handleFieldChange("agency_phone", e.target.value)}
                        placeholder="+251 911 234567"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="agency_email" className="text-xs font-semibold flex items-center gap-1">
                        <Mail className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Official E-mail
                      </Label>
                      <Input
                        id="agency_email"
                        type="email"
                        value={companyForm.agency_email || ""}
                        onChange={(e) => handleFieldChange("agency_email", e.target.value)}
                        placeholder="agency@example.com"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Card 2: Bank Details Card */}
              {settingsTab === "banking" && (
                <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217] shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                    Bank Details
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Designated bank accounts printed on invoice PDF under "Pay to".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 pt-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bank_name" className="text-xs font-semibold">
                        Bank Name
                      </Label>
                      <Input
                        id="bank_name"
                        value={companyForm.bank_name || ""}
                        onChange={(e) => handleFieldChange("bank_name", e.target.value)}
                        placeholder="e.g. Commercial Bank of Ethiopia (CBE)"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account_name" className="text-xs font-semibold">
                        Account Holder Name
                      </Label>
                      <Input
                        id="account_name"
                        value={companyForm.account_name || ""}
                        onChange={(e) => handleFieldChange("account_name", e.target.value)}
                        placeholder="e.g. Al Rawnaq Travel Agency PLC"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="account_number" className="text-xs font-semibold">
                        Account Number
                      </Label>
                      <Input
                        id="account_number"
                        value={companyForm.account_number || ""}
                        onChange={(e) => handleFieldChange("account_number", e.target.value)}
                        placeholder="1000293847123"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="bank_swift_code" className="text-xs font-semibold">
                        SWIFT / BIC Code
                      </Label>
                      <Input
                        id="bank_swift_code"
                        value={companyForm.bank_swift_code || ""}
                        onChange={(e) => handleFieldChange("bank_swift_code", e.target.value)}
                        placeholder="CBETETAA"
                        className="h-8 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank_address" className="text-xs font-semibold">
                      Bank Branch Address
                    </Label>
                    <Input
                      id="bank_address"
                      value={companyForm.bank_address || ""}
                      onChange={(e) => handleFieldChange("bank_address", e.target.value)}
                      placeholder="Addis Ababa Branch, Churchill Ave"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bank_phone" className="text-xs font-semibold">
                        Bank Phone
                      </Label>
                      <Input
                        id="bank_phone"
                        value={companyForm.bank_phone || ""}
                        onChange={(e) => handleFieldChange("bank_phone", e.target.value)}
                        placeholder="+251 115 515004"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bank_email" className="text-xs font-semibold">
                        Bank E-mail
                      </Label>
                      <Input
                        id="bank_email"
                        value={companyForm.bank_email || ""}
                        onChange={(e) => handleFieldChange("bank_email", e.target.value)}
                        placeholder="swift@combanketh.et"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Card 3: Logo & Stamp Graphics Upload Tiles (N16) */}
              {settingsTab === "branding" && (
                <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217] shadow-xs lg:col-span-2">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                    Official Graphics & Invoice Tiles
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Upload official company emblem logo and authorized signatory stamp. Both are embedded and printed on every generated commission invoice. Supported: JPG, PNG, WEBP (up to 20 MB).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                  {/* Tile 1: Logo */}
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#282832] p-4 flex flex-col items-center justify-between text-center bg-slate-50/40 dark:bg-[#15151c]">
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Agency Logo
                        </span>
                        {companyForm.logo && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            Configured
                          </Badge>
                        )}
                      </div>

                      {companyForm.logo ? (
                        <div className="h-32 w-full flex items-center justify-center p-2 rounded-lg bg-white dark:bg-[#101014] border border-slate-200 dark:border-[#222228] overflow-hidden">
                          <img
                            src={companyForm.logo}
                            alt="Agency Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-[#2c2c36] text-slate-400 text-xs gap-1">
                          <ImageIcon className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
                          <span>No logo uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 w-full justify-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => handleUploadImage(e, "logo")}
                          disabled={logoUploading}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          asChild
                          disabled={logoUploading}
                          className="h-8 text-xs border-slate-300 dark:border-[#2f2f3a]"
                        >
                          <span>
                            {logoUploading ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {companyForm.logo ? "Replace Logo" : "Upload Logo"}
                          </span>
                        </Button>
                      </label>

                      {companyForm.logo && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveImage("logo")}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tile 2: Stamp */}
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#282832] p-4 flex flex-col items-center justify-between text-center bg-slate-50/40 dark:bg-[#15151c]">
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Authorized Stamp / Seal
                        </span>
                        {companyForm.stamp_image && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            Configured
                          </Badge>
                        )}
                      </div>

                      {companyForm.stamp_image ? (
                        <div className="h-32 w-full flex items-center justify-center p-2 rounded-lg bg-white dark:bg-[#101014] border border-slate-200 dark:border-[#222228] overflow-hidden">
                          <img
                            src={companyForm.stamp_image}
                            alt="Agency Stamp"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-[#2c2c36] text-slate-400 text-xs gap-1">
                          <ImageIcon className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
                          <span>No official stamp uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 w-full justify-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => handleUploadImage(e, "stamp")}
                          disabled={stampUploading}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          asChild
                          disabled={stampUploading}
                          className="h-8 text-xs border-slate-300 dark:border-[#2f2f3a]"
                        >
                          <span>
                            {stampUploading ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {companyForm.stamp_image ? "Replace Stamp" : "Upload Stamp"}
                          </span>
                        </Button>
                      </label>

                      {companyForm.stamp_image && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveImage("stamp")}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Card 4: Operating Time Zone (Admin Only for Edit) */}
      {settingsTab === "timezone" && (
        <Card className="border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121217] shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#1d1d24]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
              Operating Time Zone
            </CardTitle>
            {timeZoneData?.now && (
              <Badge variant="outline" className="text-[11px] font-mono">
                Server Time: {timeZoneData.now.split(".")[0]}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-slate-500">
            Backend timestamps (sent notifications, process event history, task schedules) are recorded in this time zone.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 text-xs">
          <div className="max-w-md space-y-2">
            <Label htmlFor="timezone_select" className="text-xs font-semibold">
              Select Time Zone {isAdmin ? "" : "(View Only)"}
            </Label>
            <div className="flex items-center gap-2">
              <select
                id="timezone_select"
                value={selectedTimeZone}
                onChange={(e) => setSelectedTimeZone(e.target.value)}
                disabled={!isAdmin || tzMutation.isPending}
                className="flex h-9 w-full rounded-lg border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 disabled:opacity-60"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
                {!COMMON_TIMEZONES.some((tz) => tz.value === selectedTimeZone) && selectedTimeZone && (
                  <option value={selectedTimeZone}>{selectedTimeZone}</option>
                )}
              </select>

              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => tzMutation.mutate(selectedTimeZone)}
                  disabled={tzMutation.isPending || selectedTimeZone === timeZoneData?.time_zone}
                  className="h-9 px-3 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shrink-0"
                >
                  {tzMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              )}
            </div>
            {!isAdmin && (
              <p className="text-[11px] text-slate-400">
                Only System Administrators can change the operating time zone.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
