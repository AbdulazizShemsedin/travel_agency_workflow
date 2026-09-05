"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Database,
  RefreshCw,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { isPureForeignAgency } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getComplianceNotificationsV2,
  getForeignAgencyNotificationsV2,
  getPushSubscriptionStatusV2,
  subscribeToPushV2,
  getVapidPublicKeyV2,
  regenerateVapidKeysV2,
  V2AppNotification,
} from "@/lib/api/v2/notifications";
import {
  testStorageConnectionV2,
  V2StorageConnectionStatus,
} from "@/lib/api/v2/storage";
import { useAuth } from "@/components/providers/AuthProvider";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const queryClient = useQueryClient();
  const { user, roles, authUser, agencyContext } = useAuth();
  const [isPushEnabled, setIsPushEnabled] = React.useState<boolean>(false);
  const [isSupported, setIsSupported] = React.useState<boolean>(true);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
  const [modalAction, setModalAction] = React.useState<"enable" | "disable">("enable");
  const [toastFeedback, setToastFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Foreign Agency Isolation Check
  const isForeignAgency = React.useMemo(() => {
    return isPureForeignAgency(authUser);
  }, [authUser]);

  // Admin Diagnostics States
  const [isRegenVapidModalOpen, setIsRegenVapidModalOpen] = React.useState<boolean>(false);
  const [isRegeneratingVapid, setIsRegeneratingVapid] = React.useState<boolean>(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = React.useState<boolean>(false);
  const [isTestingStorage, setIsTestingStorage] = React.useState<boolean>(false);
  const [storageStatus, setStorageStatus] = React.useState<V2StorageConnectionStatus | null>(null);

  // Check if caller is System Manager or Administrator
  const isSystemManagerOrAdmin = React.useMemo(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return norm === "system manager" || norm === "administrator" || norm === "admin";
    });
  }, [authUser, roles]);

  // Fetch in-app notifications (isolated for foreign agencies vs internal staff)
  const { data: notifications = [] } = useQuery<V2AppNotification[]>({
    queryKey: ["notifications", isForeignAgency ? "agency" : "internal", user],
    queryFn: () => (isForeignAgency ? getForeignAgencyNotificationsV2() : getComplianceNotificationsV2()),
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  // Fetch authoritative backend subscription status
  const { data: serverPushStatus } = useQuery({
    queryKey: ["push_subscription_status", user],
    queryFn: getPushSubscriptionStatusV2,
    enabled: Boolean(user),
    staleTime: 15000,
  });

  React.useEffect(() => {
    if (serverPushStatus && typeof serverPushStatus.subscribed === "boolean") {
      setIsPushEnabled(serverPushStatus.subscribed);
      localStorage.setItem("push_notifications_enabled", String(serverPushStatus.subscribed));
    }
  }, [serverPushStatus]);

  // 1. Check browser support and current subscription status on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setIsSupported(false);
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        const storedPref = localStorage.getItem("push_notifications_enabled");
        const permission = Notification.permission;

        if (permission === "granted" && storedPref !== "false") {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              setIsPushEnabled(true);
              localStorage.setItem("push_notifications_enabled", "true");
              return;
            }
          }
        }

        if (storedPref === "true" && permission === "granted") {
          setIsPushEnabled(true);
        } else if (serverPushStatus && typeof serverPushStatus.subscribed === "boolean") {
          setIsPushEnabled(serverPushStatus.subscribed);
        } else {
          setIsPushEnabled(false);
        }
      } catch (err) {
        console.warn("Failed to check push subscription status:", err);
      }
    };

    checkSubscriptionStatus();
  }, [serverPushStatus]);

  // 2. Prompt user immediately upon login if push notifications are not enabled
  React.useEffect(() => {
    if (user && isSupported && !isPushEnabled) {
      const sessionKey = `push_prompt_shown_${user}`;
      const alreadyPrompted = sessionStorage.getItem(sessionKey);

      if (!alreadyPrompted) {
        sessionStorage.setItem(sessionKey, "true");
        const timer = setTimeout(() => {
          sonnerToast.warning("Push Notifications Disabled", {
            description: "Real-time desktop push alerts are currently disabled. Enable them to receive instant updates.",
            action: {
              label: "Enable Push",
              onClick: () => {
                setModalAction("enable");
                setIsModalOpen(true);
              },
            },
            duration: 9000,
          });
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user, isSupported, isPushEnabled]);

  // Real-time Watchdog Alert Dispatcher: Pushes native device notifications & alerts for all watchdogs
  React.useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    if (typeof window === "undefined") return;

    const seenKey = `watchdogs_notified_${user || "anon"}`;
    let seenNotifs: string[] = [];
    try {
      seenNotifs = JSON.parse(sessionStorage.getItem(seenKey) || "[]");
    } catch {
      seenNotifs = [];
    }

    const unnotifiedWatchdogs = notifications.filter(
      (n) =>
        (n.id.includes("watchdog") || n.id.includes("expiry") || n.id.includes("reminder") || n.severity === "urgent") &&
        !seenNotifs.includes(n.id)
    );

    if (unnotifiedWatchdogs.length === 0) return;

    unnotifiedWatchdogs.forEach((n) => {
      seenNotifs.push(n.id);

      // 1. Browser Native Push Notification (if permission granted)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(n.title, {
            body: n.description,
            icon: "/favicon.ico",
            tag: n.id,
          });
        } catch {
          // If constructor restricted, try service worker
          navigator.serviceWorker?.ready.then((reg) => {
            reg.showNotification(n.title, {
              body: n.description,
              icon: "/favicon.ico",
              tag: n.id,
            });
          }).catch(() => {});
        }
      }

      // 2. High-priority UI sonner toast
      if (n.severity === "urgent") {
        sonnerToast.error(n.title, {
          description: n.description,
          action: n.action_url
            ? {
                label: n.action_label || "View",
                onClick: () => {
                  window.location.href = n.action_url!;
                },
              }
            : undefined,
          duration: 9000,
        });
      } else if (n.severity === "warning") {
        sonnerToast.warning(n.title, {
          description: n.description,
          action: n.action_url
            ? {
                label: n.action_label || "View",
                onClick: () => {
                  window.location.href = n.action_url!;
                },
              }
            : undefined,
          duration: 7000,
        });
      }
    });

    try {
      sessionStorage.setItem(seenKey, JSON.stringify(seenNotifs));
    } catch {
      // ignore
    }
  }, [notifications, user]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    const cleanText = type === "error" ? formatCleanErrorMessage(text) : text;
    setToastFeedback({ text: cleanText, type });
    setTimeout(() => setToastFeedback(null), 4500);
  };

  const handleOpenPushModal = (action: "enable" | "disable") => {
    if (!isSupported) {
      showFeedback("Web Push is not supported in this browser.", "error");
      return;
    }
    setModalAction(action);
    setIsModalOpen(true);
    setIsPopoverOpen(false);
  };

  // 3. Enable Push Notifications
  const handleEnablePush = async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showFeedback("Notification permission was not granted by your browser.", "error");
        setIsLoading(false);
        setIsModalOpen(false);
        return;
      }

      // Fetch authoritative VAPID public key dynamically from backend (zero hardcoding)
      const vapidKey = await getVapidPublicKeyV2();

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });

      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");
      const p256dh = p256dhKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey))))
        : "";
      const auth = authKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey))))
        : "";

      await subscribeToPushV2(subscription.endpoint, p256dh, auth);
      queryClient.invalidateQueries({ queryKey: ["push_subscription_status"] });

      localStorage.setItem("push_notifications_enabled", "true");
      setIsPushEnabled(true);
      setIsModalOpen(false);

      showFeedback("✓ Desktop push notifications successfully enabled!");
      sonnerToast.success("Push Notifications Enabled", {
        description: "You will now receive instant desktop notifications for visas, clearances, and updates.",
      });

      if (reg && reg.showNotification) {
        reg.showNotification("Travel Agency Workflow Alert", {
          body: "Push notifications active! You will receive live alerts for candidate progress.",
          icon: "/favicon.ico",
        });
      }
    } catch (err: any) {
      console.error("Error enabling push notifications:", err);
      showFeedback(err?.message || "Failed to enable push notifications.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Disable Push Notifications
  const handleDisablePush = async () => {
    setIsLoading(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      }
      localStorage.setItem("push_notifications_enabled", "false");
      setIsPushEnabled(false);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["push_subscription_status"] });
      showFeedback("Desktop push notifications have been disabled.");
      sonnerToast.info("Push Notifications Disabled", {
        description: "You will no longer receive desktop OS notifications.",
      });
    } catch (err: any) {
      console.error("Error disabling push notifications:", err);
      showFeedback(err?.message || "Failed to disable push notifications.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Send Test Notification
  const handleSendTestPush = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Travel Agency Workflow Alert", {
          body: "Push notifications active! You will receive live alerts for candidate progress.",
          icon: "/favicon.ico",
        });
        showFeedback("Test notification dispatched to your device!");
      } else {
        showFeedback("Notification permission not granted.", "error");
      }
    } catch {
      showFeedback("Test notification sent.", "success");
    }
  };

  // 6. Admin: Regenerate VAPID Keys
  const handleRegenerateVapid = async () => {
    setIsRegeneratingVapid(true);
    try {
      await regenerateVapidKeysV2();
      sonnerToast.success("VAPID Keys Regenerated", {
        description: "Fresh keypair created on server. Existing client subscriptions invalidated.",
      });
      setIsPushEnabled(false);
      localStorage.removeItem("push_notifications_enabled");
      setIsRegenVapidModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showFeedback("VAPID keypair regenerated. Please re-subscribe.", "success");
    } catch (err: any) {
      sonnerToast.error("Regeneration Failed", {
        description: err?.message || "Failed to regenerate VAPID keypair on backend.",
      });
    } finally {
      setIsRegeneratingVapid(false);
    }
  };

  // 7. Admin: Test R2 Storage Connection
  const handleTestStorage = async () => {
    setIsTestingStorage(true);
    try {
      const res = await testStorageConnectionV2();
      setStorageStatus(res);
      if (res.status === "success") {
        sonnerToast.success("R2 Storage Connected", {
          description: res.message || `Bucket '${res.bucket}' verified read/write.`,
        });
      } else {
        sonnerToast.error("Storage Issue", {
          description: res.message || "Storage connection returned failure status.",
        });
      }
    } catch (err: any) {
      setStorageStatus({
        status: "error",
        message: err?.message || "Failed to reach storage connection endpoint.",
      });
      sonnerToast.error("Storage Test Failed", {
        description: err?.message || "Communication failure with storage engine.",
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

  const tooltipLabel = isPushEnabled
    ? "Notifications • Desktop Push: Active (Click to view & manage)"
    : "Notifications • Desktop Push: Disabled (Click to view & enable)";

  return (
    <>
      {/* Toast Feedback */}
      {toastFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3 duration-200 ${
            toastFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200"
          }`}
        >
          {toastFeedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toastFeedback.text}</span>
        </div>
      )}

      {/* Unified Single Notifications Popover Trigger */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              aria-label={tooltipLabel}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition cursor-pointer ${
                isPushEnabled
                  ? "border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50 dark:bg-[#141418] text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
              }`}
            >
              {isPushEnabled ? (
                <>
                  {/* Active Green Bell + Pulse Dot */}
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </>
              ) : (
                <>
                  {/* Inactive Red Slashed Bell */}
                  <BellOff className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                </>
              )}

              {/* In-App Unread Counter Badge */}
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Hover Tooltip showing Push status */}
            <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-zinc-800 text-white px-2.5 py-1 text-[11px] font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              {tooltipLabel}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-b-4 border-b-slate-900 dark:border-b-zinc-800" />
            </div>
          </div>
        </PopoverTrigger>

        {/* Notifications Popover Content */}
        <PopoverContent align="end" className="w-88 p-0 shadow-2xl border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215] rounded-xl overflow-hidden">
          {/* 1. Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] px-4 py-3 bg-slate-50/80 dark:bg-[#16161b]">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {isForeignAgency ? "Agency Alerts" : "Notifications"}
              </h4>
              <span className="rounded-full bg-slate-200 dark:bg-[#252530] px-2 py-0.2 text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                {notifications.length}
              </span>
            </div>
            {isForeignAgency ? (
              <Link
                href="/agent/wakala"
                onClick={() => setIsPopoverOpen(false)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View Wakala
              </Link>
            ) : (
              <Link
                href="/notifications"
                onClick={() => setIsPopoverOpen(false)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            )}
          </div>

          {/* 2. Desktop Push Notification Status Sub-Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/70 dark:bg-[#181820] border-b border-slate-200/80 dark:border-[#222227] text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              {isPushEnabled ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Desktop Push: Active
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Desktop Push: Disabled
                  </span>
                </>
              )}
            </div>

            {isPushEnabled ? (
              <button
                type="button"
                onClick={() => handleOpenPushModal("disable")}
                className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 underline cursor-pointer"
              >
                Turn Off
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenPushModal("enable")}
                className="px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 text-white text-[10px] font-bold transition shadow-2xs cursor-pointer"
              >
                Enable Push
              </button>
            )}
          </div>

          {/* 3. Notification List */}
          <div className="divide-y divide-slate-100 dark:divide-[#222227] text-xs max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 dark:text-zinc-500">
                No active operational alerts. Everything is up to date.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <Link
                  key={n.id}
                  href={n.action_url || "#"}
                  onClick={() => setIsPopoverOpen(false)}
                  className="block p-3 hover:bg-slate-50 dark:hover:bg-[#18181f] transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                      {n.title}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        n.severity === "urgent"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : n.severity === "warning"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                      }`}
                    >
                      {n.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                    {n.description}
                  </p>
                </Link>
              ))
            )}
          </div>

          {/* 4. Footer */}
          <div className="border-t border-slate-100 dark:border-[#222227] p-2.5 bg-slate-50/50 dark:bg-[#15151a] flex items-center justify-between">
            {!isForeignAgency ? (
              <Link
                href="/notifications"
                onClick={() => setIsPopoverOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              >
                <span>Notification Center</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Foreign Agency Portal
              </span>
            )}

            {/* Admin Diagnostics quick buttons */}
            {!isForeignAgency && isSystemManagerOrAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStorageModalOpen(true);
                    handleTestStorage();
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                  title="Test R2 object storage readiness"
                >
                  <Database className="h-3 w-3 text-emerald-500" />
                  <span>R2</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegenVapidModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  title="Regenerate VAPID push keys"
                >
                  <KeyRound className="h-3 w-3 text-amber-500" />
                  <span>VAPID</span>
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Push Notification Enable / Disable Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-[#121216] dark:border-[#26262f]">
          <DialogHeader>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {modalAction === "enable"
                  ? "Enable Desktop Push Notifications"
                  : "Disable Push Notifications"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Chrome & Device System Alerts
              </DialogDescription>
            </div>
          </DialogHeader>

          {modalAction === "enable" ? (
            <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed py-2">
              <p>
                Allowing push notifications enables Chrome to send real-time alerts directly to your PC or mobile device.
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-[#222227] bg-slate-50/80 dark:bg-[#16161b] p-3.5 space-y-1.5 text-xs">
                <div className="text-slate-800 dark:text-zinc-200 font-medium">
                  • Alerts for Embassy visas, complaints, and departure flight updates
                </div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium">
                  • Active in background even when the website or tab is closed
                </div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium">
                  • Can be turned off or configured at any time
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Click <strong>Allow & Enable</strong>, then select <strong>Allow</strong> in your browser prompt.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed py-2">
              <p>
                Are you sure you want to disable desktop push notifications on this device?
              </p>
              <p className="text-slate-500 dark:text-zinc-400">
                You will no longer receive immediate OS notifications when candidate statuses update or urgent complaints are logged. You can re-enable this at any time.
              </p>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
            {modalAction === "disable" && isPushEnabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendTestPush}
                className="text-xs rounded-xl border-slate-200 dark:border-[#26262f]"
              >
                <Send className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                Test Alert
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="rounded-xl border-slate-200 dark:border-[#26262f] text-xs"
              >
                Cancel
              </Button>

              {modalAction === "enable" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnablePush}
                  disabled={isLoading}
                  className="rounded-xl bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Allow & Enable Push"
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDisablePush}
                  disabled={isLoading}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable Notifications"
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* VAPID Keypair Regeneration Admin Dialog */}
      <Dialog open={isRegenVapidModalOpen} onOpenChange={setIsRegenVapidModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-[#121216] dark:border-[#26262f]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Regenerate VAPID Push Keys
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
              Regenerating the VAPID keypair generates a fresh cryptographic keypair on the backend server.
              <span className="block mt-2 font-semibold text-rose-600 dark:text-rose-400">
                Warning: This invalidates all active browser push subscriptions across all users. Every team member will need to re-enable push notifications on their devices.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRegenVapidModalOpen(false)}
              disabled={isRegeneratingVapid}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerateVapid}
              disabled={isRegeneratingVapid}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              {isRegeneratingVapid ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Confirm & Regenerate Keys"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R2 Storage Connection Test Dialog */}
      <Dialog open={isStorageModalOpen} onOpenChange={setIsStorageModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-[#121216] dark:border-[#26262f]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              R2 Object Storage Health
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Live read/write verification probe with Cloudflare R2 bucket.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-3.5 rounded-xl border border-slate-200 dark:border-[#26262f] bg-slate-50 dark:bg-[#16161c] space-y-2 text-xs">
            {isTestingStorage ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span>Testing R2 storage connectivity & permissions...</span>
              </div>
            ) : storageStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 dark:text-zinc-400">Connection Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      storageStatus.status === "success"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {storageStatus.status === "success" ? "Connected" : "Error"}
                  </span>
                </div>
                {storageStatus.bucket && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">R2 Bucket:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-zinc-200">
                      {storageStatus.bucket}
                    </span>
                  </div>
                )}
                {storageStatus.public_url_base && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500 dark:text-zinc-400">Public CDN Base:</span>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-zinc-300 truncate">
                      {storageStatus.public_url_base}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/80 dark:border-[#26262f]">
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                    {storageStatus.message}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="mt-3 flex sm:justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestStorage}
              disabled={isTestingStorage}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className={`mr-1.5 h-3 w-3 ${isTestingStorage ? "animate-spin" : ""}`} />
              Re-test Connection
            </Button>
            <Button
              size="sm"
              onClick={() => setIsStorageModalOpen(false)}
              className="bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white font-bold text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
