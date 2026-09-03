/**
 * V2 Web Push & Reminders Notification API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.notification_api.subscribe_to_push
 * - POST /api/method/agency_tracking.notification_api.get_push_subscription_status
 * - POST /api/method/agency_tracking.notification_api.trigger_wakala_reminder
 */

import { requestV2 } from "./client";
import { listApplicantsV2 } from "./applicants";
import { listPlacementsV2 } from "./placements";
import { listUnresolvedComplaintsV2 } from "./complaints";

export interface V2PushSubscriptionStatus {
  subscribed: boolean;
  endpoint?: string;
  vapid_public_key?: string;
  enabled?: boolean;
  [key: string]: any;
}

export interface V2AppNotification {
  id: string;
  title: string;
  description: string;
  category: "compliance" | "workflow" | "complaints" | "system";
  severity: "urgent" | "warning" | "info";
  timestamp: string;
  applicant_id?: string;
  applicant_name?: string;
  action_url?: string;
  action_label?: string;
}

/**
 * Checks whether the current user has an active Push Subscription.
 */
export async function getPushSubscriptionStatusV2(): Promise<V2PushSubscriptionStatus> {
  const result = await requestV2<{
    subscribed?: boolean;
    endpoint?: string;
    vapid_public_key?: string;
    enabled?: boolean;
  }>("/api/method/agency_tracking.notification_api.get_push_subscription_status", {
    method: "POST",
  });

  return {
    subscribed: Boolean((result as any)?.subscribed),
    endpoint: (result as any)?.endpoint,
    vapid_public_key: (result as any)?.vapid_public_key || "",
    enabled: Boolean((result as any)?.enabled ?? true),
  };
}

/**
 * Subscribes the current browser to Push notifications.
 */
export async function subscribeToPushV2(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<{ status?: string; message?: string }> {
  return await requestV2(
    "/api/method/agency_tracking.notification_api.subscribe_to_push",
    {
      method: "POST",
      body: {
        endpoint,
        p256dh,
        auth,
      },
    }
  );
}

/**
 * Manually triggers a Wakala payment reminder for an Embassy clearance step.
 */
export async function triggerWakalaReminderV2(
  clearanceStepName: string
): Promise<{ status?: string; message?: string }> {
  return await requestV2(
    "/api/method/agency_tracking.notification_api.trigger_wakala_reminder",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
    }
  );
}

/**
 * Dynamically computes real-time operational compliance notifications from live V2 backend data.
 * Zero localStorage persistence; state is always derived from live server records.
 */
export async function getComplianceNotificationsV2(): Promise<V2AppNotification[]> {
  const notifications: V2AppNotification[] = [];

  try {
    const [applicants, placements, complaints] = await Promise.all([
      listApplicantsV2().catch(() => []),
      listPlacementsV2().catch(() => []),
      listUnresolvedComplaintsV2().catch(() => []),
    ]);

    const now = new Date();

    // 1. Applicant Passport Expiry & Compliance
    for (const app of applicants) {
      const name = app.full_name || app.first_name || app.name;

      if (app.passport_expiry) {
        const passDate = new Date(app.passport_expiry);
        const diffDays = Math.round((passDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          notifications.push({
            id: `pass-urgent-${app.name}`,
            title: `Urgent: Passport Expiring Soon (${diffDays} days)`,
            description: `${name}'s passport expires on ${app.passport_expiry}. Immediate renewal required before embassy clearance.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Action Required",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Profile",
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `pass-expired-${app.name}`,
            title: `Expired Passport: ${name}`,
            description: `Passport expired on ${app.passport_expiry}. Processing is halted until renewed.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Expired",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Profile",
          });
        }
      }
    }

    // 2. Pre-Departure Medical 2 Checks for Ticketed Placements
    for (const plc of placements) {
      if (plc.status === "Ticketed") {
        notifications.push({
          id: `plc-med2-${plc.name}`,
          title: `Pre-Departure Medical 2 Due: Placement ${plc.name}`,
          description: `Candidate is Ticketed for flight departure. Pre-departure medical fitness verification required before clearance.`,
          category: "workflow",
          severity: "warning",
          timestamp: plc.flight_date || "Flight Imminent",
          applicant_id: plc.applicant,
          applicant_name: plc.applicant_name,
          action_url: `/applicants/${encodeURIComponent(plc.applicant)}`,
          action_label: "Open Candidate",
        });
      }
    }

    // 3. Active Complaints & Warranty Disputes
    for (const comp of complaints) {
      const candidateName = comp.full_name || comp.applicant_name || comp.applicant || "Candidate";

      notifications.push({
        id: `comp-${comp.name}`,
        title: `Active Complaint: ${candidateName}`,
        description: `Dispute ticket for ${candidateName} (Placement ${comp.placement || "N/A"}): "${comp.description || "Active complaint"}"`,
        category: "complaints",
        severity: "urgent",
        timestamp: comp.creation ? comp.creation.split(" ")[0] : "Active Ticket",
        applicant_id: comp.applicant,
        applicant_name: candidateName,
        action_url: "/complaints",
        action_label: "Review Ticket",
      });
    }
  } catch (err) {
    console.error("V2 Compliance notifications fetch error:", err);
  }

  return notifications;
}

/**
 * Fetches the backend VAPID public applicationServerKey for PushManager.subscribe().
 * Auto-generates keys on first call on the backend.
 */
export async function getVapidPublicKeyV2(): Promise<string> {
  const result = await requestV2<{ vapid_public_key?: string; message?: { vapid_public_key?: string } }>(
    "/api/method/agency_tracking.notification_api.get_vapid_public_key",
    { method: "GET" }
  );

  const key = (result as any)?.vapid_public_key || (result as any)?.message?.vapid_public_key || "";
  if (!key) {
    throw new Error("No VAPID public key returned by backend server.");
  }
  return key;
}

/**
 * Forces regeneration of the backend VAPID keypair.
 * Admin / System Manager only. Invalidates all existing client push subscriptions.
 */
export async function regenerateVapidKeysV2(): Promise<{ vapid_public_key: string; message?: string }> {
  const result = await requestV2<{ vapid_public_key?: string; message?: string }>(
    "/api/method/agency_tracking.notification_api.regenerate_vapid_keys",
    { method: "POST" }
  );

  return {
    vapid_public_key: (result as any)?.vapid_public_key || (result as any)?.message?.vapid_public_key || "",
    message: (result as any)?.message || "VAPID keypair regenerated successfully.",
  };
}
