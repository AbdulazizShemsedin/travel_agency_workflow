"use client";

import * as React from "react";
import Link from "next/link";
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
  HardDrive,
  RefreshCw,
  Bell,
  Coins,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Send,
  KeyRound,
  ShieldCheck,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdminUser } from "@/lib/auth/permissions";
import {
  getCompanySettingsV2,
  updateCompanySettingsV2,
  setCompanyImageV2,
  getTimeZoneV2,
  setTimeZoneV2,
  getMoneySettingsV2,
  setFxRateV2,
  fetchFxRatesNowV2,
} from "@/lib/api/v2/finance";
import { testStorageConnectionV2, V2StorageConnectionStatus } from "@/lib/api/v2/storage";
import { regenerateVapidKeysV2, sendTestPushV2 } from "@/lib/api/v2/notifications";
import {
  getStorageSettingsV2,
  updateStorageSettingsV2,
  getExchangeRateSettingsV2,
  updateExchangeRateSettingsV2,
  getNotificationSettingsV2,
  updateNotificationSettingsV2,
  listCorridorsV2,
  updateCorridorFeesV2,
  V2StorageSettings,
  V2ExchangeRateSettings,
  V2NotificationSettings,
  V2CorridorConfig,
  V2CorridorFeeItem,
} from "@/lib/api/v2/settings";
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
  const { authUser, user, roles, isReadOnly } = useAuth();

  const userRoles = Array.isArray(roles) ? roles.map((r) => String(r)) : [];
  const isAdmin = Boolean(
    isAdminUser(authUser) ||
    user === "Administrator" ||
    userRoles.some((r) => ["Admin", "Administrator", "System Manager"].includes(r)) ||
    (authUser?.email || "").toLowerCase() === "administrator"
  );
  const isFinanceManager = userRoles.some((r) => ["Finance Manager"].includes(r));
  const isManager = userRoles.some((r) => ["Manager"].includes(r));
  const isReadOnlyUser = isReadOnly() && !isAdmin && !isManager;

  // Active section tab
  const [settingsTab, setSettingsTab] = React.useState<
    "company" | "storage" | "exchange" | "notifications" | "corridors" | "employees" | "agencies"
  >("company");

  // ==========================================
  // SECTION 1: Company & Invoice Settings
  // ==========================================
  const canManageCompany = isAdmin || isFinanceManager;
  const {
    data: companySettings,
    isLoading: isLoadingCompany,
    refetch: refetchCompany,
  } = useQuery({
    queryKey: ["company_settings"],
    queryFn: () => getCompanySettingsV2(),
    enabled: canManageCompany,
  });

  const { data: timeZoneData } = useQuery({
    queryKey: ["server_time_zone"],
    queryFn: () => getTimeZoneV2(),
  });

  const [companyForm, setCompanyForm] = React.useState<Record<string, any>>({});
  const [selectedTimeZone, setSelectedTimeZone] = React.useState<string>("");
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [stampUploading, setStampUploading] = React.useState(false);

  React.useEffect(() => {
    if (companySettings) setCompanyForm(companySettings);
  }, [companySettings]);

  React.useEffect(() => {
    if (timeZoneData?.time_zone) setSelectedTimeZone(timeZoneData.time_zone);
  }, [timeZoneData]);

  const saveCompanyMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return await updateCompanySettingsV2(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success("Company Settings Saved", {
        description: "Official identity and banking credentials updated successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Save Failed", {
        description: formatCleanErrorMessage(err) || "Failed to update company settings.",
      });
    },
  });

  const tzMutation = useMutation({
    mutationFn: async (tz: string) => setTimeZoneV2(tz),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server_time_zone"] });
      toast.success("Time Zone Updated");
    },
    onError: (err: any) => {
      toast.error("Time Zone Update Failed", {
        description: formatCleanErrorMessage(err) || "Failed to set server time zone.",
      });
    },
  });

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "stamp") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File Too Large", { description: "Images must be 20 MB or smaller." });
      return;
    }

    if (kind === "logo") setLogoUploading(true);
    else setStampUploading(true);

    try {
      await setCompanyImageV2(file, kind);
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success(`${kind === "logo" ? "Logo" : "Stamp"} Uploaded`);
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

  // ==========================================
  // SECTION 2: Cloudflare R2 Storage (Admin)
  // ==========================================
  const {
    data: storageSettings,
    isLoading: isLoadingStorage,
    refetch: refetchStorage,
  } = useQuery({
    queryKey: ["v2_storage_settings"],
    queryFn: () => getStorageSettingsV2(),
    enabled: isAdmin && settingsTab === "storage",
  });

  const [storageForm, setStorageForm] = React.useState<{
    r2_account_id: string;
    r2_bucket_name: string;
    r2_public_url_base: string;
    r2_access_key_id: string;
    r2_secret_access_key: string;
  }>({
    r2_account_id: "",
    r2_bucket_name: "",
    r2_public_url_base: "",
    r2_access_key_id: "",
    r2_secret_access_key: "",
  });

  const [testResult, setTestResult] = React.useState<V2StorageConnectionStatus | null>(null);
  const [isTestingStorage, setIsTestingStorage] = React.useState(false);

  React.useEffect(() => {
    if (storageSettings) {
      setStorageForm({
        r2_account_id: storageSettings.r2_account_id || "",
        r2_bucket_name: storageSettings.r2_bucket_name || "",
        r2_public_url_base: storageSettings.r2_public_url_base || "",
        r2_access_key_id: storageSettings.r2_access_key_id || "",
        r2_secret_access_key: "",
      });
    }
  }, [storageSettings]);

  const saveStorageMutation = useMutation({
    mutationFn: async () => {
      if (storageForm.r2_public_url_base && !storageForm.r2_public_url_base.startsWith("https://")) {
        throw new Error("Public URL Base must begin with https://");
      }
      const payload: any = {
        r2_account_id: storageForm.r2_account_id,
        r2_bucket_name: storageForm.r2_bucket_name,
        r2_public_url_base: storageForm.r2_public_url_base,
        r2_access_key_id: storageForm.r2_access_key_id,
      };
      if (storageForm.r2_secret_access_key && storageForm.r2_secret_access_key.trim()) {
        payload.r2_secret_access_key = storageForm.r2_secret_access_key.trim();
      }
      return await updateStorageSettingsV2(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2_storage_settings"] });
      toast.success("Storage Settings Saved", {
        description: "Cloudflare R2 configuration updated successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Storage Update Failed", {
        description: formatCleanErrorMessage(err) || "Failed to save R2 storage settings.",
      });
    },
  });

  const handleTestStorage = async () => {
    setIsTestingStorage(true);
    setTestResult(null);
    try {
      const res = await testStorageConnectionV2();
      setTestResult(res);
      if (res.status === "success") {
        toast.success("Connection Successful", { description: res.message });
      } else {
        toast.error("Connection Check Failed", { description: res.message });
      }
    } catch (err: any) {
      const msg = formatCleanErrorMessage(err) || "Storage engine test call failed.";
      setTestResult({ status: "error", message: msg });
      toast.error("Connection Error", { description: msg });
    } finally {
      setIsTestingStorage(false);
    }
  };

  // ==========================================
  // SECTION 3: Exchange Rates & Money Settings
  // ==========================================
  const canManageExchange = isAdmin || isFinanceManager;
  const {
    data: fxSettings,
    isLoading: isLoadingFx,
    refetch: refetchFx,
  } = useQuery({
    queryKey: ["v2_exchange_rate_settings"],
    queryFn: () => getExchangeRateSettingsV2(),
    enabled: canManageExchange && settingsTab === "exchange",
  });

  const { data: moneySettings } = useQuery({
    queryKey: ["v2_money_settings"],
    queryFn: () => getMoneySettingsV2(),
    enabled: canManageExchange && settingsTab === "exchange",
  });

  const [convertToBirr, setConvertToBirr] = React.useState(false);
  const [fxMode, setFxMode] = React.useState<"Global" | "Custom">("Global");
  const [fetchInterval, setFetchInterval] = React.useState("Daily");
  const [customCurrency, setCustomCurrency] = React.useState<"SAR" | "KWD" | "USD" | "AED" | "QAR">("SAR");
  const [customRate, setCustomRate] = React.useState<number | "">("");
  const [isFetchingFxNow, setIsFetchingFxNow] = React.useState(false);
  const [isSavingCustomRate, setIsSavingCustomRate] = React.useState(false);

  React.useEffect(() => {
    if (fxSettings) {
      setConvertToBirr(Boolean(fxSettings.convert_to_birr));
      setFxMode((fxSettings.mode as any) || "Global");
      setFetchInterval(fxSettings.fetch_interval || "Daily");
    }
  }, [fxSettings]);

  const saveFxMutation = useMutation({
    mutationFn: async () => {
      return await updateExchangeRateSettingsV2({
        convert_to_birr: convertToBirr,
        mode: fxMode,
        fetch_interval: fetchInterval,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2_exchange_rate_settings"] });
      queryClient.invalidateQueries({ queryKey: ["v2_money_settings"] });
      toast.success("Exchange Settings Saved");
    },
    onError: (err: any) => {
      toast.error("Save Failed", {
        description: formatCleanErrorMessage(err) || "Failed to update exchange rate settings.",
      });
    },
  });

  const handleFetchFxNow = async () => {
    setIsFetchingFxNow(true);
    try {
      const res = await fetchFxRatesNowV2();
      toast.success("Rates Fetched", {
        description: `Successfully fetched ${res.count || Object.keys(res.recorded || {}).length} currency rates.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_exchange_rate_settings"] });
    } catch (err: any) {
      toast.error("Fetch Failed", {
        description: formatCleanErrorMessage(err) || "Failed to fetch live FX rates.",
      });
    } finally {
      setIsFetchingFxNow(false);
    }
  };

  const handleSetCustomRate = async () => {
    if (customRate === "" || Number(customRate) <= 0) {
      toast.error("Invalid Rate", { description: "Please enter a valid positive exchange rate." });
      return;
    }
    setIsSavingCustomRate(true);
    try {
      await setFxRateV2(customCurrency, Number(customRate));
      toast.success(`Rate Saved`, {
        description: `1 ${customCurrency} = ${customRate} ETB recorded.`,
      });
      setCustomRate("");
      queryClient.invalidateQueries({ queryKey: ["v2_exchange_rate_settings"] });
    } catch (err: any) {
      toast.error("Rate Save Failed", {
        description: formatCleanErrorMessage(err) || "Backend rejected rate update.",
      });
    } finally {
      setIsSavingCustomRate(false);
    }
  };

  // ==========================================
  // SECTION 4: Notifications (Admin)
  // ==========================================
  const {
    data: notifSettings,
    isLoading: isLoadingNotifs,
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ["v2_notification_settings"],
    queryFn: () => getNotificationSettingsV2(),
    enabled: isAdmin && settingsTab === "notifications",
  });

  const [notifForm, setNotifForm] = React.useState<{
    vapid_claims_email: string;
    whatsapp_phone_number_id: string;
    whatsapp_access_token: string;
    contract_age_threshold_days: number;
  }>({
    vapid_claims_email: "",
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    contract_age_threshold_days: 7,
  });

  const [isRegeneratingVapid, setIsRegeneratingVapid] = React.useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = React.useState(false);
  const [isVapidWarningOpen, setIsVapidWarningOpen] = React.useState(false);

  React.useEffect(() => {
    if (notifSettings) {
      setNotifForm({
        vapid_claims_email: notifSettings.vapid_claims_email || "",
        whatsapp_phone_number_id: notifSettings.whatsapp_phone_number_id || "",
        whatsapp_access_token: "",
        contract_age_threshold_days: notifSettings.contract_age_threshold_days || 7,
      });
    }
  }, [notifSettings]);

  const saveNotifMutation = useMutation({
    mutationFn: async () => {
      if (notifForm.contract_age_threshold_days < 1) {
        throw new Error("Contract age threshold must be at least 1 day.");
      }
      const payload: any = {
        vapid_claims_email: notifForm.vapid_claims_email,
        whatsapp_phone_number_id: notifForm.whatsapp_phone_number_id,
        contract_age_threshold_days: notifForm.contract_age_threshold_days,
      };
      if (notifForm.whatsapp_access_token && notifForm.whatsapp_access_token.trim()) {
        payload.whatsapp_access_token = notifForm.whatsapp_access_token.trim();
      }
      return await updateNotificationSettingsV2(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2_notification_settings"] });
      toast.success("Notification Settings Saved");
    },
    onError: (err: any) => {
      toast.error("Save Failed", {
        description: formatCleanErrorMessage(err) || "Failed to update notification settings.",
      });
    },
  });

  const handleRegenerateVapid = async () => {
    setIsRegeneratingVapid(true);
    setIsVapidWarningOpen(false);
    try {
      const res = await regenerateVapidKeysV2();
      toast.success("VAPID Keys Regenerated", {
        description: res.message || "New web push keypair generated. Browsers must resubscribe.",
      });
      queryClient.invalidateQueries({ queryKey: ["v2_notification_settings"] });
    } catch (err: any) {
      toast.error("Regeneration Failed", {
        description: formatCleanErrorMessage(err) || "Failed to regenerate VAPID keys.",
      });
    } finally {
      setIsRegeneratingVapid(false);
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingTestPush(true);
    try {
      const res = await sendTestPushV2();
      toast.success("Test Push Dispatched", {
        description: res.error || `Test notification dispatched (status: ${res.status}).`,
      });
    } catch (err: any) {
      toast.error("Test Push Failed", {
        description: formatCleanErrorMessage(err) || "Failed to dispatch test push.",
      });
    } finally {
      setIsSendingTestPush(false);
    }
  };

  // ==========================================
  // SECTION 5: Corridor Fees (Manager & Admin)
  // ==========================================
  const canManageCorridors = isAdmin || isManager;
  const canViewCorridors = canManageCorridors || isFinanceManager;
  const {
    data: corridors = [],
    isLoading: isLoadingCorridors,
    refetch: refetchCorridors,
  } = useQuery({
    queryKey: ["v2_corridors_settings"],
    queryFn: () => listCorridorsV2(),
    enabled: canViewCorridors && settingsTab === "corridors",
  });

  const [selectedCorridorCountry, setSelectedCorridorCountry] = React.useState<string>("Saudi Arabia");
  const [activeCorridorFees, setActiveCorridorFees] = React.useState<V2CorridorFeeItem[]>([]);

  const activeCorridor = React.useMemo(() => {
    return corridors.find((c) => c.destination_country === selectedCorridorCountry) || corridors[0];
  }, [corridors, selectedCorridorCountry]);

  React.useEffect(() => {
    if (activeCorridor?.fees) {
      setActiveCorridorFees([...activeCorridor.fees]);
    } else {
      setActiveCorridorFees([]);
    }
  }, [activeCorridor]);

  const saveCorridorFeesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCorridorCountry) return;
      return await updateCorridorFeesV2(selectedCorridorCountry, activeCorridorFees);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2_corridors_settings"] });
      toast.success("Corridor Fee Schedule Saved", {
        description: `Fee schedule for ${selectedCorridorCountry} updated successfully.`,
      });
    },
    onError: (err: any) => {
      toast.error("Fee Schedule Save Failed", {
        description: formatCleanErrorMessage(err) || "Failed to update corridor fee schedule.",
      });
    },
  });

  const handleAddCorridorFeeRow = () => {
    const defaultStep = activeCorridor?.steps?.[0]?.step_type || "Wakala";
    const defaultFeeType = activeCorridor?.allowed_fee_types?.[0] || "Agency Fee";
    const defaultCurrency = activeCorridor?.allowed_currencies?.[0] || "ETB";
    setActiveCorridorFees((prev) => [
      ...prev,
      {
        fee_type: defaultFeeType,
        step_type: defaultStep,
        amount: 0,
        currency: defaultCurrency,
      },
    ]);
  };

  const handleRemoveCorridorFeeRow = (idx: number) => {
    setActiveCorridorFees((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateCorridorFeeRow = (idx: number, updates: Partial<V2CorridorFeeItem>) => {
    setActiveCorridorFees((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Agency Settings & System Configuration
              </h1>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Configure corporate identity, Cloudflare storage, currency exchange rates, push notifications, and corridor fee schedules.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 w-fit overflow-x-auto max-w-full">
        {canManageCompany && (
          <button
            type="button"
            onClick={() => setSettingsTab("company")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
              settingsTab === "company"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Company & Invoice</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setSettingsTab("storage")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
              settingsTab === "storage"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <HardDrive className="h-3.5 w-3.5 text-blue-600" />
            <span>Cloudflare R2</span>
          </button>
        )}

        {canManageExchange && (
          <button
            type="button"
            onClick={() => setSettingsTab("exchange")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
              settingsTab === "exchange"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <Coins className="h-3.5 w-3.5 text-amber-600" />
            <span>Exchange Rates</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setSettingsTab("notifications")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
              settingsTab === "notifications"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <Bell className="h-3.5 w-3.5 text-purple-600" />
            <span>Notifications</span>
          </button>
        )}

        {canViewCorridors && (
          <button
            type="button"
            onClick={() => setSettingsTab("corridors")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
              settingsTab === "corridors"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Corridor Fees</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSettingsTab("employees")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
            settingsTab === "employees"
              ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <Users className="h-3.5 w-3.5 text-indigo-600" />
          <span>Employees & Roles</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsTab("agencies")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
            settingsTab === "agencies"
              ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <Globe className="h-3.5 w-3.5 text-teal-600" />
          <span>Foreign Agencies</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: COMPANY & INVOICE SETTINGS
          ========================================== */}
      {settingsTab === "company" && canManageCompany && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Company Identity & Official Details
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Printed on official invoices, clearance summaries, and PDF reports.
                  </CardDescription>
                </div>
                {!isReadOnlyUser && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveCompanyMutation.isPending}
                    onClick={() => saveCompanyMutation.mutate(companyForm)}
                    className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                  >
                    {saveCompanyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save Company Details
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Agency Name *</Label>
                <Input
                  value={companyForm.agency_name || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, agency_name: e.target.value })}
                  placeholder="e.g. Al Rawnaq Travel Agency"
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={companyForm.agency_phone || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, agency_phone: e.target.value })}
                  placeholder="+251 11 123 4567"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Official Email</Label>
                <Input
                  value={companyForm.agency_email || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, agency_email: e.target.value })}
                  placeholder="info@agency.com"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs font-semibold">Physical Address</Label>
                <Input
                  value={companyForm.agency_address || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, agency_address: e.target.value })}
                  placeholder="Bole Sub-City, Addis Ababa, Ethiopia"
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Banking Details */}
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Issuing Agency Banking Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank Name</Label>
                <Input
                  value={companyForm.bank_name || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, bank_name: e.target.value })}
                  placeholder="Commercial Bank of Ethiopia"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Account Name</Label>
                <Input
                  value={companyForm.account_name || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, account_name: e.target.value })}
                  placeholder="Agency Corporate Account"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Account Number</Label>
                <Input
                  value={companyForm.account_number || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, account_number: e.target.value })}
                  placeholder="1000123456789"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">SWIFT Code</Label>
                <Input
                  value={companyForm.swift_code || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, swift_code: e.target.value })}
                  placeholder="CBETETAA"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank Phone</Label>
                <Input
                  value={companyForm.bank_phone || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, bank_phone: e.target.value })}
                  placeholder="+251 11 551 5004"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank Email</Label>
                <Input
                  value={companyForm.bank_email || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, bank_email: e.target.value })}
                  placeholder="cbe@cbe.com.et"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs font-semibold">Bank Branch Address</Label>
                <Input
                  value={companyForm.bank_address || ""}
                  onChange={(e) => setCompanyForm({ ...companyForm, bank_address: e.target.value })}
                  placeholder="Main Branch, Churchill Avenue, Addis Ababa"
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo & Stamp Graphics */}
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                Official Logo & Seal Stamp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Agency Logo</span>
                  {companySettings?.logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage("logo")}
                      className="h-6 text-[11px] text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                {companySettings?.logo ? (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-700 flex items-center justify-center h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={companySettings.logo} alt="Agency Logo" className="max-h-24 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-28 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded flex items-center justify-center text-xs text-slate-400">
                    No logo uploaded
                  </div>
                )}
                {!isReadOnlyUser && (
                  <label className="block">
                    <span className="sr-only">Upload logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleUploadImage(e, "logo")}
                      disabled={logoUploading}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </label>
                )}
              </div>

              {/* Stamp */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Official Seal Stamp</span>
                  {companySettings?.stamp_image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage("stamp")}
                      className="h-6 text-[11px] text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                {companySettings?.stamp_image ? (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-700 flex items-center justify-center h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={companySettings.stamp_image} alt="Official Stamp" className="max-h-24 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-28 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded flex items-center justify-center text-xs text-slate-400">
                    No stamp uploaded
                  </div>
                )}
                {!isReadOnlyUser && (
                  <label className="block">
                    <span className="sr-only">Upload stamp</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleUploadImage(e, "stamp")}
                      disabled={stampUploading}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==========================================
          TAB 2: CLOUDFLARE R2 STORAGE (Admin Only)
          ========================================== */}
      {settingsTab === "storage" && isAdmin && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <HardDrive className="h-4 w-4 text-blue-600" />
                      Cloudflare R2 Object Storage
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        storageSettings?.configured
                          ? "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"
                      )}
                    >
                      {storageSettings?.configured ? "Configured" : "Not Fully Configured"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    S3-compatible bucket for secure direct uploads (passports, photos, contracts, candidate videos).
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTestingStorage}
                    onClick={handleTestStorage}
                    className="h-8 text-xs border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-300 hover:bg-blue-50"
                  >
                    {isTestingStorage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveStorageMutation.isPending}
                    onClick={() => saveStorageMutation.mutate()}
                    className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                  >
                    {saveStorageMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Save Storage Settings
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {testResult && (
                <div
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-xs font-semibold border",
                    testResult.status === "success"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                  )}
                >
                  {testResult.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>
                    Status: <strong>{testResult.status}</strong> — {testResult.message}
                    {testResult.bucket && ` (Bucket: ${testResult.bucket})`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">R2 Account ID</Label>
                  <Input
                    value={storageForm.r2_account_id}
                    onChange={(e) => setStorageForm({ ...storageForm, r2_account_id: e.target.value.trim() })}
                    placeholder="e.g. 5a1b2c3d4e5f..."
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Found on the Cloudflare Dashboard &gt; R2 Overview page.</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">R2 Bucket Name</Label>
                  <Input
                    value={storageForm.r2_bucket_name}
                    onChange={(e) => setStorageForm({ ...storageForm, r2_bucket_name: e.target.value.trim() })}
                    placeholder="e.g. travel-agency-documents"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Public URL Base (must begin with https://)</Label>
                  <Input
                    value={storageForm.r2_public_url_base}
                    onChange={(e) => setStorageForm({ ...storageForm, r2_public_url_base: e.target.value.trim() })}
                    placeholder="https://pub-abc123xyz.r2.dev"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">R2 Access Key ID</Label>
                  <Input
                    value={storageForm.r2_access_key_id}
                    onChange={(e) => setStorageForm({ ...storageForm, r2_access_key_id: e.target.value.trim() })}
                    placeholder="e.g. 8f7e6d5c4b3a..."
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">R2 Secret Access Key</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {storageSettings?.secret_key_set ? "Secret Key Set" : "Not Set"}
                    </Badge>
                  </div>
                  <Input
                    type="password"
                    value={storageForm.r2_secret_access_key}
                    onChange={(e) => setStorageForm({ ...storageForm, r2_secret_access_key: e.target.value })}
                    placeholder={storageSettings?.secret_key_set ? "•••••••••••• (Leave blank to keep current secret)" : "Enter R2 Secret Access Key"}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Cloudflare R2 Setup Instructions
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  1. Log into your Cloudflare Dashboard &rarr; <strong>R2</strong> &rarr; <strong>Manage R2 API Tokens</strong>.<br />
                  2. Create an API token with <strong>Object Read &amp; Write</strong> permissions.<br />
                  3. Copy your Account ID, Access Key ID, and Secret Access Key into the fields above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==========================================
          TAB 3: EXCHANGE RATES & CURRENCIES
          ========================================== */}
      {settingsTab === "exchange" && canManageExchange && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Coins className="h-4 w-4 text-amber-600" />
                    Currency Conversion & Exchange Rate Configuration
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Controls whether foreign currencies (SAR, USD, KWD, AED, QAR) are converted to Ethiopian Birr (ETB).
                  </CardDescription>
                </div>
                {!isReadOnlyUser && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveFxMutation.isPending}
                    onClick={() => saveFxMutation.mutate()}
                    className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                  >
                    {saveFxMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save Exchange Settings
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              {/* Birr Conversion Toggle */}
              <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Enable Conversion to Ethiopian Birr (ETB)
                    <Badge variant="outline" className={cn("text-[10px]", convertToBirr ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-600")}>
                      {convertToBirr ? "Enabled" : "Disabled (Native Currencies)"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    When disabled, all financial transactions, invoices, and ledger amounts are recorded and displayed in their native transaction currencies (SAR, USD, KWD, etc.).
                  </p>
                </div>
                {!isReadOnlyUser && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={convertToBirr}
                      onChange={(e) => {
                        const nextVal = e.target.checked;
                        if (nextVal) {
                          toast.warning("Conversion to Birr Enabled", {
                            description: "New amounts will require exchange rates. Please ensure today's rates are configured.",
                          });
                        }
                        setConvertToBirr(nextVal);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                  </label>
                )}
              </div>

              {/* When conversion is OFF */}
              {!convertToBirr && (
                <div className="p-4 bg-slate-50 dark:bg-zinc-800/20 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-600 dark:text-zinc-400 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-slate-400" />
                    Native Currency Mode Active
                  </div>
                  <p className="text-[11px]">
                    According to <code>finance_api.get_money_settings()</code>, amounts are displayed in their own currencies. Rate setting and fetching actions are disabled because the backend refuses exchange rate alterations when conversion is inactive.
                  </p>
                </div>
              )}

              {/* When conversion is ON */}
              {convertToBirr && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">FX Update Mode</Label>
                      <select
                        value={fxMode}
                        onChange={(e) => setFxMode(e.target.value as any)}
                        className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                      >
                        <option value="Global">Global (Automated Fetching)</option>
                        <option value="Custom">Custom (Manual Staff Rate Setting)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Fetch Interval</Label>
                      <select
                        value={fetchInterval}
                        onChange={(e) => setFetchInterval(e.target.value)}
                        className="w-full h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-medium"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Hourly">Hourly</option>
                        <option value="Manual">Manual Only</option>
                      </select>
                    </div>
                  </div>

                  {fxMode === "Global" && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Fetch Live Global Rates</div>
                        <div className="text-[11px] text-slate-500">
                          Last fetched at: <strong>{fxSettings?.last_fetched_at || "Never"}</strong>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isFetchingFxNow || isReadOnlyUser}
                        onClick={handleFetchFxNow}
                        className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                      >
                        {isFetchingFxNow ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                        Fetch FX Rates Now
                      </Button>
                    </div>
                  )}

                  {fxMode === "Custom" && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-3">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Set Custom Exchange Rate to Birr</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={customCurrency}
                          onChange={(e) => setCustomCurrency(e.target.value as any)}
                          className="h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2 font-semibold"
                        >
                          <option value="SAR">SAR (Saudi Riyal)</option>
                          <option value="USD">USD (US Dollar)</option>
                          <option value="KWD">KWD (Kuwaiti Dinar)</option>
                          <option value="AED">AED (UAE Dirham)</option>
                          <option value="QAR">QAR (Qatari Riyal)</option>
                        </select>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="Rate to Birr (e.g. 32.50)"
                          value={customRate}
                          onChange={(e) => setCustomRate(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs w-48 font-bold"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSavingCustomRate || isReadOnlyUser}
                          onClick={handleSetCustomRate}
                          className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                        >
                          {isSavingCustomRate ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                          Record Rate
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==========================================
          TAB 4: NOTIFICATIONS & WEB PUSH (Admin)
          ========================================== */}
      {settingsTab === "notifications" && isAdmin && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Bell className="h-4 w-4 text-purple-600" />
                    Web Push & WhatsApp Notification Settings
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configure VAPID web push keys for operational staff and WhatsApp gateway for foreign agency alerts.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSendingTestPush}
                    onClick={handleSendTestPush}
                    className="h-8 text-xs border-purple-300 text-purple-800 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50"
                  >
                    {isSendingTestPush ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    Send Test Push
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveNotifMutation.isPending}
                    onClick={() => saveNotifMutation.mutate()}
                    className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                  >
                    {saveNotifMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save Notification Settings
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold">Active VAPID Public Key</Label>
                  <Input
                    readOnly
                    value={notifSettings?.vapid_public_key || "Loading..."}
                    className="h-8 text-xs font-mono bg-slate-50 dark:bg-zinc-800/50 cursor-text"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">VAPID Claims Contact Email</Label>
                  <Input
                    type="email"
                    value={notifForm.vapid_claims_email}
                    onChange={(e) => setNotifForm({ ...notifForm, vapid_claims_email: e.target.value })}
                    placeholder="admin@agency.com"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contract Age Alert Threshold (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={notifForm.contract_age_threshold_days}
                    onChange={(e) => setNotifForm({ ...notifForm, contract_age_threshold_days: parseInt(e.target.value, 10) || 1 })}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">Alerts staff when a contract exceeds this age without clearance progression.</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WhatsApp Phone Number ID</Label>
                  <Input
                    value={notifForm.whatsapp_phone_number_id}
                    onChange={(e) => setNotifForm({ ...notifForm, whatsapp_phone_number_id: e.target.value.trim() })}
                    placeholder="e.g. 109876543210"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">WhatsApp Access Token</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {notifSettings?.whatsapp_token_set ? "Token Configured" : "Not Set"}
                    </Badge>
                  </div>
                  <Input
                    type="password"
                    value={notifForm.whatsapp_access_token}
                    onChange={(e) => setNotifForm({ ...notifForm, whatsapp_access_token: e.target.value })}
                    placeholder={notifSettings?.whatsapp_token_set ? "•••••••••••• (Leave blank to keep current token)" : "Enter WhatsApp token"}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* VAPID Regeneration Danger Zone */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    Regenerate VAPID Push Keypair
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    Warning: Regenerating VAPID keys will invalidate all existing browser push subscriptions. Staff will need to resubscribe.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRegeneratingVapid}
                  onClick={() => setIsVapidWarningOpen(true)}
                  className="h-8 text-xs border-amber-400 text-amber-900 dark:border-amber-700 dark:text-amber-200 hover:bg-amber-100"
                >
                  Regenerate Keys
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* VAPID Key Regeneration Confirmation Dialog */}
          <Dialog open={isVapidWarningOpen} onOpenChange={setIsVapidWarningOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Confirm VAPID Key Regeneration
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This will generate a brand new public/private keypair for web push notifications. Every active browser session across all staff members will be disconnected and prompted to enable push notifications again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsVapidWarningOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRegenerateVapid}
                  className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                >
                  Yes, Regenerate Keypair
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ==========================================
          TAB 5: CORRIDOR FEES (Manager & Admin)
          ========================================== */}
      {settingsTab === "corridors" && canViewCorridors && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Corridor Fee Schedules & Workflow Steps
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configured corridor fees are automatically posted as Expenses to the worker&apos;s case when the respective step completes.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCorridorCountry}
                    onChange={(e) => setSelectedCorridorCountry(e.target.value)}
                    className="h-8 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md px-2.5 font-bold"
                  >
                    {corridors.map((c) => (
                      <option key={c.destination_country} value={c.destination_country}>
                        {c.destination_country}
                      </option>
                    ))}
                  </select>

                  {canManageCorridors && !isReadOnlyUser && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={saveCorridorFeesMutation.isPending}
                      onClick={() => saveCorridorFeesMutation.mutate()}
                      className="h-8 text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                    >
                      {saveCorridorFeesMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Save Fee Schedule
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              {/* Ordered Steps Notice (Read-only sequence) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Authoritative Corridor Steps for {selectedCorridorCountry} (Fixed Sequence)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {activeCorridor?.steps?.map((st, i) => (
                    <Badge
                      key={st.step_type || i}
                      variant="outline"
                      className="text-xs py-1 px-2.5 bg-slate-50 dark:bg-zinc-800/40 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                    >
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 mr-1.5">#{i + 1}</span>
                      {st.title || st.step_type}
                    </Badge>
                  )) || <p className="text-xs text-slate-400 italic">No steps loaded for this corridor.</p>}
                </div>
              </div>

              {/* Editable Fee Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-900 dark:text-white">
                    Auto-Expense Fee Schedule ({selectedCorridorCountry})
                  </Label>
                  {canManageCorridors && !isReadOnlyUser && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCorridorFeeRow}
                      className="h-7 text-xs border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Fee Row
                    </Button>
                  )}
                </div>

                {activeCorridorFees.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No automated fees configured for {selectedCorridorCountry}. Click &ldquo;Add Fee Row&rdquo; to define step expenses.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-zinc-800/60 font-semibold text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">Fee Type</th>
                          <th className="py-2 px-3">Triggering Clearance Step</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Currency</th>
                          {canManageCorridors && !isReadOnlyUser && <th className="py-2 px-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {activeCorridorFees.map((fee, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3">
                              <select
                                value={fee.fee_type}
                                disabled={!canManageCorridors || isReadOnlyUser}
                                onChange={(e) => handleUpdateCorridorFeeRow(idx, { fee_type: e.target.value })}
                                className="h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5"
                              >
                                {activeCorridor?.allowed_fee_types?.map((ft) => (
                                  <option key={ft} value={ft}>
                                    {ft}
                                  </option>
                                )) || (
                                  <>
                                    <option value="Registration Fee">Registration Fee</option>
                                    <option value="Medical Fee">Medical Fee</option>
                                    <option value="Wakala Fee">Wakala Fee</option>
                                    <option value="Injaz Fee">Injaz Fee</option>
                                    <option value="Embassy Fee">Embassy Fee</option>
                                    <option value="Fingerprint Fee">Fingerprint Fee</option>
                                    <option value="Ticket Fee">Ticket Fee</option>
                                  </>
                                )}
                              </select>
                            </td>

                            <td className="py-2 px-3">
                              <select
                                value={fee.step_type}
                                disabled={!canManageCorridors || isReadOnlyUser}
                                onChange={(e) => handleUpdateCorridorFeeRow(idx, { step_type: e.target.value })}
                                className="h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5 font-medium"
                              >
                                {activeCorridor?.steps?.map((st) => (
                                  <option key={st.step_type} value={st.step_type}>
                                    {st.title || st.step_type}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                disabled={!canManageCorridors || isReadOnlyUser}
                                value={fee.amount || ""}
                                onChange={(e) => handleUpdateCorridorFeeRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                                className="h-7 text-xs w-32 font-bold"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <select
                                value={fee.currency}
                                disabled={!canManageCorridors || isReadOnlyUser}
                                onChange={(e) => handleUpdateCorridorFeeRow(idx, { currency: e.target.value })}
                                className="h-7 text-xs border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded px-1.5"
                              >
                                <option value="ETB">ETB</option>
                                <option value="SAR">SAR</option>
                                <option value="USD">USD</option>
                              </select>
                            </td>

                            {canManageCorridors && !isReadOnlyUser && (
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCorridorFeeRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==========================================
          TAB 6: EMPLOYEES & ACCESS (Shortcut card)
          ========================================== */}
      {settingsTab === "employees" && (
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="h-4 w-4 text-indigo-600" />
              Employee Accounts & RBAC Security Roles
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Staff accounts, 16 authoritative roles, read-only twins, and password management are handled natively on the Employees page.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Manage user activation, password resets, role toggles, and new staff onboarding. The system ensures the first Administrator account is protected and destructive operations are validated against backend RBAC rules.
            </p>
            <Link href="/employees">
              <Button size="sm" className="h-8 text-xs bg-indigo-900 hover:bg-indigo-950 text-white font-semibold">
                Open Employee Administration Portal
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ==========================================
          TAB 7: FOREIGN AGENCIES (Shortcut card)
          ========================================== */}
      {settingsTab === "agencies" && (
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Globe className="h-4 w-4 text-teal-600" />
              Foreign Agencies & Commission Rate Matrices
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Register foreign agencies, assign portal users, and configure default destination commission rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Agency records require a valid destination country. Rates are configured by destination, track, gender, rate, and currency without silent defaults.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/contractors">
                <Button size="sm" className="h-8 text-xs bg-teal-900 hover:bg-teal-950 text-white font-semibold">
                  Manage Foreign Agencies
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/commission">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  View Commission Batches
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
