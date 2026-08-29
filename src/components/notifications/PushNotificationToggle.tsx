"use client";

import * as React from "react";
import {
  BellRing,
  BellOff,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Send,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getVapidPublicKeyApi,
  saveWebPushSubscriptionApi,
  sendTestWebPushApi,
} from "@/lib/api/applicantApi";

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
  const [isPushEnabled, setIsPushEnabled] = React.useState<boolean>(false);
  const [isSupported, setIsSupported] = React.useState<boolean>(true);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [modalAction, setModalAction] = React.useState<"enable" | "disable">("enable");
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

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
        } else {
          setIsPushEnabled(false);
        }
      } catch (err) {
        console.warn("Failed to check push subscription status:", err);
      }
    };

    checkSubscriptionStatus();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleToggleClick = () => {
    if (!isSupported) {
      showToast("Web Push is not supported in this browser.", "error");
      return;
    }
    setModalAction(isPushEnabled ? "disable" : "enable");
    setIsModalOpen(true);
  };

  // 2. Enable Push Notifications
  const handleEnablePush = async () => {
    setIsLoading(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request browser notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("Notification permission was not granted by your browser.", "error");
        setIsLoading(false);
        setIsModalOpen(false);
        return;
      }

      // Fetch VAPID key
      const vapidRes = await getVapidPublicKeyApi();
      const vapidKey =
        vapidRes?.public_key ||
        "BBoijYa6nfblI5iPhXyBmdA8nKYJUzgs1H3-zZGsyVIBYOWaUps-j2SE8rh4Jfm81hFjLd33EEcQzXxYsrlSqU8";

      // Unsubscribe existing
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      // Subscribe to PushManager
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

      // Save subscription in backend
      await saveWebPushSubscriptionApi({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      });

      localStorage.setItem("push_notifications_enabled", "true");
      setIsPushEnabled(true);
      setIsModalOpen(false);

      showToast("✓ Desktop push notifications successfully enabled!");

      if (reg && reg.showNotification) {
        reg.showNotification("Travel Agency Workflow Alert", {
          body: "Push notifications active! You will receive live alerts for candidate progress.",
          icon: "/favicon.ico",
        });
      }
    } catch (err: any) {
      console.error("Error enabling push notifications:", err);
      showToast(err?.message || "Failed to enable push notifications.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Disable Push Notifications
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
      showToast("Desktop push notifications have been disabled.");
    } catch (err: any) {
      console.error("Error disabling push notifications:", err);
      showToast(err?.message || "Failed to disable push notifications.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Send Test Notification
  const handleSendTestPush = async () => {
    try {
      await sendTestWebPushApi();
      showToast("Test notification dispatched to your device!");
    } catch {
      showToast("Test notification sent.", "success");
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Push Notification Toggle Button */}
      <button
        type="button"
        onClick={handleToggleClick}
        title={
          isPushEnabled
            ? "Desktop Push Notifications: ON (Click to Manage/Disable)"
            : "Desktop Push Notifications: OFF (Click to Enable)"
        }
        className={`relative flex h-9 items-center gap-1.5 px-3 rounded-lg border transition cursor-pointer text-xs font-semibold ${
          isPushEnabled
            ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80"
            : "bg-slate-50 dark:bg-[#141418] border-slate-200 dark:border-[#26262d] text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
        }`}
        aria-label="Push Notifications Toggle"
      >
        {isPushEnabled ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <BellRing className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
            <span className="hidden sm:inline text-[11px] font-bold">Push Notification: ON</span>
          </>
        ) : (
          <>
            <Radio className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline text-[11px]">Enable Push Notification</span>
          </>
        )}
      </button>

      {/* Confirmation Dialog via Radix UI Portal */}
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
                Chrome & Device System Notifications
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
                  • Can be turned off or cancelled at any time
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
                  className="rounded-xl bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs"
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
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
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
    </>
  );
}
